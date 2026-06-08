import { Router, type Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { successResponse, errorResponse, createdResponse, paginatedResponse } from '../utils/response.js'
import { authenticate, requireFinance, type AuthRequest } from '../middleware/auth.middleware.js'
import { operationLogger } from '../middleware/logger.middleware.js'
import { getCache, setCache, deleteCacheByPattern } from '../utils/redis.js'
import type { RevenueRecord, ReconciliationStatus } from '@shared/types/index.js'

const router = Router()
const prisma = new PrismaClient()

router.get('/', authenticate, requireFinance, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const pageSize = parseInt(req.query.pageSize as string) || 20
    const businessLine = req.query.businessLine as string
    const channel = req.query.channel as string
    const reconciliationStatus = req.query.reconciliationStatus as ReconciliationStatus
    const startDate = req.query.startDate as string
    const endDate = req.query.endDate as string

    const cacheKey = `revenue:list:${page}:${pageSize}:${businessLine || ''}:${channel || ''}:${reconciliationStatus || ''}:${startDate || ''}:${endDate || ''}`
    const cachedData = await getCache(cacheKey)
    if (cachedData) {
      res.status(200).json(cachedData)
      return
    }

    const where: any = {}
    if (businessLine) where.businessLine = businessLine
    if (channel) where.channel = channel
    if (reconciliationStatus) where.reconciliationStatus = reconciliationStatus
    if (startDate && endDate) {
      where.transactionTime = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      }
    }

    const skip = (page - 1) * pageSize
    const [items, total] = await Promise.all([
      prisma.revenueRecord.findMany({
        where,
        include: {
          splitDetails: true,
          settlement: {
            select: { id: true, settlementNo: true, status: true },
          },
        },
        skip,
        take: pageSize,
        orderBy: { transactionTime: 'desc' },
      }),
      prisma.revenueRecord.count({ where }),
    ])

    const response = paginatedResponse(items as RevenueRecord[], total, page, pageSize)
    await setCache(cacheKey, response, 5 * 60)

    res.status(200).json(response)
  } catch (error) {
    res.status(500).json(errorResponse(`获取收入流水失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

router.get('/:id', authenticate, requireFinance, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const cacheKey = `revenue:${id}`
    const cachedData = await getCache(cacheKey)
    if (cachedData) {
      res.status(200).json(successResponse(cachedData))
      return
    }

    const revenue = await prisma.revenueRecord.findUnique({
      where: { id },
      include: {
        splitDetails: true,
        settlement: {
          select: { id: true, settlementNo: true, status: true },
        },
      },
    })

    if (!revenue) {
      res.status(404).json(errorResponse('收入记录不存在', 404))
      return
    }

    await setCache(cacheKey, revenue, 10 * 60)

    res.status(200).json(successResponse(revenue as RevenueRecord))
  } catch (error) {
    res.status(500).json(errorResponse(`获取收入流水详情失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

router.post('/', authenticate, requireFinance, operationLogger('revenue', 'create'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { transactionNo, businessLine, channel, customer, amount, currency, transactionTime } = req.body

    if (!transactionNo || !businessLine || !channel || !customer || !amount || !transactionTime) {
      res.status(400).json(errorResponse('缺少必要参数'))
      return
    }

    const existing = await prisma.revenueRecord.findUnique({ where: { transactionNo } })
    if (existing) {
      res.status(400).json(errorResponse('交易流水号已存在'))
      return
    }

    const revenue = await prisma.revenueRecord.create({
      data: {
        transactionNo,
        businessLine,
        channel,
        customer,
        amount,
        currency: currency || 'CNY',
        transactionTime: new Date(transactionTime),
      },
      include: {
        splitDetails: true,
      },
    })

    await deleteCacheByPattern('revenue:list:*')

    res.status(201).json(createdResponse(revenue as RevenueRecord, '收入流水创建成功'))
  } catch (error) {
    res.status(500).json(errorResponse(`创建收入流水失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

router.put('/:id', authenticate, requireFinance, operationLogger('revenue', 'update'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const { businessLine, channel, customer, amount, currency, transactionTime } = req.body

    const existing = await prisma.revenueRecord.findUnique({ where: { id } })
    if (!existing) {
      res.status(404).json(errorResponse('收入记录不存在', 404))
      return
    }

    const data: any = {}
    if (businessLine) data.businessLine = businessLine
    if (channel) data.channel = channel
    if (customer) data.customer = customer
    if (amount) data.amount = amount
    if (currency) data.currency = currency
    if (transactionTime) data.transactionTime = new Date(transactionTime)

    const revenue = await prisma.revenueRecord.update({
      where: { id },
      data,
      include: {
        splitDetails: true,
      },
    })

    await deleteCacheByPattern('revenue:*')

    res.status(200).json(successResponse(revenue as RevenueRecord, '收入流水更新成功'))
  } catch (error) {
    res.status(500).json(errorResponse(`更新收入流水失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

router.delete('/:id', authenticate, requireFinance, operationLogger('revenue', 'delete'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const existing = await prisma.revenueRecord.findUnique({ where: { id } })
    if (!existing) {
      res.status(404).json(errorResponse('收入记录不存在', 404))
      return
    }

    await prisma.revenueRecord.delete({ where: { id } })

    await deleteCacheByPattern('revenue:*')

    res.status(200).json(successResponse(null, '收入流水删除成功'))
  } catch (error) {
    res.status(500).json(errorResponse(`删除收入流水失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

router.get('/summary/total', authenticate, requireFinance, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const startDate = req.query.startDate as string
    const endDate = req.query.endDate as string

    const where: any = {}
    if (startDate && endDate) {
      where.transactionTime = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      }
    }

    const result = await prisma.revenueRecord.aggregate({
      where,
      _sum: { amount: true },
      _count: true,
    })

    const byBusinessLine = await prisma.revenueRecord.groupBy({
      by: ['businessLine'],
      where,
      _sum: { amount: true },
      _count: true,
    })

    const byStatus = await prisma.revenueRecord.groupBy({
      by: ['reconciliationStatus'],
      where,
      _sum: { amount: true },
      _count: true,
    })

    res.status(200).json(successResponse({
      totalAmount: result._sum.amount || 0,
      totalCount: result._count,
      byBusinessLine,
      byStatus,
    }))
  } catch (error) {
    res.status(500).json(errorResponse(`获取统计数据失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

export default router
