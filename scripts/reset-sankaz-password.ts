import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function resetSankazPassword() {
  try {
    // Password ใหม่ที่ต้องการ
    const newPassword = 'Sankaz#3E25167B@2025';
    
    // Hash password ด้วย bcrypt (ใช้ salt rounds = 10)
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    console.log('🔐 Resetting password for sankaz@example.com...');
    console.log('New Password:', newPassword);
    console.log('Hash Generated:', hashedPassword.substring(0, 20) + '...');
    
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: {
        email: 'sankaz@example.com'
      }
    });

    if (!existingUser) {
      console.log('❌ User not found. Creating new admin user...');
      
      // Create new admin user
      const newUser = await prisma.user.create({
        data: {
          email: 'sankaz@example.com',
          username: 'sankaz',
          passwordHash: hashedPassword,
          firstName: 'Sankaz',
          lastName: 'Admin',
          displayName: 'Sankaz Admin',
          isActive: true,
          passwordChangedAt: new Date(),
          failedLoginAttempts: 0,
          mustChangePassword: false
        }
      });
      
      // Create admin role for the user
      const adminRole = await prisma.role.findFirst({
        where: {
          OR: [
            { code: 'ADMIN' },
            { name: 'Admin' },
            { name: 'Administrator' }
          ]
        }
      });
      
      if (adminRole) {
        await prisma.userRole.create({
          data: {
            userId: newUser.id,
            roleId: adminRole.id,
            isActive: true
          }
        });
        console.log('✅ Admin role assigned');
      }
      
      console.log('✅ New admin user created successfully!');
      console.log('ID:', newUser.id);
      console.log('Email:', newUser.email);
      console.log('Username:', newUser.username);
      
    } else {
      // Update existing user
      console.log('Found existing user:', existingUser.email);
      console.log('Current failed attempts:', existingUser.failedLoginAttempts);
      
      const updatedUser = await prisma.user.update({
        where: {
          id: existingUser.id
        },
        data: {
          passwordHash: hashedPassword,
          passwordChangedAt: new Date(),
          failedLoginAttempts: 0,
          accountLockedUntil: null,
          isActive: true,
          mustChangePassword: false
        }
      });
      
      console.log('✅ Password reset successfully!');
      console.log('ID:', updatedUser.id);
      console.log('Email:', updatedUser.email);
      console.log('Username:', updatedUser.username);
      console.log('Failed Attempts Reset: 0');
      console.log('Account Status: ACTIVE & UNLOCKED');
    }
    
    // Clear all existing sessions
    const deletedSessions = await prisma.session.deleteMany({
      where: {
        userId: existingUser?.id
      }
    });
    
    if (deletedSessions.count > 0) {
      console.log(`🗑️  Cleared ${deletedSessions.count} old sessions`);
    }
    
    // Verify the password hash
    console.log('\n🔍 Verifying password hash...');
    const testUser = await prisma.user.findUnique({
      where: { email: 'sankaz@example.com' }
    });
    
    if (testUser) {
      const isValid = await bcrypt.compare(newPassword, testUser.passwordHash);
      console.log('Password verification:', isValid ? '✅ VALID' : '❌ INVALID');
      
      if (!isValid) {
        console.error('⚠️  Warning: Password verification failed!');
        console.log('Stored hash:', testUser.passwordHash);
        console.log('Test hash:', hashedPassword);
      }
    }
    
    console.log('\n✅ All done! You can now login with:');
    console.log('Email: sankaz@example.com');
    console.log('Password:', newPassword);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the reset
resetSankazPassword();