import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import dayjs from 'dayjs';
import type {
  MonthlyReport,
  RevenueRecord,
  ReconciliationDiff,
  Settlement,
  BankTransaction,
  WorkOrder,
} from '@shared/types';

const prisma = new PrismaClient();

function decimalToNumber(value: any): number {
  if (value instanceof Decimal || typeof value?.toNumber === 'function') {
    return value.toNumber();
  }
  return Number(value) || 0;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

function formatDate(date: Date | string): string {
  return dayjs(date).format('YYYY-MM-DD HH:mm:ss');
}

export interface ExportOptions {
  includeCharts?: boolean;
  includeSummary?: boolean;
  pageSize?: 'a4' | 'letter';
  orientation?: 'portrait' | 'landscape';
}

export async function exportMonthlyReportToPDF(
  report: MonthlyReport,
  options: ExportOptions = {}
): Promise<Uint8Array> {
  const { pageSize = 'a4', orientation = 'portrait' } = options;

  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: pageSize,
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let yPos = margin;

  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('月度运营报告', pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`报告期间: ${report.yearMonth}`, pageWidth / 2, yPos, {
    align: 'center',
  });
  yPos += 5;
  doc.text(`生成时间: ${formatDate(new Date())}`, pageWidth / 2, yPos, {
    align: 'center',
  });
  yPos += 15;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('一、核心指标', margin, yPos);
  yPos += 8;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');

  const totalRevenue = Object.values(report.revenueByBusinessLine || {}).reduce(
    (a, b) => a + b,
    0
  );

  const metrics = [
    { label: '总收入', value: formatCurrency(totalRevenue) },
    { label: '结算准确率', value: formatPercent(decimalToNumber(report.settlementAccuracy)) },
    { label: '无差异率', value: formatPercent(decimalToNumber(report.noDiffRate)) },
  ];

  for (const metric of metrics) {
    doc.text(metric.label, margin + 5, yPos);
    doc.text(metric.value, margin + 80, yPos);
    yPos += 7;
  }
  yPos += 10;

  if (options.includeSummary !== false) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('二、分业务线收入', margin, yPos);
    yPos += 8;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');

    const businessLines = Object.entries(report.revenueByBusinessLine || {});
    if (businessLines.length === 0) {
      doc.text('暂无数据', margin + 5, yPos);
      yPos += 7;
    } else {
      for (const [businessLine, amount] of businessLines) {
        const percent = totalRevenue > 0 ? (amount / totalRevenue) * 100 : 0;
        doc.text(businessLine, margin + 5, yPos);
        doc.text(formatCurrency(amount), margin + 60, yPos);
        doc.text(`${percent.toFixed(2)}%`, margin + 120, yPos);
        yPos += 7;

        if (yPos > pageHeight - margin) {
          doc.addPage();
          yPos = margin;
        }
      }
    }
    yPos += 10;

    if (yPos > pageHeight - 50) {
      doc.addPage();
      yPos = margin;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('三、收入趋势', margin, yPos);
    yPos += 8;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');

    const trend = report.revenueTrend || [];
    if (trend.length === 0) {
      doc.text('暂无数据', margin + 5, yPos);
      yPos += 7;
    } else {
      const step = Math.max(1, Math.floor(trend.length / 10));
      for (let i = 0; i < trend.length; i += step) {
        const item = trend[i];
        doc.text(item.date, margin + 5, yPos);
        doc.text(formatCurrency(item.amount), margin + 60, yPos);
        yPos += 7;

        if (yPos > pageHeight - margin) {
          doc.addPage();
          yPos = margin;
        }
      }
    }
  }

  doc.setFontSize(10);
  doc.setFont('helvetica', 'italic');
  doc.text(
    '本报告由系统自动生成',
    pageWidth / 2,
    pageHeight - 10,
    { align: 'center' }
  );

  return new Uint8Array(doc.output('arraybuffer'));
}

export async function exportRevenuesToExcel(
  startDate: Date,
  endDate: Date
): Promise<Uint8Array> {
  const revenues = await prisma.revenueRecord.findMany({
    where: {
      transactionTime: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      splitDetails: true,
    },
    orderBy: { transactionTime: 'desc' },
  });

  const data = revenues.map((r) => ({
    '交易编号': r.transactionNo,
    '业务线': r.businessLine,
    '渠道': r.channel,
    '客户': r.customer,
    '金额': decimalToNumber(r.amount),
    '币种': r.currency,
    '交易时间': formatDate(r.transactionTime),
    '对账状态': r.reconciliationStatus,
    '创建时间': formatDate(r.createdAt),
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);

  ws['!cols'] = [
    { wch: 25 },
    { wch: 15 },
    { wch: 15 },
    { wch: 20 },
    { wch: 15 },
    { wch: 10 },
    { wch: 20 },
    { wch: 12 },
    { wch: 20 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, '收入明细');

  const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return new Uint8Array(buffer);
}

export async function exportDiffsToExcel(
  startDate: Date,
  endDate: Date
): Promise<Uint8Array> {
  const diffs = await prisma.reconciliationDiff.findMany({
    where: {
      reconciliationDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      revenue: true,
      bankTransaction: true,
      workOrder: true,
    },
    orderBy: { reconciliationDate: 'desc' },
  });

  const data = diffs.map((d) => ({
    '对账日期': formatDate(d.reconciliationDate),
    '差异类型': d.diffType,
    '差异金额': decimalToNumber(d.diffAmount),
    '状态': d.status,
    '收入记录': d.revenue?.transactionNo || '-',
    '银行流水': d.bankTransaction?.bankTransactionNo || '-',
    '工单号': d.workOrder?.orderNo || '-',
    '创建时间': formatDate(d.createdAt),
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);

  ws['!cols'] = [
    { wch: 20 },
    { wch: 15 },
    { wch: 15 },
    { wch: 12 },
    { wch: 25 },
    { wch: 25 },
    { wch: 20 },
    { wch: 20 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, '差异明细');

  const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return new Uint8Array(buffer);
}

export async function exportSettlementsToExcel(
  startDate: Date,
  endDate: Date
): Promise<Uint8Array> {
  const settlements = await prisma.settlement.findMany({
    where: {
      settlementDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      revenues: true,
      paymentInstruction: true,
    },
    orderBy: { settlementDate: 'desc' },
  });

  const data = settlements.map((s) => ({
    '结算单号': s.settlementNo,
    '业务线': s.businessLine,
    '结算日期': formatDate(s.settlementDate),
    '总金额': decimalToNumber(s.totalAmount),
    '预算阈值': decimalToNumber(s.budgetThreshold),
    '是否超预算': s.overBudget ? '是' : '否',
    '状态': s.status,
    '支付指令号': s.paymentInstruction?.instructionNo || '-',
    '创建时间': formatDate(s.createdAt),
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);

  ws['!cols'] = [
    { wch: 25 },
    { wch: 15 },
    { wch: 20 },
    { wch: 15 },
    { wch: 15 },
    { wch: 12 },
    { wch: 12 },
    { wch: 25 },
    { wch: 20 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, '结算明细');

  const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return new Uint8Array(buffer);
}

export async function exportBankTransactionsToExcel(
  startDate: Date,
  endDate: Date
): Promise<Uint8Array> {
  const transactions = await prisma.bankTransaction.findMany({
    where: {
      transactionTime: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      matchedRevenue: true,
    },
    orderBy: { transactionTime: 'desc' },
  });

  const data = transactions.map((t) => ({
    '银行流水号': t.bankTransactionNo,
    '金额': decimalToNumber(t.amount),
    '交易时间': formatDate(t.transactionTime),
    '付款人账号': t.payerAccount,
    '付款人名称': t.payerName,
    '匹配状态': t.matchStatus,
    '匹配收入编号': t.matchedRevenue?.transactionNo || '-',
    '创建时间': formatDate(t.createdAt),
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);

  ws['!cols'] = [
    { wch: 25 },
    { wch: 15 },
    { wch: 20 },
    { wch: 20 },
    { wch: 20 },
    { wch: 12 },
    { wch: 25 },
    { wch: 20 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, '银行流水');

  const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return new Uint8Array(buffer);
}

export async function exportWorkOrdersToExcel(
  startDate: Date,
  endDate: Date
): Promise<Uint8Array> {
  const workOrders = await prisma.workOrder.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      diff: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const data = workOrders.map((w) => ({
    '工单号': w.orderNo,
    '标题': w.title,
    '描述': w.description,
    '状态': w.status,
    '处理人': w.assignee || '-',
    '关联差异ID': w.diffId,
    '解决时间': w.resolvedAt ? formatDate(w.resolvedAt) : '-',
    '创建时间': formatDate(w.createdAt),
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);

  ws['!cols'] = [
    { wch: 25 },
    { wch: 25 },
    { wch: 40 },
    { wch: 12 },
    { wch: 15 },
    { wch: 40 },
    { wch: 20 },
    { wch: 20 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, '工单明细');

  const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return new Uint8Array(buffer);
}

export async function exportFullReportToExcel(
  year: number,
  month: number
): Promise<Uint8Array> {
  const startDate = dayjs(`${year}-${month}-01`).startOf('month').toDate();
  const endDate = dayjs(startDate).endOf('month').toDate();

  const [revenues, diffs, settlements, transactions, workOrders, report] =
    await Promise.all([
      prisma.revenueRecord.findMany({
        where: {
          transactionTime: { gte: startDate, lte: endDate },
        },
      }),
      prisma.reconciliationDiff.findMany({
        where: {
          reconciliationDate: { gte: startDate, lte: endDate },
        },
        include: { revenue: true, bankTransaction: true },
      }),
      prisma.settlement.findMany({
        where: {
          settlementDate: { gte: startDate, lte: endDate },
        },
      }),
      prisma.bankTransaction.findMany({
        where: {
          transactionTime: { gte: startDate, lte: endDate },
        },
      }),
      prisma.workOrder.findMany({
        where: {
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      prisma.monthlyReport.findUnique({
        where: { yearMonth: `${year}-${String(month).padStart(2, '0')}` },
      }),
    ]);

  const wb = XLSX.utils.book_new();

  const revenueValues = Object.values((report?.revenueByBusinessLine as Record<string, number>) || {}) as number[];
  const totalRevenue = revenueValues.reduce((a: number, b: number) => a + b, 0);

  const summaryData = [
    { '项目': '总收入', '数值': totalRevenue },
    { '项目': '交易笔数', '数值': revenues.length },
    { '项目': '差异笔数', '数值': diffs.length },
    { '项目': '结算笔数', '数值': settlements.length },
    { '项目': '银行流水笔数', '数值': transactions.length },
    { '项目': '工单数', '数值': workOrders.length },
    { '项目': '结算准确率', '数值': `${(decimalToNumber(report?.settlementAccuracy || 0) * 100).toFixed(2)}%` },
    { '项目': '无差异率', '数值': `${(decimalToNumber(report?.noDiffRate || 0) * 100).toFixed(2)}%` },
  ];
  const summaryWs = XLSX.utils.json_to_sheet(summaryData);
  summaryWs['!cols'] = [{ wch: 20 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, summaryWs, '汇总');

  const revenueData = revenues.map((r) => ({
    '交易编号': r.transactionNo,
    '业务线': r.businessLine,
    '金额': decimalToNumber(r.amount),
    '交易时间': formatDate(r.transactionTime),
    '对账状态': r.reconciliationStatus,
  }));
  const revenueWs = XLSX.utils.json_to_sheet(revenueData);
  revenueWs['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, revenueWs, '收入明细');

  const diffData = diffs.map((d) => ({
    '对账日期': formatDate(d.reconciliationDate),
    '差异类型': d.diffType,
    '差异金额': decimalToNumber(d.diffAmount),
    '状态': d.status,
  }));
  const diffWs = XLSX.utils.json_to_sheet(diffData);
  diffWs['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, diffWs, '差异明细');

  const settlementData = settlements.map((s) => ({
    '结算单号': s.settlementNo,
    '业务线': s.businessLine,
    '总金额': decimalToNumber(s.totalAmount),
    '状态': s.status,
  }));
  const settlementWs = XLSX.utils.json_to_sheet(settlementData);
  settlementWs['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, settlementWs, '结算明细');

  const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return new Uint8Array(buffer);
}

export default {
  exportMonthlyReportToPDF,
  exportRevenuesToExcel,
  exportDiffsToExcel,
  exportSettlementsToExcel,
  exportBankTransactionsToExcel,
  exportWorkOrdersToExcel,
  exportFullReportToExcel,
};
