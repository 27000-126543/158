import prisma from '../utils/prisma.js';
import {
  transformPurchaseOrder,
  transformReceipt,
  transformPayment,
  transformApprovalFlow,
  decimalToNumber,
} from '../utils/transform.js';
import {
  successResponse,
  errorResponse,
  createdResponse,
  paginatedResponse,
} from '../utils/response.js';
import type {
  PurchaseOrder,
  Receipt,
  Payment,
  PaginatedResponse,
  PurchaseOrderStatus,
  LogisticsStatus,
  ReceiptStatus,
  PaymentStatus,
  PaymentType,
  ApiResponse,
  ApprovalFlow,
  ApprovalStatus,
  UserRole,
} from '@shared/types';

const PAYMENT_THRESHOLD_1 = 500000;
const PAYMENT_THRESHOLD_2 = 2000000;

interface OrderQueryParams {
  status?: PurchaseOrderStatus;
  supplierId?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface OrderCreateData {
  requirementId: string;
  inquiryId?: string;
  supplierId: string;
  unitPrice: number;
  deliveryDate: Date;
  deliveryAddress: string;
  paymentTerms: string;
  createdById: string;
}

interface OrderUpdateData {
  supplierId?: string;
  unitPrice?: number;
  deliveryDate?: Date;
  deliveryAddress?: string;
  paymentTerms?: string;
  status?: PurchaseOrderStatus;
}

interface LogisticsUpdateData {
  logisticsStatus: LogisticsStatus;
  shippingCompany?: string;
  trackingNumber?: string;
}

interface ReceiptQueryParams {
  status?: ReceiptStatus;
  orderId?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  pageSize?: number;
}

interface ReceiptCreateData {
  orderId: string;
  receivedQuantity: number;
  inspectionReport?: string;
  receivedById: string;
}

interface ReceiptProcessData {
  acceptedQuantity: number;
  rejectedQuantity: number;
  inspectionReport?: string;
}

interface PaymentQueryParams {
  status?: PaymentStatus;
  minAmount?: number;
  maxAmount?: number;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  pageSize?: number;
}

interface PaymentCreateData {
  orderId: string;
  amount: number;
  paymentType: PaymentType;
  dueDate: Date;
}

interface PaymentApprovalData {
  paymentId: string;
  approverId: string;
  comment?: string;
}

const generateOrderNo = async (): Promise<string> => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const datePart = `${year}${month}${day}`;
  const prefix = `ORD-${datePart}-`;

  const lastOrder = await prisma.purchaseOrder.findFirst({
    where: { orderNo: { startsWith: prefix } },
    orderBy: { orderNo: 'desc' },
  });

  let sequence = 1;
  if (lastOrder) {
    const parts = lastOrder.orderNo.split('-');
    const lastSequence = parseInt(parts[2] || '0', 10);
    sequence = lastSequence + 1;
  }

  return `${prefix}${String(sequence).padStart(4, '0')}`;
};

const generateReceiptNo = async (): Promise<string> => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const datePart = `${year}${month}${day}`;
  const prefix = `RCT-${datePart}-`;

  const lastReceipt = await prisma.receipt.findFirst({
    where: { receiptNo: { startsWith: prefix } },
    orderBy: { receiptNo: 'desc' },
  });

  let sequence = 1;
  if (lastReceipt) {
    const parts = lastReceipt.receiptNo.split('-');
    const lastSequence = parseInt(parts[2] || '0', 10);
    sequence = lastSequence + 1;
  }

  return `${prefix}${String(sequence).padStart(4, '0')}`;
};

const generatePaymentNo = async (): Promise<string> => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const datePart = `${year}${month}${day}`;
  const prefix = `PAY-${datePart}-`;

  const lastPayment = await prisma.payment.findFirst({
    where: { paymentNo: { startsWith: prefix } },
    orderBy: { paymentNo: 'desc' },
  });

  let sequence = 1;
  if (lastPayment) {
    const parts = lastPayment.paymentNo.split('-');
    const lastSequence = parseInt(parts[2] || '0', 10);
    sequence = lastSequence + 1;
  }

  return `${prefix}${String(sequence).padStart(4, '0')}`;
};

