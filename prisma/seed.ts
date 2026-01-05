import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Hash password for super-admin
  const hashedPassword = await bcrypt.hash('Pass@1234', 10);

  // ============================================
  // 1. Create Super Admin Role
  // ============================================
  console.log('📋 Creating super_admin role...');

  const superAdminRole = await prisma.role.upsert({
    where: { name: 'super_admin' },
    update: {},
    create: { name: 'super_admin' },
  });

  // ============================================
  // 2. Create Super Admin User
  // ============================================
  console.log('👥 Creating super admin user...');

  const superAdmin = await prisma.user.upsert({
    where: { email: 'robor.eminokanju@gmail.com' },
    update: {
      passwordHash: hashedPassword, // Update password if user exists
    },
    create: {
      email: 'robor.eminokanju@gmail.com',
      firstName: 'Super',
      lastName: 'Admin',
      passwordHash: hashedPassword,
    },
  });

  // ============================================
  // 3. Assign Super Admin Role
  // ============================================
  console.log('🔐 Assigning super_admin role...');

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: superAdmin.id,
        roleId: superAdminRole.id,
      },
    },
    update: {},
    create: {
      userId: superAdmin.id,
      roleId: superAdminRole.id,
    },
  });

  // ============================================
  // Summary
  // ============================================
  console.log('\n✅ Seed completed successfully!\n');
  console.log('📊 Summary:');
  console.log(`   - Super Admin User Created`);
  console.log('\n🔑 Login Credentials:');
  console.log(`   Email: robor.eminokanju@gmail.com`);
  console.log(`   Password: Pass@1234`);
  console.log('\n⚠️  Please change the password after first login!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

