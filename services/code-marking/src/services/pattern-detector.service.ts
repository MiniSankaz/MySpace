/**
 * Pattern Detector Service
 * Detects code patterns, anti-patterns, and opportunities for improvement
 */

import { PrismaClient, PatternType } from '@prisma/client';
import { EventEmitter } from 'events';
import { logger } from '../utils/logger';

export interface PatternDefinition {
  name: string;
  description: string;
  type: PatternType;
  pattern: RegExp | ((code: string) => boolean);
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  autoFix?: (code: string, match: any) => string;
}

export class PatternDetectorService extends EventEmitter {
  private prisma: PrismaClient;
  private patterns: Map<string, PatternDefinition> = new Map();
  
  constructor(prisma: PrismaClient) {
    super();
    this.prisma = prisma;
    this.initializePatterns();
  }
  
  /**
   * Initialize built-in patterns
   */
  private initializePatterns(): void {
    // Anti-patterns
    this.addPattern({
      name: 'console-log',
      description: 'Console.log statements in production code',
      type: PatternType.ANTIPATTERN,
      pattern: /console\.(log|debug|info|warn|error)\(/g,
      category: 'debugging',
      severity: 'medium',
      autoFix: (code, match) => code.replace(match[0], '// ' + match[0])
    });
    
    this.addPattern({
      name: 'any-type',
      description: 'Use of any type in TypeScript',
      type: PatternType.ANTIPATTERN,
      pattern: /:\s*any\b/g,
      category: 'type-safety',
      severity: 'high'
    });
    
    this.addPattern({
      name: 'magic-numbers',
      description: 'Magic numbers without constants',
      type: PatternType.CODE_SMELL,
      pattern: /(?<![0-9])[2-9]\d{2,}(?![0-9])/g,
      category: 'maintainability',
      severity: 'low'
    });
    
    // Security patterns
    this.addPattern({
      name: 'sql-injection',
      description: 'Potential SQL injection vulnerability',
      type: PatternType.SECURITY_PATTERN,
      pattern: /query\s*\(\s*['"`].*\$\{.*\}.*['"`]\s*\)/g,
      category: 'security',
      severity: 'critical'
    });
    
    this.addPattern({
      name: 'eval-usage',
      description: 'Use of eval() function',
      type: PatternType.SECURITY_PATTERN,
      pattern: /\beval\s*\(/g,
      category: 'security',
      severity: 'critical'
    });
    
    // Performance patterns
    this.addPattern({
      name: 'array-index-in-loop',
      description: 'Array.indexOf inside loop',
      type: PatternType.PERFORMANCE_PATTERN,
      pattern: /for\s*\([^)]*\)[\s\S]*?\.indexOf\(/g,
      category: 'performance',
      severity: 'medium'
    });
    
    this.addPattern({
      name: 'nested-loops',
      description: 'Deeply nested loops (3+ levels)',
      type: PatternType.PERFORMANCE_PATTERN,
      pattern: (code: string) => {
        const loopPattern = /for\s*\(|while\s*\(|\.forEach\(|\.map\(|\.filter\(/g;
        let depth = 0;
        let maxDepth = 0;
        let inLoop = false;
        
        const lines = code.split('\n');
        for (const line of lines) {
          if (loopPattern.test(line)) {
            depth++;
            inLoop = true;
            maxDepth = Math.max(maxDepth, depth);
          }
          if (inLoop && line.includes('}')) {
            depth = Math.max(0, depth - 1);
          }
        }
        
        return maxDepth >= 3;
      },
      category: 'performance',
      severity: 'high'
    });
    
    // Best practices
    this.addPattern({
      name: 'missing-error-handling',
      description: 'Async function without try-catch',
      type: PatternType.BEST_PRACTICE,
      pattern: /async\s+function[^{]*\{(?![^}]*try\s*\{)/g,
      category: 'error-handling',
      severity: 'medium'
    });
    
    this.addPattern({
      name: 'large-function',
      description: 'Function exceeds 50 lines',
      type: PatternType.CODE_SMELL,
      pattern: (code: string) => {
        const functionPattern = /(?:function|const|let|var)\s+\w+\s*=?\s*(?:async\s*)?\([^)]*\)\s*(?:=>)?\s*\{/g;
        let match;
        
        while ((match = functionPattern.exec(code)) !== null) {
          const startIndex = match.index;
          let braceCount = 1;
          let endIndex = startIndex + match[0].length;
          
          while (braceCount > 0 && endIndex < code.length) {
            if (code[endIndex] === '{') braceCount++;
            if (code[endIndex] === '}') braceCount--;
            endIndex++;
          }
          
          const functionCode = code.substring(startIndex, endIndex);
          const lines = functionCode.split('\n').length;
          
          if (lines > 50) return true;
        }
        
        return false;
      },
      category: 'complexity',
      severity: 'medium'
    });
    
    logger.info(`Initialized ${this.patterns.size} pattern definitions`);
  }
  
  /**
   * Add a pattern definition
   */
  addPattern(pattern: PatternDefinition): void {
    this.patterns.set(pattern.name, pattern);
  }
  
  /**
   * Detect patterns in code
   */
  async detectPatterns(fileId: string, code: string, language?: string): Promise<any[]> {
    const detectedPatterns: any[] = [];
    
    for (const [name, pattern] of this.patterns.entries()) {
      try {
        const matches = this.findPatternMatches(code, pattern);
        
        for (const match of matches) {
          detectedPatterns.push({
            fileId,
            patternName: name,
            type: pattern.type,
            category: pattern.category,
            severity: pattern.severity,
            line: match.line,
            column: match.column,
            endLine: match.endLine,
            endColumn: match.endColumn,
            matchedText: match.text,
            description: pattern.description,
            autoFixAvailable: !!pattern.autoFix
          });
        }
      } catch (error) {
        logger.error(`Error detecting pattern ${name}:`, error);
      }
    }
    
    // Store detected patterns in database
    if (detectedPatterns.length > 0) {
      await this.storePatternMatches(detectedPatterns);
    }
    
    return detectedPatterns;
  }
  
  /**
   * Find pattern matches in code
   */
  private findPatternMatches(code: string, pattern: PatternDefinition): any[] {
    const matches: any[] = [];
    
    if (pattern.pattern instanceof RegExp) {
      const regex = new RegExp(pattern.pattern.source, pattern.pattern.flags);
      let match;
      
      while ((match = regex.exec(code)) !== null) {
        const position = this.getLineColumn(code, match.index);
        const endPosition = this.getLineColumn(code, match.index + match[0].length);
        
        matches.push({
          line: position.line,
          column: position.column,
          endLine: endPosition.line,
          endColumn: endPosition.column,
          text: match[0]
        });
      }
    } else if (typeof pattern.pattern === 'function') {
      if (pattern.pattern(code)) {
        matches.push({
          line: 1,
          column: 1,
          endLine: code.split('\n').length,
          endColumn: 1,
          text: 'Full file matches pattern'
        });
      }
    }
    
    return matches;
  }
  
  /**
   * Get line and column from index
   */
  private getLineColumn(code: string, index: number): { line: number; column: number } {
    const lines = code.substring(0, index).split('\n');
    return {
      line: lines.length,
      column: lines[lines.length - 1].length + 1
    };
  }
  
  /**
   * Store pattern matches in database
   */
  private async storePatternMatches(matches: any[]): Promise<void> {
    for (const match of matches) {
      // Ensure pattern exists in database
      const pattern = await this.prisma.pattern.upsert({
        where: { name: match.patternName },
        create: {
          name: match.patternName,
          description: match.description,
          type: match.type,
          pattern: '',
          category: match.category,
          enabled: true
        },
        update: {}
      });
      
      // Create pattern match
      await this.prisma.patternMatch.create({
        data: {
          fileId: match.fileId,
          patternId: pattern.id,
          line: match.line,
          column: match.column,
          endLine: match.endLine,
          endColumn: match.endColumn,
          matchedText: match.matchedText,
          confidence: 1.0
        }
      });
    }
  }
  
  /**
   * Apply auto-fix for a pattern
   */
  applyAutoFix(code: string, patternName: string): string | null {
    const pattern = this.patterns.get(patternName);
    
    if (!pattern || !pattern.autoFix) {
      return null;
    }
    
    if (pattern.pattern instanceof RegExp) {
      return code.replace(pattern.pattern, (match) => {
        return pattern.autoFix!(code, match) || match;
      });
    }
    
    return null;
  }
  
  /**
   * Get pattern statistics
   */
  async getPatternStats(fileId?: string) {
    const whereClause = fileId ? { fileId } : {};
    
    const stats = await this.prisma.patternMatch.groupBy({
      by: ['patternId'],
      where: whereClause,
      _count: true
    });
    
    const patterns = await this.prisma.pattern.findMany({
      where: {
        id: { in: stats.map(s => s.patternId) }
      }
    });
    
    return stats.map(stat => {
      const pattern = patterns.find(p => p.id === stat.patternId);
      return {
        pattern: pattern?.name,
        type: pattern?.type,
        category: pattern?.category,
        count: stat._count
      };
    });
  }
}