import type { RevenueRecord, PaginatedResponse } from '@shared/types';
import { get, post, put, del } from './client';
import { mockRevenueRecords, delay } from '../utils/mock';

export interface RevenueQueryParams {
  page?: number;
  pageSize?: number;
  businessLine?: string;
  channel?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  keyword?: string;
}

export const getRevenueList = async (params: RevenueQueryParams): Promise<PaginatedResponse<RevenueRecord>> => {
  try {
    return await get<PaginatedResponse<RevenueRecord>>('/revenue', { params });
  } catch {
    const page = params.page || 1;
    const pageSize = params.pageSize || 10;
    
    let filtered = [...mockRevenueRecords];
    
    if (params.businessLine) {
      filtered = filtered.filter(r => r.businessLine === params.businessLine);
    }
    if (params.channel) {
      filtered = filtered.filter(r => r.channel === params.channel);
    }
    if (params.status) {
      filtered = filtered.filter(r => r.reconciliationStatus === params.status);
    }
    if (params.keyword) {
      filtered = filtered.filter(r => 
        r.transactionNo.includes(params.keyword!) || 
        r.customer.includes(params.keyword!)
      );
    }
    if (params.startDate) {
      filtered = filtered.filter(r => new Date(r.transactionTime) >= new Date(params.startDate!));
    }
    if (params.endDate) {
      filtered = filtered.filter(r => new Date(r.transactionTime) <= new Date(params.endDate!));
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

export const getRevenueDetail = async (id: string): Promise<RevenueRecord> => {
  try {
    return await get<RevenueRecord>(`/revenue/${id}`);
  } catch {
    const record = mockRevenueRecords.find(r => r.id === id);
    if (!record) throw new Error('记录不存在');
    return delay(record);
  }
};

export const createRevenue = async (data: Partial<RevenueRecord>): Promise<RevenueRecord> => {
  try {
    return await post<RevenueRecord>('/revenue', data);
  } catch {
    const newRecord: RevenueRecord = {
      id: `rev_${Date.now()}`,
      transactionNo: `TXN${Date.now()}`,
      businessLine: data.businessLine || 'ecommerce',
      channel: data.channel || 'alipay',
      customer: data.customer || '新客户',
      amount: data.amount || 0,
      currency: 'CNY',
      transactionTime: new Date(),
      reconciliationStatus: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data,
    } as RevenueRecord;
    return delay(newRecord);
  }
};

export const updateRevenue = async (id: string, data: Partial<RevenueRecord>): Promise<RevenueRecord> => {
  try {
    return await put<RevenueRecord>(`/revenue/${id}`, data);
  } catch {
    const record = mockRevenueRecords.find(r => r.id === id);
    if (!record) throw new Error('记录不存在');
    return delay({ ...record, ...data, updatedAt: new Date() });
  }
};

export const deleteRevenue = async (id: string): Promise<void> => {
  try {
    await del<void>(`/revenue/${id}`);
  } catch {
    return delay(undefined);
  }
};

export const exportRevenue = async (params: RevenueQueryParams): Promise<Blob> => {
  try {
    return await get<Blob>('/revenue/export', { params, responseType: 'blob' });
  } catch {
    return delay(new Blob());
  }
};
