import { create } from 'zustand';
import type { Receipt, PaginatedResponse } from '@shared/types';
import * as receiptsApi from '../api/receipts';
import type { ReceiptQueryParams } from '../api/receipts';

interface ReceiptsState {
  receipts: Receipt[];
  currentReceipt: Receipt | null;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
  filters: ReceiptQueryParams;
  
  fetchReceipts: (params?: ReceiptQueryParams) => Promise<void>;
  fetchDetail: (id: string) => Promise<void>;
  createReceipt: (data: Partial<Receipt>) => Promise<Receipt>;
  updateReceipt: (id: string, data: Partial<Receipt>) => Promise<Receipt>;
  deleteReceipt: (id: string) => Promise<void>;
  startInspection: (id: string) => Promise<Receipt>;
  acceptReceipt: (id: string, inspectionReport?: string) => Promise<Receipt>;
  rejectReceipt: (id: string, inspectionReport: string, rejectedQuantity: number) => Promise<Receipt>;
  exportReceipts: (params?: ReceiptQueryParams) => Promise<Blob>;
  setFilters: (filters: Partial<ReceiptQueryParams>) => void;
  resetFilters: () => void;
  setCurrentReceipt: (receipt: Receipt | null) => void;
  clearError: () => void;
}

const defaultFilters: ReceiptQueryParams = {
  page: 1,
  pageSize: 10,
};

export const useReceiptsStore = create<ReceiptsState>((set, get) => ({
  receipts: [],
  currentReceipt: null,
  total: 0,
  page: 1,
  pageSize: 10,
  totalPages: 0,
  loading: false,
  error: null,
  filters: defaultFilters,

  fetchReceipts: async (params) => {
    set({ loading: true, error: null });
    const currentFilters = { ...get().filters, ...params };
    try {
      const response: PaginatedResponse<Receipt> = await receiptsApi.getReceiptList(currentFilters);
      set({
        receipts: response.items,
        total: response.total,
        page: response.page,
        pageSize: response.pageSize,
        totalPages: response.totalPages,
        filters: currentFilters,
        loading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '获取入库单失败',
        loading: false,
      });
    }
  },

  fetchDetail: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const receipt = await receiptsApi.getReceiptDetail(id);
      set({ currentReceipt: receipt, loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '获取入库单详情失败',
        loading: false,
      });
      throw error;
    }
  },

  createReceipt: async (data) => {
    set({ loading: true, error: null });
    try {
      const newReceipt = await receiptsApi.createReceipt(data);
      set((state) => ({
        receipts: [newReceipt, ...state.receipts],
        total: state.total + 1,
        loading: false,
      }));
      return newReceipt;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '创建入库单失败',
        loading: false,
      });
      throw error;
    }
  },

  updateReceipt: async (id: string, data) => {
    set({ loading: true, error: null });
    try {
      const updatedReceipt = await receiptsApi.updateReceipt(id, data);
      set((state) => ({
        receipts: state.receipts.map((r) => (r.id === id ? updatedReceipt : r)),
        currentReceipt: state.currentReceipt?.id === id ? updatedReceipt : state.currentReceipt,
        loading: false,
      }));
      return updatedReceipt;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '更新入库单失败',
        loading: false,
      });
      throw error;
    }
  },

  deleteReceipt: async (id: string) => {
    set({ loading: true, error: null });
    try {
      await receiptsApi.deleteReceipt(id);
      set((state) => ({
        receipts: state.receipts.filter((r) => r.id !== id),
        total: state.total - 1,
        loading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '删除入库单失败',
        loading: false,
      });
      throw error;
    }
  },

  startInspection: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const updatedReceipt = await receiptsApi.startInspection(id);
      set((state) => ({
        receipts: state.receipts.map((r) => (r.id === id ? updatedReceipt : r)),
        currentReceipt: state.currentReceipt?.id === id ? updatedReceipt : state.currentReceipt,
        loading: false,
      }));
      return updatedReceipt;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '开始验收失败',
        loading: false,
      });
      throw error;
    }
  },

  acceptReceipt: async (id: string, inspectionReport?: string) => {
    set({ loading: true, error: null });
    try {
      const updatedReceipt = await receiptsApi.acceptReceipt(id, inspectionReport);
      set((state) => ({
        receipts: state.receipts.map((r) => (r.id === id ? updatedReceipt : r)),
        currentReceipt: state.currentReceipt?.id === id ? updatedReceipt : state.currentReceipt,
        loading: false,
      }));
      return updatedReceipt;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '验收通过失败',
        loading: false,
      });
      throw error;
    }
  },

  rejectReceipt: async (id: string, inspectionReport: string, rejectedQuantity: number) => {
    set({ loading: true, error: null });
    try {
      const updatedReceipt = await receiptsApi.rejectReceipt(id, inspectionReport, rejectedQuantity);
      set((state) => ({
        receipts: state.receipts.map((r) => (r.id === id ? updatedReceipt : r)),
        currentReceipt: state.currentReceipt?.id === id ? updatedReceipt : state.currentReceipt,
        loading: false,
      }));
      return updatedReceipt;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '验收驳回失败',
        loading: false,
      });
      throw error;
    }
  },

  exportReceipts: async (params) => {
    set({ loading: true, error: null });
    try {
      const blob = await receiptsApi.exportReceipts(params || get().filters);
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

  setCurrentReceipt: (receipt) => {
    set({ currentReceipt: receipt });
  },

  clearError: () => {
    set({ error: null });
  },
}));
