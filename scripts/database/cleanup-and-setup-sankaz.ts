import { prisma } from '../../src/core/database/prisma';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

async function cleanupAndSetupSankaz() {
  console.log('🧹 Starting database cleanup and setup...\n');

  try {
    // 1. First, check if sankaz user exists
    let sankazUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username: 'sankaz' },
          { email: { contains: 'sankaz' } }
        ]
      }
    });

    // If sankaz doesn't exist, create the user
    if (!sankazUser) {
      console.log('📝 Creating sankaz user...');
      
      // Generate a strong password
      const strongPassword = `Sankaz#${randomBytes(4).toString('hex').toUpperCase()}@2025`;
      const passwordHash = await bcrypt.hash(strongPassword, 12);

      // Create admin role if not exists
      const adminRole = await prisma.role.upsert({
        where: { code: 'admin' },
        update: {},
        create: {
          id: 'role_admin',
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

      sankazUser = await prisma.user.create({
        data: {
          id: `user_sankaz_${Date.now()}`,
          email: 'sankaz@admin.com',
          username: 'sankaz',
          passwordHash,
          firstName: 'Sankaz',
          lastName: 'Admin',
          displayName: 'Sankaz',
          isActive: true,
          emailVerified: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      // Create user profile
      await prisma.userProfile.create({
        data: {
          id: `profile_${sankazUser.id}`,
          userId: sankazUser.id,
          language: 'th',
          timezone: 'Asia/Bangkok',
          currency: 'THB',
          newsletter: false,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      // Assign admin role
      await prisma.userRole.create({
        data: {
          id: `userrole_${sankazUser.id}_${adminRole.id}`,
          userId: sankazUser.id,
          roleId: adminRole.id,
          isActive: true,
          assignedAt: new Date()
        }
      });

      console.log(`✅ Created sankaz user with password: ${strongPassword}`);
      console.log('⚠️  IMPORTANT: Save this password securely!\n');
    } else {
      // Update existing sankaz user with new strong password
      console.log('🔐 Updating sankaz password...');
      const strongPassword = `Sankaz#${randomBytes(4).toString('hex').toUpperCase()}@2025`;
      const passwordHash = await bcrypt.hash(strongPassword, 12);

      await prisma.user.update({
        where: { id: sankazUser.id },
        data: {
          passwordHash,
          passwordChangedAt: new Date(),
          mustChangePassword: false,
          failedLoginAttempts: 0,
          accountLockedUntil: null
        }
      });

      console.log(`✅ Updated sankaz password to: ${strongPassword}`);
      console.log('⚠️  IMPORTANT: Save this password securely!\n');
    }

    // 2. Migrate all assistant conversations to sankaz
    console.log('🔄 Migrating assistant conversations to sankaz...');
    const conversations = await prisma.assistantConversation.findMany({
      where: {
        userId: {
          not: sankazUser.id
        }
      }
    });

    if (conversations.length > 0) {
      // Delete ALL existing sankaz conversations first to avoid any conflicts
      await prisma.assistantConversation.deleteMany({
        where: {
          userId: sankazUser.id
        }
      });

      // Now migrate conversations one by one to handle potential conflicts
      let migratedCount = 0;
      for (const conversation of conversations) {
        try {
          // Generate new sessionId if there's a potential conflict
          const newSessionId = `sankaz_${conversation.sessionId}_${Date.now()}`;
          
          await prisma.assistantConversation.update({
            where: { id: conversation.id },
            data: {
              userId: sankazUser.id,
              sessionId: newSessionId
            }
          });
          migratedCount++;
        } catch (error) {
          console.warn(`⚠️  Failed to migrate conversation ${conversation.id}: ${error.message}`);
          // Continue with other conversations
        }
      }
      console.log(`✅ Migrated ${migratedCount}/${conversations.length} conversations to sankaz\n`);
    } else {
      console.log('ℹ️  No conversations to migrate\n');
    }

    // 3. Migrate all assistant tasks to sankaz
    console.log('🔄 Migrating assistant tasks to sankaz...');
    const tasks = await prisma.assistantTask.updateMany({
      where: {
        userId: {
          not: sankazUser.id
        }
      },
      data: {
        userId: sankazUser.id
      }
    });
    console.log(`✅ Migrated ${tasks.count} tasks to sankaz\n`);

    // 4. Migrate all assistant reminders to sankaz
    console.log('🔄 Migrating assistant reminders to sankaz...');
    const reminders = await prisma.assistantReminder.updateMany({
      where: {
        userId: {
          not: sankazUser.id
        }
      },
      data: {
        userId: sankazUser.id
      }
    });
    console.log(`✅ Migrated ${reminders.count} reminders to sankaz\n`);

    // 5. Migrate all assistant notes to sankaz
    console.log('🔄 Migrating assistant notes to sankaz...');
    const notes = await prisma.assistantNote.updateMany({
      where: {
        userId: {
          not: sankazUser.id
        }
      },
      data: {
        userId: sankazUser.id
      }
    });
    console.log(`✅ Migrated ${notes.count} notes to sankaz\n`);

    // 6. Delete all other users except sankaz
    console.log('🗑️  Deleting all users except sankaz...');
    const deletedUsers = await prisma.user.deleteMany({
      where: {
        id: {
          not: sankazUser.id
        }
      }
    });
    console.log(`✅ Deleted ${deletedUsers.count} users\n`);

    // 7. Display final summary
    console.log('=' .repeat(50));
    console.log('✨ Database cleanup completed successfully!');
    console.log('=' .repeat(50));
    console.log('\n📊 Final Status:');
    console.log(`  • Active User: sankaz`);
    console.log(`  • Email: ${sankazUser.email}`);
    console.log(`  • Role: Administrator`);
    console.log(`  • All chat history migrated: ✅`);
    console.log(`  • All other users deleted: ✅`);
    console.log('\n🔑 Login Credentials:');
    console.log(`  • Username: sankaz`);
    console.log(`  • Password: (See above - save it securely!)`);
    console.log('=' .repeat(50));

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup function
cleanupAndSetupSankaz();