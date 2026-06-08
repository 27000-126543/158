import prisma from '../utils/prisma.js';
import {
  transformInquiry,
  transformQuote,
  transformComparisonReport,
  decimalToNumber,
} from '../utils/transform.js';
import {
  successResponse,
  errorResponse,
  createdResponse,
  paginatedResponse,
} from '../utils/response.js';
import type {
  Inquiry,
  Quote,
  ComparisonReport,
  QuoteComparison,
  PaginatedResponse,
  InquiryStatus,
  ApiResponse,
} from '@shared/types';

interface InquiryQueryParams {
  page?: number;
  pageSize?: number;
  status?: InquiryStatus;
  category?: string;
  deadlineStart?: Date;
  deadlineEnd?: Date;
  createdById?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface InquiryCreateData {
  requirementId: string;
  supplierIds: string[];
  deadline: Date;
  createdById: string;
  description?: string;
}

interface InquiryUpdateData {
  title?: string;
  category?: string;
  itemName?: string;
  specification?: string;
  quantity?: number;
  unit?: string;
  description?: string;
  deadline?: Date;
  supplierIds?: string[];
  status?: InquiryStatus;
}

interface QuoteSubmitData {
  inquiryId: string;
  supplierId: string;
  unitPrice: number;
  totalPrice: number;
  currency?: string;
  deliveryDate: Date;
  deliveryAddress: string;
  paymentTerms: string;
  warranty?: string;
  remarks?: string;
}

interface QuoteQueryParams {
  inquiryId?: string;
  supplierId?: string;
  status?: string;
}

const generateInquiryNo = async (): Promise<string> => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const datePart = `${year}${month}${day}`;
  const prefix = `INQ-${datePart}-`;

  const lastInquiry = await prisma.inquiry.findFirst({
    where: {
      inquiryNo: {
        startsWith: prefix,
      },
    },
    orderBy: {
      inquiryNo: 'desc',
    },
  });

  let sequence = 1;
  if (lastInquiry) {
    const parts = lastInquiry.inquiryNo.split('-');
    const lastSequence = parseInt(parts[2] || '0', 10);
    sequence = lastSequence + 1;
  }

  return `${prefix}${String(sequence).padStart(4, '0')}`;
};

const generateQuoteNo = async (): Promise<string> => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const datePart = `${year}${month}${day}`;
  const prefix = `QTE-${datePart}-`;

  const lastQuote = await prisma.quote.findFirst({
    where: {
      quoteNo: {
        startsWith: prefix,
      },
    },
    orderBy: {
      quoteNo: 'desc',
    },
  });

  let sequence = 1;
  if (lastQuote) {
    const parts = lastQuote.quoteNo.split('-');
    const lastSequence = parseInt(parts[2] || '0', 10);
    sequence = lastSequence + 1;
  }

  return `${prefix}${String(sequence).padStart(4, '0')}`;
};

const generateComparisonReportNo = async (): Promise<string> => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const datePart = `${year}${month}${day}`;
  const prefix = `CMP-${datePart}-`;

  const lastReport = await prisma.comparisonReport.findFirst({
    where: {
      reportNo: {
        startsWith: prefix,
      },
    },
    orderBy: {
      reportNo: 'desc',
    },
  });

  let sequence = 1;
  if (lastReport) {
    const parts = lastReport.reportNo.split('-');
    const lastSequence = parseInt(parts[2] || '0', 10);
    sequence = lastSequence + 1;
  }

  return `${prefix}${String(sequence).padStart(4, '0')}`;
};

const calculatePriceScore = (totalPrice: number, minPrice: number, maxPrice: number): number => {
  if (maxPrice === minPrice) return 100;
  return Math.round(100 - ((totalPrice - minPrice) / (maxPrice - minPrice)) * 100);
};

const calculateDeliveryScore = (deliveryDate: Date, earliestDate: Date, latestDate: Date): number => {
  const earliest = earliestDate.getTime();
  const latest = latestDate.getTime();
  const current = deliveryDate.getTime();
  if (latest === earliest) return 100;
  return Math.round(100 - ((current - earliest) / (latest - earliest)) * 100);
};

const calculateQualityScore = (qualityPassRate: number): number => {
  return Math.round(qualityPassRate * 100);
};

