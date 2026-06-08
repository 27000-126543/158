import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient, UserRole, PurchaseRequirementStatus, SupplierStatus, PerformanceLevel, InquiryStatus, QuoteStatus, PurchaseOrderStatus, LogisticsStatus, ReceiptStatus, PaymentStatus, PaymentType, ApprovalFlowType, ApprovalStatus, AlertType, AlertLevel } from '@prisma/client';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const prisma = new PrismaClient();

async function main() {
  console.log('开始创建采购系统种子数据...');

  const hashedPassword = await bcrypt.hash('password123', 10);
  const buyerPassword = await bcrypt.hash('buyer123', 10);
  const ceoPassword = await bcrypt.hash('ceo123', 10);
  const directorPassword = await bcrypt.hash('director123', 10);
  const financePassword = await bcrypt.hash('finance123', 10);
  const adminPassword = await bcrypt.hash('admin123', 10);

  await prisma.$transaction(async (tx) => {
    await tx.operationLog.deleteMany();
    await tx.systemAlert.deleteMany();
    await tx.monthlyReport.deleteMany();
    await tx.approvalNode.deleteMany();
    await tx.approvalFlow.deleteMany();
    await tx.payment.deleteMany();
    await tx.receipt.deleteMany();
    await tx.purchaseOrder.deleteMany();
    await tx.comparisonReport.deleteMany();
    await tx.quote.deleteMany();
    await tx.inquiry.deleteMany();
    await tx.purchaseRequirement.deleteMany();
    await tx.user.deleteMany();
    await tx.supplier.deleteMany();
    await tx.category.deleteMany();

    const categories = [
      { name: '电子设备', code: 'ELEC', level: 1 },
      { name: '办公设备', code: 'OFFICE', level: 1 },
      { name: '原材料', code: 'MATERIAL', level: 1 },
      { name: '包装材料', code: 'PACKAGE', level: 1 },
      { name: '软件服务', code: 'SOFTWARE', level: 1 },
      { name: '办公耗材', code: 'SUPPLIES', level: 1 },
    ];

    const createdCategories: Record<string, string> = {};
    for (const cat of categories) {
      const category = await tx.category.create({
        data: {
          ...cat,
          children: { create: [] },
        },
      });
      createdCategories[cat.code] = category.id;
      console.log(`创建品类: ${cat.name} (${cat.code})`);
    }

    const users = [
      {
        username: 'buyer_zhang',
        realName: '张采购',
        role: UserRole.buyer,
        email: 'buyer@company.com',
        phone: '13800000001',
        password: buyerPassword,
        department: '采购部',
      },
      {
        username: 'finance_wang',
        realName: '王财务',
        role: UserRole.finance,
        email: 'finance@company.com',
        phone: '13800000002',
        password: financePassword,
        department: '财务部',
      },
      {
        username: 'finance_director',
        realName: '李总监',
        role: UserRole.finance_director,
        email: 'finance_director@company.com',
        phone: '13800000003',
        password: directorPassword,
        department: '财务部',
      },
      {
        username: 'ceo',
        realName: '赵总裁',
        role: UserRole.ceo,
        email: 'ceo@company.com',
        phone: '13800000004',
        password: ceoPassword,
        department: '总裁办',
      },
      {
        username: 'admin',
        realName: '系统管理员',
        role: UserRole.admin,
        email: 'admin@company.com',
        phone: '13800000005',
        password: adminPassword,
        department: 'IT部',
      },
    ];

    const createdUsers: Record<string, string> = {};
    for (const user of users) {
      const created = await tx.user.create({ data: user });
      createdUsers[user.username] = created.id;
      console.log(`创建用户: ${user.realName} (${user.username})`);
    }

    const suppliers = [
      {
        supplierNo: 'SUP-20240601-0001',
        name: '深圳市科创电子有限公司',
        shortName: '科创电子',
        categoryId: createdCategories['ELEC'],
        contactName: '陈经理',
        contactPhone: '13900000001',
        contactEmail: 'chen@kechuang.com',
        address: '深圳市南山区科技园',
        businessLicense: '91440300MA5EXAMPLE',
        taxNumber: '91440300MA5EXAMPLE',
        bankName: '招商银行深圳分行',
        bankAccount: '7559 1234 5678 9012',
        status: SupplierStatus.active,
        creditRating: 95,
        performanceScore: 92.5,
        performanceLevel: PerformanceLevel.excellent,
        totalOrders: 156,
        totalAmount: 8560000,
        onTimeDeliveryRate: 0.98,
        qualityPassRate: 0.99,
        satisfactionScore: 94,
      },
      {
        supplierNo: 'SUP-20240601-0002',
        name: '广州办公设备有限公司',
        shortName: '广办设备',
        categoryId: createdCategories['OFFICE'],
        contactName: '林经理',
        contactPhone: '13900000002',
        contactEmail: 'lin@guangban.com',
        address: '广州市天河区珠江新城',
        businessLicense: '91440100MA5EXAMPLE',
        taxNumber: '91440100MA5EXAMPLE',
        bankName: '工商银行广州分行',
        bankAccount: '3602 0000 1234 5678',
        status: SupplierStatus.active,
        creditRating: 90,
        performanceScore: 88,
        performanceLevel: PerformanceLevel.good,
        totalOrders: 89,
        totalAmount: 3200000,
        onTimeDeliveryRate: 0.95,
        qualityPassRate: 0.97,
        satisfactionScore: 90,
      },
      {
        supplierNo: 'SUP-20240601-0003',
        name: '东莞市材料科技有限公司',
        shortName: '东莞材料',
        categoryId: createdCategories['MATERIAL'],
        contactName: '王经理',
        contactPhone: '13900000003',
        contactEmail: 'wang@dongguan.com',
        address: '东莞市松山湖产业园区',
        businessLicense: '91441900MA5EXAMPLE',
        taxNumber: '91441900MA5EXAMPLE',
        bankName: '建设银行东莞分行',
        bankAccount: '3320 0000 9876 5432',
        status: SupplierStatus.active,
        creditRating: 88,
        performanceScore: 85,
        performanceLevel: PerformanceLevel.good,
        totalOrders: 234,
        totalAmount: 15600000,
        onTimeDeliveryRate: 0.92,
        qualityPassRate: 0.96,
        satisfactionScore: 88,
      },
      {
        supplierNo: 'SUP-20240601-0004',
        name: '佛山市包装制品有限公司',
        shortName: '佛山包装',
        categoryId: createdCategories['PACKAGE'],
        contactName: '张经理',
        contactPhone: '13900000004',
        contactEmail: 'zhang@foshan.com',
        address: '佛山市顺德区龙江镇',
        businessLicense: '91440600MA5EXAMPLE',
        taxNumber: '91440600MA5EXAMPLE',
        bankName: '农业银行佛山分行',
        bankAccount: '4442 0000 5678 1234',
        status: SupplierStatus.active,
        creditRating: 85,
        performanceScore: 82,
        performanceLevel: PerformanceLevel.average,
        totalOrders: 178,
        totalAmount: 2300000,
        onTimeDeliveryRate: 0.9,
        qualityPassRate: 0.94,
        satisfactionScore: 85,
      },
      {
        supplierNo: 'SUP-20240601-0005',
        name: '北京软件技术有限公司',
        shortName: '北京软件',
        categoryId: createdCategories['SOFTWARE'],
        contactName: '刘经理',
        contactPhone: '13900000005',
        contactEmail: 'liu@beijing.com',
        address: '北京市海淀区中关村',
        businessLicense: '91110108MA5EXAMPLE',
        taxNumber: '91110108MA5EXAMPLE',
        bankName: '中国银行北京分行',
        bankAccount: '3312 0000 8765 4321',
        status: SupplierStatus.active,
        creditRating: 92,
        performanceScore: 90,
        performanceLevel: PerformanceLevel.excellent,
        totalOrders: 45,
        totalAmount: 6800000,
        onTimeDeliveryRate: 0.97,
        qualityPassRate: 0.98,
        satisfactionScore: 93,
      },
    ];

    const createdSuppliers: Record<string, string> = {};
    for (const supplier of suppliers) {
      const created = await tx.supplier.create({ data: supplier });
      createdSuppliers[supplier.shortName] = created.id;
      console.log(`创建供应商: ${supplier.name}`);
    }

    const today = new Date();
    const requirements = [];
    for (let i = 1; i <= 50; i++) {
      const categoryCodes = ['ELEC', 'OFFICE', 'MATERIAL', 'PACKAGE', 'SOFTWARE', 'SUPPLIES'];
      const categoryCode = categoryCodes[i % categoryCodes.length];
      const itemNames: Record<string, string[]> = {
        ELEC: ['笔记本电脑', '显示器', '服务器', '打印机', '网络设备'],
        OFFICE: ['办公桌椅', '文件柜', '会议桌', '投影仪', '碎纸机'],
        MATERIAL: ['不锈钢板', '铝合金型材', '工程塑料', '铜线材', '玻璃板材'],
        PACKAGE: ['纸箱', '泡沫衬垫', '封箱胶带', '打包带', '标签贴纸'],
        SOFTWARE: ['ERP系统', 'CRM系统', 'OA系统', '设计软件', '安全软件'],
        SUPPLIES: ['打印纸', '墨盒', '文件夹', '签字笔', '订书机'],
      };
      const itemName = itemNames[categoryCode][i % itemNames[categoryCode].length];
      const quantity = Math.floor(Math.random() * 100) + 10;
      const budget = quantity * (Math.floor(Math.random() * 5000) + 500);
      const expectedDate = new Date(today.getTime() + Math.random() * 30 * 24 * 60 * 60 * 1000);
      const statuses = Object.values(PurchaseRequirementStatus);
      const status = statuses[i % statuses.length];

      requirements.push({
        requirementNo: `REQ-202406${String(i).padStart(4, '0')}`,
        title: `${itemName}采购需求`,
        categoryId: createdCategories[categoryCode],
        itemName,
        specification: `规格${i}`,
        quantity,
        unit: ['台', '件', '套', '个', '箱'][i % 5],
        budget,
        expectedDate,
        description: `采购${itemName}${quantity}${['台', '件', '套', '个', '箱'][i % 5]}，用于公司日常运营。`,
        requesterId: createdUsers['buyer_zhang'],
        status,
      });
    }

    const createdRequirements: string[] = [];
    for (const req of requirements) {
      const created = await tx.purchaseRequirement.create({ data: req });
      createdRequirements.push(created.id);
    }
    console.log(`创建${requirements.length}条采购需求`);

    const orders = [];
    for (let i = 1; i <= 30; i++) {
      const supplierShortNames = ['科创电子', '广办设备', '东莞材料', '佛山包装', '北京软件'];
      const supplierShortName = supplierShortNames[i % supplierShortNames.length];
      const categoryCodes = ['ELEC', 'OFFICE', 'MATERIAL', 'PACKAGE', 'SOFTWARE'];
      const categoryCode = categoryCodes[i % categoryCodes.length];
      const itemNames = ['笔记本电脑', '办公桌椅', '不锈钢板', '纸箱', 'ERP系统'];
      const itemName = itemNames[i % itemNames.length];
      const quantity = Math.floor(Math.random() * 50) + 5;
      const unitPrice = Math.floor(Math.random() * 8000) + 1000;
      const totalAmount = quantity * unitPrice;
      const statuses = Object.values(PurchaseOrderStatus);
      const status = statuses[i % statuses.length];
      const logisticsStatuses = Object.values(LogisticsStatus);
      const logisticsStatus = logisticsStatuses[i % logisticsStatuses.length];

      orders.push({
        orderNo: `PO-202406${String(i).padStart(4, '0')}`,
        requirementId: createdRequirements[i],
        supplierId: createdSuppliers[supplierShortName],
        categoryId: createdCategories[categoryCode],
        itemName,
        specification: `规格${i}`,
        quantity,
        unit: ['台', '件', '套', '个', '箱'][i % 5],
        unitPrice,
        totalAmount,
        deliveryDate: new Date(today.getTime() + Math.random() * 20 * 24 * 60 * 60 * 1000),
        deliveryAddress: '公司仓库（北京市朝阳区）',
        paymentTerms: i % 3 === 0 ? '预付30%，发货前付70%' : i % 3 === 1 ? '月结30天' : '发货前全款',
        status,
        logisticsStatus,
        trackingNumber: i % 2 === 0 ? `SF${String(1000000000000 + i)}` : null,
        shippingCompany: i % 2 === 0 ? '顺丰速运' : null,
        createdById: createdUsers['buyer_zhang'],
      });
    }

    const createdOrders: string[] = [];
    for (const order of orders) {
      const created = await tx.purchaseOrder.create({ data: order });
      createdOrders.push(created.id);
    }
    console.log(`创建${orders.length}条采购订单`);

    const payments = [];
    for (let i = 1; i <= 20; i++) {
      const orderAmount = orders[i].totalAmount;
      const paymentTypes = Object.values(PaymentType);
      const statuses = Object.values(PaymentStatus);
      const paymentType = paymentTypes[i % paymentTypes.length];
      const status = statuses[i % statuses.length];
      const amount = paymentType === PaymentType.advance ? orderAmount * 0.3 : paymentType === PaymentType.final ? orderAmount * 0.7 : orderAmount;
      const approvalLevel = amount > 2000000 ? 2 : amount > 500000 ? 1 : 0;

      payments.push({
        paymentNo: `PAY-202406${String(i).padStart(4, '0')}`,
        orderId: createdOrders[i],
        amount,
        paymentType,
        dueDate: new Date(today.getTime() + Math.random() * 15 * 24 * 60 * 60 * 1000),
        actualPaidDate: status === PaymentStatus.paid ? new Date() : null,
        status,
        supplierId: orders[i].supplierId,
        approvalLevel,
      });
    }

    for (const payment of payments) {
      await tx.payment.create({ data: payment });
    }
    console.log(`创建${payments.length}条付款记录`);

    const alerts = [
      {
        type: AlertType.order_delay,
        level: AlertLevel.warning,
        title: '供应商延迟到货提醒',
        content: '供应商深圳市科创电子有限公司订单PO-2024-0075预计延迟2天到货',
        relatedId: createdOrders[0],
        status: 'unread',
      },
      {
        type: AlertType.payment_overdue,
        level: AlertLevel.error,
        title: '款项逾期提醒',
        content: '款项¥568,000.00已逾期，请尽快处理',
        relatedId: payments[0].paymentNo,
        status: 'unread',
      },
      {
        type: AlertType.approval_timeout,
        level: AlertLevel.warning,
        title: '审批待办提醒',
        content: '请相关审批人员尽快处理待办事项',
        status: 'unread',
      },
      {
        type: AlertType.supplier_risk,
        level: AlertLevel.warning,
        title: '供应商信用风险提醒',
        content: '供应商近期3次交货延迟，信用评分降至85分',
        relatedId: createdSuppliers['东莞材料'],
        status: 'unread',
      },
      {
        type: AlertType.quality_issue,
        level: AlertLevel.error,
        title: '质量问题提醒',
        content: '订单PO-2024-0075来料抽检不合格率15%',
        relatedId: createdOrders[5],
        status: 'unread',
      },
    ];

    for (const alert of alerts) {
      await tx.systemAlert.create({ data: alert });
    }
    console.log(`创建${alerts.length}条系统告警`);

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const yearMonth = `${year}-${String(month).padStart(2, '0')}`;

    const purchaseByCategory: Record<string, any> = {};
    for (const code of ['ELEC', 'OFFICE', 'MATERIAL', 'PACKAGE', 'SOFTWARE', 'SUPPLIES']) {
      purchaseByCategory[code] = {
        categoryName: categories.find(c => c.code === code)?.name,
        amount: Math.floor(Math.random() * 5000000) + 500000,
        orderCount: Math.floor(Math.random() * 50) + 10,
        percentage: Math.floor(Math.random() * 30) + 5,
      };
    }

    const supplierRanking = suppliers.map((s, idx) => ({
      rank: idx + 1,
      supplierName: s.name,
      amount: Math.floor(Math.random() * 3000000) + 500000,
      orderCount: Math.floor(Math.random() * 30) + 5,
      onTimeDeliveryRate: 0.85 + Math.random() * 0.15,
      qualityPassRate: 0.9 + Math.random() * 0.1,
    })).sort((a, b) => b.amount - a.amount).map((s, idx) => ({ ...s, rank: idx + 1 }));

    await tx.monthlyReport.create({
      data: {
        yearMonth,
        purchaseByCategory,
        supplierRanking,
        paymentTimeliness: {
          averagePaymentDays: Math.floor(Math.random() * 30) + 15,
          onTimePaymentRate: 0.8 + Math.random() * 0.2,
          totalPayments: 50 + Math.floor(Math.random() * 30),
          overduePayments: Math.floor(Math.random() * 5),
        },
        satisfactionScores: {
          average: 85 + Math.random() * 10,
          byCategory: {
            ELEC: 88 + Math.random() * 5,
            OFFICE: 85 + Math.random() * 5,
            MATERIAL: 82 + Math.random() * 5,
            PACKAGE: 80 + Math.random() * 5,
            SOFTWARE: 90 + Math.random() * 5,
          },
        },
        performanceMetrics: {
          totalPurchaseAmount: 25000000 + Math.floor(Math.random() * 10000000),
          totalOrders: 150 + Math.floor(Math.random() * 50),
          averageDeliveryDays: 10 + Math.floor(Math.random() * 10),
          qualityPassRate: 0.92 + Math.random() * 0.08,
          onTimePaymentRate: 0.85 + Math.random() * 0.15,
          supplierCount: 5,
          activeSupplierCount: 5,
        },
      },
    });
    console.log('创建月度报表');
  });

  console.log('采购系统种子数据创建成功！');
  console.log('');
  console.log('测试账号：');
  console.log('  采购员: buyer_zhang / buyer123');
  console.log('  财务: finance_wang / finance123');
  console.log('  财务总监: finance_director / director123');
  console.log('  总裁: ceo / ceo123');
  console.log('  管理员: admin / admin123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
