/**
 * Code Index Service
 * Manages code indexing and file analysis
 */

import { PrismaClient } from '@prisma/client';
import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { glob } from 'glob';
import { Project, SourceFile } from 'ts-morph';
import * as parser from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import { logger } from '../utils/logger';
import { config } from '../config';
import { QueueService, QueueName } from './queue.service';

export interface IndexingOptions {
  force?: boolean;
  patterns?: string[];
  excludePatterns?: string[];
  includeExtensions?: string[];
  parseAST?: boolean;
  extractSymbols?: boolean;
  detectDependencies?: boolean;
}

export interface IndexingStatus {
  totalFiles: number;
  indexedFiles: number;
  pendingFiles: number;
  failedFiles: number;
  progress: number;
  isRunning: boolean;
  startTime?: Date;
  estimatedCompletion?: Date;
}

export class CodeIndexService extends EventEmitter {
  private prisma: PrismaClient;
  private queue: QueueService;
  private tsProject?: Project;
  private indexingStatus: IndexingStatus = {
    totalFiles: 0,
    indexedFiles: 0,
    pendingFiles: 0,
    failedFiles: 0,
    progress: 0,
    isRunning: false
  };
  
  constructor(prisma: PrismaClient, queueService: QueueService) {
    super();
    this.prisma = prisma;
    this.queue = queueService;
    
    // Register queue processor
    this.queue.registerProcessor(QueueName.INDEXING, this.processIndexingJob.bind(this));
  }
  
  /**
   * Build complete index for project
   */
  async buildIndex(options: IndexingOptions = {}): Promise<void> {
    logger.info('Starting full project indexing...');
    this.indexingStatus.isRunning = true;
    this.indexingStatus.startTime = new Date();
    
    try {
      // Get all files to index
      const files = await this.discoverFiles(options);
      this.indexingStatus.totalFiles = files.length;
      this.indexingStatus.pendingFiles = files.length;
      
      logger.info(`Found ${files.length} files to index`);
      
      // Create indexing jobs
      const jobs = files.map((filePath) => ({
        data: {
          filePath,
          options
        },
        opts: {
          priority: 5
        }
      }));
      
      // Add jobs to queue in batches
      const batchSize = config.indexing.batchSize;
      for (let i = 0; i < jobs.length; i += batchSize) {
        const batch = jobs.slice(i, i + batchSize);
        await this.queue.addBulkJobs(QueueName.INDEXING, batch);
      }
      
      logger.info('Indexing jobs queued successfully');
      this.emit('indexing:started', { totalFiles: files.length });
      
    } catch (error) {
      logger.error('Failed to build index:', error);
      this.indexingStatus.isRunning = false;
      throw error;
    }
  }
  
  /**
   * Process individual indexing job
   */
  private async processIndexingJob(job: any): Promise<void> {
    const { filePath, options } = job.data;
    
    try {
      await this.indexFile(filePath, options);
      
      this.indexingStatus.indexedFiles++;
      this.indexingStatus.pendingFiles--;
      this.updateProgress();
      
      this.emit('file:indexed', { filePath });
      
    } catch (error) {
      logger.error(`Failed to index file ${filePath}:`, error);
      this.indexingStatus.failedFiles++;
      this.indexingStatus.pendingFiles--;
      this.updateProgress();
      
      this.emit('file:failed', { filePath, error });
      throw error;
    }
  }
  
