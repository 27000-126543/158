import { PrismaClient, Decimal } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import type {
  BankTransaction,
  RevenueRecord,
  ReconciliationDiff,
  WorkOrder,
  DiffType,
  BankMatchStatus,
  ReconciliationStatus,
  DiffStatus,
  WorkOrderStatus,
  ApprovalFlowType,
  ApprovalStatus,
  ApprovalNode,
} from '@shared/types';

const prisma = new PrismaClient();

const SPECIAL_RECONCILIATION_THRESHOLD = 0.01;

export interface ReconciliationResult {
  matchedCount: number;
  mismatchCount: number;
  missingBankCount: number;
  excessBankCount: number;
  diffRate: number;
  totalRecords: number;
  specialReconciliationTriggered: boolean;
  workOrdersCreated: number;
}

export interface MatchCandidate {
  revenue: RevenueRecord;
  bank: BankTransaction;
  score: number;
}

function decimalToNumber(value: any): number {
  if (value instanceof Decimal || typeof value?.toNumber === 'function') {
    return value.toNumber();
  }
  return Number(value) || 0;
}

function generateBankTransactionNo(): string {
  const timestamp = dayjs().format('YYYYMMDDHHmmss');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `BNK${timestamp}${random}`;
}

function generateOrderNo(): string {
  const timestamp = dayjs().format('YYYYMMDDHHmmss');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `WO${timestamp}${random}`;
}

