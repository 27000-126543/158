import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('password123', 10);

  const users = [
    {
      username: 'admin',
      realName: '系统管理员',
      role: UserRole.admin,
      email: 'admin@company.com',
      phone: '13800000000',
      password: hashedPassword,
    },
    {
      username: 'finance_director',
      realName: '财务总监',
      role: UserRole.finance_director,
      email: 'finance_director@company.com',
      phone: '13800000001',
      password: hashedPassword,
    },
    {
      username: 'business_manager',
      realName: '业务经理',
      role: UserRole.business_manager,
      email: 'business_manager@company.com',
      phone: '13800000002',
      password: hashedPassword,
    },
    {
      username: 'finance',
      realName: '财务人员',
      role: UserRole.finance,
      email: 'finance@company.com',
      phone: '13800000003',
      password: hashedPassword,
    },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { username: user.username },
      update: user,
      create: user,
    });
  }

  const businessLines = ['业务线A', '业务线B', '业务线C'];
  const channels = ['线上渠道', '线下渠道', '合作伙伴'];
  const customers = ['客户甲', '客户乙', '客户丙', '客户丁', '客户戊'];

  for (const businessLine of businessLines) {
    await prisma.splitRule.upsert({
      where: { businessLine },
      update: {},
      create: {
        businessLine,
        ratios: {
          '业务线A': 0.6,
          '业务线B': 0.4,
        },
        effectiveDate: new Date('2025-01-01'),
        status: 'active',
        version: 1,
        createdBy: 'admin',
      },
    });
  }

  console.log('Seed data created successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
