import { Router, type Response } from 'express'
import { errorResponse } from '../utils/response.js'
import { authenticate, type AuthRequest } from '../middleware/auth.middleware.js'
import { operationLogger } from '../middleware/logger.middleware.js'
import inquiryService from '../services/inquiry.service.js'
import type { InquiryStatus } from '@shared/types/index.js'

const router = Router()

router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const pageSize = parseInt(req.query.pageSize as string) || 20
    const status = req.query.status as InquiryStatus
    const category = req.query.category as string
    const deadlineStart = req.query.deadlineStart as string
    const deadlineEnd = req.query.deadlineEnd as string
    const createdById = req.query.createdById as string
    const sortBy = req.query.sortBy as string
    const sortOrder = req.query.sortOrder as 'asc' | 'desc'

    const result = await inquiryService.getInquiries({
      page,
      pageSize,
      status,
      category,
      deadlineStart: deadlineStart ? new Date(deadlineStart) : undefined,
      deadlineEnd: deadlineEnd ? new Date(deadlineEnd) : undefined,
      createdById,
      sortBy,
      sortOrder,
    })

    res.status(result.code).json(result)
  } catch (error) {
    res.status(500).json(errorResponse(`获取询价单列表失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

router.get('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const result = await inquiryService.getInquiryById(id)

    res.status(result.code).json(result)
  } catch (error) {
    res.status(500).json(errorResponse(`获取询价单详情失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

router.post('/', authenticate, operationLogger('inquiries', 'create'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { requirementId, supplierIds, deadline, description } = req.body

    if (!requirementId || !supplierIds || !deadline) {
      res.status(400).json(errorResponse('缺少必要参数'))
      return
    }

    if (!Array.isArray(supplierIds) || supplierIds.length === 0) {
      res.status(400).json(errorResponse('请选择至少一个供应商'))
      return
    }

    if (!req.user?.id) {
      res.status(401).json(errorResponse('用户未认证', 401))
      return
    }

    const result = await inquiryService.createInquiry({
      requirementId,
      supplierIds,
      deadline: new Date(deadline),
      createdById: req.user.id,
      description,
    })

    res.status(result.code).json(result)
  } catch (error) {
    res.status(500).json(errorResponse(`创建询价单失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

router.put('/:id', authenticate, operationLogger('inquiries', 'update'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const { title, category, itemName, specification, quantity, unit, description, deadline, supplierIds, status } = req.body

    const result = await inquiryService.updateInquiry(id, {
      title,
      category,
      itemName,
      specification,
      quantity: quantity !== undefined ? Number(quantity) : undefined,
      unit,
      description,
      deadline: deadline ? new Date(deadline) : undefined,
      supplierIds,
      status,
    })

    res.status(result.code).json(result)
  } catch (error) {
    res.status(500).json(errorResponse(`更新询价单失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

router.post('/:id/send', authenticate, operationLogger('inquiries', 'send'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const result = await inquiryService.sendInquiry(id)

    res.status(result.code).json(result)
  } catch (error) {
    res.status(500).json(errorResponse(`发送询价单失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

router.post('/:id/quotes', authenticate, operationLogger('inquiries', 'submit_quote'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const { supplierId, unitPrice, totalPrice, currency, deliveryDate, deliveryAddress, paymentTerms, warranty, remarks } = req.body

    if (!supplierId || unitPrice === undefined || totalPrice === undefined || !deliveryDate || !deliveryAddress || !paymentTerms) {
      res.status(400).json(errorResponse('缺少必要参数'))
      return
    }

    const result = await inquiryService.submitQuote({
      inquiryId: id,
      supplierId,
      unitPrice: Number(unitPrice),
      totalPrice: Number(totalPrice),
      currency,
      deliveryDate: new Date(deliveryDate),
      deliveryAddress,
      paymentTerms,
      warranty,
      remarks,
    })

    res.status(result.code).json(result)
  } catch (error) {
    res.status(500).json(errorResponse(`提交报价失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

router.get('/:id/quotes', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const supplierId = req.query.supplierId as string
    const status = req.query.status as string

    const result = await inquiryService.getQuotes({
      inquiryId: id,
      supplierId,
      status,
    })

    res.status(result.code).json(result)
  } catch (error) {
    res.status(500).json(errorResponse(`获取报价列表失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

router.post('/:id/compare', authenticate, operationLogger('inquiries', 'compare'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    if (!req.user?.id) {
      res.status(401).json(errorResponse('用户未认证', 401))
      return
    }

    const result = await inquiryService.generateComparisonReport(id, req.user.id)

    res.status(result.code).json(result)
  } catch (error) {
    res.status(500).json(errorResponse(`生成比价报告失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

export default router
