#!/usr/bin/env ts-node

/**
 * Database Table Rename Analysis Script
 * Purpose: Analyze current database schema and prepare for table rename operation
 * Target: Rename PascalCase tables to snake_case for AI Assistant service compatibility
 */

import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables
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

interface TableInfo {
  tablename: string;
  schemaname: string;
  hasindexes: boolean;
  hastriggers: boolean;
  rowsecurity: boolean;
}

interface ConstraintInfo {
  constraint_name: string;
  table_name: string;
  constraint_type: string;
  foreign_table_name?: string;
}

async function analyzeDatabase() {
  console.log("🔍 Database Table Rename Analysis");
  console.log("=================================\n");

  try {
    // Get all tables in the database
    const tables: TableInfo[] = await prisma.$queryRaw`
      SELECT 
        schemaname,
        tablename,
        hasindexes,
        hastriggers,
        rowsecurity
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `;

    console.log(`📊 Found ${tables.length} tables in the database\n`);

    // Categorize tables
    const pascalCaseTables = tables.filter((t) => /^[A-Z]/.test(t.tablename));
    const snakeCaseTables = tables.filter((t) => /^[a-z]/.test(t.tablename));
    const prismaInternalTables = tables.filter((t) =>
      t.tablename.startsWith("_"),
    );

    console.log("📋 Table Categorization:");
    console.log(`  • PascalCase tables: ${pascalCaseTables.length}`);
    console.log(`  • snake_case tables: ${snakeCaseTables.length}`);
    console.log(`  • Prisma internal tables: ${prismaInternalTables.length}\n`);

    // Tables that need renaming for AI Assistant
    const targetTables = [
      { current: "User", target: "users", exists: false },
      { current: "ChatConversation", target: "chat_folders", exists: false },
      {
        current: "AssistantConversation",
        target: "chat_sessions",
        exists: false,
      },
      { current: "AssistantMessage", target: "chat_messages", exists: false },
      { current: "AssistantFolder", target: "chat_folders", exists: false },
      {
        current: "AssistantChatSession",
        target: "chat_sessions",
        exists: false,
      },
      {
        current: "AssistantChatMessage",
        target: "chat_messages",
        exists: false,
      },
    ];

    console.log("🎯 Target Tables for AI Assistant Service:");
    console.log("==========================================\n");

    // Check which tables exist
    for (const target of targetTables) {
      const existingPascal = tables.find((t) => t.tablename === target.current);
      const existingSnake = tables.find((t) => t.tablename === target.target);

      if (existingPascal) {
        console.log(`✅ Found PascalCase table: ${target.current}`);
        target.exists = true;
      }
      if (existingSnake) {
        console.log(`⚠️  snake_case table already exists: ${target.target}`);
      }
    }

    // Get foreign key constraints for affected tables
    console.log("\n🔗 Foreign Key Dependencies:");
    console.log("============================\n");

    const constraints: ConstraintInfo[] = await prisma.$queryRaw`
      SELECT 
        tc.constraint_name,
        tc.table_name,
        tc.constraint_type,
        ccu.table_name AS foreign_table_name
      FROM information_schema.table_constraints tc
      LEFT JOIN information_schema.constraint_column_usage ccu
        ON tc.constraint_name = ccu.constraint_name
      WHERE tc.table_schema = 'public'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND (
          tc.table_name IN (${targetTables.map((t) => t.current).join(",")})
          OR ccu.table_name IN (${targetTables.map((t) => t.current).join(",")})
        )
      ORDER BY tc.table_name;
    `;

    if (constraints.length > 0) {
      console.log("Found foreign key constraints that need handling:");
      constraints.forEach((c) => {
        console.log(
          `  • ${c.table_name} -> ${c.foreign_table_name} (${c.constraint_name})`,
        );
      });
    } else {
      console.log("No foreign key constraints found for target tables.");
    }

    // Check for indexes
    console.log("\n📑 Indexes on Target Tables:");
    console.log("============================\n");

    for (const target of targetTables.filter((t) => t.exists)) {
      const indexes = await prisma.$queryRaw`
        SELECT 
          indexname,
          indexdef
        FROM pg_indexes
        WHERE tablename = ${target.current}
          AND schemaname = 'public';
      `;

      if (Array.isArray(indexes) && indexes.length > 0) {
        console.log(`${target.current}:`);
        (indexes as any[]).forEach((idx) => {
          console.log(`  • ${idx.indexname}`);
        });
      }
    }

    // Generate migration plan
    console.log("\n📝 Migration Plan:");
    console.log("==================\n");

    console.log("1. Create backup of current database");
    console.log("2. Disable foreign key constraints");
    console.log("3. Rename tables in correct order:");

    const renameOrder = [
      "User -> users",
      "AssistantFolder -> chat_folders",
      "AssistantChatSession -> chat_sessions",
      "AssistantChatMessage -> chat_messages",
    ];

    renameOrder.forEach((rename, idx) => {
      console.log(`   ${idx + 1}. ${rename}`);
    });

    console.log("4. Update foreign key constraints");
    console.log("5. Re-enable foreign key constraints");
    console.log("6. Update Prisma schema files");
    console.log("7. Regenerate Prisma client");
    console.log("8. Test AI Assistant service");

    // Check row counts
    console.log("\n📊 Data Volume Analysis:");
    console.log("========================\n");

    for (const target of targetTables.filter((t) => t.exists)) {
      try {
        const count = await prisma.$queryRawUnsafe(
          `SELECT COUNT(*) as count FROM "${target.current}"`,
        );
        console.log(`${target.current}: ${(count as any)[0].count} rows`);
      } catch (error) {
        console.log(`${target.current}: Unable to count rows`);
      }
    }

    console.log("\n✅ Analysis complete!");
  } catch (error) {
    console.error("❌ Error analyzing database:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the analysis
analyzeDatabase().catch(console.error);
