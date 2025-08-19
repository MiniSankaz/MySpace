#!/usr/bin/env tsx
/**
 * Terminal Storage Migration Script
 * ย้ายข้อมูลจากระบบ InMemoryTerminalService ไปยัง Storage System ใหม่
 *
 * Usage:
 *   npm run migrate:terminal -- --mode=LOCAL
 *   npm run migrate:terminal -- --mode=DATABASE --dry-run
 *   npm run migrate:terminal -- --mode=HYBRID --force
 */

import { program } from "commander";
import { InMemoryTerminalService } from "../src/services/terminal-memory.service";
import { StorageFactory } from "../src/services/storage/StorageFactory";
import { TerminalStorageService } from "../src/services/storage/TerminalStorageService";
import chalk from "chalk";
import ora from "ora";

// Configuration
interface MigrationOptions {
  mode: "LOCAL" | "DATABASE" | "HYBRID";
  dryRun: boolean;
  force: boolean;
  verbose: boolean;
}

class TerminalStorageMigration {
  private legacyService: InMemoryTerminalService;
  private storageService: TerminalStorageService;
  private options: MigrationOptions;
  private stats = {
    total: 0,
    migrated: 0,
    failed: 0,
    skipped: 0,
  };

  constructor(options: MigrationOptions) {
    this.options = options;
    this.legacyService = InMemoryTerminalService.getInstance();

    // Set environment variable for storage mode
    process.env.TERMINAL_STORAGE_MODE = options.mode;

    // Initialize storage factory
    StorageFactory.initialize();

    // Get storage service instance
    this.storageService = TerminalStorageService.getInstance();
  }

  /**
   * Run migration
   */
  async run(): Promise<void> {
    console.log(chalk.cyan.bold("\n🚀 Terminal Storage Migration Tool\n"));
    console.log(chalk.gray("═".repeat(50)));

    // Display configuration
    this.displayConfig();

    // Validate environment
    await this.validateEnvironment();

    // Get all legacy sessions
    const legacySessions = this.legacyService.getAllSessions();
    this.stats.total = legacySessions.length;

    if (this.stats.total === 0) {
      console.log(chalk.yellow("\n⚠️  ไม่พบ sessions ที่ต้อง migrate"));
      return;
    }

    console.log(
      chalk.blue(`\n📊 พบ ${this.stats.total} sessions ที่ต้อง migrate`),
    );

    // Confirm migration
    if (!this.options.dryRun && !this.options.force) {
      const confirm = await this.confirmMigration();
      if (!confirm) {
        console.log(chalk.red("\n❌ ยกเลิกการ migration"));
        return;
      }
    }

    // Perform migration
    const spinner = ora("กำลัง migrate sessions...").start();

    for (const session of legacySessions) {
      try {
        await this.migrateSession(session);
        this.stats.migrated++;

        if (this.options.verbose) {
          spinner.text = `Migrated: ${session.id} (${this.stats.migrated}/${this.stats.total})`;
        }
      } catch (error) {
        this.stats.failed++;

        if (this.options.verbose) {
          spinner.fail(`Failed to migrate ${session.id}: ${error}`);
          spinner.start("Continuing migration...");
        }
      }
    }

    spinner.succeed("Migration completed");

    // Display results
    this.displayResults();

    // Verify migration
    if (!this.options.dryRun) {
      await this.verifyMigration();
    }
  }

  /**
   * Display configuration
   */
  private displayConfig(): void {
    console.log(chalk.white.bold("Configuration:"));
    console.log(chalk.gray("  Storage Mode:"), chalk.green(this.options.mode));
    console.log(
      chalk.gray("  Dry Run:"),
      this.options.dryRun ? chalk.yellow("Yes") : chalk.green("No"),
    );
    console.log(
      chalk.gray("  Force:"),
      this.options.force ? chalk.yellow("Yes") : chalk.green("No"),
    );
    console.log(
      chalk.gray("  Verbose:"),
      this.options.verbose ? chalk.green("Yes") : chalk.gray("No"),
    );
  }

  /**
   * Validate environment
   */
  private async validateEnvironment(): Promise<void> {
    const spinner = ora("ตรวจสอบ environment...").start();

    try {
      // Check storage health
      const health = await this.storageService.healthCheck();

      if (!health.healthy) {
        spinner.fail("Storage system ไม่พร้อมใช้งาน");
        console.log(chalk.red("Issues:"), health.issues?.join(", "));

        if (!this.options.force) {
          throw new Error("Storage system not healthy");
        }
      }

      spinner.succeed("Environment พร้อมใช้งาน");

      // Display storage info
      const info = await this.storageService.getStorageInfo();
      console.log(chalk.gray(`  Sessions ใน storage: ${info.sessionCount}`));
      console.log(
        chalk.gray(
          `  Memory usage: ${Math.round(info.memoryUsage / 1024 / 1024)}MB`,
        ),
      );
    } catch (error) {
      spinner.fail("Environment validation failed");
      throw error;
    }
  }

