import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function clearLogs() {
  console.log("🗑️  Starting to clear all log tables...\n");

  try {
    // Clear Terminal logs
    console.log("Clearing Terminal logs...");
    const terminalLogs = await prisma.terminalLog.deleteMany({});
    console.log(`  ✅ Deleted ${terminalLogs.count} terminal logs`);

    const terminalCommands = await prisma.terminalCommand.deleteMany({});
    console.log(`  ✅ Deleted ${terminalCommands.count} terminal commands`);

    const terminalSessions = await prisma.terminalSession.deleteMany({});
    console.log(`  ✅ Deleted ${terminalSessions.count} terminal sessions`);

    const terminalAnalytics = await prisma.terminalAnalytics.deleteMany({});
    console.log(`  ✅ Deleted ${terminalAnalytics.count} terminal analytics`);

    const terminalCommandPatterns =
      await prisma.terminalCommandPattern.deleteMany({});
    console.log(
      `  ✅ Deleted ${terminalCommandPatterns.count} command patterns`,
    );

    const terminalShortcuts = await prisma.terminalShortcut.deleteMany({});
    console.log(`  ✅ Deleted ${terminalShortcuts.count} terminal shortcuts`);

    const terminalSOPs = await prisma.terminalSOP.deleteMany({});
    console.log(`  ✅ Deleted ${terminalSOPs.count} terminal SOPs`);

    // Clear Assistant logs
    console.log("\nClearing Assistant logs...");
    const assistantMessages = await prisma.assistantMessage.deleteMany({});
    console.log(`  ✅ Deleted ${assistantMessages.count} assistant messages`);

    const assistantChatMessages = await prisma.assistantChatMessage.deleteMany(
      {},
    );
    console.log(
      `  ✅ Deleted ${assistantChatMessages.count} assistant chat messages`,
    );

    const assistantConversations =
      await prisma.assistantConversation.deleteMany({});
    console.log(
      `  ✅ Deleted ${assistantConversations.count} assistant conversations`,
    );

    // Clear Audit logs
    console.log("\nClearing Audit logs...");
    const auditLogs = await prisma.auditLog.deleteMany({});
    console.log(`  ✅ Deleted ${auditLogs.count} audit logs`);

    console.log("\n✨ All log tables have been cleared successfully!");
  } catch (error) {
    console.error("❌ Error clearing logs:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
clearLogs().catch((error) => {
  console.error("Failed to clear logs:", error);
  process.exit(1);
});
