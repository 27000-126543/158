import { Router, type Response } from 'express'
import { errorResponse } from '../utils/response.js'
import { authenticate, type AuthRequest } from '../middleware/auth.middleware.js'
import { operationLogger } from '../middleware/logger.middleware.js'
import supplierService from '../services/supplier.service.js'
import type { SupplierStatus, PerformanceLevel } from '@shared/types/index.js'

const router = Router()

router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const pageSize = parseInt(req.query.pageSize as string) || 20
    const category = req.query.category as string
    const status = req.query.status as SupplierStatus
    const keyword = req.query.keyword as string
    const performanceLevel = req.query.performanceLevel as PerformanceLevel
    const sortBy = req.query.sortBy as string
    const sortOrder = req.query.sortOrder as 'asc' | 'desc'

    const result = await supplierService.getSuppliers({
      category,
      status,
      keyword,
      performanceLevel,
      page,
      pageSize,
      sortBy,
      sortOrder,
    })

    res.status(result.code).json(result)
  } catch (error) {
    res.status(500).json(errorResponse(`获取供应商列表失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

router.get('/recommend', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const category = req.query.category as string
    const itemName = req.query.itemName as string

    if (!category) {
      res.status(400).json(errorResponse('缺少必要参数: category'))
      return
    }

    const result = await supplierService.getRecommendedSuppliers(category, itemName)

    res.status(result.code).json(result)
  } catch (error) {
    res.status(500).json(errorResponse(`获取推荐供应商失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

router.get('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const result = await supplierService.getSupplierById(id)

    res.status(result.code).json(result)
  } catch (error) {
    res.status(500).json(errorResponse(`获取供应商详情失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

router.get('/:id/performance', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const result = await supplierService.getSupplierPerformance(id)

    res.status(result.code).json(result)
  } catch (error) {
    res.status(500).json(errorResponse(`获取供应商绩效失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

router.post('/', authenticate, operationLogger('suppliers', 'create'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      name,
      shortName,
      category,
      contactName,
      contactPhone,
      contactEmail,
      address,
      businessLicense,
      taxNumber,
      bankName,
      bankAccount,
    } = req.body

    if (!name || !shortName || !category || !contactName || !contactPhone || !contactEmail || !address) {
      res.status(400).json(errorResponse('缺少必要参数'))
      return
    }

    const result = await supplierService.createSupplier({
      name,
      shortName,
      category,
      contactName,
      contactPhone,
      contactEmail,
      address,
      businessLicense,
      taxNumber,
      bankName,
      bankAccount,
    })

    res.status(result.code).json(result)
  } catch (error) {
    res.status(500).json(errorResponse(`创建供应商失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

router.put('/:id', authenticate, operationLogger('suppliers', 'update'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const {
      name,
      shortName,
      category,
      contactName,
      contactPhone,
      contactEmail,
      address,
      businessLicense,
      taxNumber,
      bankName,
      bankAccount,
      status,
    } = req.body

    const result = await supplierService.updateSupplier(id, {
      name,
      shortName,
      category,
      contactName,
      contactPhone,
      contactEmail,
      address,
      businessLicense,
      taxNumber,
      bankName,
      bankAccount,
      status,
    })

    res.status(result.code).json(result)
  } catch (error) {
    res.status(500).json(errorResponse(`更新供应商失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

export default router
