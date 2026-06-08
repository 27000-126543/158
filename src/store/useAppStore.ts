import { create } from 'zustand';
import type { SystemAlert } from '@shared/types';
import * as systemApi from '../api/system';

interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

interface AppState {
  loading: boolean;
  loadingCount: number;
  alerts: SystemAlert[];
  unreadAlertCount: number;
  toasts: ToastMessage[];
  sidebarCollapsed: boolean;
  theme: 'light' | 'dark';
  
  setLoading: (loading: boolean) => void;
  incrementLoading: () => void;
  decrementLoading: () => void;
  
  fetchAlerts: (params?: { page?: number; pageSize?: number; level?: string; type?: string; status?: string }) => Promise<void>;
  fetchUnreadAlertCount: () => Promise<void>;
  markAlertAsRead: (id: string) => Promise<void>;
  markAllAlertsAsRead: () => Promise<void>;
  resolveAlert: (id: string, resolution?: string) => Promise<void>;
  
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
  
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  loading: false,
  loadingCount: 0,
  alerts: [],
  unreadAlertCount: 0,
  toasts: [],
  sidebarCollapsed: false,
  theme: 'light',

  setLoading: (loading: boolean) => {
    set({ loading, loadingCount: loading ? 1 : 0 });
  },

  incrementLoading: () => {
    set((state) => ({
      loadingCount: state.loadingCount + 1,
      loading: true,
    }));
  },

  decrementLoading: () => {
    set((state) => {
      const newCount = Math.max(0, state.loadingCount - 1);
      return {
        loadingCount: newCount,
        loading: newCount > 0,
      };
    });
  },

  fetchAlerts: async (params) => {
    try {
      const response = await systemApi.getAlerts(params || {});
      set({ alerts: response.items });
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    }
  },

  fetchUnreadAlertCount: async () => {
    try {
      const response = await systemApi.getUnreadAlertCount();
      set({ unreadAlertCount: response.count });
    } catch (error) {
      console.error('Failed to fetch unread alert count:', error);
    }
  },

  markAlertAsRead: async (id: string) => {
    try {
      const updatedAlert = await systemApi.markAlertAsRead(id);
      set((state) => ({
        alerts: state.alerts.map((a) => (a.id === id ? updatedAlert : a)),
        unreadAlertCount: Math.max(0, state.unreadAlertCount - 1),
      }));
    } catch (error) {
      console.error('Failed to mark alert as read:', error);
    }
  },

  markAllAlertsAsRead: async () => {
    try {
      await systemApi.markAllAlertsAsRead();
      set((state) => ({
        alerts: state.alerts.map((a) => ({ ...a, status: 'read' as const })),
        unreadAlertCount: 0,
      }));
    } catch (error) {
      console.error('Failed to mark all alerts as read:', error);
    }
  },

  resolveAlert: async (id: string, resolution?: string) => {
    try {
      const updatedAlert = await systemApi.resolveAlert(id, { resolution });
      set((state) => ({
        alerts: state.alerts.map((a) => (a.id === id ? updatedAlert : a)),
      }));
    } catch (error) {
      console.error('Failed to resolve alert:', error);
    }
  },

  addToast: (toast) => {
    const id = Math.random().toString(36).substring(7);
    const newToast = { ...toast, id };
    set((state) => ({ toasts: [...state.toasts, newToast] }));
    
    if (toast.duration !== 0) {
      setTimeout(() => {
        get().removeToast(id);
      }, toast.duration || 3000);
    }
  },

  removeToast: (id: string) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  clearToasts: () => {
    set({ toasts: [] });
  },

  toggleSidebar: () => {
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }));
  },

  setSidebarCollapsed: (collapsed: boolean) => {
    set({ sidebarCollapsed: collapsed });
  },

  setTheme: (theme) => {
    set({ theme });
    localStorage.setItem('theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
  },

  toggleTheme: () => {
    const newTheme = get().theme === 'light' ? 'dark' : 'light';
    get().setTheme(newTheme);
  },
}));
