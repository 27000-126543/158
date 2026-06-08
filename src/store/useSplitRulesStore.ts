import { create } from 'zustand';
import type { SplitRule, SplitRuleHistory, PaginatedResponse } from '@shared/types';
import * as splitRulesApi from '../api/splitRules';
import type { SplitRuleQueryParams } from '../api/splitRules';

interface SplitRulesState {
  rules: SplitRule[];
  currentRule: SplitRule | null;
  ruleHistory: SplitRuleHistory[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
  filters: SplitRuleQueryParams;
  
  fetchRules: (params?: SplitRuleQueryParams) => Promise<void>;
  fetchDetail: (id: string) => Promise<void>;
  fetchHistory: (ruleId: string) => Promise<void>;
  createRule: (data: Partial<SplitRule>) => Promise<SplitRule>;
  updateRule: (id: string, data: Partial<SplitRule>) => Promise<SplitRule>;
  deleteRule: (id: string) => Promise<void>;
  submitForApproval: (id: string) => Promise<SplitRule>;
  setFilters: (filters: Partial<SplitRuleQueryParams>) => void;
  resetFilters: () => void;
  setCurrentRule: (rule: SplitRule | null) => void;
  clearError: () => void;
}

const defaultFilters: SplitRuleQueryParams = {
  page: 1,
  pageSize: 10,
};

export const useSplitRulesStore = create<SplitRulesState>((set, get) => ({
  rules: [],
  currentRule: null,
  ruleHistory: [],
  total: 0,
  page: 1,
  pageSize: 10,
  totalPages: 0,
  loading: false,
  error: null,
  filters: defaultFilters,

  fetchRules: async (params) => {
    set({ loading: true, error: null });
    const currentFilters = { ...get().filters, ...params };
    try {
      const response: PaginatedResponse<SplitRule> = await splitRulesApi.getSplitRules(currentFilters);
      set({
        rules: response.items,
        total: response.total,
        page: response.page,
        pageSize: response.pageSize,
        totalPages: response.totalPages,
        filters: currentFilters,
        loading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '获取分成规则失败',
        loading: false,
      });
    }
  },

  fetchDetail: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const rule = await splitRulesApi.getSplitRuleDetail(id);
      set({ currentRule: rule, loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '获取规则详情失败',
        loading: false,
      });
      throw error;
    }
  },

  fetchHistory: async (ruleId: string) => {
    set({ loading: true, error: null });
    try {
      const history = await splitRulesApi.getSplitRuleHistory(ruleId);
      set({ ruleHistory: history, loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '获取规则历史失败',
        loading: false,
      });
    }
  },

  createRule: async (data) => {
    set({ loading: true, error: null });
    try {
      const newRule = await splitRulesApi.createSplitRule(data);
      set((state) => ({
        rules: [newRule, ...state.rules],
        total: state.total + 1,
        loading: false,
      }));
      return newRule;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '创建分成规则失败',
        loading: false,
      });
      throw error;
    }
  },

  updateRule: async (id: string, data) => {
    set({ loading: true, error: null });
    try {
      const updatedRule = await splitRulesApi.updateSplitRule(id, data);
      set((state) => ({
        rules: state.rules.map((r) => (r.id === id ? updatedRule : r)),
        currentRule: state.currentRule?.id === id ? updatedRule : state.currentRule,
        loading: false,
      }));
      return updatedRule;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '更新分成规则失败',
        loading: false,
      });
      throw error;
    }
  },

  deleteRule: async (id: string) => {
    set({ loading: true, error: null });
    try {
      await splitRulesApi.deleteSplitRule(id);
      set((state) => ({
        rules: state.rules.filter((r) => r.id !== id),
        total: state.total - 1,
        loading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '删除分成规则失败',
        loading: false,
      });
      throw error;
    }
  },

  submitForApproval: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const updatedRule = await splitRulesApi.submitForApproval(id);
      set((state) => ({
        rules: state.rules.map((r) => (r.id === id ? updatedRule : r)),
        currentRule: state.currentRule?.id === id ? updatedRule : state.currentRule,
        loading: false,
      }));
      return updatedRule;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '提交审批失败',
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

  setCurrentRule: (rule) => {
    set({ currentRule: rule });
  },

  clearError: () => {
    set({ error: null });
  },
}));
