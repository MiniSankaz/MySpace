import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

const prisma = new PrismaClient();

async function createTestUsers() {
  console.log("Creating test users...");

  try {
    // Get existing admin role
    const adminRole = await prisma.role.findFirst({
      where: { code: "admin" },
    });

    if (!adminRole) {
      console.error("Admin role not found!");
      return;
    }

    // Create or update users from CLAUDE.md and start-all.sh
    const testUsers = [
      {
        email: "sankaz@example.com",
        username: "sankaz",
        password: "Sankaz#3E25167B@2025",
        displayName: "Sankaz Admin",
      },
      {
        email: "test@personalai.com",
        username: "test",
        password: "Test@123",
        displayName: "Test User",
      },
      {
        email: "portfolio@user.com",
        username: "portfolio",
        password: "Portfolio@2025",
        displayName: "Portfolio User",
      },
      {
        email: "admin@portfolio.com",
        username: "admin",
        password: "Admin@2025",
        displayName: "Admin User",
      },
      {
        email: "demo@portfolio.com",
        username: "demo",
        password: "Demo@2025",
        displayName: "Demo User",
      },
    ];

    for (const userData of testUsers) {
      const hashedPassword = await bcrypt.hash(userData.password, 12);

      // Check if user exists
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email: userData.email },
            { username: userData.username },
          ],
        },
      });

      let user;
      if (existingUser) {
        // Update existing user
        user = await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            email: userData.email,
            username: userData.username,
            passwordHash: hashedPassword,
            displayName: userData.displayName,
            isActive: true,
            failedLoginAttempts: 0,
            accountLockedUntil: null,
          },
        });
        console.log(`✅ Updated user: ${userData.email}`);
      } else {
        // Create new user
        user = await prisma.user.create({
          data: {
            id: uuidv4(),
            email: userData.email,
            username: userData.username,
            passwordHash: hashedPassword,
            firstName: userData.displayName.split(" ")[0],
            lastName: userData.displayName.split(" ")[1] || "User",
            displayName: userData.displayName,
            isActive: true,
            emailVerified: new Date(),
          },
        });
        console.log(`✅ Created user: ${userData.email}`);
      }

      // Check if user has admin role
      const userRole = await prisma.userRole.findFirst({
        where: {
          userId: user.id,
          roleId: adminRole.id,
        },
      });

      if (!userRole) {
        // Assign admin role
        await prisma.userRole.create({
          data: {
            id: uuidv4(),
            userId: user.id,
            roleId: adminRole.id,
            isActive: true,
          },
        });
        console.log(`  → Assigned admin role to ${userData.email}`);
      }
    }

    console.log("\n✨ Test users created successfully!");
    console.log("\n📝 Login Credentials:");
    console.log("====================");
    testUsers.forEach((user) => {
      console.log(`${user.email} / ${user.password}`);
    });

  } catch (error) {
    console.error("Error creating test users:", error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUsers();