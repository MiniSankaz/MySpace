#!/usr/bin/env tsx
/**
 * Script สำหรับสร้าง User Account ใหม่
 * Usage: tsx scripts/create-user-account.ts
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createUserAccount() {
  console.log('🔐 Creating user account for Portfolio Management System...\n');

  const users = [
    {
      email: 'portfolio@user.com',
      password: 'Portfolio@2025',
      name: 'Portfolio User',
      role: 'USER'
    },
    {
      email: 'admin@portfolio.com',
      password: 'Admin@2025',
      name: 'Portfolio Admin',
      role: 'ADMIN'
    },
    {
      email: 'demo@portfolio.com',
      password: 'Demo@2025',
      name: 'Demo User',
      role: 'USER'
    }
  ];

  try {
    for (const userData of users) {
      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { email: userData.email }
      });

      if (existingUser) {
        console.log(`⚠️  User ${userData.email} already exists`);
        continue;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      // Create user
      const user = await prisma.user.create({
        data: {
          email: userData.email,
          password: hashedPassword,
          name: userData.name,
          role: userData.role,
          emailVerified: new Date(),
          isActive: true,
          profile: {
            create: {
              bio: `${userData.role} account for Portfolio Management System`,
              preferences: {
                theme: 'light',
                notifications: true,
                language: 'th'
              }
            }
          }
        }
      });

      console.log(`✅ Created ${userData.role} account:`);
      console.log(`   Email: ${userData.email}`);
      console.log(`   Password: ${userData.password}`);
      console.log(`   Role: ${userData.role}`);
      console.log('');
    }

    // Create demo portfolio for users
    const demoUser = await prisma.user.findUnique({
      where: { email: 'demo@portfolio.com' }
    });

    if (demoUser) {
      // Check if portfolio exists
      const existingPortfolio = await prisma.portfolio.findFirst({
        where: { userId: demoUser.id }
      });

      if (!existingPortfolio) {
        const portfolio = await prisma.portfolio.create({
          data: {
            userId: demoUser.id,
            name: 'Demo Portfolio',
            description: 'Portfolio สำหรับทดสอบระบบ',
            totalValue: 1000000,
            cash: 200000,
            holdings: {
              create: [
                {
                  symbol: 'PTT',
                  name: 'ปตท.',
                  quantity: 5000,
                  avgCost: 38.50,
                  currentPrice: 40.25,
                  marketValue: 201250,
                  profitLoss: 8750,
                  profitLossPercent: 4.55
                },
                {
                  symbol: 'CPALL',
                  name: 'ซีพี ออลล์',
                  quantity: 3000,
                  avgCost: 62.00,
                  currentPrice: 64.50,
                  marketValue: 193500,
                  profitLoss: 7500,
                  profitLossPercent: 4.03
                },
                {
                  symbol: 'AOT',
                  name: 'ท่าอากาศยานไทย',
                  quantity: 2000,
                  avgCost: 68.00,
                  currentPrice: 71.50,
                  marketValue: 143000,
                  profitLoss: 7000,
                  profitLossPercent: 5.15
                }
              ]
            }
          }
        });

        console.log(`📊 Created demo portfolio for ${demoUser.email}`);
        console.log(`   Portfolio: ${portfolio.name}`);
        console.log(`   Total Value: ฿${portfolio.totalValue.toLocaleString()}`);
        console.log(`   Holdings: 3 stocks`);
      }
    }

    console.log('\n✅ User accounts created successfully!');
    console.log('\n📝 Account Summary:');
    console.log('┌─────────────────────────┬──────────────────┬─────────┐');
    console.log('│ Email                   │ Password         │ Role    │');
    console.log('├─────────────────────────┼──────────────────┼─────────┤');
    console.log('│ portfolio@user.com      │ Portfolio@2025   │ USER    │');
    console.log('│ admin@portfolio.com     │ Admin@2025       │ ADMIN   │');
    console.log('│ demo@portfolio.com      │ Demo@2025        │ USER    │');
    console.log('└─────────────────────────┴──────────────────┴─────────┘');
    
    console.log('\n🚀 You can now login with these accounts!');

  } catch (error) {
    console.error('❌ Error creating user accounts:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
createUserAccount().catch(console.error);