  /**
   * Index a single file
   */
  async indexFile(filePath: string, options: IndexingOptions = {}): Promise<void> {
    const stats = await fs.stat(filePath);
    
    // Skip large files
    if (stats.size > config.indexing.maxFileSize) {
      logger.warn(`Skipping large file: ${filePath} (${stats.size} bytes)`);
      return;
    }
    
    const content = await fs.readFile(filePath, 'utf-8');
    const fileHash = crypto.createHash('md5').update(content).digest('hex');
    const relativePath = path.relative(config.projectRoot, filePath);
    const extension = path.extname(filePath);
    const language = this.detectLanguage(extension);
    
    // Check if file already indexed and unchanged
    const existingFile = await this.prisma.codeFile.findUnique({
      where: { path: filePath }
    });
    
    if (existingFile && existingFile.hash === fileHash && !options.force) {
      logger.debug(`File unchanged, skipping: ${filePath}`);
      return;
    }
    
    // Count lines
    const lines = content.split('\n').length;
    
    // Create or update file record
    const fileRecord = await this.prisma.codeFile.upsert({
      where: { path: filePath },
      create: {
        path: filePath,
        relativePath,
        name: path.basename(filePath),
        extension,
        size: stats.size,
        lines,
        language,
        hash: fileHash,
        lastModified: stats.mtime,
        content: content.length < 100000 ? content : null, // Store content only for small files
        parsed: false,
        indexed: false
      },
      update: {
        size: stats.size,
        lines,
        hash: fileHash,
        lastModified: stats.mtime,
        content: content.length < 100000 ? content : null,
        parsed: false,
        indexed: false
      }
    });
    
    // Parse and extract symbols if requested
    if (options.extractSymbols) {
      await this.extractSymbols(fileRecord.id, filePath, content, language);
    }
    
    // Detect dependencies if requested
    if (options.detectDependencies) {
      await this.detectDependencies(fileRecord.id, filePath, content, language);
    }
    
    // Mark as indexed
    await this.prisma.codeFile.update({
      where: { id: fileRecord.id },
      data: {
        parsed: options.extractSymbols || false,
        indexed: true
      }
    });
    
    logger.debug(`Indexed file: ${filePath}`);
  }
  
  /**
   * Extract symbols from file
   */
  private async extractSymbols(fileId: string, filePath: string, content: string, language: string | null): Promise<void> {
    const extension = path.extname(filePath);
    
    try {
      if (extension === '.ts' || extension === '.tsx') {
        await this.extractTypeScriptSymbols(fileId, filePath, content);
      } else if (extension === '.js' || extension === '.jsx') {
        await this.extractJavaScriptSymbols(fileId, content);
      }
      // Add more language support as needed
    } catch (error) {
      logger.error(`Failed to extract symbols from ${filePath}:`, error);
    }
  }
  
  /**
   * Extract TypeScript symbols using ts-morph
   */
  private async extractTypeScriptSymbols(fileId: string, filePath: string, content: string): Promise<void> {
    if (!this.tsProject) {
      this.tsProject = new Project({
        compilerOptions: {
          allowJs: true,
          jsx: 3 // React
        }
      });
    }
    
    const sourceFile = this.tsProject.createSourceFile(filePath, content, { overwrite: true });
    const symbols: any[] = [];
    
    // Extract functions
    sourceFile.getFunctions().forEach(func => {
      symbols.push({
        fileId,
        name: func.getName() || 'anonymous',
        type: 'FUNCTION',
        line: func.getStartLineNumber(),
        column: func.getStartLinePos(),
        endLine: func.getEndLineNumber(),
        signature: func.getText().substring(0, 200),
        visibility: func.isExported() ? 'public' : 'private'
      });
    });
    
    // Extract classes
    sourceFile.getClasses().forEach(cls => {
      symbols.push({
        fileId,
        name: cls.getName() || 'anonymous',
        type: 'CLASS',
        line: cls.getStartLineNumber(),
        column: cls.getStartLinePos(),
        endLine: cls.getEndLineNumber(),
        visibility: cls.isExported() ? 'public' : 'private'
      });
      
      // Extract methods
      cls.getMethods().forEach(method => {
        symbols.push({
          fileId,
          name: `${cls.getName()}.${method.getName()}`,
          type: 'METHOD',
          line: method.getStartLineNumber(),
          column: method.getStartLinePos(),
          endLine: method.getEndLineNumber(),
          signature: method.getText().substring(0, 200),
          visibility: method.getScope()
        });
      });
    });
    
    // Extract interfaces
    sourceFile.getInterfaces().forEach(iface => {
      symbols.push({
        fileId,
        name: iface.getName(),
        type: 'INTERFACE',
        line: iface.getStartLineNumber(),
        column: iface.getStartLinePos(),
        endLine: iface.getEndLineNumber(),
        visibility: iface.isExported() ? 'public' : 'private'
      });
    });
    
    // Extract React components (function components)
    sourceFile.getVariableDeclarations().forEach(varDecl => {
      const initializer = varDecl.getInitializer();
      if (initializer && (initializer.getKindName() === 'ArrowFunction' || initializer.getKindName() === 'FunctionExpression')) {
        const name = varDecl.getName();
        if (name && name[0] === name[0].toUpperCase()) { // Likely a React component
          symbols.push({
            fileId,
            name,
            type: 'COMPONENT',
            line: varDecl.getStartLineNumber(),
            column: varDecl.getStartLinePos(),
            endLine: varDecl.getEndLineNumber(),
            visibility: varDecl.isExported() ? 'public' : 'private'
          });
        }
      }
    });
    
    // Save symbols to database
    if (symbols.length > 0) {
      await this.prisma.symbol.createMany({
        data: symbols,
        skipDuplicates: true
      });
    }
  }
  
