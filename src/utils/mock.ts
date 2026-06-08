import type {
  User,
  PurchaseRequirement,
  Supplier,
  Inquiry,
  Quote,
  ComparisonReport,
  PurchaseOrder,
  Receipt,
  Payment,
  ApprovalFlow,
  ApprovalNode,
  SystemAlert,
  MonthlyReport,
  DashboardStats,
  OperationLog,
  PurchaseRequirementStatus,
  PurchaseOrderStatus,
  LogisticsStatus,
  PaymentStatus,
  PaymentType,
  RevenueRecord,
  Settlement,
  SplitDetail,
  PaymentInstruction,
  SplitRule,
  SplitRuleHistory,
  ReconciliationStatus,
  SettlementStatus,
} from '@shared/types';
import { CATEGORIES, PAYMENT_TERMS, BUSINESS_LINES, CHANNELS } from './constants';

const categoryMap = new Map(CATEGORIES.map(c => [c.value, c]));

const getRandomElement = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];

export const delay = <T>(data: T, ms: number = 300): Promise<T> => {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms));
};

const getRandomDate = (daysBack: number = 30): Date => {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * daysBack));
  date.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));
  return date;
};

const getRandomFutureDate = (daysForward: number = 60): Date => {
  const date = new Date();
  date.setDate(date.getDate() + Math.floor(Math.random() * daysForward) + 1);
  date.setHours(10, 0);
  return date;
};

