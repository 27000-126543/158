import { create } from 'zustand';
import type { BankTransaction, ReconciliationDiff, WorkOrder, PaginatedResponse } from '@shared/types';
import * as reconciliationApi from '../api/reconciliation';
import type { ReconciliationQueryParams, DiffQueryParams } from '../api/reconciliation';

interface ReconciliationState {
  bankTransactions: BankTransaction[];
  diffs: ReconciliationDiff[];
  workOrders: WorkOrder[];
  currentDiff: ReconciliationDiff | null;
  summary: {
    totalTransactions: number;
    matched: number;
    unmatched: number;
    diffCount: number;
    resolved: number;
    pending: number;
  } | null;
  totalTransactions: number;
  totalDiffs: number;
  totalWorkOrders: number;
  page: number;
  pageSize: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
  transactionFilters: ReconciliationQueryParams;
  diffFilters: DiffQueryParams;
  
  fetchBankTransactions: (params?: ReconciliationQueryParams) => Promise<void>;
  fetchDiffs: (params?: DiffQueryParams) => Promise<void>;
  fetchDiffDetail: (id: string) => Promise<void>;
  fetchWorkOrders: (params?: { status?: string; assignee?: string; page?: number; pageSize?: number }) => Promise<void>;
  fetchSummary: (params: { startDate: string; endDate: string }) => Promise<void>;
  
  startReconciliation: (date: string) => Promise<{ taskId: string; message: string }>;
  matchTransaction: (revenueId: string, bankTransactionId: string) => Promise<{ success: boolean }>;
  unmatchTransaction: (revenueId: string) => Promise<{ success: boolean }>;
  resolveDiff: (id: string, resolution: string, comment?: string) => Promise<ReconciliationDiff>;
  markAsSpecial: (id: string, reason: string) => Promise<ReconciliationDiff>;
  createWorkOrder: (diffId: string, data: { title: string; description: string; assignee: string }) => Promise<WorkOrder>;
  updateWorkOrder: (id: string, data: Partial<WorkOrder>) => Promise<WorkOrder>;
  importBankTransactions: (file: File) => Promise<{ imported: number; total: number }>;
  
  setTransactionFilters: (filters: Partial<ReconciliationQueryParams>) => void;
  setDiffFilters: (filters: Partial<DiffQueryParams>) => void;
  resetTransactionFilters: () => void;
  resetDiffFilters: () => void;
  setCurrentDiff: (diff: ReconciliationDiff | null) => void;
  clearError: () => void;
}

const defaultTransactionFilters: ReconciliationQueryParams = {
  page: 1,
  pageSize: 10,
};

const defaultDiffFilters: DiffQueryParams = {
  page: 1,
  pageSize: 10,
};

