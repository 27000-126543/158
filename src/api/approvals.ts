import type { ApprovalFlow, PaginatedResponse } from '@shared/types';
import { get, post } from './client';
import { mockApprovalFlows, delay } from '../utils/mock';

export interface ApprovalQueryParams {
  page?: number;
  pageSize?: number;
  type?: string;
  status?: string;
  applicantId?: string;
  approverId?: string;
  startDate?: string;
  endDate?: string;
}

export const getApprovalFlows = async (params: ApprovalQueryParams): Promise<PaginatedResponse<ApprovalFlow>> => {
  try {
    return await get<PaginatedResponse<ApprovalFlow>>('/approvals', { params });
  } catch {
    const page = params.page || 1;
    const pageSize = params.pageSize || 10;
    
    let filtered = [...mockApprovalFlows];
    
    if (params.type) {
      filtered = filtered.filter(f => f.type === params.type);
    }
    if (params.status) {
      filtered = filtered.filter(f => f.status === params.status);
    }
    if (params.startDate) {
      filtered = filtered.filter(f => new Date(f.createdAt) >= new Date(params.startDate!));
    }
    if (params.endDate) {
      filtered = filtered.filter(f => new Date(f.createdAt) <= new Date(params.endDate!));
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

export const getApprovalDetail = async (id: string): Promise<ApprovalFlow> => {
  try {
    return await get<ApprovalFlow>(`/approvals/${id}`);
  } catch {
    const flow = mockApprovalFlows.find(f => f.id === id);
    if (!flow) throw new Error('审批流不存在');
    return delay(flow);
  }
};

export const getMyApprovals = async (params: { status?: string; page?: number; pageSize?: number }): Promise<PaginatedResponse<ApprovalFlow>> => {
  try {
    return await get<PaginatedResponse<ApprovalFlow>>('/approvals/my', { params });
  } catch {
    const page = params.page || 1;
    const pageSize = params.pageSize || 10;
    
    let filtered = mockApprovalFlows.filter(f => f.status === 'pending');
    
    if (params.status) {
      filtered = mockApprovalFlows.filter(f => f.status === params.status);
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

export const getMyApplications = async (params: { status?: string; page?: number; pageSize?: number }): Promise<PaginatedResponse<ApprovalFlow>> => {
  try {
    return await get<PaginatedResponse<ApprovalFlow>>('/approvals/my-applications', { params });
  } catch {
    const page = params.page || 1;
    const pageSize = params.pageSize || 10;
    
    let filtered = [...mockApprovalFlows];
    
    if (params.status) {
      filtered = filtered.filter(f => f.status === params.status);
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

export const approve = async (flowId: string, nodeId: string, data: { comment?: string }): Promise<ApprovalFlow> => {
  try {
    return await post<ApprovalFlow>(`/approvals/${flowId}/nodes/${nodeId}/approve`, data);
  } catch {
    const flow = mockApprovalFlows.find(f => f.id === flowId);
    if (!flow) throw new Error('审批流不存在');
    
    const node = flow.nodes.find(n => n.id === nodeId);
    if (node) {
      node.status = 'approved';
      node.comment = data.comment || '同意';
      node.approvedAt = new Date();
      
      const nextNode = flow.nodes.find(n => n.level === node.level + 1);
      if (nextNode) {
        flow.currentNode = node.level + 1;
      } else {
        flow.status = 'approved';
        flow.currentNode = flow.nodes.length;
      }
    }
    
    return delay(flow);
  }
};

export const reject = async (flowId: string, nodeId: string, data: { comment: string }): Promise<ApprovalFlow> => {
  try {
    return await post<ApprovalFlow>(`/approvals/${flowId}/nodes/${nodeId}/reject`, data);
  } catch {
    const flow = mockApprovalFlows.find(f => f.id === flowId);
    if (!flow) throw new Error('审批流不存在');
    
    const node = flow.nodes.find(n => n.id === nodeId);
    if (node) {
      node.status = 'rejected';
      node.comment = data.comment;
      node.approvedAt = new Date();
      flow.status = 'rejected';
    }
    
    return delay(flow);
  }
};

export const withdraw = async (flowId: string, data: { reason?: string }): Promise<ApprovalFlow> => {
  try {
    return await post<ApprovalFlow>(`/approvals/${flowId}/withdraw`, data);
  } catch {
    const flow = mockApprovalFlows.find(f => f.id === flowId);
    if (!flow) throw new Error('审批流不存在');
    return delay({ ...flow, status: 'rejected' });
  }
};

export const createApproval = async (data: {
  type: string;
  relatedId: string;
  reason: string;
}): Promise<ApprovalFlow> => {
  try {
    return await post<ApprovalFlow>('/approvals', data);
  } catch {
    const newFlow: ApprovalFlow = {
      id: `approval_${Date.now()}`,
      type: data.type as any,
      status: 'pending',
      currentNode: 0,
      relatedId: data.relatedId,
      nodes: [],
      createdAt: new Date(),
    };
    return delay(newFlow);
  }
};

export const getApprovalCount = async (): Promise<{ pending: number; approved: number; rejected: number }> => {
  try {
    return await get<{ pending: number; approved: number; rejected: number }>('/approvals/count');
  } catch {
    return delay({
      pending: mockApprovalFlows.filter(f => f.status === 'pending').length,
      approved: mockApprovalFlows.filter(f => f.status === 'approved').length,
      rejected: mockApprovalFlows.filter(f => f.status === 'rejected').length,
    });
  }
};
