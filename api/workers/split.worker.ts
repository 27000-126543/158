import { parentPort, workerData } from 'worker_threads';
import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { v4 as uuidv4 } from 'uuid';
import type { RevenueRecord, SplitDetail, SplitRule } from '@shared/types';

const prisma = new PrismaClient();

function decimalToNumber(value: any): number {
  if (value instanceof Decimal || typeof value?.toNumber === 'function') {
    return value.toNumber();
  }
  return Number(value) || 0;
}

export interface SplitWorkerData {
  revenueIds: string[];
  batchSize?: number;
}

export interface SplitWorkerResult {
  success: boolean;
  processedCount: number;
  failedCount: number;
  errors: string[];
  totalAmount: number;
}

export interface SplitProgress {
  type: 'progress';
  processed: number;
  total: number;
  currentId: string;
}

export interface SplitComplete {
  type: 'complete';
  result: SplitWorkerResult;
}

export interface SplitError {
  type: 'error';
  error: string;
}

type SplitMessage = SplitProgress | SplitComplete | SplitError;

function sendMessage(message: SplitMessage): void {
  if (parentPort) {
    parentPort.postMessage(message);
  }
}

async function getActiveSplitRule(businessLine: string): Promise<SplitRule | null> {
  const rule = await prisma.splitRule.findFirst({
    where: {
      businessLine,
      status: 'active',
      effectiveDate: { lte: new Date() },
      OR: [{ expiryDate: null }, { expiryDate: { gte: new Date() } }],
    },
  });
  return rule as unknown as SplitRule | null;
}

async function calculateSplitDetails(
  revenue: RevenueRecord,
  rule: SplitRule
): Promise<SplitDetail[]> {
  const amount = decimalToNumber(revenue.amount);
  const splitDetails: SplitDetail[] = [];

  const ratios = rule.ratios as { [key: string]: number };
  let totalRatio = 0;

  for (const [recipient, ratio] of Object.entries(ratios)) {
    const splitAmount = amount * ratio;
    totalRatio += ratio;

    splitDetails.push({
      id: uuidv4(),
      revenueId: revenue.id,
      businessLine: recipient,
      ratio,
      amount: splitAmount,
      createdAt: new Date(),
    });
  }

  if (Math.abs(totalRatio - 1) > 0.0001) {
    console.warn(`Split ratios for ${revenue.businessLine} do not sum to 1: ${totalRatio}`);
  }

  return splitDetails;
}

async function processRevenue(
  revenue: RevenueRecord
): Promise<{ success: boolean; error?: string }> {
  try {
    const existingSplits = await prisma.splitDetail.count({
      where: { revenueId: revenue.id },
    });

    if (existingSplits > 0) {
      return { success: true };
    }

    const rule = await getActiveSplitRule(revenue.businessLine);
    if (!rule) {
      return {
        success: false,
        error: `No active split rule found for business line: ${revenue.businessLine}`,
      };
    }

    const splitDetails = await calculateSplitDetails(revenue, rule);

    await prisma.splitDetail.createMany({
      data: splitDetails.map((d) => ({
        id: d.id,
        revenueId: d.revenueId!,
        businessLine: d.businessLine,
        ratio: new Decimal(d.ratio),
        amount: new Decimal(d.amount),
      })),
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function processBatch(
  revenueIds: string[],
  batchSize: number = 100
): Promise<SplitWorkerResult> {
  const result: SplitWorkerResult = {
    success: true,
    processedCount: 0,
    failedCount: 0,
    errors: [],
    totalAmount: 0,
  };

  const total = revenueIds.length;

  for (let i = 0; i < revenueIds.length; i += batchSize) {
    const batch = revenueIds.slice(i, i + batchSize);

    const revenues = (await prisma.revenueRecord.findMany({
      where: { id: { in: batch } },
    })) as unknown as RevenueRecord[];

    for (let j = 0; j < revenues.length; j++) {
      const revenue = revenues[j];
      const processed = i + j + 1;

      sendMessage({
        type: 'progress',
        processed,
        total,
        currentId: revenue.id,
      });

      const processResult = await processRevenue(revenue);

      if (processResult.success) {
        result.processedCount++;
        result.totalAmount += decimalToNumber(revenue.amount);
      } else {
        result.failedCount++;
        result.errors.push(`Revenue ${revenue.id}: ${processResult.error}`);
      }
    }

    await new Promise((resolve) => setImmediate(resolve));
  }

  result.success = result.failedCount === 0;
  return result;
}

async function run(): Promise<void> {
  try {
    const { revenueIds, batchSize = 100 } = workerData as SplitWorkerData;

    if (!revenueIds || !Array.isArray(revenueIds)) {
      throw new Error('Invalid worker data: revenueIds must be an array');
    }

    const result = await processBatch(revenueIds, batchSize);

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
  processRevenue,
  calculateSplitDetails,
  getActiveSplitRule,
  processBatch,
};