  /**
   * Extract JavaScript symbols using Babel parser
   */
  private async extractJavaScriptSymbols(fileId: string, content: string): Promise<void> {
    const ast = parser.parse(content, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript']
    });
    
    const symbols: any[] = [];
    
    traverse(ast, {
      FunctionDeclaration(path) {
        const node = path.node;
        if (node.id) {
          symbols.push({
            fileId,
            name: node.id.name,
            type: 'FUNCTION',
            line: node.loc?.start.line || 0,
            column: node.loc?.start.column || 0,
            endLine: node.loc?.end.line,
            endColumn: node.loc?.end.column
          });
        }
      },
      ClassDeclaration(path) {
        const node = path.node;
        if (node.id) {
          symbols.push({
            fileId,
            name: node.id.name,
            type: 'CLASS',
            line: node.loc?.start.line || 0,
            column: node.loc?.start.column || 0,
            endLine: node.loc?.end.line,
            endColumn: node.loc?.end.column
          });
        }
      },
      VariableDeclarator(path) {
        const node = path.node;
        if (t.isIdentifier(node.id) && t.isArrowFunctionExpression(node.init)) {
          const name = node.id.name;
          if (name[0] === name[0].toUpperCase()) {
            symbols.push({
              fileId,
              name,
              type: 'COMPONENT',
              line: node.loc?.start.line || 0,
              column: node.loc?.start.column || 0,
              endLine: node.loc?.end.line,
              endColumn: node.loc?.end.column
            });
          }
        }
      }
    });
    
