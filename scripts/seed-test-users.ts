import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

async function seedTestUsers() {
  try {
    console.log('🌱 Seeding test users...');

    // Create default roles first
    const adminRole = await prisma.role.upsert({
      where: { code: 'admin' },
      update: {},
      create: {
        id: `role_${Date.now()}_${randomBytes(8).toString('hex')}`,
        name: 'Administrator',
        code: 'admin',
        description: 'Full system access',
        level: 100,
        isSystemRole: true,
        isActive: true,
      },
    });

    const userRole = await prisma.role.upsert({
      where: { code: 'user' },
      update: {},
      create: {
        id: `role_${Date.now()}_${randomBytes(8).toString('hex')}`,
        name: 'User',
        code: 'user',
        description: 'Standard user access',
        level: 10,
        isSystemRole: true,
        isActive: true,
      },
    });

    console.log('✅ Roles created');

    // Create test users
    const testUsers = [
      {
        email: 'admin@personalai.com',
        username: 'admin',
        password: 'Admin@2025',
        firstName: 'Admin',
        lastName: 'User',
        roleCode: 'admin',
      },
      {
        email: 'portfolio@user.com',
        username: 'portfolio',
        password: 'Portfolio@2025',
        firstName: 'Portfolio',
        lastName: 'User',
        roleCode: 'user',
      },
      {
        email: 'sankaz@example.com',
        username: 'sankaz',
        password: 'Sankaz#3E25167B@2025',
        firstName: 'Sankaz',
        lastName: 'Admin',
        roleCode: 'admin',
      },
      {
        email: 'test@personalai.com',
        username: 'testuser',
        password: 'Test@123',
        firstName: 'Test',
        lastName: 'User',
        roleCode: 'user',
      },
    ];

    for (const userData of testUsers) {
      // Check if user already exists
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email: userData.email },
            { username: userData.username },
          ],
        },
      });

      if (existingUser) {
        console.log(`⚠️  User ${userData.email} already exists, skipping...`);
        continue;
      }

      // Hash password
      const passwordHash = await bcrypt.hash(userData.password, 12);

      // Create user
      const user = await prisma.user.create({
        data: {
          id: `user_${Date.now()}_${randomBytes(8).toString('hex')}`,
          email: userData.email,
          username: userData.username,
          passwordHash,
          firstName: userData.firstName,
          lastName: userData.lastName,
          displayName: `${userData.firstName} ${userData.lastName}`,
          isActive: true,
          emailVerified: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Create user profile
      await prisma.userProfile.create({
        data: {
          id: `profile_${Date.now()}_${randomBytes(8).toString('hex')}`,
          userId: user.id,
          language: 'en',
          timezone: 'UTC',
          currency: 'USD',
        },
      });

      // Assign role
      const role = userData.roleCode === 'admin' ? adminRole : userRole;
      await prisma.userRole.create({
        data: {
          id: `userrole_${Date.now()}_${randomBytes(8).toString('hex')}`,
          userId: user.id,
          roleId: role.id,
          isActive: true,
        },
      });

      console.log(`✅ Created user: ${userData.email} (${userData.roleCode})`);
    }

    console.log('🎉 Test users seeded successfully!');
    console.log('');
    console.log('📋 Login Credentials:');
    console.log('===================');
    for (const user of testUsers) {
      console.log(`${user.email} / ${user.password} (${user.roleCode})`);
    }

  } catch (error) {
    console.error('❌ Error seeding users:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  seedTestUsers()
    .then(() => {
      console.log('✅ Seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}

export { seedTestUsers };