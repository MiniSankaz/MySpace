import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkTerminalLogs() {
  try {
    console.log("🔍 ตรวจสอบ Terminal Logs ในฐานข้อมูล...\n");

    // Check TerminalSession
    const sessions = await prisma.terminalSession.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            commands: true,
            logs: true,
          },
        },
      },
    });

    console.log("📊 พบ Terminal Sessions:", sessions.length, "รายการ");

    if (sessions.length > 0) {
      sessions.forEach((session) => {
        console.log("\nSession ID:", session.id);
        console.log("  Type:", session.type);
        console.log("  Tab:", session.tabName);
        console.log("  Commands:", session._count.commands);
        console.log("  Logs:", session._count.logs);
        console.log("  Started:", session.startedAt);
      });
    }

    // Check TerminalLog
    const logCount = await prisma.terminalLog.count();
    console.log("\n📝 จำนวน Terminal Logs ทั้งหมด:", logCount);

    if (logCount > 0) {
      const recentLogs = await prisma.terminalLog.findMany({
        take: 5,
        orderBy: { timestamp: "desc" },
        select: {
          id: true,
          type: true,
          direction: true,
          content: true,
          timestamp: true,
        },
      });

      console.log("\n📋 Logs ล่าสุด:");
      recentLogs.forEach((log) => {
        const content = log.content.substring(0, 50);
        const direction = log.direction || "-";
        console.log(`  [${log.type}] ${direction}: ${content}...`);
      });
    }

    // Check TerminalCommand
    const commandCount = await prisma.terminalCommand.count();
    console.log("\n💻 จำนวน Terminal Commands ทั้งหมด:", commandCount);

    if (commandCount > 0) {
      const recentCommands = await prisma.terminalCommand.findMany({
        take: 5,
        orderBy: { timestamp: "desc" },
        select: {
          command: true,
          exitCode: true,
          timestamp: true,
        },
      });

      console.log("\n🔧 Commands ล่าสุด:");
      recentCommands.forEach((cmd) => {
        const exitCode = cmd.exitCode !== null ? cmd.exitCode : "N/A";
        console.log(`  ${cmd.command} (exit: ${exitCode})`);
      });
    }

    // Check Claude-specific logs
    const claudeSessions = await prisma.terminalSession.count({
      where: { type: "claude" },
    });

    console.log("\n🤖 Claude Terminal Sessions:", claudeSessions);

    if (claudeSessions === 0) {
      console.log("  ⚠️ ไม่พบ Claude Terminal Sessions - ยังไม่มีการเก็บ log");
    }
  } catch (error: any) {
    console.error("❌ Error:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkTerminalLogs();
