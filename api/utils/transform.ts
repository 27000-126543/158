import type {
  PurchaseRequirement,
  Supplier,
  Inquiry,
  Quote,
  ComparisonReport,
  PurchaseOrder,
  Receipt,
  Payment,
  ApprovalFlow,
  ApprovalNode,
  User,
  OperationLog,
  SystemAlert,
  MonthlyReport,
  QuoteComparison,
} from '@shared/types';

export const decimalToNumber = (value: any): number => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return parseFloat(value);
  if (value.toNumber) return value.toNumber();
  return parseFloat(String(value));
};

const transformQuoteComparison = (item: any): QuoteComparison => {
  return {
    supplierId: item.supplierId,
    supplierName: item.supplierName,
    unitPrice: decimalToNumber(item.unitPrice),
    totalPrice: decimalToNumber(item.totalPrice),
    deliveryDate: item.deliveryDate,
    priceScore: decimalToNumber(item.priceScore),
    deliveryScore: decimalToNumber(item.deliveryScore),
    qualityScore: decimalToNumber(item.qualityScore),
    totalScore: decimalToNumber(item.totalScore),
    rank: item.rank,
  };
};

export const transformPurchaseRequirement = (requirement: any): PurchaseRequirement => {
  return {
    id: requirement.id,
    requirementNo: requirement.requirementNo,
    title: requirement.title,
    category: requirement.categoryId || requirement.category,
    itemName: requirement.itemName,
    specification: requirement.specification,
    quantity: requirement.quantity,
    unit: requirement.unit,
    budget: decimalToNumber(requirement.budget),
    expectedDate: requirement.expectedDate,
    description: requirement.description,
    requesterId: requirement.requesterId,
    status: requirement.status,
    approvalFlowId: requirement.approvalFlowId,
    inquiryId: requirement.inquiryId,
    createdAt: requirement.createdAt,
    updatedAt: requirement.updatedAt,
  };
};

export const transformSupplier = (supplier: any): Supplier => {
  return {
    id: supplier.id,
    supplierNo: supplier.supplierNo,
    name: supplier.name,
    shortName: supplier.shortName,
    category: supplier.categoryId || supplier.category,
    contactName: supplier.contactName,
    contactPhone: supplier.contactPhone,
    contactEmail: supplier.contactEmail,
    address: supplier.address,
    businessLicense: supplier.businessLicense,
    taxNumber: supplier.taxNumber,
    bankName: supplier.bankName,
    bankAccount: supplier.bankAccount,
    status: supplier.status,
    creditRating: supplier.creditRating,
    performanceScore: decimalToNumber(supplier.performanceScore),
    performanceLevel: supplier.performanceLevel,
    totalOrders: supplier.totalOrders,
    totalAmount: decimalToNumber(supplier.totalAmount),
    onTimeDeliveryRate: decimalToNumber(supplier.onTimeDeliveryRate),
    qualityPassRate: decimalToNumber(supplier.qualityPassRate),
    satisfactionScore: decimalToNumber(supplier.satisfactionScore),
    createdAt: supplier.createdAt,
    updatedAt: supplier.updatedAt,
  };
};

export const transformInquiry = (inquiry: any): Inquiry => {
  return {
    id: inquiry.id,
    inquiryNo: inquiry.inquiryNo,
    requirementId: inquiry.requirementId,
    title: inquiry.title,
    category: inquiry.categoryId || inquiry.category,
    itemName: inquiry.itemName,
    specification: inquiry.specification,
    quantity: inquiry.quantity,
    unit: inquiry.unit,
    description: inquiry.description,
    supplierIds: inquiry.supplierIds || inquiry.suppliers?.map((s: any) => s.id) || [],
    deadline: inquiry.deadline,
    status: inquiry.status,
    createdById: inquiry.createdById,
    createdAt: inquiry.createdAt,
    updatedAt: inquiry.updatedAt,
  };
};

export const transformQuote = (quote: any): Quote => {
  return {
    id: quote.id,
    quoteNo: quote.quoteNo,
    inquiryId: quote.inquiryId,
    supplierId: quote.supplierId,
    unitPrice: decimalToNumber(quote.unitPrice),
    totalPrice: decimalToNumber(quote.totalPrice),
    currency: quote.currency,
    deliveryDate: quote.deliveryDate,
    deliveryAddress: quote.deliveryAddress,
    paymentTerms: quote.paymentTerms,
    warranty: quote.warranty,
    remarks: quote.remarks,
    status: quote.status,
    createdAt: quote.createdAt,
    updatedAt: quote.updatedAt,
  };
};

export const transformComparisonReport = (report: any): ComparisonReport => {
  const quotes = Array.isArray(report.quotes)
    ? report.quotes.map(transformQuoteComparison)
    : [];

  return {
    id: report.id,
    reportNo: report.reportNo,
    inquiryId: report.inquiryId,
    requirementId: report.requirementId,
    quotes,
    recommendedSupplierId: report.recommendedSupplierId,
    recommendationReason: report.recommendationReason,
    createdById: report.createdById,
    createdAt: report.createdAt,
  };
};

