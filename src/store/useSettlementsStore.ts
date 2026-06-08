import { create } from 'zustand';
import type { Settlement, PaymentInstruction, PaginatedResponse } from '@shared/types';
import * as settlementsApi from '../api/settlements';
import type { SettlementQueryParams } from '../api/settlements';

interface SettlementsState {
  settlements: Settlement[];
  currentSettlement: Settlement | null;
  paymentInstructions: PaymentInstruction[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
  filters: SettlementQueryParams;
  
  fetchSettlements: (params?: SettlementQueryParams) => Promise<void>;
  fetchDetail: (id: string) => Promise<void>;
  fetchPaymentInstructions: (settlementId: string) => Promise<void>;
  createSettlement: (data: Partial<Settlement>) => Promise<Settlement>;
  updateSettlement: (id: string, data: Partial<Settlement>) => Promise<Settlement>;
  generateSettlements: (month: string) => Promise<Settlement[]>;
  submitSettlement: (id: string) => Promise<Settlement>;
  approveSettlement: (id: string) => Promise<Settlement>;
  rejectSettlement: (id: string, reason: string) => Promise<Settlement>;
  paySettlement: (id: string) => Promise<Settlement>;
  exportSettlement: (id: string) => Promise<Blob>;
  setFilters: (filters: Partial<SettlementQueryParams>) => void;
  resetFilters: () => void;
  setCurrentSettlement: (settlement: Settlement | null) => void;
  clearError: () => void;
}

const defaultFilters: SettlementQueryParams = {
  page: 1,
  pageSize: 10,
};

export const useSettlementsStore = create<SettlementsState>((set, get) => ({
  settlements: [],
  currentSettlement: null,
  paymentInstructions: [],
  total: 0,
  page: 1,
  pageSize: 10,
  totalPages: 0,
  loading: false,
  error: null,
  filters: defaultFilters,

  fetchSettlements: async (params) => {
    set({ loading: true, error: null });
    const currentFilters = { ...get().filters, ...params };
    try {
      const response: PaginatedResponse<Settlement> = await settlementsApi.getSettlements(currentFilters);
      set({
        settlements: response.items,
        total: response.total,
        page: response.page,
        pageSize: response.pageSize,
        totalPages: response.totalPages,
        filters: currentFilters,
        loading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '获取结算单失败',
        loading: false,
      });
    }
  },

  fetchDetail: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const settlement = await settlementsApi.getSettlementDetail(id);
      set({ currentSettlement: settlement, loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '获取结算单详情失败',
        loading: false,
      });
      throw error;
    }
  },

  fetchPaymentInstructions: async (settlementId: string) => {
    set({ loading: true, error: null });
    try {
      const instructions = await settlementsApi.getPaymentInstructions(settlementId);
      set({ paymentInstructions: instructions, loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '获取支付指令失败',
        loading: false,
      });
    }
  },

  createSettlement: async (data) => {
    set({ loading: true, error: null });
    try {
      const newSettlement = await settlementsApi.createSettlement(data);
      set((state) => ({
        settlements: [newSettlement, ...state.settlements],
        total: state.total + 1,
        loading: false,
      }));
      return newSettlement;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '创建结算单失败',
        loading: false,
      });
      throw error;
    }
  },

  updateSettlement: async (id: string, data) => {
    set({ loading: true, error: null });
    try {
      const updatedSettlement = await settlementsApi.updateSettlement(id, data);
      set((state) => ({
        settlements: state.settlements.map((s) => (s.id === id ? updatedSettlement : s)),
        currentSettlement: state.currentSettlement?.id === id ? updatedSettlement : state.currentSettlement,
        loading: false,
      }));
      return updatedSettlement;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '更新结算单失败',
        loading: false,
      });
      throw error;
    }
  },

  generateSettlements: async (month: string) => {
    set({ loading: true, error: null });
    try {
      const newSettlements = await settlementsApi.generateSettlements({ month });
      set((state) => ({
        settlements: [...newSettlements, ...state.settlements],
        total: state.total + newSettlements.length,
        loading: false,
      }));
      return newSettlements;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '生成结算单失败',
        loading: false,
      });
      throw error;
    }
  },

  submitSettlement: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const updatedSettlement = await settlementsApi.submitSettlement(id);
      set((state) => ({
        settlements: state.settlements.map((s) => (s.id === id ? updatedSettlement : s)),
        currentSettlement: state.currentSettlement?.id === id ? updatedSettlement : state.currentSettlement,
        loading: false,
      }));
      return updatedSettlement;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '提交结算单失败',
        loading: false,
      });
      throw error;
    }
  },

  approveSettlement: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const updatedSettlement = await settlementsApi.approveSettlement(id);
      set((state) => ({
        settlements: state.settlements.map((s) => (s.id === id ? updatedSettlement : s)),
        currentSettlement: state.currentSettlement?.id === id ? updatedSettlement : state.currentSettlement,
        loading: false,
      }));
      return updatedSettlement;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '审批结算单失败',
        loading: false,
      });
      throw error;
    }
  },

  rejectSettlement: async (id: string, reason: string) => {
    set({ loading: true, error: null });
    try {
      const updatedSettlement = await settlementsApi.rejectSettlement(id, reason);
      set((state) => ({
        settlements: state.settlements.map((s) => (s.id === id ? updatedSettlement : s)),
        currentSettlement: state.currentSettlement?.id === id ? updatedSettlement : state.currentSettlement,
        loading: false,
      }));
      return updatedSettlement;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '驳回结算单失败',
        loading: false,
      });
      throw error;
    }
  },

  paySettlement: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const updatedSettlement = await settlementsApi.paySettlement(id);
      set((state) => ({
        settlements: state.settlements.map((s) => (s.id === id ? updatedSettlement : s)),
        currentSettlement: state.currentSettlement?.id === id ? updatedSettlement : state.currentSettlement,
        loading: false,
      }));
      return updatedSettlement;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '支付结算单失败',
        loading: false,
      });
      throw error;
    }
  },

  exportSettlement: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const blob = await settlementsApi.exportSettlement(id);
      set({ loading: false });
      return blob;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '导出结算单失败',
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

  setCurrentSettlement: (settlement) => {
    set({ currentSettlement: settlement });
  },

  clearError: () => {
    set({ error: null });
  },
}));
