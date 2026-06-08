import { create } from 'zustand';
import type { PurchaseRequirement } from '@shared/types';
import * as recommendApi from '../api/recommend';
import type { RecommendResult, RecommendQueryParams } from '../api/recommend';

interface RecommendState {
  recommendations: RecommendResult[];
  requirements: PurchaseRequirement[];
  selectedRequirement: PurchaseRequirement | null;
  comparisonList: string[];
  loading: boolean;
  error: string | null;
  sortBy: 'match' | 'price' | 'delivery' | 'quality';
  sortOrder: 'asc' | 'desc';

  fetchRequirements: () => Promise<void>;
  fetchRecommendations: (requirementId: string) => Promise<void>;
  setSelectedRequirement: (requirement: PurchaseRequirement | null) => void;
  setSort: (sortBy: 'match' | 'price' | 'delivery' | 'quality', sortOrder?: 'asc' | 'desc') => void;
  toggleComparison: (supplierId: string) => void;
  clearComparison: () => void;
  addToComparison: (supplierIds: string[]) => void;
  createInquiry: (requirementId: string, supplierIds: string[]) => Promise<void>;
  clearError: () => void;
}

export const useRecommendStore = create<RecommendState>((set, get) => ({
  recommendations: [],
  requirements: [],
  selectedRequirement: null,
  comparisonList: [],
  loading: false,
  error: null,
  sortBy: 'match',
  sortOrder: 'desc',

  fetchRequirements: async () => {
    set({ loading: true, error: null });
    try {
      const requirements = await recommendApi.getRequirementsForRecommend();
      set({ requirements, loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '获取采购需求失败',
        loading: false,
      });
    }
  },

  fetchRecommendations: async (requirementId: string) => {
    set({ loading: true, error: null });
    try {
      const { sortBy, sortOrder } = get();
      const params: RecommendQueryParams = {
        requirementId,
        sortBy,
        sortOrder,
      };
      const recommendations = await recommendApi.getRecommendations(params);
      set({ recommendations, loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '获取推荐结果失败',
        loading: false,
      });
    }
  },

  setSelectedRequirement: (requirement) => {
    set({ selectedRequirement: requirement, comparisonList: [] });
    if (requirement) {
      get().fetchRecommendations(requirement.id);
    } else {
      set({ recommendations: [] });
    }
  },

  setSort: (sortBy, sortOrder) => {
    const newSortOrder = sortOrder || (get().sortBy === sortBy && get().sortOrder === 'desc' ? 'asc' : 'desc');
    set({ sortBy, sortOrder: newSortOrder });
    const { selectedRequirement } = get();
    if (selectedRequirement) {
      get().fetchRecommendations(selectedRequirement.id);
    }
  },

  toggleComparison: (supplierId) => {
    set((state) => {
      const exists = state.comparisonList.includes(supplierId);
      return {
        comparisonList: exists
          ? state.comparisonList.filter(id => id !== supplierId)
          : [...state.comparisonList, supplierId],
      };
    });
  },

  clearComparison: () => {
    set({ comparisonList: [] });
  },

  addToComparison: (supplierIds) => {
    set((state) => ({
      comparisonList: [...new Set([...state.comparisonList, ...supplierIds])],
    }));
  },

  createInquiry: async (requirementId, supplierIds) => {
    set({ loading: true, error: null });
    try {
      await recommendApi.createInquiryFromRecommend(requirementId, supplierIds);
      set({ loading: false, comparisonList: [] });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '创建询价失败',
        loading: false,
      });
      throw error;
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));
