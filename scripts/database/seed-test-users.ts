import { prisma } from "../../src/core/database/prisma";
import bcrypt from "bcryptjs";

async function seedTestUsers() {
  console.log("🌱 Seeding test users...");

  try {
    // Create admin role if not exists
    const adminRole = await prisma.role.upsert({
      where: { code: "admin" },
      update: {},
      create: {
        id: "role_admin",
        name: "Administrator",
        code: "admin",
        description: "Full system access",
        level: 100,
        isSystemRole: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Create user role if not exists
    const userRole = await prisma.role.upsert({
      where: { code: "user" },
      update: {},
      create: {
        id: "role_user",
        name: "User",
        code: "user",
        description: "Regular user access",
        level: 10,
        isSystemRole: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Test users data
    const testUsers = [
      {
        email: "admin@example.com",
        username: "admin",
        password: "Admin123!",
        firstName: "Admin",
        lastName: "User",
        role: adminRole.id,
      },
      {
        email: "john.doe@example.com",
        username: "johndoe",
        password: "John123!",
        firstName: "John",
        lastName: "Doe",
        role: userRole.id,
      },
      {
        email: "jane.smith@example.com",
        username: "janesmith",
        password: "Jane123!",
        firstName: "Jane",
        lastName: "Smith",
        role: userRole.id,
      },
      {
        email: "test@example.com",
        username: "testuser",
        password: "Test123!",
        firstName: "Test",
        lastName: "User",
        role: userRole.id,
      },
    ];

    for (const userData of testUsers) {
      // Check if user already exists
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [{ email: userData.email }, { username: userData.username }],
        },
      });

      if (existingUser) {
        console.log(`✔️ User ${userData.username} already exists`);
        continue;
      }

      // Hash password
      const passwordHash = await bcrypt.hash(userData.password, 12);

      // Create user
      const user = await prisma.user.create({
        data: {
          id: `user_${userData.username}_${Date.now()}`,
          email: userData.email,
          username: userData.username,
          passwordHash,
          firstName: userData.firstName,
          lastName: userData.lastName,
          displayName: `${userData.firstName} ${userData.lastName}`,
          isActive: true,
          emailVerified: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Create user profile
      await prisma.userProfile.create({
        data: {
          id: `profile_${user.id}`,
          userId: user.id,
          language: "en",
          timezone: "UTC",
          currency: "USD",
          newsletter: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Assign role
      await prisma.userRole.create({
        data: {
          id: `userrole_${user.id}_${userData.role}`,
          userId: user.id,
          roleId: userData.role,
          isActive: true,
          assignedAt: new Date(),
        },
      });

      console.log(`✅ Created user: ${userData.username} (${userData.email})`);
    }

    console.log("\n📋 Test Users Created:");
    console.log("========================");
    testUsers.forEach((user) => {
      console.log(`Username: ${user.username}`);
      console.log(`Email: ${user.email}`);
      console.log(`Password: ${user.password}`);
      console.log("------------------------");
    });

    console.log("\n✨ Test users seeded successfully!");
  } catch (error) {
    console.error("Error seeding test users:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
seedTestUsers();
