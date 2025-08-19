import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

const prisma = new PrismaClient();

async function main() {
  console.log("Start seeding...");

  // Hash passwords
  const adminPassword = await bcrypt.hash("admin123", 12);
  const sankazPassword = await bcrypt.hash("Sankaz#3E25167B@2025", 12);

  // Create ADMIN role
  const adminRole = await prisma.role.upsert({
    where: { code: "ADMIN" },
    update: {},
    create: {
      id: uuidv4(),
      name: "Administrator",
      code: "ADMIN",
      description: "System administrator with full permissions",
      level: 5,
      isSystemRole: true,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  // Create USER role
  const userRole = await prisma.role.upsert({
    where: { code: "USER" },
    update: {},
    create: {
      id: uuidv4(),
      name: "User",
      code: "USER",
      description: "Standard user role",
      level: 1,
      isSystemRole: true,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  // Create admin user
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@personalai.com" },
    update: {
      passwordHash: adminPassword,
    },
    create: {
      id: uuidv4(),
      email: "admin@personalai.com",
      username: "admin",
      passwordHash: adminPassword,
      firstName: "Admin",
      lastName: "User",
      displayName: "Admin",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  // Create sankaz user
  const sankazUser = await prisma.user.upsert({
    where: { email: "sankaz@example.com" },
    update: {
      passwordHash: sankazPassword,
    },
    create: {
      id: uuidv4(),
      email: "sankaz@example.com",
      username: "sankaz",
      passwordHash: sankazPassword,
      firstName: "Sankaz",
      lastName: "User",
      displayName: "Sankaz",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  // Assign admin role to admin user
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: adminUser.id,
        roleId: adminRole.id,
      },
    },
    update: {},
    create: {
      id: uuidv4(),
      userId: adminUser.id,
      roleId: adminRole.id,
      assignedAt: new Date(),
      assignedBy: adminUser.id,
      isActive: true,
    },
  });

  // Assign user role to sankaz
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: sankazUser.id,
        roleId: userRole.id,
      },
    },
    update: {},
    create: {
      id: uuidv4(),
      userId: sankazUser.id,
      roleId: userRole.id,
      assignedAt: new Date(),
      assignedBy: adminUser.id,
      isActive: true,
    },
  });

  console.log("Created admin user:", adminUser.email);
  console.log("Created sankaz user:", sankazUser.email);
  console.log("Created roles:", adminRole.code, userRole.code);

  console.log("Seeding finished.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
