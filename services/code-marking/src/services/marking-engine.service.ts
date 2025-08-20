/**
 * Marking Engine Service
 * Core engine for code analysis and marking
 */

import { PrismaClient, MarkingType, MarkingSeverity } from '@prisma/client';
import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import { logger } from '../utils/logger';
import { config } from '../config';
import { PatternDetectorService } from './pattern-detector.service';

export interface MarkingOptions {
  detectDuplicates?: boolean;
  analyzeComplexity?: boolean;
  checkPatterns?: boolean;
  checkSecurity?: boolean;
  checkPerformance?: boolean;
  checkNaming?: boolean;
  checkUnused?: boolean;
}

export interface DuplicateBlock {
  hash: string;
  files: Array<{
    fileId: string;
    path: string;
    startLine: number;
    endLine: number;
  }>;
  lines: number;
  content: string;
}

export class MarkingEngineService extends EventEmitter {
  private prisma: PrismaClient;
  private patternDetector: PatternDetectorService;
  private duplicateBlocks: Map<string, DuplicateBlock> = new Map();
  
  constructor(prisma: PrismaClient, patternDetector: PatternDetectorService) {
    super();
    this.prisma = prisma;
    this.patternDetector = patternDetector;
  }
  
  /**
   * Analyze a file and create markings
   */
  async analyzeFile(fileId: string, options: MarkingOptions = {}): Promise<void> {
    logger.info(`Analyzing file ${fileId} for markings`);
    
    const file = await this.prisma.codeFile.findUnique({
      where: { id: fileId },
      include: { symbols: true }
    });
    
    if (!file) {
      throw new Error(`File ${fileId} not found`);
    }
    
    const content = file.content || '';
    const markings: any[] = [];
    
    // Analyze complexity
    if (options.analyzeComplexity !== false) {
      const complexityMarkings = await this.analyzeComplexity(file, content);
      markings.push(...complexityMarkings);
    }
    
    // Check patterns
    if (options.checkPatterns !== false) {
      const patterns = await this.patternDetector.detectPatterns(fileId, content, file.language || undefined);
      
      for (const pattern of patterns) {
        markings.push({
          fileId,
          type: this.mapPatternToMarkingType(pattern.type),
          severity: this.mapSeverityToMarkingSeverity(pattern.severity),
          category: pattern.category,
          message: pattern.description,
          suggestion: pattern.autoFixAvailable ? 'Auto-fix available' : undefined,
          line: pattern.line,
          column: pattern.column,
          endLine: pattern.endLine,
          endColumn: pattern.endColumn,
          context: { pattern: pattern.patternName },
          autoFixable: pattern.autoFixAvailable
        });
      }
    }
    
    // Detect duplicates
    if (options.detectDuplicates) {
      const duplicateMarkings = await this.detectDuplicates(file, content);
      markings.push(...duplicateMarkings);
    }
    
    // Check for unused code
    if (options.checkUnused) {
      const unusedMarkings = await this.detectUnusedCode(file);
      markings.push(...unusedMarkings);
    }
    
    // Check naming conventions
    if (options.checkNaming) {
      const namingMarkings = await this.checkNamingConventions(file);
      markings.push(...namingMarkings);
    }
    
    // Save markings to database
    if (markings.length > 0) {
      await this.saveMarkings(markings);
      logger.info(`Created ${markings.length} markings for file ${fileId}`);
    }
  }
  
  /**
   * Analyze code complexity
   */
  private async analyzeComplexity(file: any, content: string): Promise<any[]> {
    const markings: any[] = [];
    
    // Cyclomatic complexity for functions
    if (file.symbols) {
      for (const symbol of file.symbols) {
        if (symbol.type === 'FUNCTION' || symbol.type === 'METHOD') {
          const complexity = this.calculateCyclomaticComplexity(content, symbol);
          
          if (complexity > config.marking.complexityThreshold) {
            markings.push({
              fileId: file.id,
              symbolId: symbol.id,
              type: MarkingType.COMPLEXITY_HIGH,
              severity: complexity > 20 ? MarkingSeverity.HIGH : MarkingSeverity.MEDIUM,
              category: 'complexity',
              message: `Function ${symbol.name} has high cyclomatic complexity: ${complexity}`,
              suggestion: 'Consider breaking this function into smaller, more focused functions',
              line: symbol.line,
              column: symbol.column,
              endLine: symbol.endLine,
              endColumn: symbol.endColumn,
              context: { complexity },
              autoFixable: false
            });
          }
        }
      }
    }
    
    // File-level complexity
    const fileComplexity = this.calculateFileComplexity(content);
    if (fileComplexity.score > 100) {
      markings.push({
        fileId: file.id,
        type: MarkingType.COMPLEXITY_HIGH,
        severity: MarkingSeverity.MEDIUM,
        category: 'complexity',
        message: `File has high overall complexity score: ${fileComplexity.score}`,
        suggestion: 'Consider splitting this file into smaller modules',
        line: 1,
        column: 1,
        context: fileComplexity,
        autoFixable: false
      });
    }
    
    return markings;
  }
  
