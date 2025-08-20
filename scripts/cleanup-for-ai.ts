#!/usr/bin/env tsx
/**
 * AI Orchestration Log Rotation and Cleanup Script
 * Manages logs, archives old data, and maintains system health
 * @AI-MARKER:SCRIPT:LOG_ROTATION
 */

import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';
import { createGzip } from 'zlib';
import { pipeline } from 'stream';

const execAsync = promisify(exec);
const pipelineAsync = promisify(pipeline);

interface CleanupConfig {
  logRetentionDays: number;
  archiveOldLogs: boolean;
  compressArchives: boolean;
  cleanTempFiles: boolean;
  updateIndexCache: boolean;
  maxLogSize: number; // MB
  directories: string[];
}

class AICleanupService {
  private config: CleanupConfig = {
    logRetentionDays: 7,
    archiveOldLogs: true,
    compressArchives: true,
    cleanTempFiles: true,
    updateIndexCache: true,
    maxLogSize: 100, // 100MB per log file
    directories: [
      '/Volumes/Untitled/Progress/port/logs',
      '/Volumes/Untitled/Progress/port/services/*/logs',
      '/tmp',
      '/var/folders/*/*/T/TemporaryItems',
      '/Volumes/Untitled/Progress/port/.ai-cache'
    ]
  };

  private stats = {
    filesDeleted: 0,
    filesArchived: 0,
    spaceFreed: 0,
    errors: 0
  };

  /**
   * Main cleanup execution
   */
  async execute(): Promise<void> {
    console.log('🧹 Starting AI Orchestration Cleanup...');
    console.log(`📅 Retention: ${this.config.logRetentionDays} days`);
    
    try {
      // 1. Clean old logs
      await this.cleanOldLogs();
      
      // 2. Archive large logs
      await this.archiveLargeLogs();
      
      // 3. Clean temp files
      if (this.config.cleanTempFiles) {
        await this.cleanTempFiles();
      }
      
      // 4. Clean AI cache
      await this.cleanAICache();
      
      // 5. Update index cache
      if (this.config.updateIndexCache) {
        await this.updateIndexCache();
      }
      
      // 6. Vacuum databases
      await this.vacuumDatabases();
      
      // Report results
      this.reportResults();
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
      process.exit(1);
    }
  }

  /**
   * Clean logs older than retention period
   */
  private async cleanOldLogs(): Promise<void> {
    console.log('\n📁 Cleaning old logs...');
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.logRetentionDays);

