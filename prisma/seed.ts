import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Order MUST match frontend AVAILABLE_ROLES IDs (1=super_admin, 2=admin, ... 8=worker)
// so that roleId sent from UI matches the database.
const ROLES_ORDER = [
  'super_admin',
  'admin',
  'platoon_leader',
  'assistant_platoon_leader',
  'children_teacher',
  'kitchen',
  'distribution',
  'worker',
] as const;

async function main() {
  console.log('🌱 Starting seed...');

  // Hash password for super-admin
  const hashedPassword = await bcrypt.hash('Pass@1234',10);


  // ============================================
  // 1. Create All Roles (order matches frontend IDs: 1=super_admin … 8=worker)
  // ============================================
  console.log('📋 Creating all roles...');

  const createdRoles: { name: string; id: number }[] = [];
  for (const roleName of ROLES_ORDER) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName },
    });
    createdRoles.push(role);
    console.log(`   ✓ ${roleName} (id: ${role.id})`);
  }

  // ============================================
  // 2. Create Super Admin User
  // ============================================
  console.log('\n👥 Creating super admin user...');

  const superAdmin = await prisma.user.upsert({
    where: { email: 'robor.eminokanju@gmail.com' },
    update: {
      passwordHash: hashedPassword,
    },
    create: {
      email: 'robor.eminokanju@gmail.com',
      firstName: 'Oghenekparobor',
      lastName: 'Eminokanju',
      passwordHash: hashedPassword,
    },
  });

  // ============================================
  // 3. Assign Super Admin Role to User
  // ============================================
  const superAdminRole = createdRoles.find((r) => r.name === 'super_admin');
  if (!superAdminRole) throw new Error('super_admin role not found');

  console.log('🔐 Assigning super_admin role to user...');

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
  console.log(`   - ${createdRoles.length} roles created: ${ROLES_ORDER.join(', ')}`);
  console.log(`   - Super Admin user created and assigned super_admin role`);
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

