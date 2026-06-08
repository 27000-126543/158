import { create } from 'zustand';
import type { ApprovalFlow, PaginatedResponse } from '@shared/types';
import * as approvalsApi from '../api/approvals';
import type { ApprovalQueryParams } from '../api/approvals';

interface ApprovalsState {
  pendingApprovals: ApprovalFlow[];
  myApplications: ApprovalFlow[];
  ccApprovals: ApprovalFlow[];
  currentApproval: ApprovalFlow | null;
  selectedRowKeys: string[];
  approvalCount: {
    pending: number;
    approved: number;
    rejected: number;
  } | null;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
  filters: ApprovalQueryParams;
  activeTab: 'pending' | 'my' | 'cc';

  fetchPendingApprovals: (params?: ApprovalQueryParams) => Promise<void>;
  fetchMyApplications: (params?: ApprovalQueryParams) => Promise<void>;
  fetchCcApprovals: (params?: ApprovalQueryParams) => Promise<void>;
  fetchApprovalDetail: (id: string) => Promise<void>;
  fetchApprovalCount: () => Promise<void>;
  approve: (flowId: string, nodeId: string, comment?: string) => Promise<ApprovalFlow>;
  reject: (flowId: string, nodeId: string, comment: string) => Promise<ApprovalFlow>;
  batchApprove: (flowIds: string[], comment?: string) => Promise<void>;
  batchReject: (flowIds: string[], comment: string) => Promise<void>;
  withdraw: (flowId: string, reason?: string) => Promise<ApprovalFlow>;

  setFilters: (filters: Partial<ApprovalQueryParams>) => void;
  resetFilters: () => void;
  setSelectedRowKeys: (keys: string[]) => void;
  setActiveTab: (tab: 'pending' | 'my' | 'cc') => void;
  setCurrentApproval: (approval: ApprovalFlow | null) => void;
  clearError: () => void;
}

const defaultFilters: ApprovalQueryParams = {
  page: 1,
  pageSize: 10,
};

