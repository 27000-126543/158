import type { Receipt, PaginatedResponse } from '@shared/types';
import { get, post, put, del } from './client';
import { mockReceipts, delay } from '../utils/mock';

export interface ReceiptQueryParams {
  page?: number;
  pageSize?: number;
  orderId?: string;
  status?: string;
  receivedById?: string;
  startDate?: string;
  endDate?: string;
  keyword?: string;
}

export const getReceiptList = async (params: ReceiptQueryParams): Promise<PaginatedResponse<Receipt>> => {
  try {
    return await get<PaginatedResponse<Receipt>>('/receipts', { params });
  } catch {
    const page = params.page || 1;
    const pageSize = params.pageSize || 10;
    
    let filtered = [...mockReceipts];
    
    if (params.orderId) {
      filtered = filtered.filter(r => r.orderId === params.orderId);
    }
    if (params.status) {
      filtered = filtered.filter(r => r.status === params.status);
    }
    if (params.receivedById) {
      filtered = filtered.filter(r => r.receivedById === params.receivedById);
    }
    if (params.keyword) {
      filtered = filtered.filter(r => 
        r.receiptNo.includes(params.keyword!) || 
        r.orderId.includes(params.keyword!)
      );
    }
    if (params.startDate) {
      filtered = filtered.filter(r => new Date(r.receivedAt) >= new Date(params.startDate!));
    }
    if (params.endDate) {
      filtered = filtered.filter(r => new Date(r.receivedAt) <= new Date(params.endDate!));
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

export const getReceiptDetail = async (id: string): Promise<Receipt> => {
  try {
    return await get<Receipt>(`/receipts/${id}`);
  } catch {
    const receipt = mockReceipts.find(r => r.id === id);
    if (!receipt) throw new Error('入库单不存在');
    return delay(receipt);
  }
};

export const createReceipt = async (data: Partial<Receipt>): Promise<Receipt> => {
  try {
    return await post<Receipt>('/receipts', data);
  } catch {
    const newReceipt: Receipt = {
      id: `receipt_${Date.now()}`,
      receiptNo: `RCT-${Date.now().toString().slice(-8)}`,
      orderId: data.orderId || '',
      receivedQuantity: data.receivedQuantity || 0,
      acceptedQuantity: data.acceptedQuantity || 0,
      rejectedQuantity: data.rejectedQuantity || 0,
      inspectionReport: data.inspectionReport,
      status: 'pending',
      receivedById: data.receivedById || 'user_003',
      receivedAt: new Date(),
      createdAt: new Date(),
      ...data,
    } as Receipt;
    return delay(newReceipt);
  }
};

export const updateReceipt = async (id: string, data: Partial<Receipt>): Promise<Receipt> => {
  try {
    return await put<Receipt>(`/receipts/${id}`, data);
  } catch {
    const receipt = mockReceipts.find(r => r.id === id);
    if (!receipt) throw new Error('入库单不存在');
    return delay({ ...receipt, ...data });
  }
};

export const startInspection = async (id: string): Promise<Receipt> => {
  try {
    return await post<Receipt>(`/receipts/${id}/start-inspection`);
  } catch {
    const receipt = mockReceipts.find(r => r.id === id);
    if (!receipt) throw new Error('入库单不存在');
    return delay({ ...receipt, status: 'inspecting' });
  }
};

export const acceptReceipt = async (id: string, inspectionReport?: string): Promise<Receipt> => {
  try {
    return await post<Receipt>(`/receipts/${id}/accept`, { inspectionReport });
  } catch {
    const receipt = mockReceipts.find(r => r.id === id);
    if (!receipt) throw new Error('入库单不存在');
    
    return delay({ 
      ...receipt, 
      inspectionReport,
      status: 'accepted' 
    });
  }
};

export const rejectReceipt = async (id: string, inspectionReport: string, rejectedQuantity: number): Promise<Receipt> => {
  try {
    return await post<Receipt>(`/receipts/${id}/reject`, { inspectionReport, rejectedQuantity });
  } catch {
    const receipt = mockReceipts.find(r => r.id === id);
    if (!receipt) throw new Error('入库单不存在');
    
    return delay({ 
      ...receipt, 
      inspectionReport,
      rejectedQuantity,
      status: 'rejected' 
    });
  }
};

export const deleteReceipt = async (id: string): Promise<void> => {
  try {
    await del<void>(`/receipts/${id}`);
  } catch {
    const index = mockReceipts.findIndex(r => r.id === id);
    if (index === -1) throw new Error('入库单不存在');
    mockReceipts.splice(index, 1);
    return delay(void 0);
  }
};

export const exportReceipts = async (params?: ReceiptQueryParams): Promise<Blob> => {
  try {
    return await get<Blob>('/receipts/export', { params, responseType: 'blob' });
  } catch {
    return delay(new Blob());
  }
};

export const exportReceipt = async (id: string): Promise<Blob> => {
  try {
    return await get<Blob>(`/receipts/${id}/export`, { responseType: 'blob' });
  } catch {
    return delay(new Blob());
  }
};
