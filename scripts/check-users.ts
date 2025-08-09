import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Checking users in database...');
  
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      username: true,
      isActive: true,
      createdAt: true,
    }
  });
  
  if (users.length === 0) {
    console.log('No users found in database!');
    console.log('\nCreating default user...');
    
    // Create a default user
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const newUser = await prisma.user.create({
      data: {
        id: require('crypto').randomUUID(),
        email: 'admin@example.com',
        username: 'admin',
        passwordHash: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        displayName: 'Administrator',
        isActive: true,
        emailVerified: new Date(),
      }
    });
    
    console.log('✅ Created default user:');
    console.log('   Email: admin@example.com');
    console.log('   Username: admin');
    console.log('   Password: password123');
    console.log('   ID:', newUser.id);
  } else {
    console.log(`Found ${users.length} user(s):`);
    users.forEach(user => {
      console.log(`- ${user.username} (${user.email}) - Active: ${user.isActive}`);
    });
  }
}

main()
  .catch(e => {
    console.error('Error:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });