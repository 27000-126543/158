import { create } from 'zustand';
import type { PurchaseRequirement, PaginatedResponse } from '@shared/types';
import * as purchasesApi from '../api/purchases';
import type { PurchaseQueryParams } from '../api/purchases';

interface PurchasesState {
  requirements: PurchaseRequirement[];
  currentRequirement: PurchaseRequirement | null;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
  filters: PurchaseQueryParams;
  
  fetchRequirements: (params?: PurchaseQueryParams) => Promise<void>;
  fetchDetail: (id: string) => Promise<void>;
  createRequirement: (data: Partial<PurchaseRequirement>) => Promise<PurchaseRequirement>;
  updateRequirement: (id: string, data: Partial<PurchaseRequirement>) => Promise<PurchaseRequirement>;
  deleteRequirement: (id: string) => Promise<void>;
  submitForApproval: (id: string) => Promise<PurchaseRequirement>;
  exportRequirements: (params?: PurchaseQueryParams) => Promise<Blob>;
  setFilters: (filters: Partial<PurchaseQueryParams>) => void;
  resetFilters: () => void;
  setCurrentRequirement: (requirement: PurchaseRequirement | null) => void;
  clearError: () => void;
}

const defaultFilters: PurchaseQueryParams = {
  page: 1,
  pageSize: 10,
};

export const usePurchasesStore = create<PurchasesState>((set, get) => ({
  requirements: [],
  currentRequirement: null,
  total: 0,
  page: 1,
  pageSize: 10,
  totalPages: 0,
  loading: false,
  error: null,
  filters: defaultFilters,

  fetchRequirements: async (params) => {
    set({ loading: true, error: null });
    const currentFilters = { ...get().filters, ...params };
    try {
      const response: PaginatedResponse<PurchaseRequirement> = await purchasesApi.getPurchaseList(currentFilters);
      set({
        requirements: response.items,
        total: response.total,
        page: response.page,
        pageSize: response.pageSize,
        totalPages: response.totalPages,
        filters: currentFilters,
        loading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '获取采购需求失败',
        loading: false,
      });
    }
  },

  fetchDetail: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const requirement = await purchasesApi.getPurchaseDetail(id);
      set({ currentRequirement: requirement, loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '获取采购需求详情失败',
        loading: false,
      });
      throw error;
    }
  },

  createRequirement: async (data) => {
    set({ loading: true, error: null });
    try {
      const newRequirement = await purchasesApi.createPurchase(data);
      set((state) => ({
        requirements: [newRequirement, ...state.requirements],
        total: state.total + 1,
        loading: false,
      }));
      return newRequirement;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '创建采购需求失败',
        loading: false,
      });
      throw error;
    }
  },

  updateRequirement: async (id: string, data) => {
    set({ loading: true, error: null });
    try {
      const updatedRequirement = await purchasesApi.updatePurchase(id, data);
      set((state) => ({
        requirements: state.requirements.map((r) => (r.id === id ? updatedRequirement : r)),
        currentRequirement: state.currentRequirement?.id === id ? updatedRequirement : state.currentRequirement,
        loading: false,
      }));
      return updatedRequirement;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '更新采购需求失败',
        loading: false,
      });
      throw error;
    }
  },

  deleteRequirement: async (id: string) => {
    set({ loading: true, error: null });
    try {
      await purchasesApi.deletePurchase(id);
      set((state) => ({
        requirements: state.requirements.filter((r) => r.id !== id),
        total: state.total - 1,
        loading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '删除采购需求失败',
        loading: false,
      });
      throw error;
    }
  },

  submitForApproval: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const updatedRequirement = await purchasesApi.submitForApproval(id);
      set((state) => ({
        requirements: state.requirements.map((r) => (r.id === id ? updatedRequirement : r)),
        currentRequirement: state.currentRequirement?.id === id ? updatedRequirement : state.currentRequirement,
        loading: false,
      }));
      return updatedRequirement;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '提交审批失败',
        loading: false,
      });
      throw error;
    }
  },

  exportRequirements: async (params) => {
    set({ loading: true, error: null });
    try {
      const blob = await purchasesApi.exportPurchases(params || get().filters);
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

  setCurrentRequirement: (requirement) => {
    set({ currentRequirement: requirement });
  },

  clearError: () => {
    set({ error: null });
  },
}));