const formatMoney = (num: number): string => {
  return '¥' + num.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const generateId = (): string => {
  return 'id_' + Math.random().toString(36).substring(2, 15);
};

export const mockUsers: User[] = [
  {
    id: 'user_001',
    username: 'buyer_zhang',
    realName: '张采购',
    role: 'buyer',
    email: 'zhangbuyer@company.com',
    phone: '13800138001',
    department: '采购部',
    createdAt: new Date('2024-01-15'),
  },
  {
    id: 'user_002',
    username: 'supplier_tech',
    realName: '李销售',
    role: 'supplier',
    email: 'lsales@tech-supplier.com',
    phone: '13900139002',
    supplierId: 'supp_001',
    createdAt: new Date('2024-02-20'),
  },
  {
    id: 'user_003',
    username: 'finance_wang',
    realName: '王财务',
    role: 'finance',
    email: 'wfinance@company.com',
    phone: '13700137003',
    department: '财务部',
    createdAt: new Date('2024-01-10'),
  },
  {
    id: 'user_004',
    username: 'finance_director',
    realName: '赵总监',
    role: 'finance_director',
    email: 'zdirector@company.com',
    phone: '13600136004',
    department: '财务部',
    createdAt: new Date('2023-06-15'),
  },
  {
    id: 'user_005',
    username: 'ceo',
    realName: '孙总裁',
    role: 'ceo',
    email: 'sceo@company.com',
    phone: '13500135005',
    department: '总裁办',
    createdAt: new Date('2020-01-01'),
  },
  {
    id: 'user_006',
    username: 'admin',
    realName: '系统管理员',
    role: 'admin',
    email: 'admin@company.com',
    phone: '13400134006',
    department: 'IT部',
    createdAt: new Date('2023-01-01'),
  },
];

export const mockSuppliers: Supplier[] = [
  {
    id: 'supp_001',
    supplierNo: 'SUP-2024-0001',
    name: '深圳市科技创新有限公司',
    shortName: '科创电子',
    category: 'it_equipment',
    contactName: '李销售',
    contactPhone: '13900139002',
    contactEmail: 'lsales@tech-supplier.com',
    address: '深圳市南山区科技园南区',
    businessLicense: '91440300MA5D8XXXXX',
    taxNumber: '91440300MA5D8XXXXX',
    bankName: '招商银行深圳分行',
    bankAccount: '7559 1234 5678 9012',
    status: 'active',
    creditRating: 95,
    performanceScore: 92.5,
    performanceLevel: 'excellent',
    totalOrders: 156,
    totalAmount: 12580000,
    onTimeDeliveryRate: 0.985,
    qualityPassRate: 0.992,
    satisfactionScore: 4.8,
    createdAt: new Date('2023-03-15'),
    updatedAt: new Date('2024-05-20'),
  },
  {
    id: 'supp_002',
    supplierNo: 'SUP-2024-0002',
    name: '广州市办公设备有限公司',
    shortName: '广办设备',
    category: 'office_supplies',
    contactName: '王经理',
    contactPhone: '13800138011',
    contactEmail: 'wmanager@gz-office.com',
    address: '广州市天河区珠江新城',
    businessLicense: '91440100MA5E9XXXXX',
    taxNumber: '91440100MA5E9XXXXX',
    bankName: '工商银行广州分行',
    bankAccount: '3602 8765 4321 0987',
    status: 'active',
    creditRating: 88,
    performanceScore: 85.0,
    performanceLevel: 'good',
    totalOrders: 89,
    totalAmount: 3560000,
    onTimeDeliveryRate: 0.95,
    qualityPassRate: 0.97,
    satisfactionScore: 4.5,
    createdAt: new Date('2023-06-20'),
    updatedAt: new Date('2024-04-10'),
  },
  {
    id: 'supp_003',
    supplierNo: 'SUP-2024-0003',
    name: '东莞市原材料加工厂',
    shortName: '东莞材料',
    category: 'raw_materials',
    contactName: '陈厂长',
    contactPhone: '13700137022',
    contactEmail: 'cfactory@dg-material.com',
    address: '东莞市长安镇工业区',
    businessLicense: '91441900MA5F7XXXXX',
    taxNumber: '91441900MA5F7XXXXX',
    bankName: '建设银行东莞分行',
    bankAccount: '3320 1122 3344 5566',
    status: 'active',
    creditRating: 92,
    performanceScore: 88.5,
    performanceLevel: 'good',
    totalOrders: 234,
    totalAmount: 28900000,
    onTimeDeliveryRate: 0.96,
    qualityPassRate: 0.98,
    satisfactionScore: 4.6,
    createdAt: new Date('2022-11-10'),
    updatedAt: new Date('2024-05-15'),
  },
  {
    id: 'supp_004',
    supplierNo: 'SUP-2024-0004',
    name: '佛山市包装材料有限公司',
    shortName: '佛山包装',
    category: 'packaging',
    contactName: '周经理',
    contactPhone: '13600136033',
    contactEmail: 'zmanager@fs-packaging.com',
    address: '佛山市南海区',
    businessLicense: '91440600MA5G6XXXXX',
    taxNumber: '91440600MA5G6XXXXX',
    bankName: '农业银行佛山分行',
    bankAccount: '4455 6677 8899 0011',
    status: 'active',
    creditRating: 85,
    performanceScore: 82.0,
    performanceLevel: 'average',
    totalOrders: 67,
    totalAmount: 1280000,
    onTimeDeliveryRate: 0.92,
    qualityPassRate: 0.94,
    satisfactionScore: 4.2,
    createdAt: new Date('2023-09-05'),
    updatedAt: new Date('2024-03-20'),
  },
  {
    id: 'supp_005',
    supplierNo: 'SUP-2024-0005',
    name: '北京市软件服务有限公司',
    shortName: '北京软件',
    category: 'software',
    contactName: '吴总监',
    contactPhone: '13500135044',
    contactEmail: 'wdirector@bj-software.com',
    address: '北京市海淀区中关村',
    businessLicense: '91110108MA5H5XXXXX',
    taxNumber: '91110108MA5H5XXXXX',
    bankName: '北京银行中关村支行',
    bankAccount: '2000 1122 3344 5566',
    status: 'active',
    creditRating: 96,
    performanceScore: 94.0,
    performanceLevel: 'excellent',
    totalOrders: 45,
    totalAmount: 8900000,
    onTimeDeliveryRate: 0.99,
    qualityPassRate: 0.995,
    satisfactionScore: 4.9,
    createdAt: new Date('2023-04-18'),
    updatedAt: new Date('2024-05-25'),
  },
];

let reqCounter = 100;
const generateRequirementNo = () => {
  reqCounter++;
  return `REQ-2024-${String(reqCounter).padStart(4, '0')}`;
};

const requirementTitles = [
  '采购办公电脑设备',
  '采购打印纸和墨盒',
  '采购生产用原材料',
  '采购包装纸箱',
  '采购营销活动礼品',
  '采购服务器设备',
  '采购办公家具',
  '采购软件系统',
  '采购员工福利用品',
  '采购IT设备配件',
];

export const generateMockRequirements = (count: number = 50): PurchaseRequirement[] => {
  const requirements: PurchaseRequirement[] = [];
  const statuses: PurchaseRequirementStatus[] = [
    'draft', 'pending_approval', 'approved', 'inquiry_sent', 'quoting', 'quoted', 'order_created'
  ];

  for (let i = 0; i < count; i++) {
    const category: { value: string; label: string; code: string } = getRandomElement(CATEGORIES);
    const status = getRandomElement(statuses);
    const itemNames: { [key: string]: string[] } = {
      office_supplies: ['A4打印纸', '签字笔', '文件夹', '打印机墨盒', '笔记本'],
      it_equipment: ['笔记本电脑', '台式电脑', '显示器', '服务器', '打印机'],
      raw_materials: ['钢材', '塑料颗粒', '电子元器件', '包装材料', '化工原料'],
      packaging: ['纸箱', '气泡袋', '封箱胶带', '标签', '缓冲材料'],
      marketing: ['宣传册', '礼品', '展架', '广告物料', '促销品'],
      services: ['咨询服务', '培训服务', '维修服务', '运输服务', '保洁服务'],
      furniture: ['办公桌', '办公椅', '会议桌', '文件柜', '书柜'],
      software: ['ERP系统', 'OA系统', '设计软件', '杀毒软件', '数据库'],
    };

    const itemList = itemNames[category.value] || itemNames.office_supplies;
    const itemName = getRandomElement(itemList);
    const quantity = Math.floor(Math.random() * 200) + 1;
    const unitPrice = Math.floor(Math.random() * 5000) + 100;
    const budget = quantity * unitPrice;

    requirements.push({
      id: generateId(),
      requirementNo: generateRequirementNo(),
      title: `${itemName}采购需求`,
      category: category.value,
      itemName,
      specification: `规格: ${category.label} - ${itemName}`,
      quantity,
      unit: getRandomElement(['piece', 'set', 'box', 'kg', 'ton']),
      budget,
      expectedDate: getRandomFutureDate(30),
      description: `急需采购${itemName}${quantity}${quantity > 1 ? '件' : ''}，请尽快处理。`,
      requesterId: 'user_001',
      status,
      createdAt: getRandomDate(60),
      updatedAt: getRandomDate(30),
    });
  }

  return requirements;
};

let inquiryCounter = 50;
const generateInquiryNo = () => {
  inquiryCounter++;
  return `INQ-2024-${String(inquiryCounter).padStart(4, '0')}`;
};

let quoteCounter = 100;
const generateQuoteNo = () => {
  quoteCounter++;
  return `QTE-2024-${String(quoteCounter).padStart(4, '0')}`;
};

let orderCounter = 80;
const generateOrderNo = () => {
  orderCounter++;
  return `PO-2024-${String(orderCounter).padStart(4, '0')}`;
};

export const generateMockOrders = (count: number = 30): PurchaseOrder[] => {
  const orders: PurchaseOrder[] = [];
  const statuses: PurchaseOrderStatus[] = ['confirmed', 'processing', 'shipped', 'delivered', 'completed'];
  const logisticsStatuses: LogisticsStatus[] = ['pending', 'picked', 'in_transit', 'delivered', 'signed'];

  for (let i = 0; i < count; i++) {
    const supplier = getRandomElement(mockSuppliers);
    const category: { value: string; label: string; code: string } = getRandomElement(CATEGORIES);
    const itemNames: { [key: string]: string[] } = {
      office_supplies: ['A4打印纸', '办公设备'],
      it_equipment: ['笔记本电脑', '服务器'],
      raw_materials: ['钢材', '电子元器件'],
      packaging: ['纸箱', '包装材料'],
      software: ['ERP系统', '办公软件'],
    };
    const itemList = itemNames[category.value] || itemNames.office_supplies;
    const itemName = getRandomElement(itemList);
    const quantity = Math.floor(Math.random() * 100) + 1;
    const unitPrice = Math.floor(Math.random() * 8000) + 500;
    const totalAmount = quantity * unitPrice;

    const status = getRandomElement(statuses);
    const statusIndex = statuses.indexOf(status);
    const logisticsStatus = logisticsStatuses[Math.min(statusIndex, logisticsStatuses.length - 1)];

    orders.push({
      id: generateId(),
      orderNo: generateOrderNo(),
      requirementId: generateId(),
      supplierId: supplier.id,
      itemName,
      specification: `${itemName} - 标准规格`,
      quantity,
      unit: 'piece',
      unitPrice,
      totalAmount,
      currency: 'CNY',
      deliveryDate: getRandomFutureDate(30),
      deliveryAddress: '北京市朝阳区XX路XX号公司仓库',
      paymentTerms: getRandomElement(PAYMENT_TERMS).value,
      status,
      logisticsStatus,
      trackingNumber: logisticsStatus !== 'pending' ? `SF${Math.random().toString().slice(2, 14)}` : undefined,
      shippingCompany: logisticsStatus !== 'pending' ? '顺丰速运' : undefined,
      createdById: 'user_001',
      createdAt: getRandomDate(60),
      updatedAt: getRandomDate(30),
    });
  }

  return orders;
};

let receiptCounter = 30;
const generateReceiptNo = () => {
  receiptCounter++;
  return `RCT-2024-${String(receiptCounter).padStart(4, '0')}`;
};

let paymentCounter = 25;
const generatePaymentNo = () => {
  paymentCounter++;
  return `PAY-2024-${String(paymentCounter).padStart(4, '0')}`;
};

export const generateMockPayments = (count: number = 20): Payment[] => {
  const payments: Payment[] = [];
  const statuses: PaymentStatus[] = ['pending', 'approved', 'paid', 'rejected'];
  const paymentTypes: PaymentType[] = ['advance', 'progress', 'final', 'deposit'];

  for (let i = 0; i < count; i++) {
    const status = getRandomElement(statuses);
    const amount = Math.floor(Math.random() * 500000) + 10000;
    let approvalLevel = 0;
    if (amount > 500000) approvalLevel = 2;
    else if (amount > 50000) approvalLevel = 1;

    payments.push({
      id: generateId(),
      paymentNo: generatePaymentNo(),
      orderId: generateId(),
      amount,
      currency: 'CNY',
      paymentType: getRandomElement(paymentTypes),
      dueDate: getRandomFutureDate(15),
      actualPaidDate: status === 'paid' ? getRandomDate(10) : undefined,
      status,
      approvalLevel,
      createdAt: getRandomDate(30),
      updatedAt: getRandomDate(15),
    });
  }

  return payments;
};

export const mockRequirements = generateMockRequirements(50);
export const mockOrders = generateMockOrders(30);
export const mockPayments = generateMockPayments(20);

export const mockDashboardStats: DashboardStats = {
  totalPurchaseAmount: 56789000,
  monthPurchaseAmount: 5330000,
  totalOrders: 234,
  monthOrders: 28,
  activeSuppliers: 12,
  pendingApprovals: 7,
  inventoryTurnover: 6.8,
  onTimeDeliveryRate: 0.955,
};

let alertCounter = 1;
export const mockAlerts: SystemAlert[] = [
  {
    id: `alert_${alertCounter++}`,
    type: 'order_delay',
    level: 'warning',
    title: '订单PO-2024-0082发货延迟',
    content: '供应商深圳市科技创新有限公司订单预计延迟2天到货',
    relatedId: 'order_001',
    status: 'unread',
    createdAt: new Date(Date.now() - 3600000),
  },
  {
    id: `alert_${alertCounter++}`,
    type: 'payment_overdue',
    level: 'error',
    title: '付款PAY-2024-0027已逾期3天',
    content: '款项¥568,000.00已逾期，请尽快处理',
    relatedId: 'payment_001',
    status: 'unread',
    createdAt: new Date(Date.now() - 7200000),
  },
  {
    id: `alert_${alertCounter++}`,
    type: 'approval_timeout',
    level: 'warning',
    title: '5个审批节点已超时未处理',
    content: '请相关审批人员尽快处理待办事项',
    relatedId: 'approval_001',
    status: 'unread',
    createdAt: new Date(Date.now() - 21600000),
  },
  {
    id: `alert_${alertCounter++}`,
    type: 'supplier_risk',
    level: 'info',
    title: '供应商东莞材料信用评分下降',
    content: '供应商近期3次交货延迟，信用评分降至85分',
    relatedId: 'supp_003',
    status: 'unread',
    createdAt: new Date(Date.now() - 43200000),
  },
  {
    id: `alert_${alertCounter++}`,
    type: 'quality_issue',
    level: 'error',
    title: '入库检验发现质量问题',
    content: '订单PO-2024-0075来料抽检不合格率15%',
    relatedId: 'receipt_001',
    status: 'read',
    createdAt: new Date(Date.now() - 86400000),
  },
];

let logCounter = 1;
export const mockLogs: OperationLog[] = Array.from({ length: 100 }, () => {
  const actions = ['create', 'update', 'delete', 'approve', 'reject', 'submit', 'export'];
  const modules = ['requirement', 'supplier', 'inquiry', 'order', 'payment', 'approval', 'system'];
  const user = getRandomElement(mockUsers);

  return {
    id: `log_${logCounter++}`,
    userId: user.id,
    action: getRandomElement(actions),
    module: getRandomElement(modules),
    resourceId: generateId(),
    details: { ip: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}` },
    ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
    createdAt: getRandomDate(7),
  };
});

export const mockMonthlyReports: MonthlyReport[] = [
  {
    id: 'report_001',
    yearMonth: '2024-05',
    purchaseByCategory: {
      it_equipment: 2850000,
      raw_materials: 5680000,
      office_supplies: 456000,
      software: 1200000,
      packaging: 234000,
      marketing: 567000,
    },
    supplierRanking: [
      { supplierId: 'supp_001', supplierName: '深圳市科技创新有限公司', amount: 2850000, orderCount: 12 },
      { supplierId: 'supp_003', supplierName: '东莞市原材料加工厂', amount: 2560000, orderCount: 18 },
      { supplierId: 'supp_005', supplierName: '北京市软件服务有限公司', amount: 1200000, orderCount: 3 },
      { supplierId: 'supp_002', supplierName: '广州市办公设备有限公司', amount: 456000, orderCount: 8 },
    ],
    paymentTimeliness: {
      onTime: 42,
      overdue: 5,
      averageDays: 2.5,
    },
    satisfactionScores: [
      { supplierId: 'supp_001', supplierName: '深圳市科技创新有限公司', score: 4.8 },
      { supplierId: 'supp_005', supplierName: '北京市软件服务有限公司', score: 4.9 },
      { supplierId: 'supp_003', supplierName: '东莞市原材料加工厂', score: 4.6 },
    ],
    performanceMetrics: {
      totalAmount: 10987000,
      orderCount: 47,
      averageDeliveryDays: 5.2,
      qualityPassRate: 0.982,
      onTimePaymentRate: 0.894,
    },
    createdAt: new Date('2024-06-01'),
  },
  {
    id: 'report_002',
    yearMonth: '2024-04',
    purchaseByCategory: {
      it_equipment: 1920000,
      raw_materials: 4850000,
      office_supplies: 389000,
      software: 890000,
      packaging: 198000,
      marketing: 425000,
    },
    supplierRanking: [
      { supplierId: 'supp_003', supplierName: '东莞市原材料加工厂', amount: 2150000, orderCount: 15 },
      { supplierId: 'supp_001', supplierName: '深圳市科技创新有限公司', amount: 1920000, orderCount: 9 },
      { supplierId: 'supp_005', supplierName: '北京市软件服务有限公司', amount: 890000, orderCount: 2 },
    ],
    paymentTimeliness: {
      onTime: 38,
      overdue: 4,
      averageDays: 1.8,
    },
    satisfactionScores: [
      { supplierId: 'supp_001', supplierName: '深圳市科技创新有限公司', score: 4.7 },
      { supplierId: 'supp_005', supplierName: '北京市软件服务有限公司', score: 4.8 },
      { supplierId: 'supp_003', supplierName: '东莞市原材料加工厂', score: 4.5 },
    ],
    performanceMetrics: {
      totalAmount: 8672000,
      orderCount: 39,
      averageDeliveryDays: 4.8,
      qualityPassRate: 0.975,
      onTimePaymentRate: 0.905,
    },
    createdAt: new Date('2024-05-01'),
  },
  {
    id: 'report_003',
    yearMonth: '2024-03',
    purchaseByCategory: {
      it_equipment: 3150000,
      raw_materials: 5120000,
      office_supplies: 412000,
      software: 1560000,
      packaging: 215000,
      marketing: 398000,
    },
    supplierRanking: [
      { supplierId: 'supp_001', supplierName: '深圳市科技创新有限公司', amount: 3150000, orderCount: 14 },
      { supplierId: 'supp_003', supplierName: '东莞市原材料加工厂', amount: 2280000, orderCount: 16 },
      { supplierId: 'supp_005', supplierName: '北京市软件服务有限公司', amount: 1560000, orderCount: 4 },
    ],
    paymentTimeliness: {
      onTime: 45,
      overdue: 3,
      averageDays: 1.2,
    },
    satisfactionScores: [
      { supplierId: 'supp_001', supplierName: '深圳市科技创新有限公司', score: 4.9 },
      { supplierId: 'supp_005', supplierName: '北京市软件服务有限公司', score: 4.7 },
      { supplierId: 'supp_003', supplierName: '东莞市原材料加工厂', score: 4.4 },
    ],
    performanceMetrics: {
      totalAmount: 10855000,
      orderCount: 52,
      averageDeliveryDays: 4.5,
      qualityPassRate: 0.988,
      onTimePaymentRate: 0.938,
    },
    createdAt: new Date('2024-04-01'),
  },
];

export const mockInquiries: Inquiry[] = [
  {
    id: 'inquiry_001',
    inquiryNo: 'INQ-2024-0051',
    requirementId: 'req_001',
    title: '笔记本电脑采购询价',
    category: 'it_equipment',
    itemName: 'ThinkPad X1 Carbon',
    specification: 'i7-1360P/16G/512G/Win11',
    quantity: 20,
    unit: 'piece',
    description: '为新入职员工采购笔记本电脑20台',
    supplierIds: ['supp_001', 'supp_002', 'supp_005'],
    deadline: getRandomFutureDate(7),
    status: 'quoting',
    createdById: 'user_001',
    createdAt: getRandomDate(5),
    updatedAt: getRandomDate(2),
  },
  {
    id: 'inquiry_002',
    inquiryNo: 'INQ-2024-0052',
    requirementId: 'req_002',
    title: '办公打印纸采购询价',
    category: 'office_supplies',
    itemName: 'A4打印纸',
    specification: '70g 500张/包 5包/箱',
    quantity: 100,
    unit: 'box',
    description: '季度办公耗材采购',
    supplierIds: ['supp_002', 'supp_004'],
    deadline: getRandomFutureDate(5),
    status: 'quoted',
    createdById: 'user_001',
    createdAt: getRandomDate(10),
    updatedAt: getRandomDate(3),
  },
  {
    id: 'inquiry_003',
    inquiryNo: 'INQ-2024-0053',
    requirementId: 'req_003',
    title: '服务器设备采购询价',
    category: 'it_equipment',
    itemName: 'Dell PowerEdge R750',
    specification: '2*Intel Xeon Gold 6338/64GB/2*4TB SSD',
    quantity: 5,
    unit: 'piece',
    description: '数据中心扩容采购服务器设备',
    supplierIds: ['supp_001', 'supp_005'],
    deadline: getRandomFutureDate(10),
    status: 'quoted',
    createdById: 'user_001',
    createdAt: getRandomDate(15),
    updatedAt: getRandomDate(5),
  },
  {
    id: 'inquiry_004',
    inquiryNo: 'INQ-2024-0054',
    requirementId: 'req_004',
    title: '生产用钢材采购询价',
    category: 'raw_materials',
    itemName: '冷轧钢板',
    specification: '1.5mm*1250mm*2500mm，DC01',
    quantity: 500,
    unit: 'piece',
    description: '生产线月度原材料采购',
    supplierIds: ['supp_003'],
    deadline: getRandomFutureDate(3),
    status: 'completed',
    createdById: 'user_001',
    createdAt: getRandomDate(30),
    updatedAt: getRandomDate(10),
  },
  {
    id: 'inquiry_005',
    inquiryNo: 'INQ-2024-0055',
    requirementId: 'req_005',
    title: 'ERP系统升级服务采购询价',
    category: 'software',
    itemName: 'ERP系统升级',
    specification: '从V5.0升级到V6.0，包含数据迁移和培训',
    quantity: 1,
    unit: 'set',
    description: '企业ERP系统版本升级项目',
    supplierIds: ['supp_005'],
    deadline: getRandomFutureDate(15),
    status: 'sent',
    createdById: 'user_001',
    createdAt: getRandomDate(3),
    updatedAt: getRandomDate(1),
  },
  {
    id: 'inquiry_006',
    inquiryNo: 'INQ-2024-0056',
    requirementId: 'req_006',
    title: '包装纸箱采购询价',
    category: 'packaging',
    itemName: '标准运输纸箱',
    specification: '400*300*200mm，五层瓦楞',
    quantity: 2000,
    unit: 'piece',
    description: '电商部门月度包装材料采购',
    supplierIds: ['supp_004', 'supp_003'],
    deadline: getRandomFutureDate(8),
    status: 'quoting',
    createdById: 'user_001',
    createdAt: getRandomDate(7),
    updatedAt: getRandomDate(2),
  },
];

export const mockQuotes: Quote[] = [
  {
    id: 'quote_001',
    quoteNo: 'QTE-2024-0101',
    inquiryId: 'inquiry_001',
    supplierId: 'supp_001',
    unitPrice: 12800,
    totalPrice: 256000,
    currency: 'CNY',
    deliveryDate: getRandomFutureDate(10),
    deliveryAddress: '北京市朝阳区XX路XX号',
    paymentTerms: 'net_30',
    warranty: '整机保修3年',
    remarks: '可提供上门安装服务，包含系统部署',
    status: 'submitted',
    createdAt: getRandomDate(3),
    updatedAt: getRandomDate(1),
  },
  {
    id: 'quote_002',
    quoteNo: 'QTE-2024-0102',
    inquiryId: 'inquiry_001',
    supplierId: 'supp_002',
    unitPrice: 13200,
    totalPrice: 264000,
    currency: 'CNY',
    deliveryDate: getRandomFutureDate(15),
    deliveryAddress: '北京市朝阳区XX路XX号',
    paymentTerms: 'net_60',
    warranty: '整机保修2年',
    remarks: '批量采购可再优惠2%，赠送笔记本包',
    status: 'submitted',
    createdAt: getRandomDate(2),
    updatedAt: getRandomDate(1),
  },
  {
    id: 'quote_003',
    quoteNo: 'QTE-2024-0103',
    inquiryId: 'inquiry_001',
    supplierId: 'supp_005',
    unitPrice: 13500,
    totalPrice: 270000,
    currency: 'CNY',
    deliveryDate: getRandomFutureDate(8),
    deliveryAddress: '北京市朝阳区XX路XX号',
    paymentTerms: 'net_30',
    warranty: '整机保修3年，延保1年',
    remarks: '包含3年免费上门维修服务，48小时响应',
    status: 'submitted',
    createdAt: getRandomDate(4),
    updatedAt: getRandomDate(1),
  },
  {
    id: 'quote_004',
    quoteNo: 'QTE-2024-0104',
    inquiryId: 'inquiry_002',
    supplierId: 'supp_002',
    unitPrice: 125,
    totalPrice: 12500,
    currency: 'CNY',
    deliveryDate: getRandomFutureDate(5),
    deliveryAddress: '北京市朝阳区XX路XX号',
    paymentTerms: 'net_30',
    warranty: '无',
    remarks: '免费配送上楼，可开增值税专用发票',
    status: 'submitted',
    createdAt: getRandomDate(5),
    updatedAt: getRandomDate(2),
  },
  {
    id: 'quote_005',
    quoteNo: 'QTE-2024-0105',
    inquiryId: 'inquiry_002',
    supplierId: 'supp_004',
    unitPrice: 118,
    totalPrice: 11800,
    currency: 'CNY',
    deliveryDate: getRandomFutureDate(7),
    deliveryAddress: '北京市朝阳区XX路XX号',
    paymentTerms: 'cod',
    warranty: '无',
    remarks: '长期合作可月结，质量问题包退换',
    status: 'submitted',
    createdAt: getRandomDate(6),
    updatedAt: getRandomDate(3),
  },
  {
    id: 'quote_006',
    quoteNo: 'QTE-2024-0106',
    inquiryId: 'inquiry_003',
    supplierId: 'supp_001',
    unitPrice: 58000,
    totalPrice: 290000,
    currency: 'CNY',
    deliveryDate: getRandomFutureDate(20),
    deliveryAddress: '北京市朝阳区XX路XX号数据中心',
    paymentTerms: 'half_prepaid',
    warranty: '硬件保修3年，7x24小时技术支持',
    remarks: '包含上架安装调试服务，提供三年原厂服务',
    status: 'submitted',
    createdAt: getRandomDate(8),
    updatedAt: getRandomDate(3),
  },
  {
    id: 'quote_007',
    quoteNo: 'QTE-2024-0107',
    inquiryId: 'inquiry_003',
    supplierId: 'supp_005',
    unitPrice: 62000,
    totalPrice: 310000,
    currency: 'CNY',
    deliveryDate: getRandomFutureDate(15),
    deliveryAddress: '北京市朝阳区XX路XX号数据中心',
    paymentTerms: 'net_30',
    warranty: '硬件保修5年，7x24小时上门服务',
    remarks: '赠送一年运维服务，包含季度健康检查',
    status: 'submitted',
    createdAt: getRandomDate(7),
    updatedAt: getRandomDate(2),
  },
  {
    id: 'quote_008',
    quoteNo: 'QTE-2024-0108',
    inquiryId: 'inquiry_004',
    supplierId: 'supp_003',
    unitPrice: 4200,
    totalPrice: 2100000,
    currency: 'CNY',
    deliveryDate: getRandomFutureDate(10),
    deliveryAddress: '东莞市XX工业区生产基地',
    paymentTerms: 'net_60',
    warranty: '质量问题包退换',
    remarks: '可分批次送货，按需生产',
    status: 'selected',
    createdAt: getRandomDate(20),
    updatedAt: getRandomDate(10),
  },
  {
    id: 'quote_009',
    quoteNo: 'QTE-2024-0109',
    inquiryId: 'inquiry_006',
    supplierId: 'supp_004',
    unitPrice: 3.5,
    totalPrice: 7000,
    currency: 'CNY',
    deliveryDate: getRandomFutureDate(5),
    deliveryAddress: '广州市XX电商仓库',
    paymentTerms: 'net_30',
    warranty: '运输破损包赔',
    remarks: '可按订单生产，支持定制印刷',
    status: 'submitted',
    createdAt: getRandomDate(4),
    updatedAt: getRandomDate(1),
  },
  {
    id: 'quote_010',
    quoteNo: 'QTE-2024-0110',
    inquiryId: 'inquiry_006',
    supplierId: 'supp_003',
    unitPrice: 3.2,
    totalPrice: 6400,
    currency: 'CNY',
    deliveryDate: getRandomFutureDate(7),
    deliveryAddress: '广州市XX电商仓库',
    paymentTerms: 'net_60',
    warranty: '质量问题包退换',
    remarks: '月采购量超5000个可再降0.2元/个',
    status: 'submitted',
    createdAt: getRandomDate(5),
    updatedAt: getRandomDate(2),
  },
];

export const mockComparisonReports: ComparisonReport[] = [
  {
    id: 'report_comp_001',
    reportNo: 'CMP-2024-0001',
    inquiryId: 'inquiry_001',
    requirementId: 'req_001',
    quotes: [
      {
        supplierId: 'supp_001',
        supplierName: '深圳市科技创新有限公司',
        unitPrice: 12800,
        totalPrice: 256000,
        deliveryDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        priceScore: 95,
        deliveryScore: 90,
        qualityScore: 95,
        totalScore: 93.3,
        rank: 1,
      },
      {
        supplierId: 'supp_002',
        supplierName: '广州市办公设备有限公司',
        unitPrice: 13200,
        totalPrice: 264000,
        deliveryDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        priceScore: 85,
        deliveryScore: 80,
        qualityScore: 85,
        totalScore: 83.3,
        rank: 2,
      },
      {
        supplierId: 'supp_005',
        supplierName: '北京市软件服务有限公司',
        unitPrice: 13500,
        totalPrice: 270000,
        deliveryDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
        priceScore: 80,
        deliveryScore: 95,
        qualityScore: 98,
        totalScore: 91.0,
        rank: 3,
      },
    ],
    recommendedSupplierId: 'supp_001',
    recommendationReason: '综合评分最高，价格优势明显，比第二名低8,000元。售后服务完善，提供3年整机保修，历史合作记录良好，准时交货率98.5%。',
    createdById: 'user_001',
    createdAt: getRandomDate(2),
  },
  {
    id: 'report_comp_002',
    reportNo: 'CMP-2024-0002',
    inquiryId: 'inquiry_002',
    requirementId: 'req_002',
    quotes: [
      {
        supplierId: 'supp_002',
        supplierName: '广州市办公设备有限公司',
        unitPrice: 125,
        totalPrice: 12500,
        deliveryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        priceScore: 88,
        deliveryScore: 92,
        qualityScore: 85,
        totalScore: 88.3,
        rank: 2,
      },
      {
        supplierId: 'supp_004',
        supplierName: '佛山市包装材料有限公司',
        unitPrice: 118,
        totalPrice: 11800,
        deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        priceScore: 95,
        deliveryScore: 85,
        qualityScore: 82,
        totalScore: 87.3,
        rank: 1,
      },
    ],
    recommendedSupplierId: 'supp_004',
    recommendationReason: '价格优势明显，单价比第二名低7元，总价低700元。虽然交货期稍长2天，但办公耗材对时效要求不高，综合考虑成本优先。',
    createdById: 'user_001',
    createdAt: getRandomDate(5),
  },
  {
    id: 'report_comp_003',
    reportNo: 'CMP-2024-0003',
    inquiryId: 'inquiry_003',
    requirementId: 'req_003',
    quotes: [
      {
        supplierId: 'supp_001',
        supplierName: '深圳市科技创新有限公司',
        unitPrice: 58000,
        totalPrice: 290000,
        deliveryDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
        priceScore: 92,
        deliveryScore: 75,
        qualityScore: 90,
        totalScore: 85.7,
        rank: 2,
      },
      {
        supplierId: 'supp_005',
        supplierName: '北京市软件服务有限公司',
        unitPrice: 62000,
        totalPrice: 310000,
        deliveryDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        priceScore: 85,
        deliveryScore: 90,
        qualityScore: 98,
        totalScore: 91.0,
        rank: 1,
      },
    ],
    recommendedSupplierId: 'supp_005',
    recommendationReason: '服务器设备属于关键基础设施，质量和售后至关重要。北京软件提供5年保修和7x24小时上门服务，虽然总价高2万元，但赠送一年运维服务（价值约3万元），实际收益更高。',
    createdById: 'user_001',
    createdAt: getRandomDate(8),
  },
  {
    id: 'report_comp_004',
    reportNo: 'CMP-2024-0004',
    inquiryId: 'inquiry_004',
    requirementId: 'req_004',
    quotes: [
      {
        supplierId: 'supp_003',
        supplierName: '东莞市原材料加工厂',
        unitPrice: 4200,
        totalPrice: 2100000,
        deliveryDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        priceScore: 90,
        deliveryScore: 88,
        qualityScore: 92,
        totalScore: 90.0,
        rank: 1,
      },
    ],
    recommendedSupplierId: 'supp_003',
    recommendationReason: '独家供应商，历史合作234单，总金额2,890万元，准时交货率96%，质量合格率98%。报价合理，建议继续合作。',
    createdById: 'user_001',
    createdAt: getRandomDate(15),
  },
];

export const mockReceipts: Receipt[] = [
  {
    id: 'receipt_001',
    receiptNo: 'RCT-2024-0031',
    orderId: 'order_001',
    receivedQuantity: 50,
    acceptedQuantity: 48,
    rejectedQuantity: 2,
    inspectionReport: '来料检验合格，2件外观瑕疵',
    status: 'partial',
    receivedById: 'user_003',
    receivedAt: getRandomDate(3),
    createdAt: getRandomDate(3),
  },
  {
    id: 'receipt_002',
    receiptNo: 'RCT-2024-0032',
    orderId: 'order_002',
    receivedQuantity: 20,
    acceptedQuantity: 20,
    rejectedQuantity: 0,
    inspectionReport: '检验合格，全部接收',
    status: 'accepted',
    receivedById: 'user_003',
    receivedAt: getRandomDate(5),
    createdAt: getRandomDate(5),
  },
];

export const mockApprovalFlows: ApprovalFlow[] = [
  {
    id: 'approval_001',
    type: 'payment_approval',
    status: 'pending',
    currentNode: 1,
    relatedId: 'payment_001',
    relatedType: 'payment',
    nodes: [
      {
        id: 'node_001',
        flowId: 'approval_001',
        level: 1,
        approverRole: 'finance',
        approverId: 'user_003',
        status: 'approved',
        comment: '单据齐全，同意支付',
        approvedAt: getRandomDate(1),
      },
      {
        id: 'node_002',
        flowId: 'approval_001',
        level: 2,
        approverRole: 'finance_director',
        approverId: undefined,
        status: 'pending',
      },
      {
        id: 'node_003',
        flowId: 'approval_001',
        level: 3,
        approverRole: 'ceo',
        approverId: undefined,
        status: 'pending',
      },
    ],
    createdAt: getRandomDate(5),
  },
  {
    id: 'approval_002',
    type: 'purchase_approval',
    status: 'pending',
    currentNode: 0,
    relatedId: 'req_003',
    relatedType: 'requirement',
    nodes: [
      {
        id: 'node_004',
        flowId: 'approval_002',
        level: 1,
        approverRole: 'buyer',
        approverId: undefined,
        status: 'pending',
      },
    ],
    createdAt: getRandomDate(2),
  },
];

let revenueCounter = 500;
const generateRevenueNo = () => {
  revenueCounter++;
  return `REV-2024-${String(revenueCounter).padStart(6, '0')}`;
};

export const mockRevenueRecords: RevenueRecord[] = Array.from({ length: 100 }, (_, i) => {
  const businessLine: { value: string; label: string } = getRandomElement(BUSINESS_LINES);
  const channel: { value: string; label: string } = getRandomElement(CHANNELS);
  const statuses: ReconciliationStatus[] = ['pending', 'matched', 'diff', 'reconciled'];
  const transactionDate = getRandomDate(60);
  const customerName = `客户${i + 1}`;
  const transactionNo = `TXN${Date.now()}${i.toString().padStart(4, '0')}`;
  
  return {
    id: `rev_${i + 1}`,
    revenueNo: generateRevenueNo(),
    businessLine: businessLine.value,
    channel: channel.value,
    amount: Math.floor(Math.random() * 50000) + 1000,
    currency: 'CNY',
    transactionDate,
    transactionId: `TXN${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
    transactionNo,
    transactionTime: transactionDate,
    customerName,
    customer: customerName,
    description: `${businessLine.label} - ${channel.label}`,
    reconciliationStatus: getRandomElement(statuses),
    splitDetails: [],
    createdById: 'user_001',
    createdAt: getRandomDate(60),
    updatedAt: getRandomDate(30),
  };
});

let settlementCounter = 100;
const generateSettlementNo = () => {
  settlementCounter++;
  return `SET-2024-${String(settlementCounter).padStart(4, '0')}`;
};

export const mockSettlements: Settlement[] = Array.from({ length: 20 }, (_, i) => {
  const businessLine: { value: string; label: string } = getRandomElement(BUSINESS_LINES);
  const statuses: SettlementStatus[] = ['draft', 'pending_approval', 'approved', 'completed'];
  const status = getRandomElement(statuses);
  const totalAmount = Math.floor(Math.random() * 200000) + 50000;
  
  return {
    id: `set_${i + 1}`,
    settlementNo: generateSettlementNo(),
    businessLine: businessLine.value,
    settlementDate: getRandomDate(30),
    totalAmount,
    currency: 'CNY',
    status,
    revenueIds: [],
    splitDetails: [],
    paymentInstructions: [],
    budgetThreshold: 100000,
    overBudget: totalAmount > 100000,
    createdById: 'user_001',
    createdAt: getRandomDate(30),
    updatedAt: getRandomDate(15),
  };
});

let splitRuleCounter = 50;
const generateSplitRuleNo = () => {
  splitRuleCounter++;
  return `SR-${String(splitRuleCounter).padStart(4, '0')}`;
};

export const mockSplitRules: SplitRule[] = [
  {
    id: 'sr_001',
    ruleNo: generateSplitRuleNo(),
    name: '电商业务分成规则',
    description: '电商平台默认分成规则',
    businessLine: 'ecommerce',
    effectiveStartDate: new Date('2024-01-01'),
    effectiveDate: new Date('2024-01-01'),
    expiryDate: undefined,
    status: 'active',
    ratios: { 'partner_001': 0.7, 'partner_002': 0.2, 'platform': 0.1 },
    recipients: [
      { recipientId: 'partner_001', recipientName: '合作伙伴A', recipientType: 'partner', ratio: 0.7 },
      { recipientId: 'partner_002', recipientName: '合作伙伴B', recipientType: 'partner', ratio: 0.2 },
      { recipientId: 'platform', recipientName: '平台', recipientType: 'platform', ratio: 0.1 },
    ],
    version: 1,
    createdById: 'user_001',
    createdBy: 'user_001',
    approvalFlowId: 'af_001',
    approvedById: 'user_004',
    approvedAt: new Date('2024-01-15'),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: 'sr_002',
    ruleNo: generateSplitRuleNo(),
    name: '零售业务分成规则',
    description: '线下门店分成规则',
    businessLine: 'retail',
    effectiveStartDate: new Date('2024-01-01'),
    effectiveDate: new Date('2024-01-01'),
    expiryDate: undefined,
    status: 'active',
    ratios: { 'partner_003': 0.6, 'internal': 0.3, 'platform': 0.1 },
    recipients: [
      { recipientId: 'partner_003', recipientName: '门店运营商', recipientType: 'partner', ratio: 0.6 },
      { recipientId: 'internal', recipientName: '内部团队', recipientType: 'internal', ratio: 0.3 },
      { recipientId: 'platform', recipientName: '平台', recipientType: 'platform', ratio: 0.1 },
    ],
    version: 2,
    createdById: 'user_001',
    createdBy: 'user_001',
    approvalFlowId: 'af_002',
    approvedById: 'user_004',
    approvedAt: new Date('2024-02-01'),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-02-01'),
  },
];

export const mockSplitRuleHistories: SplitRuleHistory[] = [
  {
    id: 'srh_001',
    ruleId: 'sr_002',
    version: 2,
    action: 'updated',
    oldRatios: { 'partner_003': 0.5, 'internal': 0.35, 'platform': 0.15 },
    newRatios: { 'partner_003': 0.6, 'internal': 0.3, 'platform': 0.1 },
    changedById: 'user_001',
    changedBy: 'user_001',
    changedAt: new Date('2024-02-01'),
    createdAt: new Date('2024-02-01'),
    changeReason: '业务调整',
    remark: '调整分成比例',
  },
];

export const generatePaymentInstructions = (settlementId: string, amount: number): PaymentInstruction[] => {
  return [
    {
      id: `pi_${Date.now()}_1`,
      instructionNo: `PI-${Date.now().toString().slice(-8)}_01`,
      settlementId,
      recipientId: 'partner_001',
      recipientName: '合作伙伴A',
      bankAccount: '7559 1234 5678 9012',
      bankName: '招商银行深圳分行',
      amount: amount * 0.7,
      currency: 'CNY',
      status: 'pending',
      createdById: 'user_001',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: `pi_${Date.now()}_2`,
      instructionNo: `PI-${Date.now().toString().slice(-8)}_02`,
      settlementId,
      recipientId: 'partner_002',
      recipientName: '合作伙伴B',
      bankAccount: '3602 8765 4321 0987',
      bankName: '工商银行广州分行',
      amount: amount * 0.2,
      currency: 'CNY',
      status: 'pending',
      createdById: 'user_001',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];
};

export const generateSplitDetails = (settlementId: string, revenueIds: string[], totalAmount: number): SplitDetail[] => {
  return revenueIds.map((revenueId, index) => ({
    id: `sd_${settlementId}_${index}`,
    settlementId,
    revenueId,
    recipientId: 'partner_001',
    recipientName: '合作伙伴A',
    recipientType: 'partner' as const,
    amount: (totalAmount / revenueIds.length) * 0.7,
    ratio: 0.7,
    splitRuleId: 'sr_001',
    splitRuleName: '电商业务分成规则',
    createdAt: new Date(),
  }));
};

export const generateApprovalNodes = (flowId: string): ApprovalNode[] => {
  return [
    {
      id: `an_${flowId}_1`,
      flowId,
      level: 1,
      approverRole: 'finance',
      approverId: 'user_003',
      status: 'approved',
      comment: '单据齐全，同意支付',
      approvedAt: getRandomDate(5),
    },
    {
      id: `an_${flowId}_2`,
      flowId,
      level: 2,
      approverRole: 'finance_director',
      approverId: 'user_004',
      status: 'pending',
    },
  ];
};

export const mockOperationLogs = mockLogs;

export { formatMoney, generateId, getRandomDate, getRandomFutureDate, getRandomElement };
