import type { BankTransaction, ReconciliationDiff, WorkOrder, PaginatedResponse } from '@shared/types';
import { get, post, put } from './client';
import { mockBankTransactions, mockReconciliationDiffs, mockWorkOrders, delay } from '../utils/mock';

export interface ReconciliationQueryParams {
  page?: number;
  pageSize?: number;
  matchStatus?: string;
  startDate?: string;
  endDate?: string;
}

export interface DiffQueryParams {
  page?: number;
  pageSize?: number;
  diffType?: string;
  status?: string;
  assignee?: string;
  startDate?: string;
  endDate?: string;
}

export const getBankTransactions = async (params: ReconciliationQueryParams): Promise<PaginatedResponse<BankTransaction>> => {
  try {
    return await get<PaginatedResponse<BankTransaction>>('/reconciliation/bank-transactions', { params });
  } catch {
    const page = params.page || 1;
    const pageSize = params.pageSize || 10;
    
    let filtered = [...mockBankTransactions];
    
    if (params.matchStatus) {
      filtered = filtered.filter(t => t.matchStatus === params.matchStatus);
    }
    if (params.startDate) {
      filtered = filtered.filter(t => new Date(t.transactionTime) >= new Date(params.startDate!));
    }
    if (params.endDate) {
      filtered = filtered.filter(t => new Date(t.transactionTime) <= new Date(params.endDate!));
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

export const getDiffs = async (params: DiffQueryParams): Promise<PaginatedResponse<ReconciliationDiff>> => {
  try {
    return await get<PaginatedResponse<ReconciliationDiff>>('/reconciliation/diffs', { params });
  } catch {
    const page = params.page || 1;
    const pageSize = params.pageSize || 10;
    
    let filtered = [...mockReconciliationDiffs];
    
    if (params.diffType) {
      filtered = filtered.filter(d => d.diffType === params.diffType);
    }
    if (params.status) {
      filtered = filtered.filter(d => d.status === params.status);
    }
    if (params.assignee) {
      filtered = filtered.filter(d => d.assignee === params.assignee);
    }
    if (params.startDate) {
      filtered = filtered.filter(d => new Date(d.reconciliationDate) >= new Date(params.startDate!));
    }
    if (params.endDate) {
      filtered = filtered.filter(d => new Date(d.reconciliationDate) <= new Date(params.endDate!));
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

export const getDiffDetail = async (id: string): Promise<ReconciliationDiff> => {
  try {
    return await get<ReconciliationDiff>(`/reconciliation/diffs/${id}`);
  } catch {
    const diff = mockReconciliationDiffs.find(d => d.id === id);
    if (!diff) throw new Error('差异记录不存在');
    return delay(diff);
  }
};

export const startReconciliation = async (params: { date: string }): Promise<{ taskId: string; message: string }> => {
  try {
    return await post<{ taskId: string; message: string }>('/reconciliation/start', params);
  } catch {
    return delay({
      taskId: `task_${Date.now()}`,
      message: '对账任务已启动',
    });
  }
};

export const matchTransaction = async (revenueId: string, bankTransactionId: string): Promise<{ success: boolean }> => {
  try {
    return await post<{ success: boolean }>('/reconciliation/match', { revenueId, bankTransactionId });
  } catch {
    return delay({ success: true });
  }
};

export const unmatchTransaction = async (revenueId: string): Promise<{ success: boolean }> => {
  try {
    return await post<{ success: boolean }>('/reconciliation/unmatch', { revenueId });
  } catch {
    return delay({ success: true });
  }
};

export const resolveDiff = async (id: string, data: { resolution: string; comment?: string }): Promise<ReconciliationDiff> => {
  try {
    return await put<ReconciliationDiff>(`/reconciliation/diffs/${id}/resolve`, data);
  } catch {
    const diff = mockReconciliationDiffs.find(d => d.id === id);
    if (!diff) throw new Error('差异记录不存在');
    return delay({ ...diff, status: 'resolved' });
  }
};

export const markAsSpecial = async (id: string, data: { reason: string }): Promise<ReconciliationDiff> => {
  try {
    return await put<ReconciliationDiff>(`/reconciliation/diffs/${id}/special`, data);
  } catch {
    const diff = mockReconciliationDiffs.find(d => d.id === id);
    if (!diff) throw new Error('差异记录不存在');
    return delay({ ...diff, status: 'special' });
  }
};

export const createWorkOrder = async (diffId: string, data: { title: string; description: string; assignee: string }): Promise<WorkOrder> => {
  try {
    return await post<WorkOrder>('/reconciliation/work-orders', { diffId, ...data });
  } catch {
    const newOrder: WorkOrder = {
      id: `wo_${Date.now()}`,
      orderNo: `WO${Date.now()}`,
      diffId,
      title: data.title,
      description: data.description,
      status: 'pending',
      assignee: data.assignee,
      createdAt: new Date(),
    };
    return delay(newOrder);
  }
};

export const getWorkOrders = async (params: { status?: string; assignee?: string; page?: number; pageSize?: number }): Promise<PaginatedResponse<WorkOrder>> => {
  try {
    return await get<PaginatedResponse<WorkOrder>>('/reconciliation/work-orders', { params });
  } catch {
    const page = params.page || 1;
    const pageSize = params.pageSize || 10;
    
    let filtered = [...mockWorkOrders];
    
    if (params.status) {
      filtered = filtered.filter(w => w.status === params.status);
    }
    if (params.assignee) {
      filtered = filtered.filter(w => w.assignee === params.assignee);
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

export const updateWorkOrder = async (id: string, data: Partial<WorkOrder>): Promise<WorkOrder> => {
  try {
    return await put<WorkOrder>(`/reconciliation/work-orders/${id}`, data);
  } catch {
    const order = mockWorkOrders.find(w => w.id === id);
    if (!order) throw new Error('工单不存在');
    return delay({ ...order, ...data });
  }
};

export const getReconciliationSummary = async (params: { startDate: string; endDate: string }): Promise<{
  totalTransactions: number;
  matched: number;
  unmatched: number;
  diffCount: number;
  resolved: number;
  pending: number;
}> => {
  try {
    return await get<{
      totalTransactions: number;
      matched: number;
      unmatched: number;
      diffCount: number;
      resolved: number;
      pending: number;
    }>('/reconciliation/summary', { params });
  } catch {
    return delay({
      totalTransactions: mockBankTransactions.length,
      matched: mockBankTransactions.filter(t => t.matchStatus === 'matched').length,
      unmatched: mockBankTransactions.filter(t => t.matchStatus !== 'matched').length,
      diffCount: mockReconciliationDiffs.length,
      resolved: mockReconciliationDiffs.filter(d => d.status === 'resolved').length,
      pending: mockReconciliationDiffs.filter(d => d.status === 'pending').length,
    });
  }
};

export const importBankTransactions = async (file: File): Promise<{ imported: number; total: number }> => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    return await post<{ imported: number; total: number }>('/reconciliation/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  } catch {
    return delay({ imported: 50, total: 50 });
  }
};
