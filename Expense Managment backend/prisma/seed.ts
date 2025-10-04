import { PrismaClient, UserRole, ApprovalRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create a sample company
  const company = await prisma.company.create({
    data: {
      name: 'Acme Corporation',
      defaultCurrency: 'USD',
    },
  });
  console.log('✅ Created company:', company.name);

  // Create users
  const admin = await prisma.user.create({
    data: {
      email: 'admin@acme.com',
      name: 'Alice Admin',
      role: UserRole.Admin,
      companyId: company.id,
    },
  });

  const manager = await prisma.user.create({
    data: {
      email: 'manager@acme.com',
      name: 'Bob Manager',
      role: UserRole.Manager,
      companyId: company.id,
    },
  });

  const employee1 = await prisma.user.create({
    data: {
      email: 'employee1@acme.com',
      name: 'Charlie Employee',
      role: UserRole.Employee,
      companyId: company.id,
    },
  });

  const employee2 = await prisma.user.create({
    data: {
      email: 'employee2@acme.com',
      name: 'Diana Worker',
      role: UserRole.Employee,
      companyId: company.id,
    },
  });

  const finance = await prisma.user.create({
    data: {
      email: 'finance@acme.com',
      name: 'Eve Finance',
      role: UserRole.Manager,
      companyId: company.id,
    },
  });

  const director = await prisma.user.create({
    data: {
      email: 'director@acme.com',
      name: 'Frank Director',
      role: UserRole.Admin,
      companyId: company.id,
    },
  });

  console.log('✅ Created users');

  // Assign employees to manager
  await prisma.managerAssignment.createMany({
    data: [
      {
        companyId: company.id,
        employeeId: employee1.id,
        managerId: manager.id,
      },
      {
        companyId: company.id,
        employeeId: employee2.id,
        managerId: manager.id,
      },
    ],
  });
  console.log('✅ Assigned employees to manager');

  // Create approval flow (3 steps)
  await prisma.approvalFlowStep.createMany({
    data: [
      {
        companyId: company.id,
        stepNumber: 1,
        approverRole: ApprovalRole.Manager,
      },
      {
        companyId: company.id,
        stepNumber: 2,
        approverRole: ApprovalRole.Finance,
        staticApproverId: finance.id,
      },
      {
        companyId: company.id,
        stepNumber: 3,
        approverRole: ApprovalRole.Director,
        staticApproverId: director.id,
      },
    ],
  });
  console.log('✅ Created 3-step approval flow (Manager → Finance → Director)');

  // Create sample expenses
  const expense1 = await prisma.expense.create({
    data: {
      companyId: company.id,
      employeeId: employee1.id,
      amount: 250,
      originalCurrency: 'USD',
      companyCurrencyAmount: 250,
      category: 'Office Supplies',
      description: 'Laptop accessories',
      date: new Date('2025-10-01'),
    },
  });

  const expense2 = await prisma.expense.create({
    data: {
      companyId: company.id,
      employeeId: employee2.id,
      amount: 750,
      originalCurrency: 'USD',
      companyCurrencyAmount: 750,
      category: 'Travel',
      description: 'Conference flight tickets',
      date: new Date('2025-10-02'),
    },
  });

  console.log('✅ Created sample expenses');
  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📝 Sample credentials:');
  console.log('  Admin:     admin@acme.com');
  console.log('  Manager:   manager@acme.com');
  console.log('  Employee:  employee1@acme.com, employee2@acme.com');
  console.log('  Finance:   finance@acme.com');
  console.log('  Director:  director@acme.com');
  console.log(`\n🏢 Company ID: ${company.id}`);
  console.log(`💰 Expense 1 (< $500): ${expense1.id}`);
  console.log(`💰 Expense 2 (> $500): ${expense2.id}`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