    for (const dir of this.config.directories) {
      const expandedDirs = await this.expandGlobPattern(dir);
      
      for (const directory of expandedDirs) {
        if (!fs.existsSync(directory)) continue;
        
        try {
          const files = await this.getFilesRecursively(directory);
          
          for (const file of files) {
            if (this.isLogFile(file)) {
              const stats = fs.statSync(file);
              
              if (stats.mtime < cutoffDate) {
                if (this.config.archiveOldLogs) {
                  await this.archiveFile(file);
                  this.stats.filesArchived++;
                } else {
                  fs.unlinkSync(file);
                  this.stats.filesDeleted++;
                }
                this.stats.spaceFreed += stats.size;
              }
            }
          }
        } catch (error) {
          console.warn(`⚠️ Error processing ${directory}:`, error);
          this.stats.errors++;
        }
      }
    }
  }

  /**
   * Archive large log files
   */
  private async archiveLargeLogs(): Promise<void> {
    console.log('\n📦 Archiving large logs...');
    const maxSize = this.config.maxLogSize * 1024 * 1024; // Convert to bytes

    for (const dir of this.config.directories) {
      const expandedDirs = await this.expandGlobPattern(dir);
      
      for (const directory of expandedDirs) {
        if (!fs.existsSync(directory)) continue;
        
        try {
          const files = await this.getFilesRecursively(directory);
          
          for (const file of files) {
            if (this.isLogFile(file) && !file.endsWith('.gz')) {
              const stats = fs.statSync(file);
              
              if (stats.size > maxSize) {
                await this.compressFile(file);
                this.stats.filesArchived++;
                this.stats.spaceFreed += stats.size * 0.8; // Estimate 80% compression
              }
            }
          }
        } catch (error) {
          console.warn(`⚠️ Error archiving in ${directory}:`, error);
          this.stats.errors++;
        }
      }
    }
  }

  /**
   * Clean temporary files
   */
  private async cleanTempFiles(): Promise<void> {
    console.log('\n🗑️ Cleaning temp files...');
    
    const tempPatterns = [
      '*.tmp',
      '*.temp',
      '*.log.*',
      'npm-debug.log*',
      'yarn-error.log*',
      '.DS_Store',
      'Thumbs.db',
      '*.swp',
      '*.swo',
      '*~'
    ];

    for (const pattern of tempPatterns) {
      try {
        const { stdout } = await execAsync(
          `find /Volumes/Untitled/Progress/port -name "${pattern}" -type f -mtime +1 -delete 2>/dev/null || true`
        );
        
        if (stdout) {
          const files = stdout.split('\n').filter(Boolean);
          this.stats.filesDeleted += files.length;
        }
      } catch (error) {
        // Ignore errors for missing files
      }
    }
  }

  /**
   * Clean AI cache files
   */
  private async cleanAICache(): Promise<void> {
    console.log('\n🤖 Cleaning AI cache...');
    
    const cacheDir = '/Volumes/Untitled/Progress/port/.ai-cache';
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
      return;
    }

    const files = fs.readdirSync(cacheDir);
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - 24); // 24 hour cache

    for (const file of files) {
      const filePath = path.join(cacheDir, file);
      const stats = fs.statSync(filePath);
      
      if (stats.mtime < cutoffDate) {
        fs.unlinkSync(filePath);
        this.stats.filesDeleted++;
        this.stats.spaceFreed += stats.size;
      }
    }
  }

  /**
   * Update index cache for AI agents
   */
  private async updateIndexCache(): Promise<void> {
    console.log('\n🔄 Updating index cache...');
    
    const indexDir = '/Volumes/Untitled/Progress/port/services/.ai-index';
    if (!fs.existsSync(indexDir)) {
      return;
    }

    // Create cache summary
    const cacheSummary = {
      lastUpdate: new Date().toISOString(),
      services: [] as any[],
      totalFiles: 0,
      totalSize: 0
    };

    const services = fs.readdirSync('/Volumes/Untitled/Progress/port/services')
      .filter(d => fs.statSync(path.join('/Volumes/Untitled/Progress/port/services', d)).isDirectory());

    for (const service of services) {
      const serviceDir = path.join('/Volumes/Untitled/Progress/port/services', service);
      const srcDir = path.join(serviceDir, 'src');
      
      if (fs.existsSync(srcDir)) {
        const files = await this.getFilesRecursively(srcDir);
        const tsFiles = files.filter(f => f.endsWith('.ts') || f.endsWith('.tsx'));
        
        cacheSummary.services.push({
          name: service,
          files: tsFiles.length,
          lastModified: Math.max(...tsFiles.map(f => fs.statSync(f).mtime.getTime()))
        });
        
        cacheSummary.totalFiles += tsFiles.length;
      }
    }

    // Write cache summary
    fs.writeFileSync(
      path.join(indexDir, 'cache-summary.json'),
      JSON.stringify(cacheSummary, null, 2)
    );
  }

  /**
   * Vacuum SQLite databases
   */
  private async vacuumDatabases(): Promise<void> {
    console.log('\n💾 Vacuuming databases...');
    
    const dbFiles = [
      '/Volumes/Untitled/Progress/port/prisma/dev.db',
      '/Volumes/Untitled/Progress/port/.ai-cache/tasks.db',
      '/Volumes/Untitled/Progress/port/.ai-cache/context.db'
    ];

    for (const dbFile of dbFiles) {
      if (fs.existsSync(dbFile)) {
        try {
          await execAsync(`sqlite3 "${dbFile}" "VACUUM;" 2>/dev/null || true`);
          const stats = fs.statSync(dbFile);
          console.log(`  ✓ Vacuumed ${path.basename(dbFile)} (${(stats.size / 1024 / 1024).toFixed(2)}MB)`);
        } catch (error) {
          // Ignore if sqlite3 is not available
        }
      }
    }
  }

  /**
   * Helper: Expand glob patterns
   */
  private async expandGlobPattern(pattern: string): Promise<string[]> {
    if (!pattern.includes('*')) {
      return [pattern];
    }

    try {
      const { stdout } = await execAsync(`ls -d ${pattern} 2>/dev/null || true`);
      return stdout.split('\n').filter(Boolean);
    } catch {
      return [];
    }
  }

  /**
   * Helper: Get files recursively
   */
  private async getFilesRecursively(dir: string): Promise<string[]> {
    const files: string[] = [];
    
    const walk = (currentDir: string) => {
      try {
        const items = fs.readdirSync(currentDir);
        
        for (const item of items) {
          const fullPath = path.join(currentDir, item);
          const stats = fs.statSync(fullPath);
          
          if (stats.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
            walk(fullPath);
          } else if (stats.isFile()) {
            files.push(fullPath);
          }
        }
      } catch (error) {
        // Skip directories we can't read
      }
    };

    walk(dir);
    return files;
  }

  /**
   * Helper: Check if file is a log file
   */
  private isLogFile(file: string): boolean {
    const logExtensions = ['.log', '.txt', '.out', '.err'];
    const logPatterns = ['debug', 'error', 'access', 'console'];
    
    const basename = path.basename(file).toLowerCase();
    
    return logExtensions.some(ext => file.endsWith(ext)) ||
           logPatterns.some(pattern => basename.includes(pattern));
  }

  /**
   * Helper: Archive file with optional compression
   */
  private async archiveFile(file: string): Promise<void> {
    const archiveDir = path.join(path.dirname(file), 'archive');
    
    if (!fs.existsSync(archiveDir)) {
      fs.mkdirSync(archiveDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().split('T')[0];
    const archiveName = `${path.basename(file)}.${timestamp}`;
    const archivePath = path.join(archiveDir, archiveName);

    if (this.config.compressArchives) {
      await this.compressFile(file, archivePath + '.gz');
      fs.unlinkSync(file);
    } else {
      fs.renameSync(file, archivePath);
    }
  }

  /**
   * Helper: Compress file
   */
  private async compressFile(source: string, destination?: string): Promise<void> {
    const dest = destination || source + '.gz';
    
    await pipelineAsync(
      fs.createReadStream(source),
      createGzip(),
      fs.createWriteStream(dest)
    );
    
    if (!destination) {
      fs.unlinkSync(source);
    }
  }

  /**
   * Report cleanup results
   */
  private reportResults(): void {
    console.log('\n📊 Cleanup Results:');
    console.log('═'.repeat(40));
    console.log(`  Files Deleted: ${this.stats.filesDeleted}`);
    console.log(`  Files Archived: ${this.stats.filesArchived}`);
    console.log(`  Space Freed: ${(this.stats.spaceFreed / 1024 / 1024).toFixed(2)}MB`);
    console.log(`  Errors: ${this.stats.errors}`);
    console.log('═'.repeat(40));
    
    if (this.stats.errors > 0) {
      console.log('⚠️ Some errors occurred during cleanup');
    } else {
      console.log('✅ Cleanup completed successfully!');
    }
  }
}

// Execute if run directly
if (require.main === module) {
  const cleanup = new AICleanupService();
  cleanup.execute().catch(console.error);
}

export { AICleanupService };