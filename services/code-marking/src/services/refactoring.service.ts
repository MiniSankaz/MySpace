/**
 * Refactoring Service
 * Manages code refactoring operations using AI agents
 */

import { PrismaClient, RefactoringType, RefactoringStatus } from '@prisma/client';
import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';
import { logger } from '../utils/logger';
import { config } from '../config';
import { AgentCoordinatorService, AgentType } from './agent-coordinator.service';
import { v4 as uuidv4 } from 'uuid';

export interface RefactoringPlan {
  fileId: string;
  type: RefactoringType;
  description: string;
  markings: string[];
  estimatedComplexity: 'low' | 'medium' | 'high';
  estimatedRisk: 'low' | 'medium' | 'high';
  steps: RefactoringStep[];
}

export interface RefactoringStep {
  order: number;
  description: string;
  operation: string;
  target: string;
  params?: any;
}

export class RefactoringService extends EventEmitter {
  private prisma: PrismaClient;
  private agentCoordinator: AgentCoordinatorService;
  
  constructor(prisma: PrismaClient, agentCoordinator: AgentCoordinatorService) {
    super();
    this.prisma = prisma;
    this.agentCoordinator = agentCoordinator;
  }
  
  /**
   * Create refactoring plan based on markings
   */
  async createRefactoringPlan(fileId: string, markingIds: string[]): Promise<RefactoringPlan> {
    logger.info(`Creating refactoring plan for file ${fileId} with ${markingIds.length} markings`);
    
    const [file, markings] = await Promise.all([
      this.prisma.codeFile.findUnique({
        where: { id: fileId },
        include: { symbols: true }
      }),
      this.prisma.codeMarking.findMany({
        where: { id: { in: markingIds } },
        include: { symbol: true }
      })
    ]);
    
    if (!file) {
      throw new Error(`File ${fileId} not found`);
    }
    
    // Use AI agent to create refactoring plan
    const planTask = {
      id: uuidv4(),
      type: AgentType.TECHNICAL_ARCHITECT,
      prompt: `Create a detailed refactoring plan for the following code issues:
               
               File: ${file.path}
               Language: ${file.language}
               
               Issues to address:
               ${markings.map(m => `- ${m.type}: ${m.message} (Line ${m.line})`).join('\n')}
               
               Provide a structured plan with:
               1. Refactoring type classification
               2. Step-by-step implementation guide
               3. Risk assessment
               4. Expected improvements`,
      context: {
        fileId,
        markings: markings.map(m => ({
          type: m.type,
          severity: m.severity,
          message: m.message,
          line: m.line
        }))
      }
    };
    
    const result = await this.agentCoordinator.spawnAgent(planTask);
    
    if (result.status !== 'success') {
      throw new Error(`Failed to create refactoring plan: ${result.error}`);
    }
    
    // Parse AI response into structured plan
    const plan = this.parseRefactoringPlan(result.result, fileId, markingIds);
    
    // Save plan to database
    const refactoring = await this.prisma.refactoring.create({
      data: {
        fileId,
        type: plan.type,
        status: RefactoringStatus.PLANNED,
        description: plan.description
      }
    });
    
    // Link markings to refactoring
    await Promise.all(
      markingIds.map(markingId =>
        this.prisma.refactoringMark.create({
          data: {
            refactoringId: refactoring.id,
            markingId
          }
        })
      )
    );
    
    this.emit('refactoring:planned', { refactoringId: refactoring.id, plan });
    
    return plan;
  }
  
  /**
   * Execute refactoring operation
   */
  async executeRefactoring(refactoringId: string, autoApprove: boolean = false): Promise<void> {
    logger.info(`Executing refactoring ${refactoringId}`);
    
    const refactoring = await this.prisma.refactoring.findUnique({
      where: { id: refactoringId },
      include: {
        file: true,
        markings: {
          include: { marking: true }
        }
      }
    });
    
    if (!refactoring) {
      throw new Error(`Refactoring ${refactoringId} not found`);
    }
    
    // Update status
    await this.prisma.refactoring.update({
      where: { id: refactoringId },
      data: {
        status: RefactoringStatus.IN_PROGRESS,
        startedAt: new Date()
      }
    });
    
    try {
      // Read current file content
      const content = await fs.readFile(refactoring.file.path, 'utf-8');
      
      // Create backup if configured
      if (config.refactoring.backupBeforeRefactor) {
        const backupPath = `${refactoring.file.path}.backup.${Date.now()}`;
        await fs.writeFile(backupPath, content);
        logger.info(`Created backup: ${backupPath}`);
      }
      
      // Use appropriate agent based on refactoring type
      const agentType = this.selectAgentForRefactoring(refactoring.type);
      
      const refactorTask = {
        id: uuidv4(),
        type: agentType,
        prompt: `Perform the following refactoring operation:
                 
                 Type: ${refactoring.type}
                 File: ${refactoring.file.path}
                 Description: ${refactoring.description}
                 
                 Current code:
                 \`\`\`${refactoring.file.language}
                 ${content}
                 \`\`\`
                 
                 Issues to fix:
                 ${refactoring.markings.map(rm => 
                   `- ${rm.marking.type}: ${rm.marking.message} (Line ${rm.marking.line})`
                 ).join('\n')}
                 
                 Provide the refactored code maintaining all functionality while addressing the issues.`,
        context: {
          refactoringId,
          fileId: refactoring.file.id,
          refactoringType: refactoring.type
        }
      };
      
      const result = await this.agentCoordinator.spawnAgent(refactorTask);
      
      if (result.status !== 'success') {
        throw new Error(`Refactoring failed: ${result.error}`);
      }
      
      // Extract refactored code from result
      const refactoredCode = this.extractRefactoredCode(result.result);
      
      // Generate diff
      const diff = this.generateDiff(content, refactoredCode);
      
      // Update refactoring record
      await this.prisma.refactoring.update({
        where: { id: refactoringId },
        data: {
          status: RefactoringStatus.REVIEW,
          diff
        }
      });
      
      // Apply changes if auto-approved
      if (autoApprove || config.refactoring.autoApprove) {
        await this.applyRefactoring(refactoringId);
      } else {
        logger.info(`Refactoring ${refactoringId} awaiting review`);
        this.emit('refactoring:review', { refactoringId, diff });
      }
      
    } catch (error) {
      await this.prisma.refactoring.update({
        where: { id: refactoringId },
        data: {
          status: RefactoringStatus.FAILED,
          error: error instanceof Error ? error.message : String(error)
        }
      });
      
      logger.error(`Refactoring ${refactoringId} failed:`, error);
      this.emit('refactoring:failed', { refactoringId, error });
      throw error;
    }
  }
  
