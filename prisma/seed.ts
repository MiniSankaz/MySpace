import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');
  
  // Create a default user for testing
  const defaultUser = await prisma.user.upsert({
    where: { email: 'admin@personalai.com' },
    update: {},
    create: {
      id: 'user-123',
      email: 'admin@personalai.com',
      username: 'admin',
      passwordHash: '$2b$10$EixZaYVK1fsbw1ZfbX3OXe.PLACEHOLDER', // placeholder hash
      firstName: 'Admin',
      lastName: 'User',
      displayName: 'Admin',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });
  
  console.log('Created default user:', defaultUser.email);
  
  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });