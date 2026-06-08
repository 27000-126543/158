import prisma from '../utils/prisma.js';
import { transformPurchaseRequirement, transformSupplier, transformInquiry } from '../utils/transform.js';
import { successResponse, errorResponse, createdResponse, paginatedResponse } from '../utils/response.js';
import type {
  PurchaseRequirement,
  Supplier,
  Inquiry,
  PaginatedResponse,
  PurchaseRequirementStatus,
  ApiResponse,
} from '@shared/types';

interface PurchaseRequirementQueryParams {
  category?: string;
  status?: PurchaseRequirementStatus;
  requesterId?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface PurchaseRequirementCreateData {
  title: string;
  category: string;
  itemName: string;
  specification: string;
  quantity: number;
  unit: string;
  budget: number;
  expectedDate: Date;
  description?: string;
  requesterId: string;
}

interface PurchaseRequirementUpdateData {
  title?: string;
  category?: string;
  itemName?: string;
  specification?: string;
  quantity?: number;
  unit?: string;
  budget?: number;
  expectedDate?: Date;
  description?: string;
  status?: PurchaseRequirementStatus;
}

interface GenerateInquiryData {
  supplierIds: string[];
  deadline: Date;
  createdById: string;
}

const generateRequirementNo = async (): Promise<string> => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const datePart = `${year}${month}${day}`;
  const prefix = `REQ-${datePart}-`;

  const lastRequirement = await prisma.purchaseRequirement.findFirst({
    where: {
      requirementNo: {
        startsWith: prefix,
      },
    },
    orderBy: {
      requirementNo: 'desc',
    },
  });

  let sequence = 1;
  if (lastRequirement) {
    const parts = lastRequirement.requirementNo.split('-');
    const lastSequence = parseInt(parts[2] || '0', 10);
    sequence = lastSequence + 1;
  }

  return `${prefix}${String(sequence).padStart(4, '0')}`;
};

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

