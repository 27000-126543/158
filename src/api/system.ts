import type { User, SystemAlert, OperationLog, TaskInfo, PaginatedResponse } from '@shared/types';
import { get, post, put, del } from './client';
import { mockUsers, mockAlerts, mockLogs, generateId, delay } from '../utils/mock';

export interface UserQueryParams {
  page?: number;
  pageSize?: number;
  role?: string;
  keyword?: string;
}

export const getUsers = async (params: UserQueryParams): Promise<PaginatedResponse<User>> => {
  try {
    return await get<PaginatedResponse<User>>('/system/users', { params });
  } catch {
    const page = params.page || 1;
    const pageSize = params.pageSize || 10;
    
    let filtered = [...mockUsers];
    
    if (params.role) {
      filtered = filtered.filter(u => u.role === params.role);
    }
    if (params.keyword) {
      filtered = filtered.filter(u => 
        u.username.includes(params.keyword!) || 
        u.realName.includes(params.keyword!) ||
        u.email.includes(params.keyword!)
      );
    }
    
    const start = (page - 1) * pageSize;
    const items = filtered.slice(start, start + pageSize);
    
    return delay({
      items,
      total: filtered.length,
      page,
      pageSize,
      totalPages: Math.ceil(filtered.length / pageSize),
    });
  }
};

export const createUser = async (data: Partial<User> & { password: string }): Promise<User> => {
  try {
    return await post<User>('/system/users', data);
  } catch {
    const newUser: User = {
      id: `user_${Date.now()}`,
      username: data.username || '',
      realName: data.realName || '',
      role: data.role || 'finance',
      email: data.email || '',
      phone: data.phone || '',
      createdAt: new Date(),
    };
    return delay(newUser);
  }
};

export const updateUser = async (id: string, data: Partial<User>): Promise<User> => {
  try {
    return await put<User>(`/system/users/${id}`, data);
  } catch {
    const user = mockUsers.find(u => u.id === id);
    if (!user) throw new Error('用户不存在');
    return delay({ ...user, ...data });
  }
};

export const deleteUser = async (id: string): Promise<void> => {
  try {
    await del<void>(`/system/users/${id}`);
  } catch {
    return delay(undefined);
  }
};

export const resetUserPassword = async (id: string, data: { newPassword: string }): Promise<void> => {
  try {
    await post<void>(`/system/users/${id}/reset-password`, data);
  } catch {
    return delay(undefined);
  }
};

export const getAlerts = async (params: {
  page?: number;
  pageSize?: number;
  level?: string;
  type?: string;
  status?: string;
}): Promise<PaginatedResponse<SystemAlert>> => {
  try {
    return await get<PaginatedResponse<SystemAlert>>('/system/alerts', { params });
  } catch {
    const page = params.page || 1;
    const pageSize = params.pageSize || 10;
    
    let filtered = [...mockAlerts];
    
    if (params.level) {
      filtered = filtered.filter(a => a.level === params.level);
    }
    if (params.type) {
      filtered = filtered.filter(a => a.type === params.type);
    }
    if (params.status) {
      filtered = filtered.filter(a => a.status === params.status);
    }
    
    const start = (page - 1) * pageSize;
    const items = filtered.slice(start, start + pageSize);
    
    return delay({
      items,
      total: filtered.length,
      page,
      pageSize,
      totalPages: Math.ceil(filtered.length / pageSize),
    });
  }
};

export const markAlertAsRead = async (id: string): Promise<SystemAlert> => {
  try {
    return await post<SystemAlert>(`/system/alerts/${id}/read`);
  } catch {
    const alert = mockAlerts.find(a => a.id === id);
    if (!alert) throw new Error('告警不存在');
    return delay({ ...alert, status: 'read' });
  }
};

export const markAllAlertsAsRead = async (): Promise<void> => {
  try {
    await post<void>('/system/alerts/read-all');
  } catch {
    return delay(undefined);
  }
};

export const resolveAlert = async (id: string, data: { resolution?: string }): Promise<SystemAlert> => {
  try {
    return await post<SystemAlert>(`/system/alerts/${id}/resolve`, data);
  } catch {
    const alert = mockAlerts.find(a => a.id === id);
    if (!alert) throw new Error('告警不存在');
    return delay({ ...alert, status: 'resolved' });
  }
};

