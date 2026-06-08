import { create } from 'zustand';
import type { User, SystemAlert, OperationLog, TaskInfo, PaginatedResponse } from '@shared/types';
import * as systemApi from '../api/system';
import type { UserQueryParams } from '../api/system';

interface SystemState {
  users: User[];
  usersTotal: number;
  usersPage: number;
  usersPageSize: number;
  usersTotalPages: number;
  userFilters: UserQueryParams;

  alerts: SystemAlert[];
  alertsTotal: number;
  alertsPage: number;
  alertsPageSize: number;
  alertsTotalPages: number;
  alertFilters: {
    page?: number;
    pageSize?: number;
    level?: string;
    type?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  };
  unreadAlertCount: number;

  operationLogs: OperationLog[];
  logsTotal: number;
  logsPage: number;
  logsPageSize: number;
  logsTotalPages: number;
  logFilters: {
    page?: number;
    pageSize?: number;
    userId?: string;
    module?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
  };

  tasks: TaskInfo[];
  taskLogs: { taskId: string; logs: string[] }[];

  loading: boolean;
  error: string | null;

  fetchUsers: (params?: UserQueryParams) => Promise<void>;
  createUser: (data: Partial<User> & { password: string }) => Promise<User>;
  updateUser: (id: string, data: Partial<User>) => Promise<User>;
  deleteUser: (id: string) => Promise<void>;
  resetUserPassword: (id: string, newPassword: string) => Promise<void>;
  setUserFilters: (filters: Partial<UserQueryParams>) => void;
  resetUserFilters: () => void;

  fetchAlerts: (params?: {
    page?: number;
    pageSize?: number;
    level?: string;
    type?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }) => Promise<void>;
  markAlertAsRead: (id: string) => Promise<void>;
  markAllAlertsAsRead: () => Promise<void>;
  resolveAlert: (id: string, resolution?: string) => Promise<void>;
  fetchUnreadAlertCount: () => Promise<void>;
  setAlertFilters: (filters: Partial<SystemState['alertFilters']>) => void;
  resetAlertFilters: () => void;
  batchMarkAsRead: (ids: string[]) => Promise<void>;
  batchResolve: (ids: string[]) => Promise<void>;

  fetchOperationLogs: (params?: {
    page?: number;
    pageSize?: number;
    userId?: string;
    module?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
  }) => Promise<void>;
  setLogFilters: (filters: Partial<SystemState['logFilters']>) => void;
  resetLogFilters: () => void;
  exportLogs: () => Promise<void>;

  fetchTasks: () => Promise<void>;
  runTask: (taskId: string) => Promise<{ success: boolean; message: string }>;
  toggleTask: (taskId: string) => Promise<void>;
  fetchTaskLogs: (taskId: string) => Promise<string[]>;

  clearError: () => void;
}

const defaultUserFilters: UserQueryParams = {
  page: 1,
  pageSize: 10,
};

const defaultAlertFilters: SystemState['alertFilters'] = {
  page: 1,
  pageSize: 10,
};

const defaultLogFilters: SystemState['logFilters'] = {
  page: 1,
  pageSize: 10,
};