export const useApprovalsStore = create<ApprovalsState>((set, get) => ({
  pendingApprovals: [],
  myApplications: [],
  ccApprovals: [],
  currentApproval: null,
  selectedRowKeys: [],
  approvalCount: null,
  total: 0,
  page: 1,
  pageSize: 10,
  totalPages: 0,
  loading: false,
  error: null,
  filters: defaultFilters,
  activeTab: 'pending',

  fetchPendingApprovals: async (params) => {
    set({ loading: true, error: null });
    const currentFilters = { ...get().filters, ...params };
    try {
      const response: PaginatedResponse<ApprovalFlow> = await approvalsApi.getMyApprovals({
        status: 'pending',
        ...currentFilters,
      });
      set({
        pendingApprovals: response.items,
        total: response.total,
        page: response.page,
        pageSize: response.pageSize,
        totalPages: response.totalPages,
        filters: currentFilters,
        loading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '获取待审批列表失败',
        loading: false,
      });
    }
  },

  fetchMyApplications: async (params) => {
    set({ loading: true, error: null });
    const currentFilters = { ...get().filters, ...params };
    try {
      const response: PaginatedResponse<ApprovalFlow> = await approvalsApi.getMyApplications(currentFilters);
      set({
        myApplications: response.items,
        total: response.total,
        page: response.page,
        pageSize: response.pageSize,
        totalPages: response.totalPages,
        filters: currentFilters,
        loading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '获取我发起的审批失败',
        loading: false,
      });
    }
  },

  fetchCcApprovals: async (params) => {
    set({ loading: true, error: null });
    const currentFilters = { ...get().filters, ...params };
    try {
      const response: PaginatedResponse<ApprovalFlow> = await approvalsApi.getApprovalFlows({
        ...currentFilters,
        status: 'approved',
      });
      set({
        ccApprovals: response.items,
        total: response.total,
        page: response.page,
        pageSize: response.pageSize,
        totalPages: response.totalPages,
        filters: currentFilters,
        loading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '获取抄送我的审批失败',
        loading: false,
      });
    }
  },

  fetchApprovalDetail: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const approval = await approvalsApi.getApprovalDetail(id);
      set({ currentApproval: approval, loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '获取审批详情失败',
        loading: false,
      });
      throw error;
    }
  },

  fetchApprovalCount: async () => {
    try {
      const count = await approvalsApi.getApprovalCount();
      set({ approvalCount: count });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '获取审批统计失败',
      });
    }
  },

  approve: async (flowId: string, nodeId: string, comment?: string) => {
    set({ loading: true, error: null });
    try {
      const result = await approvalsApi.approve(flowId, nodeId, { comment });
      set((state) => ({
        currentApproval: state.currentApproval?.id === flowId ? result : state.currentApproval,
        pendingApprovals: state.pendingApprovals.map((a) => (a.id === flowId ? result : a)),
        myApplications: state.myApplications.map((a) => (a.id === flowId ? result : a)),
        ccApprovals: state.ccApprovals.map((a) => (a.id === flowId ? result : a)),
        loading: false,
      }));
      return result;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '审批同意失败',
        loading: false,
      });
      throw error;
    }
  },

  reject: async (flowId: string, nodeId: string, comment: string) => {
    set({ loading: true, error: null });
    try {
      const result = await approvalsApi.reject(flowId, nodeId, { comment });
      set((state) => ({
        currentApproval: state.currentApproval?.id === flowId ? result : state.currentApproval,
        pendingApprovals: state.pendingApprovals.map((a) => (a.id === flowId ? result : a)),
        myApplications: state.myApplications.map((a) => (a.id === flowId ? result : a)),
        ccApprovals: state.ccApprovals.map((a) => (a.id === flowId ? result : a)),
        loading: false,
      }));
      return result;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '审批驳回失败',
        loading: false,
      });
      throw error;
    }
  },

  batchApprove: async (flowIds: string[], comment?: string) => {
    set({ loading: true, error: null });
    try {
      for (const flowId of flowIds) {
        const flow = get().pendingApprovals.find((f) => f.id === flowId);
        if (flow) {
          const currentNode = flow.nodes.find((n) => n.level === flow.currentNode + 1);
          if (currentNode) {
            await approvalsApi.approve(flowId, currentNode.id, { comment });
          }
        }
      }
      set({ selectedRowKeys: [], loading: false });
      await get().fetchPendingApprovals();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '批量审批失败',
        loading: false,
      });
      throw error;
    }
  },

  batchReject: async (flowIds: string[], comment: string) => {
    set({ loading: true, error: null });
    try {
      for (const flowId of flowIds) {
        const flow = get().pendingApprovals.find((f) => f.id === flowId);
        if (flow) {
          const currentNode = flow.nodes.find((n) => n.level === flow.currentNode + 1);
          if (currentNode) {
            await approvalsApi.reject(flowId, currentNode.id, { comment });
          }
        }
      }
      set({ selectedRowKeys: [], loading: false });
      await get().fetchPendingApprovals();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '批量驳回失败',
        loading: false,
      });
      throw error;
    }
  },

  withdraw: async (flowId: string, reason?: string) => {
    set({ loading: true, error: null });
    try {
      const result = await approvalsApi.withdraw(flowId, { reason });
      set((state) => ({
        myApplications: state.myApplications.map((a) => (a.id === flowId ? result : a)),
        loading: false,
      }));
      return result;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '撤回审批失败',
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

  setSelectedRowKeys: (keys) => {
    set({ selectedRowKeys: keys });
  },

  setActiveTab: (tab) => {
    set({ activeTab: tab, selectedRowKeys: [] });
  },

  setCurrentApproval: (approval) => {
    set({ currentApproval: approval });
  },

  clearError: () => {
    set({ error: null });
  },
}));
