import { create } from 'zustand';
import type { MonthlyReport } from '@shared/types';
import * as reportsApi from '../api/reports';

interface ReportsState {
  monthlyReports: MonthlyReport[];
  currentReport: MonthlyReport | null;
  purchaseStats: {
    totalPurchaseAmount: number;
    monthPurchaseAmount: number;
    totalOrders: number;
    monthOrders: number;
    activeSuppliers: number;
    pendingApprovals: number;
  } | null;
  supplierStats: {
    totalSuppliers: number;
    activeSuppliers: number;
    averageRating: number;
    excellentCount: number;
    goodCount: number;
    averageCount: number;
    poorCount: number;
  } | null;
  paymentStats: {
    totalPayments: number;
    pending: number;
    approved: number;
    paid: number;
    rejected: number;
    totalAmount: number;
    paidAmount: number;
    overdueCount: number;
  } | null;
  loading: boolean;
  error: string | null;
  
  fetchMonthlyReports: () => Promise<void>;
  fetchMonthlyReport: (yearMonth: string) => Promise<void>;
  generateMonthlyReport: (yearMonth: string) => Promise<MonthlyReport>;
  fetchPurchaseStats: (params: { startDate: string; endDate: string }) => Promise<void>;
  fetchSupplierStats: () => Promise<void>;
  fetchPaymentStats: (params: { startDate: string; endDate: string }) => Promise<void>;
  exportReport: (type: string, params: Record<string, unknown>) => Promise<Blob>;
  setCurrentReport: (report: MonthlyReport | null) => void;
  clearError: () => void;
}

export const useReportsStore = create<ReportsState>((set) => ({
  monthlyReports: [],
  currentReport: null,
  purchaseStats: null,
  supplierStats: null,
  paymentStats: null,
  loading: false,
  error: null,

  fetchMonthlyReports: async () => {
    set({ loading: true, error: null });
    try {
      const reports = await reportsApi.getMonthlyReports();
      set({ monthlyReports: reports, loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '获取月度报告列表失败',
        loading: false,
      });
    }
  },

  fetchMonthlyReport: async (yearMonth: string) => {
    set({ loading: true, error: null });
    try {
      const report = await reportsApi.getMonthlyReport(yearMonth);
      set({ currentReport: report, loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '获取月度报告失败',
        loading: false,
      });
      throw error;
    }
  },

  generateMonthlyReport: async (yearMonth: string) => {
    set({ loading: true, error: null });
    try {
      const report = await reportsApi.generateMonthlyReport(yearMonth);
      set((state) => ({
        monthlyReports: [report, ...state.monthlyReports],
        currentReport: report,
        loading: false,
      }));
      return report;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '生成月度报告失败',
        loading: false,
      });
      throw error;
    }
  },

  fetchPurchaseStats: async (params) => {
    set({ loading: true, error: null });
    try {
      const stats = await reportsApi.getPurchaseStats(params);
      set({ purchaseStats: stats, loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '获取采购统计失败',
        loading: false,
      });
    }
  },

  fetchSupplierStats: async () => {
    set({ loading: true, error: null });
    try {
      const stats = await reportsApi.getSupplierStats();
      set({ supplierStats: stats, loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '获取供应商统计失败',
        loading: false,
      });
    }
  },

  fetchPaymentStats: async (params) => {
    set({ loading: true, error: null });
    try {
      const stats = await reportsApi.getPaymentStats(params);
      set({ paymentStats: stats, loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '获取付款统计失败',
        loading: false,
      });
    }
  },

  exportReport: async (type: string, params: Record<string, unknown>) => {
    set({ loading: true, error: null });
    try {
      const blob = await reportsApi.exportReport(type, params);
      set({ loading: false });
      return blob;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '导出报告失败',
        loading: false,
      });
      throw error;
    }
  },

  setCurrentReport: (report) => {
    set({ currentReport: report });
  },

  clearError: () => {
    set({ error: null });
  },
}));