  /**
   * Confirm migration
   */
  private async confirmMigration(): Promise<boolean> {
    // Simple confirmation (ในการใช้งานจริงควรใช้ inquirer หรือ prompts)
    console.log(
      chalk.yellow(
        "\n⚠️  คำเตือน: การ migration จะย้ายข้อมูลทั้งหมดไปยังระบบใหม่",
      ),
    );
    console.log(
      chalk.yellow("กรุณายืนยันด้วยการรัน command พร้อม --force flag"),
    );
    return false;
  }

  /**
   * Migrate single session
   */
  private async migrateSession(session: any): Promise<void> {
    if (this.options.dryRun) {
      // Dry run - just validate
      if (this.options.verbose) {
        console.log(chalk.gray(`  [DRY RUN] Would migrate: ${session.id}`));
      }
      return;
    }

    // Check if already exists
    const existing = await this.storageService.getSession(session.id);

    if (existing && !this.options.force) {
      this.stats.skipped++;

      if (this.options.verbose) {
        console.log(chalk.yellow(`  Skipped (already exists): ${session.id}`));
      }
      return;
    }

    // Create session in new storage
    await this.storageService.createSession(
      session.projectId,
      session.currentPath,
      session.userId,
      session.mode,
    );

    // Update session properties
    await this.storageService.updateSessionStatus(session.id, session.status);

    if (session.isFocused) {
      await this.storageService.setSessionFocus(session.id, true);
    }

    if (this.options.verbose) {
      console.log(chalk.green(`  ✓ Migrated: ${session.id}`));
    }
  }

  /**
   * Display migration results
   */
  private displayResults(): void {
    console.log(chalk.cyan.bold("\n📊 Migration Results:"));
    console.log(chalk.gray("═".repeat(50)));

    console.log(chalk.white("  Total Sessions:"), chalk.blue(this.stats.total));
    console.log(chalk.white("  Migrated:"), chalk.green(this.stats.migrated));
    console.log(
      chalk.white("  Failed:"),
      this.stats.failed > 0
        ? chalk.red(this.stats.failed)
        : chalk.gray(this.stats.failed),
    );
    console.log(
      chalk.white("  Skipped:"),
      this.stats.skipped > 0
        ? chalk.yellow(this.stats.skipped)
        : chalk.gray(this.stats.skipped),
    );

    const successRate =
      this.stats.total > 0
        ? Math.round((this.stats.migrated / this.stats.total) * 100)
        : 0;

    console.log(
      chalk.white("  Success Rate:"),
      successRate >= 90
        ? chalk.green(`${successRate}%`)
        : successRate >= 70
          ? chalk.yellow(`${successRate}%`)
          : chalk.red(`${successRate}%`),
    );
  }

  /**
   * Verify migration
   */
  private async verifyMigration(): Promise<void> {
    const spinner = ora("ตรวจสอบผลการ migration...").start();

    try {
      // Get sessions from new storage
      const storageInfo = await this.storageService.getStorageInfo();

      if (storageInfo.sessionCount < this.stats.migrated) {
        spinner.warn("พบความแตกต่างในจำนวน sessions");
        console.log(
          chalk.yellow(
            `  Expected: ${this.stats.migrated}, Found: ${storageInfo.sessionCount}`,
          ),
        );
      } else {
        spinner.succeed("Migration verified successfully");
      }

      // Test random session
      if (this.stats.migrated > 0) {
        const legacySessions = this.legacyService.getAllSessions();
        if (legacySessions.length > 0) {
          const testSession = legacySessions[0];
          const migratedSession = await this.storageService.getSession(
            testSession.id,
          );

          if (migratedSession) {
            console.log(chalk.green("  ✓ Sample session verified"));
          } else {
            console.log(
              chalk.red("  ✗ Sample session not found in new storage"),
            );
          }
        }
      }
    } catch (error) {
      spinner.fail("Verification failed");
      console.error(chalk.red("Error:"), error);
    }
  }
}

// CLI Program
program
  .name("migrate-terminal-storage")
  .description("Migrate terminal sessions to new storage system")
  .version("1.0.0")
  .requiredOption("-m, --mode <mode>", "Storage mode (LOCAL, DATABASE, HYBRID)")
  .option("-d, --dry-run", "Perform dry run without actual migration", false)
  .option("-f, --force", "Force migration even if sessions exist", false)
  .option("-v, --verbose", "Show detailed output", false)
  .action(async (options) => {
    try {
      // Validate mode
      const validModes = ["LOCAL", "DATABASE", "HYBRID"];
      if (!validModes.includes(options.mode)) {
        console.error(chalk.red(`❌ Invalid mode: ${options.mode}`));
        console.log(chalk.gray(`Valid modes: ${validModes.join(", ")}`));
        process.exit(1);
      }

      // Run migration
      const migration = new TerminalStorageMigration(
        options as MigrationOptions,
      );
      await migration.run();

      console.log(chalk.green.bold("\n✅ Migration completed successfully!\n"));
      process.exit(0);
    } catch (error) {
      console.error(chalk.red.bold("\n❌ Migration failed:"));
      console.error(chalk.red(error));
      process.exit(1);
    }
  });

// Parse arguments
program.parse(process.argv);

// Export for testing
export { TerminalStorageMigration };
