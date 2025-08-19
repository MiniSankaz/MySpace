#!/usr/bin/env node

/**
 * Comprehensive Port Migration Script
 * Safely migrate 436 port references across 394 files
 * 
 * Features:
 * - Dry run mode for testing
 * - Automatic backup creation
 * - Batch processing for safety
 * - Comprehensive logging
 * - Rollback capability
 * - Progress tracking
 * 
 * Usage:
 * npm run migrate-ports              # Execute migration
 * npm run migrate-ports --dry-run    # Test run (no changes)
 * npm run migrate-ports --verbose    # Detailed output
 * npm run rollback-ports             # Rollback changes
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join, dirname, basename } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface MigrationRule {
  name: string;
  description: string;
  pattern: RegExp;
  replacement: string | ((match: string, ...args: any[]) => string);
  priority: number; // Lower number = higher priority
}

interface MigrationResult {
  file: string;
  originalSize: number;
  newSize: number;
  changes: number;
  errors: string[];
  rules: string[];
}

interface MigrationStats {
  totalFiles: number;
  processedFiles: number;
  modifiedFiles: number;
  totalChanges: number;
  errors: number;
  backupSize: number;
}

class PortMigrationScript {
  private readonly backupDir: string;
  private readonly dryRun: boolean;
  private readonly verbose: boolean;
  private readonly batchSize: number = 50;
  private stats: MigrationStats;

  // Port migration rules - ordered by priority
  private readonly migrationRules: MigrationRule[] = [
    // 1. Direct port numbers (highest priority)
    {
      name: 'port-3000',
      description: 'Migrate port 3000 → 4100 (Frontend)',
      pattern: /(?<![\d])3000(?![\d])/g,
      replacement: '4100',
      priority: 1
    },
    {
      name: 'port-4000',
      description: 'Migrate port 4000 → 4110 (Gateway)',
      pattern: /(?<![\d])4000(?![\d])/g,
      replacement: '4110',
      priority: 1
    },
    {
      name: 'port-4200', 
      description: 'Migrate port 4200 → 4130 (AI Assistant)',
      pattern: /(?<![\d])4200(?![\d])/g,
      replacement: '4130',
      priority: 1
    },
    {
      name: 'port-4300',
      description: 'Migrate port 4300 → 4140 (Terminal)',
      pattern: /(?<![\d])4300(?![\d])/g,
      replacement: '4140',
      priority: 1
    },
    {
      name: 'port-4400',
      description: 'Migrate port 4400 → 4150 (Workspace)',
      pattern: /(?<![\d])4400(?![\d])/g,
      replacement: '4150',
      priority: 1
    },
    {
      name: 'port-4500',
      description: 'Migrate port 4500 → 4160 (Portfolio)',
      pattern: /(?<![\d])4500(?![\d])/g,
      replacement: '4160',
      priority: 1
    },
    {
      name: 'port-4600',
      description: 'Migrate port 4600 → 4170 (Market Data)', 
      pattern: /(?<![\d])4600(?![\d])/g,
      replacement: '4170',
      priority: 1
    },

    // 2. URLs with localhost (medium priority)
    {
      name: 'localhost-3000',
      description: 'Migrate localhost:3000 URLs',
      pattern: /(localhost|127\.0\.0\.1):3000/g,
      replacement: '$1:4100',
      priority: 2
    },
    {
      name: 'localhost-4000',
      description: 'Migrate localhost:4000 URLs',
      pattern: /(localhost|127\.0\.0\.1):4000/g,
      replacement: '$1:4110',
      priority: 2
    },
    {
      name: 'localhost-4200',
      description: 'Migrate localhost:4200 URLs', 
      pattern: /(localhost|127\.0\.0\.1):4200/g,
      replacement: '$1:4130',
      priority: 2
    },
    {
      name: 'localhost-4300',
      description: 'Migrate localhost:4300 URLs',
      pattern: /(localhost|127\.0\.0\.1):4300/g,
      replacement: '$1:4140',
      priority: 2
    },
    {
      name: 'localhost-4400',
      description: 'Migrate localhost:4400 URLs',
      pattern: /(localhost|127\.0\.0\.1):4400/g,
      replacement: '$1:4150',
      priority: 2
    },
    {
      name: 'localhost-4500',
      description: 'Migrate localhost:4500 URLs',
      pattern: /(localhost|127\.0\.0\.1):4500/g,
      replacement: '$1:4160',
      priority: 2
    },
    {
      name: 'localhost-4600',
      description: 'Migrate localhost:4600 URLs',
      pattern: /(localhost|127\.0\.0\.1):4600/g,
      replacement: '$1:4170',
      priority: 2
    },

    // 3. HTTP/HTTPS URLs (lower priority)
    {
      name: 'http-urls',
      description: 'Migrate HTTP URLs with old ports',
      pattern: /(https?:\/\/[^:]+):(3000|4000|4200|4300|4400|4500|4600)/g,
      replacement: (match: string, host: string, port: string): string => {
        const portMap: Record<string, string> = {
          '3000': '4100',
          '4000': '4110', 
          '4200': '4130',
          '4300': '4140',
          '4400': '4150',
          '4500': '4160',
          '4600': '4170'
        };
        return `${host}:${portMap[port] || port}`;
      },
      priority: 3
    },

    // 4. Environment variables with ports (lowest priority)
    {
      name: 'env-port-defaults',
      description: 'Migrate environment variable port defaults',
      pattern: /process\.env\.PORT \|\| ['"](3000|4000|4200|4300|4400|4500|4600)['"]|process\.env\.PORT \|\| (3000|4000|4200|4300|4400|4500|4600)/g,
      replacement: (match: string): string => {
        if (match.includes('3000')) return match.replace('3000', '4100');
        if (match.includes('4000')) return match.replace('4000', '4110');
        if (match.includes('4200')) return match.replace('4200', '4130');
        if (match.includes('4300')) return match.replace('4300', '4140');
        if (match.includes('4400')) return match.replace('4400', '4150');
        if (match.includes('4500')) return match.replace('4500', '4160');
        if (match.includes('4600')) return match.replace('4600', '4170');
        return match;
      },
      priority: 4
    }
  ];

  constructor(options: { dryRun?: boolean; verbose?: boolean } = {}) {
    this.dryRun = options.dryRun || false;
    this.verbose = options.verbose || false;
    this.backupDir = join(process.cwd(), 'backup', 'port-migration-' + new Date().toISOString().replace(/[:.]/g, '-'));
    this.stats = {
      totalFiles: 0,
      processedFiles: 0,
      modifiedFiles: 0,
      totalChanges: 0,
      errors: 0,
      backupSize: 0
    };
  }

  /**
   * Main migration method
   */
  public async migrate(): Promise<MigrationStats> {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 PORT MIGRATION SCRIPT STARTED');
    console.log('='.repeat(60));
    
    if (this.dryRun) {
      console.log('⚠️  DRY RUN MODE - No files will be modified');
    }

    try {
      // Step 1: Scan for files to migrate
      console.log('\n📁 Scanning for files...');
      const files = await this.scanFiles();
      this.stats.totalFiles = files.length;
      console.log(`   Found ${files.length} files to process`);

      // Step 2: Create backup directory if not dry run
      if (!this.dryRun) {
        await this.createBackupDirectory();
      }

      // Step 3: Process files in batches
      console.log('\n🔄 Processing files in batches...');
      const results = await this.processFilesInBatches(files);

      // Step 4: Generate final report
      console.log('\n📊 Generating migration report...');
      this.generateReport(results);

      return this.stats;

    } catch (error) {
      console.error('\n❌ Migration failed:', error);
      throw error;
    }
  }

  /**
   * Scan for files that need migration
   */
  private async scanFiles(): Promise<string[]> {
    const patterns = [
      'src/**/*.{ts,tsx,js,jsx}',
      'services/**/*.{ts,js,json}',
      'scripts/**/*.{sh,js,ts}', 
      'docs/**/*.md',
      '*.{json,js,ts}',
      '.env*'
    ];

    const files: string[] = [];
    
    for (const pattern of patterns) {
      try {
        const { stdout } = await execAsync(`find . -path "*/node_modules" -prune -o -path "*/.git" -prune -o -path "*/backup" -prune -o ${this.convertPatternToFind(pattern)} -print`);
        const foundFiles = stdout.trim().split('\n').filter(f => f && !f.includes('node_modules'));
        files.push(...foundFiles);
      } catch (error) {
        console.warn(`⚠️  Warning scanning pattern ${pattern}:`, error);
      }
    }

    // Remove duplicates and filter out directories
    const uniqueFiles = [...new Set(files)]
      .filter(file => {
        try {
          const stat = statSync(file);
          return stat.isFile();
        } catch {
          return false;
        }
      });

    return uniqueFiles;
  }

  /**
   * Convert glob pattern to find command
   */
  private convertPatternToFind(pattern: string): string {
    // Simple conversion - can be enhanced for complex patterns
    if (pattern.includes('**')) {
      const ext = pattern.split('.').pop();
      return `-name "*.${ext}"`;
    }
    return `-name "${pattern}"`;
  }

  /**
   * Create backup directory
   */
  private async createBackupDirectory(): Promise<void> {
    if (!existsSync(this.backupDir)) {
      mkdirSync(this.backupDir, { recursive: true });
      console.log(`   📦 Backup directory: ${this.backupDir}`);
    }
  }

  /**
   * Process files in batches for safety
   */
  private async processFilesInBatches(files: string[]): Promise<MigrationResult[]> {
    const results: MigrationResult[] = [];
    const totalBatches = Math.ceil(files.length / this.batchSize);

    for (let i = 0; i < files.length; i += this.batchSize) {
      const batch = files.slice(i, i + this.batchSize);
      const batchNum = Math.floor(i / this.batchSize) + 1;
      
      console.log(`\n   Batch ${batchNum}/${totalBatches} (${batch.length} files)`);
      
      for (const file of batch) {
        try {
          const result = await this.processFile(file);
          results.push(result);
          this.stats.processedFiles++;
          
          if (result.changes > 0) {
            this.stats.modifiedFiles++;
            this.stats.totalChanges += result.changes;
          }
          
          if (result.errors.length > 0) {
            this.stats.errors++;
          }

          // Progress indicator
          if (this.verbose || result.changes > 0) {
            const status = result.changes > 0 ? '✅' : '⏭️';
            console.log(`      ${status} ${file}: ${result.changes} changes`);
          }

        } catch (error) {
          console.error(`      ❌ ${file}: ${error}`);
          this.stats.errors++;
        }
      }

      // Pause between batches for safety
      if (batchNum < totalBatches) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return results;
  }

  /**
   * Process a single file
   */
  private async processFile(filePath: string): Promise<MigrationResult> {
    const result: MigrationResult = {
      file: filePath,
      originalSize: 0,
      newSize: 0,
      changes: 0,
      errors: [],
      rules: []
    };

    try {
      const originalContent = readFileSync(filePath, 'utf-8');
      result.originalSize = originalContent.length;
      
      let modifiedContent = originalContent;
      let totalChanges = 0;

      // Apply migration rules in priority order
      const sortedRules = this.migrationRules.sort((a, b) => a.priority - b.priority);
      
      for (const rule of sortedRules) {
        const matches = modifiedContent.match(rule.pattern);
        if (matches && matches.length > 0) {
          const beforeLength = modifiedContent.length;
          modifiedContent = modifiedContent.replace(rule.pattern, rule.replacement as string);
          const afterLength = modifiedContent.length;
          
          // Count actual changes (not just matches, in case of overlapping patterns)
          if (beforeLength !== afterLength || modifiedContent !== originalContent) {
            const changes = matches.length;
            totalChanges += changes;
            result.rules.push(`${rule.name}: ${changes} changes`);
            
            if (this.verbose) {
              console.log(`        ${rule.description}: ${changes} matches`);
            }
          }
        }
      }

      result.changes = totalChanges;
      result.newSize = modifiedContent.length;

      // Save changes if there are any and not in dry run
      if (totalChanges > 0 && !this.dryRun) {
        // Create backup
        await this.createFileBackup(filePath, originalContent);
        
        // Write modified content
        writeFileSync(filePath, modifiedContent, 'utf-8');
      }

    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : String(error));
    }

    return result;
  }

  /**
   * Create backup of original file
   */
  private async createFileBackup(filePath: string, content: string): Promise<void> {
    const backupPath = join(this.backupDir, filePath.replace(/^\.\//, ''));
    const backupDir = dirname(backupPath);
    
    if (!existsSync(backupDir)) {
      mkdirSync(backupDir, { recursive: true });
    }
    
    writeFileSync(backupPath, content, 'utf-8');
    this.stats.backupSize += content.length;
  }

  /**
   * Generate final migration report
   */
  private generateReport(results: MigrationResult[]): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 MIGRATION COMPLETE - FINAL REPORT');
    console.log('='.repeat(60));

    // Summary stats
    console.log('\n📈 Summary Statistics:');
    console.log(`   Total files scanned: ${this.stats.totalFiles}`);
    console.log(`   Files processed: ${this.stats.processedFiles}`);
    console.log(`   Files modified: ${this.stats.modifiedFiles}`);
    console.log(`   Total port references changed: ${this.stats.totalChanges}`);
    console.log(`   Errors encountered: ${this.stats.errors}`);
    
    if (!this.dryRun) {
      console.log(`   Backup size: ${(this.stats.backupSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   Backup location: ${this.backupDir}`);
    }

    // Files with most changes
    const topFiles = results
      .filter(r => r.changes > 0)
      .sort((a, b) => b.changes - a.changes)
      .slice(0, 10);

    if (topFiles.length > 0) {
      console.log('\n🔧 Files with Most Changes:');
      topFiles.forEach((file, index) => {
        console.log(`   ${index + 1}. ${file.file}: ${file.changes} changes`);
        if (this.verbose && file.rules.length > 0) {
          file.rules.forEach(rule => console.log(`      - ${rule}`));
        }
      });
    }

    // Errors
    const errorsFound = results.filter(r => r.errors.length > 0);
    if (errorsFound.length > 0) {
      console.log('\n❌ Files with Errors:');
      errorsFound.forEach(file => {
        console.log(`   ${file.file}:`);
        file.errors.forEach(error => console.log(`      - ${error}`));
      });
    }

    // Next steps
    console.log('\n📋 Next Steps:');
    if (this.dryRun) {
      console.log('   1. Review the changes above');
      console.log('   2. Run without --dry-run to execute migration');
      console.log('   3. Run: npm run migrate-ports');
    } else {
      console.log('   1. Test all services: npm run test-all-services');
      console.log('   2. Verify ports: npm run check-service-ports');
      console.log('   3. If issues occur: npm run rollback-ports');
    }

    console.log('\n' + '='.repeat(60));
  }

  /**
   * Create rollback script
   */
  public static createRollbackScript(backupDir: string): void {
    const rollbackScript = `#!/bin/bash
# Rollback port migration
echo "🔙 Rolling back port migration..."
echo "Backup directory: ${backupDir}"

if [ ! -d "${backupDir}" ]; then
  echo "❌ Backup directory not found!"
  exit 1
fi

# Copy files back
rsync -av "${backupDir}/" ./
echo "✅ Rollback complete!"

# Clean up backup
read -p "Delete backup directory? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  rm -rf "${backupDir}"
  echo "🗑️  Backup directory deleted"
fi
`;

    writeFileSync('scripts/rollback-ports.sh', rollbackScript);
    execAsync('chmod +x scripts/rollback-ports.sh');
  }
}

