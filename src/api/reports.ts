import type { MonthlyReport, DashboardStats } from '@shared/types';
import { get, post } from './client';
import { mockDashboardStats, mockMonthlyReports, mockOrders, mockPayments, mockSuppliers, delay } from '../utils/mock';

export const getDashboardStats = async (): Promise<DashboardStats> => {
  try {
    return await get<DashboardStats>('/reports/dashboard');
  } catch {
    return delay(mockDashboardStats);
  }
};

export const getMonthlyReport = async (yearMonth: string): Promise<MonthlyReport> => {
  try {
    return await get<MonthlyReport>(`/reports/monthly/${yearMonth}`);
  } catch {
    const report = mockMonthlyReports.find(r => r.yearMonth === yearMonth);
    return delay(report || mockMonthlyReports[0]);
  }
};

export const getMonthlyReports = async (): Promise<MonthlyReport[]> => {
  try {
    return await get<MonthlyReport[]>('/reports/monthly');
  } catch {
    return delay(mockMonthlyReports);
  }
};

export const generateMonthlyReport = async (yearMonth: string): Promise<MonthlyReport> => {
  try {
    return await post<MonthlyReport>('/reports/monthly/generate', { yearMonth });
  } catch {
    return delay({ ...mockMonthlyReports[0], yearMonth, id: `report_${Date.now()}` });
  }
};

export const getPurchaseTrend = async (params: { startDate: string; endDate: string; category?: string }): Promise<{ date: string; amount: number }[]> => {
  try {
    return await get<{ date: string; amount: number }[]>('/reports/purchase-trend', { params });
  } catch {
    const trend: { date: string; amount: number }[] = [];
    const start = new Date(params.startDate);
    const end = new Date(params.endDate);
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const dayOrders = mockOrders.filter(o => 
        new Date(o.createdAt).toISOString().split('T')[0] === dateStr &&
        (!params.category || o.itemName.includes(params.category))
      );
      const amount = dayOrders.reduce((sum, o) => sum + o.totalAmount, 0);
      if (amount > 0) {
        trend.push({ date: dateStr, amount });
      }
    }
    
    return delay(trend);
  }
};

export const getPurchaseByCategory = async (params: { startDate: string; endDate: string }): Promise<{ category: string; categoryName: string; amount: number; percentage: number }[]> => {
  try {
    return await get<{ category: string; categoryName: string; amount: number; percentage: number }[]>('/reports/purchase-by-category', { params });
  } catch {
    const categories = [
      { value: 'it_equipment', label: 'IT设备' },
      { value: 'raw_materials', label: '原材料' },
      { value: 'office_supplies', label: '办公用品' },
      { value: 'software', label: '软件服务' },
      { value: 'packaging', label: '包装材料' },
      { value: 'marketing', label: '市场营销' },
    ];
    const result = categories.map(cat => {
      const catOrders = mockOrders.filter(o => 
        new Date(o.createdAt) >= new Date(params.startDate) &&
        new Date(o.createdAt) <= new Date(params.endDate)
      );
      const amount = catOrders.reduce((sum, o) => sum + o.totalAmount, 0) * (0.1 + Math.random() * 0.4);
      return { category: cat.value, categoryName: cat.label, amount: Math.round(amount), percentage: 0 };
    });
    
    const total = result.reduce((sum, r) => sum + r.amount, 0);
    result.forEach(r => {
      r.percentage = total > 0 ? r.amount / total : 0;
    });
    
    return delay(result);
  }
};

export const getOrderStats = async (params: { startDate: string; endDate: string }): Promise<{
  total: number;
  confirmed: number;
  processing: number;
  shipped: number;
  delivered: number;
  completed: number;
  cancelled: number;
  totalAmount: number;
}> => {
  try {
    return await get<{
      total: number;
      confirmed: number;
      processing: number;
      shipped: number;
      delivered: number;
      completed: number;
      cancelled: number;
      totalAmount: number;
    }>('/reports/order-stats', { params });
  } catch {
    const filtered = mockOrders.filter(o => 
      new Date(o.createdAt) >= new Date(params.startDate) &&
      new Date(o.createdAt) <= new Date(params.endDate)
    );
    
    return delay({
      total: filtered.length,
      confirmed: filtered.filter(o => o.status === 'confirmed').length,
      processing: filtered.filter(o => o.status === 'processing').length,
      shipped: filtered.filter(o => o.status === 'shipped').length,
      delivered: filtered.filter(o => o.status === 'delivered').length,
      completed: filtered.filter(o => o.status === 'completed').length,
      cancelled: filtered.filter(o => o.status === 'cancelled').length,
      totalAmount: filtered.reduce((sum, o) => sum + o.totalAmount, 0),
    });
  }
};