  /**
   * Apply approved refactoring
   */
  async applyRefactoring(refactoringId: string): Promise<void> {
    const refactoring = await this.prisma.refactoring.findUnique({
      where: { id: refactoringId },
      include: { file: true }
    });
    
    if (!refactoring || !refactoring.diff) {
      throw new Error(`Refactoring ${refactoringId} not ready for application`);
    }
    
    // Parse and apply diff
    const patches = this.parseDiff(refactoring.diff);
    const content = await fs.readFile(refactoring.file.path, 'utf-8');
    const refactoredContent = this.applyPatches(content, patches);
    
    // Write refactored content
    await fs.writeFile(refactoring.file.path, refactoredContent);
    
    // Update refactoring status
    await this.prisma.refactoring.update({
      where: { id: refactoringId },
      data: {
        status: RefactoringStatus.COMPLETED,
        completedAt: new Date(),
        appliedDiff: refactoring.diff
      }
    });
    
    // Mark related markings as fixed
    const markings = await this.prisma.refactoringMark.findMany({
      where: { refactoringId }
    });
    
    await Promise.all(
      markings.map(rm =>
        this.prisma.codeMarking.update({
          where: { id: rm.markingId },
          data: { fixed: true }
        })
      )
    );
    
    logger.info(`Refactoring ${refactoringId} applied successfully`);
    this.emit('refactoring:completed', { refactoringId });
  }
  
  /**
   * Batch refactor multiple files
   */
  async batchRefactor(fileIds: string[], type: RefactoringType): Promise<void> {
    logger.info(`Starting batch refactoring for ${fileIds.length} files (type: ${type})`);
    
    const tasks = fileIds.map(fileId => ({
      id: uuidv4(),
      type: AgentType.CODE_REVIEWER,
      prompt: `Analyze file for ${type} refactoring opportunities`,
      context: { fileId, refactoringType: type }
    }));
    
    // Execute analysis in parallel
    const results = await this.agentCoordinator.executeParallelTasks(tasks);
    
    // Process results and create refactoring plans
    for (const [taskId, result] of results.entries()) {
      if (result.status === 'success') {
        const fileId = tasks.find(t => t.id === taskId)?.context?.fileId;
        if (fileId) {
          await this.processRefactoringRecommendations(fileId, result.result, type);
        }
      }
    }
    
    logger.info('Batch refactoring analysis completed');
  }
  
  /**
   * Process refactoring recommendations
   */
  private async processRefactoringRecommendations(
    fileId: string,
    recommendations: any,
    type: RefactoringType
  ): Promise<void> {
    // Create markings based on recommendations
    const markings = this.extractMarkingsFromRecommendations(recommendations);
    
    if (markings.length > 0) {
      // Save markings
      const createdMarkings = await Promise.all(
        markings.map(marking =>
          this.prisma.codeMarking.create({
            data: {
              ...marking,
              fileId
            }
          })
        )
      );
      
      // Create refactoring plan
      const markingIds = createdMarkings.map(m => m.id);
      await this.createRefactoringPlan(fileId, markingIds);
    }
  }
  
