#!/usr/bin/env tsx

import { prisma } from '../src/core/database/prisma';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

async function createAdminUser() {
  console.log('🔐 Creating Admin User...\n');

  // Generate secure credentials
  const username = 'admin_' + randomBytes(4).toString('hex');
  const password = generateSecurePassword();
  const email = `admin_${randomBytes(4).toString('hex')}@system.local`;

  try {
    // Check if admin role exists
    let adminRole = await prisma.role.findUnique({
      where: { code: 'admin' }
    });

    if (!adminRole) {
      // Create admin role
      adminRole = await prisma.role.create({
        data: {
          id: `role_admin_${Date.now()}`,
          name: 'Administrator',
          code: 'admin',
          description: 'Full system access',
          level: 100,
          isSystemRole: true,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      console.log('✅ Admin role created');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create admin user
    const adminUser = await prisma.user.create({
      data: {
        id: `user_admin_${Date.now()}_${randomBytes(8).toString('hex')}`,
        email,
        username,
        passwordHash,
        firstName: 'System',
        lastName: 'Administrator',
        displayName: 'System Admin',
        isActive: true,
        emailVerified: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    console.log('✅ Admin user created');

    // Assign admin role
    await prisma.userRole.create({
      data: {
        id: `userrole_${Date.now()}_${randomBytes(8).toString('hex')}`,
        userId: adminUser.id,
        roleId: adminRole.id,
        isActive: true
      }
    });

    console.log('✅ Admin role assigned');

    // Create all permissions for admin
    const permissions = [
      { code: 'system.all', name: 'All System Access', resource: 'system', action: 'all' },
      { code: 'user.all', name: 'All User Access', resource: 'user', action: 'all' },
      { code: 'terminal.access', name: 'Terminal Access', resource: 'terminal', action: 'access' },
    ];

    for (const perm of permissions) {
      let permission = await prisma.permission.findUnique({
        where: { code: perm.code }
      });

      if (!permission) {
        permission = await prisma.permission.create({
          data: {
            id: `perm_${Date.now()}_${randomBytes(8).toString('hex')}`,
            ...perm,
            scope: 'global',
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
      }

      // Assign permission to admin role
      const existing = await prisma.rolePermission.findFirst({
        where: {
          roleId: adminRole.id,
          permissionId: permission.id
        }
      });

      if (!existing) {
        await prisma.rolePermission.create({
          data: {
            id: `roleperm_${Date.now()}_${randomBytes(8).toString('hex')}`,
            roleId: adminRole.id,
            permissionId: permission.id
          }
        });
      }
    }

    console.log('✅ Permissions assigned\n');
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🎉 ADMIN USER CREATED SUCCESSFULLY!');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log('📧 Username:', username);
    console.log('🔑 Password:', password);
    console.log('📨 Email:', email);
    console.log('\n⚠️  IMPORTANT: Save these credentials securely!');
    console.log('⚠️  This is the only time the password will be shown.');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Also save to .env.local for reference (optional)
    const envContent = `
# Admin Credentials (Generated: ${new Date().toISOString()})
ADMIN_USERNAME=${username}
# Password is not stored - use the one shown above
`;

    const fs = require('fs').promises;
    const path = require('path');
    const envPath = path.join(process.cwd(), '.env.admin');
    
    await fs.writeFile(envPath, envContent.trim());
    console.log('💾 Username saved to .env.admin (password not saved for security)\n');

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

function generateSecurePassword(): string {
  // Generate a secure password with:
  // - At least 16 characters
  // - Mix of uppercase, lowercase, numbers, and special characters
  
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  let password = '';
  
  // Ensure at least one of each type
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];
  password += special[Math.floor(Math.random() * special.length)];
  
  // Add random characters to reach 16 characters
  const allChars = uppercase + lowercase + numbers + special;
  for (let i = password.length; i < 16; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

// Run the script
createAdminUser().catch(console.error);