export const getPurchaseStats = async (params: { startDate: string; endDate: string }): Promise<{
  totalPurchaseAmount: number;
  monthPurchaseAmount: number;
  totalOrders: number;
  monthOrders: number;
  activeSuppliers: number;
  pendingApprovals: number;
}> => {
  try {
    return await get<{
      totalPurchaseAmount: number;
      monthPurchaseAmount: number;
      totalOrders: number;
      monthOrders: number;
      activeSuppliers: number;
      pendingApprovals: number;
    }>('/reports/purchase-stats', { params });
  } catch {
    const filtered = mockOrders.filter(o => 
      new Date(o.createdAt) >= new Date(params.startDate) &&
      new Date(o.createdAt) <= new Date(params.endDate)
    );
    
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthOrders = mockOrders.filter(o => new Date(o.createdAt) >= monthStart);
    const activeSuppliers = mockSuppliers.filter(s => s.status === 'active');
    
    return delay({
      totalPurchaseAmount: filtered.reduce((sum, o) => sum + o.totalAmount, 0),
      monthPurchaseAmount: monthOrders.reduce((sum, o) => sum + o.totalAmount, 0),
      totalOrders: filtered.length,
      monthOrders: monthOrders.length,
      activeSuppliers: activeSuppliers.length,
      pendingApprovals: 7,
    });
  }
};

export const getSupplierStats = async (): Promise<{
  totalSuppliers: number;
  activeSuppliers: number;
  averageRating: number;
  excellentCount: number;
  goodCount: number;
  averageCount: number;
  poorCount: number;
}> => {
  try {
    return await get<{
      totalSuppliers: number;
      activeSuppliers: number;
      averageRating: number;
      excellentCount: number;
      goodCount: number;
      averageCount: number;
      poorCount: number;
    }>('/reports/supplier-stats');
  } catch {
    const activeSuppliers = mockSuppliers.filter(s => s.status === 'active');
    
    return delay({
      totalSuppliers: mockSuppliers.length,
      activeSuppliers: activeSuppliers.length,
      averageRating: activeSuppliers.reduce((sum, s) => sum + s.performanceScore, 0) / activeSuppliers.length,
      excellentCount: mockSuppliers.filter(s => s.performanceLevel === 'excellent').length,
      goodCount: mockSuppliers.filter(s => s.performanceLevel === 'good').length,
      averageCount: mockSuppliers.filter(s => s.performanceLevel === 'average').length,
      poorCount: mockSuppliers.filter(s => s.performanceLevel === 'poor').length,
    });
  }
};

export const getPaymentStats = async (params: { startDate: string; endDate: string }): Promise<{
  totalPayments: number;
  pending: number;
  approved: number;
  paid: number;
  rejected: number;
  totalAmount: number;
  paidAmount: number;
  overdueCount: number;
}> => {
  try {
    return await get<{
      totalPayments: number;
      pending: number;
      approved: number;
      paid: number;
      rejected: number;
      totalAmount: number;
      paidAmount: number;
      overdueCount: number;
    }>('/reports/payment-stats', { params });
  } catch {
    const filtered = mockPayments.filter(p => 
      new Date(p.createdAt) >= new Date(params.startDate) &&
      new Date(p.createdAt) <= new Date(params.endDate)
    );
    
    const now = new Date();
    const overdue = filtered.filter(p => p.status !== 'paid' && new Date(p.dueDate) < now);
    
    return delay({
      totalPayments: filtered.length,
      pending: filtered.filter(p => p.status === 'pending').length,
      approved: filtered.filter(p => p.status === 'approved').length,
      paid: filtered.filter(p => p.status === 'paid').length,
      rejected: filtered.filter(p => p.status === 'rejected').length,
      totalAmount: filtered.reduce((sum, p) => sum + p.amount, 0),
      paidAmount: filtered.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0),
      overdueCount: overdue.length,
    });
  }
};

export const exportReport = async (type: string, params: Record<string, unknown>): Promise<Blob> => {
  try {
    return await get<Blob>(`/reports/export/${type}`, { params, responseType: 'blob' });
  } catch {
    return delay(new Blob());
  }
};

export const getComparisonData = async (params: { period1: string; period2: string }): Promise<{
  period1: { purchaseAmount: number; orders: number; suppliers: number };
  period2: { purchaseAmount: number; orders: number; suppliers: number };
  changes: { purchaseAmount: number; orders: number; suppliers: number };
}> => {
  try {
    return await get<{
      period1: { purchaseAmount: number; orders: number; suppliers: number };
      period2: { purchaseAmount: number; orders: number; suppliers: number };
      changes: { purchaseAmount: number; orders: number; suppliers: number };
    }>('/reports/comparison', { params });
  } catch {
    return delay({
      period1: { purchaseAmount: 5680000, orders: 47, suppliers: 12 },
      period2: { purchaseAmount: 6820000, orders: 55, suppliers: 15 },
      changes: { purchaseAmount: 0.2, orders: 0.17, suppliers: 0.25 },
    });
  }
};
