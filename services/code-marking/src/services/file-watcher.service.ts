/**
 * File Watcher Service
 * Monitors file changes for incremental indexing and analysis
 */

import { EventEmitter } from 'events';
import chokidar, { FSWatcher } from 'chokidar';
import * as path from 'path';
import { logger } from '../utils/logger';
import { config } from '../config';
import { CodeIndexService } from './code-index.service';
import { MarkingEngineService } from './marking-engine.service';
import { debounce } from 'lodash';

export class FileWatcherService extends EventEmitter {
  private watcher?: FSWatcher;
  private codeIndexService: CodeIndexService;
  private markingEngine: MarkingEngineService;
  private pendingChanges: Map<string, NodeJS.Timeout> = new Map();
  
  constructor(
    codeIndexService: CodeIndexService,
    markingEngine: MarkingEngineService
  ) {
    super();
    this.codeIndexService = codeIndexService;
    this.markingEngine = markingEngine;
  }
  
  /**
   * Start watching files
   */
  start(watchPath: string = config.projectRoot): void {
    if (this.watcher) {
      logger.warn('File watcher already running');
      return;
    }
    
    const patterns = config.indexing.includeExtensions.map(ext => `**/*${ext}`);
    
    this.watcher = chokidar.watch(patterns, {
      cwd: watchPath,
      ignored: config.indexing.excludePatterns,
      persistent: true,
      ignoreInitial: config.fileWatcher.ignoreInitial,
      awaitWriteFinish: {
        stabilityThreshold: 2000,
        pollInterval: 100
      }
    });
    
    // Setup event handlers
    this.watcher
      .on('add', this.handleFileAdd.bind(this))
      .on('change', this.handleFileChange.bind(this))
      .on('unlink', this.handleFileDelete.bind(this))
      .on('error', (error) => {
        logger.error('File watcher error:', error);
        this.emit('error', error);
      })
      .on('ready', () => {
        logger.info('File watcher ready');
        this.emit('ready');
      });
    
    logger.info(`File watcher started for ${watchPath}`);
  }
  
  /**
   * Stop watching files
   */
  stop(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = undefined;
      
      // Clear pending changes
      for (const timeout of this.pendingChanges.values()) {
        clearTimeout(timeout);
      }
      this.pendingChanges.clear();
      
      logger.info('File watcher stopped');
    }
  }
  
  /**
   * Handle file addition
   */
  private handleFileAdd(filePath: string): void {
    const absolutePath = path.resolve(config.projectRoot, filePath);
    
    this.debounceChange(absolutePath, async () => {
      logger.info(`New file detected: ${filePath}`);
      
      try {
        await this.codeIndexService.indexFile(absolutePath, {
          extractSymbols: true,
          detectDependencies: true
        });
        
        this.emit('file:added', { path: absolutePath });
      } catch (error) {
        logger.error(`Failed to index new file ${filePath}:`, error);
      }
    });
  }
  
  /**
   * Handle file change
   */
  private handleFileChange(filePath: string): void {
    const absolutePath = path.resolve(config.projectRoot, filePath);
    
    this.debounceChange(absolutePath, async () => {
      logger.info(`File changed: ${filePath}`);
      
      try {
        // Re-index the file
        await this.codeIndexService.indexFile(absolutePath, {
          force: true,
          extractSymbols: true,
          detectDependencies: true
        });
        
        // Re-analyze for markings
        const file = await this.getFileByPath(absolutePath);
        if (file) {
          await this.markingEngine.analyzeFile(file.id);
        }
        
        this.emit('file:changed', { path: absolutePath });
      } catch (error) {
        logger.error(`Failed to process file change ${filePath}:`, error);
      }
    });
  }
  
  /**
   * Handle file deletion
   */
  private handleFileDelete(filePath: string): void {
    const absolutePath = path.resolve(config.projectRoot, filePath);
    
    logger.info(`File deleted: ${filePath}`);
    
    // No debouncing for deletions
    this.removeFileFromIndex(absolutePath)
      .then(() => {
        this.emit('file:deleted', { path: absolutePath });
      })
      .catch((error) => {
        logger.error(`Failed to remove deleted file ${filePath}:`, error);
      });
  }
  
  /**
   * Debounce file changes
   */
  private debounceChange(filePath: string, callback: () => void): void {
    // Clear existing timeout for this file
    if (this.pendingChanges.has(filePath)) {
      clearTimeout(this.pendingChanges.get(filePath)!);
    }
    
    // Set new timeout
    const timeout = setTimeout(() => {
      this.pendingChanges.delete(filePath);
      callback();
    }, config.fileWatcher.debounceMs);
    
    this.pendingChanges.set(filePath, timeout);
  }
  
  /**
   * Get file record by path
   */
  private async getFileByPath(filePath: string): Promise<any> {
    const { prisma } = require('../utils/prisma');
    return prisma.codeFile.findUnique({
      where: { path: filePath }
    });
  }
  
  /**
   * Remove file from index
   */
  private async removeFileFromIndex(filePath: string): Promise<void> {
    const { prisma } = require('../utils/prisma');
    
    const file = await prisma.codeFile.findUnique({
      where: { path: filePath }
    });
    
    if (file) {
      // Delete file and cascade to related records
      await prisma.codeFile.delete({
        where: { id: file.id }
      });
      
      logger.info(`Removed file from index: ${filePath}`);
    }
  }
  
  /**
   * Get watcher status
   */
  getStatus(): {
    isWatching: boolean;
    pendingChanges: number;
    watchedPaths: string[];
  } {
    return {
      isWatching: !!this.watcher,
      pendingChanges: this.pendingChanges.size,
      watchedPaths: this.watcher ? this.watcher.getWatched() as any : []
    };
  }
}