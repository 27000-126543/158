import prisma from '../utils/prisma.js';
import { v4 as uuidv4 } from 'uuid';
import type { Settlement, PaymentInstruction, SettlementStatus, PaginatedResponse } from '@shared/types';

interface SettlementQueryParams {
  businessLine?: string;
  status?: SettlementStatus;
  startDate?: Date;
  endDate?: Date;
  overBudget?: boolean;
  page?: number;
  pageSize?: number;
}

interface SettlementCreateData {
  businessLine: string;
  settlementDate: Date;
  budgetThreshold: number;
}

interface PaymentInstructionCreateData {
  settlementId: string;
  payeeAccount: string;
  payeeName: string;
  payeeBank: string;
}

interface BudgetCheckResult {
  totalAmount: number;
  budgetThreshold: number;
  overBudget: boolean;
  excessAmount: number;
}

const settlementService = {
  async create(data: SettlementCreateData): Promise<Settlement> {
    const settlementNo = `SET${data.settlementDate.getFullYear()}${String(data.settlementDate.getMonth() + 1).padStart(2, '0')}${String(data.settlementDate.getDate()).padStart(2, '0')}${uuidv4().slice(0, 4).toUpperCase()}`;

    const startOfDay = new Date(data.settlementDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(data.settlementDate);
    endOfDay.setHours(23, 59, 59, 999);

    const revenues = await prisma.revenueRecord.findMany({
      where: {
        businessLine: data.businessLine,
        transactionTime: {
          gte: startOfDay,
          lte: endOfDay,
        },
        settlementId: null,
      },
    });

    const totalAmount = revenues.reduce((sum, r) => sum + Number(r.amount), 0);
    const overBudget = totalAmount > data.budgetThreshold;

    const settlement = await prisma.settlement.create({
      data: {
        settlementNo,
        businessLine: data.businessLine,
        settlementDate: data.settlementDate,
        totalAmount,
        budgetThreshold: data.budgetThreshold,
        overBudget,
      },
    });

    if (revenues.length > 0) {
      await prisma.revenueRecord.updateMany({
        where: {
          id: { in: revenues.map(r => r.id) },
        },
        data: { settlementId: settlement.id },
      });
    }

    return {
      ...settlement,
      totalAmount: Number(settlement.totalAmount),
      budgetThreshold: Number(settlement.budgetThreshold),
    };
  },

  async getById(id: string): Promise<Settlement | null> {
    const settlement = await prisma.settlement.findUnique({
      where: { id },
      include: {
        revenues: true,
        paymentInstruction: true,
      },
    });
    if (!settlement) return null;
    return {
      ...settlement,
      totalAmount: Number(settlement.totalAmount),
      budgetThreshold: Number(settlement.budgetThreshold),
      revenues: settlement.revenues.map(r => ({
        ...r,
        amount: Number(r.amount),
      })),
      paymentInstruction: settlement.paymentInstruction ? {
        ...settlement.paymentInstruction,
        amount: Number(settlement.paymentInstruction.amount),
      } : undefined,
    };
  },

  async getBySettlementNo(settlementNo: string): Promise<Settlement | null> {
    const settlement = await prisma.settlement.findUnique({
      where: { settlementNo },
      include: {
        revenues: true,
        paymentInstruction: true,
      },
    });
    if (!settlement) return null;
    return {
      ...settlement,
      totalAmount: Number(settlement.totalAmount),
      budgetThreshold: Number(settlement.budgetThreshold),
      revenues: settlement.revenues.map(r => ({
        ...r,
        amount: Number(r.amount),
      })),
      paymentInstruction: settlement.paymentInstruction ? {
        ...settlement.paymentInstruction,
        amount: Number(settlement.paymentInstruction.amount),
      } : undefined,
    };
  },

  async list(params: SettlementQueryParams): Promise<PaginatedResponse<Settlement>> {
    const {
      businessLine,
      status,
      startDate,
      endDate,
      overBudget,
      page = 1,
      pageSize = 20,
    } = params;

    const where: any = {};
    if (businessLine) where.businessLine = businessLine;
    if (status) where.status = status;
    if (startDate) where.settlementDate = { ...where.settlementDate, gte: startDate };
    if (endDate) where.settlementDate = { ...where.settlementDate, lte: endDate };
    if (overBudget !== undefined) where.overBudget = overBudget;

    const [total, settlements] = await Promise.all([
      prisma.settlement.count({ where }),
      prisma.settlement.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { settlementDate: 'desc' },
        include: {
          revenues: true,
          paymentInstruction: true,
        },
      }),
    ]);

    const items: Settlement[] = settlements.map(s => ({
      ...s,
      totalAmount: Number(s.totalAmount),
      budgetThreshold: Number(s.budgetThreshold),
      revenues: s.revenues.map(r => ({
        ...r,
        amount: Number(r.amount),
      })),
      paymentInstruction: s.paymentInstruction ? {
        ...s.paymentInstruction,
        amount: Number(s.paymentInstruction.amount),
      } : undefined,
    }));

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  },

  async update(id: string, data: Partial<SettlementCreateData> & { status?: SettlementStatus }): Promise<Settlement> {
    const settlement = await prisma.settlement.update({
      where: { id },
      data,
      include: {
        revenues: true,
        paymentInstruction: true,
      },
    });
    return {
      ...settlement,
      totalAmount: Number(settlement.totalAmount),
      budgetThreshold: Number(settlement.budgetThreshold),
      revenues: settlement.revenues.map(r => ({
        ...r,
        amount: Number(r.amount),
      })),
      paymentInstruction: settlement.paymentInstruction ? {
        ...settlement.paymentInstruction,
        amount: Number(settlement.paymentInstruction.amount),
      } : undefined,
    };
  },

  async delete(id: string): Promise<Settlement> {
    const settlement = await prisma.settlement.delete({
      where: { id },
      include: {
        revenues: true,
        paymentInstruction: true,
      },
    });
    return {
      ...settlement,
      totalAmount: Number(settlement.totalAmount),
      budgetThreshold: Number(settlement.budgetThreshold),
      revenues: settlement.revenues.map(r => ({
        ...r,
        amount: Number(r.amount),
      })),
      paymentInstruction: settlement.paymentInstruction ? {
        ...settlement.paymentInstruction,
        amount: Number(settlement.paymentInstruction.amount),
      } : undefined,
    };
  },

  async generateDailySettlements(date: Date = new Date(), budgetThresholds: { [key: string]: number } = {}): Promise<Settlement[]> {
    const businessLines = ['电商零售', '企业服务', 'SaaS订阅', '广告营销', '咨询服务'];
    const settlements: Settlement[] = [];

    for (const businessLine of businessLines) {
      const budgetThreshold = budgetThresholds[businessLine] || 500000;
      
      const existingSettlement = await prisma.settlement.findFirst({
        where: {
          businessLine,
          settlementDate: date,
        },
      });

      if (!existingSettlement) {
        const settlement = await this.create({
          businessLine,
          settlementDate: date,
          budgetThreshold,
        });
        settlements.push(settlement);
      }
    }

    return settlements;
  },

  async checkBudget(businessLine: string, settlementDate: Date): Promise<BudgetCheckResult> {
    const startOfDay = new Date(settlementDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(settlementDate);
    endOfDay.setHours(23, 59, 59, 999);

    const [revenues, latestSettlement] = await Promise.all([
      prisma.revenueRecord.findMany({
        where: {
          businessLine,
          transactionTime: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      }),
      prisma.settlement.findFirst({
        where: {
          businessLine,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const totalAmount = revenues.reduce((sum, r) => sum + Number(r.amount), 0);
    const budgetThreshold = latestSettlement ? Number(latestSettlement.budgetThreshold) : 500000;
    const overBudget = totalAmount > budgetThreshold;
    const excessAmount = overBudget ? totalAmount - budgetThreshold : 0;

    return {
      totalAmount,
      budgetThreshold,
      overBudget,
      excessAmount,
    };
  },

  async createPaymentInstruction(data: PaymentInstructionCreateData): Promise<PaymentInstruction> {
    const settlement = await prisma.settlement.findUnique({
      where: { id: data.settlementId },
    });

    if (!settlement) {
      throw new Error('结算单不存在');
    }

    if (settlement.status !== 'approved') {
      throw new Error('结算单尚未审批通过，无法生成付款指令');
    }

    if (settlement.paymentInstructionId) {
      throw new Error('该结算单已生成付款指令');
    }

    const instructionNo = `PAY${Date.now()}${uuidv4().slice(0, 4).toUpperCase()}`;

    const paymentInstruction = await prisma.paymentInstruction.create({
      data: {
        instructionNo,
        settlementId: data.settlementId,
        payeeAccount: data.payeeAccount,
        payeeName: data.payeeName,
        payeeBank: data.payeeBank,
        amount: settlement.totalAmount,
      },
    });

    await prisma.settlement.update({
      where: { id: data.settlementId },
      data: { paymentInstructionId: paymentInstruction.id },
    });

    return {
      ...paymentInstruction,
      amount: Number(paymentInstruction.amount),
    };
  },

  async getPaymentInstructionById(id: string): Promise<PaymentInstruction | null> {
    const instruction = await prisma.paymentInstruction.findUnique({
      where: { id },
      include: {
        settlement: true,
      },
    });
    if (!instruction) return null;
    return {
      ...instruction,
      amount: Number(instruction.amount),
      settlement: {
        ...instruction.settlement,
        totalAmount: Number(instruction.settlement.totalAmount),
        budgetThreshold: Number(instruction.settlement.budgetThreshold),
      },
    };
  },

  async updatePaymentInstructionStatus(id: string, status: 'pending' | 'sent' | 'paid' | 'failed'): Promise<PaymentInstruction> {
    const data: any = { status };
    if (status === 'sent') data.sentAt = new Date();
    if (status === 'paid') data.paidAt = new Date();

    const instruction = await prisma.paymentInstruction.update({
      where: { id },
      data,
      include: {
        settlement: true,
      },
    });

    if (status === 'paid') {
      await prisma.settlement.update({
        where: { id: instruction.settlementId },
        data: { status: 'paid' },
      });
    }

    return {
      ...instruction,
      amount: Number(instruction.amount),
      settlement: {
        ...instruction.settlement,
        totalAmount: Number(instruction.settlement.totalAmount),
        budgetThreshold: Number(instruction.settlement.budgetThreshold),
      },
    };
  },

  async listPaymentInstructions(params: { status?: string; page?: number; pageSize?: number }): Promise<PaginatedResponse<PaymentInstruction>> {
    const { status, page = 1, pageSize = 20 } = params;

    const where: any = {};
    if (status) where.status = status;

    const [total, instructions] = await Promise.all([
      prisma.paymentInstruction.count({ where }),
      prisma.paymentInstruction.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          settlement: true,
        },
      }),
    ]);

    const items: PaymentInstruction[] = instructions.map(i => ({
      ...i,
      amount: Number(i.amount),
      settlement: {
        ...i.settlement,
        totalAmount: Number(i.settlement.totalAmount),
        budgetThreshold: Number(i.settlement.budgetThreshold),
      },
    }));

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  },

  async getSettlementStats(startDate: Date, endDate: Date): Promise<{ businessLine: string; totalAmount: number; count: number; overBudgetCount: number }[]> {
    const result = await prisma.settlement.groupBy({
      by: ['businessLine'],
      where: {
        settlementDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: {
        totalAmount: true,
      },
      _count: {
        id: true,
      },
    });

    const overBudgetCounts = await prisma.settlement.groupBy({
      by: ['businessLine'],
      where: {
        settlementDate: {
          gte: startDate,
          lte: endDate,
        },
        overBudget: true,
      },
      _count: {
        id: true,
      },
    });

    const overBudgetMap: { [key: string]: number } = {};
    for (const item of overBudgetCounts) {
      overBudgetMap[item.businessLine] = item._count.id;
    }

    return result.map(item => ({
      businessLine: item.businessLine,
      totalAmount: Number(item._sum.totalAmount || 0),
      count: item._count.id,
      overBudgetCount: overBudgetMap[item.businessLine] || 0,
    }));
  },

  async createMockSettlements(days: number = 7): Promise<Settlement[]> {
    const settlements: Settlement[] = [];
    const businessLines = ['电商零售', '企业服务', 'SaaS订阅', '广告营销', '咨询服务'];
    const budgetThresholds: { [key: string]: number } = {
      '电商零售': 1000000,
      '企业服务': 800000,
      'SaaS订阅': 500000,
      '广告营销': 600000,
      '咨询服务': 400000,
    };

    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);

      for (const businessLine of businessLines) {
        const settlement = await this.create({
          businessLine,
          settlementDate: date,
          budgetThreshold: budgetThresholds[businessLine],
        });
        settlements.push(settlement);
      }
    }

    return settlements;
  },
};

export default settlementService;
