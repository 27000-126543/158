import prisma from '../utils/prisma.js';
import { transformSupplier, decimalToNumber } from '../utils/transform.js';
import { successResponse, errorResponse, createdResponse, paginatedResponse } from '../utils/response.js';
import type {
  Supplier,
  PaginatedResponse,
  SupplierStatus,
  PerformanceLevel,
  ApiResponse,
} from '@shared/types';

interface SupplierQueryParams {
  category?: string;
  status?: SupplierStatus;
  keyword?: string;
  performanceLevel?: PerformanceLevel;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface SupplierCreateData {
  name: string;
  shortName: string;
  category: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  address: string;
  businessLicense?: string;
  taxNumber?: string;
  bankName?: string;
  bankAccount?: string;
}

interface SupplierUpdateData {
  name?: string;
  shortName?: string;
  category?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  address?: string;
  businessLicense?: string;
  taxNumber?: string;
  bankName?: string;
  bankAccount?: string;
  status?: SupplierStatus;
}

interface SupplierPerformanceData {
  supplierId: string;
  supplierName: string;
  totalOrders: number;
  totalAmount: number;
  onTimeDeliveryRate: number;
  qualityPassRate: number;
  satisfactionScore: number;
  comprehensiveScore: number;
}

const generateSupplierNo = async (): Promise<string> => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const datePart = `${year}${month}${day}`;
  const prefix = `SUP-${datePart}-`;

  const lastSupplier = await prisma.supplier.findFirst({
    where: {
      supplierNo: {
        startsWith: prefix,
      },
    },
    orderBy: {
      supplierNo: 'desc',
    },
  });

  let sequence = 1;
  if (lastSupplier) {
    const parts = lastSupplier.supplierNo.split('-');
    const lastSequence = parseInt(parts[2] || '0', 10);
    sequence = lastSequence + 1;
  }

  return `${prefix}${String(sequence).padStart(4, '0')}`;
};