export async function generateMockBankTransactions(
  startDate: Date,
  endDate: Date,
  matchRate: number = 0.85
): Promise<BankTransaction[]> {
  const revenues = await prisma.revenueRecord.findMany({
    where: {
      transactionTime: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { transactionTime: 'asc' },
  });

  const transactions: BankTransaction[] = [];
  const payerNames = ['阿里巴巴集团', '腾讯科技', '字节跳动', '京东集团', '美团', '拼多多', '小米科技', '华为技术'];
  const payerAccounts = ['622202****1234', '622848****5678', '621700****9012', '622262****3456'];

  for (const revenue of revenues) {
    const shouldMatch = Math.random() < matchRate;
    const amount = shouldMatch
      ? decimalToNumber(revenue.amount)
      : decimalToNumber(revenue.amount) * (0.95 + Math.random() * 0.1);

    const transaction: BankTransaction = {
      id: uuidv4(),
      bankTransactionNo: generateBankTransactionNo(),
      amount: amount,
      transactionTime: dayjs(revenue.transactionTime)
        .add(Math.floor(Math.random() * 3) - 1, 'day')
        .toDate(),
      payerAccount: payerAccounts[Math.floor(Math.random() * payerAccounts.length)],
      payerName: payerNames[Math.floor(Math.random() * payerNames.length)],
      matchStatus: 'pending',
      createdAt: new Date(),
    };

    transactions.push(transaction);
  }

  const excessCount = Math.floor(revenues.length * 0.05);
  for (let i = 0; i < excessCount; i++) {
    const transaction: BankTransaction = {
      id: uuidv4(),
      bankTransactionNo: generateBankTransactionNo(),
      amount: 1000 + Math.random() * 50000,
      transactionTime: dayjs(startDate)
        .add(Math.floor(Math.random() * dayjs(endDate).diff(startDate, 'day')), 'day')
        .toDate(),
      payerAccount: payerAccounts[Math.floor(Math.random() * payerAccounts.length)],
      payerName: payerNames[Math.floor(Math.random() * payerNames.length)],
      matchStatus: 'pending',
      createdAt: new Date(),
    };
    transactions.push(transaction);
  }

  await prisma.bankTransaction.createMany({
    data: transactions.map((t) => ({
      ...t,
      amount: new Decimal(t.amount),
    })),
  });

  return transactions;
}

export function calculateMatchScore(
  revenue: RevenueRecord,
  bank: BankTransaction
): number {
  let score = 0;

  const revenueAmount = decimalToNumber(revenue.amount);
  const bankAmount = decimalToNumber(bank.amount);
  const amountDiff = Math.abs(revenueAmount - bankAmount);

  if (amountDiff === 0) {
    score += 50;
  } else if (amountDiff / revenueAmount < 0.001) {
    score += 40;
  } else if (amountDiff / revenueAmount < 0.01) {
    score += 25;
  } else if (amountDiff / revenueAmount < 0.05) {
    score += 10;
  }

  const daysDiff = Math.abs(
    dayjs(revenue.transactionTime).diff(bank.transactionTime, 'day')
  );
  if (daysDiff === 0) {
    score += 30;
  } else if (daysDiff <= 1) {
    score += 20;
  } else if (daysDiff <= 3) {
    score += 10;
  } else if (daysDiff <= 7) {
    score += 5;
  }

  if (bank.payerName.includes(revenue.customer) || revenue.customer.includes(bank.payerName)) {
    score += 20;
  }

  return score;
}

export function findBestMatches(
  revenues: RevenueRecord[],
  banks: BankTransaction[],
  threshold: number = 60
): MatchCandidate[] {
  const candidates: MatchCandidate[] = [];
  const usedRevenueIds = new Set<string>();
  const usedBankIds = new Set<string>();

  const allCandidates: MatchCandidate[] = [];
  for (const revenue of revenues) {
    for (const bank of banks) {
      const score = calculateMatchScore(revenue, bank);
      if (score >= threshold) {
        allCandidates.push({ revenue, bank, score });
      }
    }
  }

  allCandidates.sort((a, b) => b.score - a.score);

  for (const candidate of allCandidates) {
    if (
      !usedRevenueIds.has(candidate.revenue.id) &&
      !usedBankIds.has(candidate.bank.id)
    ) {
      candidates.push(candidate);
      usedRevenueIds.add(candidate.revenue.id);
      usedBankIds.add(candidate.bank.id);
    }
  }

  return candidates;
}

export function calculateDiffRate(
  totalRecords: number,
  diffCount: number
): number {
  if (totalRecords === 0) return 0;
  return diffCount / totalRecords;
}

export function determineDiffType(
  revenue: RevenueRecord | null,
  bank: BankTransaction | null,
  amountDiff: number
): DiffType {
  if (!bank) return 'missing_bank';
  if (!revenue) return 'missing_system';
  if (amountDiff !== 0) return 'amount_mismatch';
  return 'amount_mismatch';
}

export async function createWorkOrder(
  diffId: string,
  diffType: DiffType,
  diffAmount: number,
  assignee?: string
): Promise<WorkOrder> {
  const titles: Record<DiffType, string> = {
    amount_mismatch: '金额差异调账工单',
    missing_bank: '缺失银行流水调账工单',
    excess_bank: '银行流水冗余调账工单',
    missing_system: '系统记录缺失调账工单',
  };

  const descriptions: Record<DiffType, string> = {
    amount_mismatch: `系统记录与银行流水金额不一致，差异金额：${diffAmount.toFixed(2)}元，请核实并处理。`,
    missing_bank: '系统存在收入记录但未找到对应的银行流水，请核实银行到账情况。',
    excess_bank: '银行存在流水记录但未找到对应的系统收入记录，请核实款项来源。',
    missing_system: '银行流水已到账但系统无对应收入记录，请补录收入数据。',
  };

  const workOrder = await prisma.workOrder.create({
    data: {
      id: uuidv4(),
      orderNo: generateOrderNo(),
      diffId,
      title: titles[diffType],
      description: descriptions[diffType],
      status: 'pending',
      assignee,
    },
  });

  return workOrder as unknown as WorkOrder;
}

export async function createSpecialReconciliationFlow(
  reconciliationDate: Date,
  diffRate: number,
  createdBy: string
): Promise<string> {
  const flowId = uuidv4();

  const nodes: ApprovalNode[] = [
    {
      id: uuidv4(),
      flowId,
      level: 1,
      approverRole: 'finance',
      status: 'pending',
    },
    {
      id: uuidv4(),
      flowId,
      level: 2,
      approverRole: 'finance_director',
      status: 'pending',
    },
  ];

  await prisma.approvalFlow.create({
    data: {
      id: flowId,
      type: 'special_reconciliation',
      status: 'pending',
      currentNode: 0,
      relatedId: dayjs(reconciliationDate).format('YYYY-MM-DD'),
      nodes: {
        create: nodes.map((node) => ({
          id: node.id,
          level: node.level,
          approverRole: node.approverRole,
          status: node.status,
        })),
      },
    },
  });

  await prisma.systemAlert.create({
    data: {
      id: uuidv4(),
      type: 'reconciliation_failed',
      level: 'critical',
      title: '对账差异率超标',
      content: `对账差异率达到 ${(diffRate * 100).toFixed(2)}%，超过1%阈值，已触发专项对账审批流程。`,
      relatedId: flowId,
      status: 'unread',
    },
  });

  return flowId;
}

export async function markDiffAsSpecial(diffId: string): Promise<void> {
  await prisma.reconciliationDiff.update({
    where: { id: diffId },
    data: { status: 'special' },
  });
}

export async function performReconciliation(
  reconciliationDate: Date,
  autoCreateWorkOrder: boolean = true,
  createdBy?: string
): Promise<ReconciliationResult> {
  const startOfDay = dayjs(reconciliationDate).startOf('day').toDate();
  const endOfDay = dayjs(reconciliationDate).endOf('day').toDate();

  const revenues = await prisma.revenueRecord.findMany({
    where: {
      transactionTime: {
        gte: startOfDay,
        lte: endOfDay,
      },
      reconciliationStatus: 'pending',
    },
  }) as unknown as RevenueRecord[];

  const banks = await prisma.bankTransaction.findMany({
    where: {
      transactionTime: {
        gte: dayjs(startOfDay).subtract(7, 'day').toDate(),
        lte: dayjs(endOfDay).add(7, 'day').toDate(),
      },
      matchStatus: 'pending',
    },
  }) as unknown as BankTransaction[];

  const matches = findBestMatches(revenues, banks, 60);

  const matchedRevenueIds = new Set(matches.map((m) => m.revenue.id));
  const matchedBankIds = new Set(matches.map((m) => m.bank.id));

  const unmatchedRevenues = revenues.filter((r) => !matchedRevenueIds.has(r.id));
  const unmatchedBanks = banks.filter((b) => !matchedBankIds.has(b.id));

  const diffs: ReconciliationDiff[] = [];
  let workOrdersCreated = 0;

  for (const match of matches) {
    const revenueAmount = decimalToNumber(match.revenue.amount);
    const bankAmount = decimalToNumber(match.bank.amount);
    const amountDiff = Math.abs(revenueAmount - bankAmount);

    if (amountDiff === 0) {
      await prisma.revenueRecord.update({
        where: { id: match.revenue.id },
        data: { reconciliationStatus: 'matched' },
      });
      await prisma.bankTransaction.update({
        where: { id: match.bank.id },
        data: {
          matchStatus: 'matched',
          matchedRevenueId: match.revenue.id,
        },
      });
    } else {
      const diffType: DiffType = 'amount_mismatch';
      const diff = await prisma.reconciliationDiff.create({
        data: {
          id: uuidv4(),
          reconciliationDate,
          revenueId: match.revenue.id,
          bankTransactionId: match.bank.id,
          diffType,
          diffAmount: new Decimal(amountDiff),
          status: 'pending',
        },
      });

      diffs.push(diff as unknown as ReconciliationDiff);

      await prisma.revenueRecord.update({
        where: { id: match.revenue.id },
        data: { reconciliationStatus: 'mismatch' },
      });
      await prisma.bankTransaction.update({
        where: { id: match.bank.id },
        data: {
          matchStatus: 'matched',
          matchedRevenueId: match.revenue.id,
        },
      });

      if (autoCreateWorkOrder) {
        await createWorkOrder(diff.id, diffType, amountDiff);
        workOrdersCreated++;
      }
    }
  }

  for (const revenue of unmatchedRevenues) {
    const diffType: DiffType = 'missing_bank';
    const diffAmount = decimalToNumber(revenue.amount);

    const diff = await prisma.reconciliationDiff.create({
      data: {
        id: uuidv4(),
        reconciliationDate,
        revenueId: revenue.id,
        diffType,
        diffAmount: new Decimal(diffAmount),
        status: 'pending',
      },
    });

    diffs.push(diff as unknown as ReconciliationDiff);

    await prisma.revenueRecord.update({
      where: { id: revenue.id },
      data: { reconciliationStatus: 'missing' },
    });

    if (autoCreateWorkOrder) {
      await createWorkOrder(diff.id, diffType, diffAmount);
      workOrdersCreated++;
    }
  }

  for (const bank of unmatchedBanks) {
    const diffType: DiffType = 'missing_system';
    const diffAmount = decimalToNumber(bank.amount);

    const diff = await prisma.reconciliationDiff.create({
      data: {
        id: uuidv4(),
        reconciliationDate,
        bankTransactionId: bank.id,
        diffType,
        diffAmount: new Decimal(diffAmount),
        status: 'pending',
      },
    });

    diffs.push(diff as unknown as ReconciliationDiff);

    await prisma.bankTransaction.update({
      where: { id: bank.id },
      data: { matchStatus: 'unmatched' },
    });

    if (autoCreateWorkOrder) {
      await createWorkOrder(diff.id, diffType, diffAmount);
      workOrdersCreated++;
    }
  }

  const totalRecords = revenues.length;
  const diffCount = diffs.length;
  const diffRate = calculateDiffRate(totalRecords, diffCount);

  let specialReconciliationTriggered = false;
  if (diffRate > SPECIAL_RECONCILIATION_THRESHOLD && totalRecords > 0) {
    specialReconciliationTriggered = true;

    if (createdBy) {
      await createSpecialReconciliationFlow(reconciliationDate, diffRate, createdBy);
    }

    for (const diff of diffs) {
      await markDiffAsSpecial(diff.id);
    }
  }

  const matchedCount = matches.filter(
    (m) => Math.abs(decimalToNumber(m.revenue.amount) - decimalToNumber(m.bank.amount)) === 0
  ).length;

  return {
    matchedCount,
    mismatchCount: diffs.filter((d) => d.diffType === 'amount_mismatch').length,
    missingBankCount: diffs.filter((d) => d.diffType === 'missing_bank').length,
    excessBankCount: diffs.filter((d) => d.diffType === 'missing_system').length,
    diffRate,
    totalRecords,
    specialReconciliationTriggered,
    workOrdersCreated,
  };
}

export async function getDiffStats(
  startDate: Date,
  endDate: Date
): Promise<{
  totalDiffs: number;
  resolvedDiffs: number;
  pendingDiffs: number;
  specialDiffs: number;
  diffRate: number;
}> {
  const diffs = await prisma.reconciliationDiff.findMany({
    where: {
      reconciliationDate: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  const totalRevenues = await prisma.revenueRecord.count({
    where: {
      transactionTime: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  const totalDiffs = diffs.length;
  const resolvedDiffs = diffs.filter((d) => d.status === 'resolved').length;
  const pendingDiffs = diffs.filter((d) => d.status === 'pending').length;
  const specialDiffs = diffs.filter((d) => d.status === 'special').length;
  const diffRate = calculateDiffRate(totalRevenues, totalDiffs);

  return {
    totalDiffs,
    resolvedDiffs,
    pendingDiffs,
    specialDiffs,
    diffRate,
  };
}

export default {
  generateMockBankTransactions,
  calculateMatchScore,
  findBestMatches,
  calculateDiffRate,
  createWorkOrder,
  createSpecialReconciliationFlow,
  performReconciliation,
  getDiffStats,
};
