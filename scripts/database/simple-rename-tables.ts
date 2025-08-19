#!/usr/bin/env tsx

/**
 * Simple Database Table Rename Script
 * Purpose: Direct table rename without complex SQL blocks
 */

import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.join(__dirname, "../../.env") });

const prisma = new PrismaClient({
  datasources: {
    db: {
      url:
        process.env.DATABASE_URL ||
        "postgresql://user:password@localhost:5432/database?sslmode=require",
    },
  },
});

async function renameTablesSimple() {
  console.log("🚀 Starting simple table rename migration...\n");

  try {
    // Start transaction
    await prisma.$transaction(async (tx) => {
      console.log("📋 Step 1: Check current tables...");

      // Check which tables exist
      const tables: any[] = await tx.$queryRaw`
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename IN ('User', 'AssistantFolder', 'AssistantChatSession', 'AssistantChatMessage', 'AssistantConversation', 'AssistantMessage')
      `;

      console.log(
        `Found ${tables.length} tables to rename:`,
        tables.map((t) => t.tablename).join(", "),
      );

      // Step 2: Rename tables
      console.log("\n📝 Step 2: Renaming tables...");

      // Rename User to users
      if (tables.some((t) => t.tablename === "User")) {
        await tx.$executeRawUnsafe(`ALTER TABLE "User" RENAME TO users`);
        console.log("✅ Renamed User -> users");

        // Rename primary key constraint
        await tx.$executeRawUnsafe(
          `ALTER TABLE users RENAME CONSTRAINT "User_pkey" TO users_pkey`,
        );
        console.log("   Updated primary key constraint");
      }

      // Rename AssistantFolder to chat_folders
      if (tables.some((t) => t.tablename === "AssistantFolder")) {
        await tx.$executeRawUnsafe(
          `ALTER TABLE "AssistantFolder" RENAME TO chat_folders`,
        );
        console.log("✅ Renamed AssistantFolder -> chat_folders");

        await tx.$executeRawUnsafe(
          `ALTER TABLE chat_folders RENAME CONSTRAINT "AssistantFolder_pkey" TO chat_folders_pkey`,
        );
        console.log("   Updated primary key constraint");
      }

      // Rename AssistantChatSession to chat_sessions
      if (tables.some((t) => t.tablename === "AssistantChatSession")) {
        await tx.$executeRawUnsafe(
          `ALTER TABLE "AssistantChatSession" RENAME TO chat_sessions`,
        );
        console.log("✅ Renamed AssistantChatSession -> chat_sessions");

        await tx.$executeRawUnsafe(
          `ALTER TABLE chat_sessions RENAME CONSTRAINT "AssistantChatSession_pkey" TO chat_sessions_pkey`,
        );
        console.log("   Updated primary key constraint");
      }

      // Rename AssistantChatMessage to chat_messages
      if (tables.some((t) => t.tablename === "AssistantChatMessage")) {
        await tx.$executeRawUnsafe(
          `ALTER TABLE "AssistantChatMessage" RENAME TO chat_messages`,
        );
        console.log("✅ Renamed AssistantChatMessage -> chat_messages");

        await tx.$executeRawUnsafe(
          `ALTER TABLE chat_messages RENAME CONSTRAINT "AssistantChatMessage_pkey" TO chat_messages_pkey`,
        );
        console.log("   Updated primary key constraint");
      }

      // Handle legacy tables
      if (tables.some((t) => t.tablename === "AssistantConversation")) {
        await tx.$executeRawUnsafe(
          `ALTER TABLE "AssistantConversation" RENAME TO assistant_conversation_legacy`,
        );
        console.log(
          "✅ Renamed AssistantConversation -> assistant_conversation_legacy (backup)",
        );
      }

      if (tables.some((t) => t.tablename === "AssistantMessage")) {
        await tx.$executeRawUnsafe(
          `ALTER TABLE "AssistantMessage" RENAME TO assistant_message_legacy`,
        );
        console.log(
          "✅ Renamed AssistantMessage -> assistant_message_legacy (backup)",
        );
      }

      // Step 3: Update indexes
      console.log("\n🔄 Step 3: Updating indexes...");

      // Get and rename User indexes
      const userIndexes: any[] = await tx.$queryRaw`
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'users' 
        AND indexname LIKE 'User_%'
      `;

      for (const idx of userIndexes) {
        const newName = idx.indexname.replace("User_", "users_");
        await tx.$executeRawUnsafe(
          `ALTER INDEX "${idx.indexname}" RENAME TO ${newName}`,
        );
        console.log(`   Renamed index ${idx.indexname} -> ${newName}`);
      }

      // Get and rename AssistantFolder indexes (now chat_folders)
      const folderIndexes: any[] = await tx.$queryRaw`
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'chat_folders' 
        AND indexname LIKE 'AssistantFolder_%'
      `;

      for (const idx of folderIndexes) {
        const newName = idx.indexname.replace(
          "AssistantFolder_",
          "chat_folders_",
        );
        await tx.$executeRawUnsafe(
          `ALTER INDEX "${idx.indexname}" RENAME TO ${newName}`,
        );
        console.log(`   Renamed index ${idx.indexname} -> ${newName}`);
      }

      // Get and rename AssistantChatSession indexes (now chat_sessions)
      const sessionIndexes: any[] = await tx.$queryRaw`
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'chat_sessions' 
        AND indexname LIKE 'AssistantChatSession_%'
      `;

      for (const idx of sessionIndexes) {
        const newName = idx.indexname.replace(
          "AssistantChatSession_",
          "chat_sessions_",
        );
        await tx.$executeRawUnsafe(
          `ALTER INDEX "${idx.indexname}" RENAME TO ${newName}`,
        );
        console.log(`   Renamed index ${idx.indexname} -> ${newName}`);
      }

      // Get and rename AssistantChatMessage indexes (now chat_messages)
      const messageIndexes: any[] = await tx.$queryRaw`
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'chat_messages' 
        AND indexname LIKE 'AssistantChatMessage_%'
      `;

      for (const idx of messageIndexes) {
        const newName = idx.indexname.replace(
          "AssistantChatMessage_",
          "chat_messages_",
        );
        await tx.$executeRawUnsafe(
          `ALTER INDEX "${idx.indexname}" RENAME TO ${newName}`,
        );
        console.log(`   Renamed index ${idx.indexname} -> ${newName}`);
      }

      // Step 4: Add required columns for AI Assistant compatibility
      console.log("\n➕ Step 4: Adding required columns...");

      // Check and add columns to chat_sessions
      const sessionColumns: any[] = await tx.$queryRaw`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'chat_sessions'
      `;

      const sessionColumnNames = sessionColumns.map((c) => c.column_name);

      if (!sessionColumnNames.includes("title")) {
        await tx.$executeRawUnsafe(
          `ALTER TABLE chat_sessions ADD COLUMN title TEXT DEFAULT 'Untitled Session'`,
        );
        console.log("   Added title column to chat_sessions");
      }

      if (!sessionColumnNames.includes("isActive")) {
        await tx.$executeRawUnsafe(
          `ALTER TABLE chat_sessions ADD COLUMN "isActive" BOOLEAN DEFAULT true`,
        );
        console.log("   Added isActive column to chat_sessions");
      }

      if (!sessionColumnNames.includes("folderId")) {
        await tx.$executeRawUnsafe(
          `ALTER TABLE chat_sessions ADD COLUMN "folderId" TEXT`,
        );
        console.log("   Added folderId column to chat_sessions");
      }

      // Update chat_sessions with title from sessionName if it exists
      if (sessionColumnNames.includes("sessionName")) {
        await tx.$executeRawUnsafe(
          `UPDATE chat_sessions SET title = "sessionName" WHERE title IS NULL`,
        );
        console.log("   Migrated sessionName to title in chat_sessions");
      }

      // Check and add columns to chat_folders
      const folderColumns: any[] = await tx.$queryRaw`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'chat_folders'
      `;

      const folderColumnNames = folderColumns.map((c) => c.column_name);

      if (!folderColumnNames.includes("description")) {
        await tx.$executeRawUnsafe(
          `ALTER TABLE chat_folders ADD COLUMN description TEXT`,
        );
        console.log("   Added description column to chat_folders");
      }

      if (!folderColumnNames.includes("isDefault")) {
        await tx.$executeRawUnsafe(
          `ALTER TABLE chat_folders ADD COLUMN "isDefault" BOOLEAN DEFAULT false`,
        );
        console.log("   Added isDefault column to chat_folders");
      }

      if (!folderColumnNames.includes("sessionCount")) {
        await tx.$executeRawUnsafe(
          `ALTER TABLE chat_folders ADD COLUMN "sessionCount" INTEGER DEFAULT 0`,
        );
        console.log("   Added sessionCount column to chat_folders");
      }

      console.log("\n✅ Migration completed successfully!");
    });

    // Step 5: Verify migration
    console.log("\n🔍 Step 5: Verifying migration...");

    const verifyTables: any[] = await prisma.$queryRaw`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename IN ('users', 'chat_folders', 'chat_sessions', 'chat_messages')
    `;

    console.log(
      "Found renamed tables:",
      verifyTables.map((t) => t.tablename).join(", "),
    );

    // Test queries
    const userCount: any[] =
      await prisma.$queryRaw`SELECT COUNT(*) as count FROM users`;
    console.log(`Users table: ${userCount[0].count} records`);

    const sessionCount: any[] =
      await prisma.$queryRaw`SELECT COUNT(*) as count FROM chat_sessions`;
    console.log(`Chat sessions table: ${sessionCount[0].count} records`);

    const messageCount: any[] =
      await prisma.$queryRaw`SELECT COUNT(*) as count FROM chat_messages`;
    console.log(`Chat messages table: ${messageCount[0].count} records`);

    const folderCount: any[] =
      await prisma.$queryRaw`SELECT COUNT(*) as count FROM chat_folders`;
    console.log(`Chat folders table: ${folderCount[0].count} records`);

    console.log(
      "\n🎉 Database tables successfully renamed for AI Assistant compatibility!",
    );
    console.log("\n📋 Next steps:");
    console.log("1. Update the main Prisma schema at /prisma/schema.prisma");
    console.log("2. Run: npx prisma generate");
    console.log(
      "3. Navigate to AI Assistant service: cd services/ai-assistant",
    );
    console.log("4. Run: npx prisma generate");
    console.log("5. Restart the AI Assistant service");
    console.log("6. Test the AI chat functionality");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    console.log(
      "\n⚠️  To rollback, run: npx tsx scripts/database/simple-rollback-tables.ts",
    );
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
renameTablesSimple().catch(console.error);