const purchaseService = {
  async getPurchaseRequirements(
    params: PurchaseRequirementQueryParams
  ): Promise<ApiResponse<PaginatedResponse<PurchaseRequirement>>> {
    try {
      const {
        category,
        status,
        requesterId,
        startDate,
        endDate,
        page = 1,
        pageSize = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = params;

      const where: any = {};

      if (category) where.categoryId = category;
      if (status) where.status = status;
      if (requesterId) where.requesterId = requesterId;
      if (startDate) where.createdAt = { ...where.createdAt, gte: startDate };
      if (endDate) where.createdAt = { ...where.createdAt, lte: endDate };

      const [total, records] = await Promise.all([
        prisma.purchaseRequirement.count({ where }),
        prisma.purchaseRequirement.findMany({
          where,
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: { [sortBy]: sortOrder },
          include: {
            category: true,
            requester: true,
          },
        }),
      ]);

      const items: PurchaseRequirement[] = records.map(transformPurchaseRequirement);

      return paginatedResponse(items, total, page, pageSize);
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : '获取采购需求列表失败');
    }
  },

  async getPurchaseRequirementById(id: string): Promise<ApiResponse<PurchaseRequirement | null>> {
    try {
      const record = await prisma.purchaseRequirement.findUnique({
        where: { id },
        include: {
          category: true,
          requester: true,
          inquiry: true,
          order: true,
        },
      });

      if (!record) {
        return errorResponse('采购需求不存在', 404);
      }

      const requirement = transformPurchaseRequirement(record);
      return successResponse(requirement);
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : '获取采购需求详情失败');
    }
  },

  async createPurchaseRequirement(
    data: PurchaseRequirementCreateData
  ): Promise<ApiResponse<PurchaseRequirement>> {
    try {
      const requirementNo = await generateRequirementNo();

      const record = await prisma.purchaseRequirement.create({
        data: {
          requirementNo,
          title: data.title,
          categoryId: data.category,
          itemName: data.itemName,
          specification: data.specification,
          quantity: data.quantity,
          unit: data.unit,
          budget: data.budget,
          expectedDate: data.expectedDate,
          description: data.description,
          requesterId: data.requesterId,
          status: 'draft',
        },
        include: {
          category: true,
          requester: true,
        },
      });

      const requirement = transformPurchaseRequirement(record);
      return createdResponse(requirement, '采购需求创建成功');
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : '创建采购需求失败');
    }
  },

  async updatePurchaseRequirement(
    id: string,
    data: PurchaseRequirementUpdateData
  ): Promise<ApiResponse<PurchaseRequirement>> {
    try {
      const existing = await prisma.purchaseRequirement.findUnique({
        where: { id },
      });

      if (!existing) {
        return errorResponse('采购需求不存在', 404);
      }

      const updateData: any = {};
      if (data.title !== undefined) updateData.title = data.title;
      if (data.category !== undefined) updateData.categoryId = data.category;
      if (data.itemName !== undefined) updateData.itemName = data.itemName;
      if (data.specification !== undefined) updateData.specification = data.specification;
      if (data.quantity !== undefined) updateData.quantity = data.quantity;
      if (data.unit !== undefined) updateData.unit = data.unit;
      if (data.budget !== undefined) updateData.budget = data.budget;
      if (data.expectedDate !== undefined) updateData.expectedDate = data.expectedDate;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.status !== undefined) updateData.status = data.status;

      const record = await prisma.purchaseRequirement.update({
        where: { id },
        data: updateData,
        include: {
          category: true,
          requester: true,
        },
      });

      const requirement = transformPurchaseRequirement(record);
      return successResponse(requirement, '采购需求更新成功');
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : '更新采购需求失败');
    }
  },

  async deletePurchaseRequirement(id: string): Promise<ApiResponse<PurchaseRequirement>> {
    try {
      const existing = await prisma.purchaseRequirement.findUnique({
        where: { id },
      });

      if (!existing) {
        return errorResponse('采购需求不存在', 404);
      }

      const record = await prisma.purchaseRequirement.delete({
        where: { id },
        include: {
          category: true,
          requester: true,
        },
      });

      const requirement = transformPurchaseRequirement(record);
      return successResponse(requirement, '采购需求删除成功');
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : '删除采购需求失败');
    }
  },

  async initiateSmartRecommend(
    category: string,
    itemName?: string
  ): Promise<ApiResponse<Supplier[]>> {
    try {
      const where: any = {
        categoryId: category,
        status: 'active',
      };

      const suppliers = await prisma.supplier.findMany({
        where,
        orderBy: {
          performanceScore: 'desc',
        },
        take: 5,
        include: {
          category: true,
        },
      });

      if (suppliers.length < 3) {
        const additionalSuppliers = await prisma.supplier.findMany({
          where: {
            status: 'active',
            categoryId: { not: category },
          },
          orderBy: {
            performanceScore: 'desc',
          },
          take: 5 - suppliers.length,
          include: {
            category: true,
          },
        });
        suppliers.push(...additionalSuppliers);
      }

      const result = suppliers.map(transformSupplier);
      return successResponse(result, '智能推荐供应商成功');
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : '智能推荐供应商失败');
    }
  },

  async generateInquiry(
    requirementId: string,
    data: GenerateInquiryData
  ): Promise<ApiResponse<Inquiry>> {
    try {
      const requirement = await prisma.purchaseRequirement.findUnique({
        where: { id: requirementId },
        include: {
          category: true,
        },
      });

      if (!requirement) {
        return errorResponse('采购需求不存在', 404);
      }

      if (requirement.status === 'inquiry_sent') {
        return errorResponse('该采购需求已发送询价单');
      }

      const inquiryNo = await generateInquiryNo();

      const suppliers = await prisma.supplier.findMany({
        where: {
          id: { in: data.supplierIds },
        },
      });

      if (suppliers.length === 0) {
        return errorResponse('未找到有效的供应商');
      }

      const inquiry = await prisma.$transaction(async (tx) => {
        const newInquiry = await tx.inquiry.create({
          data: {
            inquiryNo,
            requirementId,
            title: requirement.title,
            categoryId: requirement.categoryId,
            itemName: requirement.itemName,
            specification: requirement.specification,
            quantity: requirement.quantity,
            unit: requirement.unit,
            description: requirement.description,
            deadline: data.deadline,
            status: 'sent',
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
          where: { id: requirementId },
          data: { status: 'inquiry_sent' },
        });

        return newInquiry;
      });

      const result = transformInquiry(inquiry);
      return createdResponse(result, '询价单生成成功');
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : '生成询价单失败');
    }
  },
};

export default purchaseService;
