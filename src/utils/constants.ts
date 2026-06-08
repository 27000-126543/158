import type {
  UserRole,
  PurchaseRequirementStatus,
  SupplierStatus,
  PerformanceLevel,
  InquiryStatus,
  QuoteStatus,
  PurchaseOrderStatus,
  LogisticsStatus,
  ReceiptStatus,
  PaymentStatus,
  PaymentType,
  ApprovalStatus,
  AlertLevel,
  AlertType,
} from '@shared/types';

export const CATEGORIES = [
  { value: 'office_supplies', label: '办公用品', code: 'OS' },
  { value: 'it_equipment', label: 'IT设备', code: 'IT' },
  { value: 'raw_materials', label: '原材料', code: 'RM' },
  { value: 'packaging', label: '包装材料', code: 'PK' },
  { value: 'marketing', label: '市场营销', code: 'MK' },
  { value: 'services', label: '服务采购', code: 'SV' },
  { value: 'furniture', label: '办公家具', code: 'FN' },
  { value: 'software', label: '软件服务', code: 'SW' },
] as const;

export const UNITS = [
  { value: 'piece', label: '件' },
  { value: 'set', label: '套' },
  { value: 'box', label: '箱' },
  { value: 'kg', label: '千克' },
  { value: 'ton', label: '吨' },
  { value: 'meter', label: '米' },
  { value: 'square_meter', label: '平方米' },
  { value: 'hour', label: '小时' },
  { value: 'day', label: '天' },
  { value: 'month', label: '月' },
] as const;

export const USER_ROLES: { value: UserRole; label: string }[] = [
  { value: 'buyer', label: '采购员' },
  { value: 'supplier', label: '供应商' },
  { value: 'finance', label: '财务人员' },
  { value: 'finance_director', label: '财务总监' },
  { value: 'ceo', label: '总裁' },
  { value: 'admin', label: '系统管理员' },
];

export const PURCHASE_STATUS: { value: PurchaseRequirementStatus; label: string; color: string }[] = [
  { value: 'draft', label: '草稿', color: 'default' },
  { value: 'pending_approval', label: '待审批', color: 'orange' },
  { value: 'approved', label: '已审批', color: 'blue' },
  { value: 'rejected', label: '已驳回', color: 'red' },
  { value: 'inquiry_sent', label: '已发询价', color: 'cyan' },
  { value: 'quoting', label: '报价中', color: 'purple' },
  { value: 'quoted', label: '已报价', color: 'geekblue' },
  { value: 'order_created', label: '已下单', color: 'green' },
];

export const SUPPLIER_STATUS: { value: SupplierStatus; label: string; color: string }[] = [
  { value: 'pending', label: '待审核', color: 'orange' },
  { value: 'active', label: '合作中', color: 'green' },
  { value: 'inactive', label: '已暂停', color: 'default' },
  { value: 'blacklisted', label: '黑名单', color: 'red' },
];

export const PERFORMANCE_LEVELS: { value: PerformanceLevel; label: string; color: string }[] = [
  { value: 'excellent', label: '优秀', color: 'green' },
  { value: 'good', label: '良好', color: 'blue' },
  { value: 'average', label: '一般', color: 'orange' },
  { value: 'poor', label: '较差', color: 'red' },
];

export const INQUIRY_STATUS: { value: InquiryStatus; label: string; color: string }[] = [
  { value: 'draft', label: '草稿', color: 'default' },
  { value: 'sent', label: '已发送', color: 'blue' },
  { value: 'quoting', label: '报价中', color: 'purple' },
  { value: 'quoted', label: '已报价', color: 'cyan' },
  { value: 'completed', label: '已完成', color: 'green' },
  { value: 'cancelled', label: '已取消', color: 'red' },
];

export const QUOTE_STATUS: { value: QuoteStatus; label: string; color: string }[] = [
  { value: 'draft', label: '草稿', color: 'default' },
  { value: 'submitted', label: '已提交', color: 'blue' },
  { value: 'selected', label: '已中标', color: 'green' },
  { value: 'rejected', label: '未中标', color: 'red' },
];

