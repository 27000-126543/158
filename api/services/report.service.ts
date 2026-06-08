import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import type {
  MonthlyReport,
  RevenueRecord,
  SplitDetail,
  Settlement,
  ReconciliationDiff,
} from '@shared/types';

const prisma = new PrismaClient();

function decimalToNumber(value: any): number {
  if (value instanceof Decimal || typeof value?.toNumber === 'function') {
    return value.toNumber();
  }
  return Number(value) || 0;
}

export interface RevenueTrendData {
  date: string;
  amount: number;
}

export interface BusinessLineRevenue {
  [businessLine: string]: number;
}

export interface SplitRatioData {
  [businessLine: string]: {
    [recipient: string]: number;
  };
}

export interface ReportMetrics {
  settlementAccuracy: number;
  noDiffRate: number;
  totalRevenue: number;
  matchedCount: number;
  totalCount: number;
  resolvedDiffCount: number;
  totalDiffCount: number;
}

export async function calculateRevenueTrend(
  year: number,
  month: number
): Promise<RevenueTrendData[]> {
  const startDate = dayjs(`${year}-${month}-01`).startOf('month').toDate();
  const endDate = dayjs(startDate).endOf('month').toDate();

  const revenues = await prisma.revenueRecord.findMany({
    where: {
      transactionTime: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { transactionTime: 'asc' },
  });

  const dailyRevenue: Map<string, number> = new Map();

  for (const revenue of revenues) {
    const dateStr = dayjs(revenue.transactionTime).format('YYYY-MM-DD');
    const amount = decimalToNumber(revenue.amount);
    dailyRevenue.set(dateStr, (dailyRevenue.get(dateStr) || 0) + amount);
  }

  const trend: RevenueTrendData[] = [];
  const daysInMonth = dayjs(startDate).daysInMonth();

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = dayjs(`${year}-${month}-${day}`).format('YYYY-MM-DD');
    trend.push({
      date: dateStr,
      amount: dailyRevenue.get(dateStr) || 0,
    });
  }

  return trend;
}

