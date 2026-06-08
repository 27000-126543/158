import { Router, type Response } from 'express'
import { successResponse, errorResponse, paginatedResponse, createdResponse } from '../utils/response.js'
import { authenticate, requireAdmin, type AuthRequest } from '../middleware/auth.middleware.js'
import { operationLogger } from '../middleware/logger.middleware.js'
import { getCache, setCache, deleteCacheByPattern } from '../utils/redis.js'
import reportService from '../services/report.service.js'
import type { DashboardStatsResult, DashboardChartsResult } from '../services/report.service.js'
import type { MonthlyReport, PaginatedResponse } from '@shared/types/index.js'

const dashboardRouter = Router()
const monthlyReportsRouter = Router()

dashboardRouter.get('/stats', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const cacheKey = 'dashboard:stats'
    const cachedData = await getCache(cacheKey)
    if (cachedData) {
      res.status(200).json(successResponse(cachedData as DashboardStatsResult))
      return
    }

    const result = await reportService.getDashboardStats({
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      category: req.query.category as string,
    })

    if (result.code === 200 && result.data) {
      await setCache(cacheKey, result.data, 10 * 60)
    }

    res.status(result.code).json(result)
  } catch (error) {
    res.status(500).json(errorResponse(`获取看板统计数据失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

dashboardRouter.get('/charts', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const cacheKey = `dashboard:charts:${req.query.startDate || ''}:${req.query.endDate || ''}:${req.query.category || ''}:${req.query.trendType || ''}`
    const cachedData = await getCache(cacheKey)
    if (cachedData) {
      res.status(200).json(successResponse(cachedData as DashboardChartsResult))
      return
    }

    const result = await reportService.getDashboardCharts({
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      category: req.query.category as string,
      trendType: req.query.trendType as 'monthly' | 'weekly',
    })

    if (result.code === 200 && result.data) {
      await setCache(cacheKey, result.data, 10 * 60)
    }

    res.status(result.code).json(result)
  } catch (error) {
    res.status(500).json(errorResponse(`获取图表数据失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

monthlyReportsRouter.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const pageSize = parseInt(req.query.pageSize as string) || 12

    const cacheKey = `monthly-reports:list:${page}:${pageSize}`
    const cachedData = await getCache(cacheKey)
    if (cachedData) {
      res.status(200).json(successResponse(cachedData as PaginatedResponse<MonthlyReport>))
      return
    }

    const result = await reportService.getMonthlyReports(page, pageSize)

    if (result.code === 200 && result.data) {
      await setCache(cacheKey, result.data, 30 * 60)
    }

    res.status(result.code).json(result)
  } catch (error) {
    res.status(500).json(errorResponse(`获取月度报表列表失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

monthlyReportsRouter.get('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const cacheKey = `monthly-reports:detail:${id}`
    const cachedData = await getCache(cacheKey)
    if (cachedData) {
      res.status(200).json(successResponse(cachedData as MonthlyReport))
      return
    }

    const result = await reportService.getMonthlyReportById(id)

    if (result.code === 200 && result.data) {
      await setCache(cacheKey, result.data, 60 * 60)
    }

    res.status(result.code).json(result)
  } catch (error) {
    res.status(500).json(errorResponse(`获取月度报表详情失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

monthlyReportsRouter.post('/', authenticate, requireAdmin, operationLogger('reports', 'generate_monthly'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { year, month } = req.body

    if (!year || !month) {
      res.status(400).json(errorResponse('缺少必要参数: year 和 month'))
      return
    }

    const result = await reportService.generateMonthlyReport(year, month)

    if (result.code === 200 || result.code === 201) {
      await deleteCacheByPattern('monthly-reports:*')
      await deleteCacheByPattern('dashboard:*')
    }

    if (result.code === 201) {
      res.status(201).json(createdResponse(result.data, result.message))
    } else {
      res.status(result.code).json(result)
    }
  } catch (error) {
    res.status(500).json(errorResponse(`生成月度报表失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

monthlyReportsRouter.get('/:id/export', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const result = await reportService.exportMonthlyReport(id)

    if (result.code !== 200 || !result.data) {
      res.status(result.code).json(result)
      return
    }

    const { data, headers, filename } = result.data

    const csvContent = [
      headers.join(','),
      ...data.map((row: any) => headers.map((h: string) => `"${row[h] ?? ''}"`).join(','))
    ].join('\n')

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`)
    res.setHeader('Cache-Control', 'no-cache')

    res.status(200).send('\uFEFF' + csvContent)
  } catch (error) {
    res.status(500).json(errorResponse(`导出月度报表失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

export { dashboardRouter, monthlyReportsRouter }
export default { dashboardRouter, monthlyReportsRouter }
