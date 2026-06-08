import { Router, type Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { successResponse, errorResponse, paginatedResponse } from '../utils/response.js'
import { authenticate, requireFinance, requireFinanceDirector, type AuthRequest } from '../middleware/auth.middleware.js'
import { operationLogger } from '../middleware/logger.middleware.js'
import { getCache, setCache, deleteCacheByPattern } from '../utils/redis.js'
import { notifyApprovalRequest } from '../utils/notification.js'
import type { Settlement, SettlementStatus, PaymentInstruction } from '@shared/types/index.js'

const router = Router()
const prisma = new PrismaClient()

router.get('/', authenticate, requireFinance, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const pageSize = parseInt(req.query.pageSize as string) || 20
    const status = req.query.status as SettlementStatus
    const businessLine = req.query.businessLine as string
    const startDate = req.query.startDate as string
    const endDate = req.query.endDate as string

    const cacheKey = `settlements:list:${page}:${pageSize}:${status || ''}:${businessLine || ''}:${startDate || ''}:${endDate || ''}`
    const cachedData = await getCache(cacheKey)
    if (cachedData) {
      res.status(200).json(cachedData)
      return
    }

    const where: any = {}
    if (status) where.status = status
    if (businessLine) where.businessLine = businessLine
    if (startDate && endDate) {
      where.settlementDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      }
    }

    const skip = (page - 1) * pageSize
    const [items, total] = await Promise.all([
      prisma.settlement.findMany({
        where,
        include: {
          _count: { select: { revenues: true } },
          paymentInstruction: {
            select: { id: true, instructionNo: true, status: true },
          },
        },
        skip,
        take: pageSize,
        orderBy: { settlementDate: 'desc' },
      }),
      prisma.settlement.count({ where }),
    ])

    const response = paginatedResponse(items as Settlement[], total, page, pageSize)
    await setCache(cacheKey, response, 5 * 60)

    res.status(200).json(response)
  } catch (error) {
    res.status(500).json(errorResponse(`获取结算单失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

router.get('/:id', authenticate, requireFinance, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const cacheKey = `settlements:${id}`
    const cachedData = await getCache(cacheKey)
    if (cachedData) {
      res.status(200).json(successResponse(cachedData))
      return
    }

    const settlement = await prisma.settlement.findUnique({
      where: { id },
      include: {
        revenues: {
          include: { splitDetails: true },
        },
        paymentInstruction: true,
      },
    })

    if (!settlement) {
      res.status(404).json(errorResponse('结算单不存在', 404))
      return
    }

    await setCache(cacheKey, settlement, 10 * 60)

    res.status(200).json(successResponse(settlement as Settlement))
  } catch (error) {
    res.status(500).json(errorResponse(`获取结算单详情失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

router.post('/', authenticate, requireFinance, operationLogger('settlements', 'create'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { businessLine, settlementDate, revenueIds, budgetThreshold } = req.body

    if (!businessLine || !settlementDate || !revenueIds || !revenueIds.length) {
      res.status(400).json(errorResponse('缺少必要参数'))
      return
    }

    const revenues = await prisma.revenueRecord.findMany({
      where: {
        id: { in: revenueIds },
        settlementId: null,
        businessLine,
      },
    })

    if (revenues.length !== revenueIds.length) {
      res.status(400).json(errorResponse('部分流水不存在或已被结算'))
      return
    }

    const totalAmount = revenues.reduce((sum, r) => sum + r.amount.toNumber(), 0)
    const overBudget = totalAmount > budgetThreshold

    const settlementNo = `SETTLE-${new Date().toISOString().slice(0, 7)}-${Date.now().toString().slice(-6)}`

    const settlement = await prisma.settlement.create({
      data: {
        settlementNo,
        businessLine,
        settlementDate: new Date(settlementDate),
        totalAmount,
        budgetThreshold,
        overBudget,
        status: overBudget ? 'pending_approval' : 'approved',
        revenues: {
          connect: revenueIds.map((id: string) => ({ id })),
        },
      },
      include: {
        revenues: true,
      },
    })

    if (overBudget) {
      const approvalFlow = await prisma.approvalFlow.create({
        data: {
          type: 'over_budget',
          status: 'pending',
          currentNode: 0,
          relatedId: settlement.id,
          nodes: {
            create: [
              { level: 1, approverRole: 'finance_director', status: 'pending' },
              { level: 2, approverRole: 'admin', status: 'pending' },
            ],
          },
        },
      })

      await prisma.settlement.update({
        where: { id: settlement.id },
        data: { approvalFlowId: approvalFlow.id },
      })

      await notifyApprovalRequest('超额结算审批', req.user!.username, totalAmount)
    }

    await deleteCacheByPattern('settlements:*')

    res.status(201).json(successResponse(settlement as Settlement, '结算单创建成功'))
  } catch (error) {
    res.status(500).json(errorResponse(`创建结算单失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

router.post('/:id/generate-payment', authenticate, requireFinanceDirector, operationLogger('settlements', 'generate_payment'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const { payeeAccount, payeeName, payeeBank } = req.body

    if (!payeeAccount || !payeeName || !payeeBank) {
      res.status(400).json(errorResponse('缺少付款信息'))
      return
    }

    const settlement = await prisma.settlement.findUnique({ where: { id } })
    if (!settlement) {
      res.status(404).json(errorResponse('结算单不存在', 404))
      return
    }

    if (settlement.status !== 'approved') {
      res.status(400).json(errorResponse('只有已通过的结算单可以生成付款指令'))
      return
    }

    if (settlement.paymentInstructionId) {
      res.status(400).json(errorResponse('该结算单已有付款指令'))
      return
    }

    const instructionNo = `PAY-${Date.now().toString().slice(-10)}`

    const payment = await prisma.paymentInstruction.create({
      data: {
        instructionNo,
        settlementId: id,
        payeeAccount,
        payeeName,
        payeeBank,
        amount: settlement.totalAmount,
        status: 'pending',
      },
    })

    await prisma.settlement.update({
      where: { id },
      data: { paymentInstructionId: payment.id },
    })

    await deleteCacheByPattern('settlements:*')

    res.status(200).json(successResponse(payment as PaymentInstruction, '付款指令生成成功'))
  } catch (error) {
    res.status(500).json(errorResponse(`生成付款指令失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

router.get('/:id/payment', authenticate, requireFinance, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const settlement = await prisma.settlement.findUnique({
      where: { id },
      include: { paymentInstruction: true },
    })

    if (!settlement) {
      res.status(404).json(errorResponse('结算单不存在', 404))
      return
    }

    if (!settlement.paymentInstruction) {
      res.status(404).json(errorResponse('该结算单暂无付款指令', 404))
      return
    }

    res.status(200).json(successResponse(settlement.paymentInstruction as PaymentInstruction))
  } catch (error) {
    res.status(500).json(errorResponse(`获取付款指令失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

router.post('/payment/:id/send', authenticate, requireFinanceDirector, operationLogger('settlements', 'send_payment'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const payment = await prisma.paymentInstruction.findUnique({ where: { id } })
    if (!payment) {
      res.status(404).json(errorResponse('付款指令不存在', 404))
      return
    }

    if (payment.status !== 'pending') {
      res.status(400).json(errorResponse('只有待发送的付款指令可以发送'))
      return
    }

    const updatedPayment = await prisma.paymentInstruction.update({
      where: { id },
      data: {
        status: 'sent',
        sentAt: new Date(),
      },
    })

    await prisma.settlement.update({
      where: { id: payment.settlementId },
      data: { status: 'paid' },
    })

    await deleteCacheByPattern('settlements:*')

    res.status(200).json(successResponse(updatedPayment as PaymentInstruction, '付款指令已发送'))
  } catch (error) {
    res.status(500).json(errorResponse(`发送付款指令失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

export default router
