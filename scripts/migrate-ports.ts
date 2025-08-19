#!/usr/bin/env tsx
/**
 * Port Migration Script
 * 
 * This script migrates all hardcoded ports in the codebase to use the
 * centralized port configuration system.
 * 
 * Usage:
 *   tsx scripts/migrate-ports.ts --dry-run  # Preview changes
 *   tsx scripts/migrate-ports.ts            # Apply changes
 *   tsx scripts/migrate-ports.ts --rollback # Restore from backups
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import { execSync } from 'child_process';

interface MigrationRule {
  pattern: RegExp;
  replacement: string | ((match: string, ...args: any[]) => string);
  fileTypes: string[];
  description: string;
}

interface MigrationResult {
  file: string;
  changed: boolean;
  changes: Array<{
    line: number;
    before: string;
    after: string;
  }>;
  error?: string;
}

class PortMigrator {
  private rules: MigrationRule[] = [
    // TypeScript/JavaScript imports
    {
      pattern: /^(.*?)$/m,
      replacement: (match: string) => {
        // Only add import if file uses ports and doesn't already have it
        if (match.includes('localhost:') && !match.includes('portConfig')) {
          return `import { portConfig, getServiceUrl, getWebSocketUrl } from '@/shared/config/ports.config';\n${match}`;
        }
        return match;
      },
      fileTypes: ['ts', 'tsx'],
      description: 'Add port config imports to TypeScript files'
    },

    // Frontend port replacements
    {
      pattern: /localhost:3000/g,
      replacement: '${getFrontendPort()}',
      fileTypes: ['ts', 'tsx', 'js', 'jsx'],
      description: 'Replace frontend port 3000 with config'
    },
    {
      pattern: /PORT=3000/g,
      replacement: 'PORT=${getFrontendPort()}',
      fileTypes: ['ts', 'tsx', 'js', 'jsx'],
      description: 'Replace PORT=3000 with config'
    },
    {
      pattern: /:3000/g,
      replacement: ':${getFrontendPort()}',
      fileTypes: ['json', 'env'],
      description: 'Replace :3000 in config files'
    },

    // Gateway port replacements
    {
      pattern: /localhost:4000/g,
      replacement: '${getGatewayPort()}',
      fileTypes: ['ts', 'tsx', 'js', 'jsx'],
      description: 'Replace gateway port 4000 with config'
    },
    {
      pattern: /PORT=4000/g,
      replacement: 'PORT=${getGatewayPort()}',
      fileTypes: ['ts', 'tsx', 'js', 'jsx'],
      description: 'Replace PORT=4000 with config'
    },
    {
      pattern: /:4000/g,
      replacement: ':${getGatewayPort()}',
      fileTypes: ['json', 'env'],
      description: 'Replace :4000 in config files'
    },

    // Service port replacements - User Management
    {
      pattern: /localhost:4100/g,
      replacement: '${getServiceUrl("userManagement")}',
      fileTypes: ['ts', 'tsx', 'js', 'jsx'],
      description: 'Replace user service port 4100'
    },

    // Service port replacements - AI Assistant
    {
      pattern: /localhost:4200/g,
      replacement: '${getServiceUrl("aiAssistant")}',
      fileTypes: ['ts', 'tsx', 'js', 'jsx'],
      description: 'Replace AI service port 4200'
    },

    // Service port replacements - Terminal
    {
      pattern: /localhost:4300/g,
      replacement: '${getServiceUrl("terminal")}',
      fileTypes: ['ts', 'tsx', 'js', 'jsx'],
      description: 'Replace terminal service port 4300'
    },

    // Service port replacements - Workspace
    {
      pattern: /localhost:4400/g,
      replacement: '${getServiceUrl("workspace")}',
      fileTypes: ['ts', 'tsx', 'js', 'jsx'],
      description: 'Replace workspace service port 4400'
    },

    // Service port replacements - Portfolio
    {
      pattern: /localhost:4500/g,
      replacement: '${getServiceUrl("portfolio")}',
      fileTypes: ['ts', 'tsx', 'js', 'jsx'],
      description: 'Replace portfolio service port 4500'
    },

    // Service port replacements - Market Data
    {
      pattern: /localhost:4600/g,
      replacement: '${getServiceUrl("marketData")}',
      fileTypes: ['ts', 'tsx', 'js', 'jsx'],
      description: 'Replace market data service port 4600'
    },

    // Shell script replacements
    {
      pattern: /PORT=3000/g,
      replacement: 'PORT=$PORT_FRONTEND_MAIN',
      fileTypes: ['sh', 'bash'],
      description: 'Replace PORT=3000 in shell scripts'
    },
    {
      pattern: /PORT=4000/g,
      replacement: 'PORT=$PORT_GATEWAY_MAIN',
      fileTypes: ['sh', 'bash'],
      description: 'Replace PORT=4000 in shell scripts'
    },
    {
      pattern: /localhost:3000/g,
      replacement: 'localhost:$PORT_FRONTEND_MAIN',
      fileTypes: ['sh', 'bash'],
      description: 'Replace localhost:3000 in shell scripts'
    },
    {
      pattern: /localhost:4000/g,
      replacement: 'localhost:$PORT_GATEWAY_MAIN',
      fileTypes: ['sh', 'bash'],
      description: 'Replace localhost:4000 in shell scripts'
    },
    {
      pattern: /localhost:4100/g,
      replacement: 'localhost:$PORT_SERVICE_USER',
      fileTypes: ['sh', 'bash'],
      description: 'Replace localhost:4100 in shell scripts'
    },
    {
      pattern: /localhost:4200/g,
      replacement: 'localhost:$PORT_SERVICE_AI',
      fileTypes: ['sh', 'bash'],
      description: 'Replace localhost:4200 in shell scripts'
    },
    {
      pattern: /localhost:4300/g,
      replacement: 'localhost:$PORT_SERVICE_TERMINAL',
      fileTypes: ['sh', 'bash'],
      description: 'Replace localhost:4300 in shell scripts'
    },
    {
      pattern: /localhost:4400/g,
      replacement: 'localhost:$PORT_SERVICE_WORKSPACE',
      fileTypes: ['sh', 'bash'],
      description: 'Replace localhost:4400 in shell scripts'
    },
    {
      pattern: /localhost:4500/g,
      replacement: 'localhost:$PORT_SERVICE_PORTFOLIO',
      fileTypes: ['sh', 'bash'],
      description: 'Replace localhost:4500 in shell scripts'
    },
    {
      pattern: /localhost:4600/g,
      replacement: 'localhost:$PORT_SERVICE_MARKET',
      fileTypes: ['sh', 'bash'],
      description: 'Replace localhost:4600 in shell scripts'
    },

    // Docker Compose replacements
    {
      pattern: /"3000:3000"/g,
      replacement: '"${PORT_FRONTEND_MAIN:-4100}:3000"',
      fileTypes: ['yml', 'yaml'],
      description: 'Replace Docker frontend port mapping'
    },
    {
      pattern: /"4000:4000"/g,
      replacement: '"${PORT_GATEWAY_MAIN:-4110}:4000"',
      fileTypes: ['yml', 'yaml'],
      description: 'Replace Docker gateway port mapping'
    },

    // CommonJS require statements
    {
      pattern: /^(.*?)$/m,
      replacement: (match: string) => {
        // Only add require if file uses ports and doesn't already have it
        if (match.includes('localhost:') && !match.includes('getPortConfig')) {
          return `const { getPortConfig, getServiceUrl } = require('@/shared/config/ports.cjs');\nconst portConfig = getPortConfig();\n${match}`;
        }
        return match;
      },
      fileTypes: ['js'],
      description: 'Add port config requires to JavaScript files'
    }
  ];

  private backupDir = path.join(process.cwd(), '.port-migration-backup');
  private logFile = path.join(process.cwd(), 'port-migration.log');

  constructor(private dryRun = false) {
    if (!this.dryRun && !fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  async migrate(): Promise<void> {
    console.log(`🚀 Starting port migration ${this.dryRun ? '(DRY RUN)' : ''}`);
    console.log('');

    const files = await this.findFiles();
    console.log(`📁 Found ${files.length} files to check`);
    console.log('');

    const results: MigrationResult[] = [];
    let changedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const progress = `[${i + 1}/${files.length}]`;
      
      process.stdout.write(`${progress} Processing ${path.basename(file)}...`);
      
      const result = await this.migrateFile(file);
      results.push(result);

      if (result.error) {
        errorCount++;
        process.stdout.write(` ❌ Error\n`);
        console.error(`  Error: ${result.error}`);
      } else if (result.changed) {
        changedCount++;
        process.stdout.write(` ✅ Changed (${result.changes.length} replacements)\n`);
      } else {
        process.stdout.write(` ⏭️  Skipped\n`);
      }
    }

    // Write summary
    console.log('');
    console.log('=' .repeat(60));
    console.log(`📊 Migration ${this.dryRun ? 'Preview' : 'Complete'}`);
    console.log('=' .repeat(60));
    console.log(`Total files scanned: ${files.length}`);
    console.log(`Files ${this.dryRun ? 'to be modified' : 'modified'}: ${changedCount}`);
    console.log(`Errors encountered: ${errorCount}`);
    console.log('');

    // Write detailed log
    this.writeLog(results);

    if (this.dryRun) {
      console.log('💡 Run without --dry-run to apply changes');
    } else {
      console.log(`✅ Backup files created in: ${this.backupDir}`);
      console.log(`📝 Detailed log written to: ${this.logFile}`);
    }
  }

  private async findFiles(): Promise<string[]> {
    const patterns = [
      '**/*.{ts,tsx,js,jsx}',
      '**/*.{sh,bash}',
      '**/*.{json,env}',
      '**/Dockerfile*',
      '**/docker-compose*.{yml,yaml}'
    ];

    const ignorePatterns = [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.next/**',
      '**/coverage/**',
      '**/.git/**',
      '**/backup/**',
      '**/backups/**',
      '**/.port-migration-backup/**',
      '**/shared/config/**', // Don't modify our own config files
      '**/scripts/migrate-ports.ts' // Don't modify this script
    ];

    const files: string[] = [];
    
    for (const pattern of patterns) {
      const matched = await glob(pattern, {
        ignore: ignorePatterns,
        absolute: true,
        cwd: process.cwd()
      });
      files.push(...matched);
    }

    // Filter out files that definitely don't contain ports
    return files.filter(file => {
      const content = fs.readFileSync(file, 'utf8');
      return content.includes(':3000') ||
             content.includes(':4000') ||
             content.includes(':4100') ||
             content.includes(':4200') ||
             content.includes(':4300') ||
             content.includes(':4400') ||
             content.includes(':4500') ||
             content.includes(':4600');
    });
  }

  private async migrateFile(filePath: string): Promise<MigrationResult> {
    const result: MigrationResult = {
      file: filePath,
      changed: false,
      changes: []
    };

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const ext = path.extname(filePath).slice(1);
      let newContent = content;
      
      // Apply applicable rules
      for (const rule of this.rules) {
        if (rule.fileTypes.includes(ext)) {
          const matches = content.match(rule.pattern);
          if (matches) {
            const beforeChange = newContent;
            
            if (typeof rule.replacement === 'function') {
              newContent = newContent.replace(rule.pattern, rule.replacement);
            } else {
              newContent = newContent.replace(rule.pattern, rule.replacement);
            }
            
            if (beforeChange !== newContent) {
              result.changed = true;
              // Track specific changes (simplified for brevity)
              const lines = this.getChangedLines(beforeChange, newContent);
              result.changes.push(...lines);
            }
          }
        }
      }

      // Add import/require statements if needed
      if (result.changed) {
        newContent = this.addImportStatements(newContent, ext);
      }

      // Write changes if not dry run
      if (result.changed && !this.dryRun) {
        // Create backup
        const backupPath = path.join(
          this.backupDir,
          path.relative(process.cwd(), filePath)
        );
        const backupDir = path.dirname(backupPath);
        
        if (!fs.existsSync(backupDir)) {
          fs.mkdirSync(backupDir, { recursive: true });
        }
        
        fs.copyFileSync(filePath, backupPath);
        
        // Write new content
        fs.writeFileSync(filePath, newContent, 'utf8');
      }
    } catch (error) {
      result.error = error instanceof Error ? error.message : String(error);
    }

    return result;
  }

  private addImportStatements(content: string, fileType: string): string {
    // For TypeScript/TSX files
    if (fileType === 'ts' || fileType === 'tsx') {
      // Check if we need to add imports
      const needsImport = content.includes('${get') && !content.includes('portConfig');
      
      if (needsImport) {
        // Find the right place to add import (after existing imports or at top)
        const importMatch = content.match(/^import .* from .*;$/m);
        if (importMatch) {
          const lastImportIndex = content.lastIndexOf(importMatch[0]);
          const beforeImport = content.slice(0, lastImportIndex + importMatch[0].length);
          const afterImport = content.slice(lastImportIndex + importMatch[0].length);
          return `${beforeImport}\nimport { portConfig, getServiceUrl, getFrontendPort, getGatewayPort } from '@/shared/config/ports.config';${afterImport}`;
        } else {
          return `import { portConfig, getServiceUrl, getFrontendPort, getGatewayPort } from '@/shared/config/ports.config';\n\n${content}`;
        }
      }
    }
    
    // For JavaScript files
    if (fileType === 'js' || fileType === 'jsx') {
      const needsRequire = content.includes('${get') && !content.includes('getPortConfig');
      
      if (needsRequire) {
        const requireMatch = content.match(/^const .* = require\(.*\);$/m);
        if (requireMatch) {
          const lastRequireIndex = content.lastIndexOf(requireMatch[0]);
          const beforeRequire = content.slice(0, lastRequireIndex + requireMatch[0].length);
          const afterRequire = content.slice(lastRequireIndex + requireMatch[0].length);
          return `${beforeRequire}\nconst { getPortConfig, getServiceUrl, getFrontendPort, getGatewayPort } = require('@/shared/config/ports.cjs');\nconst portConfig = getPortConfig();${afterRequire}`;
        } else {
          return `const { getPortConfig, getServiceUrl, getFrontendPort, getGatewayPort } = require('@/shared/config/ports.cjs');\nconst portConfig = getPortConfig();\n\n${content}`;
        }
      }
    }
    
    // For shell scripts
    if (fileType === 'sh' || fileType === 'bash') {
      const needsSource = content.includes('$PORT_') && !content.includes('source.*ports.sh');
      
      if (needsSource) {
        // Add source command at the beginning (after shebang if present)
        const shebangMatch = content.match(/^#!.*$/m);
        if (shebangMatch) {
          const shebangIndex = content.indexOf(shebangMatch[0]);
          const beforeShebang = content.slice(0, shebangIndex + shebangMatch[0].length);
          const afterShebang = content.slice(shebangIndex + shebangMatch[0].length);
          return `${beforeShebang}\n\n# Source port configuration\nsource "$(dirname "$0")/../shared/config/ports.sh"${afterShebang}`;
        } else {
          return `# Source port configuration\nsource "$(dirname "$0")/../shared/config/ports.sh"\n\n${content}`;
        }
      }
    }
    
    return content;
  }

  private getChangedLines(before: string, after: string): Array<{line: number; before: string; after: string}> {
    const changes: Array<{line: number; before: string; after: string}> = [];
    const beforeLines = before.split('\n');
    const afterLines = after.split('\n');
    
    for (let i = 0; i < Math.max(beforeLines.length, afterLines.length); i++) {
      if (beforeLines[i] !== afterLines[i]) {
        changes.push({
          line: i + 1,
          before: beforeLines[i] || '',
          after: afterLines[i] || ''
        });
      }
    }
    
    return changes;
  }

  private writeLog(results: MigrationResult[]): void {
    if (this.dryRun) return;

    const log = {
      timestamp: new Date().toISOString(),
      mode: this.dryRun ? 'dry-run' : 'applied',
      summary: {
        totalFiles: results.length,
        changedFiles: results.filter(r => r.changed).length,
        errors: results.filter(r => r.error).length
      },
      files: results.filter(r => r.changed || r.error).map(r => ({
        path: path.relative(process.cwd(), r.file),
        changed: r.changed,
        changeCount: r.changes.length,
        error: r.error
      }))
    };

    fs.writeFileSync(this.logFile, JSON.stringify(log, null, 2));
  }

  async rollback(): Promise<void> {
    console.log('🔄 Starting rollback from backup...');
    
    if (!fs.existsSync(this.backupDir)) {
      console.error('❌ No backup directory found. Nothing to rollback.');
      return;
    }

    const backupFiles = await glob('**/*', {
      cwd: this.backupDir,
      absolute: true,
      nodir: true
    });

    console.log(`Found ${backupFiles.length} files to restore`);

    for (const backupFile of backupFiles) {
      const relativePath = path.relative(this.backupDir, backupFile);
      const originalPath = path.join(process.cwd(), relativePath);
      
      try {
        fs.copyFileSync(backupFile, originalPath);
        console.log(`✅ Restored: ${relativePath}`);
      } catch (error) {
        console.error(`❌ Failed to restore ${relativePath}:`, error);
      }
    }

    console.log('✅ Rollback complete');
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const rollback = args.includes('--rollback');
  const help = args.includes('--help') || args.includes('-h');

  if (help) {
    console.log(`
Port Migration Script

Usage:
  tsx scripts/migrate-ports.ts [options]

Options:
  --dry-run    Preview changes without applying them
  --rollback   Restore files from backup
  --help, -h   Show this help message

Examples:
  tsx scripts/migrate-ports.ts --dry-run  # Preview changes
  tsx scripts/migrate-ports.ts            # Apply changes
  tsx scripts/migrate-ports.ts --rollback # Restore from backup
    `);
    process.exit(0);
  }

  const migrator = new PortMigrator(dryRun);

  try {
    if (rollback) {
      await migrator.rollback();
    } else {
      await migrator.migrate();
    }
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}