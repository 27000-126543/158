import type { SplitRule, SplitRuleHistory, PaginatedResponse } from '@shared/types';
import { get, post, put, del } from './client';
import { mockSplitRules, generateSplitRuleHistory, delay } from '../utils/mock';

export interface SplitRuleQueryParams {
  page?: number;
  pageSize?: number;
  businessLine?: string;
  status?: string;
}

export const getSplitRules = async (params: SplitRuleQueryParams): Promise<PaginatedResponse<SplitRule>> => {
  try {
    return await get<PaginatedResponse<SplitRule>>('/split-rules', { params });
  } catch {
    const page = params.page || 1;
    const pageSize = params.pageSize || 10;
    
    let filtered = [...mockSplitRules];
    
    if (params.businessLine) {
      filtered = filtered.filter(r => r.businessLine === params.businessLine);
    }
    if (params.status) {
      filtered = filtered.filter(r => r.status === params.status);
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

export const getSplitRuleDetail = async (id: string): Promise<SplitRule> => {
  try {
    return await get<SplitRule>(`/split-rules/${id}`);
  } catch {
    const rule = mockSplitRules.find(r => r.id === id);
    if (!rule) throw new Error('规则不存在');
    return delay(rule);
  }
};

export const createSplitRule = async (data: Partial<SplitRule>): Promise<SplitRule> => {
  try {
    return await post<SplitRule>('/split-rules', data);
  } catch {
    const newRule: SplitRule = {
      id: `rule_${Date.now()}`,
      businessLine: data.businessLine || 'ecommerce',
      ratios: data.ratios || { company: 0.5, platform: 0.3, service: 0.2 },
      effectiveDate: data.effectiveDate || new Date(),
      status: 'draft',
      version: 1,
      createdBy: 'user-1',
      createdAt: new Date(),
      ...data,
    } as SplitRule;
    return delay(newRule);
  }
};

export const updateSplitRule = async (id: string, data: Partial<SplitRule>): Promise<SplitRule> => {
  try {
    return await put<SplitRule>(`/split-rules/${id}`, data);
  } catch {
    const rule = mockSplitRules.find(r => r.id === id);
    if (!rule) throw new Error('规则不存在');
    return delay({ ...rule, ...data, version: rule.version + 1 });
  }
};

export const deleteSplitRule = async (id: string): Promise<void> => {
  try {
    await del<void>(`/split-rules/${id}`);
  } catch {
    return delay(undefined);
  }
};

export const getSplitRuleHistory = async (ruleId: string): Promise<SplitRuleHistory[]> => {
  try {
    return await get<SplitRuleHistory[]>(`/split-rules/${ruleId}/history`);
  } catch {
    return delay(generateSplitRuleHistory(ruleId));
  }
};

export const submitForApproval = async (id: string): Promise<SplitRule> => {
  try {
    return await post<SplitRule>(`/split-rules/${id}/submit`);
  } catch {
    const rule = mockSplitRules.find(r => r.id === id);
    if (!rule) throw new Error('规则不存在');
    return delay({ ...rule, status: 'pending_approval' });
  }
};