export const transformPurchaseOrder = (order: any): PurchaseOrder => {
  return {
    id: order.id,
    orderNo: order.orderNo,
    requirementId: order.requirementId,
    inquiryId: order.inquiryId,
    supplierId: order.supplierId,
    itemName: order.itemName,
    specification: order.specification,
    quantity: order.quantity,
    unit: order.unit,
    unitPrice: decimalToNumber(order.unitPrice),
    totalAmount: decimalToNumber(order.totalAmount),
    currency: order.currency,
    deliveryDate: order.deliveryDate,
    deliveryAddress: order.deliveryAddress,
    paymentTerms: order.paymentTerms,
    status: order.status,
    logisticsStatus: order.logisticsStatus,
    trackingNumber: order.trackingNumber,
    shippingCompany: order.shippingCompany,
    approvalFlowId: order.approvalFlowId,
    receiptId: order.receiptId,
    paymentId: order.paymentId,
    createdById: order.createdById,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
};

export const transformReceipt = (receipt: any): Receipt => {
  return {
    id: receipt.id,
    receiptNo: receipt.receiptNo,
    orderId: receipt.orderId,
    receivedQuantity: receipt.receivedQuantity,
    acceptedQuantity: receipt.acceptedQuantity,
    rejectedQuantity: receipt.rejectedQuantity,
    inspectionReport: receipt.inspectionReport,
    status: receipt.status,
    receivedById: receipt.receivedById,
    receivedAt: receipt.receivedAt,
    createdAt: receipt.createdAt,
  };
};

export const transformPayment = (payment: any): Payment => {
  return {
    id: payment.id,
    paymentNo: payment.paymentNo,
    orderId: payment.orderId,
    amount: decimalToNumber(payment.amount),
    currency: payment.currency,
    paymentType: payment.paymentType,
    dueDate: payment.dueDate,
    actualPaidDate: payment.actualPaidDate,
    status: payment.status,
    approvalFlowId: payment.approvalFlowId,
    approvalLevel: payment.approvalLevel,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
  };
};

export const transformApprovalFlow = (flow: any): ApprovalFlow => {
  return {
    id: flow.id,
    type: flow.type,
    status: flow.status,
    currentNode: flow.currentNode,
    relatedId: flow.relatedId,
    relatedType: flow.relatedType,
    nodes: flow.nodes?.map(transformApprovalNode) || [],
    createdAt: flow.createdAt,
  };
};

export const transformApprovalNode = (node: any): ApprovalNode => {
  return {
    id: node.id,
    flowId: node.flowId,
    level: node.level,
    approverRole: node.approverRole,
    approverId: node.approverId,
    status: node.status,
    comment: node.comment,
    approvedAt: node.approvedAt,
  };
};

export const transformUser = (user: any): User => {
  return {
    id: user.id,
    username: user.username,
    realName: user.realName,
    role: user.role,
    email: user.email,
    phone: user.phone,
    department: user.department,
    supplierId: user.supplierId,
    createdAt: user.createdAt,
  };
};

export const transformOperationLog = (log: any): OperationLog => {
  return {
    id: log.id,
    userId: log.userId,
    action: log.action,
    module: log.module,
    resourceId: log.resourceId,
    details: log.details,
    ipAddress: log.ipAddress,
    createdAt: log.createdAt,
  };
};

export const transformSystemAlert = (alert: any): SystemAlert => {
  return {
    id: alert.id,
    type: alert.type,
    level: alert.level,
    title: alert.title,
    content: alert.content,
    relatedId: alert.relatedId,
    status: alert.status,
    createdAt: alert.createdAt,
  };
};

export const transformMonthlyReport = (report: any): MonthlyReport => {
  return {
    id: report.id,
    yearMonth: report.yearMonth,
    purchaseByCategory: report.purchaseByCategory,
    supplierRanking: report.supplierRanking,
    paymentTimeliness: report.paymentTimeliness,
    satisfactionScores: report.satisfactionScores,
    performanceMetrics: report.performanceMetrics,
    revenueTrend: report.revenueTrend,
    revenueByBusinessLine: report.revenueByBusinessLine,
    splitRatioByBusinessLine: report.splitRatioByBusinessLine,
    settlementAccuracy: report.settlementAccuracy !== undefined ? decimalToNumber(report.settlementAccuracy) : undefined,
    noDiffRate: report.noDiffRate !== undefined ? decimalToNumber(report.noDiffRate) : undefined,
    createdAt: report.createdAt,
  };
};

export default {
  decimalToNumber,
  transformPurchaseRequirement,
  transformSupplier,
  transformInquiry,
  transformQuote,
  transformComparisonReport,
  transformPurchaseOrder,
  transformReceipt,
  transformPayment,
  transformApprovalFlow,
  transformApprovalNode,
  transformUser,
  transformOperationLog,
  transformSystemAlert,
  transformMonthlyReport,
};
