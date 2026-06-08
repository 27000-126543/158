export type UserRole = 'buyer' | 'supplier' | 'finance' | 'finance_director' | 'ceo' | 'admin';

export type PurchaseRequirementStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'inquiry_sent' | 'quoting' | 'quoted' | 'order_created';

export type SupplierStatus = 'pending' | 'active' | 'inactive' | 'blacklisted';

export type InquiryStatus = 'draft' | 'sent' | 'quoting' | 'quoted' | 'completed' | 'cancelled';

export type QuoteStatus = 'draft' | 'submitted' | 'selected' | 'rejected';

export type PurchaseOrderStatus = 'draft' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'completed' | 'cancelled';

export type LogisticsStatus = 'pending' | 'picked' | 'in_transit' | 'delivered' | 'signed';

export type ReceiptStatus = 'pending' | 'inspecting' | 'accepted' | 'rejected' | 'partial';

export type PaymentStatus = 'pending' | 'approved' | 'paid' | 'rejected' | 'processing';

export type ApprovalFlowType = 'purchase_approval' | 'payment_approval' | 'supplier_approval';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export type AlertLevel = 'info' | 'warning' | 'error' | 'critical';

export type AlertType = 'order_delay' | 'payment_overdue' | 'supplier_risk' | 'inventory_shortage' | 'approval_timeout' | 'quality_issue';

export type PerformanceLevel = 'excellent' | 'good' | 'average' | 'poor';

export interface Category {
  id: string;
  name: string;
  code: string;
  parentId?: string;
  level: number;
}

export interface PurchaseRequirement {
  id: string;
  requirementNo: string;
  title: string;
  category: string;
  itemName: string;
  specification: string;
  quantity: number;
  unit: string;
  budget: number;
  expectedDate: Date;
  description?: string;
  requesterId: string;
  status: PurchaseRequirementStatus;
  approvalFlowId?: string;
  inquiryId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Supplier {
  id: string;
  supplierNo: string;
  name: string;
  shortName: string;
  category: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  address: string;
  businessLicense?: string;
  taxNumber?: string;
  bankName?: string;
  bankAccount?: string;
  status: SupplierStatus;
  creditRating: number;
  performanceScore: number;
  performanceLevel: PerformanceLevel;
  totalOrders: number;
  totalAmount: number;
  onTimeDeliveryRate: number;
  qualityPassRate: number;
  satisfactionScore: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Inquiry {
  id: string;
  inquiryNo: string;
  requirementId: string;
  title: string;
  category: string;
  itemName: string;
  specification: string;
  quantity: number;
  unit: string;
  description?: string;
  supplierIds: string[];
  deadline: Date;
  status: InquiryStatus;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Quote {
  id: string;
  quoteNo: string;
  inquiryId: string;
  supplierId: string;
  unitPrice: number;
  totalPrice: number;
  currency: string;
  deliveryDate: Date;
  deliveryAddress: string;
  paymentTerms: string;
  warranty?: string;
  remarks?: string;
  status: QuoteStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface ComparisonReport {
  id: string;
  reportNo: string;
  inquiryId: string;
  requirementId: string;
  quotes: QuoteComparison[];
  recommendedSupplierId?: string;
  recommendationReason?: string;
  createdById: string;
  createdAt: Date;
}

export interface QuoteComparison {
  supplierId: string;
  supplierName: string;
  unitPrice: number;
  totalPrice: number;
  deliveryDate: Date;
  priceScore: number;
  deliveryScore: number;
  qualityScore: number;
  totalScore: number;
  rank: number;
}

export interface PurchaseOrder {
  id: string;
  orderNo: string;
  requirementId: string;
  inquiryId?: string;
  supplierId: string;
  itemName: string;
  specification: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalAmount: number;
  currency: string;
  deliveryDate: Date;
  deliveryAddress: string;
  paymentTerms: string;
  status: PurchaseOrderStatus;
  logisticsStatus: LogisticsStatus;
  trackingNumber?: string;
  shippingCompany?: string;
  approvalFlowId?: string;
  receiptId?: string;
  paymentId?: string;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Receipt {
  id: string;
  receiptNo: string;
  orderId: string;
  receivedQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
  inspectionReport?: string;
  status: ReceiptStatus;
  receivedById: string;
  receivedAt: Date;
  createdAt: Date;
}

export interface Payment {
  id: string;
  paymentNo: string;
  orderId: string;
  amount: number;
  currency: string;
  paymentType: 'advance' | 'progress' | 'final' | 'deposit';
  dueDate: Date;
  actualPaidDate?: Date;
  status: PaymentStatus;
  approvalFlowId?: string;
  approvalLevel: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApprovalNode {
  id: string;
  flowId: string;
  level: number;
  approverRole: string;
  approverId?: string;
  status: ApprovalStatus;
  comment?: string;
  approvedAt?: Date;
}

export interface ApprovalFlow {
  id: string;
  type: ApprovalFlowType;
  status: ApprovalStatus;
  currentNode: number;
  relatedId: string;
  relatedType: 'requirement' | 'payment' | 'order';
  nodes: ApprovalNode[];
  createdAt: Date;
}

export interface User {
  id: string;
  username: string;
  realName: string;
  role: UserRole;
  email: string;
  phone: string;
  department?: string;
  supplierId?: string;
  createdAt: Date;
}

export interface OperationLog {
  id: string;
  userId: string;
  action: string;
  module: string;
  resourceId?: string;
  details?: any;
  ipAddress?: string;
  createdAt: Date;
}

export interface SystemAlert {
  id: string;
  type: AlertType;
  level: AlertLevel;
  title: string;
  content: string;
  relatedId?: string;
  status: 'unread' | 'read' | 'resolved';
  createdAt: Date;
}

export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
  timestamp: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface DashboardStats {
  totalPurchaseAmount: number;
  monthPurchaseAmount: number;
  totalOrders: number;
  monthOrders: number;
  activeSuppliers: number;
  pendingApprovals: number;
  inventoryTurnover: number;
  onTimeDeliveryRate: number;
}

export interface MonthlyReport {
  id: string;
  yearMonth: string;
  purchaseByCategory: { [key: string]: number };
  supplierRanking: { supplierId: string; supplierName: string; amount: number; orderCount: number }[];
  paymentTimeliness: { onTime: number; overdue: number; averageDays: number };
  satisfactionScores: { supplierId: string; supplierName: string; score: number }[];
  performanceMetrics: {
    totalAmount: number;
    orderCount: number;
    averageDeliveryDays: number;
    qualityPassRate: number;
    onTimePaymentRate: number;
  };
  createdAt: Date;
}

export interface TaskInfo {
  id: string;
  name: string;
  cronExpression: string;
  lastRunAt?: Date;
  nextRunAt?: Date;
  status: 'running' | 'idle' | 'error';
  lastStatus?: 'success' | 'failed';
  description: string;
}
