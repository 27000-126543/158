import type { Settlement, PaymentInstruction, PaginatedResponse } from '@shared/types';
import { get, post, put } from './client';
import { mockSettlements, generatePaymentInstructions, delay } from '../utils/mock';

export interface SettlementQueryParams {
  page?: number;
  pageSize?: number;
  businessLine?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

export const getSettlements = async (params: SettlementQueryParams): Promise<PaginatedResponse<Settlement>> => {
  try {
    return await get<PaginatedResponse<Settlement>>('/settlements', { params });
  } catch {
    const page = params.page || 1;
    const pageSize = params.pageSize || 10;
    
    let filtered = [...mockSettlements];
    
    if (params.businessLine) {
      filtered = filtered.filter(s => s.businessLine === params.businessLine);
    }
    if (params.status) {
      filtered = filtered.filter(s => s.status === params.status);
    }
    if (params.startDate) {
      filtered = filtered.filter(s => new Date(s.settlementDate) >= new Date(params.startDate!));
    }
    if (params.endDate) {
      filtered = filtered.filter(s => new Date(s.settlementDate) <= new Date(params.endDate!));
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

export const getSettlementDetail = async (id: string): Promise<Settlement> => {
  try {
    return await get<Settlement>(`/settlements/${id}`);
  } catch {
    const settlement = mockSettlements.find(s => s.id === id);
    if (!settlement) throw new Error('结算单不存在');
    return delay(settlement);
  }
};

export const createSettlement = async (data: Partial<Settlement>): Promise<Settlement> => {
  try {
    return await post<Settlement>('/settlements', data);
  } catch {
    const newSettlement: Settlement = {
      id: `set_${Date.now()}`,
      settlementNo: `SET${Date.now()}`,
      businessLine: data.businessLine || 'ecommerce',
      settlementDate: data.settlementDate || new Date(),
      totalAmount: data.totalAmount || 0,
      budgetThreshold: data.budgetThreshold || 0,
      overBudget: (data.totalAmount || 0) > (data.budgetThreshold || 0),
      status: 'pending_approval',
      createdAt: new Date(),
      ...data,
    } as Settlement;
    return delay(newSettlement);
  }
};

export const updateSettlement = async (id: string, data: Partial<Settlement>): Promise<Settlement> => {
  try {
    return await put<Settlement>(`/settlements/${id}`, data);
  } catch {
    const settlement = mockSettlements.find(s => s.id === id);
    if (!settlement) throw new Error('结算单不存在');
    return delay({ ...settlement, ...data });
  }
};

export const getPaymentInstructions = async (settlementId: string): Promise<PaymentInstruction[]> => {
  try {
    return await get<PaymentInstruction[]>(`/settlements/${settlementId}/payment-instructions`);
  } catch {
    return delay(generatePaymentInstructions(settlementId));
  }
};

export const generateSettlements = async (params: { month: string }): Promise<Settlement[]> => {
  try {
    return await post<Settlement[]>('/settlements/generate', params);
  } catch {
    return delay(mockSettlements.slice(0, 3));
  }
};

export const submitSettlement = async (id: string): Promise<Settlement> => {
  try {
    return await post<Settlement>(`/settlements/${id}/submit`);
  } catch {
    const settlement = mockSettlements.find(s => s.id === id);
    if (!settlement) throw new Error('结算单不存在');
    return delay({ ...settlement, status: 'pending_approval' });
  }
};

export const approveSettlement = async (id: string): Promise<Settlement> => {
  try {
    return await post<Settlement>(`/settlements/${id}/approve`);
  } catch {
    const settlement = mockSettlements.find(s => s.id === id);
    if (!settlement) throw new Error('结算单不存在');
    return delay({ ...settlement, status: 'approved' });
  }
};

export const rejectSettlement = async (id: string, reason: string): Promise<Settlement> => {
  try {
    return await post<Settlement>(`/settlements/${id}/reject`, { reason });
  } catch {
    const settlement = mockSettlements.find(s => s.id === id);
    if (!settlement) throw new Error('结算单不存在');
    return delay({ ...settlement, status: 'rejected' });
  }
};

export const paySettlement = async (id: string): Promise<Settlement> => {
  try {
    return await post<Settlement>(`/settlements/${id}/pay`);
  } catch {
    const settlement = mockSettlements.find(s => s.id === id);
    if (!settlement) throw new Error('结算单不存在');
    return delay({ ...settlement, status: 'paid' });
  }
};

export const exportSettlement = async (id: string): Promise<Blob> => {
  try {
    return await get<Blob>(`/settlements/${id}/export`, { responseType: 'blob' });
  } catch {
    return delay(new Blob());
  }
};
