import { create } from 'zustand';
import type { PurchaseOrder, PaginatedResponse } from '@shared/types';
import * as ordersApi from '../api/orders';
import type { OrderQueryParams } from '../api/orders';

interface OrdersState {
  orders: PurchaseOrder[];
  currentOrder: PurchaseOrder | null;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
  filters: OrderQueryParams;
  
  fetchOrders: (params?: OrderQueryParams) => Promise<void>;
  fetchDetail: (id: string) => Promise<void>;
  createOrder: (data: Partial<PurchaseOrder>) => Promise<PurchaseOrder>;
  updateOrder: (id: string, data: Partial<PurchaseOrder>) => Promise<PurchaseOrder>;
  deleteOrder: (id: string) => Promise<void>;
  confirmOrder: (id: string) => Promise<PurchaseOrder>;
  cancelOrder: (id: string, reason: string) => Promise<PurchaseOrder>;
  updateLogistics: (id: string, trackingNumber: string, shippingCompany: string) => Promise<PurchaseOrder>;
  updateLogisticsStatus: (id: string, status: string) => Promise<PurchaseOrder>;
  exportOrders: (params?: OrderQueryParams) => Promise<Blob>;
  setFilters: (filters: Partial<OrderQueryParams>) => void;
  resetFilters: () => void;
  setCurrentOrder: (order: PurchaseOrder | null) => void;
  clearError: () => void;
}

const defaultFilters: OrderQueryParams = {
  page: 1,
  pageSize: 10,
};

export const useOrdersStore = create<OrdersState>((set, get) => ({
  orders: [],
  currentOrder: null,
  total: 0,
  page: 1,
  pageSize: 10,
  totalPages: 0,
  loading: false,
  error: null,
  filters: defaultFilters,

  fetchOrders: async (params) => {
    set({ loading: true, error: null });
    const currentFilters = { ...get().filters, ...params };
    try {
      const response: PaginatedResponse<PurchaseOrder> = await ordersApi.getOrderList(currentFilters);
      set({
        orders: response.items,
        total: response.total,
        page: response.page,
        pageSize: response.pageSize,
        totalPages: response.totalPages,
        filters: currentFilters,
        loading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '获取采购订单失败',
        loading: false,
      });
    }
  },

  fetchDetail: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const order = await ordersApi.getOrderDetail(id);
      set({ currentOrder: order, loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '获取采购订单详情失败',
        loading: false,
      });
      throw error;
    }
  },

  createOrder: async (data) => {
    set({ loading: true, error: null });
    try {
      const newOrder = await ordersApi.createOrder(data);
      set((state) => ({
        orders: [newOrder, ...state.orders],
        total: state.total + 1,
        loading: false,
      }));
      return newOrder;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '创建采购订单失败',
        loading: false,
      });
      throw error;
    }
  },

  updateOrder: async (id: string, data) => {
    set({ loading: true, error: null });
    try {
      const updatedOrder = await ordersApi.updateOrder(id, data);
      set((state) => ({
        orders: state.orders.map((o) => (o.id === id ? updatedOrder : o)),
        currentOrder: state.currentOrder?.id === id ? updatedOrder : state.currentOrder,
        loading: false,
      }));
      return updatedOrder;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '更新采购订单失败',
        loading: false,
      });
      throw error;
    }
  },

  deleteOrder: async (id: string) => {
    set({ loading: true, error: null });
    try {
      await ordersApi.deleteOrder(id);
      set((state) => ({
        orders: state.orders.filter((o) => o.id !== id),
        total: state.total - 1,
        loading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '删除采购订单失败',
        loading: false,
      });
      throw error;
    }
  },

  confirmOrder: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const updatedOrder = await ordersApi.confirmOrder(id);
      set((state) => ({
        orders: state.orders.map((o) => (o.id === id ? updatedOrder : o)),
        currentOrder: state.currentOrder?.id === id ? updatedOrder : state.currentOrder,
        loading: false,
      }));
      return updatedOrder;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '确认订单失败',
        loading: false,
      });
      throw error;
    }
  },

  cancelOrder: async (id: string, reason: string) => {
    set({ loading: true, error: null });
    try {
      const updatedOrder = await ordersApi.cancelOrder(id, reason);
      set((state) => ({
        orders: state.orders.map((o) => (o.id === id ? updatedOrder : o)),
        currentOrder: state.currentOrder?.id === id ? updatedOrder : state.currentOrder,
        loading: false,
      }));
      return updatedOrder;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '取消订单失败',
        loading: false,
      });
      throw error;
    }
  },

  updateLogistics: async (id: string, trackingNumber: string, shippingCompany: string) => {
    set({ loading: true, error: null });
    try {
      const updatedOrder = await ordersApi.updateLogistics(id, trackingNumber, shippingCompany);
      set((state) => ({
        orders: state.orders.map((o) => (o.id === id ? updatedOrder : o)),
        currentOrder: state.currentOrder?.id === id ? updatedOrder : state.currentOrder,
        loading: false,
      }));
      return updatedOrder;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '更新物流失败',
        loading: false,
      });
      throw error;
    }
  },

  updateLogisticsStatus: async (id: string, status: string) => {
    set({ loading: true, error: null });
    try {
      const updatedOrder = await ordersApi.updateLogisticsStatus(id, status);
      set((state) => ({
        orders: state.orders.map((o) => (o.id === id ? updatedOrder : o)),
        currentOrder: state.currentOrder?.id === id ? updatedOrder : state.currentOrder,
        loading: false,
      }));
      return updatedOrder;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '更新物流状态失败',
        loading: false,
      });
      throw error;
    }
  },

  exportOrders: async (params) => {
    set({ loading: true, error: null });
    try {
      const blob = await ordersApi.exportOrders(params || get().filters);
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

  setCurrentOrder: (order) => {
    set({ currentOrder: order });
  },

  clearError: () => {
    set({ error: null });
  },
}));
