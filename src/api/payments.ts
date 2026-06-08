import type { Payment, PaginatedResponse } from '@shared/types';
import { get, post, put, del } from './client';
import { mockPayments, delay } from '../utils/mock';

export interface PaymentQueryParams {
  page?: number;
  pageSize?: number;
  orderId?: string;
  status?: string;
  paymentType?: string;
  startDate?: string;
  endDate?: string;
  keyword?: string;
}

export const getPaymentList = async (params: PaymentQueryParams): Promise<PaginatedResponse<Payment>> => {
  try {
    return await get<PaginatedResponse<Payment>>('/payments', { params });
  } catch {
    const page = params.page || 1;
    const pageSize = params.pageSize || 10;
    
    let filtered = [...mockPayments];
    
    if (params.orderId) {
      filtered = filtered.filter(p => p.orderId === params.orderId);
    }
    if (params.status) {
      filtered = filtered.filter(p => p.status === params.status);
    }
    if (params.paymentType) {
      filtered = filtered.filter(p => p.paymentType === params.paymentType);
    }
    if (params.keyword) {
      filtered = filtered.filter(p => 
        p.paymentNo.includes(params.keyword!) || 
        p.orderId.includes(params.keyword!)
      );
    }
    if (params.startDate) {
      filtered = filtered.filter(p => new Date(p.createdAt) >= new Date(params.startDate!));
    }
    if (params.endDate) {
      filtered = filtered.filter(p => new Date(p.createdAt) <= new Date(params.endDate!));
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

export const getPaymentDetail = async (id: string): Promise<Payment> => {
  try {
    return await get<Payment>(`/payments/${id}`);
  } catch {
    const payment = mockPayments.find(p => p.id === id);
    if (!payment) throw new Error('付款单不存在');
    return delay(payment);
  }
};

export const createPayment = async (data: Partial<Payment>): Promise<Payment> => {
  try {
    return await post<Payment>('/payments', data);
  } catch {
    const amount = data.amount || 0;
    let approvalLevel = 0;
    if (amount > 500000) approvalLevel = 2;
    else if (amount > 50000) approvalLevel = 1;

    const newPayment: Payment = {
      id: `pay_${Date.now()}`,
      paymentNo: `PAY-${Date.now().toString().slice(-8)}`,
      orderId: data.orderId || '',
      amount: data.amount || 0,
      currency: data.currency || 'CNY',
      paymentType: data.paymentType || 'final',
      dueDate: data.dueDate || new Date(),
      actualPaidDate: data.actualPaidDate,
      status: 'pending',
      approvalLevel,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data,
    } as Payment;
    return delay(newPayment);
  }
};

export const updatePayment = async (id: string, data: Partial<Payment>): Promise<Payment> => {
  try {
    return await put<Payment>(`/payments/${id}`, data);
  } catch {
    const payment = mockPayments.find(p => p.id === id);
    if (!payment) throw new Error('付款单不存在');
    return delay({ ...payment, ...data, updatedAt: new Date() });
  }
};

export const submitPayment = async (id: string): Promise<Payment> => {
  try {
    return await post<Payment>(`/payments/${id}/submit`);
  } catch {
    const payment = mockPayments.find(p => p.id === id);
    if (!payment) throw new Error('付款单不存在');
    return delay({ ...payment, status: 'pending', updatedAt: new Date() });
  }
};

export const markAsPaid = async (id: string, actualPaidDate?: Date): Promise<Payment> => {
  try {
    return await post<Payment>(`/payments/${id}/paid`, { actualPaidDate });
  } catch {
    const payment = mockPayments.find(p => p.id === id);
    if (!payment) throw new Error('付款单不存在');
    return delay({ 
      ...payment, 
      status: 'paid', 
      actualPaidDate: actualPaidDate || new Date(),
      updatedAt: new Date() 
    });
  }
};

export const approvePayment = async (id: string): Promise<Payment> => {
  try {
    return await post<Payment>(`/payments/${id}/approve`);
  } catch {
    const payment = mockPayments.find(p => p.id === id);
    if (!payment) throw new Error('付款单不存在');
    return delay({ ...payment, status: 'approved', updatedAt: new Date() });
  }
};

export const rejectPayment = async (id: string, reason: string): Promise<Payment> => {
  try {
    return await post<Payment>(`/payments/${id}/reject`, { reason });
  } catch {
    const payment = mockPayments.find(p => p.id === id);
    if (!payment) throw new Error('付款单不存在');
    return delay({ ...payment, status: 'rejected', updatedAt: new Date() });
  }
};

export const deletePayment = async (id: string): Promise<void> => {
  try {
    await del<void>(`/payments/${id}`);
  } catch {
    const index = mockPayments.findIndex(p => p.id === id);
    if (index === -1) throw new Error('付款单不存在');
    mockPayments.splice(index, 1);
    return delay(void 0);
  }
};

export const exportPayments = async (params?: PaymentQueryParams): Promise<Blob> => {
  try {
    return await get<Blob>('/payments/export', { params, responseType: 'blob' });
  } catch {
    return delay(new Blob());
  }
};

export const exportPayment = async (id: string): Promise<Blob> => {
  try {
    return await get<Blob>(`/payments/${id}/export`, { responseType: 'blob' });
  } catch {
    return delay(new Blob());
  }
};