export const getUnreadAlertCount = async (): Promise<{ count: number }> => {
  try {
    return await get<{ count: number }>('/system/alerts/unread-count');
  } catch {
    return delay({
      count: mockAlerts.filter(a => a.status === 'unread').length,
    });
  }
};

export const getOperationLogs = async (params: {
  page?: number;
  pageSize?: number;
  userId?: string;
  module?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
}): Promise<PaginatedResponse<OperationLog>> => {
  try {
    return await get<PaginatedResponse<OperationLog>>('/system/operation-logs', { params });
  } catch {
    const page = params.page || 1;
    const pageSize = params.pageSize || 10;
    
    let filtered = [...mockLogs];
    
    if (params.userId) {
      filtered = filtered.filter(l => l.userId === params.userId);
    }
    if (params.module) {
      filtered = filtered.filter(l => l.module === params.module);
    }
    if (params.action) {
      filtered = filtered.filter(l => l.action === params.action);
    }
    if (params.startDate) {
      filtered = filtered.filter(l => new Date(l.createdAt) >= new Date(params.startDate!));
    }
    if (params.endDate) {
      filtered = filtered.filter(l => new Date(l.createdAt) <= new Date(params.endDate!));
    }
    
    const start = (page - 1) * pageSize;
    const items = filtered.slice(start, start + pageSize);
    
    return delay({
      items,
      total: filtered.length,
      page,
      pageSize,
      totalPages: Math.ceil(filtered.length / pageSize),
    });
  }
};

const mockTaskInfos: TaskInfo[] = [
  {
    id: generateId(),
    name: '采购订单同步',
    cronExpression: '0 0 * * *',
    lastRunAt: new Date(Date.now() - 3600000),
    nextRunAt: new Date(Date.now() + 3600000),
    status: 'idle',
    lastStatus: 'success',
    description: '定时同步采购订单数据',
  },
  {
    id: generateId(),
    name: '供应商绩效计算',
    cronExpression: '0 2 * * 1',
    lastRunAt: new Date(Date.now() - 86400000),
    nextRunAt: new Date(Date.now() + 604800000),
    status: 'idle',
    lastStatus: 'success',
    description: '每周一计算供应商绩效评分',
  },
  {
    id: generateId(),
    name: '月度报表生成',
    cronExpression: '0 3 1 * *',
    lastRunAt: new Date(Date.now() - 2592000000),
    nextRunAt: new Date(Date.now() + 604800000),
    status: 'idle',
    lastStatus: 'success',
    description: '每月1日生成上月采购报表',
  },
  {
    id: generateId(),
    name: '付款提醒',
    cronExpression: '0 9 * * *',
    lastRunAt: new Date(Date.now() - 3600000),
    nextRunAt: new Date(Date.now() + 82800000),
    status: 'running',
    lastStatus: 'success',
    description: '每日发送即将到期的付款提醒',
  },
];

export const getTasks = async (): Promise<TaskInfo[]> => {
  try {
    return await get<TaskInfo[]>('/system/tasks');
  } catch {
    return delay(mockTaskInfos);
  }
};

export const runTask = async (taskId: string): Promise<{ success: boolean; message: string }> => {
  try {
    return await post<{ success: boolean; message: string }>(`/system/tasks/${taskId}/run`);
  } catch {
    return delay({ success: true, message: '任务已启动' });
  }
};

export const getSystemConfig = async (): Promise<Record<string, unknown>> => {
  try {
    return await get<Record<string, unknown>>('/system/config');
  } catch {
    return delay({
      purchaseOrderPrefix: 'PO',
      paymentApprovalThreshold1: 50000,
      paymentApprovalThreshold2: 500000,
      alertEmail: 'admin@company.com',
      maxFileSize: 10 * 1024 * 1024,
      allowedFileTypes: ['.xlsx', '.xls', '.csv', '.pdf'],
      defaultCurrency: 'CNY',
      autoGenerateReport: true,
      supplierPerformanceWeights: {
        quality: 0.4,
        delivery: 0.3,
        price: 0.2,
        service: 0.1,
      },
    });
  }
};

export const updateSystemConfig = async (config: Record<string, unknown>): Promise<Record<string, unknown>> => {
  try {
    return await post<Record<string, unknown>>('/system/config', config);
  } catch {
    return delay(config);
  }
};