export async function calculateRevenueByBusinessLine(
  year: number,
  month: number
): Promise<BusinessLineRevenue> {
  const startDate = dayjs(`${year}-${month}-01`).startOf('month').toDate();
  const endDate = dayjs(startDate).endOf('month').toDate();

  const result = await prisma.revenueRecord.groupBy({
    by: ['businessLine'],
    _sum: {
      amount: true,
    },
    where: {
      transactionTime: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  const revenueByBusinessLine: BusinessLineRevenue = {};
  for (const item of result) {
    revenueByBusinessLine[item.businessLine] = decimalToNumber(item._sum.amount);
  }

  return revenueByBusinessLine;
}

export async function calculateSplitRatioByBusinessLine(
  year: number,
  month: number
): Promise<SplitRatioData> {
  const startDate = dayjs(`${year}-${month}-01`).startOf('month').toDate();
  const endDate = dayjs(startDate).endOf('month').toDate();

  const splitDetails = await prisma.splitDetail.findMany({
    include: {
      revenue: true,
    },
    where: {
      revenue: {
        transactionTime: {
          gte: startDate,
          lte: endDate,
        },
      },
    },
  });

  const businessLineTotals: Map<string, number> = new Map();
  const businessLineSplits: Map<string, Map<string, number>> = new Map();

  for (const detail of splitDetails) {
    const businessLine = detail.businessLine;
    const amount = decimalToNumber(detail.amount);

    businessLineTotals.set(
      businessLine,
      (businessLineTotals.get(businessLine) || 0) + amount
    );

    if (!businessLineSplits.has(businessLine)) {
      businessLineSplits.set(businessLine, new Map<string, number>());
    }
    const splits = businessLineSplits.get(businessLine)!;
    splits.set(detail.businessLine, (splits.get(detail.businessLine) || 0) + amount);
  }

  const result: SplitRatioData = {};
  for (const [businessLine, total] of businessLineTotals) {
    result[businessLine] = {};
    const splits = businessLineSplits.get(businessLine)!;
    for (const [recipient, amount] of splits) {
      result[businessLine][recipient] = total > 0 ? amount / total : 0;
    }
  }

  return result;
}

export async function calculateSettlementAccuracy(
  year: number,
  month: number
): Promise<number> {
  const startDate = dayjs(`${year}-${month}-01`).startOf('month').toDate();
  const endDate = dayjs(startDate).endOf('month').toDate();

  const settlements = await prisma.settlement.findMany({
    where: {
      settlementDate: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  if (settlements.length === 0) return 1;

  const totalAmount = settlements.reduce(
    (sum, s) => sum + decimalToNumber(s.totalAmount),
    0
  );

  const accurateSettlements = settlements.filter((s) => !s.overBudget);
  const accurateAmount = accurateSettlements.reduce(
    (sum, s) => sum + decimalToNumber(s.totalAmount),
    0
  );

  return totalAmount > 0 ? accurateAmount / totalAmount : 1;
}

export async function calculateNoDiffRate(
  year: number,
  month: number
): Promise<number> {
  const startDate = dayjs(`${year}-${month}-01`).startOf('month').toDate();
  const endDate = dayjs(startDate).endOf('month').toDate();

  const revenues = await prisma.revenueRecord.findMany({
    where: {
      transactionTime: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  if (revenues.length === 0) return 1;

  const matchedRevenues = revenues.filter(
    (r) => r.reconciliationStatus === 'matched'
  );

  return matchedRevenues.length / revenues.length;
}

export async function calculateReportMetrics(
  year: number,
  month: number
): Promise<ReportMetrics> {
  const startDate = dayjs(`${year}-${month}-01`).startOf('month').toDate();
  const endDate = dayjs(startDate).endOf('month').toDate();

  const [revenues, diffs, settlementAccuracy, noDiffRate] = await Promise.all([
    prisma.revenueRecord.findMany({
      where: {
        transactionTime: {
          gte: startDate,
          lte: endDate,
        },
      },
    }),
    prisma.reconciliationDiff.findMany({
      where: {
        reconciliationDate: {
          gte: startDate,
          lte: endDate,
        },
      },
    }),
    calculateSettlementAccuracy(year, month),
    calculateNoDiffRate(year, month),
  ]);

  const totalRevenue = revenues.reduce(
    (sum, r) => sum + decimalToNumber(r.amount),
    0
  );
  const matchedCount = revenues.filter(
    (r) => r.reconciliationStatus === 'matched'
  ).length;
  const resolvedDiffCount = diffs.filter((d) => d.status === 'resolved').length;

  return {
    settlementAccuracy,
    noDiffRate,
    totalRevenue,
    matchedCount,
    totalCount: revenues.length,
    resolvedDiffCount,
    totalDiffCount: diffs.length,
  };
}

export async function generateMonthlyReport(
  year: number,
  month: number
): Promise<MonthlyReport> {
  const yearMonth = `${year}-${String(month).padStart(2, '0')}`;

  const existingReport = await prisma.monthlyReport.findUnique({
    where: { yearMonth },
  });

  if (existingReport) {
    return existingReport as unknown as MonthlyReport;
  }

  const [
    revenueByBusinessLine,
    splitRatioByBusinessLine,
    revenueTrend,
    metrics,
  ] = await Promise.all([
    calculateRevenueByBusinessLine(year, month),
    calculateSplitRatioByBusinessLine(year, month),
    calculateRevenueTrend(year, month),
    calculateReportMetrics(year, month),
  ]);

  const report = await prisma.monthlyReport.create({
    data: {
      id: uuidv4(),
      yearMonth,
      revenueByBusinessLine,
      splitRatioByBusinessLine,
      settlementAccuracy: new Decimal(metrics.settlementAccuracy),
      noDiffRate: new Decimal(metrics.noDiffRate),
      revenueTrend,
    },
  });

  return report as unknown as MonthlyReport;
}

export async function getMonthlyReport(
  year: number,
  month: number
): Promise<MonthlyReport | null> {
  const yearMonth = `${year}-${String(month).padStart(2, '0')}`;
  const report = await prisma.monthlyReport.findUnique({
    where: { yearMonth },
  });
  return report as unknown as MonthlyReport | null;
}

export async function getReportComparison(
  startYear: number,
  startMonth: number,
  endYear: number,
  endMonth: number
): Promise<{
  reports: MonthlyReport[];
  revenueGrowth: number;
  accuracyTrend: number[];
  noDiffRateTrend: number[];
}> {
  const startDate = dayjs(`${startYear}-${startMonth}-01`);
  const endDate = dayjs(`${endYear}-${endMonth}-01`);

  const months: { year: number; month: number }[] = [];
  let current = startDate.clone();
  while (current.isBefore(endDate) || current.isSame(endDate, 'month')) {
    months.push({ year: current.year(), month: current.month() + 1 });
    current = current.add(1, 'month');
  }

  const reports = await Promise.all(
    months.map((m) => generateMonthlyReport(m.year, m.month))
  );

  const revenueGrowth =
    reports.length >= 2
      ? (reports[reports.length - 1].revenueByBusinessLine &&
          Object.values(reports[reports.length - 1].revenueByBusinessLine).reduce((a, b) => a + b, 0) -
            Object.values(reports[0].revenueByBusinessLine).reduce((a, b) => a + b, 0)) /
          Object.values(reports[0].revenueByBusinessLine).reduce((a, b) => a + b, 0)
      : 0;

  const accuracyTrend = reports.map((r) => decimalToNumber(r.settlementAccuracy));
  const noDiffRateTrend = reports.map((r) => decimalToNumber(r.noDiffRate));

  return {
    reports,
    revenueGrowth,
    accuracyTrend,
    noDiffRateTrend,
  };
}

export default {
  calculateRevenueTrend,
  calculateRevenueByBusinessLine,
  calculateSplitRatioByBusinessLine,
  calculateSettlementAccuracy,
  calculateNoDiffRate,
  calculateReportMetrics,
  generateMonthlyReport,
  getMonthlyReport,
  getReportComparison,
};