export const ORDER_STATUS: { value: PurchaseOrderStatus; label: string; color: string }[] = [
  { value: 'draft', label: '草稿', color: 'default' },
  { value: 'confirmed', label: '已确认', color: 'blue' },
  { value: 'processing', label: '处理中', color: 'purple' },
  { value: 'shipped', label: '已发货', color: 'cyan' },
  { value: 'delivered', label: '已送达', color: 'geekblue' },
  { value: 'completed', label: '已完成', color: 'green' },
  { value: 'cancelled', label: '已取消', color: 'red' },
];

export const LOGISTICS_STATUS: { value: LogisticsStatus; label: string; color: string }[] = [
  { value: 'pending', label: '待发货', color: 'default' },
  { value: 'picked', label: '已揽收', color: 'blue' },
  { value: 'in_transit', label: '运输中', color: 'purple' },
  { value: 'delivered', label: '已送达', color: 'cyan' },
  { value: 'signed', label: '已签收', color: 'green' },
];

export const RECEIPT_STATUS: { value: ReceiptStatus; label: string; color: string }[] = [
  { value: 'pending', label: '待验收', color: 'default' },
  { value: 'inspecting', label: '验收中', color: 'orange' },
  { value: 'accepted', label: '已验收', color: 'green' },
  { value: 'rejected', label: '已拒收', color: 'red' },
  { value: 'partial', label: '部分验收', color: 'yellow' },
];

export const PAYMENT_STATUS: { value: PaymentStatus; label: string; color: string }[] = [
  { value: 'pending', label: '待审批', color: 'orange' },
  { value: 'approved', label: '已审批', color: 'blue' },
  { value: 'paid', label: '已支付', color: 'green' },
  { value: 'rejected', label: '已驳回', color: 'red' },
  { value: 'processing', label: '支付中', color: 'purple' },
];

export const PAYMENT_TYPES: { value: PaymentType; label: string }[] = [
  { value: 'advance', label: '预付款' },
  { value: 'progress', label: '进度款' },
  { value: 'final', label: '尾款' },
  { value: 'deposit', label: '保证金' },
];

export const APPROVAL_STATUS: { value: ApprovalStatus; label: string; color: string }[] = [
  { value: 'pending', label: '待审批', color: 'orange' },
  { value: 'approved', label: '已通过', color: 'green' },
  { value: 'rejected', label: '已驳回', color: 'red' },
];

export const APPROVAL_FLOW_TYPES: { value: string; label: string }[] = [
  { value: 'purchase_approval', label: '采购审批' },
  { value: 'payment_approval', label: '付款审批' },
  { value: 'supplier_approval', label: '供应商审批' },
];

export const ALERT_LEVELS: { value: AlertLevel; label: string; color: string }[] = [
  { value: 'info', label: '信息', color: 'blue' },
  { value: 'warning', label: '警告', color: 'orange' },
  { value: 'error', label: '错误', color: 'red' },
  { value: 'critical', label: '严重', color: 'red' },
];

export const ALERT_TYPES: { value: AlertType; label: string }[] = [
  { value: 'order_delay', label: '订单延迟' },
  { value: 'payment_overdue', label: '付款逾期' },
  { value: 'supplier_risk', label: '供应商风险' },
  { value: 'inventory_shortage', label: '库存短缺' },
  { value: 'approval_timeout', label: '审批超时' },
  { value: 'quality_issue', label: '质量问题' },
];

export const CURRENCIES = [
  { value: 'CNY', label: '人民币', symbol: '¥' },
  { value: 'USD', label: '美元', symbol: '$' },
  { value: 'EUR', label: '欧元', symbol: '€' },
];

export const PAYMENT_TERMS = [
  { value: 'net_30', label: '月结30天' },
  { value: 'net_60', label: '月结60天' },
  { value: 'net_90', label: '月结90天' },
  { value: 'prepaid', label: '款到发货' },
  { value: 'cod', label: '货到付款' },
  { value: 'half_prepaid', label: '预付50%' },
];

export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 100;

export const DATE_FORMAT = 'YYYY-MM-DD';
export const DATETIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';
export const MONTH_FORMAT = 'YYYY-MM';

export const PAYMENT_APPROVAL_THRESHOLDS = {
  FINANCE_DIRECTOR: 500000,
  CEO: 2000000,
};
