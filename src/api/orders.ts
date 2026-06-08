import type { PurchaseOrder, PaginatedResponse } from '@shared/types';
import { get, post, put } from './client';
import { mockOrders, delay } from '../utils/mock';

export interface OrderQueryParams {
  page?: number;
  pageSize?: number;
  supplierId?: string;
  status?: string;
  logisticsStatus?: string;
  startDate?: string;
  endDate?: string;
  keyword?: string;
}

export const getOrderList = async (params: OrderQueryParams): Promise<PaginatedResponse<PurchaseOrder>> => {
  try {
    return await get<PaginatedResponse<PurchaseOrder>>('/orders', { params });
  } catch {
    const page = params.page || 1;
    const pageSize = params.pageSize || 10;
    
    let filtered = [...mockOrders];
    
    if (params.supplierId) {
      filtered = filtered.filter(o => o.supplierId === params.supplierId);
    }
    if (params.status) {
      filtered = filtered.filter(o => o.status === params.status);
    }
    if (params.logisticsStatus) {
      filtered = filtered.filter(o => o.logisticsStatus === params.logisticsStatus);
    }
    if (params.keyword) {
      filtered = filtered.filter(o => 
        o.orderNo.includes(params.keyword!) || 
        o.itemName.includes(params.keyword!)
      );
    }
    if (params.startDate) {
      filtered = filtered.filter(o => new Date(o.createdAt) >= new Date(params.startDate!));
    }
    if (params.endDate) {
      filtered = filtered.filter(o => new Date(o.createdAt) <= new Date(params.endDate!));
    }
    
    const start = (page - 1) * pageSize;
    const items = filtered.slice(start, start + pageSize);
    
    return delay({
      items,
      total: filtered.length,
      page,
      pageSize,
      totalPages: Math.ceil(filtered.length / pageSize),
    });
  }
};

export const getOrderDetail = async (id: string): Promise<PurchaseOrder> => {
  try {
    return await get<PurchaseOrder>(`/orders/${id}`);
  } catch {
    const order = mockOrders.find(o => o.id === id);
    if (!order) throw new Error('采购订单不存在');
    return delay(order);
  }
};

export const createOrder = async (data: Partial<PurchaseOrder>): Promise<PurchaseOrder> => {
  try {
    return await post<PurchaseOrder>('/orders', data);
  } catch {
    const newOrder: PurchaseOrder = {
      id: `order_${Date.now()}`,
      orderNo: `PO-${Date.now().toString().slice(-8)}`,
      requirementId: data.requirementId || '',
      inquiryId: data.inquiryId,
      supplierId: data.supplierId || '',
      itemName: data.itemName || '',
      specification: data.specification || '',
      quantity: data.quantity || 1,
      unit: data.unit || 'piece',
      unitPrice: data.unitPrice || 0,
      totalAmount: data.totalAmount || 0,
      currency: data.currency || 'CNY',
      deliveryDate: data.deliveryDate || new Date(),
      deliveryAddress: data.deliveryAddress || '',
      paymentTerms: data.paymentTerms || '',
      status: 'draft',
      logisticsStatus: 'pending',
      trackingNumber: data.trackingNumber,
      shippingCompany: data.shippingCompany,
      createdById: data.createdById || 'user_001',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data,
    } as PurchaseOrder;
    return delay(newOrder);
  }
};

export const updateOrder = async (id: string, data: Partial<PurchaseOrder>): Promise<PurchaseOrder> => {
  try {
    return await put<PurchaseOrder>(`/orders/${id}`, data);
  } catch {
    const order = mockOrders.find(o => o.id === id);
    if (!order) throw new Error('采购订单不存在');
    return delay({ ...order, ...data, updatedAt: new Date() });
  }
};

export const confirmOrder = async (id: string): Promise<PurchaseOrder> => {
  try {
    return await post<PurchaseOrder>(`/orders/${id}/confirm`);
  } catch {
    const order = mockOrders.find(o => o.id === id);
    if (!order) throw new Error('采购订单不存在');
    return delay({ ...order, status: 'confirmed', updatedAt: new Date() });
  }
};

export const updateLogistics = async (id: string, data: { 
  logisticsStatus: string; 
  trackingNumber?: string; 
  shippingCompany?: string 
}): Promise<PurchaseOrder> => {
  try {
    return await post<PurchaseOrder>(`/orders/${id}/logistics`, data);
  } catch {
    const order = mockOrders.find(o => o.id === id);
    if (!order) throw new Error('采购订单不存在');
    return delay({ 
      ...order, 
      logisticsStatus: data.logisticsStatus as any,
      trackingNumber: data.trackingNumber,
      shippingCompany: data.shippingCompany,
      updatedAt: new Date() 
    });
  }
};

export const completeOrder = async (id: string): Promise<PurchaseOrder> => {
  try {
    return await post<PurchaseOrder>(`/orders/${id}/complete`);
  } catch {
    const order = mockOrders.find(o => o.id === id);
    if (!order) throw new Error('采购订单不存在');
    return delay({ ...order, status: 'completed', updatedAt: new Date() });
  }
};

export const cancelOrder = async (id: string, reason: string): Promise<PurchaseOrder> => {
  try {
    return await post<PurchaseOrder>(`/orders/${id}/cancel`, { reason });
  } catch {
    const order = mockOrders.find(o => o.id === id);
    if (!order) throw new Error('采购订单不存在');
    return delay({ ...order, status: 'cancelled', updatedAt: new Date() });
  }
};

export const exportOrder = async (id: string): Promise<Blob> => {
  try {
    return await get<Blob>(`/orders/${id}/export`, { responseType: 'blob' });
  } catch {
    return delay(new Blob());
  }
};