export const useReconciliationStore = create<ReconciliationState>((set, get) => ({
  bankTransactions: [],
  diffs: [],
  workOrders: [],
  currentDiff: null,
  summary: null,
  totalTransactions: 0,
  totalDiffs: 0,
  totalWorkOrders: 0,
  page: 1,
  pageSize: 10,
  totalPages: 0,
  loading: false,
  error: null,
  transactionFilters: defaultTransactionFilters,
  diffFilters: defaultDiffFilters,

  fetchBankTransactions: async (params) => {
    set({ loading: true, error: null });
    const currentFilters = { ...get().transactionFilters, ...params };
    try {
      const response: PaginatedResponse<BankTransaction> = await reconciliationApi.getBankTransactions(currentFilters);
      set({
        bankTransactions: response.items,
        totalTransactions: response.total,
        page: response.page,
        pageSize: response.pageSize,
        totalPages: response.totalPages,
        transactionFilters: currentFilters,
        loading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '获取银行交易失败',
        loading: false,
      });
    }
  },

  fetchDiffs: async (params) => {
    set({ loading: true, error: null });
    const currentFilters = { ...get().diffFilters, ...params };
    try {
      const response: PaginatedResponse<ReconciliationDiff> = await reconciliationApi.getDiffs(currentFilters);
      set({
        diffs: response.items,
        totalDiffs: response.total,
        page: response.page,
        pageSize: response.pageSize,
        totalPages: response.totalPages,
        diffFilters: currentFilters,
        loading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '获取差异记录失败',
        loading: false,
      });
    }
  },

  fetchDiffDetail: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const diff = await reconciliationApi.getDiffDetail(id);
      set({ currentDiff: diff, loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '获取差异详情失败',
        loading: false,
      });
      throw error;
    }
  },

  fetchWorkOrders: async (params) => {
    set({ loading: true, error: null });
    try {
      const response: PaginatedResponse<WorkOrder> = await reconciliationApi.getWorkOrders(params || {});
      set({
        workOrders: response.items,
        totalWorkOrders: response.total,
        loading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '获取工单失败',
        loading: false,
      });
    }
  },

  fetchSummary: async (params) => {
    set({ loading: true, error: null });
    try {
      const summary = await reconciliationApi.getReconciliationSummary(params);
      set({ summary, loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '获取对账汇总失败',
        loading: false,
      });
    }
  },

  startReconciliation: async (date: string) => {
    set({ loading: true, error: null });
    try {
      const result = await reconciliationApi.startReconciliation({ date });
      set({ loading: false });
      return result;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '启动对账失败',
        loading: false,
      });
      throw error;
    }
  },

  matchTransaction: async (revenueId: string, bankTransactionId: string) => {
    set({ loading: true, error: null });
    try {
      const result = await reconciliationApi.matchTransaction(revenueId, bankTransactionId);
      set({ loading: false });
      return result;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '匹配交易失败',
        loading: false,
      });
      throw error;
    }
  },

  unmatchTransaction: async (revenueId: string) => {
    set({ loading: true, error: null });
    try {
      const result = await reconciliationApi.unmatchTransaction(revenueId);
      set({ loading: false });
      return result;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '取消匹配失败',
        loading: false,
      });
      throw error;
    }
  },

  resolveDiff: async (id: string, resolution: string, comment?: string) => {
    set({ loading: true, error: null });
    try {
      const updatedDiff = await reconciliationApi.resolveDiff(id, { resolution, comment });
      set((state) => ({
        diffs: state.diffs.map((d) => (d.id === id ? updatedDiff : d)),
        currentDiff: state.currentDiff?.id === id ? updatedDiff : state.currentDiff,
        loading: false,
      }));
      return updatedDiff;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '解决差异失败',
        loading: false,
      });
      throw error;
    }
  },

  markAsSpecial: async (id: string, reason: string) => {
    set({ loading: true, error: null });
    try {
      const updatedDiff = await reconciliationApi.markAsSpecial(id, { reason });
      set((state) => ({
        diffs: state.diffs.map((d) => (d.id === id ? updatedDiff : d)),
        currentDiff: state.currentDiff?.id === id ? updatedDiff : state.currentDiff,
        loading: false,
      }));
      return updatedDiff;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '标记特殊处理失败',
        loading: false,
      });
      throw error;
    }
  },

  createWorkOrder: async (diffId: string, data) => {
    set({ loading: true, error: null });
    try {
      const newOrder = await reconciliationApi.createWorkOrder(diffId, data);
      set((state) => ({
        workOrders: [newOrder, ...state.workOrders],
        totalWorkOrders: state.totalWorkOrders + 1,
        loading: false,
      }));
      return newOrder;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '创建工单失败',
        loading: false,
      });
      throw error;
    }
  },

  updateWorkOrder: async (id: string, data) => {
    set({ loading: true, error: null });
    try {
      const updatedOrder = await reconciliationApi.updateWorkOrder(id, data);
      set((state) => ({
        workOrders: state.workOrders.map((w) => (w.id === id ? updatedOrder : w)),
        loading: false,
      }));
      return updatedOrder;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '更新工单失败',
        loading: false,
      });
      throw error;
    }
  },

  importBankTransactions: async (file: File) => {
    set({ loading: true, error: null });
    try {
      const result = await reconciliationApi.importBankTransactions(file);
      set({ loading: false });
      return result;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '导入银行交易失败',
        loading: false,
      });
      throw error;
    }
  },

  setTransactionFilters: (filters) => {
    set((state) => ({
      transactionFilters: { ...state.transactionFilters, ...filters, page: 1 },
    }));
  },

  setDiffFilters: (filters) => {
    set((state) => ({
      diffFilters: { ...state.diffFilters, ...filters, page: 1 },
    }));
  },

  resetTransactionFilters: () => {
    set({ transactionFilters: defaultTransactionFilters });
  },

  resetDiffFilters: () => {
    set({ diffFilters: defaultDiffFilters });
  },

  setCurrentDiff: (diff) => {
    set({ currentDiff: diff });
  },

  clearError: () => {
    set({ error: null });
  },
}));