const getPaymentApprovalLevels = (amount: number): { role: UserRole; level: number }[] => {
  if (amount <= PAYMENT_THRESHOLD_1) {
    return [{ role: 'finance', level: 0 }];
  } else if (amount <= PAYMENT_THRESHOLD_2) {
    return [
      { role: 'finance', level: 0 },
      { role: 'finance_director', level: 1 },
    ];
  } else {
    return [
      { role: 'finance', level: 0 },
      { role: 'finance_director', level: 1 },
      { role: 'ceo', level: 2 },
    ];
  }
};

const createPaymentApprovalFlow = async (
  paymentId: string,
  amount: number
): Promise<ApprovalFlow> => {
  const levels = getPaymentApprovalLevels(amount);

  const flow = await prisma.approvalFlow.create({
    data: {
      type: 'payment_approval',
      relatedId: paymentId,
      relatedType: 'payment',
      currentNode: 0,
      nodes: {
        create: levels.map((level) => ({
          level: level.level,
          approverRole: level.role,
        })),
      },
    },
    include: {
      nodes: true,
    },
  });

  return transformApprovalFlow(flow);
};

const orderService = {
  async getOrders(
    params: OrderQueryParams
  ): Promise<ApiResponse<PaginatedResponse<PurchaseOrder>>> {
    try {
      const {
        status,
        supplierId,
        startDate,
        endDate,
        page = 1,
        pageSize = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = params;

      const where: any = {};

      if (status) where.status = status;
      if (supplierId) where.supplierId = supplierId;
      if (startDate) where.createdAt = { ...where.createdAt, gte: startDate };
      if (endDate) where.createdAt = { ...where.createdAt, lte: endDate };

      const [total, records] = await Promise.all([
        prisma.purchaseOrder.count({ where }),
        prisma.purchaseOrder.findMany({
          where,
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: { [sortBy]: sortOrder },
          include: {
            supplier: true,
            category: true,
            createdBy: true,
          },
        }),
      ]);

      const items: PurchaseOrder[] = records.map(transformPurchaseOrder);

      return paginatedResponse(items, total, page, pageSize);
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : '获取订单列表失败');
    }
  },

  async getOrderById(id: string): Promise<ApiResponse<PurchaseOrder | null>> {
    try {
      const record = await prisma.purchaseOrder.findUnique({
        where: { id },
        include: {
          supplier: true,
          category: true,
          createdBy: true,
          requirement: true,
          inquiry: true,
          receipt: true,
          payment: true,
          approvalFlow: {
            include: {
              nodes: {
                include: {
                  approver: true,
                },
              },
            },
          },
        },
      });

      if (!record) {
        return errorResponse('订单不存在', 404);
      }

      const order = transformPurchaseOrder(record);
      return successResponse(order);
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : '获取订单详情失败');
    }
  },

  async createOrder(data: OrderCreateData): Promise<ApiResponse<PurchaseOrder>> {
    try {
      const requirement = await prisma.purchaseRequirement.findUnique({
        where: { id: data.requirementId },
        include: {
          category: true,
        },
      });

      if (!requirement) {
        return errorResponse('采购需求不存在', 404);
      }

      if (requirement.status === 'order_created') {
        return errorResponse('该采购需求已创建订单');
      }

      let inquiry = null;
      if (data.inquiryId) {
        inquiry = await prisma.inquiry.findUnique({
          where: { id: data.inquiryId },
          include: {
            comparisonReport: true,
          },
        });

        if (!inquiry) {
          return errorResponse('询价单不存在', 404);
        }

        const selectedQuote = await prisma.quote.findFirst({
          where: {
            inquiryId: data.inquiryId,
            supplierId: data.supplierId,
            status: 'selected',
          },
        });

        if (!selectedQuote) {
          return errorResponse('该供应商未被选中或未提交报价');
        }
      }

      const supplier = await prisma.supplier.findUnique({
        where: { id: data.supplierId },
      });

      if (!supplier) {
        return errorResponse('供应商不存在', 404);
      }

      const orderNo = await generateOrderNo();
      const totalAmount = data.unitPrice * requirement.quantity;

      const order = await prisma.$transaction(async (tx) => {
        const newOrder = await tx.purchaseOrder.create({
          data: {
            orderNo,
            requirementId: data.requirementId,
            inquiryId: data.inquiryId,
            supplierId: data.supplierId,
            categoryId: requirement.categoryId,
            itemName: requirement.itemName,
            specification: requirement.specification,
            quantity: requirement.quantity,
            unit: requirement.unit,
            unitPrice: data.unitPrice,
            totalAmount,
            deliveryDate: data.deliveryDate,
            deliveryAddress: data.deliveryAddress,
            paymentTerms: data.paymentTerms,
            status: 'draft',
            logisticsStatus: 'pending',
            createdById: data.createdById,
          },
          include: {
            supplier: true,
            category: true,
            createdBy: true,
          },
        });

        await tx.purchaseRequirement.update({
          where: { id: data.requirementId },
          data: { status: 'order_created' },
        });

        return newOrder;
      });

      const result = transformPurchaseOrder(order);
      return createdResponse(result, '订单创建成功');
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : '创建订单失败');
    }
  },

  async updateOrder(
    id: string,
    data: OrderUpdateData
  ): Promise<ApiResponse<PurchaseOrder>> {
    try {
      const existing = await prisma.purchaseOrder.findUnique({
        where: { id },
      });

      if (!existing) {
        return errorResponse('订单不存在', 404);
      }

      if (existing.status !== 'draft') {
        return errorResponse('只有草稿状态的订单可以修改');
      }

      const updateData: any = {};
      if (data.supplierId !== undefined) updateData.supplierId = data.supplierId;
      if (data.unitPrice !== undefined) {
        updateData.unitPrice = data.unitPrice;
        updateData.totalAmount = data.unitPrice * existing.quantity;
      }
      if (data.deliveryDate !== undefined) updateData.deliveryDate = data.deliveryDate;
      if (data.deliveryAddress !== undefined) updateData.deliveryAddress = data.deliveryAddress;
      if (data.paymentTerms !== undefined) updateData.paymentTerms = data.paymentTerms;
      if (data.status !== undefined) updateData.status = data.status;

      const record = await prisma.purchaseOrder.update({
        where: { id },
        data: updateData,
        include: {
          supplier: true,
          category: true,
          createdBy: true,
        },
      });

      const order = transformPurchaseOrder(record);
      return successResponse(order, '订单更新成功');
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : '更新订单失败');
    }
  },

  async updateLogisticsStatus(
    id: string,
    data: LogisticsUpdateData
  ): Promise<ApiResponse<PurchaseOrder>> {
    try {
      const existing = await prisma.purchaseOrder.findUnique({
        where: { id },
      });

      if (!existing) {
        return errorResponse('订单不存在', 404);
      }

      if (existing.status === 'cancelled' || existing.status === 'completed') {
        return errorResponse('该订单状态不允许更新物流信息');
      }

      const updateData: any = {
        logisticsStatus: data.logisticsStatus,
      };

      if (data.shippingCompany !== undefined) {
        updateData.shippingCompany = data.shippingCompany;
      }
      if (data.trackingNumber !== undefined) {
        updateData.trackingNumber = data.trackingNumber;
      }

      if (data.logisticsStatus === 'delivered' || data.logisticsStatus === 'signed') {
        updateData.status = 'delivered';
      } else if (data.logisticsStatus === 'in_transit') {
        updateData.status = 'shipped';
      } else if (data.logisticsStatus === 'picked') {
        updateData.status = 'processing';
      }

      const record = await prisma.purchaseOrder.update({
        where: { id },
        data: updateData,
        include: {
          supplier: true,
          category: true,
          createdBy: true,
        },
      });

      const order = transformPurchaseOrder(record);
      return successResponse(order, '物流信息更新成功');
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : '更新物流信息失败');
    }
  },

  async confirmOrder(id: string): Promise<ApiResponse<PurchaseOrder>> {
    try {
      const existing = await prisma.purchaseOrder.findUnique({
        where: { id },
      });

      if (!existing) {
        return errorResponse('订单不存在', 404);
      }

      if (existing.status !== 'draft') {
        return errorResponse('只有草稿状态的订单可以确认');
      }

      const record = await prisma.purchaseOrder.update({
        where: { id },
        data: { status: 'confirmed' },
        include: {
          supplier: true,
          category: true,
          createdBy: true,
        },
      });

      const order = transformPurchaseOrder(record);
      return successResponse(order, '订单确认成功');
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : '确认订单失败');
    }
  },

  async cancelOrder(id: string): Promise<ApiResponse<PurchaseOrder>> {
    try {
      const existing = await prisma.purchaseOrder.findUnique({
        where: { id },
      });

      if (!existing) {
        return errorResponse('订单不存在', 404);
      }

      if (existing.status === 'completed' || existing.status === 'cancelled') {
        return errorResponse('该订单状态不允许取消');
      }

      const existingReceipt = await prisma.receipt.findUnique({
        where: { orderId: id },
      });

      if (existingReceipt && existingReceipt.status === 'accepted') {
        return errorResponse('该订单已完成验收，无法取消');
      }

      const existingPayment = await prisma.payment.findUnique({
        where: { orderId: id },
      });

      if (existingPayment && existingPayment.status !== 'rejected') {
        return errorResponse('该订单已有付款申请，无法取消');
      }

      const record = await prisma.purchaseOrder.update({
        where: { id },
        data: { status: 'cancelled' },
        include: {
          supplier: true,
          category: true,
          createdBy: true,
        },
      });

      const order = transformPurchaseOrder(record);
      return successResponse(order, '订单取消成功');
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : '取消订单失败');
    }
  },

  async createReceipt(data: ReceiptCreateData): Promise<ApiResponse<Receipt>> {
    try {
      const order = await prisma.purchaseOrder.findUnique({
        where: { id: data.orderId },
      });

      if (!order) {
        return errorResponse('订单不存在', 404);
      }

      if (order.status === 'cancelled' || order.status === 'completed') {
        return errorResponse('该订单状态不允许创建收货单');
      }

      const existingReceipt = await prisma.receipt.findUnique({
        where: { orderId: data.orderId },
      });

      if (existingReceipt) {
        return errorResponse('该订单已存在收货单');
      }

      if (data.receivedQuantity > order.quantity) {
        return errorResponse('收货数量不能超过订单数量');
      }

      const receiptNo = await generateReceiptNo();

      const receipt = await prisma.$transaction(async (tx) => {
        const newReceipt = await tx.receipt.create({
          data: {
            receiptNo,
            orderId: data.orderId,
            receivedQuantity: data.receivedQuantity,
            acceptedQuantity: 0,
            rejectedQuantity: 0,
            inspectionReport: data.inspectionReport,
            status: 'inspecting',
            receivedById: data.receivedById,
            receivedAt: new Date(),
          },
          include: {
            order: {
              include: {
                supplier: true,
              },
            },
            receivedBy: true,
          },
        });

        await tx.purchaseOrder.update({
          where: { id: data.orderId },
          data: { status: 'delivered' },
        });

        return newReceipt;
      });

      const result = transformReceipt(receipt);
      return createdResponse(result, '收货单创建成功');
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : '创建收货单失败');
    }
  },

  async getReceipts(
    params: ReceiptQueryParams
  ): Promise<ApiResponse<PaginatedResponse<Receipt>>> {
    try {
      const {
        status,
        orderId,
        startDate,
        endDate,
        page = 1,
        pageSize = 20,
      } = params;

      const where: any = {};

      if (status) where.status = status;
      if (orderId) where.orderId = orderId;
      if (startDate) where.createdAt = { ...where.createdAt, gte: startDate };
      if (endDate) where.createdAt = { ...where.createdAt, lte: endDate };

      const [total, records] = await Promise.all([
        prisma.receipt.count({ where }),
        prisma.receipt.findMany({
          where,
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
          include: {
            order: {
              include: {
                supplier: true,
              },
            },
            receivedBy: true,
          },
        }),
      ]);

      const items: Receipt[] = records.map(transformReceipt);

      return paginatedResponse(items, total, page, pageSize);
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : '获取收货单列表失败');
    }
  },

  async getReceiptById(id: string): Promise<ApiResponse<Receipt | null>> {
    try {
      const record = await prisma.receipt.findUnique({
        where: { id },
        include: {
          order: {
            include: {
              supplier: true,
              category: true,
            },
          },
          receivedBy: true,
        },
      });

      if (!record) {
        return errorResponse('收货单不存在', 404);
      }

      const receipt = transformReceipt(record);
      return successResponse(receipt);
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : '获取收货单详情失败');
    }
  },

  async acceptReceipt(
    id: string,
    data: ReceiptProcessData
  ): Promise<ApiResponse<Receipt>> {
    try {
      const existing = await prisma.receipt.findUnique({
        where: { id },
        include: {
          order: true,
        },
      });

      if (!existing) {
        return errorResponse('收货单不存在', 404);
      }

      if (existing.status !== 'inspecting') {
        return errorResponse('只有验收中的收货单可以处理');
      }

      const totalQuantity = data.acceptedQuantity + data.rejectedQuantity;
      if (totalQuantity !== existing.receivedQuantity) {
        return errorResponse('验收数量合计必须等于收货数量');
      }

      let status: ReceiptStatus = 'accepted';
      if (data.rejectedQuantity > 0 && data.acceptedQuantity > 0) {
        status = 'partial';
      } else if (data.rejectedQuantity > 0) {
        status = 'rejected';
      }

      const receipt = await prisma.$transaction(async (tx) => {
        const updatedReceipt = await tx.receipt.update({
          where: { id },
          data: {
            acceptedQuantity: data.acceptedQuantity,
            rejectedQuantity: data.rejectedQuantity,
            inspectionReport: data.inspectionReport,
            status,
          },
          include: {
            order: {
              include: {
                supplier: true,
              },
            },
            receivedBy: true,
          },
        });

        if (status === 'accepted' || status === 'partial') {
          await tx.purchaseOrder.update({
            where: { id: existing.orderId },
            data: { status: 'completed' },
          });

          const existingPayment = await tx.payment.findUnique({
            where: { orderId: existing.orderId },
          });

          if (!existingPayment && data.acceptedQuantity > 0) {
            const paymentAmount =
              decimalToNumber(existing.order.unitPrice) * data.acceptedQuantity;
            const paymentNo = await generatePaymentNo();
            const approvalLevels = getPaymentApprovalLevels(paymentAmount);

            const newPayment = await tx.payment.create({
              data: {
                paymentNo,
                orderId: existing.orderId,
                supplierId: existing.order.supplierId,
                amount: paymentAmount,
                paymentType: 'final',
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                status: 'pending',
                approvalLevel: approvalLevels.length,
              },
            });

            await tx.approvalFlow.create({
              data: {
                type: 'payment_approval',
                relatedId: newPayment.id,
                relatedType: 'payment',
                currentNode: 0,
                nodes: {
                  create: approvalLevels.map((level) => ({
                    level: level.level,
                    approverRole: level.role,
                  })),
                },
              },
            });

            await tx.payment.update({
              where: { id: newPayment.id },
              data: { approvalFlowId: newPayment.id },
            });
          }
        }

        return updatedReceipt;
      });

      const result = transformReceipt(receipt);
      return successResponse(result, '验收通过，已自动发起付款申请');
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : '验收处理失败');
    }
  },

  async rejectReceipt(
    id: string,
    data: { inspectionReport?: string }
  ): Promise<ApiResponse<Receipt>> {
    try {
      const existing = await prisma.receipt.findUnique({
        where: { id },
        include: {
          order: true,
        },
      });

      if (!existing) {
        return errorResponse('收货单不存在', 404);
      }

      if (existing.status !== 'inspecting') {
        return errorResponse('只有验收中的收货单可以拒绝');
      }

      const receipt = await prisma.$transaction(async (tx) => {
        const updatedReceipt = await tx.receipt.update({
          where: { id },
          data: {
            acceptedQuantity: 0,
            rejectedQuantity: existing.receivedQuantity,
            inspectionReport: data.inspectionReport,
            status: 'rejected',
          },
          include: {
            order: {
              include: {
                supplier: true,
              },
            },
            receivedBy: true,
          },
        });

        await tx.purchaseOrder.update({
          where: { id: existing.orderId },
          data: { status: 'processing' },
        });

        return updatedReceipt;
      });

      const result = transformReceipt(receipt);
      return successResponse(result, '验收已拒绝');
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : '拒绝验收失败');
    }
  },

  async getPayments(
    params: PaymentQueryParams
  ): Promise<ApiResponse<PaginatedResponse<Payment>>> {
    try {
      const {
        status,
        minAmount,
        maxAmount,
        startDate,
        endDate,
        page = 1,
        pageSize = 20,
      } = params;

      const where: any = {};

      if (status) where.status = status;
      if (minAmount !== undefined) where.amount = { ...where.amount, gte: minAmount };
      if (maxAmount !== undefined) where.amount = { ...where.amount, lte: maxAmount };
      if (startDate) where.createdAt = { ...where.createdAt, gte: startDate };
      if (endDate) where.createdAt = { ...where.createdAt, lte: endDate };

      const [total, records] = await Promise.all([
        prisma.payment.count({ where }),
        prisma.payment.findMany({
          where,
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
          include: {
            order: {
              include: {
                supplier: true,
              },
            },
            supplier: true,
          },
        }),
      ]);

      const items: Payment[] = records.map(transformPayment);

      return paginatedResponse(items, total, page, pageSize);
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : '获取付款列表失败');
    }
  },

  async getPaymentById(id: string): Promise<ApiResponse<Payment | null>> {
    try {
      const record = await prisma.payment.findUnique({
        where: { id },
        include: {
          order: {
            include: {
              supplier: true,
              category: true,
            },
          },
          supplier: true,
          approvalFlow: {
            include: {
              nodes: {
                include: {
                  approver: true,
                },
              },
            },
          },
        },
      });

      if (!record) {
        return errorResponse('付款申请不存在', 404);
      }

      const payment = transformPayment(record);
      return successResponse(payment);
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : '获取付款详情失败');
    }
  },

  async createPayment(data: PaymentCreateData): Promise<ApiResponse<Payment>> {
    try {
      const order = await prisma.purchaseOrder.findUnique({
        where: { id: data.orderId },
        include: {
          receipt: true,
        },
      });

      if (!order) {
        return errorResponse('订单不存在', 404);
      }

      if (order.status !== 'completed' && order.status !== 'delivered') {
        return errorResponse('只有已交付或已完成的订单可以创建付款申请');
      }

      if (!order.receipt || order.receipt.status !== 'accepted') {
        return errorResponse('订单尚未完成验收，无法创建付款申请');
      }

      const existingPayment = await prisma.payment.findUnique({
        where: { orderId: data.orderId },
      });

      if (existingPayment) {
        return errorResponse('该订单已存在付款申请');
      }

      const maxAllowedAmount =
        decimalToNumber(order.unitPrice) * order.receipt.acceptedQuantity;
      if (data.amount > maxAllowedAmount) {
        return errorResponse(`付款金额不能超过 ${maxAllowedAmount}`);
      }

      const paymentNo = await generatePaymentNo();
      const approvalLevels = getPaymentApprovalLevels(data.amount);

      const payment = await prisma.$transaction(async (tx) => {
        const newPayment = await tx.payment.create({
          data: {
            paymentNo,
            orderId: data.orderId,
            supplierId: order.supplierId,
            amount: data.amount,
            paymentType: data.paymentType,
            dueDate: data.dueDate,
            status: 'pending',
            approvalLevel: approvalLevels.length,
          },
          include: {
            order: {
              include: {
                supplier: true,
              },
            },
            supplier: true,
          },
        });

        const approvalFlow = await tx.approvalFlow.create({
          data: {
            type: 'payment_approval',
            relatedId: newPayment.id,
            relatedType: 'payment',
            currentNode: 0,
            nodes: {
              create: approvalLevels.map((level) => ({
                level: level.level,
                approverRole: level.role,
              })),
            },
          },
          include: {
            nodes: true,
          },
        });

        await tx.payment.update({
          where: { id: newPayment.id },
          data: { approvalFlowId: approvalFlow.id },
        });

        return { ...newPayment, approvalFlow };
      });

      const result = transformPayment(payment);
      return createdResponse(result, '付款申请创建成功');
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : '创建付款申请失败');
    }
  },

  async approvePayment(data: PaymentApprovalData): Promise<ApiResponse<Payment>> {
    try {
      const payment = await prisma.payment.findUnique({
        where: { id: data.paymentId },
        include: {
          approvalFlow: {
            include: {
              nodes: true,
            },
          },
        },
      });

      if (!payment) {
        return errorResponse('付款申请不存在', 404);
      }

      if (payment.status !== 'pending') {
        return errorResponse(`付款状态为 ${payment.status}，无法审批`);
      }

      if (!payment.approvalFlow) {
        return errorResponse('付款申请没有审批流');
      }

      const flow = payment.approvalFlow;
      if (flow.status !== 'pending') {
        return errorResponse(`审批流状态为 ${flow.status}，无法审批`);
      }

      const currentNode = flow.nodes.find((n) => n.level === flow.currentNode);
      if (!currentNode) {
        return errorResponse('找不到当前审批节点');
      }

      if (currentNode.status !== 'pending') {
        return errorResponse('当前节点已处理');
      }

      const approver = await prisma.user.findUnique({
        where: { id: data.approverId },
      });

      if (!approver) {
        return errorResponse('审批人不存在');
      }

      if (approver.role !== currentNode.approverRole) {
        return errorResponse(
          `审批人角色 ${approver.role} 无权审批该节点，需要 ${currentNode.approverRole}`
        );
      }

      const isLastNode = flow.currentNode === flow.nodes.length - 1;

      const updatedPayment = await prisma.$transaction(async (tx) => {
        await tx.approvalNode.update({
          where: { id: currentNode.id },
          data: {
            approverId: data.approverId,
            status: 'approved',
            comment: data.comment,
            approvedAt: new Date(),
          },
        });

        let newFlowStatus: ApprovalStatus = 'pending';
        let newCurrentNode = flow.currentNode;
        let newPaymentStatus: PaymentStatus = 'pending';

        if (isLastNode) {
          newFlowStatus = 'approved';
          newPaymentStatus = 'approved';
        } else {
          newCurrentNode = flow.currentNode + 1;
        }

        await tx.approvalFlow.update({
          where: { id: flow.id },
          data: {
            status: newFlowStatus,
            currentNode: newCurrentNode,
          },
        });

        const updated = await tx.payment.update({
          where: { id: data.paymentId },
          data: {
            status: newPaymentStatus,
            actualPaidDate: newPaymentStatus === 'approved' ? new Date() : undefined,
          },
          include: {
            order: {
              include: {
                supplier: true,
              },
            },
            supplier: true,
            approvalFlow: {
              include: {
                nodes: {
                  include: {
                    approver: true,
                  },
                },
              },
            },
          },
        });

        return updated;
      });

      const result = transformPayment(updatedPayment);
      const message = isLastNode ? '付款审批完成，已批准付款' : '审批通过，进入下一节点';
      return successResponse(result, message);
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : '审批付款失败');
    }
  },

  async rejectPayment(
    data: PaymentApprovalData & { comment: string }
  ): Promise<ApiResponse<Payment>> {
    try {
      const payment = await prisma.payment.findUnique({
        where: { id: data.paymentId },
        include: {
          approvalFlow: {
            include: {
              nodes: true,
            },
          },
        },
      });

      if (!payment) {
        return errorResponse('付款申请不存在', 404);
      }

      if (payment.status !== 'pending') {
        return errorResponse(`付款状态为 ${payment.status}，无法驳回`);
      }

      if (!payment.approvalFlow) {
        return errorResponse('付款申请没有审批流');
      }

      const flow = payment.approvalFlow;
      if (flow.status !== 'pending') {
        return errorResponse(`审批流状态为 ${flow.status}，无法驳回`);
      }

      const currentNode = flow.nodes.find((n) => n.level === flow.currentNode);
      if (!currentNode) {
        return errorResponse('找不到当前审批节点');
      }

      if (currentNode.status !== 'pending') {
        return errorResponse('当前节点已处理');
      }

      const approver = await prisma.user.findUnique({
        where: { id: data.approverId },
      });

      if (!approver) {
        return errorResponse('审批人不存在');
      }

      if (approver.role !== currentNode.approverRole) {
        return errorResponse(
          `审批人角色 ${approver.role} 无权审批该节点，需要 ${currentNode.approverRole}`
        );
      }

      const updatedPayment = await prisma.$transaction(async (tx) => {
        await tx.approvalNode.update({
          where: { id: currentNode.id },
          data: {
            approverId: data.approverId,
            status: 'rejected',
            comment: data.comment,
            approvedAt: new Date(),
          },
        });

        await tx.approvalFlow.update({
          where: { id: flow.id },
          data: {
            status: 'rejected',
          },
        });

        const updated = await tx.payment.update({
          where: { id: data.paymentId },
          data: {
            status: 'rejected',
          },
          include: {
            order: {
              include: {
                supplier: true,
              },
            },
            supplier: true,
            approvalFlow: {
              include: {
                nodes: {
                  include: {
                    approver: true,
                  },
                },
              },
            },
          },
        });

        return updated;
      });

      const result = transformPayment(updatedPayment);
      return successResponse(result, '付款申请已驳回');
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : '驳回付款失败');
    }
  },
};

export default orderService;
