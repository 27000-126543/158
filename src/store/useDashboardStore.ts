import { create } from 'zustand';
import type { DashboardStats, MonthlyReport, SystemAlert } from '@shared/types';
import * as reportsApi from '../api/reports';
import * as systemApi from '../api/system';
import { mockMonthlyReports, mockDashboardStats, mockAlerts, delay } from '../utils/mock';
import { CATEGORIES } from '../utils/constants';

interface DashboardState {
  stats: DashboardStats | null;
  monthlyReports: MonthlyReport[];
  purchaseTrend: { date: string; amount: number }[];
  purchaseByCategory: { category: string; categoryName: string; amount: number; percentage: number }[];
  revenueTrend: { date: string; amount: number }[];
  revenueByBusinessLine: { businessLine: string; businessLineName: string; amount: number; percentage: number }[];
  alerts: SystemAlert[];
  loading: boolean;
  error: string | null;
  
  fetchStats: () => Promise<void>;
  fetchMonthlyReports: () => Promise<void>;
  fetchPurchaseTrend: (params: { startDate: string; endDate: string; category?: string }) => Promise<void>;
  fetchPurchaseByCategory: (params: { startDate: string; endDate: string }) => Promise<void>;
  fetchAlerts: (params?: { limit?: number }) => Promise<void>;
  fetchAllDashboardData: () => Promise<void>;
  generateMonthlyReport: (yearMonth: string) => Promise<MonthlyReport>;
  clearError: () => void;
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  stats: null,
  monthlyReports: [],
  purchaseTrend: [],
  purchaseByCategory: [],
  revenueTrend: [],
  revenueByBusinessLine: [],
  alerts: [],
  loading: false,
  error: null,

  fetchStats: async () => {
    try {
      const stats = await reportsApi.getDashboardStats();
      set({ stats });
    } catch {
      await delay(300);
      set({ stats: mockDashboardStats });
    }
  },

  fetchMonthlyReports: async () => {
    try {
      const reports = await reportsApi.getMonthlyReports();
      set({ monthlyReports: reports });
    } catch {
      await delay(300);
      set({ monthlyReports: mockMonthlyReports });
    }
  },

  fetchPurchaseTrend: async (params) => {
    try {
      const trend = await reportsApi.getPurchaseTrend(params);
      set({ purchaseTrend: trend });
    } catch {
      await delay(300);
      const days = 30;
      const trend = [];
      const now = new Date();
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        trend.push({
          date: date.toISOString().split('T')[0],
          amount: Math.floor(Math.random() * 500000) + 100000,
        });
      }
      set({ purchaseTrend: trend });
    }
  },

  fetchPurchaseByCategory: async (params) => {
    try {
      const data = await reportsApi.getPurchaseByCategory(params);
      set({ purchaseByCategory: data });
    } catch {
      await delay(300);
      const latestReport = mockMonthlyReports[0];
      if (latestReport) {
        const purchaseData = latestReport.purchaseByCategory;
        const total = Object.values(purchaseData).reduce((sum, val) => sum + val, 0);
        const data = CATEGORIES.map(cat => ({
          category: cat.value,
          categoryName: cat.label,
          amount: purchaseData[cat.value] || 0,
          percentage: total > 0 ? (purchaseData[cat.value] || 0) / total : 0,
        })).filter(item => item.amount > 0);
        set({ purchaseByCategory: data });
      }
    }
  },

  fetchAlerts: async (params) => {
    try {
      const response = await systemApi.getAlerts({
        page: 1,
        pageSize: params?.limit || 10,
      });
      set({ alerts: response.items });
    } catch {
      await delay(300);
      const limit = params?.limit || 10;
      set({ alerts: mockAlerts.slice(0, limit) });
    }
  },

  fetchAllDashboardData: async () => {
    set({ loading: true, error: null });
    try {
      const startDate = new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0];
      const endDate = new Date().toISOString().split('T')[0];
      
      await Promise.all([
        get().fetchStats(),
        get().fetchPurchaseTrend({ startDate, endDate }),
        get().fetchPurchaseByCategory({ startDate, endDate }),
        get().fetchAlerts({ limit: 8 }),
      ]);
      
      const days = 30;
      const trend = [];
      const now = new Date();
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        trend.push({
          date: date.toISOString().split('T')[0],
          amount: Math.floor(Math.random() * 500000) + 100000,
        });
      }
      set({ revenueTrend: trend });
      
      const businessLines = [
        { value: 'ecommerce', label: '电商业务' },
        { value: 'retail', label: '零售业务' },
        { value: 'wholesale', label: '批发业务' },
        { value: 'services', label: '服务业务' },
        { value: 'international', label: '国际业务' },
      ];
      const totalAmount = 5000000;
      const revenueData = businessLines.map(bl => ({
        businessLine: bl.value,
        businessLineName: bl.label,
        amount: Math.floor(Math.random() * 2000000) + 500000,
        percentage: 0,
      }));
      const total = revenueData.reduce((sum, r) => sum + r.amount, 0);
      revenueData.forEach(r => {
        r.percentage = total > 0 ? r.amount / total : 0;
      });
      set({ revenueByBusinessLine: revenueData });
      
      set({ loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '获取仪表盘数据失败',
        loading: false,
      });
    }
  },

  generateMonthlyReport: async (yearMonth) => {
    set({ loading: true, error: null });
    try {
      const report = await reportsApi.generateMonthlyReport(yearMonth);
      set((state) => ({
        monthlyReports: [report, ...state.monthlyReports],
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

  clearError: () => {
    set({ error: null });
  },
}));
