import type { Supplier, PurchaseRequirement } from '@shared/types';
import { get, post } from './client';
import { mockSuppliers, mockRequirements, delay } from '../utils/mock';

export interface RecommendResult {
  supplier: Supplier;
  matchScore: number;
  priceRange: { min: number; max: number };
  deliveryCycle: number;
  historicalOrders: number;
  historicalAmount: number;
  qualityPassRate: number;
  satisfactionScore: number;
  recommendReason: string[];
}

export interface RecommendQueryParams {
  requirementId: string;
  sortBy?: 'match' | 'price' | 'delivery' | 'quality';
  sortOrder?: 'asc' | 'desc';
}

const generateRecommendReason = (supplier: Supplier, requirement: PurchaseRequirement): string[] => {
  const reasons: string[] = [];
  
  if (supplier.category === requirement.category) {
    reasons.push('品类完全匹配，专业对口');
  }
  
  if (supplier.performanceLevel === 'excellent') {
    reasons.push('绩效等级优秀，历史合作评价高');
  } else if (supplier.performanceLevel === 'good') {
    reasons.push('绩效等级良好，合作稳定');
  }
  
  if (supplier.onTimeDeliveryRate >= 0.95) {
    reasons.push(`按时交货率${(supplier.onTimeDeliveryRate * 100).toFixed(1)}%，交货有保障`);
  }
  
  if (supplier.qualityPassRate >= 0.98) {
    reasons.push(`质量合格率${(supplier.qualityPassRate * 100).toFixed(1)}%，品质可靠`);
  }
  
  if (supplier.totalOrders >= 100) {
    reasons.push(`历史合作${supplier.totalOrders}次，经验丰富`);
  }
  
  if (supplier.creditRating >= 90) {
    reasons.push(`信用评分${supplier.creditRating}分，信誉良好`);
  }
  
  if (supplier.satisfactionScore >= 4.7) {
    reasons.push(`满意度评分${supplier.satisfactionScore.toFixed(1)}，客户评价好`);
  }
  
  if (reasons.length < 2) {
    reasons.push('符合采购需求基本条件');
  }
  
  return reasons.slice(0, 4);
};

export const getRecommendations = async (params: RecommendQueryParams): Promise<RecommendResult[]> => {
  try {
    return await get<RecommendResult[]>('/recommendations', { params });
  } catch {
    const requirement = mockRequirements.find(r => r.id === params.requirementId) || mockRequirements[0];
    
    const results: RecommendResult[] = mockSuppliers
      .filter(s => s.status === 'active')
      .map(supplier => {
        let matchScore = 60 + Math.random() * 35;
        
        if (supplier.category === requirement.category) {
          matchScore += 15;
        }
        if (supplier.performanceLevel === 'excellent') {
          matchScore += 10;
        } else if (supplier.performanceLevel === 'good') {
          matchScore += 5;
        }
        matchScore += (supplier.creditRating - 80) * 0.2;
        matchScore += (supplier.satisfactionScore - 4) * 5;
        
        matchScore = Math.min(99, Math.max(60, matchScore));
        
        const basePrice = requirement.budget / requirement.quantity;
        const priceVariance = 0.1 + Math.random() * 0.2;
        
        return {
          supplier,
          matchScore: Math.round(matchScore * 10) / 10,
          priceRange: {
            min: Math.round(basePrice * (1 - priceVariance)),
            max: Math.round(basePrice * (1 + priceVariance)),
          },
          deliveryCycle: 3 + Math.floor(Math.random() * 15),
          historicalOrders: supplier.totalOrders,
          historicalAmount: supplier.totalAmount,
          qualityPassRate: supplier.qualityPassRate,
          satisfactionScore: supplier.satisfactionScore,
          recommendReason: generateRecommendReason(supplier, requirement),
        };
      });
    
    if (params.sortBy) {
      results.sort((a, b) => {
        let comparison = 0;
        switch (params.sortBy) {
          case 'match':
            comparison = a.matchScore - b.matchScore;
            break;
          case 'price':
            comparison = a.priceRange.min - b.priceRange.min;
            break;
          case 'delivery':
            comparison = a.deliveryCycle - b.deliveryCycle;
            break;
          case 'quality':
            comparison = a.qualityPassRate - b.qualityPassRate;
            break;
        }
        return params.sortOrder === 'asc' ? comparison : -comparison;
      });
    } else {
      results.sort((a, b) => b.matchScore - a.matchScore);
    }
    
    return delay(results);
  }
};

export const getRequirementsForRecommend = async (): Promise<PurchaseRequirement[]> => {
  try {
    return await get<PurchaseRequirement[]>('/recommendations/requirements');
  } catch {
    const validRequirements = mockRequirements.filter(
      r => r.status === 'approved' || r.status === 'inquiry_sent' || r.status === 'quoting'
    );
    return delay(validRequirements.slice(0, 20));
  }
};

export const addToComparison = async (supplierIds: string[], requirementId: string): Promise<void> => {
  try {
    await post('/recommendations/comparison', { supplierIds, requirementId });
  } catch {
    return delay(undefined);
  }
};

export const createInquiryFromRecommend = async (requirementId: string, supplierIds: string[]): Promise<void> => {
  try {
    await post('/recommendations/inquiry', { requirementId, supplierIds });
  } catch {
    return delay(undefined);
  }
};