export const useSystemStore = create<SystemState>((set, get) => ({
  users: [],
  usersTotal: 0,
  usersPage: 1,
  usersPageSize: 10,
  usersTotalPages: 0,
  userFilters: defaultUserFilters,

  alerts: [],
  alertsTotal: 0,
  alertsPage: 1,
  alertsPageSize: 10,
  alertsTotalPages: 0,
  alertFilters: defaultAlertFilters,
  unreadAlertCount: 0,

  operationLogs: [],
  logsTotal: 0,
  logsPage: 1,
  logsPageSize: 10,
  logsTotalPages: 0,
  logFilters: defaultLogFilters,

  tasks: [],
  taskLogs: [],

  loading: false,
  error: null,

  fetchUsers: async (params) => {
    set({ loading: true, error: null });
    const currentFilters = { ...get().userFilters, ...params };
    try {
      const response: PaginatedResponse<User> = await systemApi.getUsers(currentFilters);
      set({
        users: response.items,
        usersTotal: response.total,
        usersPage: response.page,
        usersPageSize: response.pageSize,
        usersTotalPages: response.totalPages,
        userFilters: currentFilters,
        loading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '获取用户列表失败',
        loading: false,
      });
    }
  },

  createUser: async (data) => {
    set({ loading: true, error: null });
    try {
      const newUser = await systemApi.createUser(data);
      set((state) => ({
        users: [newUser, ...state.users],
        usersTotal: state.usersTotal + 1,
        loading: false,
      }));
      return newUser;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '创建用户失败',
        loading: false,
      });
      throw error;
    }
  },

  updateUser: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const updatedUser = await systemApi.updateUser(id, data);
      set((state) => ({
        users: state.users.map((u) => (u.id === id ? updatedUser : u)),
        loading: false,
      }));
      return updatedUser;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '更新用户失败',
        loading: false,
      });
      throw error;
    }
  },

  deleteUser: async (id) => {
    set({ loading: true, error: null });
    try {
      await systemApi.deleteUser(id);
      set((state) => ({
        users: state.users.filter((u) => u.id !== id),
        usersTotal: state.usersTotal - 1,
        loading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '删除用户失败',
        loading: false,
      });
      throw error;
    }
  },

  resetUserPassword: async (id, newPassword) => {
    set({ loading: true, error: null });
    try {
      await systemApi.resetUserPassword(id, { newPassword });
      set({ loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '重置密码失败',
        loading: false,
      });
      throw error;
    }
  },

  setUserFilters: (filters) => {
    set((state) => ({
      userFilters: { ...state.userFilters, ...filters, page: 1 },
    }));
  },

  resetUserFilters: () => {
    set({ userFilters: defaultUserFilters });
  },

  fetchAlerts: async (params) => {
    set({ loading: true, error: null });
    const currentFilters = { ...get().alertFilters, ...params };
    try {
      const response: PaginatedResponse<SystemAlert> = await systemApi.getAlerts(currentFilters);
      set({
        alerts: response.items,
        alertsTotal: response.total,
        alertsPage: response.page,
        alertsPageSize: response.pageSize,
        alertsTotalPages: response.totalPages,
        alertFilters: currentFilters,
        loading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '获取告警列表失败',
        loading: false,
      });
    }
  },

  markAlertAsRead: async (id) => {
    try {
      const updatedAlert = await systemApi.markAlertAsRead(id);
      set((state) => ({
        alerts: state.alerts.map((a) => (a.id === id ? updatedAlert : a)),
        unreadAlertCount: Math.max(0, state.unreadAlertCount - 1),
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '标记已读失败',
      });
      throw error;
    }
  },

  markAllAlertsAsRead: async () => {
    try {
      await systemApi.markAllAlertsAsRead();
      set((state) => ({
        alerts: state.alerts.map((a) => ({ ...a, status: 'read' })),
        unreadAlertCount: 0,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '标记全部已读失败',
      });
      throw error;
    }
  },

  resolveAlert: async (id, resolution) => {
    try {
      const updatedAlert = await systemApi.resolveAlert(id, { resolution });
      set((state) => ({
        alerts: state.alerts.map((a) => (a.id === id ? updatedAlert : a)),
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '标记解决失败',
      });
      throw error;
    }
  },

  fetchUnreadAlertCount: async () => {
    try {
      const response = await systemApi.getUnreadAlertCount();
      set({ unreadAlertCount: response.count });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '获取未读告警数失败',
      });
    }
  },

  setAlertFilters: (filters) => {
    set((state) => ({
      alertFilters: { ...state.alertFilters, ...filters, page: 1 },
    }));
  },

  resetAlertFilters: () => {
    set({ alertFilters: defaultAlertFilters });
  },

  batchMarkAsRead: async (ids) => {
    try {
      await Promise.all(ids.map((id) => systemApi.markAlertAsRead(id)));
      set((state) => ({
        alerts: state.alerts.map((a) =>
          ids.includes(a.id) ? { ...a, status: 'read' } : a
        ),
        unreadAlertCount: Math.max(0, state.unreadAlertCount - ids.length),
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '批量标记已读失败',
      });
      throw error;
    }
  },

  batchResolve: async (ids) => {
    try {
      await Promise.all(ids.map((id) => systemApi.resolveAlert(id, {})));
      set((state) => ({
        alerts: state.alerts.map((a) =>
          ids.includes(a.id) ? { ...a, status: 'resolved' } : a
        ),
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '批量标记解决失败',
      });
      throw error;
    }
  },

  fetchOperationLogs: async (params) => {
    set({ loading: true, error: null });
    const currentFilters = { ...get().logFilters, ...params };
    try {
      const response: PaginatedResponse<OperationLog> = await systemApi.getOperationLogs(currentFilters);
      set({
        operationLogs: response.items,
        logsTotal: response.total,
        logsPage: response.page,
        logsPageSize: response.pageSize,
        logsTotalPages: response.totalPages,
        logFilters: currentFilters,
        loading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '获取操作日志失败',
        loading: false,
      });
    }
  },

  setLogFilters: (filters) => {
    set((state) => ({
      logFilters: { ...state.logFilters, ...filters, page: 1 },
    }));
  },

  resetLogFilters: () => {
    set({ logFilters: defaultLogFilters });
  },

  exportLogs: async () => {
    try {
      const currentFilters = get().logFilters;
      const allLogs = await systemApi.getOperationLogs({
        ...currentFilters,
        pageSize: 99999,
      });
      
      const exportData = allLogs.items.map((log) => ({
        操作时间: new Date(log.createdAt).toLocaleString(),
        用户ID: log.userId,
        模块: log.module,
        操作: log.action,
        资源ID: log.resourceId || '-',
        IP地址: log.ipAddress || '-',
        详情: JSON.stringify(log.details || {}),
      }));
      
      const csvContent = [
        Object.keys(exportData[0]).join(','),
        ...exportData.map((row) =>
          Object.values(row).map((val) => `"${String(val).replace(/"/g, '""')}"`).join(',')
        ),
      ].join('\n');
      
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `操作日志_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '导出日志失败',
      });
      throw error;
    }
  },

  fetchTasks: async () => {
    set({ loading: true, error: null });
    try {
      const tasks = await systemApi.getTasks();
      set({ tasks, loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '获取任务列表失败',
        loading: false,
      });
    }
  },

  runTask: async (taskId) => {
    try {
      const result = await systemApi.runTask(taskId);
      set((state) => ({
        tasks: state.tasks.map((t) =>
          t.id === taskId ? { ...t, status: 'running' } : t
        ),
      }));
      return result;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '执行任务失败',
      });
      throw error;
    }
  },

  toggleTask: async (taskId) => {
    try {
      set((state) => ({
        tasks: state.tasks.map((t) =>
          t.id === taskId
            ? { ...t, status: t.status === 'idle' ? 'running' : 'idle' }
            : t
        ),
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '切换任务状态失败',
      });
      throw error;
    }
  },

  fetchTaskLogs: async (taskId) => {
    const mockLogs = [
      `[${new Date().toLocaleString()}] INFO 任务开始执行`,
      `[${new Date().toLocaleString()}] INFO 加载配置...`,
      `[${new Date().toLocaleString()}] INFO 正在处理数据...`,
      `[${new Date().toLocaleString()}] DEBUG 处理记录 1/100`,
      `[${new Date().toLocaleString()}] DEBUG 处理记录 50/100`,
      `[${new Date().toLocaleString()}] DEBUG 处理记录 100/100`,
      `[${new Date().toLocaleString()}] INFO 数据处理完成`,
      `[${new Date().toLocaleString()}] INFO 任务执行成功`,
    ];

    set((state) => ({
      taskLogs: [
        ...state.taskLogs.filter((tl) => tl.taskId !== taskId),
        { taskId, logs: mockLogs },
      ],
    }));

    return mockLogs;
  },

  clearError: () => {
    set({ error: null });
  },
}));
