import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function unlockSankazAccount() {
  try {
    // Find and unlock the account
    const existingUser = await prisma.user.findUnique({
      where: {
        email: "sankaz@example.com",
      },
    });

    if (!existingUser) {
      console.log("❌ User sankaz@example.com not found");
      return;
    }

    // Unlock the account
    const unlockedUser = await prisma.user.update({
      where: {
        email: "sankaz@example.com",
      },
      data: {
        accountLockedUntil: null, // Remove lock
        failedLoginAttempts: 0, // Reset failed attempts
        isActive: true, // Ensure account is active
        mustChangePassword: false, // Don't force password change
        lastLoginAt: new Date(), // Update last login time
      },
    });

    console.log("✅ Account unlocked successfully!");
    console.log("Email:", unlockedUser.email);
    console.log("Username:", unlockedUser.username);
    console.log("Active:", unlockedUser.isActive);
    console.log("Failed Attempts Reset: 0");
    console.log("Account Lock Status: UNLOCKED");

    // Also check for any sessions that might be blocking
    const deletedSessions = await prisma.session.deleteMany({
      where: {
        userId: unlockedUser.id,
      },
    });

    console.log(`Cleared ${deletedSessions.count} old sessions`);
  } catch (error) {
    console.error("❌ Error unlocking account:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the unlock
unlockSankazAccount();
