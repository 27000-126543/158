import { create } from 'zustand';
import type { RevenueRecord, PaginatedResponse } from '@shared/types';
import * as revenueApi from '../api/revenue';
import type { RevenueQueryParams } from '../api/revenue';

interface RevenueState {
  records: RevenueRecord[];
  currentRecord: RevenueRecord | null;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
  filters: RevenueQueryParams;
  
  fetchRecords: (params?: RevenueQueryParams) => Promise<void>;
  fetchDetail: (id: string) => Promise<void>;
  createRecord: (data: Partial<RevenueRecord>) => Promise<RevenueRecord>;
  updateRecord: (id: string, data: Partial<RevenueRecord>) => Promise<RevenueRecord>;
  deleteRecord: (id: string) => Promise<void>;
  exportRecords: (params?: RevenueQueryParams) => Promise<Blob>;
  setFilters: (filters: Partial<RevenueQueryParams>) => void;
  resetFilters: () => void;
  setCurrentRecord: (record: RevenueRecord | null) => void;
  clearError: () => void;
}

const defaultFilters: RevenueQueryParams = {
  page: 1,
  pageSize: 10,
};

export const useRevenueStore = create<RevenueState>((set, get) => ({
  records: [],
  currentRecord: null,
  total: 0,
  page: 1,
  pageSize: 10,
  totalPages: 0,
  loading: false,
  error: null,
  filters: defaultFilters,

  fetchRecords: async (params) => {
    set({ loading: true, error: null });
    const currentFilters = { ...get().filters, ...params };
    try {
      const response: PaginatedResponse<RevenueRecord> = await revenueApi.getRevenueList(currentFilters);
      set({
        records: response.items,
        total: response.total,
        page: response.page,
        pageSize: response.pageSize,
        totalPages: response.totalPages,
        filters: currentFilters,
        loading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '获取收入流水失败',
        loading: false,
      });
    }
  },

  fetchDetail: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const record = await revenueApi.getRevenueDetail(id);
      set({ currentRecord: record, loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '获取收入详情失败',
        loading: false,
      });
      throw error;
    }
  },

  createRecord: async (data) => {
    set({ loading: true, error: null });
    try {
      const newRecord = await revenueApi.createRevenue(data);
      set((state) => ({
        records: [newRecord, ...state.records],
        total: state.total + 1,
        loading: false,
      }));
      return newRecord;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '创建收入记录失败',
        loading: false,
      });
      throw error;
    }
  },

  updateRecord: async (id: string, data) => {
    set({ loading: true, error: null });
    try {
      const updatedRecord = await revenueApi.updateRevenue(id, data);
      set((state) => ({
        records: state.records.map((r) => (r.id === id ? updatedRecord : r)),
        currentRecord: state.currentRecord?.id === id ? updatedRecord : state.currentRecord,
        loading: false,
      }));
      return updatedRecord;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '更新收入记录失败',
        loading: false,
      });
      throw error;
    }
  },

  deleteRecord: async (id: string) => {
    set({ loading: true, error: null });
    try {
      await revenueApi.deleteRevenue(id);
      set((state) => ({
        records: state.records.filter((r) => r.id !== id),
        total: state.total - 1,
        loading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '删除收入记录失败',
        loading: false,
      });
      throw error;
    }
  },

  exportRecords: async (params) => {
    set({ loading: true, error: null });
    try {
      const blob = await revenueApi.exportRevenue(params || get().filters);
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

  setCurrentRecord: (record) => {
    set({ currentRecord: record });
  },

  clearError: () => {
    set({ error: null });
  },
}));
