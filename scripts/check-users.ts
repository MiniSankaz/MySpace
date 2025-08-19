import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkUsers() {
  try {
    // Check all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        username: true,
        isActive: true,
        createdAt: true,
      },
    });

    console.log("=== Users in Database ===");
    console.log(`Total users: ${users.length}`);
    
    if (users.length > 0) {
      users.forEach((user) => {
        console.log(`- ${user.email} (${user.username}) - Active: ${user.isActive}`);
      });
    } else {
      console.log("No users found in database!");
    }

    // Check roles
    const roles = await prisma.role.findMany({
      select: {
        name: true,
        code: true,
        isActive: true,
      },
    });

    console.log("\n=== Roles in Database ===");
    console.log(`Total roles: ${roles.length}`);
    
    if (roles.length > 0) {
      roles.forEach((role) => {
        console.log(`- ${role.name} (${role.code}) - Active: ${role.isActive}`);
      });
    }

  } catch (error) {
    console.error("Error checking database:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();