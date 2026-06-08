import prisma from '../utils/prisma.js';
import type { SplitRule, SplitDetail, RevenueRecord, RuleStatus, PaginatedResponse } from '@shared/types';

interface SplitRuleCreateData {
  businessLine: string;
  ratios: { [key: string]: number };
  effectiveDate: Date;
  expiryDate?: Date;
  createdBy: string;
}

interface SplitRuleUpdateData {
  ratios?: { [key: string]: number };
  effectiveDate?: Date;
  expiryDate?: Date;
  status?: RuleStatus;
  changeReason: string;
  changedBy: string;
}

interface SplitQueryParams {
  businessLine?: string;
  status?: RuleStatus;
  page?: number;
  pageSize?: number;
}

interface SplitResult {
  revenueId: string;
  businessLine: string;
  totalAmount: number;
  splitDetails: SplitDetail[];
  success: boolean;
  error?: string;
}

const splitEngineService = {
  async createRule(data: SplitRuleCreateData): Promise<SplitRule> {
    const totalRatio = Object.values(data.ratios).reduce((sum, r) => sum + r, 0);
    if (Math.abs(totalRatio - 1) > 0.0001) {
      throw new Error(`拆分比例总和必须等于1，当前为 ${totalRatio}`);
    }

    const existingActiveRule = await prisma.splitRule.findFirst({
      where: {
        businessLine: data.businessLine,
        status: 'active',
        OR: [
          { expiryDate: null },
          { expiryDate: { gte: data.effectiveDate } },
        ],
      },
    });

    if (existingActiveRule) {
      await prisma.splitRule.update({
        where: { id: existingActiveRule.id },
        data: { expiryDate: data.effectiveDate },
      });
    }

    const rule = await prisma.splitRule.create({
      data: {
        ...data,
        status: 'draft',
        version: 1,
      },
    });

    return {
      ...rule,
      ratios: rule.ratios as { [key: string]: number },
    };
  },

  async getRuleById(id: string): Promise<SplitRule | null> {
    const rule = await prisma.splitRule.findUnique({
      where: { id },
      include: {
        history: true,
      },
    });
    if (!rule) return null;
    return {
      ...rule,
      ratios: rule.ratios as { [key: string]: number },
      history: rule.history.map(h => ({
        ...h,
        oldRatios: h.oldRatios as { [key: string]: number },
        newRatios: h.newRatios as { [key: string]: number },
      })),
    };
  },

  async getActiveRule(businessLine: string, date: Date = new Date()): Promise<SplitRule | null> {
    const rule = await prisma.splitRule.findFirst({
      where: {
        businessLine,
        status: 'active',
        effectiveDate: { lte: date },
        OR: [
          { expiryDate: null },
          { expiryDate: { gt: date } },
        ],
      },
      orderBy: { effectiveDate: 'desc' },
    });
    if (!rule) return null;
    return {
      ...rule,
      ratios: rule.ratios as { [key: string]: number },
    };
  },

  async listRules(params: SplitQueryParams): Promise<PaginatedResponse<SplitRule>> {
    const { businessLine, status, page = 1, pageSize = 20 } = params;

    const where: any = {};
    if (businessLine) where.businessLine = businessLine;
    if (status) where.status = status;

    const [total, rules] = await Promise.all([
      prisma.splitRule.count({ where }),
      prisma.splitRule.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          history: true,
        },
      }),
    ]);

    const items: SplitRule[] = rules.map(rule => ({
      ...rule,
      ratios: rule.ratios as { [key: string]: number },
      history: rule.history.map(h => ({
        ...h,
        oldRatios: h.oldRatios as { [key: string]: number },
        newRatios: h.newRatios as { [key: string]: number },
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

  async updateRule(id: string, data: SplitRuleUpdateData): Promise<SplitRule> {
    const existingRule = await prisma.splitRule.findUnique({
      where: { id },
    });

    if (!existingRule) {
      throw new Error('拆分规则不存在');
    }

    let maxChange = 0;
    if (data.ratios) {
      const oldRatios = existingRule.ratios as { [key: string]: number };
      const allKeys = [...new Set([...Object.keys(oldRatios), ...Object.keys(data.ratios)])];
      
      for (const key of allKeys) {
        const oldRatio = oldRatios[key] || 0;
        const newRatio = data.ratios[key] || 0;
        const change = Math.abs(newRatio - oldRatio);
        if (change > maxChange) {
          maxChange = change;
        }
      }

      const totalRatio = Object.values(data.ratios).reduce((sum, r) => sum + r, 0);
      if (Math.abs(totalRatio - 1) > 0.0001) {
        throw new Error(`拆分比例总和必须等于1，当前为 ${totalRatio}`);
      }
    }

    await prisma.splitRuleHistory.create({
      data: {
        ruleId: id,
        oldRatios: existingRule.ratios,
        newRatios: data.ratios || existingRule.ratios,
        changeReason: data.changeReason,
        changedBy: data.changedBy,
      },
    });

    const newStatus = maxChange > 0.1 ? 'pending_approval' : (data.status || existingRule.status);

    const rule = await prisma.splitRule.update({
      where: { id },
      data: {
        ratios: data.ratios || existingRule.ratios,
        effectiveDate: data.effectiveDate || existingRule.effectiveDate,
        expiryDate: data.expiryDate !== undefined ? data.expiryDate : existingRule.expiryDate,
        status: newStatus,
        version: { increment: 1 },
      },
      include: {
        history: true,
      },
    });

    return {
      ...rule,
      ratios: rule.ratios as { [key: string]: number },
      history: rule.history.map(h => ({
        ...h,
        oldRatios: h.oldRatios as { [key: string]: number },
        newRatios: h.newRatios as { [key: string]: number },
      })),
    };
  },

  async deleteRule(id: string): Promise<SplitRule> {
    const rule = await prisma.splitRule.delete({
      where: { id },
      include: {
        history: true,
      },
    });
    return {
      ...rule,
      ratios: rule.ratios as { [key: string]: number },
      history: rule.history.map(h => ({
        ...h,
        oldRatios: h.oldRatios as { [key: string]: number },
        newRatios: h.newRatios as { [key: string]: number },
      })),
    };
  },

  async splitRevenue(revenue: RevenueRecord): Promise<SplitResult> {
    try {
      const rule = await this.getActiveRule(revenue.businessLine, revenue.transactionTime);
      
      if (!rule) {
        return {
          revenueId: revenue.id,
          businessLine: revenue.businessLine,
          totalAmount: revenue.amount,
          splitDetails: [],
          success: false,
          error: `未找到业务线 [${revenue.businessLine}] 的有效拆分规则`,
        };
      }

      const splitDetails: SplitDetail[] = [];
      let allocatedAmount = 0;
      const entries = Object.entries(rule.ratios);

      for (let i = 0; i < entries.length; i++) {
        const [targetBusinessLine, ratio] = entries[i];
        const ratioNum = Number(ratio);
        let amount: number;

        if (i === entries.length - 1) {
          amount = Math.round((revenue.amount - allocatedAmount) * 10000) / 10000;
        } else {
          amount = Math.round(revenue.amount * ratioNum * 10000) / 10000;
          allocatedAmount += amount;
        }

        const detail = await prisma.splitDetail.create({
          data: {
            revenueId: revenue.id,
            businessLine: targetBusinessLine,
            ratio,
            amount,
          },
        });

        splitDetails.push({
          ...detail,
          ratio: Number(detail.ratio),
          amount: Number(detail.amount),
        });
      }

      return {
        revenueId: revenue.id,
        businessLine: revenue.businessLine,
        totalAmount: revenue.amount,
        splitDetails,
        success: true,
      };
    } catch (error: any) {
      return {
        revenueId: revenue.id,
        businessLine: revenue.businessLine,
        totalAmount: revenue.amount,
        splitDetails: [],
        success: false,
        error: error.message,
      };
    }
  },

  async batchSplitRevenues(revenues: RevenueRecord[]): Promise<SplitResult[]> {
    const results = await Promise.all(
      revenues.map(revenue => this.splitRevenue(revenue))
    );
    return results;
  },

  async getSplitDetailsByRevenueId(revenueId: string): Promise<SplitDetail[]> {
    const details = await prisma.splitDetail.findMany({
      where: { revenueId },
    });
    return details.map(d => ({
      ...d,
      ratio: Number(d.ratio),
      amount: Number(d.amount),
    }));
  },

  async getSplitDetailsByBusinessLine(businessLine: string, startDate: Date, endDate: Date): Promise<SplitDetail[]> {
    const details = await prisma.splitDetail.findMany({
      where: {
        businessLine,
        revenue: {
          transactionTime: {
            gte: startDate,
            lte: endDate,
          },
        },
      },
      include: {
        revenue: true,
      },
    });
    return details.map(d => ({
      ...d,
      ratio: Number(d.ratio),
      amount: Number(d.amount),
    }));
  },

  async getSplitStats(businessLine: string, startDate: Date, endDate: Date): Promise<{ targetBusinessLine: string; totalAmount: number; totalRatio: number; count: number }[]> {
    const details = await this.getSplitDetailsByBusinessLine(businessLine, startDate, endDate);
    
    const stats: { [key: string]: { totalAmount: number; totalRatio: number; count: number } } = {};
    
    for (const detail of details) {
      if (!stats[detail.businessLine]) {
        stats[detail.businessLine] = { totalAmount: 0, totalRatio: 0, count: 0 };
      }
      stats[detail.businessLine].totalAmount += detail.amount;
      stats[detail.businessLine].totalRatio += detail.ratio;
      stats[detail.businessLine].count += 1;
    }

    return Object.entries(stats).map(([targetBusinessLine, data]) => ({
      targetBusinessLine,
      totalAmount: Math.round(data.totalAmount * 10000) / 10000,
      totalRatio: data.count > 0 ? Math.round((data.totalRatio / data.count) * 1000000) / 1000000 : 0,
      count: data.count,
    }));
  },

  async createMockRules(): Promise<SplitRule[]> {
    const businessLines = ['电商零售', '企业服务', 'SaaS订阅', '广告营销', '咨询服务'];
    const rules: SplitRule[] = [];

    for (const businessLine of businessLines) {
      const ratios: { [key: string]: number } = {};
      
      if (businessLine === '电商零售') {
        ratios['平台运营'] = 0.5;
        ratios['技术支持'] = 0.3;
        ratios['市场营销'] = 0.2;
      } else if (businessLine === '企业服务') {
        ratios['销售团队'] = 0.4;
        ratios['技术支持'] = 0.4;
        ratios['客户成功'] = 0.2;
      } else if (businessLine === 'SaaS订阅') {
        ratios['产品研发'] = 0.5;
        ratios['客户成功'] = 0.3;
        ratios['市场营销'] = 0.2;
      } else if (businessLine === '广告营销') {
        ratios['销售团队'] = 0.3;
        ratios['创意团队'] = 0.4;
        ratios['运营支持'] = 0.3;
      } else {
        ratios['顾问团队'] = 0.6;
        ratios['研究支持'] = 0.25;
        ratios['运营支持'] = 0.15;
      }

      const rule = await this.createRule({
        businessLine,
        ratios,
        effectiveDate: new Date('2024-01-01'),
        createdBy: 'system',
      });

      await prisma.splitRule.update({
        where: { id: rule.id },
        data: { status: 'active' },
      });

      rules.push(await this.getRuleById(rule.id) as SplitRule);
    }

    return rules;
  },
};

export default splitEngineService;
