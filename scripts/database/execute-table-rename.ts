#!/usr/bin/env ts-node

/**
 * Database Table Rename Execution Script
 * Purpose: Safely execute the table rename migration with proper error handling
 * Target: Rename PascalCase tables to snake_case for AI Assistant service
 */

import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
import { promisify } from "util";
import { exec } from "child_process";

const execAsync = promisify(exec);

// Load environment variables
dotenv.config({ path: path.join(__dirname, "../../.env") });

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://user:password@localhost:5432/database?sslmode=require";

interface MigrationOptions {
  dryRun?: boolean;
  backup?: boolean;
  verbose?: boolean;
}

class TableRenameMigration {
  private prisma: PrismaClient;
  private logFile: string;

  constructor() {
    this.prisma = new PrismaClient({
      datasources: {
        db: { url: DATABASE_URL },
      },
      log: ["error", "warn"],
    });

    this.logFile = path.join(__dirname, `migration-log-${Date.now()}.txt`);
  }

  private log(message: string, level: "INFO" | "WARN" | "ERROR" = "INFO") {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}\n`;

    console.log(logMessage);
    fs.appendFileSync(this.logFile, logMessage);
  }

  /**
   * Create a database backup using pg_dump
   */
  private async createBackup(): Promise<string> {
    this.log("Creating database backup...", "INFO");

    const backupFile = path.join(__dirname, `backup-${Date.now()}.sql`);
    const url = new URL(DATABASE_URL);

    const command = `PGPASSWORD="${url.password}" pg_dump -h ${url.hostname} -p ${url.port} -U ${url.username} -d ${url.pathname.slice(1)} -f ${backupFile}`;

    try {
      await execAsync(command);
      this.log(`Backup created successfully: ${backupFile}`, "INFO");
      return backupFile;
    } catch (error) {
      this.log(`Failed to create backup: ${error}`, "ERROR");
      throw new Error("Backup creation failed. Aborting migration.");
    }
  }

  /**
   * Check current database state
   */
  private async checkDatabaseState(): Promise<{
    pascalCaseTables: string[];
    snakeCaseTables: string[];
    conflictingTables: string[];
  }> {
    const tables: any[] = await this.prisma.$queryRaw`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `;

    const targetRenames = [
      { from: "User", to: "users" },
      { from: "AssistantFolder", to: "chat_folders" },
      { from: "AssistantChatSession", to: "chat_sessions" },
      { from: "AssistantChatMessage", to: "chat_messages" },
      { from: "AssistantConversation", to: "chat_sessions" },
      { from: "AssistantMessage", to: "chat_messages" },
    ];

    const pascalCaseTables: string[] = [];
    const snakeCaseTables: string[] = [];
    const conflictingTables: string[] = [];

    for (const rename of targetRenames) {
      const hasPascal = tables.some((t) => t.tablename === rename.from);
      const hasSnake = tables.some((t) => t.tablename === rename.to);

      if (hasPascal) pascalCaseTables.push(rename.from);
      if (hasSnake) snakeCaseTables.push(rename.to);
      if (hasPascal && hasSnake)
        conflictingTables.push(`${rename.from} <-> ${rename.to}`);
    }

    return { pascalCaseTables, snakeCaseTables, conflictingTables };
  }

  /**
   * Execute the migration SQL file
   */
  private async executeMigrationSQL(): Promise<void> {
    const migrationFile = path.join(
      __dirname,
      "rename-tables-to-snake-case.sql",
    );

    if (!fs.existsSync(migrationFile)) {
      throw new Error(`Migration file not found: ${migrationFile}`);
    }

    this.log("Executing migration SQL...", "INFO");

    const sql = fs.readFileSync(migrationFile, "utf-8");

    // Split by semicolons but keep transaction blocks together
    const statements = sql
      .split(/;\s*$/gm)
      .filter((stmt) => stmt.trim().length > 0)
      .map((stmt) => stmt.trim() + ";");

    let successCount = 0;
    let errorCount = 0;

    for (const statement of statements) {
      // Skip comments
      if (statement.startsWith("--") || statement.trim().length === 0) {
        continue;
      }

      try {
        await this.prisma.$executeRawUnsafe(statement);
        successCount++;

        // Log important operations
        if (
          statement.includes("ALTER TABLE") ||
          statement.includes("RENAME TO")
        ) {
          this.log(`Executed: ${statement.substring(0, 100)}...`, "INFO");
        }
      } catch (error: any) {
        errorCount++;
        this.log(
          `Failed to execute: ${statement.substring(0, 100)}...`,
          "ERROR",
        );
        this.log(`Error: ${error.message}`, "ERROR");

        // Stop on critical errors
        if (statement.includes("BEGIN") || statement.includes("COMMIT")) {
          throw error;
        }
      }
    }

    this.log(
      `Migration completed: ${successCount} successful, ${errorCount} errors`,
      "INFO",
    );
  }

  /**
   * Verify migration results
   */
  private async verifyMigration(): Promise<boolean> {
    this.log("Verifying migration results...", "INFO");

    const expectedTables = [
      "users",
      "chat_folders",
      "chat_sessions",
      "chat_messages",
    ];
    const missingTables: string[] = [];

    for (const tableName of expectedTables) {
      const result: any[] = await this.prisma.$queryRaw`
        SELECT EXISTS (
          SELECT FROM pg_tables 
          WHERE schemaname = 'public' 
          AND tablename = ${tableName}
        ) as exists;
      `;

      if (!result[0].exists) {
        missingTables.push(tableName);
      }
    }

    if (missingTables.length > 0) {
      this.log(`Missing expected tables: ${missingTables.join(", ")}`, "WARN");
      return false;
    }

    this.log("All expected tables found!", "INFO");
    return true;
  }

  /**
   * Test AI Assistant service connection
   */
  private async testAIAssistantConnection(): Promise<boolean> {
    this.log("Testing AI Assistant service connection...", "INFO");

    try {
      // Try to query the renamed tables
      const userCount = await this.prisma
        .$queryRaw`SELECT COUNT(*) FROM users;`;
      this.log(
        `Users table accessible: ${(userCount as any)[0].count} records`,
        "INFO",
      );

      const sessionCount = await this.prisma
        .$queryRaw`SELECT COUNT(*) FROM chat_sessions;`;
      this.log(
        `Chat sessions table accessible: ${(sessionCount as any)[0].count} records`,
        "INFO",
      );

      return true;
    } catch (error: any) {
      this.log(
        `AI Assistant connection test failed: ${error.message}`,
        "ERROR",
      );
      return false;
    }
  }

  /**
   * Main migration execution
   */
  async execute(options: MigrationOptions = {}): Promise<void> {
    const { dryRun = false, backup = true, verbose = true } = options;

    try {
      this.log("===========================================", "INFO");
      this.log("Database Table Rename Migration", "INFO");
      this.log("===========================================", "INFO");

      // Step 1: Check current state
      this.log("Step 1: Checking database state...", "INFO");
      const state = await this.checkDatabaseState();

      this.log(
        `Found ${state.pascalCaseTables.length} PascalCase tables`,
        "INFO",
      );
      this.log(
        `Found ${state.snakeCaseTables.length} snake_case tables`,
        "INFO",
      );

      if (state.conflictingTables.length > 0) {
        this.log(
          `⚠️  Conflicting tables detected: ${state.conflictingTables.join(", ")}`,
          "WARN",
        );

        if (!dryRun) {
          const response = await this.promptUser(
            "Continue with conflicts? (y/n): ",
          );
          if (response.toLowerCase() !== "y") {
            this.log("Migration aborted by user", "INFO");
            return;
          }
        }
      }

      // Step 2: Create backup if requested
      if (backup && !dryRun) {
        this.log("Step 2: Creating backup...", "INFO");
        const backupFile = await this.createBackup();
        this.log(`Backup saved to: ${backupFile}`, "INFO");
      }

      // Step 3: Execute migration
      if (!dryRun) {
        this.log("Step 3: Executing migration...", "INFO");
        await this.executeMigrationSQL();
      } else {
        this.log("Step 3: DRY RUN - Skipping migration execution", "INFO");
      }

      // Step 4: Verify migration
      if (!dryRun) {
        this.log("Step 4: Verifying migration...", "INFO");
        const verified = await this.verifyMigration();

        if (!verified) {
          this.log("⚠️  Migration verification failed!", "WARN");
          this.log("Consider running the rollback script if needed", "WARN");
        }
      }

      // Step 5: Test AI Assistant connection
      if (!dryRun) {
        this.log("Step 5: Testing AI Assistant connection...", "INFO");
        const connected = await this.testAIAssistantConnection();

        if (connected) {
          this.log(
            "✅ AI Assistant service can connect to renamed tables",
            "INFO",
          );
        } else {
          this.log("❌ AI Assistant service connection failed", "ERROR");
        }
      }

      this.log("===========================================", "INFO");
      this.log("Migration process completed!", "INFO");
      this.log(`Log file: ${this.logFile}`, "INFO");
      this.log("===========================================", "INFO");

      // Post-migration instructions
      if (!dryRun) {
        console.log("\n📋 Post-Migration Steps:");
        console.log("1. Update Prisma schema files to match new table names");
        console.log("2. Run: cd services/ai-assistant && npx prisma generate");
        console.log("3. Restart the AI Assistant service");
        console.log("4. Test the AI chat functionality");
        console.log("5. If issues occur, use rollback-table-rename.sql");
      }
    } catch (error: any) {
      this.log(`Migration failed: ${error.message}`, "ERROR");
      this.log("Consider running the rollback script", "ERROR");
      throw error;
    } finally {
      await this.prisma.$disconnect();
    }
  }

  /**
   * Prompt user for input
   */
  private promptUser(question: string): Promise<string> {
    const readline = require("readline").createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise((resolve) => {
      readline.question(question, (answer: string) => {
        readline.close();
        resolve(answer);
      });
    });
  }
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);
  const options: MigrationOptions = {
    dryRun: args.includes("--dry-run"),
    backup: !args.includes("--no-backup"),
    verbose: args.includes("--verbose"),
  };

  if (args.includes("--help")) {
    console.log(`
Database Table Rename Migration Tool

Usage: ts-node execute-table-rename.ts [options]

Options:
  --dry-run     Simulate the migration without making changes
  --no-backup   Skip database backup (not recommended)
  --verbose     Show detailed output
  --help        Show this help message

Examples:
  ts-node execute-table-rename.ts --dry-run
  ts-node execute-table-rename.ts --backup
  ts-node execute-table-rename.ts
    `);
    process.exit(0);
  }

  const migration = new TableRenameMigration();

  try {
    await migration.execute(options);
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { TableRenameMigration };