  /**
   * Select appropriate agent for refactoring type
   */
  private selectAgentForRefactoring(type: RefactoringType): AgentType {
    const agentMap: Partial<Record<RefactoringType, AgentType>> = {
      [RefactoringType.EXTRACT_FUNCTION]: AgentType.CODE_REVIEWER,
      [RefactoringType.OPTIMIZE]: AgentType.TECHNICAL_ARCHITECT,
      [RefactoringType.MODERNIZE]: AgentType.TECHNICAL_ARCHITECT,
      [RefactoringType.ADD_TYPES]: AgentType.CODE_REVIEWER,
      [RefactoringType.REMOVE_DEAD_CODE]: AgentType.CODE_REVIEWER,
      [RefactoringType.REORGANIZE_IMPORTS]: AgentType.CODE_REVIEWER
    };
    
    return agentMap[type] || AgentType.GENERAL_PURPOSE;
  }
  
  /**
   * Parse refactoring plan from AI response
   */
  private parseRefactoringPlan(
    aiResponse: any,
    fileId: string,
    markingIds: string[]
  ): RefactoringPlan {
    // Parse structured response from AI
    // This is a simplified version - actual implementation would be more sophisticated
    
    return {
      fileId,
      type: RefactoringType.REFACTOR_CANDIDATE,
      description: aiResponse.description || 'AI-generated refactoring plan',
      markings: markingIds,
      estimatedComplexity: aiResponse.complexity || 'medium',
      estimatedRisk: aiResponse.risk || 'low',
      steps: aiResponse.steps || []
    };
  }
  
  /**
   * Extract refactored code from AI response
   */
  private extractRefactoredCode(aiResponse: any): string {
    // Extract code from AI response
    // Look for code blocks in the response
    
    if (typeof aiResponse === 'string') {
      const codeMatch = aiResponse.match(/```[\w]*\n([\s\S]*?)```/);
      if (codeMatch) {
        return codeMatch[1];
      }
      return aiResponse;
    }
    
    return aiResponse.code || aiResponse.refactoredCode || '';
  }
  
  /**
   * Generate diff between original and refactored code
   */
  private generateDiff(original: string, refactored: string): string {
    // Simple diff generation - in production, use a proper diff library
    const originalLines = original.split('\n');
    const refactoredLines = refactored.split('\n');
    
    const diff: string[] = [];
    const maxLines = Math.max(originalLines.length, refactoredLines.length);
    
    for (let i = 0; i < maxLines; i++) {
      const origLine = originalLines[i] || '';
      const refLine = refactoredLines[i] || '';
      
      if (origLine !== refLine) {
        if (origLine) diff.push(`- ${origLine}`);
        if (refLine) diff.push(`+ ${refLine}`);
      } else {
        diff.push(`  ${origLine}`);
      }
    }
    
    return diff.join('\n');
  }
  
  /**
   * Parse diff string into patches
   */
  private parseDiff(diff: string): any[] {
    // Parse diff into applicable patches
    // Simplified implementation
    
    const lines = diff.split('\n');
    const patches: any[] = [];
    let currentPatch: any = null;
    
    for (const line of lines) {
      if (line.startsWith('-')) {
        if (!currentPatch) {
          currentPatch = { removes: [], adds: [] };
        }
        currentPatch.removes.push(line.substring(2));
      } else if (line.startsWith('+')) {
        if (!currentPatch) {
          currentPatch = { removes: [], adds: [] };
        }
        currentPatch.adds.push(line.substring(2));
      } else {
        if (currentPatch) {
          patches.push(currentPatch);
          currentPatch = null;
        }
      }
    }
    
    if (currentPatch) {
      patches.push(currentPatch);
    }
    
    return patches;
  }
  
  /**
   * Apply patches to content
   */
  private applyPatches(content: string, patches: any[]): string {
    // Apply patches to content
    // Simplified implementation - use a proper patching library in production
    
    let result = content;
    
    for (const patch of patches) {
      for (const remove of patch.removes) {
        result = result.replace(remove, '');
      }
      for (const add of patch.adds) {
        result += '\n' + add;
      }
    }
    
    return result;
  }
  
  /**
   * Extract markings from AI recommendations
   */
  private extractMarkingsFromRecommendations(recommendations: any): any[] {
    // Parse AI recommendations into marking objects
    // This would be more sophisticated in production
    
    if (!recommendations || !recommendations.issues) {
      return [];
    }
    
    return recommendations.issues.map((issue: any) => ({
      type: issue.type || 'REFACTOR_CANDIDATE',
      severity: issue.severity || 'MEDIUM',
      category: issue.category || 'refactoring',
      message: issue.message,
      suggestion: issue.suggestion,
      line: issue.line || 1,
      column: issue.column || 1
    }));
  }
  
  /**
   * Get refactoring statistics
   */
  async getRefactoringStats() {
    const [byType, byStatus, recent] = await Promise.all([
      this.prisma.refactoring.groupBy({
        by: ['type'],
        _count: true
      }),
      this.prisma.refactoring.groupBy({
        by: ['status'],
        _count: true
      }),
      this.prisma.refactoring.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { file: true }
      })
    ]);
    
    return {
      byType: byType.map(t => ({ type: t.type, count: t._count })),
      byStatus: byStatus.map(s => ({ status: s.status, count: s._count })),
      recent: recent.map(r => ({
        id: r.id,
        file: r.file.path,
        type: r.type,
        status: r.status,
        createdAt: r.createdAt
      }))
    };
  }
}