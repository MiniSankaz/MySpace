import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function updatePassword() {
  const email = 'sankaz@example.com';
  const newPassword = 'Sankaz#3E25167B@2025';
  
  try {
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      console.error(`❌ User with email ${email} not found`);
      process.exit(1);
    }

    console.log(`✅ Found user: ${user.email} (${user.username})`);

    // Hash the new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    console.log('✅ Password hashed successfully');

    // Update the password
    const updatedUser = await prisma.user.update({
      where: { email },
      data: { 
        passwordHash: hashedPassword,
        updatedAt: new Date()
      }
    });

    console.log(`✅ Password updated successfully for ${updatedUser.email}`);
    console.log(`   Username: ${updatedUser.username}`);
    console.log(`   Updated at: ${updatedUser.updatedAt}`);

    // Verify the password works
    const passwordValid = await bcrypt.compare(newPassword, hashedPassword);
    if (passwordValid) {
      console.log('✅ Password verification successful');
    } else {
      console.error('❌ Password verification failed');
    }

  } catch (error) {
    console.error('❌ Error updating password:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the update
updatePassword().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});