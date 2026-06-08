import { Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import prisma from '../utils/prisma.js';
import { decimalToNumber, transformMonthlyReport } from '../utils/transform.js';
import { successResponse, errorResponse, paginatedResponse } from '../utils/response.js';
import type {
  DashboardStats,
  MonthlyReport,
  ApiResponse,
  PaginatedResponse,
} from '@shared/types';

interface DashboardStatsParams {
  startDate?: Date;
  endDate?: Date;
  category?: string;
}

interface DashboardChartsParams {
  startDate?: Date;
  endDate?: Date;
  category?: string;
  trendType?: 'monthly' | 'weekly';
}

interface PurchaseTrendItem {
  period: string;
  amount: number;
  orderCount: number;
}

interface CategoryPurchaseItem {
  categoryId: string;
  categoryName: string;
  amount: number;
  percentage: number;
}

interface SupplierPerformanceItem {
  supplierId: string;
  supplierName: string;
  totalAmount: number;
  orderCount: number;
  onTimeDeliveryRate: number;
  qualityPassRate: number;
  satisfactionScore: number;
}

interface PaymentTimelinessItem {
  period: string;
  averagePaymentDays: number;
  onTimePaymentRate: number;
  totalPayments: number;
}

export interface DashboardStatsResult {
  purchaseAmount: {
    month: number;
    cumulative: number;
  };
  orderCount: {
    month: number;
    cumulative: number;
  };
  supplierActivity: {
    activeSuppliers: number;
    newSuppliers: number;
  };
  inventoryTurnover: number;
  purchaseByCategory: {
    categoryId: string;
    categoryName: string;
    amount: number;
  }[];
}

export interface DashboardChartsResult {
  purchaseTrend: PurchaseTrendItem[];
  categoryDistribution: CategoryPurchaseItem[];
  supplierRanking: SupplierPerformanceItem[];
  paymentAnalysis: PaymentTimelinessItem[];
}

const getDateRange = (params: { startDate?: Date; endDate?: Date }) => {
  const now = dayjs();
  const startDate = params.startDate ? dayjs(params.startDate).toDate() : now.startOf('year').toDate();
  const endDate = params.endDate ? dayjs(params.endDate).toDate() : now.endOf('day').toDate();
  return { startDate, endDate };
};

const buildWhereClause = (params: DashboardStatsParams): Prisma.PurchaseOrderWhereInput => {
  const { startDate, endDate } = getDateRange(params);
  const where: Prisma.PurchaseOrderWhereInput = {
    createdAt: {
      gte: startDate,
      lte: endDate,
    },
    status: {
      notIn: ['draft', 'cancelled'],
    },
  };
  if (params.category) {
    where.categoryId = params.category;
  }
  return where;
};

const reportService = {
  async getDashboardStats(
    params: DashboardStatsParams
  ): Promise<ApiResponse<DashboardStatsResult>> {
    try {
      const { startDate, endDate } = getDateRange(params);
      const where = buildWhereClause(params);

      const now = dayjs();
      const monthStart = now.startOf('month').toDate();

      const [
        allOrders,
        monthOrders,
        activeSuppliers,
        newSuppliers,
        categoryStats,
        allReceipts,
      ] = await Promise.all([
        prisma.purchaseOrder.findMany({
          where,
          select: {
            totalAmount: true,
            createdAt: true,
          },
        }),
        prisma.purchaseOrder.findMany({
          where: {
            ...where,
            createdAt: {
              gte: monthStart,
              lte: endDate,
            },
          },
          select: {
            totalAmount: true,
          },
        }),
        prisma.supplier.count({
          where: {
            status: 'active',
            orders: {
              some: {
                createdAt: {
                  gte: startDate,
                  lte: endDate,
                },
              },
            },
          },
        }),
        prisma.supplier.count({
          where: {
            createdAt: {
              gte: monthStart,
              lte: endDate,
            },
            status: 'active',
          },
        }),
        prisma.purchaseOrder.groupBy({
          by: ['categoryId'],
          _sum: {
            totalAmount: true,
          },
          where,
        }),
        prisma.receipt.findMany({
          where: {
            receivedAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          select: {
            acceptedQuantity: true,
            order: {
              select: {
                quantity: true,
                totalAmount: true,
              },
            },
          },
        }),
      ]);

      const totalPurchaseAmount = allOrders.reduce(
        (sum, order) => sum + decimalToNumber(order.totalAmount),
        0
      );
      const monthPurchaseAmount = monthOrders.reduce(
        (sum, order) => sum + decimalToNumber(order.totalAmount),
        0
      );

      const totalAcceptedValue = allReceipts.reduce((sum, receipt) => {
        const unitPrice = decimalToNumber(receipt.order.totalAmount) / receipt.order.quantity;
        return sum + receipt.acceptedQuantity * unitPrice;
      }, 0);
      const averageInventoryValue = totalPurchaseAmount * 0.3;
      const inventoryTurnover = averageInventoryValue > 0 ? totalAcceptedValue / averageInventoryValue : 0;

      const categories = await prisma.category.findMany({
        where: {
          id: {
            in: categoryStats.map((c) => c.categoryId),
          },
        },
        select: {
          id: true,
          name: true,
        },
      });

      const categoryMap = new Map(categories.map((c) => [c.id, c.name]));
      const purchaseByCategory = categoryStats.map((c) => ({
        categoryId: c.categoryId,
        categoryName: categoryMap.get(c.categoryId) || '未知品类',
        amount: decimalToNumber(c._sum.totalAmount),
      }));

      const result: DashboardStatsResult = {
        purchaseAmount: {
          month: monthPurchaseAmount,
          cumulative: totalPurchaseAmount,
        },
        orderCount: {
          month: monthOrders.length,
          cumulative: allOrders.length,
        },
        supplierActivity: {
          activeSuppliers,
          newSuppliers,
        },
        inventoryTurnover: Number(inventoryTurnover.toFixed(2)),
        purchaseByCategory,
      };

      return successResponse(result);
    } catch (error) {
      return errorResponse(
        `获取看板统计数据失败: ${error instanceof Error ? error.message : '未知错误'}`,
        500
      );
    }
  },

  async getDashboardCharts(
    params: DashboardChartsParams
  ): Promise<ApiResponse<DashboardChartsResult>> {
    try {
      const { startDate, endDate } = getDateRange(params);
      const where = buildWhereClause(params);
      const trendType = params.trendType || 'monthly';

      const [orders, categories, suppliers, payments] = await Promise.all([
        prisma.purchaseOrder.findMany({
          where,
          include: {
            category: true,
            supplier: true,
            payment: true,
          },
        }),
        prisma.category.findMany({
          select: { id: true, name: true },
        }),
        prisma.supplier.findMany({
          where: {
            status: 'active',
          },
          select: {
            id: true,
            name: true,
            totalOrders: true,
            totalAmount: true,
            onTimeDeliveryRate: true,
            qualityPassRate: true,
            satisfactionScore: true,
          },
          orderBy: {
            totalAmount: 'desc',
          },
          take: 10,
        }),
        prisma.payment.findMany({
          where: {
            status: 'paid',
            actualPaidDate: {
              gte: startDate,
              lte: endDate,
            },
          },
          select: {
            amount: true,
            dueDate: true,
            actualPaidDate: true,
            order: {
              select: {
                createdAt: true,
              },
            },
          },
        }),
      ]);

      const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

      const purchaseTrend: PurchaseTrendItem[] = [];
      const trendMap = new Map<string, { amount: number; orderCount: number }>();

      for (const order of orders) {
        const period =
          trendType === 'monthly'
            ? dayjs(order.createdAt).format('YYYY-MM')
            : dayjs(order.createdAt).format('YYYY-ww');
        const existing = trendMap.get(period) || { amount: 0, orderCount: 0 };
        trendMap.set(period, {
          amount: existing.amount + decimalToNumber(order.totalAmount),
          orderCount: existing.orderCount + 1,
        });
      }

      const sortedPeriods = Array.from(trendMap.keys()).sort();
      for (const period of sortedPeriods) {
        const data = trendMap.get(period)!;
        purchaseTrend.push({
          period,
          amount: Number(data.amount.toFixed(2)),
          orderCount: data.orderCount,
        });
      }

      const totalAmount = orders.reduce(
        (sum, order) => sum + decimalToNumber(order.totalAmount),
        0
      );
      const categoryAmountMap = new Map<string, number>();
      for (const order of orders) {
        const existing = categoryAmountMap.get(order.categoryId) || 0;
        categoryAmountMap.set(
          order.categoryId,
          existing + decimalToNumber(order.totalAmount)
        );
      }

      const categoryDistribution: CategoryPurchaseItem[] = [];
      for (const [categoryId, amount] of categoryAmountMap) {
        categoryDistribution.push({
          categoryId,
          categoryName: categoryMap.get(categoryId) || '未知品类',
          amount: Number(amount.toFixed(2)),
          percentage: totalAmount > 0 ? Number(((amount / totalAmount) * 100).toFixed(2)) : 0,
        });
      }
      categoryDistribution.sort((a, b) => b.amount - a.amount);

      const supplierRanking: SupplierPerformanceItem[] = suppliers.map((s) => ({
        supplierId: s.id,
        supplierName: s.name,
        totalAmount: decimalToNumber(s.totalAmount),
        orderCount: s.totalOrders,
        onTimeDeliveryRate: decimalToNumber(s.onTimeDeliveryRate),
        qualityPassRate: decimalToNumber(s.qualityPassRate),
        satisfactionScore: decimalToNumber(s.satisfactionScore),
      }));

      const paymentAnalysisMap = new Map<string, { totalDays: number; onTimeCount: number; totalCount: number }>();
      for (const payment of payments) {
        const period = dayjs(payment.actualPaidDate!).format('YYYY-MM');
        const existing = paymentAnalysisMap.get(period) || { totalDays: 0, onTimeCount: 0, totalCount: 0 };
        const paymentDays = dayjs(payment.actualPaidDate!).diff(dayjs(payment.order.createdAt), 'day');
        const isOnTime = dayjs(payment.actualPaidDate!).isBefore(dayjs(payment.dueDate).add(1, 'day'));
        paymentAnalysisMap.set(period, {
          totalDays: existing.totalDays + paymentDays,
          onTimeCount: existing.onTimeCount + (isOnTime ? 1 : 0),
          totalCount: existing.totalCount + 1,
        });
      }

      const paymentAnalysis: PaymentTimelinessItem[] = [];
      const sortedPaymentPeriods = Array.from(paymentAnalysisMap.keys()).sort();
      for (const period of sortedPaymentPeriods) {
        const data = paymentAnalysisMap.get(period)!;
        paymentAnalysis.push({
          period,
          averagePaymentDays: data.totalCount > 0 ? Number((data.totalDays / data.totalCount).toFixed(1)) : 0,
          onTimePaymentRate: data.totalCount > 0 ? Number(((data.onTimeCount / data.totalCount) * 100).toFixed(2)) : 0,
          totalPayments: data.totalCount,
        });
      }

      const result: DashboardChartsResult = {
        purchaseTrend,
        categoryDistribution,
        supplierRanking,
        paymentAnalysis,
      };

      return successResponse(result);
    } catch (error) {
      return errorResponse(
        `获取图表数据失败: ${error instanceof Error ? error.message : '未知错误'}`,
        500
      );
    }
  },

  async generateMonthlyReport(
    year: number,
    month: number
  ): Promise<ApiResponse<MonthlyReport>> {
    try {
      const yearMonth = `${year}-${String(month).padStart(2, '0')}`;

      const existingReport = await prisma.monthlyReport.findUnique({
        where: { yearMonth },
      });

      if (existingReport) {
        return successResponse(transformMonthlyReport(existingReport));
      }

      const startDate = dayjs(`${year}-${month}-01`).startOf('month').toDate();
      const endDate = dayjs(startDate).endOf('month').toDate();
      const prevMonthStart = dayjs(startDate).subtract(1, 'month').toDate();
      const prevMonthEnd = dayjs(prevMonthStart).endOf('month').toDate();
      const sameMonthLastYearStart = dayjs(startDate).subtract(1, 'year').toDate();
      const sameMonthLastYearEnd = dayjs(sameMonthLastYearStart).endOf('month').toDate();

      const orderWhere: Prisma.PurchaseOrderWhereInput = {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        status: {
          notIn: ['draft', 'cancelled'],
        },
      };

      const [
        orders,
        categories,
        supplierOrderStats,
        payments,
        prevMonthOrders,
        sameMonthLastYearOrders,
      ] = await Promise.all([
        prisma.purchaseOrder.findMany({
          where: orderWhere,
          include: {
            category: true,
            supplier: true,
            receipt: true,
          },
        }),
        prisma.category.findMany({
          select: { id: true, name: true },
        }),
        prisma.purchaseOrder.groupBy({
          by: ['supplierId'],
          _sum: {
            totalAmount: true,
          },
          _count: true,
          where: orderWhere,
        }),
        prisma.payment.findMany({
          where: {
            status: 'paid',
            actualPaidDate: {
              gte: startDate,
              lte: endDate,
            },
          },
          select: {
            amount: true,
            dueDate: true,
            actualPaidDate: true,
          },
        }),
        prisma.purchaseOrder.findMany({
          where: {
            createdAt: {
              gte: prevMonthStart,
              lte: prevMonthEnd,
            },
            status: {
              notIn: ['draft', 'cancelled'],
            },
          },
          select: {
            totalAmount: true,
          },
        }),
        prisma.purchaseOrder.findMany({
          where: {
            createdAt: {
              gte: sameMonthLastYearStart,
              lte: sameMonthLastYearEnd,
            },
            status: {
              notIn: ['draft', 'cancelled'],
            },
          },
          select: {
            totalAmount: true,
          },
        }),
      ]);

      const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

      const purchaseByCategory: { [key: string]: number } = {};
      for (const order of orders) {
        const categoryName = categoryMap.get(order.categoryId) || '未知品类';
        purchaseByCategory[categoryName] = (purchaseByCategory[categoryName] || 0) + decimalToNumber(order.totalAmount);
      }

      const supplierIds = supplierOrderStats.map((s) => s.supplierId);
      const supplierDetails = await prisma.supplier.findMany({
        where: {
          id: {
            in: supplierIds,
          },
        },
        select: {
          id: true,
          name: true,
        },
      });
      const supplierMap = new Map(supplierDetails.map((s) => [s.id, s.name]));

      const supplierRanking = supplierOrderStats
        .map((s) => ({
          supplierId: s.supplierId,
          supplierName: supplierMap.get(s.supplierId) || '未知供应商',
          amount: decimalToNumber(s._sum.totalAmount),
          orderCount: s._count,
        }))
        .sort((a, b) => b.amount - a.amount);

      let totalPaymentDays = 0;
      let onTimePayments = 0;
      for (const payment of payments) {
        if (payment.actualPaidDate) {
          const paymentDays = dayjs(payment.actualPaidDate).diff(dayjs(payment.dueDate), 'day');
          totalPaymentDays += Math.max(0, paymentDays);
          if (paymentDays <= 0) {
            onTimePayments++;
          }
        }
      }

      const paymentTimeliness = {
        onTime: onTimePayments,
        overdue: payments.length - onTimePayments,
        averageDays: payments.length > 0 ? Number((totalPaymentDays / payments.length).toFixed(1)) : 0,
      };

      const suppliersWithSatisfaction = await prisma.supplier.findMany({
        where: {
          id: {
            in: supplierIds,
          },
        },
        select: {
          id: true,
          name: true,
          satisfactionScore: true,
        },
        orderBy: {
          satisfactionScore: 'desc',
        },
      });

      const satisfactionScores = suppliersWithSatisfaction.map((s) => ({
        supplierId: s.id,
        supplierName: s.name,
        score: decimalToNumber(s.satisfactionScore),
      }));

      const currentTotalAmount = orders.reduce(
        (sum, order) => sum + decimalToNumber(order.totalAmount),
        0
      );
      const prevMonthTotal = prevMonthOrders.reduce(
        (sum, order) => sum + decimalToNumber(order.totalAmount),
        0
      );
      const sameMonthLastYearTotal = sameMonthLastYearOrders.reduce(
        (sum, order) => sum + decimalToNumber(order.totalAmount),
        0
      );

      const totalAcceptedQuantity = orders.reduce(
        (sum, order) => sum + (order.receipt?.acceptedQuantity || 0),
        0
      );
      const totalOrderedQuantity = orders.reduce((sum, order) => sum + order.quantity, 0);
      const qualityPassRate = totalOrderedQuantity > 0
        ? Number(((totalAcceptedQuantity / totalOrderedQuantity) * 100).toFixed(2))
        : 0;

      let totalDeliveryDays = 0;
      let deliveredOrders = 0;
      for (const order of orders) {
        if (order.receipt?.receivedAt) {
          const deliveryDays = dayjs(order.receipt.receivedAt).diff(dayjs(order.createdAt), 'day');
          totalDeliveryDays += deliveryDays;
          deliveredOrders++;
        }
      }

      const performanceMetrics = {
        totalAmount: Number(currentTotalAmount.toFixed(2)),
        orderCount: orders.length,
        averageDeliveryDays: deliveredOrders > 0 ? Number((totalDeliveryDays / deliveredOrders).toFixed(1)) : 0,
        qualityPassRate,
        onTimePaymentRate: payments.length > 0 ? Number(((onTimePayments / payments.length) * 100).toFixed(2)) : 0,
        monthOverMonthGrowth: prevMonthTotal > 0
          ? Number((((currentTotalAmount - prevMonthTotal) / prevMonthTotal) * 100).toFixed(2))
          : 0,
        yearOverYearGrowth: sameMonthLastYearTotal > 0
          ? Number((((currentTotalAmount - sameMonthLastYearTotal) / sameMonthLastYearTotal) * 100).toFixed(2))
          : 0,
      };

      const report = await prisma.monthlyReport.create({
        data: {
          id: uuidv4(),
          yearMonth,
          purchaseByCategory,
          supplierRanking,
          paymentTimeliness,
          satisfactionScores,
          performanceMetrics,
        },
      });

      return successResponse(transformMonthlyReport(report), '月度报表生成成功');
    } catch (error) {
      return errorResponse(
        `生成月度报表失败: ${error instanceof Error ? error.message : '未知错误'}`,
        500
      );
    }
  },

  async getMonthlyReports(
    page: number = 1,
    pageSize: number = 12
  ): Promise<ApiResponse<PaginatedResponse<MonthlyReport>>> {
    try {
      const skip = (page - 1) * pageSize;

      const [items, total] = await Promise.all([
        prisma.monthlyReport.findMany({
          skip,
          take: pageSize,
          orderBy: { yearMonth: 'desc' },
        }),
        prisma.monthlyReport.count(),
      ]);

      const transformedItems = items.map(transformMonthlyReport);
      return paginatedResponse(transformedItems, total, page, pageSize);
    } catch (error) {
      return errorResponse(
        `获取月度报表列表失败: ${error instanceof Error ? error.message : '未知错误'}`,
        500
      );
    }
  },

  async getMonthlyReportById(
    id: string
  ): Promise<ApiResponse<MonthlyReport | null>> {
    try {
      const report = await prisma.monthlyReport.findUnique({
        where: { id },
      });

      if (!report) {
        return errorResponse('月度报表不存在', 404);
      }

      return successResponse(transformMonthlyReport(report));
    } catch (error) {
      return errorResponse(
        `获取月度报表详情失败: ${error instanceof Error ? error.message : '未知错误'}`,
        500
      );
    }
  },

  async exportMonthlyReport(
    id: string
  ): Promise<ApiResponse<{ data: any[]; headers: string[]; filename: string }>> {
    try {
      const report = await prisma.monthlyReport.findUnique({
        where: { id },
      });

      if (!report) {
        return errorResponse('月度报表不存在', 404);
      }

      const transformed = transformMonthlyReport(report);

      const exportData: any[] = [];

      exportData.push({ 指标: '采购总额', 值: transformed.performanceMetrics.totalAmount });
      exportData.push({ 指标: '订单总数', 值: transformed.performanceMetrics.orderCount });
      exportData.push({ 指标: '平均交付天数', 值: transformed.performanceMetrics.averageDeliveryDays });
      exportData.push({ 指标: '质量合格率(%)', 值: transformed.performanceMetrics.qualityPassRate });
      exportData.push({ 指标: '按时付款率(%)', 值: transformed.performanceMetrics.onTimePaymentRate });
      exportData.push({ 指标: '环比增长(%)', 值: (transformed.performanceMetrics as any).monthOverMonthGrowth || 0 });
      exportData.push({ 指标: '同比增长(%)', 值: (transformed.performanceMetrics as any).yearOverYearGrowth || 0 });
      exportData.push({ 指标: '', 值: '' });

      exportData.push({ 指标: '=== 各品类采购额 ===', 值: '' });
      for (const [category, amount] of Object.entries(transformed.purchaseByCategory)) {
        exportData.push({ 指标: category, 值: amount });
      }
      exportData.push({ 指标: '', 值: '' });

      exportData.push({ 指标: '=== 供应商排名(按金额) ===', 值: '' });
      exportData.push({ 指标: '供应商名称', 值: '采购金额' });
      transformed.supplierRanking.forEach((s, index) => {
        exportData.push({ 指标: `${index + 1}. ${s.supplierName}`, 值: s.amount });
      });
      exportData.push({ 指标: '', 值: '' });

      exportData.push({ 指标: '=== 付款时效分析 ===', 值: '' });
      exportData.push({ 指标: '按时付款数', 值: transformed.paymentTimeliness.onTime });
      exportData.push({ 指标: '逾期付款数', 值: transformed.paymentTimeliness.overdue });
      exportData.push({ 指标: '平均付款天数', 值: transformed.paymentTimeliness.averageDays });
      exportData.push({ 指标: '', 值: '' });

      exportData.push({ 指标: '=== 供应商满意度 ===', 值: '' });
      exportData.push({ 指标: '供应商名称', 值: '满意度评分' });
      transformed.satisfactionScores.forEach((s, index) => {
        exportData.push({ 指标: `${index + 1}. ${s.supplierName}`, 值: s.score });
      });

      const headers = ['指标', '值'];
      const filename = `月度报表_${transformed.yearMonth}_${dayjs().format('YYYYMMDDHHmmss')}.csv`;

      return successResponse({
        data: exportData,
        headers,
        filename,
      });
    } catch (error) {
      return errorResponse(
        `导出月度报表失败: ${error instanceof Error ? error.message : '未知错误'}`,
        500
      );
    }
  },
};

export default reportService;