    // Save symbols to database
    if (symbols.length > 0) {
      await this.prisma.symbol.createMany({
        data: symbols,
        skipDuplicates: true
      });
    }
  }
  
  /**
   * Detect file dependencies
   */
  private async detectDependencies(fileId: string, filePath: string, content: string, language: string | null): Promise<void> {
    const imports = this.extractImports(content, language);
    const dependencies: any[] = [];
    
    for (const imp of imports) {
      const resolvedPath = await this.resolveImportPath(filePath, imp.path);
      
      if (resolvedPath) {
        // Find target file in database
        const targetFile = await this.prisma.codeFile.findUnique({
          where: { path: resolvedPath }
        });
        
        if (targetFile) {
          dependencies.push({
            sourceId: fileId,
            targetId: targetFile.id,
            type: imp.type,
            importPath: imp.path,
            isExternal: false
          });
        }
      } else {
        // External dependency
        dependencies.push({
          sourceId: fileId,
          targetId: fileId, // Self-reference for external deps
          type: imp.type,
          importPath: imp.path,
          isExternal: true
        });
      }
    }
    
    // Save dependencies
    if (dependencies.length > 0) {
      for (const dep of dependencies) {
        await this.prisma.dependency.upsert({
          where: {
            sourceId_targetId_importPath: {
              sourceId: dep.sourceId,
              targetId: dep.targetId,
              importPath: dep.importPath
            }
          },
          create: dep,
          update: dep
        });
      }
    }
  }
  
  /**
   * Extract imports from file content
   */
  private extractImports(content: string, language: string | null): Array<{ path: string; type: string }> {
    const imports: Array<{ path: string; type: string }> = [];
    
    // ES6 imports
    const importRegex = /import\s+(?:.*?\s+from\s+)?['"]([^'"]+)['"]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      imports.push({ path: match[1], type: 'IMPORT' });
    }
    
    // CommonJS requires
    const requireRegex = /require\s*\(['"]([^'"]+)['"]\)/g;
    while ((match = requireRegex.exec(content)) !== null) {
      imports.push({ path: match[1], type: 'REQUIRE' });
    }
    
    // Dynamic imports
    const dynamicImportRegex = /import\s*\(['"]([^'"]+)['"]\)/g;
    while ((match = dynamicImportRegex.exec(content)) !== null) {
      imports.push({ path: match[1], type: 'DYNAMIC_IMPORT' });
    }
    
    return imports;
  }
  
  /**
   * Resolve import path to actual file
   */
  private async resolveImportPath(fromFile: string, importPath: string): Promise<string | null> {
    // Skip external modules
    if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
      return null;
    }
    
    const dir = path.dirname(fromFile);
    let resolvedPath = path.resolve(dir, importPath);
    
    // Try different extensions
    const extensions = ['.ts', '.tsx', '.js', '.jsx', '.json'];
    
    // Check if path exists as-is
    try {
      await fs.access(resolvedPath);
      return resolvedPath;
    } catch {}
    
    // Try with extensions
    for (const ext of extensions) {
      try {
        const pathWithExt = resolvedPath + ext;
        await fs.access(pathWithExt);
        return pathWithExt;
      } catch {}
    }
    
    // Try index file
    for (const ext of extensions) {
      try {
        const indexPath = path.join(resolvedPath, `index${ext}`);
        await fs.access(indexPath);
        return indexPath;
      } catch {}
    }
    
    return null;
  }
  
  /**
   * Discover files to index
   */
  private async discoverFiles(options: IndexingOptions): Promise<string[]> {
    const patterns = options.patterns || ['**/*'];
    const excludePatterns = options.excludePatterns || config.indexing.excludePatterns;
    const includeExtensions = options.includeExtensions || config.indexing.includeExtensions;
    
    const files: string[] = [];
    
    for (const pattern of patterns) {
      const matches = await glob(pattern, {
        cwd: config.projectRoot,
        absolute: true,
        ignore: excludePatterns,
        nodir: true
      });
      
      files.push(...matches.filter(file => {
        const ext = path.extname(file);
        return includeExtensions.includes(ext);
      }));
    }
    
    return [...new Set(files)]; // Remove duplicates
  }
  
  /**
   * Detect language from file extension
   */
  private detectLanguage(extension: string): string | null {
    const languageMap: Record<string, string> = {
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.py': 'python',
      '.java': 'java',
      '.go': 'go',
      '.rs': 'rust',
      '.c': 'c',
      '.cpp': 'cpp',
      '.cs': 'csharp',
      '.rb': 'ruby',
      '.php': 'php',
      '.swift': 'swift',
      '.kt': 'kotlin',
      '.sql': 'sql',
      '.json': 'json',
      '.yaml': 'yaml',
      '.yml': 'yaml',
      '.md': 'markdown'
    };
    
    return languageMap[extension] || null;
  }
  
  /**
   * Update indexing progress
   */
  private updateProgress(): void {
    const total = this.indexingStatus.totalFiles;
    const completed = this.indexingStatus.indexedFiles + this.indexingStatus.failedFiles;
    
    this.indexingStatus.progress = total > 0 ? (completed / total) * 100 : 0;
    
    if (completed === total) {
      this.indexingStatus.isRunning = false;
      const endTime = new Date();
      const duration = this.indexingStatus.startTime 
        ? endTime.getTime() - this.indexingStatus.startTime.getTime()
        : 0;
      
      logger.info(`Indexing completed: ${completed} files in ${duration}ms`);
      this.emit('indexing:completed', {
        totalFiles: total,
        indexedFiles: this.indexingStatus.indexedFiles,
        failedFiles: this.indexingStatus.failedFiles,
        duration
      });
    }
  }
  
  /**
   * Get indexing status
   */
  getIndexingStatus(): IndexingStatus {
    return { ...this.indexingStatus };
  }
  
  /**
   * Search files by pattern
   */
  async searchFiles(pattern: string, options?: { language?: string; limit?: number }) {
    const whereClause: any = {
      OR: [
        { name: { contains: pattern, mode: 'insensitive' } },
        { relativePath: { contains: pattern, mode: 'insensitive' } }
      ]
    };
    
    if (options?.language) {
      whereClause.language = options.language;
    }
    
    return this.prisma.codeFile.findMany({
      where: whereClause,
      take: options?.limit || 100,
      orderBy: { lastModified: 'desc' }
    });
  }
  
  /**
   * Get file metrics
   */
  async getMetrics() {
    const [totalFiles, totalSymbols, totalDependencies, languages] = await Promise.all([
      this.prisma.codeFile.count(),
      this.prisma.symbol.count(),
      this.prisma.dependency.count(),
      this.prisma.codeFile.groupBy({
        by: ['language'],
        _count: true
      })
    ]);
    
    const totalLines = await this.prisma.codeFile.aggregate({
      _sum: { lines: true }
    });
    
    return {
      totalFiles,
      totalLines: totalLines._sum.lines || 0,
      totalSymbols,
      totalDependencies,
      languages: languages.map(l => ({
        language: l.language,
        count: l._count
      }))
    };
  }
}