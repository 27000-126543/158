import type { Supplier, PaginatedResponse } from '@shared/types';
import { get, post, put, del } from './client';
import { mockSuppliers, delay } from '../utils/mock';

export interface SupplierQueryParams {
  page?: number;
  pageSize?: number;
  category?: string;
  status?: string;
  performanceLevel?: string;
  keyword?: string;
}

export const getSupplierList = async (params: SupplierQueryParams): Promise<PaginatedResponse<Supplier>> => {
  try {
    return await get<PaginatedResponse<Supplier>>('/suppliers', { params });
  } catch {
    const page = params.page || 1;
    const pageSize = params.pageSize || 10;
    
    let filtered = [...mockSuppliers];
    
    if (params.category) {
      filtered = filtered.filter(s => s.category === params.category);
    }
    if (params.status) {
      filtered = filtered.filter(s => s.status === params.status);
    }
    if (params.performanceLevel) {
      filtered = filtered.filter(s => s.performanceLevel === params.performanceLevel);
    }
    if (params.keyword) {
      filtered = filtered.filter(s => 
        s.supplierNo.includes(params.keyword!) || 
        s.name.includes(params.keyword!) ||
        s.shortName.includes(params.keyword!) ||
        s.contactName.includes(params.keyword!)
      );
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

export const getSupplierDetail = async (id: string): Promise<Supplier> => {
  try {
    return await get<Supplier>(`/suppliers/${id}`);
  } catch {
    const supplier = mockSuppliers.find(s => s.id === id);
    if (!supplier) throw new Error('供应商不存在');
    return delay(supplier);
  }
};

export const createSupplier = async (data: Partial<Supplier>): Promise<Supplier> => {
  try {
    return await post<Supplier>('/suppliers', data);
  } catch {
    const newSupplier: Supplier = {
      id: `supp_${Date.now()}`,
      supplierNo: `SUP-${Date.now().toString().slice(-8)}`,
      name: data.name || '',
      shortName: data.shortName || '',
      category: data.category || 'office_supplies',
      contactName: data.contactName || '',
      contactPhone: data.contactPhone || '',
      contactEmail: data.contactEmail || '',
      address: data.address || '',
      businessLicense: data.businessLicense,
      taxNumber: data.taxNumber,
      bankName: data.bankName,
      bankAccount: data.bankAccount,
      status: 'pending',
      creditRating: data.creditRating || 0,
      performanceScore: data.performanceScore || 0,
      performanceLevel: 'average',
      totalOrders: 0,
      totalAmount: 0,
      onTimeDeliveryRate: 0,
      qualityPassRate: 0,
      satisfactionScore: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data,
    } as Supplier;
    return delay(newSupplier);
  }
};

export const updateSupplier = async (id: string, data: Partial<Supplier>): Promise<Supplier> => {
  try {
    return await put<Supplier>(`/suppliers/${id}`, data);
  } catch {
    const supplier = mockSuppliers.find(s => s.id === id);
    if (!supplier) throw new Error('供应商不存在');
    return delay({ ...supplier, ...data, updatedAt: new Date() });
  }
};

export const deleteSupplier = async (id: string): Promise<void> => {
  try {
    await del<void>(`/suppliers/${id}`);
  } catch {
    return delay(undefined);
  }
};

export const exportSupplier = async (params: SupplierQueryParams): Promise<Blob> => {
  try {
    return await get<Blob>('/suppliers/export', { params, responseType: 'blob' });
  } catch {
    return delay(new Blob());
  }
};