// CLI execution
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run') || args.includes('-d');
  const verbose = args.includes('--verbose') || args.includes('-v');
  const help = args.includes('--help') || args.includes('-h');

  if (help) {
    console.log(`
Port Migration Script Usage:

  npm run migrate-ports              Execute migration
  npm run migrate-ports --dry-run    Test run (no changes)
  npm run migrate-ports --verbose    Detailed output
  npm run rollback-ports             Rollback changes

Options:
  --dry-run, -d    Run in test mode (no files modified)
  --verbose, -v    Show detailed progress
  --help, -h       Show this help

This script will migrate 436 port references across 394 files:
  3000 → 4100 (Frontend)
  4000 → 4110 (Gateway) 
  4200 → 4130 (AI Assistant)
  4300 → 4140 (Terminal)
  4400 → 4150 (Workspace)
  4500 → 4160 (Portfolio)
  4600 → 4170 (Market Data)
`);
    process.exit(0);
  }

  try {
    const migration = new PortMigrationScript({ dryRun, verbose });
    const stats = await migration.migrate();
    
    // Create rollback script if not dry run
    if (!dryRun && stats.modifiedFiles > 0) {
      const backupDir = migration['backupDir']; // Access private property for rollback
      PortMigrationScript.createRollbackScript(backupDir);
      console.log('\n💾 Rollback script created: scripts/rollback-ports.sh');
    }

    process.exit(stats.errors > 0 ? 1 : 0);
    
  } catch (error) {
    console.error('\n💥 Migration failed:', error);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  main().catch(console.error);
}

export { PortMigrationScript };