  /**
   * Calculate cyclomatic complexity
   */
  private calculateCyclomaticComplexity(content: string, symbol: any): number {
    const functionContent = this.extractFunctionContent(content, symbol);
    
    // Count decision points
    let complexity = 1; // Base complexity
    
    // Decision keywords
    const decisionPatterns = [
      /\bif\b/g,
      /\belse\s+if\b/g,
      /\bfor\b/g,
      /\bwhile\b/g,
      /\bdo\b/g,
      /\bswitch\b/g,
      /\bcase\b/g,
      /\bcatch\b/g,
      /\?\s*[^:]+:/g, // Ternary operator
      /\&\&/g, // Logical AND
      /\|\|/g  // Logical OR
    ];
    
    for (const pattern of decisionPatterns) {
      const matches = functionContent.match(pattern);
      if (matches) {
        complexity += matches.length;
      }
    }
    
    return complexity;
  }
  
  /**
   * Extract function content from file
   */
  private extractFunctionContent(content: string, symbol: any): string {
    const lines = content.split('\n');
    const startLine = Math.max(0, symbol.line - 1);
    const endLine = Math.min(lines.length, symbol.endLine || symbol.line);
    
    return lines.slice(startLine, endLine).join('\n');
  }
  
  /**
   * Calculate file-level complexity
   */
  private calculateFileComplexity(content: string): any {
    const lines = content.split('\n');
    const nonEmptyLines = lines.filter(line => line.trim().length > 0);
    const codeLines = nonEmptyLines.filter(line => !line.trim().startsWith('//') && !line.trim().startsWith('*'));
    
    const metrics = {
      totalLines: lines.length,
      codeLines: codeLines.length,
      commentLines: nonEmptyLines.length - codeLines.length,
      blankLines: lines.length - nonEmptyLines.length,
      nestingDepth: this.calculateMaxNestingDepth(content),
      imports: (content.match(/import\s+/g) || []).length,
      exports: (content.match(/export\s+/g) || []).length,
      functions: (content.match(/function\s+\w+|const\s+\w+\s*=\s*(?:async\s*)?\(/g) || []).length,
      classes: (content.match(/class\s+\w+/g) || []).length
    };
    
    // Calculate complexity score
    const score = 
      metrics.codeLines * 0.1 +
      metrics.nestingDepth * 10 +
      metrics.functions * 2 +
      metrics.classes * 5 +
      metrics.imports * 0.5;
    
    return {
      ...metrics,
      score: Math.round(score)
    };
  }
  
  /**
   * Calculate maximum nesting depth
   */
  private calculateMaxNestingDepth(content: string): number {
    let maxDepth = 0;
    let currentDepth = 0;
    
    for (const char of content) {
      if (char === '{') {
        currentDepth++;
        maxDepth = Math.max(maxDepth, currentDepth);
      } else if (char === '}') {
        currentDepth = Math.max(0, currentDepth - 1);
      }
    }
    
    return maxDepth;
  }
  
  /**
   * Detect duplicate code blocks
   */
  private async detectDuplicates(file: any, content: string): Promise<any[]> {
    const markings: any[] = [];
    const lines = content.split('\n');
    const minLines = config.marking.minDuplicateLines;
    
    // Generate hashes for code blocks
    for (let i = 0; i < lines.length - minLines; i++) {
      const block = lines.slice(i, i + minLines).join('\n');
      const hash = crypto.createHash('md5').update(block).digest('hex');
      
      if (!this.duplicateBlocks.has(hash)) {
        this.duplicateBlocks.set(hash, {
          hash,
          files: [],
          lines: minLines,
          content: block
        });
      }
      
      this.duplicateBlocks.get(hash)!.files.push({
        fileId: file.id,
        path: file.path,
        startLine: i + 1,
        endLine: i + minLines
      });
    }
    
    // Find duplicates
    for (const [hash, block] of this.duplicateBlocks.entries()) {
      if (block.files.length > 1) {
        const filesWithDuplicate = block.files.filter(f => f.fileId === file.id);
        
        for (const dup of filesWithDuplicate) {
          markings.push({
            fileId: file.id,
            type: MarkingType.DUPLICATE_CODE,
            severity: MarkingSeverity.MEDIUM,
            category: 'duplication',
            message: `Duplicate code block found (${block.lines} lines)`,
            suggestion: 'Consider extracting this code into a reusable function',
            line: dup.startLine,
            column: 1,
            endLine: dup.endLine,
            endColumn: 1,
            context: {
              hash,
              occurrences: block.files.length,
              locations: block.files.map(f => `${f.path}:${f.startLine}`)
            },
            autoFixable: false
          });
        }
      }
    }
    
    return markings;
  }
  
  /**
   * Detect unused code
   */
  private async detectUnusedCode(file: any): Promise<any[]> {
    const markings: any[] = [];
    
    if (!file.symbols) {
      return markings;
    }
    
    // Check for unused symbols
    for (const symbol of file.symbols) {
      const references = await this.prisma.reference.count({
        where: { referencedId: symbol.id }
      });
      
      if (references === 0 && symbol.visibility !== 'public') {
        markings.push({
          fileId: file.id,
          symbolId: symbol.id,
          type: MarkingType.UNUSED_CODE,
          severity: MarkingSeverity.LOW,
          category: 'unused',
          message: `${symbol.type} '${symbol.name}' is never used`,
          suggestion: 'Remove this unused code or export it if needed elsewhere',
          line: symbol.line,
          column: symbol.column,
          endLine: symbol.endLine,
          endColumn: symbol.endColumn,
          autoFixable: true
        });
      }
    }
    
    return markings;
  }
  
  /**
   * Check naming conventions
   */
  private async checkNamingConventions(file: any): Promise<any[]> {
    const markings: any[] = [];
    
    if (!file.symbols) {
      return markings;
    }
    
    for (const symbol of file.symbols) {
      let issue: string | null = null;
      
      switch (symbol.type) {
        case 'CLASS':
        case 'COMPONENT':
          if (!/^[A-Z][a-zA-Z0-9]*$/.test(symbol.name)) {
            issue = 'Class/Component names should be PascalCase';
          }
          break;
          
        case 'FUNCTION':
        case 'METHOD':
          if (!/^[a-z][a-zA-Z0-9]*$/.test(symbol.name)) {
            issue = 'Function/Method names should be camelCase';
          }
          break;
          
        case 'CONSTANT':
          if (!/^[A-Z_][A-Z0-9_]*$/.test(symbol.name)) {
            issue = 'Constants should be UPPER_SNAKE_CASE';
          }
          break;
      }
      
      if (issue) {
        markings.push({
          fileId: file.id,
          symbolId: symbol.id,
          type: MarkingType.NAMING_CONVENTION,
          severity: MarkingSeverity.LOW,
          category: 'naming',
          message: `${symbol.type} '${symbol.name}': ${issue}`,
          line: symbol.line,
          column: symbol.column,
          autoFixable: true
        });
      }
    }
    
    return markings;
  }
  
  /**
   * Save markings to database
   */
  private async saveMarkings(markings: any[]): Promise<void> {
    for (const marking of markings) {
      const created = await this.prisma.codeMarking.create({
        data: marking
      });
      
      this.emit('marking:added', created);
    }
  }
  
  /**
   * Map pattern type to marking type
   */
  private mapPatternToMarkingType(patternType: string): MarkingType {
    const mapping: Record<string, MarkingType> = {
      ANTIPATTERN: MarkingType.PATTERN_VIOLATION,
      CODE_SMELL: MarkingType.REFACTOR_CANDIDATE,
      SECURITY_PATTERN: MarkingType.SECURITY_ISSUE,
      PERFORMANCE_PATTERN: MarkingType.PERFORMANCE_ISSUE,
      BEST_PRACTICE: MarkingType.PATTERN_VIOLATION
    };
    
    return mapping[patternType] || MarkingType.PATTERN_VIOLATION;
  }
  
  /**
   * Map severity string to enum
   */
  private mapSeverityToMarkingSeverity(severity: string): MarkingSeverity {
    const mapping: Record<string, MarkingSeverity> = {
      critical: MarkingSeverity.CRITICAL,
      high: MarkingSeverity.HIGH,
      medium: MarkingSeverity.MEDIUM,
      low: MarkingSeverity.LOW,
      info: MarkingSeverity.INFO
    };
    
    return mapping[severity] || MarkingSeverity.MEDIUM;
  }
  
  /**
   * Get markings for a file
   */
  async getFileMarkings(fileId: string, options?: { 
    severity?: MarkingSeverity;
    type?: MarkingType;
    fixed?: boolean;
  }) {
    const whereClause: any = { fileId };
    
    if (options?.severity) {
      whereClause.severity = options.severity;
    }
    
    if (options?.type) {
      whereClause.type = options.type;
    }
    
    if (options?.fixed !== undefined) {
      whereClause.fixed = options.fixed;
    }
    
    return this.prisma.codeMarking.findMany({
      where: whereClause,
      include: {
        symbol: true
      },
      orderBy: [
        { severity: 'asc' },
        { line: 'asc' }
      ]
    });
  }
  
  /**
   * Get marking statistics
   */
  async getMarkingStats(fileId?: string) {
    const whereClause = fileId ? { fileId } : {};
    
    const [byType, bySeverity, byCategory] = await Promise.all([
      this.prisma.codeMarking.groupBy({
        by: ['type'],
        where: whereClause,
        _count: true
      }),
      this.prisma.codeMarking.groupBy({
        by: ['severity'],
        where: whereClause,
        _count: true
      }),
      this.prisma.codeMarking.groupBy({
        by: ['category'],
        where: whereClause,
        _count: true
      })
    ]);
    
    return {
      byType: byType.map(t => ({ type: t.type, count: t._count })),
      bySeverity: bySeverity.map(s => ({ severity: s.severity, count: s._count })),
      byCategory: byCategory.map(c => ({ category: c.category, count: c._count }))
    };
  }
}