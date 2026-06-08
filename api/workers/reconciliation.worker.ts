import { parentPort, workerData } from 'worker_threads';
import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import type {
  RevenueRecord,
  BankTransaction,
  ReconciliationDiff,
  DiffType,
} from '@shared/types';

export interface MatchCandidate {
  revenue: RevenueRecord;
  bank: BankTransaction;
  score: number;
}

const prisma = new PrismaClient();

function decimalToNumber(value: any): number {
  if (value instanceof Decimal || typeof value?.toNumber === 'function') {
    return value.toNumber();
  }
  return Number(value) || 0;
}

function generateOrderNo(): string {
  const timestamp = dayjs().format('YYYYMMDDHHmmss');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `WO${timestamp}${random}`;
}

export interface ReconciliationWorkerData {
  reconciliationDate: string;
  threshold?: number;
  autoCreateWorkOrder?: boolean;
  batchSize?: number;
}

export interface ReconciliationWorkerResult {
  success: boolean;
  matchedCount: number;
  mismatchCount: number;
  missingBankCount: number;
  excessBankCount: number;
  diffRate: number;
  totalRecords: number;
  workOrdersCreated: number;
  specialReconciliationTriggered: boolean;
  errors: string[];
}

export interface ReconciliationProgress {
  type: 'progress';
  phase: 'matching' | 'processing' | 'finalizing';
  processed: number;
  total: number;
}

export interface ReconciliationComplete {
  type: 'complete';
  result: ReconciliationWorkerResult;
}

export interface ReconciliationError {
  type: 'error';
  error: string;
}

type ReconciliationMessage = ReconciliationProgress | ReconciliationComplete | ReconciliationError;

const SPECIAL_RECONCILIATION_THRESHOLD = 0.01;

function sendMessage(message: ReconciliationMessage): void {
  if (parentPort) {
    parentPort.postMessage(message);
  }
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

async function createWorkOrder(
  diffId: string,
  diffType: DiffType,
  diffAmount: number
): Promise<void> {
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

  await prisma.workOrder.create({
    data: {
      id: uuidv4(),
      orderNo: generateOrderNo(),
      diffId,
      title: titles[diffType],
      description: descriptions[diffType],
      status: 'pending',
    },
  });
}

async function processMatchBatch(
  matches: MatchCandidate[],
  reconciliationDate: Date,
  autoCreateWorkOrder: boolean,
  result: ReconciliationWorkerResult
): Promise<void> {
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];

    sendMessage({
      type: 'progress',
      phase: 'processing',
      processed: i + 1,
      total: matches.length,
    });

    try {
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
        result.matchedCount++;
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

        result.mismatchCount++;

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
          result.workOrdersCreated++;
        }
      }
    } catch (error) {
      result.errors.push(
        `Error processing match ${match.revenue.id}-${match.bank.id}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }

    if (i % 10 === 0) {
      await new Promise((resolve) => setImmediate(resolve));
    }
  }
}

async function processUnmatchedRevenues(
  revenues: RevenueRecord[],
  reconciliationDate: Date,
  autoCreateWorkOrder: boolean,
  result: ReconciliationWorkerResult
): Promise<void> {
  for (let i = 0; i < revenues.length; i++) {
    const revenue = revenues[i];

    try {
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

      result.missingBankCount++;

      await prisma.revenueRecord.update({
        where: { id: revenue.id },
        data: { reconciliationStatus: 'missing' },
      });

      if (autoCreateWorkOrder) {
        await createWorkOrder(diff.id, diffType, diffAmount);
        result.workOrdersCreated++;
      }
    } catch (error) {
      result.errors.push(
        `Error processing unmatched revenue ${revenue.id}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }

    if (i % 10 === 0) {
      await new Promise((resolve) => setImmediate(resolve));
    }
  }
}

