import { Router, type Response } from 'express'
import { successResponse, errorResponse } from '../utils/response.js'
import { authenticate, type AuthRequest } from '../middleware/auth.middleware.js'
import { operationLogger } from '../middleware/logger.middleware.js'
import purchaseService from '../services/purchase.service.js'
import prisma from '../utils/prisma.js'
import type { PurchaseRequirementStatus } from '@shared/types/index.js'

const router = Router()

router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const pageSize = parseInt(req.query.pageSize as string) || 20
    const category = req.query.category as string
    const status = req.query.status as PurchaseRequirementStatus
    const requesterId = req.query.requesterId as string
    const startDate = req.query.startDate as string
    const endDate = req.query.endDate as string
    const sortBy = req.query.sortBy as string
    const sortOrder = req.query.sortOrder as 'asc' | 'desc'

    const result = await purchaseService.getPurchaseRequirements({
      category,
      status,
      requesterId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      page,
      pageSize,
      sortBy,
      sortOrder,
    })

    res.status(result.code).json(result)
  } catch (error) {
    res.status(500).json(errorResponse(`获取采购需求列表失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

router.get('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const result = await purchaseService.getPurchaseRequirementById(id)

    res.status(result.code).json(result)
  } catch (error) {
    res.status(500).json(errorResponse(`获取采购需求详情失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

router.post('/', authenticate, operationLogger('purchases', 'create'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, category, itemName, specification, quantity, unit, budget, expectedDate, description } = req.body

    if (!title || !category || !itemName || !quantity || !unit || !budget || !expectedDate) {
      res.status(400).json(errorResponse('缺少必要参数'))
      return
    }

    if (!req.user?.id) {
      res.status(401).json(errorResponse('用户未认证', 401))
      return
    }

    let categoryId = category
    if (category && !category.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      const categoryRecord = await prisma.category.findUnique({ where: { code: category } })
      if (categoryRecord) {
        categoryId = categoryRecord.id
      } else {
        res.status(400).json(errorResponse('品类不存在'))
        return
      }
    }

    const result = await purchaseService.createPurchaseRequirement({
      title,
      category: categoryId,
      itemName,
      specification: specification || '',
      quantity: Number(quantity),
      unit,
      budget: Number(budget),
      expectedDate: new Date(expectedDate),
      description,
      requesterId: req.user.id,
    })

    res.status(result.code).json(result)
  } catch (error) {
    res.status(500).json(errorResponse(`创建采购需求失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

router.put('/:id', authenticate, operationLogger('purchases', 'update'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const { title, category, itemName, specification, quantity, unit, budget, expectedDate, description, status } = req.body

    const result = await purchaseService.updatePurchaseRequirement(id, {
      title,
      category,
      itemName,
      specification,
      quantity: quantity !== undefined ? Number(quantity) : undefined,
      unit,
      budget: budget !== undefined ? Number(budget) : undefined,
      expectedDate: expectedDate ? new Date(expectedDate) : undefined,
      description,
      status,
    })

    res.status(result.code).json(result)
  } catch (error) {
    res.status(500).json(errorResponse(`更新采购需求失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

router.delete('/:id', authenticate, operationLogger('purchases', 'delete'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const result = await purchaseService.deletePurchaseRequirement(id)

    res.status(result.code).json(result)
  } catch (error) {
    res.status(500).json(errorResponse(`删除采购需求失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

router.post('/:id/recommend', authenticate, operationLogger('purchases', 'recommend'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const requirementResult = await purchaseService.getPurchaseRequirementById(id)
    if (!requirementResult.data) {
      res.status(requirementResult.code).json(requirementResult)
      return
    }

    const result = await purchaseService.initiateSmartRecommend(
      requirementResult.data.category,
      requirementResult.data.itemName
    )

    res.status(result.code).json(result)
  } catch (error) {
    res.status(500).json(errorResponse(`智能推荐失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

router.post('/:id/inquiry', authenticate, operationLogger('purchases', 'inquiry'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const { supplierIds, deadline } = req.body

    if (!supplierIds || !Array.isArray(supplierIds) || supplierIds.length === 0) {
      res.status(400).json(errorResponse('请选择至少一个供应商'))
      return
    }

    if (!deadline) {
      res.status(400).json(errorResponse('请提供报价截止日期'))
      return
    }

    if (!req.user?.id) {
      res.status(401).json(errorResponse('用户未认证', 401))
      return
    }

    const result = await purchaseService.generateInquiry(id, {
      supplierIds,
      deadline: new Date(deadline),
      createdById: req.user.id,
    })

    res.status(result.code).json(result)
  } catch (error) {
    res.status(500).json(errorResponse(`生成询价单失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

export default router
