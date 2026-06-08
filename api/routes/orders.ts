import { Router, type Response } from 'express'
import { errorResponse } from '../utils/response.js'
import { authenticate, type AuthRequest } from '../middleware/auth.middleware.js'
import { operationLogger } from '../middleware/logger.middleware.js'
import orderService from '../services/order.service.js'
import type {
  PurchaseOrderStatus,
  LogisticsStatus,
  ReceiptStatus,
  PaymentStatus,
  PaymentType,
} from '@shared/types/index.js'

const router = Router()

router.get('/orders', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const pageSize = parseInt(req.query.pageSize as string) || 20
    const status = req.query.status as PurchaseOrderStatus
    const supplierId = req.query.supplierId as string
    const startDate = req.query.startDate as string
    const endDate = req.query.endDate as string
    const sortBy = req.query.sortBy as string
    const sortOrder = req.query.sortOrder as 'asc' | 'desc'

    const result = await orderService.getOrders({
      status,
      supplierId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      page,
      pageSize,
      sortBy,
      sortOrder,
    })

    res.status(result.code).json(result)
  } catch (error) {
    res.status(500).json(errorResponse(`获取订单列表失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

router.get('/orders/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const result = await orderService.getOrderById(id)

    res.status(result.code).json(result)
  } catch (error) {
    res.status(500).json(errorResponse(`获取订单详情失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

router.post('/orders', authenticate, operationLogger('orders', 'create'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { requirementId, inquiryId, supplierId, unitPrice, deliveryDate, deliveryAddress, paymentTerms } = req.body

    if (!requirementId || !supplierId || !unitPrice || !deliveryDate || !deliveryAddress || !paymentTerms) {
      res.status(400).json(errorResponse('缺少必要参数'))
      return
    }

    if (!req.user?.id) {
      res.status(401).json(errorResponse('用户未认证', 401))
      return
    }

    const result = await orderService.createOrder({
      requirementId,
      inquiryId,
      supplierId,
      unitPrice: Number(unitPrice),
      deliveryDate: new Date(deliveryDate),
      deliveryAddress,
      paymentTerms,
      createdById: req.user.id,
    })

    res.status(result.code).json(result)
  } catch (error) {
    res.status(500).json(errorResponse(`创建订单失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

router.put('/orders/:id', authenticate, operationLogger('orders', 'update'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const { supplierId, unitPrice, deliveryDate, deliveryAddress, paymentTerms, status } = req.body

    const result = await orderService.updateOrder(id, {
      supplierId,
      unitPrice: unitPrice !== undefined ? Number(unitPrice) : undefined,
      deliveryDate: deliveryDate ? new Date(deliveryDate) : undefined,
      deliveryAddress,
      paymentTerms,
      status,
    })

    res.status(result.code).json(result)
  } catch (error) {
    res.status(500).json(errorResponse(`更新订单失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

router.post('/orders/:id/confirm', authenticate, operationLogger('orders', 'confirm'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const result = await orderService.confirmOrder(id)

    res.status(result.code).json(result)
  } catch (error) {
    res.status(500).json(errorResponse(`确认订单失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

router.post('/orders/:id/cancel', authenticate, operationLogger('orders', 'cancel'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const result = await orderService.cancelOrder(id)

    res.status(result.code).json(result)
  } catch (error) {
    res.status(500).json(errorResponse(`取消订单失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

router.put('/orders/:id/logistics', authenticate, operationLogger('orders', 'update_logistics'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const { logisticsStatus, shippingCompany, trackingNumber } = req.body

    if (!logisticsStatus) {
      res.status(400).json(errorResponse('缺少必要参数：物流状态'))
      return
    }

    const result = await orderService.updateLogisticsStatus(id, {
      logisticsStatus: logisticsStatus as LogisticsStatus,
      shippingCompany,
      trackingNumber,
    })

    res.status(result.code).json(result)
  } catch (error) {
    res.status(500).json(errorResponse(`更新物流状态失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

router.post('/orders/:id/receipt', authenticate, operationLogger('receipts', 'create'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const { receivedQuantity, inspectionReport } = req.body

    if (!receivedQuantity) {
      res.status(400).json(errorResponse('缺少必要参数：收货数量'))
      return
    }

    if (!req.user?.id) {
      res.status(401).json(errorResponse('用户未认证', 401))
      return
    }

    const result = await orderService.createReceipt({
      orderId: id,
      receivedQuantity: Number(receivedQuantity),
      inspectionReport,
      receivedById: req.user.id,
    })

    res.status(result.code).json(result)
  } catch (error) {
    res.status(500).json(errorResponse(`创建收货单失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

router.get('/receipts', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const pageSize = parseInt(req.query.pageSize as string) || 20
    const status = req.query.status as ReceiptStatus
    const orderId = req.query.orderId as string
    const startDate = req.query.startDate as string
    const endDate = req.query.endDate as string

    const result = await orderService.getReceipts({
      status,
      orderId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      page,
      pageSize,
    })

    res.status(result.code).json(result)
  } catch (error) {
    res.status(500).json(errorResponse(`获取收货单列表失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

router.get('/receipts/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const result = await orderService.getReceiptById(id)

    res.status(result.code).json(result)
  } catch (error) {
    res.status(500).json(errorResponse(`获取收货单详情失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

router.post('/receipts/:id/accept', authenticate, operationLogger('receipts', 'accept'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const { acceptedQuantity, rejectedQuantity, inspectionReport } = req.body

    if (acceptedQuantity === undefined || rejectedQuantity === undefined) {
      res.status(400).json(errorResponse('缺少必要参数：验收数量和拒收数量'))
      return
    }

    const result = await orderService.acceptReceipt(id, {
      acceptedQuantity: Number(acceptedQuantity),
      rejectedQuantity: Number(rejectedQuantity),
      inspectionReport,
    })

    res.status(result.code).json(result)
  } catch (error) {
    res.status(500).json(errorResponse(`验收处理失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

router.post('/receipts/:id/reject', authenticate, operationLogger('receipts', 'reject'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const { inspectionReport } = req.body

    const result = await orderService.rejectReceipt(id, {
      inspectionReport,
    })

    res.status(result.code).json(result)
  } catch (error) {
    res.status(500).json(errorResponse(`拒绝验收失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

router.get('/payments', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const pageSize = parseInt(req.query.pageSize as string) || 20
    const status = req.query.status as PaymentStatus
    const minAmount = req.query.minAmount as string
    const maxAmount = req.query.maxAmount as string
    const startDate = req.query.startDate as string
    const endDate = req.query.endDate as string

    const result = await orderService.getPayments({
      status,
      minAmount: minAmount !== undefined ? Number(minAmount) : undefined,
      maxAmount: maxAmount !== undefined ? Number(maxAmount) : undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      page,
      pageSize,
    })

    res.status(result.code).json(result)
  } catch (error) {
    res.status(500).json(errorResponse(`获取付款列表失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

router.get('/payments/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const result = await orderService.getPaymentById(id)

    res.status(result.code).json(result)
  } catch (error) {
    res.status(500).json(errorResponse(`获取付款详情失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

router.post('/payments', authenticate, operationLogger('payments', 'create'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { orderId, amount, paymentType, dueDate } = req.body

    if (!orderId || !amount || !paymentType || !dueDate) {
      res.status(400).json(errorResponse('缺少必要参数'))
      return
    }

    const result = await orderService.createPayment({
      orderId,
      amount: Number(amount),
      paymentType: paymentType as PaymentType,
      dueDate: new Date(dueDate),
    })

    res.status(result.code).json(result)
  } catch (error) {
    res.status(500).json(errorResponse(`创建付款申请失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

router.post('/payments/:id/approve', authenticate, operationLogger('payments', 'approve'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const { comment } = req.body

    if (!req.user?.id) {
      res.status(401).json(errorResponse('用户未认证', 401))
      return
    }

    const result = await orderService.approvePayment({
      paymentId: id,
      approverId: req.user.id,
      comment,
    })

    res.status(result.code).json(result)
  } catch (error) {
    res.status(500).json(errorResponse(`审批付款失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

router.post('/payments/:id/reject', authenticate, operationLogger('payments', 'reject'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const { comment } = req.body

    if (!comment) {
      res.status(400).json(errorResponse('请提供驳回理由'))
      return
    }

    if (!req.user?.id) {
      res.status(401).json(errorResponse('用户未认证', 401))
      return
    }

    const result = await orderService.rejectPayment({
      paymentId: id,
      approverId: req.user.id,
      comment,
    })

    res.status(result.code).json(result)
  } catch (error) {
    res.status(500).json(errorResponse(`驳回付款失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

export default router