async function processUnmatchedBanks(
  banks: BankTransaction[],
  reconciliationDate: Date,
  autoCreateWorkOrder: boolean,
  result: ReconciliationWorkerResult
): Promise<void> {
  for (let i = 0; i < banks.length; i++) {
    const bank = banks[i];

    try {
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

      result.excessBankCount++;

      await prisma.bankTransaction.update({
        where: { id: bank.id },
        data: { matchStatus: 'unmatched' },
      });

      if (autoCreateWorkOrder) {
        await createWorkOrder(diff.id, diffType, diffAmount);
        result.workOrdersCreated++;
      }
    } catch (error) {
      result.errors.push(
        `Error processing unmatched bank ${bank.id}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }

    if (i % 10 === 0) {
      await new Promise((resolve) => setImmediate(resolve));
    }
  }
}

async function performReconciliation(
  data: ReconciliationWorkerData
): Promise<ReconciliationWorkerResult> {
  const result: ReconciliationWorkerResult = {
    success: true,
    matchedCount: 0,
    mismatchCount: 0,
    missingBankCount: 0,
    excessBankCount: 0,
    diffRate: 0,
    totalRecords: 0,
    workOrdersCreated: 0,
    specialReconciliationTriggered: false,
    errors: [],
  };

  const reconciliationDate = new Date(data.reconciliationDate);
  const threshold = data.threshold ?? 60;
  const autoCreateWorkOrder = data.autoCreateWorkOrder ?? true;

  const startOfDay = dayjs(reconciliationDate).startOf('day').toDate();
  const endOfDay = dayjs(reconciliationDate).endOf('day').toDate();

  sendMessage({
    type: 'progress',
    phase: 'matching',
    processed: 0,
    total: 100,
  });

  const revenues = (await prisma.revenueRecord.findMany({
    where: {
      transactionTime: {
        gte: startOfDay,
        lte: endOfDay,
      },
      reconciliationStatus: 'pending',
    },
  })) as unknown as RevenueRecord[];

  const banks = (await prisma.bankTransaction.findMany({
    where: {
      transactionTime: {
        gte: dayjs(startOfDay).subtract(7, 'day').toDate(),
        lte: dayjs(endOfDay).add(7, 'day').toDate(),
      },
      matchStatus: 'pending',
    },
  })) as unknown as BankTransaction[];

  result.totalRecords = revenues.length;

  sendMessage({
    type: 'progress',
    phase: 'matching',
    processed: 50,
    total: 100,
  });

  const matches = findBestMatches(revenues, banks, threshold);

  const matchedRevenueIds = new Set(matches.map((m) => m.revenue.id));
  const matchedBankIds = new Set(matches.map((m) => m.bank.id));

  const unmatchedRevenues = revenues.filter((r) => !matchedRevenueIds.has(r.id));
  const unmatchedBanks = banks.filter((b) => !matchedBankIds.has(b.id));

  sendMessage({
    type: 'progress',
    phase: 'matching',
    processed: 100,
    total: 100,
  });

  await processMatchBatch(matches, reconciliationDate, autoCreateWorkOrder, result);
  await processUnmatchedRevenues(unmatchedRevenues, reconciliationDate, autoCreateWorkOrder, result);
  await processUnmatchedBanks(unmatchedBanks, reconciliationDate, autoCreateWorkOrder, result);

  sendMessage({
    type: 'progress',
    phase: 'finalizing',
    processed: 0,
    total: 100,
  });

  const totalDiffs =
    result.mismatchCount + result.missingBankCount + result.excessBankCount;
  result.diffRate =
    result.totalRecords > 0 ? totalDiffs / result.totalRecords : 0;

  if (result.diffRate > SPECIAL_RECONCILIATION_THRESHOLD && result.totalRecords > 0) {
    result.specialReconciliationTriggered = true;

    const diffs = await prisma.reconciliationDiff.findMany({
      where: { reconciliationDate },
    });

    for (const diff of diffs) {
      await prisma.reconciliationDiff.update({
        where: { id: diff.id },
        data: { status: 'special' },
      });
    }

    const flowId = uuidv4();
    await prisma.approvalFlow.create({
      data: {
        id: flowId,
        type: 'special_reconciliation',
        status: 'pending',
        currentNode: 0,
        relatedId: dayjs(reconciliationDate).format('YYYY-MM-DD'),
        nodes: {
          create: [
            {
              id: uuidv4(),
              level: 1,
              approverRole: 'finance',
              status: 'pending',
            },
            {
              id: uuidv4(),
              level: 2,
              approverRole: 'finance_director',
              status: 'pending',
            },
          ],
        },
      },
    });

    await prisma.systemAlert.create({
      data: {
        id: uuidv4(),
        type: 'reconciliation_failed',
        level: 'critical',
        title: '对账差异率超标',
        content: `对账差异率达到 ${(result.diffRate * 100).toFixed(2)}%，超过1%阈值，已触发专项对账审批流程。`,
        relatedId: flowId,
        status: 'unread',
      },
    });
  }

  sendMessage({
    type: 'progress',
    phase: 'finalizing',
    processed: 100,
    total: 100,
  });

  result.success = result.errors.length === 0;
  return result;
}

async function run(): Promise<void> {
  try {
    const data = workerData as ReconciliationWorkerData;

    if (!data.reconciliationDate) {
      throw new Error('Invalid worker data: reconciliationDate is required');
    }

    const result = await performReconciliation(data);

    sendMessage({
      type: 'complete',
      result,
    });
  } catch (error) {
    sendMessage({
      type: 'error',
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  run();
}

export default {
  calculateMatchScore,
  findBestMatches,
  performReconciliation,
};
