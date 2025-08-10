import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function verifyUser() {
  const email = 'sankaz@example.com';
  const testPassword = 'Sankaz#3E25167B@2025';
  
  try {
    // Get user details
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        username: true,
        passwordHash: true,
        firstName: true,
        lastName: true,
        displayName: true,
        isActive: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      console.error(`❌ User with email ${email} not found`);
      process.exit(1);
    }

    console.log('========================================');
    console.log('USER DETAILS:');
    console.log('========================================');
    console.log(`Email:         ${user.email}`);
    console.log(`Username:      ${user.username}`);
    console.log(`Display Name:  ${user.displayName || 'Not set'}`);
    console.log(`First Name:    ${user.firstName || 'Not set'}`);
    console.log(`Last Name:     ${user.lastName || 'Not set'}`);
    console.log(`User ID:       ${user.id}`);
    console.log(`Active:        ${user.isActive ? '✅ Yes' : '❌ No'}`);
    console.log(`Email Verified: ${user.emailVerified ? '✅ Yes' : '❌ No'}`);
    console.log(`Created:       ${user.createdAt}`);
    console.log(`Last Updated:  ${user.updatedAt}`);
    console.log('========================================');

    // Test password
    console.log('\nPASSWORD VERIFICATION:');
    console.log('========================================');
    const isValid = await bcrypt.compare(testPassword, user.passwordHash);
    
    if (isValid) {
      console.log('✅ Password: Sankaz#3E25167B@2025 is VALID');
      console.log('✅ User can login with this password');
    } else {
      console.log('❌ Password verification FAILED');
      console.log('❌ The password does not match');
    }

    // Test with old password to confirm it was changed
    const oldPasswords = ['Sankaz@123', 'password', 'password123'];
    console.log('\n========================================');
    console.log('TESTING OLD PASSWORDS (should all fail):');
    console.log('========================================');
    
    for (const oldPass of oldPasswords) {
      const oldValid = await bcrypt.compare(oldPass, user.passwordHash);
      console.log(`${oldPass}: ${oldValid ? '⚠️ STILL WORKS' : '✅ No longer works'}`);
    }

  } catch (error) {
    console.error('❌ Error verifying user:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run verification
verifyUser().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});