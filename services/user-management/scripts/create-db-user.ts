import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

const prisma = new PrismaClient();

async function createUser() {
  try {
    console.log("Checking for existing user...");

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ username: "sankaz" }, { email: "sankaz@example.com" }],
      },
    });

    if (existingUser) {
      console.log("User sankaz already exists in database!");
      console.log("Username:", existingUser.username);
      console.log("Email:", existingUser.email);
      return;
    }

    console.log("Creating new user...");

    // Hash password
    const passwordHash = await bcrypt.hash("sankaz123", 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        id: `user_${Date.now()}_${randomBytes(8).toString("hex")}`,
        email: "sankaz@example.com",
        username: "sankaz",
        passwordHash,
        firstName: "Sankaz",
        lastName: "User",
        displayName: "Sankaz",
        isActive: true,
        emailVerified: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    console.log("✅ User created successfully!");
    console.log("   ID:", user.id);
    console.log("   Username:", user.username);
    console.log("   Email:", user.email);
    console.log("   Password: sankaz123");

    // Create user profile
    await prisma.userProfile.create({
      data: {
        id: `profile_${Date.now()}_${randomBytes(8).toString("hex")}`,
        userId: user.id,
        language: "th",
        timezone: "Asia/Bangkok",
        currency: "THB",
      },
    });

    console.log("✅ User profile created!");

    // Create or find default role
    let userRole = await prisma.role.findFirst({
      where: { code: "user" },
    });

    if (!userRole) {
      userRole = await prisma.role.create({
        data: {
          id: `role_${Date.now()}_${randomBytes(8).toString("hex")}`,
          name: "User",
          code: "user",
          description: "Default user role",
          level: 1,
          isSystemRole: true,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      console.log("✅ Default role created!");
    }

    // Assign role to user
    await prisma.userRole.create({
      data: {
        id: `userrole_${Date.now()}_${randomBytes(8).toString("hex")}`,
        userId: user.id,
        roleId: userRole.id,
        isActive: true,
      },
    });

    console.log("✅ Role assigned to user!");
    console.log("\n🎉 Setup complete! You can now login with:");
    console.log("   Username: sankaz");
    console.log("   Password: sankaz123");
  } catch (error) {
    console.error("Error creating user:", error);
  } finally {
    await prisma.$disconnect();
  }
}

createUser();
