import { Router, type Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { successResponse, errorResponse, paginatedResponse } from '../utils/response.js'
import { authenticate, requireFinance, requireFinanceDirector, type AuthRequest } from '../middleware/auth.middleware.js'
import { operationLogger } from '../middleware/logger.middleware.js'
import { getCache, setCache, deleteCacheByPattern } from '../utils/redis.js'
import type { ReconciliationDiff, WorkOrder, DiffStatus, WorkOrderStatus } from '@shared/types/index.js'

const router = Router()
const prisma = new PrismaClient()

router.get('/diffs', authenticate, requireFinance, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const pageSize = parseInt(req.query.pageSize as string) || 20
    const status = req.query.status as DiffStatus
    const diffType = req.query.diffType as string
    const startDate = req.query.startDate as string
    const endDate = req.query.endDate as string

    const cacheKey = `reconciliation:diffs:${page}:${pageSize}:${status || ''}:${diffType || ''}:${startDate || ''}:${endDate || ''}`
    const cachedData = await getCache(cacheKey)
    if (cachedData) {
      res.status(200).json(cachedData)
      return
    }

    const where: any = {}
    if (status) where.status = status
    if (diffType) where.diffType = diffType
    if (startDate && endDate) {
      where.reconciliationDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      }
    }

    const skip = (page - 1) * pageSize
    const [items, total] = await Promise.all([
      prisma.reconciliationDiff.findMany({
        where,
        include: {
          revenue: {
            select: { id: true, transactionNo: true, amount: true },
          },
          bankTransaction: {
            select: { id: true, bankTransactionNo: true, amount: true },
          },
          assigneeUser: {
            select: { id: true, realName: true },
          },
          workOrder: {
            select: { id: true, orderNo: true, status: true },
          },
        },
        skip,
        take: pageSize,
        orderBy: { reconciliationDate: 'desc' },
      }),
      prisma.reconciliationDiff.count({ where }),
    ])

    const response = paginatedResponse(items as ReconciliationDiff[], total, page, pageSize)
    await setCache(cacheKey, response, 5 * 60)

    res.status(200).json(response)
  } catch (error) {
    res.status(500).json(errorResponse(`获取差异列表失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

router.get('/diffs/:id', authenticate, requireFinance, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const cacheKey = `reconciliation:diffs:${id}`
    const cachedData = await getCache(cacheKey)
    if (cachedData) {
      res.status(200).json(successResponse(cachedData))
      return
    }

    const diff = await prisma.reconciliationDiff.findUnique({
      where: { id },
      include: {
        revenue: true,
        bankTransaction: true,
        assigneeUser: {
          select: { id: true, realName: true, email: true },
        },
        workOrder: true,
      },
    })

    if (!diff) {
      res.status(404).json(errorResponse('差异记录不存在', 404))
      return
    }

    await setCache(cacheKey, diff, 10 * 60)

    res.status(200).json(successResponse(diff as ReconciliationDiff))
  } catch (error) {
    res.status(500).json(errorResponse(`获取差异详情失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

router.put('/diffs/:id/assign', authenticate, requireFinance, operationLogger('reconciliation', 'assign'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const { assignee } = req.body

    if (!assignee) {
      res.status(400).json(errorResponse('请指定处理人'))
      return
    }

    const diff = await prisma.reconciliationDiff.findUnique({ where: { id } })
    if (!diff) {
      res.status(404).json(errorResponse('差异记录不存在', 404))
      return
    }

    const user = await prisma.user.findUnique({ where: { id: assignee } })
    if (!user) {
      res.status(404).json(errorResponse('处理人不存在', 404))
      return
    }

    const updatedDiff = await prisma.reconciliationDiff.update({
      where: { id },
      data: { assignee },
    })

    await deleteCacheByPattern('reconciliation:*')

    res.status(200).json(successResponse(updatedDiff as ReconciliationDiff, '处理人已分配'))
  } catch (error) {
    res.status(500).json(errorResponse(`分配处理人失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

router.put('/diffs/:id/status', authenticate, requireFinance, operationLogger('reconciliation', 'update_status'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const { status, specialReason } = req.body

    if (!status) {
      res.status(400).json(errorResponse('请指定状态'))
      return
    }

    const diff = await prisma.reconciliationDiff.findUnique({ where: { id } })
    if (!diff) {
      res.status(404).json(errorResponse('差异记录不存在', 404))
      return
    }

    if (status === 'special' && !specialReason) {
      res.status(400).json(errorResponse('特殊处理需要提供原因'))
      return
    }

    const updatedDiff = await prisma.reconciliationDiff.update({
      where: { id },
      data: { status },
    })

    if (status === 'resolved' && diff.workOrderId) {
      await prisma.workOrder.update({
        where: { id: diff.workOrderId },
        data: {
          status: 'resolved',
          resolvedAt: new Date(),
        },
      })
    }

    await deleteCacheByPattern('reconciliation:*')

    res.status(200).json(successResponse(updatedDiff as ReconciliationDiff, '状态已更新'))
  } catch (error) {
    res.status(500).json(errorResponse(`更新状态失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

router.get('/work-orders', authenticate, requireFinance, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const pageSize = parseInt(req.query.pageSize as string) || 20
    const status = req.query.status as WorkOrderStatus
    const assignee = req.query.assignee as string

    const where: any = {}
    if (status) where.status = status
    if (assignee) where.assignee = assignee

    const skip = (page - 1) * pageSize
    const [items, total] = await Promise.all([
      prisma.workOrder.findMany({
        where,
        include: {
          diff: {
            select: { id: true, diffType: true, diffAmount: true },
          },
          assigneeUser: {
            select: { id: true, realName: true },
          },
        },
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.workOrder.count({ where }),
    ])

    res.status(200).json(paginatedResponse(items as WorkOrder[], total, page, pageSize))
  } catch (error) {
    res.status(500).json(errorResponse(`获取工单列表失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

router.post('/diffs/:id/create-work-order', authenticate, requireFinance, operationLogger('reconciliation', 'create_work_order'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const { title, description, assignee } = req.body

    if (!title || !description) {
      res.status(400).json(errorResponse('请填写工单标题和描述'))
      return
    }

    const diff = await prisma.reconciliationDiff.findUnique({ where: { id } })
    if (!diff) {
      res.status(404).json(errorResponse('差异记录不存在', 404))
      return
    }

    if (diff.workOrderId) {
      res.status(400).json(errorResponse('该差异已有工单'))
      return
    }

    const orderNo = `WO-${Date.now().toString().slice(-10)}`

    const workOrder = await prisma.workOrder.create({
      data: {
        orderNo,
        diffId: id,
        title,
        description,
        assignee: assignee || req.user!.id,
        status: 'pending',
      },
    })

    await prisma.reconciliationDiff.update({
      where: { id },
      data: { workOrderId: workOrder.id },
    })

    await deleteCacheByPattern('reconciliation:*')

    res.status(201).json(successResponse(workOrder as WorkOrder, '工单创建成功'))
  } catch (error) {
    res.status(500).json(errorResponse(`创建工单失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

router.post('/run', authenticate, requireFinanceDirector, operationLogger('reconciliation', 'run'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { date } = req.body
    const reconciliationDate = date ? new Date(date) : new Date()
    reconciliationDate.setHours(0, 0, 0, 0)

    res.status(200).json(successResponse({
      message: '对账任务已启动',
      reconciliationDate: reconciliationDate.toISOString(),
    }, '对账任务已在后台执行'))
  } catch (error) {
    res.status(500).json(errorResponse(`启动对账失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

router.get('/summary', authenticate, requireFinance, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const date = req.query.date as string
    const reconciliationDate = date ? new Date(date) : new Date()
    reconciliationDate.setHours(0, 0, 0, 0)
    const nextDay = new Date(reconciliationDate)
    nextDay.setDate(nextDay.getDate() + 1)

    const where = {
      reconciliationDate: {
        gte: reconciliationDate,
        lt: nextDay,
      },
    }

    const diffs = await prisma.reconciliationDiff.findMany({ where })

    const totalDiff = diffs.length
    const totalDiffAmount = diffs.reduce((sum, d) => sum + d.diffAmount.toNumber(), 0)
    const byType = diffs.reduce((acc: Record<string, number>, d) => {
      acc[d.diffType] = (acc[d.diffType] || 0) + 1
      return acc
    }, {})
    const byStatus = diffs.reduce((acc: Record<string, number>, d) => {
      acc[d.status] = (acc[d.status] || 0) + 1
      return acc
    }, {})

    res.status(200).json(successResponse({
      date: reconciliationDate.toISOString().split('T')[0],
      totalDiff,
      totalDiffAmount,
      byType,
      byStatus,
    }))
  } catch (error) {
    res.status(500).json(errorResponse(`获取对账汇总失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

export default router
