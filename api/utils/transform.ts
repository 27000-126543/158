import type { Prisma } from '@prisma/client';
import type {
  RevenueRecord,
  SplitDetail,
  SplitRule,
  SplitRuleHistory,
  Settlement,
  PaymentInstruction,
  ApprovalFlow,
  ApprovalNode,
  BankTransaction,
  ReconciliationDiff,
  WorkOrder,
  User,
  OperationLog,
  SystemAlert,
  MonthlyReport,
} from '@shared/types';

export const decimalToNumber = (value: any): number => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return parseFloat(value);
  if (value.toNumber) return value.toNumber();
  return parseFloat(String(value));
};

export const transformRevenueRecord = (record: any): RevenueRecord => {
  return {
    id: record.id,
    transactionNo: record.transactionNo,
    businessLine: record.businessLine,
    channel: record.channel,
    customer: record.customer,
    amount: decimalToNumber(record.amount),
    currency: record.currency,
    transactionTime: record.transactionTime,
    splitDetails: record.splitDetails?.map(transformSplitDetail) || [],
    settlementId: record.settlementId,
    reconciliationStatus: record.reconciliationStatus,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
};

export const transformSplitDetail = (detail: any): SplitDetail => {
  return {
    id: detail.id,
    revenueId: detail.revenueId,
    businessLine: detail.businessLine,
    ratio: decimalToNumber(detail.ratio),
    amount: decimalToNumber(detail.amount),
    createdAt: detail.createdAt,
  };
};

export const transformSplitRule = (rule: any): SplitRule => {
  return {
    id: rule.id,
    businessLine: rule.businessLine,
    ratios: rule.ratios,
    effectiveDate: rule.effectiveDate,
    expiryDate: rule.expiryDate,
    status: rule.status,
    version: rule.version,
    createdBy: rule.createdBy,
    approvalFlowId: rule.approvalFlowId,
    createdAt: rule.createdAt,
  };
};

export const transformSplitRuleHistory = (history: any): SplitRuleHistory => {
  return {
    id: history.id,
    ruleId: history.ruleId,
    oldRatios: history.oldRatios,
    newRatios: history.newRatios,
    changeReason: history.changeReason,
    changedBy: history.changedBy,
    createdAt: history.createdAt,
  };
};

export const transformSettlement = (settlement: any): Settlement => {
  return {
    id: settlement.id,
    settlementNo: settlement.settlementNo,
    businessLine: settlement.businessLine,
    settlementDate: settlement.settlementDate,
    totalAmount: decimalToNumber(settlement.totalAmount),
    budgetThreshold: decimalToNumber(settlement.budgetThreshold),
    overBudget: settlement.overBudget,
    status: settlement.status,
    approvalFlowId: settlement.approvalFlowId,
    paymentInstructionId: settlement.paymentInstructionId,
    createdAt: settlement.createdAt,
  };
};

export const transformPaymentInstruction = (instruction: any): PaymentInstruction => {
  return {
    id: instruction.id,
    instructionNo: instruction.instructionNo,
    settlementId: instruction.settlementId,
    payeeAccount: instruction.payeeAccount,
    payeeName: instruction.payeeName,
    payeeBank: instruction.payeeBank,
    amount: decimalToNumber(instruction.amount),
    status: instruction.status,
    sentAt: instruction.sentAt,
    paidAt: instruction.paidAt,
    createdAt: instruction.createdAt,
  };
};

export const transformApprovalFlow = (flow: any): ApprovalFlow => {
  return {
    id: flow.id,
    type: flow.type,
    status: flow.status,
    currentNode: flow.currentNode,
    relatedId: flow.relatedId,
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

export const transformBankTransaction = (transaction: any): BankTransaction => {
  return {
    id: transaction.id,
    bankTransactionNo: transaction.bankTransactionNo,
    amount: decimalToNumber(transaction.amount),
    transactionTime: transaction.transactionTime,
    payerAccount: transaction.payerAccount,
    payerName: transaction.payerName,
    matchedRevenueId: transaction.matchedRevenueId,
    matchStatus: transaction.matchStatus,
    createdAt: transaction.createdAt,
  };
};

export const transformReconciliationDiff = (diff: any): ReconciliationDiff => {
  return {
    id: diff.id,
    reconciliationDate: diff.reconciliationDate,
    revenueId: diff.revenueId,
    bankTransactionId: diff.bankTransactionId,
    diffType: diff.diffType,
    diffAmount: decimalToNumber(diff.diffAmount),
    status: diff.status,
    assignee: diff.assignee,
    workOrderId: diff.workOrderId,
    createdAt: diff.createdAt,
  };
};

export const transformWorkOrder = (order: any): WorkOrder => {
  return {
    id: order.id,
    orderNo: order.orderNo,
    diffId: order.diffId,
    title: order.title,
    description: order.description,
    status: order.status,
    assignee: order.assignee,
    resolvedAt: order.resolvedAt,
    createdAt: order.createdAt,
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
    revenueByBusinessLine: report.revenueByBusinessLine,
    splitRatioByBusinessLine: report.splitRatioByBusinessLine,
    settlementAccuracy: decimalToNumber(report.settlementAccuracy),
    noDiffRate: decimalToNumber(report.noDiffRate),
    revenueTrend: report.revenueTrend,
    createdAt: report.createdAt,
  };
};

export default {
  decimalToNumber,
  transformRevenueRecord,
  transformSplitDetail,
  transformSplitRule,
  transformSplitRuleHistory,
  transformSettlement,
  transformPaymentInstruction,
  transformApprovalFlow,
  transformApprovalNode,
  transformBankTransaction,
  transformReconciliationDiff,
  transformWorkOrder,
  transformUser,
  transformOperationLog,
  transformSystemAlert,
  transformMonthlyReport,
};
