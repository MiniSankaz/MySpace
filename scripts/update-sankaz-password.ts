import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function updateSankazPassword() {
  try {
    // Check if user exists first
    const existingUser = await prisma.user.findUnique({
      where: {
        email: 'sankaz@example.com'
      }
    });

    if (!existingUser) {
      console.log('User not found. Creating new user...');
      
      // Create new user
      const hashedPassword = await bcrypt.hash('Sankaz#3E25167B@2025', 10);
      
      const newUser = await prisma.user.create({
        data: {
          email: 'sankaz@example.com',
          username: 'sankaz',
          passwordHash: hashedPassword,
          passwordChangedAt: new Date()
        }
      });
      
      console.log('✅ User created successfully');
      console.log('Email:', newUser.email);
      console.log('Username:', newUser.username);
      console.log('Password: Sankaz#3E25167B@2025');
    } else {
      // Update existing user password
      const hashedPassword = await bcrypt.hash('Sankaz#3E25167B@2025', 10);
      
      const updatedUser = await prisma.user.update({
        where: {
          email: 'sankaz@example.com'
        },
        data: {
          passwordHash: hashedPassword,
          passwordChangedAt: new Date()
        }
      });
      
      console.log('✅ Password updated successfully');
      console.log('Email:', updatedUser.email);
      console.log('Username:', updatedUser.username);
      console.log('New Password: Sankaz#3E25167B@2025');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateSankazPassword();