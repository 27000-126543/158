import { create } from 'zustand';
import type { Supplier, PaginatedResponse } from '@shared/types';
import * as suppliersApi from '../api/suppliers';
import type { SupplierQueryParams } from '../api/suppliers';

interface SuppliersState {
  suppliers: Supplier[];
  currentSupplier: Supplier | null;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
  filters: SupplierQueryParams;
  
  fetchSuppliers: (params?: SupplierQueryParams) => Promise<void>;
  fetchDetail: (id: string) => Promise<void>;
  createSupplier: (data: Partial<Supplier>) => Promise<Supplier>;
  updateSupplier: (id: string, data: Partial<Supplier>) => Promise<Supplier>;
  deleteSupplier: (id: string) => Promise<void>;
  approveSupplier: (id: string) => Promise<Supplier>;
  blacklistSupplier: (id: string, reason: string) => Promise<Supplier>;
  exportSuppliers: (params?: SupplierQueryParams) => Promise<Blob>;
  setFilters: (filters: Partial<SupplierQueryParams>) => void;
  resetFilters: () => void;
  setCurrentSupplier: (supplier: Supplier | null) => void;
  clearError: () => void;
}

const defaultFilters: SupplierQueryParams = {
  page: 1,
  pageSize: 10,
};

export const useSuppliersStore = create<SuppliersState>((set, get) => ({
  suppliers: [],
  currentSupplier: null,
  total: 0,
  page: 1,
  pageSize: 10,
  totalPages: 0,
  loading: false,
  error: null,
  filters: defaultFilters,

  fetchSuppliers: async (params) => {
    set({ loading: true, error: null });
    const currentFilters = { ...get().filters, ...params };
    try {
      const response: PaginatedResponse<Supplier> = await suppliersApi.getSupplierList(currentFilters);
      set({
        suppliers: response.items,
        total: response.total,
        page: response.page,
        pageSize: response.pageSize,
        totalPages: response.totalPages,
        filters: currentFilters,
        loading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '获取供应商列表失败',
        loading: false,
      });
    }
  },

  fetchDetail: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const supplier = await suppliersApi.getSupplierDetail(id);
      set({ currentSupplier: supplier, loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '获取供应商详情失败',
        loading: false,
      });
      throw error;
    }
  },

  createSupplier: async (data) => {
    set({ loading: true, error: null });
    try {
      const newSupplier = await suppliersApi.createSupplier(data);
      set((state) => ({
        suppliers: [newSupplier, ...state.suppliers],
        total: state.total + 1,
        loading: false,
      }));
      return newSupplier;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '创建供应商失败',
        loading: false,
      });
      throw error;
    }
  },

  updateSupplier: async (id: string, data) => {
    set({ loading: true, error: null });
    try {
      const updatedSupplier = await suppliersApi.updateSupplier(id, data);
      set((state) => ({
        suppliers: state.suppliers.map((s) => (s.id === id ? updatedSupplier : s)),
        currentSupplier: state.currentSupplier?.id === id ? updatedSupplier : state.currentSupplier,
        loading: false,
      }));
      return updatedSupplier;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '更新供应商失败',
        loading: false,
      });
      throw error;
    }
  },

  deleteSupplier: async (id: string) => {
    set({ loading: true, error: null });
    try {
      await suppliersApi.deleteSupplier(id);
      set((state) => ({
        suppliers: state.suppliers.filter((s) => s.id !== id),
        total: state.total - 1,
        loading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '删除供应商失败',
        loading: false,
      });
      throw error;
    }
  },

  approveSupplier: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const updatedSupplier = await suppliersApi.approveSupplier(id);
      set((state) => ({
        suppliers: state.suppliers.map((s) => (s.id === id ? updatedSupplier : s)),
        currentSupplier: state.currentSupplier?.id === id ? updatedSupplier : state.currentSupplier,
        loading: false,
      }));
      return updatedSupplier;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '审核供应商失败',
        loading: false,
      });
      throw error;
    }
  },

  blacklistSupplier: async (id: string, reason: string) => {
    set({ loading: true, error: null });
    try {
      const updatedSupplier = await suppliersApi.blacklistSupplier(id, reason);
      set((state) => ({
        suppliers: state.suppliers.map((s) => (s.id === id ? updatedSupplier : s)),
        currentSupplier: state.currentSupplier?.id === id ? updatedSupplier : state.currentSupplier,
        loading: false,
      }));
      return updatedSupplier;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '加入黑名单失败',
        loading: false,
      });
      throw error;
    }
  },

  exportSuppliers: async (params) => {
    set({ loading: true, error: null });
    try {
      const blob = await suppliersApi.exportSuppliers(params || get().filters);
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

  setCurrentSupplier: (supplier) => {
    set({ currentSupplier: supplier });
  },

  clearError: () => {
    set({ error: null });
  },
}));
