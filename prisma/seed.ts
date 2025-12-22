import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Hash password for all users (default: "password123")
  const hashedPassword = await bcrypt.hash('password123', 10);

  // ============================================
  // 1. Create Roles
  // ============================================
  console.log('📋 Creating roles...');

  const roles = {
    superAdmin: await prisma.role.upsert({
      where: { name: 'super_admin' },
      update: {},
      create: { name: 'super_admin' },
    }),
    admin: await prisma.role.upsert({
      where: { name: 'admin' },
      update: {},
      create: { name: 'admin' },
    }),
    platoonLeader: await prisma.role.upsert({
      where: { name: 'platoon_leader' },
      update: {},
      create: { name: 'platoon_leader' },
    }),
    assistantPlatoonLeader: await prisma.role.upsert({
      where: { name: 'assistant_platoon_leader' },
      update: {},
      create: { name: 'assistant_platoon_leader' },
    }),
    childrenTeacher: await prisma.role.upsert({
      where: { name: 'children_teacher' },
      update: {},
      create: { name: 'children_teacher' },
    }),
    kitchen: await prisma.role.upsert({
      where: { name: 'kitchen' },
      update: {},
      create: { name: 'kitchen' },
    }),
    distribution: await prisma.role.upsert({
      where: { name: 'distribution' },
      update: {},
      create: { name: 'distribution' },
    }),
    worker: await prisma.role.upsert({
      where: { name: 'worker' },
      update: {},
      create: { name: 'worker' },
    }),
  };

  // ============================================
  // 2. Create Users
  // ============================================
  console.log('👥 Creating users...');

  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@uams.test' },
    update: {},
    create: {
      email: 'superadmin@uams.test',
      firstName: 'Super',
      lastName: 'Admin',
      passwordHash: hashedPassword,
      phone: '+1234567890',
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@uams.test' },
    update: {},
    create: {
      email: 'admin@uams.test',
      firstName: 'Admin',
      lastName: 'User',
      passwordHash: hashedPassword,
      phone: '+1234567891',
    },
  });

  const platoonLeader = await prisma.user.upsert({
    where: { email: 'leader@uams.test' },
    update: {},
    create: {
      email: 'leader@uams.test',
      firstName: 'Platoon',
      lastName: 'Leader',
      passwordHash: hashedPassword,
      phone: '+1234567892',
    },
  });

  const distributionUser = await prisma.user.upsert({
    where: { email: 'distribution@uams.test' },
    update: {},
    create: {
      email: 'distribution@uams.test',
      firstName: 'Distribution',
      lastName: 'Team',
      passwordHash: hashedPassword,
      phone: '+1234567893',
    },
  });

  const kitchenUser = await prisma.user.upsert({
    where: { email: 'kitchen@uams.test' },
    update: {},
    create: {
      email: 'kitchen@uams.test',
      firstName: 'Kitchen',
      lastName: 'Team',
      passwordHash: hashedPassword,
      phone: '+1234567894',
    },
  });

  // ============================================
  // 3. Assign Roles to Users
  // ============================================
  console.log('🔐 Assigning roles...');

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: superAdmin.id,
        roleId: roles.superAdmin.id,
      },
    },
    update: {},
    create: {
      userId: superAdmin.id,
      roleId: roles.superAdmin.id,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: admin.id,
        roleId: roles.admin.id,
      },
    },
    update: {},
    create: {
      userId: admin.id,
      roleId: roles.admin.id,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: platoonLeader.id,
        roleId: roles.platoonLeader.id,
      },
    },
    update: {},
    create: {
      userId: platoonLeader.id,
      roleId: roles.platoonLeader.id,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: distributionUser.id,
        roleId: roles.distribution.id,
      },
    },
    update: {},
    create: {
      userId: distributionUser.id,
      roleId: roles.distribution.id,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: kitchenUser.id,
        roleId: roles.kitchen.id,
      },
    },
    update: {},
    create: {
      userId: kitchenUser.id,
      roleId: roles.kitchen.id,
    },
  });

  // ============================================
  // 4. Create Classes/Platoons
  // ============================================
  console.log('🏛️ Creating classes/platoons...');

  const platoon1 = await prisma.class.upsert({
    where: { id: '00000000-0000-0000-0000-00000000aaaa' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-00000000aaaa',
      name: 'Platoon Alpha',
      type: 'PLATOON',
    },
  });

  const platoon2 = await prisma.class.upsert({
    where: { id: '00000000-0000-0000-0000-00000000bbbb' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-00000000bbbb',
      name: 'Platoon Beta',
      type: 'PLATOON',
    },
  });

  const childrenClass1 = await prisma.class.upsert({
    where: { id: '00000000-0000-0000-0000-00000000cccc' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-00000000cccc',
      name: "Children's Class A",
      type: 'CHILDREN',
    },
  });

  // ============================================
  // 5. Assign Leaders to Classes
  // ============================================
  console.log('👨‍🏫 Assigning leaders to classes...');

  await prisma.classLeader.upsert({
    where: {
      classId_userId_role: {
        classId: platoon1.id,
        userId: platoonLeader.id,
        role: 'LEADER',
      },
    },
    update: {},
    create: {
      classId: platoon1.id,
      userId: platoonLeader.id,
      role: 'LEADER',
    },
  });

  await prisma.classLeader.upsert({
    where: {
      classId_userId_role: {
        classId: platoon2.id,
        userId: platoonLeader.id,
        role: 'LEADER',
      },
    },
    update: {},
    create: {
      classId: platoon2.id,
      userId: platoonLeader.id,
      role: 'LEADER',
    },
  });

  // ============================================
  // 6. Create Members
  // ============================================
  console.log('👤 Creating members...');

  const memberNames = [
    { firstName: 'John', lastName: 'Doe', birthday: '1990-01-15' },
    { firstName: 'Jane', lastName: 'Smith', birthday: '1992-03-22' },
    { firstName: 'Michael', lastName: 'Johnson', birthday: '1988-07-10' },
    { firstName: 'Emily', lastName: 'Williams', birthday: '1995-11-05' },
    { firstName: 'David', lastName: 'Brown', birthday: '1991-09-18' },
    { firstName: 'Sarah', lastName: 'Davis', birthday: '1993-04-30' },
    { firstName: 'Robert', lastName: 'Miller', birthday: '1989-12-12' },
    { firstName: 'Lisa', lastName: 'Wilson', birthday: '1994-06-25' },
    { firstName: 'James', lastName: 'Moore', birthday: '1990-08-08' },
    { firstName: 'Maria', lastName: 'Taylor', birthday: '1992-02-14' },
  ];

  const childrenNames = [
    { firstName: 'Emma', lastName: 'Anderson', birthday: '2015-05-20' },
    { firstName: 'Noah', lastName: 'Thomas', birthday: '2016-08-15' },
    { firstName: 'Olivia', lastName: 'Jackson', birthday: '2015-11-10' },
    { firstName: 'Liam', lastName: 'White', birthday: '2017-01-25' },
    { firstName: 'Ava', lastName: 'Harris', birthday: '2016-03-18' },
  ];

  // Create members for Platoon Alpha
  const memberIdsAlpha = [
    '00000000-0000-0000-0000-00000000001a',
    '00000000-0000-0000-0000-00000000002a',
    '00000000-0000-0000-0000-00000000003a',
    '00000000-0000-0000-0000-00000000004a',
    '00000000-0000-0000-0000-00000000005a',
  ];

  for (let i = 0; i < 5; i++) {
    await prisma.member.upsert({
      where: {
        id: memberIdsAlpha[i],
      },
      update: {},
      create: {
        id: memberIdsAlpha[i],
        firstName: memberNames[i].firstName,
        lastName: memberNames[i].lastName,
        birthday: new Date(memberNames[i].birthday),
        currentClassId: platoon1.id,
      },
    });
  }

  // Create members for Platoon Beta
  const memberIdsBeta = [
    '00000000-0000-0000-0000-00000000001b',
    '00000000-0000-0000-0000-00000000002b',
    '00000000-0000-0000-0000-00000000003b',
    '00000000-0000-0000-0000-00000000004b',
    '00000000-0000-0000-0000-00000000005b',
  ];

  for (let i = 5; i < 10; i++) {
    await prisma.member.upsert({
      where: {
        id: memberIdsBeta[i - 5],
      },
      update: {},
      create: {
        id: memberIdsBeta[i - 5],
        firstName: memberNames[i].firstName,
        lastName: memberNames[i].lastName,
        birthday: new Date(memberNames[i].birthday),
        currentClassId: platoon2.id,
      },
    });
  }

  // Create children members
  const memberIdsChildren = [
    '00000000-0000-0000-0000-00000000001c',
    '00000000-0000-0000-0000-00000000002c',
    '00000000-0000-0000-0000-00000000003c',
    '00000000-0000-0000-0000-00000000004c',
    '00000000-0000-0000-0000-00000000005c',
  ];

  for (let i = 0; i < childrenNames.length; i++) {
    await prisma.member.upsert({
      where: {
        id: memberIdsChildren[i],
      },
      update: {},
      create: {
        id: memberIdsChildren[i],
        firstName: childrenNames[i].firstName,
        lastName: childrenNames[i].lastName,
        birthday: new Date(childrenNames[i].birthday),
        currentClassId: childrenClass1.id,
      },
    });
  }

  // ============================================
  // 7. Create Sample Kitchen Recipes
  // ============================================
  console.log('🍳 Creating kitchen recipes...');

  const recipe1 = await prisma.kitchenRecipe.upsert({
    where: { id: '00000000-0000-0000-0000-00000000feed' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-00000000feed',
      name: 'Sunday Meal Pack',
      description: 'Standard meal pack for Sunday distribution',
    },
  });

  const recipe2 = await prisma.kitchenRecipe.upsert({
    where: { id: '00000000-0000-0000-0000-00000000cafe' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-00000000cafe',
      name: 'Snack Pack',
      description: 'Light snack pack for children',
    },
  });

  // ============================================
  // Summary
  // ============================================
  console.log('\n✅ Seed completed successfully!\n');
  console.log('📊 Summary:');
  console.log(`   - Users: 5 (super admin, admin, leader, distribution, kitchen)`);
  console.log(`   - Classes: 3 (2 platoons, 1 children's class)`);
  console.log(`   - Members: 15 (10 adults, 5 children)`);
  console.log(`   - Recipes: 2`);
  console.log('\n🔑 Test Credentials:');
  console.log('   All users have password: password123');
  console.log('\n📧 User Emails:');
  console.log(`   - Super Admin: superadmin@uams.test`);
  console.log(`   - Admin: admin@uams.test`);
  console.log(`   - Leader: leader@uams.test`);
  console.log(`   - Distribution: distribution@uams.test`);
  console.log(`   - Kitchen: kitchen@uams.test`);
  console.log('\n💡 JWT Claims for Testing:');
  console.log(`   Leader platoon_ids: ["${platoon1.id}", "${platoon2.id}"]`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

