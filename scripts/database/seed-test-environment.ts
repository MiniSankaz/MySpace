#!/usr/bin/env tsx
/**
 * Test Environment Database Seeder
 * Seeds the database with test data to prevent foreign key constraint violations
 * 
 * Usage: tsx scripts/database/seed-test-environment.ts
 */

import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

interface TestUser {
  id: string;
  email: string;
  username: string;
  password: string;
  role: string;
}

interface TestProject {
  id: string;
  name: string;
  path: string;
  ownerId: string;
}

// Test users configuration
const TEST_USERS: TestUser[] = [
  {
    id: 'test-user-1',
    email: 'test1@terminal.com',
    username: 'test_user_1',
    password: 'Test@123456',
    role: 'USER'
  },
  {
    id: 'test-user-2',
    email: 'test2@terminal.com',
    username: 'test_user_2',
    password: 'Test@123456',
    role: 'USER'
  },
  {
    id: 'test-admin',
    email: 'admin@terminal.com',
    username: 'test_admin',
    password: 'Admin@123456',
    role: 'ADMIN'
  }
];

// Test projects configuration
const TEST_PROJECTS: TestProject[] = [
  {
    id: 'test-project-1',
    name: 'Test Project Alpha',
    path: '/test/projects/alpha',
    ownerId: 'test-user-1'
  },
  {
    id: 'test-project-2',
    name: 'Test Project Beta',
    path: '/test/projects/beta',
    ownerId: 'test-user-2'
  },
  {
    id: 'test-project-admin',
    name: 'Admin Test Project',
    path: '/test/projects/admin',
    ownerId: 'test-admin'
  }
];

async function seedTestEnvironment() {
  console.log('🌱 Starting test environment seeding...');
  
  try {
    // Check if we're in test environment
    const env = process.env.NODE_ENV;
    if (env === 'production') {
      console.error('❌ Cannot seed production database!');
      process.exit(1);
    }
    
    console.log(`📍 Environment: ${env || 'development'}`);
    
    // Seed users
    console.log('\n👥 Seeding test users...');
    for (const testUser of TEST_USERS) {
      try {
        // Check if user exists
        const existingUser = await prisma.user.findUnique({
          where: { id: testUser.id }
        });
        
        if (existingUser) {
          console.log(`   ⏩ User ${testUser.username} already exists`);
          continue;
        }
        
        // Create user
        const hashedPassword = await hash(testUser.password, 12);
        const user = await prisma.user.create({
          data: {
            id: testUser.id,
            email: testUser.email,
            username: testUser.username,
            password: hashedPassword,
            role: testUser.role,
            isActive: true,
            emailVerified: true,
            settings: {}
          }
        });
        
        console.log(`   ✅ Created user: ${user.username} (${user.email})`);
      } catch (error) {
        console.error(`   ❌ Failed to create user ${testUser.username}:`, error);
      }
    }
    
    // Seed projects
    console.log('\n📁 Seeding test projects...');
    for (const testProject of TEST_PROJECTS) {
      try {
        // Check if project exists
        const existingProject = await prisma.project.findUnique({
          where: { id: testProject.id }
        });
        
        if (existingProject) {
          console.log(`   ⏩ Project ${testProject.name} already exists`);
          continue;
        }
        
        // Ensure owner exists
        const owner = await prisma.user.findUnique({
          where: { id: testProject.ownerId }
        });
        
        if (!owner) {
          console.log(`   ⚠️ Skipping project ${testProject.name} - owner not found`);
          continue;
        }
        
        // Create project
        const project = await prisma.project.create({
          data: {
            id: testProject.id,
            name: testProject.name,
            path: testProject.path,
            ownerId: testProject.ownerId,
            isActive: true,
            settings: {},
            metadata: {
              environment: 'test',
              createdBy: 'seed-script'
            }
          }
        });
        
        console.log(`   ✅ Created project: ${project.name} (owner: ${owner.username})`);
      } catch (error) {
        console.error(`   ❌ Failed to create project ${testProject.name}:`, error);
      }
    }
    
    // Create some terminal sessions for testing
    console.log('\n💻 Creating test terminal sessions...');
    for (const project of TEST_PROJECTS) {
      try {
        const sessionId = `test_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const session = await prisma.terminalSession.create({
          data: {
            id: uuidv4(),
            sessionId: sessionId,
            projectId: project.id,
            userId: project.ownerId,
            type: 'system',
            status: 'active',
            metadata: {
              test: true,
              environment: 'test'
            }
          }
        });
        
        console.log(`   ✅ Created terminal session for project: ${project.name}`);
      } catch (error) {
        console.error(`   ⚠️ Failed to create terminal session for ${project.name}:`, error);
      }
    }
    
    // Verify seeding results
    console.log('\n📊 Verification:');
    const userCount = await prisma.user.count();
    const projectCount = await prisma.project.count();
    const sessionCount = await prisma.terminalSession.count();
    
    console.log(`   Users: ${userCount}`);
    console.log(`   Projects: ${projectCount}`);
    console.log(`   Terminal Sessions: ${sessionCount}`);
    
    console.log('\n✅ Test environment seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run seeder
seedTestEnvironment().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});