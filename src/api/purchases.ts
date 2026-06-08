import type { PurchaseRequirement, PaginatedResponse } from '@shared/types';
import { get, post, put, del } from './client';
import { mockRequirements, delay } from '../utils/mock';

export interface PurchaseQueryParams {
  page?: number;
  pageSize?: number;
  category?: string;
  status?: string;
  requesterId?: string;
  startDate?: string;
  endDate?: string;
  keyword?: string;
}

export const getPurchaseList = async (params: PurchaseQueryParams): Promise<PaginatedResponse<PurchaseRequirement>> => {
  try {
    return await get<PaginatedResponse<PurchaseRequirement>>('/purchases', { params });
  } catch {
    const page = params.page || 1;
    const pageSize = params.pageSize || 10;
    
    let filtered = [...mockRequirements];
    
    if (params.category) {
      filtered = filtered.filter(r => r.category === params.category);
    }
    if (params.status) {
      filtered = filtered.filter(r => r.status === params.status);
    }
    if (params.requesterId) {
      filtered = filtered.filter(r => r.requesterId === params.requesterId);
    }
    if (params.keyword) {
      filtered = filtered.filter(r => 
        r.requirementNo.includes(params.keyword!) || 
        r.title.includes(params.keyword!) ||
        r.itemName.includes(params.keyword!)
      );
    }
    if (params.startDate) {
      filtered = filtered.filter(r => new Date(r.createdAt) >= new Date(params.startDate!));
    }
    if (params.endDate) {
      filtered = filtered.filter(r => new Date(r.createdAt) <= new Date(params.endDate!));
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

export const getPurchaseDetail = async (id: string): Promise<PurchaseRequirement> => {
  try {
    return await get<PurchaseRequirement>(`/purchases/${id}`);
  } catch {
    const record = mockRequirements.find(r => r.id === id);
    if (!record) throw new Error('采购需求不存在');
    return delay(record);
  }
};

export const createPurchase = async (data: Partial<PurchaseRequirement>): Promise<PurchaseRequirement> => {
  try {
    return await post<PurchaseRequirement>('/purchases', data);
  } catch {
    const newRecord: PurchaseRequirement = {
      id: `pur_${Date.now()}`,
      requirementNo: `REQ-${Date.now().toString().slice(-8)}`,
      title: data.title || '新采购需求',
      category: data.category || 'office_supplies',
      itemName: data.itemName || '',
      specification: data.specification || '',
      quantity: data.quantity || 1,
      unit: data.unit || 'piece',
      budget: data.budget || 0,
      expectedDate: data.expectedDate || new Date(),
      description: data.description,
      requesterId: data.requesterId || 'user_001',
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data,
    } as PurchaseRequirement;
    return delay(newRecord);
  }
};

export const updatePurchase = async (id: string, data: Partial<PurchaseRequirement>): Promise<PurchaseRequirement> => {
  try {
    return await put<PurchaseRequirement>(`/purchases/${id}`, data);
  } catch {
    const record = mockRequirements.find(r => r.id === id);
    if (!record) throw new Error('采购需求不存在');
    return delay({ ...record, ...data, updatedAt: new Date() });
  }
};

export const deletePurchase = async (id: string): Promise<void> => {
  try {
    await del<void>(`/purchases/${id}`);
  } catch {
    return delay(undefined);
  }
};

export const submitPurchase = async (id: string): Promise<PurchaseRequirement> => {
  try {
    return await post<PurchaseRequirement>(`/purchases/${id}/submit`);
  } catch {
    const record = mockRequirements.find(r => r.id === id);
    if (!record) throw new Error('采购需求不存在');
    return delay({ ...record, status: 'pending_approval', updatedAt: new Date() });
  }
};

export const submitForApproval = submitPurchase;

export const exportPurchase = async (params: PurchaseQueryParams): Promise<Blob> => {
  try {
    return await get<Blob>('/purchases/export', { params, responseType: 'blob' });
  } catch {
    return delay(new Blob());
  }
};

export const exportPurchases = exportPurchase;
