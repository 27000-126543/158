import { Router, type Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { successResponse, errorResponse, paginatedResponse } from '../utils/response.js'
import { authenticate, requireFinance, requireFinanceDirector, type AuthRequest } from '../middleware/auth.middleware.js'
import { operationLogger } from '../middleware/logger.middleware.js'
import { getCache, setCache, deleteCacheByPattern } from '../utils/redis.js'
import type { MonthlyReport, DashboardStats } from '@shared/types/index.js'

const router = Router()
const prisma = new PrismaClient()

router.get('/monthly', authenticate, requireFinance, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const pageSize = parseInt(req.query.pageSize as string) || 12

    const cacheKey = `reports:monthly:${page}:${pageSize}`
    const cachedData = await getCache(cacheKey)
    if (cachedData) {
      res.status(200).json(cachedData)
      return
    }

    const skip = (page - 1) * pageSize
    const [items, total] = await Promise.all([
      prisma.monthlyReport.findMany({
        skip,
        take: pageSize,
        orderBy: { yearMonth: 'desc' },
      }),
      prisma.monthlyReport.count(),
    ])

    const response = paginatedResponse(items as MonthlyReport[], total, page, pageSize)
    await setCache(cacheKey, response, 30 * 60)

    res.status(200).json(response)
  } catch (error) {
    res.status(500).json(errorResponse(`获取月度报告失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

router.get('/monthly/:yearMonth', authenticate, requireFinance, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { yearMonth } = req.params

    const cacheKey = `reports:monthly:${yearMonth}`
    const cachedData = await getCache(cacheKey)
    if (cachedData) {
      res.status(200).json(successResponse(cachedData))
      return
    }

    const report = await prisma.monthlyReport.findUnique({
      where: { yearMonth },
    })

    if (!report) {
      res.status(404).json(errorResponse('月度报告不存在', 404))
      return
    }

    await setCache(cacheKey, report, 60 * 60)

    res.status(200).json(successResponse(report as MonthlyReport))
  } catch (error) {
    res.status(500).json(errorResponse(`获取月度报告详情失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

router.post('/monthly/:yearMonth/generate', authenticate, requireFinanceDirector, operationLogger('reports', 'generate_monthly'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { yearMonth } = req.params

    const existing = await prisma.monthlyReport.findUnique({ where: { yearMonth } })
    if (existing) {
      res.status(400).json(errorResponse('该月度报告已存在'))
      return
    }

    const [year, month] = yearMonth.split('-').map(Number)
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0)

    const revenues = await prisma.revenueRecord.findMany({
      where: {
        transactionTime: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: { splitDetails: true },
    })

    const revenueByBusinessLine: Record<string, number> = {}
    const splitRatioByBusinessLine: Record<string, Record<string, number>> = {}
    const revenueTrend: { date: string; amount: number }[] = []

    revenues.forEach((r) => {
      const date = r.transactionTime.toISOString().split('T')[0]
      const existingTrend = revenueTrend.find((t) => t.date === date)
      if (existingTrend) {
        existingTrend.amount += r.amount.toNumber()
      } else {
        revenueTrend.push({ date, amount: r.amount.toNumber() })
      }

      revenueByBusinessLine[r.businessLine] = (revenueByBusinessLine[r.businessLine] || 0) + r.amount.toNumber()

      if (!splitRatioByBusinessLine[r.businessLine]) {
        splitRatioByBusinessLine[r.businessLine] = {}
      }
      r.splitDetails.forEach((sd) => {
        splitRatioByBusinessLine[r.businessLine][sd.businessLine] =
          (splitRatioByBusinessLine[r.businessLine][sd.businessLine] || 0) + sd.amount.toNumber()
      })
    })

    const totalSettlements = await prisma.settlement.count({
      where: {
        settlementDate: {
          gte: startDate,
          lte: endDate,
        },
        status: 'paid',
      },
    })

    const totalDiffs = await prisma.reconciliationDiff.count({
      where: {
        reconciliationDate: {
          gte: startDate,
          lte: endDate,
        },
      },
    })

    const resolvedDiffs = await prisma.reconciliationDiff.count({
      where: {
        reconciliationDate: {
          gte: startDate,
          lte: endDate,
        },
        status: 'resolved',
      },
    })

    const report = await prisma.monthlyReport.create({
      data: {
        yearMonth,
        revenueByBusinessLine,
        splitRatioByBusinessLine,
        settlementAccuracy: totalSettlements > 0 ? 1 : 0,
        noDiffRate: totalDiffs > 0 ? 1 - resolvedDiffs / totalDiffs : 1,
        revenueTrend: revenueTrend.sort((a, b) => a.date.localeCompare(b.date)),
      },
    })

    await deleteCacheByPattern('reports:*')
    await deleteCacheByPattern('dashboard:*')

    res.status(201).json(successResponse(report as MonthlyReport, '月度报告生成成功'))
  } catch (error) {
    res.status(500).json(errorResponse(`生成月度报告失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

router.get('/dashboard', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const cacheKey = `dashboard:stats`
    const cachedData = await getCache(cacheKey)
    if (cachedData) {
      res.status(200).json(successResponse(cachedData))
      return
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1)

    const [todayRevenue, monthRevenue, pendingApprovals, todayTransactions, totalDiffs, totalResolved] = await Promise.all([
      prisma.revenueRecord.aggregate({
        where: {
          transactionTime: { gte: today, lt: tomorrow },
        },
        _sum: { amount: true },
      }),
      prisma.revenueRecord.aggregate({
        where: {
          transactionTime: { gte: monthStart, lt: nextMonth },
        },
        _sum: { amount: true },
      }),
      prisma.approvalFlow.count({
        where: { status: 'pending' },
      }),
      prisma.revenueRecord.count({
        where: {
          transactionTime: { gte: today, lt: tomorrow },
        },
      }),
      prisma.reconciliationDiff.count({
        where: {
          reconciliationDate: { gte: monthStart, lt: nextMonth },
        },
      }),
      prisma.reconciliationDiff.count({
        where: {
          reconciliationDate: { gte: monthStart, lt: nextMonth },
          status: 'resolved',
        },
      }),
    ])

    const totalSettlements = await prisma.settlement.count({
      where: {
        settlementDate: { gte: monthStart, lt: nextMonth },
      },
    })

    const paidSettlements = await prisma.settlement.count({
      where: {
        settlementDate: { gte: monthStart, lt: nextMonth },
        status: 'paid',
      },
    })

    const stats: DashboardStats = {
      todayRevenue: todayRevenue._sum.amount?.toNumber() || 0,
      monthRevenue: monthRevenue._sum.amount?.toNumber() || 0,
      settlementProgress: totalSettlements > 0 ? paidSettlements / totalSettlements : 0,
      diffRate: totalDiffs > 0 ? totalDiffs / (totalResolved + totalDiffs) : 0,
      pendingApprovals,
      todayTransactions,
    }

    await setCache(cacheKey, stats, 10 * 60)

    res.status(200).json(successResponse(stats))
  } catch (error) {
    res.status(500).json(errorResponse(`获取仪表盘数据失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

router.delete('/monthly/:yearMonth', authenticate, requireFinanceDirector, operationLogger('reports', 'delete'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { yearMonth } = req.params

    const existing = await prisma.monthlyReport.findUnique({ where: { yearMonth } })
    if (!existing) {
      res.status(404).json(errorResponse('月度报告不存在', 404))
      return
    }

    await prisma.monthlyReport.delete({ where: { yearMonth } })

    await deleteCacheByPattern('reports:*')
    await deleteCacheByPattern('dashboard:*')

    res.status(200).json(successResponse(null, '月度报告删除成功'))
  } catch (error) {
    res.status(500).json(errorResponse(`删除月度报告失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

export default router
