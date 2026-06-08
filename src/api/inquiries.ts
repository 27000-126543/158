import type { Inquiry, Quote, ComparisonReport, PaginatedResponse } from '@shared/types';
import { get, post, put } from './client';
import { mockInquiries, mockQuotes, mockComparisonReports, delay } from '../utils/mock';

export interface InquiryQueryParams {
  page?: number;
  pageSize?: number;
  category?: string;
  status?: string;
  createdById?: string;
  startDate?: string;
  endDate?: string;
  keyword?: string;
}

export const getInquiryList = async (params: InquiryQueryParams): Promise<PaginatedResponse<Inquiry>> => {
  try {
    return await get<PaginatedResponse<Inquiry>>('/inquiries', { params });
  } catch {
    const page = params.page || 1;
    const pageSize = params.pageSize || 10;
    
    let filtered = [...mockInquiries];
    
    if (params.category) {
      filtered = filtered.filter(i => i.category === params.category);
    }
    if (params.status) {
      filtered = filtered.filter(i => i.status === params.status);
    }
    if (params.createdById) {
      filtered = filtered.filter(i => i.createdById === params.createdById);
    }
    if (params.keyword) {
      filtered = filtered.filter(i => 
        i.inquiryNo.includes(params.keyword!) || 
        i.title.includes(params.keyword!) ||
        i.itemName.includes(params.keyword!)
      );
    }
    if (params.startDate) {
      filtered = filtered.filter(i => new Date(i.createdAt) >= new Date(params.startDate!));
    }
    if (params.endDate) {
      filtered = filtered.filter(i => new Date(i.createdAt) <= new Date(params.endDate!));
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

export const getInquiryDetail = async (id: string): Promise<Inquiry> => {
  try {
    return await get<Inquiry>(`/inquiries/${id}`);
  } catch {
    const inquiry = mockInquiries.find(i => i.id === id);
    if (!inquiry) throw new Error('询价单不存在');
    return delay(inquiry);
  }
};

export const createInquiry = async (data: Partial<Inquiry>): Promise<Inquiry> => {
  try {
    return await post<Inquiry>('/inquiries', data);
  } catch {
    const newInquiry: Inquiry = {
      id: `inq_${Date.now()}`,
      inquiryNo: `INQ-${Date.now().toString().slice(-8)}`,
      requirementId: data.requirementId || '',
      title: data.title || '',
      category: data.category || 'office_supplies',
      itemName: data.itemName || '',
      specification: data.specification || '',
      quantity: data.quantity || 1,
      unit: data.unit || 'piece',
      description: data.description,
      supplierIds: data.supplierIds || [],
      deadline: data.deadline || new Date(),
      status: 'draft',
      createdById: data.createdById || 'user_001',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data,
    } as Inquiry;
    return delay(newInquiry);
  }
};

export const updateInquiry = async (id: string, data: Partial<Inquiry>): Promise<Inquiry> => {
  try {
    return await put<Inquiry>(`/inquiries/${id}`, data);
  } catch {
    const inquiry = mockInquiries.find(i => i.id === id);
    if (!inquiry) throw new Error('询价单不存在');
    return delay({ ...inquiry, ...data, updatedAt: new Date() });
  }
};

export const sendInquiry = async (id: string): Promise<Inquiry> => {
  try {
    return await post<Inquiry>(`/inquiries/${id}/send`);
  } catch {
    const inquiry = mockInquiries.find(i => i.id === id);
    if (!inquiry) throw new Error('询价单不存在');
    return delay({ ...inquiry, status: 'sent', updatedAt: new Date() });
  }
};

export const getQuotes = async (inquiryId: string): Promise<Quote[]> => {
  try {
    return await get<Quote[]>(`/inquiries/${inquiryId}/quotes`);
  } catch {
    return delay(mockQuotes.filter(q => q.inquiryId === inquiryId));
  }
};

export const submitQuote = async (inquiryId: string, data: Partial<Quote>): Promise<Quote> => {
  try {
    return await post<Quote>(`/inquiries/${inquiryId}/quotes`, data);
  } catch {
    const newQuote: Quote = {
      id: `quote_${Date.now()}`,
      quoteNo: `QTE-${Date.now().toString().slice(-8)}`,
      inquiryId,
      supplierId: data.supplierId || '',
      unitPrice: data.unitPrice || 0,
      totalPrice: data.totalPrice || 0,
      currency: data.currency || 'CNY',
      deliveryDate: data.deliveryDate || new Date(),
      deliveryAddress: data.deliveryAddress || '',
      paymentTerms: data.paymentTerms || '',
      warranty: data.warranty,
      remarks: data.remarks,
      status: 'submitted',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data,
    } as Quote;
    return delay(newQuote);
  }
};

export const getComparisonReport = async (inquiryId: string): Promise<ComparisonReport> => {
  try {
    return await get<ComparisonReport>(`/inquiries/${inquiryId}/comparison`);
  } catch {
    const report = mockComparisonReports.find(r => r.inquiryId === inquiryId);
    if (!report) throw new Error('比价报告不存在');
    return delay(report);
  }
};

export const generateComparisonReport = async (inquiryId: string): Promise<ComparisonReport> => {
  try {
    return await post<ComparisonReport>(`/inquiries/${inquiryId}/comparison/generate`);
  } catch {
    const quotes = mockQuotes.filter(q => q.inquiryId === inquiryId);
    const newReport: ComparisonReport = {
      id: `cmp_${Date.now()}`,
      reportNo: `CMP-${Date.now().toString().slice(-8)}`,
      inquiryId,
      requirementId: '',
      quotes: quotes.map((q, index) => ({
        supplierId: q.supplierId,
        supplierName: `供应商${index + 1}`,
        unitPrice: q.unitPrice,
        totalPrice: q.totalPrice,
        deliveryDate: q.deliveryDate,
        priceScore: 80 + Math.random() * 20,
        deliveryScore: 80 + Math.random() * 20,
        qualityScore: 80 + Math.random() * 20,
        totalScore: 80 + Math.random() * 20,
        rank: index + 1,
      })),
      createdById: 'user_001',
      createdAt: new Date(),
    };
    return delay(newReport);
  }
};

export const selectSupplier = async (inquiryId: string, supplierId: string): Promise<{ inquiry: Inquiry; order?: any }> => {
  try {
    return await post<{ inquiry: Inquiry; order?: any }>(`/inquiries/${inquiryId}/select-supplier`, { supplierId });
  } catch {
    const inquiry = mockInquiries.find(i => i.id === inquiryId);
    if (!inquiry) throw new Error('询价单不存在');
    return delay({ inquiry: { ...inquiry, status: 'completed', updatedAt: new Date() } });
  }
};

export const exportInquiry = async (id: string): Promise<Blob> => {
  try {
    return await get<Blob>(`/inquiries/${id}/export`, { responseType: 'blob' });
  } catch {
    return delay(new Blob());
  }
};
