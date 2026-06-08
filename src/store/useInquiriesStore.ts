import { create } from 'zustand';
import type { Inquiry, Quote, ComparisonReport, PaginatedResponse } from '@shared/types';
import * as inquiriesApi from '../api/inquiries';
import type { InquiryQueryParams } from '../api/inquiries';

interface InquiriesState {
  inquiries: Inquiry[];
  currentInquiry: Inquiry | null;
  quotes: Quote[];
  comparisonReport: ComparisonReport | null;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
  filters: InquiryQueryParams;
  
  fetchInquiries: (params?: InquiryQueryParams) => Promise<void>;
  fetchDetail: (id: string) => Promise<void>;
  fetchQuotes: (inquiryId: string) => Promise<void>;
  fetchComparisonReport: (inquiryId: string) => Promise<void>;
  createInquiry: (data: Partial<Inquiry>) => Promise<Inquiry>;
  updateInquiry: (id: string, data: Partial<Inquiry>) => Promise<Inquiry>;
  deleteInquiry: (id: string) => Promise<void>;
  sendInquiry: (id: string) => Promise<Inquiry>;
  selectQuote: (inquiryId: string, quoteId: string) => Promise<ComparisonReport>;
  createOrderFromInquiry: (inquiryId: string, supplierId: string) => Promise<{ orderId: string }>;
  submitQuote: (data: Partial<Quote>) => Promise<Quote>;
  exportInquiries: (params?: InquiryQueryParams) => Promise<Blob>;
  setFilters: (filters: Partial<InquiryQueryParams>) => void;
  resetFilters: () => void;
  setCurrentInquiry: (inquiry: Inquiry | null) => void;
  clearComparisonReport: () => void;
  clearError: () => void;
}

const defaultFilters: InquiryQueryParams = {
  page: 1,
  pageSize: 10,
};

export const useInquiriesStore = create<InquiriesState>((set, get) => ({
  inquiries: [],
  currentInquiry: null,
  quotes: [],
  comparisonReport: null,
  total: 0,
  page: 1,
  pageSize: 10,
  totalPages: 0,
  loading: false,
  error: null,
  filters: defaultFilters,

  fetchInquiries: async (params) => {
    set({ loading: true, error: null });
    const currentFilters = { ...get().filters, ...params };
    try {
      const response: PaginatedResponse<Inquiry> = await inquiriesApi.getInquiryList(currentFilters);
      set({
        inquiries: response.items,
        total: response.total,
        page: response.page,
        pageSize: response.pageSize,
        totalPages: response.totalPages,
        filters: currentFilters,
        loading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '获取询价单失败',
        loading: false,
      });
    }
  },

  fetchDetail: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const inquiry = await inquiriesApi.getInquiryDetail(id);
      set({ currentInquiry: inquiry, loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '获取询价单详情失败',
        loading: false,
      });
      throw error;
    }
  },

  fetchQuotes: async (inquiryId: string) => {
    set({ loading: true, error: null });
    try {
      const quotes = await inquiriesApi.getQuotesByInquiryId(inquiryId);
      set({ quotes, loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '获取报价失败',
        loading: false,
      });
    }
  },

  fetchComparisonReport: async (inquiryId: string) => {
    set({ loading: true, error: null });
    try {
      const report = await inquiriesApi.getComparisonReport(inquiryId);
      set({ comparisonReport: report, loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '获取比价报告失败',
        loading: false,
      });
      throw error;
    }
  },

  createInquiry: async (data) => {
    set({ loading: true, error: null });
    try {
      const newInquiry = await inquiriesApi.createInquiry(data);
      set((state) => ({
        inquiries: [newInquiry, ...state.inquiries],
        total: state.total + 1,
        loading: false,
      }));
      return newInquiry;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '创建询价单失败',
        loading: false,
      });
      throw error;
    }
  },

  updateInquiry: async (id: string, data) => {
    set({ loading: true, error: null });
    try {
      const updatedInquiry = await inquiriesApi.updateInquiry(id, data);
      set((state) => ({
        inquiries: state.inquiries.map((i) => (i.id === id ? updatedInquiry : i)),
        currentInquiry: state.currentInquiry?.id === id ? updatedInquiry : state.currentInquiry,
        loading: false,
      }));
      return updatedInquiry;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '更新询价单失败',
        loading: false,
      });
      throw error;
    }
  },

  deleteInquiry: async (id: string) => {
    set({ loading: true, error: null });
    try {
      await inquiriesApi.deleteInquiry(id);
      set((state) => ({
        inquiries: state.inquiries.filter((i) => i.id !== id),
        total: state.total - 1,
        loading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '删除询价单失败',
        loading: false,
      });
      throw error;
    }
  },

  sendInquiry: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const updatedInquiry = await inquiriesApi.sendInquiry(id);
      set((state) => ({
        inquiries: state.inquiries.map((i) => (i.id === id ? updatedInquiry : i)),
        currentInquiry: state.currentInquiry?.id === id ? updatedInquiry : state.currentInquiry,
        loading: false,
      }));
      return updatedInquiry;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '发送询价单失败',
        loading: false,
      });
      throw error;
    }
  },

  selectQuote: async (inquiryId: string, quoteId: string) => {
    set({ loading: true, error: null });
    try {
      const report = await inquiriesApi.selectQuote(inquiryId, quoteId);
      set({ comparisonReport: report, loading: false });
      return report;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '选择报价失败',
        loading: false,
      });
      throw error;
    }
  },

  createOrderFromInquiry: async (inquiryId: string, supplierId: string) => {
    set({ loading: true, error: null });
    try {
      const result = await inquiriesApi.createOrderFromInquiry(inquiryId, supplierId);
      set({ loading: false });
      return result;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '创建订单失败',
        loading: false,
      });
      throw error;
    }
  },

  submitQuote: async (data) => {
    set({ loading: true, error: null });
    try {
      const newQuote = await inquiriesApi.submitQuote(data);
      set((state) => ({
        quotes: [...state.quotes, newQuote],
        loading: false,
      }));
      return newQuote;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '提交报价失败',
        loading: false,
      });
      throw error;
    }
  },

  exportInquiries: async (params) => {
    set({ loading: true, error: null });
    try {
      const blob = await inquiriesApi.exportInquiries(params || get().filters);
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

  setCurrentInquiry: (inquiry) => {
    set({ currentInquiry: inquiry });
  },

  clearComparisonReport: () => {
    set({ comparisonReport: null });
  },

  clearError: () => {
    set({ error: null });
  },
}));