const supplierService = {
  async getSuppliers(
    params: SupplierQueryParams
  ): Promise<ApiResponse<PaginatedResponse<Supplier>>> {
    try {
      const {
        category,
        status,
        keyword,
        performanceLevel,
        page = 1,
        pageSize = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = params;

      const where: any = {};

      if (category) where.categoryId = category;
      if (status) where.status = status;
      if (performanceLevel) where.performanceLevel = performanceLevel;
      if (keyword) {
        where.OR = [
          { name: { contains: keyword } },
          { shortName: { contains: keyword } },
          { contactName: { contains: keyword } },
          { contactPhone: { contains: keyword } },
          { supplierNo: { contains: keyword } },
        ];
      }

      const [total, records] = await Promise.all([
        prisma.supplier.count({ where }),
        prisma.supplier.findMany({
          where,
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: { [sortBy]: sortOrder },
          include: {
            category: true,
          },
        }),
      ]);

      const items: Supplier[] = records.map(transformSupplier);

      return paginatedResponse(items, total, page, pageSize);
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : '获取供应商列表失败');
    }
  },

  async getSupplierById(id: string): Promise<ApiResponse<Supplier | null>> {
    try {
      const record = await prisma.supplier.findUnique({
        where: { id },
        include: {
          category: true,
          orders: {
            take: 5,
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!record) {
        return errorResponse('供应商不存在', 404);
      }

      const supplier = transformSupplier(record);
      return successResponse(supplier);
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : '获取供应商详情失败');
    }
  },

  async createSupplier(
    data: SupplierCreateData
  ): Promise<ApiResponse<Supplier>> {
    try {
      const supplierNo = await generateSupplierNo();

      const record = await prisma.supplier.create({
        data: {
          supplierNo,
          name: data.name,
          shortName: data.shortName,
          categoryId: data.category,
          contactName: data.contactName,
          contactPhone: data.contactPhone,
          contactEmail: data.contactEmail,
          address: data.address,
          businessLicense: data.businessLicense,
          taxNumber: data.taxNumber,
          bankName: data.bankName,
          bankAccount: data.bankAccount,
        },
        include: {
          category: true,
        },
      });

      const supplier = transformSupplier(record);
      return createdResponse(supplier, '供应商创建成功');
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : '创建供应商失败');
    }
  },

  async updateSupplier(
    id: string,
    data: SupplierUpdateData
  ): Promise<ApiResponse<Supplier>> {
    try {
      const existing = await prisma.supplier.findUnique({
        where: { id },
      });

      if (!existing) {
        return errorResponse('供应商不存在', 404);
      }

      const updateData: any = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.shortName !== undefined) updateData.shortName = data.shortName;
      if (data.category !== undefined) updateData.categoryId = data.category;
      if (data.contactName !== undefined) updateData.contactName = data.contactName;
      if (data.contactPhone !== undefined) updateData.contactPhone = data.contactPhone;
      if (data.contactEmail !== undefined) updateData.contactEmail = data.contactEmail;
      if (data.address !== undefined) updateData.address = data.address;
      if (data.businessLicense !== undefined) updateData.businessLicense = data.businessLicense;
      if (data.taxNumber !== undefined) updateData.taxNumber = data.taxNumber;
      if (data.bankName !== undefined) updateData.bankName = data.bankName;
      if (data.bankAccount !== undefined) updateData.bankAccount = data.bankAccount;
      if (data.status !== undefined) updateData.status = data.status;

      const record = await prisma.supplier.update({
        where: { id },
        data: updateData,
        include: {
          category: true,
        },
      });

      const supplier = transformSupplier(record);
      return successResponse(supplier, '供应商更新成功');
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : '更新供应商失败');
    }
  },

  async getSupplierPerformance(supplierId: string): Promise<ApiResponse<SupplierPerformanceData>> {
    try {
      const supplier = await prisma.supplier.findUnique({
        where: { id: supplierId },
        include: {
          orders: {
            include: {
              receipt: true,
            },
          },
        },
      });

      if (!supplier) {
        return errorResponse('供应商不存在', 404);
      }

      const completedOrders = supplier.orders.filter(
        (order) => order.status === 'completed' || order.status === 'delivered'
      );

      const totalOrders = completedOrders.length;
      const totalAmount = completedOrders.reduce(
        (sum, order) => sum + decimalToNumber(order.totalAmount),
        0
      );

      let onTimeDeliveryRate = 0;
      if (completedOrders.length > 0) {
        const onTimeOrders = completedOrders.filter((order) => {
          if (!order.receipt) return true;
          return order.receipt.receivedAt <= order.deliveryDate;
        });
        onTimeDeliveryRate = onTimeOrders.length / completedOrders.length;
      }

      let qualityPassRate = 0;
      const ordersWithReceipt = completedOrders.filter((order) => order.receipt);
      if (ordersWithReceipt.length > 0) {
        const totalAccepted = ordersWithReceipt.reduce(
          (sum, order) => sum + (order.receipt?.acceptedQuantity || 0),
          0
        );
        const totalReceived = ordersWithReceipt.reduce(
          (sum, order) => sum + (order.receipt?.receivedQuantity || 0),
          0
        );
        qualityPassRate = totalReceived > 0 ? totalAccepted / totalReceived : 0;
      }

      const satisfactionScore = decimalToNumber(supplier.satisfactionScore);
      const performanceScore = decimalToNumber(supplier.performanceScore);

      const comprehensiveScore =
        performanceScore * 0.4 +
        onTimeDeliveryRate * 100 * 0.25 +
        qualityPassRate * 100 * 0.25 +
        satisfactionScore * 0.1;

      const performance: SupplierPerformanceData = {
        supplierId: supplier.id,
        supplierName: supplier.name,
        totalOrders,
        totalAmount,
        onTimeDeliveryRate: Math.round(onTimeDeliveryRate * 10000) / 10000,
        qualityPassRate: Math.round(qualityPassRate * 10000) / 10000,
        satisfactionScore,
        comprehensiveScore: Math.round(comprehensiveScore * 100) / 100,
      };

      return successResponse(performance, '获取供应商绩效成功');
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : '获取供应商绩效失败');
    }
  },

  async getRecommendedSuppliers(
    category: string,
    itemName?: string
  ): Promise<ApiResponse<Supplier[]>> {
    try {
      const where: any = {
        categoryId: category,
        status: 'active',
      };

      if (itemName) {
        where.OR = [
          { name: { contains: itemName } },
          { shortName: { contains: itemName } },
        ];
      }

      let suppliers = await prisma.supplier.findMany({
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
        const additionalWhere: any = {
          status: 'active',
          categoryId: { not: category },
        };
        if (itemName) {
          additionalWhere.OR = [
            { name: { contains: itemName } },
            { shortName: { contains: itemName } },
          ];
        }

        const additionalSuppliers = await prisma.supplier.findMany({
          where: additionalWhere,
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
      return successResponse(result, '获取推荐供应商成功');
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : '获取推荐供应商失败');
    }
  },
};

export default supplierService;