const inquiryService = {
  async getInquiries(
    params: InquiryQueryParams
  ): Promise<ApiResponse<PaginatedResponse<Inquiry>>> {
    try {
      const {
        page = 1,
        pageSize = 20,
        status,
        category,
        deadlineStart,
        deadlineEnd,
        createdById,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = params;

      const where: any = {};

      if (status) where.status = status;
      if (category) where.categoryId = category;
      if (createdById) where.createdById = createdById;
      if (deadlineStart || deadlineEnd) {
        where.deadline = {};
        if (deadlineStart) where.deadline.gte = deadlineStart;
        if (deadlineEnd) where.deadline.lte = deadlineEnd;
      }

      const [total, records] = await Promise.all([
        prisma.inquiry.count({ where }),
        prisma.inquiry.findMany({
          where,
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: { [sortBy]: sortOrder },
          include: {
            category: true,
            suppliers: true,
            _count: {
              select: { quotes: true },
            },
          },
        }),
      ]);

      const items: Inquiry[] = records.map(transformInquiry);

      return paginatedResponse(items, total, page, pageSize);
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : '获取询价单列表失败');
    }
  },

  async getInquiryById(id: string): Promise<ApiResponse<Inquiry | null>> {
    try {
      const record = await prisma.inquiry.findUnique({
        where: { id },
        include: {
          category: true,
          suppliers: true,
          quotes: {
            include: {
              supplier: true,
            },
          },
          requirement: true,
        },
      });

      if (!record) {
        return errorResponse('询价单不存在', 404);
      }

      const inquiry = transformInquiry(record);
      return successResponse(inquiry);
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : '获取询价单详情失败');
    }
  },

  async createInquiry(
    data: InquiryCreateData
  ): Promise<ApiResponse<Inquiry>> {
    try {
      const requirement = await prisma.purchaseRequirement.findUnique({
        where: { id: data.requirementId },
        include: {
          category: true,
        },
      });

      if (!requirement) {
        return errorResponse('采购需求不存在', 404);
      }

      if (requirement.status === 'inquiry_sent' || requirement.status === 'quoting') {
        return errorResponse('该采购需求已创建询价单');
      }

      const existingInquiry = await prisma.inquiry.findUnique({
        where: { requirementId: data.requirementId },
      });

      if (existingInquiry) {
        return errorResponse('该采购需求已存在询价单');
      }

      const suppliers = await prisma.supplier.findMany({
        where: {
          id: { in: data.supplierIds },
          status: 'active',
        },
      });

      if (suppliers.length === 0) {
        return errorResponse('未找到有效的供应商');
      }

      const inquiryNo = await generateInquiryNo();

      const inquiry = await prisma.$transaction(async (tx) => {
        const newInquiry = await tx.inquiry.create({
          data: {
            inquiryNo,
            requirementId: data.requirementId,
            title: requirement.title,
            categoryId: requirement.categoryId,
            itemName: requirement.itemName,
            specification: requirement.specification,
            quantity: requirement.quantity,
            unit: requirement.unit,
            description: data.description || requirement.description,
            deadline: data.deadline,
            status: 'draft',
            createdById: data.createdById,
            suppliers: {
              connect: data.supplierIds.map(id => ({ id })),
            },
          },
          include: {
            category: true,
            suppliers: true,
          },
        });

        await tx.purchaseRequirement.update({
          where: { id: data.requirementId },
          data: { status: 'inquiry_sent' },
        });

        return newInquiry;
      });

      const result = transformInquiry(inquiry);
      return createdResponse(result, '询价单创建成功');
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : '创建询价单失败');
    }
  },

  async updateInquiry(
    id: string,
    data: InquiryUpdateData
  ): Promise<ApiResponse<Inquiry>> {
    try {
      const existing = await prisma.inquiry.findUnique({
        where: { id },
      });

      if (!existing) {
        return errorResponse('询价单不存在', 404);
      }

      if (existing.status !== 'draft') {
        return errorResponse('只能编辑草稿状态的询价单');
      }

      const updateData: any = {};
      if (data.title !== undefined) updateData.title = data.title;
      if (data.category !== undefined) updateData.categoryId = data.category;
      if (data.itemName !== undefined) updateData.itemName = data.itemName;
      if (data.specification !== undefined) updateData.specification = data.specification;
      if (data.quantity !== undefined) updateData.quantity = data.quantity;
      if (data.unit !== undefined) updateData.unit = data.unit;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.deadline !== undefined) updateData.deadline = data.deadline;
      if (data.status !== undefined) updateData.status = data.status;

      const inquiry = await prisma.$transaction(async (tx) => {
        if (data.supplierIds) {
          await tx.inquiry.update({
            where: { id },
            data: {
              suppliers: {
                set: [],
              },
            },
          });

          updateData.suppliers = {
            connect: data.supplierIds.map(sid => ({ id: sid })),
          };
        }

        const updatedInquiry = await tx.inquiry.update({
          where: { id },
          data: updateData,
          include: {
            category: true,
            suppliers: true,
          },
        });

        return updatedInquiry;
      });

      const result = transformInquiry(inquiry);
      return successResponse(result, '询价单更新成功');
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : '更新询价单失败');
    }
  },

  async sendInquiry(id: string): Promise<ApiResponse<Inquiry>> {
    try {
      const existing = await prisma.inquiry.findUnique({
        where: { id },
        include: {
          suppliers: true,
        },
      });

      if (!existing) {
        return errorResponse('询价单不存在', 404);
      }

      if (existing.status !== 'draft') {
        return errorResponse('只能发送草稿状态的询价单');
      }

      if (existing.suppliers.length === 0) {
        return errorResponse('请先选择供应商');
      }

      const inquiry = await prisma.$transaction(async (tx) => {
        const updatedInquiry = await tx.inquiry.update({
          where: { id },
          data: {
            status: 'sent',
          },
          include: {
            category: true,
            suppliers: true,
          },
        });

        await tx.purchaseRequirement.update({
          where: { id: existing.requirementId },
          data: { status: 'quoting' },
        });

        return updatedInquiry;
      });

      const result = transformInquiry(inquiry);
      return successResponse(result, '询价单已发送给供应商');
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : '发送询价单失败');
    }
  },

  async submitQuote(
    data: QuoteSubmitData
  ): Promise<ApiResponse<Quote>> {
    try {
      const inquiry = await prisma.inquiry.findUnique({
        where: { id: data.inquiryId },
        include: {
          suppliers: true,
        },
      });

      if (!inquiry) {
        return errorResponse('询价单不存在', 404);
      }

      if (inquiry.status !== 'sent' && inquiry.status !== 'quoting') {
        return errorResponse('该询价单不允许提交报价');
      }

      const isSupplierInvited = inquiry.suppliers.some(s => s.id === data.supplierId);
      if (!isSupplierInvited) {
        return errorResponse('您未被邀请参与此询价');
      }

      const existingQuote = await prisma.quote.findFirst({
        where: {
          inquiryId: data.inquiryId,
          supplierId: data.supplierId,
        },
      });

      if (existingQuote && existingQuote.status === 'submitted') {
        return errorResponse('您已提交过报价，如需修改请联系采购方');
      }

      const quoteNo = await generateQuoteNo();

      const quote = await prisma.$transaction(async (tx) => {
        let newQuote;
        if (existingQuote) {
          newQuote = await tx.quote.update({
            where: { id: existingQuote.id },
            data: {
              unitPrice: data.unitPrice,
              totalPrice: data.totalPrice,
              currency: data.currency || 'CNY',
              deliveryDate: data.deliveryDate,
              deliveryAddress: data.deliveryAddress,
              paymentTerms: data.paymentTerms,
              warranty: data.warranty,
              remarks: data.remarks,
              status: 'submitted',
            },
            include: {
              supplier: true,
              inquiry: true,
            },
          });
        } else {
          newQuote = await tx.quote.create({
            data: {
              quoteNo,
              inquiryId: data.inquiryId,
              supplierId: data.supplierId,
              unitPrice: data.unitPrice,
              totalPrice: data.totalPrice,
              currency: data.currency || 'CNY',
              deliveryDate: data.deliveryDate,
              deliveryAddress: data.deliveryAddress,
              paymentTerms: data.paymentTerms,
              warranty: data.warranty,
              remarks: data.remarks,
              status: 'submitted',
            },
            include: {
              supplier: true,
              inquiry: true,
            },
          });
        }

        const quotesCount = await tx.quote.count({
          where: {
            inquiryId: data.inquiryId,
            status: 'submitted',
          },
        });

        if (quotesCount >= 1) {
          await tx.inquiry.update({
            where: { id: data.inquiryId },
            data: { status: 'quoting' },
          });

          await tx.purchaseRequirement.update({
            where: { id: inquiry.requirementId },
            data: { status: 'quoting' },
          });
        }

        return newQuote;
      });

      const result = transformQuote(quote);
      return createdResponse(result, '报价提交成功');
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : '提交报价失败');
    }
  },

  async getQuotes(
    params: QuoteQueryParams
  ): Promise<ApiResponse<Quote[]>> {
    try {
      const { inquiryId, supplierId, status } = params;

      const where: any = {};

      if (inquiryId) where.inquiryId = inquiryId;
      if (supplierId) where.supplierId = supplierId;
      if (status) where.status = status;

      const records = await prisma.quote.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          supplier: true,
          inquiry: true,
        },
      });

      const quotes: Quote[] = records.map(transformQuote);
      return successResponse(quotes);
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : '获取报价列表失败');
    }
  },

  async generateComparisonReport(
    inquiryId: string,
    createdById: string
  ): Promise<ApiResponse<ComparisonReport>> {
    try {
      const inquiry = await prisma.inquiry.findUnique({
        where: { id: inquiryId },
        include: {
          quotes: {
            where: { status: 'submitted' },
            include: {
              supplier: true,
            },
          },
          requirement: true,
        },
      });

      if (!inquiry) {
        return errorResponse('询价单不存在', 404);
      }

      if (inquiry.quotes.length < 2) {
        return errorResponse('至少需要2份已提交的报价才能生成比价报告');
      }

      const prices = inquiry.quotes.map(q => decimalToNumber(q.totalPrice));
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);

      const deliveryDates = inquiry.quotes.map(q => new Date(q.deliveryDate));
      const earliestDate = new Date(Math.min(...deliveryDates.map(d => d.getTime())));
      const latestDate = new Date(Math.max(...deliveryDates.map(d => d.getTime())));

      const quoteComparisons: QuoteComparison[] = await Promise.all(
        inquiry.quotes.map(async (quote) => {
          const supplier = await prisma.supplier.findUnique({
            where: { id: quote.supplierId },
          });

          const totalPrice = decimalToNumber(quote.totalPrice);
          const priceScore = calculatePriceScore(totalPrice, minPrice, maxPrice);
          const deliveryScore = calculateDeliveryScore(
            new Date(quote.deliveryDate),
            earliestDate,
            latestDate
          );
          const qualityScore = calculateQualityScore(
            supplier ? decimalToNumber(supplier.qualityPassRate) : 0.8
          );
          const totalScore = Math.round(priceScore * 0.4 + deliveryScore * 0.3 + qualityScore * 0.3);

          return {
            supplierId: quote.supplierId,
            supplierName: quote.supplier?.name || '',
            unitPrice: decimalToNumber(quote.unitPrice),
            totalPrice,
            deliveryDate: new Date(quote.deliveryDate),
            priceScore,
            deliveryScore,
            qualityScore,
            totalScore,
            rank: 0,
          };
        })
      );

      quoteComparisons.sort((a, b) => b.totalScore - a.totalScore);
      quoteComparisons.forEach((qc, index) => {
        qc.rank = index + 1;
      });

      const recommended = quoteComparisons[0];

      const quotesJson = quoteComparisons.map(qc => ({
        ...qc,
        deliveryDate: qc.deliveryDate.toISOString(),
      }));

      const reportNo = await generateComparisonReportNo();

      const report = await prisma.$transaction(async (tx) => {
        const existingReport = await tx.comparisonReport.findUnique({
          where: { inquiryId },
        });

        let newReport;
        if (existingReport) {
          newReport = await tx.comparisonReport.update({
            where: { id: existingReport.id },
            data: {
              quotes: quotesJson as any,
              recommendedSupplierId: recommended.supplierId,
              recommendationReason: `综合得分最高（${recommended.totalScore}分），价格、交付、质量综合表现最优`,
            },
          });
        } else {
          newReport = await tx.comparisonReport.create({
            data: {
              reportNo,
              inquiryId,
              requirementId: inquiry.requirementId,
              quotes: quotesJson as any,
              recommendedSupplierId: recommended.supplierId,
              recommendationReason: `综合得分最高（${recommended.totalScore}分），价格、交付、质量综合表现最优`,
              createdById,
            },
          });
        }

        await tx.inquiry.update({
          where: { id: inquiryId },
          data: { status: 'quoted' },
        });

        await tx.purchaseRequirement.update({
          where: { id: inquiry.requirementId },
          data: { status: 'quoted' },
        });

        return newReport;
      });

      const result = transformComparisonReport(report);
      return successResponse(result, '比价报告生成成功');
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : '生成比价报告失败');
    }
  },
};

export default inquiryService;
