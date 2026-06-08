import { create } from 'zustand';
import type { Payment, PaginatedResponse } from '@shared/types';
import * as paymentsApi from '../api/payments';
import type { PaymentQueryParams } from '../api/payments';

interface PaymentsState {
  payments: Payment[];
  currentPayment: Payment | null;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
  filters: PaymentQueryParams;
  
  fetchPayments: (params?: PaymentQueryParams) => Promise<void>;
  fetchDetail: (id: string) => Promise<void>;
  createPayment: (data: Partial<Payment>) => Promise<Payment>;
  updatePayment: (id: string, data: Partial<Payment>) => Promise<Payment>;
  deletePayment: (id: string) => Promise<void>;
  submitPayment: (id: string) => Promise<Payment>;
  approvePayment: (id: string) => Promise<Payment>;
  rejectPayment: (id: string, reason: string) => Promise<Payment>;
  markAsPaid: (id: string, actualPaidDate?: Date) => Promise<Payment>;
  exportPayments: (params?: PaymentQueryParams) => Promise<Blob>;
  setFilters: (filters: Partial<PaymentQueryParams>) => void;
  resetFilters: () => void;
  setCurrentPayment: (payment: Payment | null) => void;
  clearError: () => void;
}

const defaultFilters: PaymentQueryParams = {
  page: 1,
  pageSize: 10,
};

export const usePaymentsStore = create<PaymentsState>((set, get) => ({
  payments: [],
  currentPayment: null,
  total: 0,
  page: 1,
  pageSize: 10,
  totalPages: 0,
  loading: false,
  error: null,
  filters: defaultFilters,

  fetchPayments: async (params) => {
    set({ loading: true, error: null });
    const currentFilters = { ...get().filters, ...params };
    try {
      const response: PaginatedResponse<Payment> = await paymentsApi.getPaymentList(currentFilters);
      set({
        payments: response.items,
        total: response.total,
        page: response.page,
        pageSize: response.pageSize,
        totalPages: response.totalPages,
        filters: currentFilters,
        loading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '获取付款单失败',
        loading: false,
      });
    }
  },

  fetchDetail: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const payment = await paymentsApi.getPaymentDetail(id);
      set({ currentPayment: payment, loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '获取付款单详情失败',
        loading: false,
      });
      throw error;
    }
  },

  createPayment: async (data) => {
    set({ loading: true, error: null });
    try {
      const newPayment = await paymentsApi.createPayment(data);
      set((state) => ({
        payments: [newPayment, ...state.payments],
        total: state.total + 1,
        loading: false,
      }));
      return newPayment;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '创建付款单失败',
        loading: false,
      });
      throw error;
    }
  },

  updatePayment: async (id: string, data) => {
    set({ loading: true, error: null });
    try {
      const updatedPayment = await paymentsApi.updatePayment(id, data);
      set((state) => ({
        payments: state.payments.map((p) => (p.id === id ? updatedPayment : p)),
        currentPayment: state.currentPayment?.id === id ? updatedPayment : state.currentPayment,
        loading: false,
      }));
      return updatedPayment;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '更新付款单失败',
        loading: false,
      });
      throw error;
    }
  },

  deletePayment: async (id: string) => {
    set({ loading: true, error: null });
    try {
      await paymentsApi.deletePayment(id);
      set((state) => ({
        payments: state.payments.filter((p) => p.id !== id),
        total: state.total - 1,
        loading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '删除付款单失败',
        loading: false,
      });
      throw error;
    }
  },

  submitPayment: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const updatedPayment = await paymentsApi.submitPayment(id);
      set((state) => ({
        payments: state.payments.map((p) => (p.id === id ? updatedPayment : p)),
        currentPayment: state.currentPayment?.id === id ? updatedPayment : state.currentPayment,
        loading: false,
      }));
      return updatedPayment;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '提交付款单失败',
        loading: false,
      });
      throw error;
    }
  },

  approvePayment: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const updatedPayment = await paymentsApi.approvePayment(id);
      set((state) => ({
        payments: state.payments.map((p) => (p.id === id ? updatedPayment : p)),
        currentPayment: state.currentPayment?.id === id ? updatedPayment : state.currentPayment,
        loading: false,
      }));
      return updatedPayment;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '审批付款单失败',
        loading: false,
      });
      throw error;
    }
  },

  rejectPayment: async (id: string, reason: string) => {
    set({ loading: true, error: null });
    try {
      const updatedPayment = await paymentsApi.rejectPayment(id, reason);
      set((state) => ({
        payments: state.payments.map((p) => (p.id === id ? updatedPayment : p)),
        currentPayment: state.currentPayment?.id === id ? updatedPayment : state.currentPayment,
        loading: false,
      }));
      return updatedPayment;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '驳回付款单失败',
        loading: false,
      });
      throw error;
    }
  },

  markAsPaid: async (id: string, actualPaidDate?: Date) => {
    set({ loading: true, error: null });
    try {
      const updatedPayment = await paymentsApi.markAsPaid(id, actualPaidDate);
      set((state) => ({
        payments: state.payments.map((p) => (p.id === id ? updatedPayment : p)),
        currentPayment: state.currentPayment?.id === id ? updatedPayment : state.currentPayment,
        loading: false,
      }));
      return updatedPayment;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '标记付款失败',
        loading: false,
      });
      throw error;
    }
  },

  exportPayments: async (params) => {
    set({ loading: true, error: null });
    try {
      const blob = await paymentsApi.exportPayments(params || get().filters);
      set({ loading: false });
      return blob;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '导出失败',
        loading: false,
      });
      throw error;
    }
  },

  setFilters: (filters) => {
    set((state) => ({
      filters: { ...state.filters, ...filters, page: 1 },
    }));
  },

  resetFilters: () => {
    set({ filters: defaultFilters });
  },

  setCurrentPayment: (payment) => {
    set({ currentPayment: payment });
  },

  clearError: () => {
    set({ error: null });
  },
}));
