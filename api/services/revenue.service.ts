import prisma from '../utils/prisma.js';
import type { RevenueRecord, PaginatedResponse, ReconciliationStatus } from '@shared/types';

interface RevenueQueryParams {
  businessLine?: string;
  channel?: string;
  customer?: string;
  startDate?: Date;
  endDate?: Date;
  reconciliationStatus?: ReconciliationStatus;
  minAmount?: number;
  maxAmount?: number;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface RevenueCreateData {
  transactionNo: string;
  businessLine: string;
  channel: string;
  customer: string;
  amount: number;
  currency?: string;
  transactionTime: Date;
}

const revenueService = {
  async create(data: RevenueCreateData): Promise<RevenueRecord> {
    const record = await prisma.revenueRecord.create({
      data: {
        ...data,
        currency: data.currency || 'CNY',
      },
      include: {
        splitDetails: true,
      },
    });
    return {
      ...record,
      amount: Number(record.amount),
      splitDetails: record.splitDetails.map(d => ({
        ...d,
        ratio: Number(d.ratio),
        amount: Number(d.amount),
      })),
    };
  },

  async getById(id: string): Promise<RevenueRecord | null> {
    const record = await prisma.revenueRecord.findUnique({
      where: { id },
      include: {
        splitDetails: true,
      },
    });
    if (!record) return null;
    return {
      ...record,
      amount: Number(record.amount),
      splitDetails: record.splitDetails.map(d => ({
        ...d,
        ratio: Number(d.ratio),
        amount: Number(d.amount),
      })),
    };
  },

  async getByTransactionNo(transactionNo: string): Promise<RevenueRecord | null> {
    const record = await prisma.revenueRecord.findUnique({
      where: { transactionNo },
      include: {
        splitDetails: true,
      },
    });
    if (!record) return null;
    return {
      ...record,
      amount: Number(record.amount),
      splitDetails: record.splitDetails.map(d => ({
        ...d,
        ratio: Number(d.ratio),
        amount: Number(d.amount),
      })),
    };
  },

  async list(params: RevenueQueryParams): Promise<PaginatedResponse<RevenueRecord>> {
    const {
      businessLine,
      channel,
      customer,
      startDate,
      endDate,
      reconciliationStatus,
      minAmount,
      maxAmount,
      page = 1,
      pageSize = 20,
      sortBy = 'transactionTime',
      sortOrder = 'desc',
    } = params;

    const where: any = {};

    if (businessLine) where.businessLine = businessLine;
    if (channel) where.channel = channel;
    if (customer) where.customer = { contains: customer };
    if (startDate) where.transactionTime = { ...where.transactionTime, gte: startDate };
    if (endDate) where.transactionTime = { ...where.transactionTime, lte: endDate };
    if (reconciliationStatus) where.reconciliationStatus = reconciliationStatus;
    if (minAmount) where.amount = { ...where.amount, gte: minAmount };
    if (maxAmount) where.amount = { ...where.amount, lte: maxAmount };

    const [total, records] = await Promise.all([
      prisma.revenueRecord.count({ where }),
      prisma.revenueRecord.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { [sortBy]: sortOrder },
        include: {
          splitDetails: true,
        },
      }),
    ]);

    const items: RevenueRecord[] = records.map(record => ({
      ...record,
      amount: Number(record.amount),
      splitDetails: record.splitDetails.map(d => ({
        ...d,
        ratio: Number(d.ratio),
        amount: Number(d.amount),
      })),
    }));

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  },

  async update(id: string, data: Partial<RevenueCreateData>): Promise<RevenueRecord> {
    const record = await prisma.revenueRecord.update({
      where: { id },
      data,
      include: {
        splitDetails: true,
      },
    });
    return {
      ...record,
      amount: Number(record.amount),
      splitDetails: record.splitDetails.map(d => ({
        ...d,
        ratio: Number(d.ratio),
        amount: Number(d.amount),
      })),
    };
  },

  async delete(id: string): Promise<RevenueRecord> {
    const record = await prisma.revenueRecord.delete({
      where: { id },
      include: {
        splitDetails: true,
      },
    });
    return {
      ...record,
      amount: Number(record.amount),
      splitDetails: record.splitDetails.map(d => ({
        ...d,
        ratio: Number(d.ratio),
        amount: Number(d.amount),
      })),
    };
  },

  async batchCreate(dataList: RevenueCreateData[]): Promise<RevenueRecord[]> {
    const records = await Promise.all(
      dataList.map(data => this.create(data))
    );
    return records;
  },

  async fetchMockData(count: number = 50): Promise<RevenueRecord[]> {
    const businessLines = ['电商零售', '企业服务', 'SaaS订阅', '广告营销', '咨询服务'];
    const channels = ['支付宝', '微信支付', '银行转账', '信用卡', 'PayPal'];
    const customers = ['阿里巴巴', '腾讯科技', '百度在线', '字节跳动', '京东集团', '美团点评', '小米科技', '华为技术'];
    const now = new Date();

    const mockData: RevenueCreateData[] = [];

    for (let i = 0; i < count; i++) {
      const daysAgo = Math.floor(Math.random() * 30);
      const hoursAgo = Math.floor(Math.random() * 24);
      const transactionTime = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000 - hoursAgo * 60 * 60 * 1000);

      mockData.push({
        transactionNo: `TXN${Date.now()}${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
        businessLine: businessLines[Math.floor(Math.random() * businessLines.length)],
        channel: channels[Math.floor(Math.random() * channels.length)],
        customer: customers[Math.floor(Math.random() * customers.length)],
        amount: Math.floor(Math.random() * 100000) + 100,
        transactionTime,
      });
    }

    return this.batchCreate(mockData);
  },

  async getStatsByBusinessLine(startDate: Date, endDate: Date): Promise<{ businessLine: string; totalAmount: number; count: number }[]> {
    const result = await prisma.revenueRecord.groupBy({
      by: ['businessLine'],
      where: {
        transactionTime: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
    });

    return result.map(item => ({
      businessLine: item.businessLine,
      totalAmount: Number(item._sum.amount || 0),
      count: item._count.id,
    }));
  },

  async getStatsByChannel(startDate: Date, endDate: Date): Promise<{ channel: string; totalAmount: number; count: number }[]> {
    const result = await prisma.revenueRecord.groupBy({
      by: ['channel'],
      where: {
        transactionTime: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
    });

    return result.map(item => ({
      channel: item.channel,
      totalAmount: Number(item._sum.amount || 0),
      count: item._count.id,
    }));
  },

  async getDailyTrend(startDate: Date, endDate: Date): Promise<{ date: string; amount: number }[]> {
    const result = await prisma.$queryRaw`
      SELECT 
        DATE("transactionTime") as date,
        SUM(amount) as totalAmount
      FROM "RevenueRecord"
      WHERE "transactionTime" >= ${startDate} AND "transactionTime" <= ${endDate}
      GROUP BY DATE("transactionTime")
      ORDER BY date ASC
    `;

    return (result as any[]).map(item => ({
      date: item.date.toISOString().split('T')[0],
      amount: Number(item.totalAmount),
    }));
  },
};

export default revenueService;
