#!/usr/bin/env tsx
/**
 * Performance Testing Script for Terminal Storage System
 * ทดสอบประสิทธิภาพและความเสถียรภายใต้ load สูง
 */

import { performance } from 'perf_hooks';
import { StorageFactory } from '../src/services/storage/StorageFactory';
import { ITerminalStorageService } from '../src/services/storage/interfaces/ITerminalStorageService';
import chalk from 'chalk';
import ora from 'ora';
import { program } from 'commander';

interface TestConfig {
  mode: 'LOCAL' | 'DATABASE' | 'HYBRID';
  sessions: number;
  projects: number;
  operations: number;
  concurrent: boolean;
  verbose: boolean;
}

interface TestResults {
  mode: string;
  totalSessions: number;
  totalProjects: number;
  metrics: {
    createTime: number[];
    readTime: number[];
    updateTime: number[];
    deleteTime: number[];
    switchTime: number[];
  };
  memory: {
    initial: number;
    peak: number;
    final: number;
    leaked: number;
  };
  errors: string[];
  summary: {
    avgCreateTime: number;
    avgReadTime: number;
    avgUpdateTime: number;
    avgDeleteTime: number;
    avgSwitchTime: number;
    p95CreateTime: number;
    p95ReadTime: number;
    p95UpdateTime: number;
    p95DeleteTime: number;
    p95SwitchTime: number;
    totalTime: number;
    opsPerSecond: number;
    successRate: number;
  };
}

class PerformanceTest {
  private config: TestConfig;
  private provider!: ITerminalStorageService;
  private results: TestResults;
  private sessionIds: string[] = [];
  private projectIds: string[] = [];
  
  constructor(config: TestConfig) {
    this.config = config;
    this.results = {
      mode: config.mode,
      totalSessions: config.sessions,
      totalProjects: config.projects,
      metrics: {
        createTime: [],
        readTime: [],
        updateTime: [],
        deleteTime: [],
        switchTime: []
      },
      memory: {
        initial: 0,
        peak: 0,
        final: 0,
        leaked: 0
      },
      errors: [],
      summary: {} as any
    };
  }
  
  /**
   * Run performance test
   */
  async run(): Promise<void> {
    console.log(chalk.cyan.bold('\n🚀 Terminal Storage Performance Test\n'));
    console.log(chalk.gray('═'.repeat(60)));
    
    this.displayConfig();
    
    try {
      await this.setup();
      await this.runTests();
      await this.cleanup();
      this.calculateSummary();
      this.displayResults();
    } catch (error) {
      console.error(chalk.red('Test failed:'), error);
      throw error;
    }
  }
  
  /**
   * Display test configuration
   */
  private displayConfig(): void {
    console.log(chalk.white.bold('Test Configuration:'));
    console.log(chalk.gray('  Storage Mode:'), chalk.green(this.config.mode));
    console.log(chalk.gray('  Sessions:'), chalk.blue(this.config.sessions));
    console.log(chalk.gray('  Projects:'), chalk.blue(this.config.projects));
    console.log(chalk.gray('  Operations:'), chalk.blue(this.config.operations));
    console.log(chalk.gray('  Concurrent:'), this.config.concurrent ? chalk.yellow('Yes') : chalk.gray('No'));
    console.log();
  }
  
  /**
   * Setup test environment
   */
  private async setup(): Promise<void> {
    const spinner = ora('Setting up test environment...').start();
    
    // Configure storage
    process.env.TERMINAL_STORAGE_MODE = this.config.mode;
    
    if (this.config.mode === 'DATABASE' || this.config.mode === 'HYBRID') {
      // Ensure DATABASE_URL is set
      if (!process.env.DATABASE_URL) {
        spinner.fail('DATABASE_URL not set');
        throw new Error('DATABASE_URL required for DATABASE/HYBRID mode');
      }
    }
    
    // Initialize storage factory
    StorageFactory.initialize();
    this.provider = StorageFactory.getProvider();
    
    // Generate project IDs
    for (let i = 0; i < this.config.projects; i++) {
      this.projectIds.push(`project-${i}-${Date.now()}`);
    }
    
    // Record initial memory
    if (global.gc) global.gc();
    this.results.memory.initial = process.memoryUsage().heapUsed;
    
    spinner.succeed('Test environment ready');
  }
  
  /**
   * Run performance tests
   */
  private async runTests(): Promise<void> {
    const startTime = performance.now();
    
    // Test 1: Session Creation
    await this.testSessionCreation();
    
    // Test 2: Session Reading
    await this.testSessionReading();
    
    // Test 3: Session Updates
    await this.testSessionUpdates();
    
    // Test 4: Project Switching
    await this.testProjectSwitching();
    
    // Test 5: Session Deletion
    await this.testSessionDeletion();
    
    const totalTime = performance.now() - startTime;
    this.results.summary.totalTime = totalTime;
    
    // Record peak memory
    this.results.memory.peak = process.memoryUsage().heapUsed;
  }
  
  /**
   * Test session creation performance
   */
  private async testSessionCreation(): Promise<void> {
    const spinner = ora('Testing session creation...').start();
    const sessionsPerProject = Math.ceil(this.config.sessions / this.config.projects);
    
    if (this.config.concurrent) {
      // Concurrent creation
      const promises: Promise<void>[] = [];
      
      for (const projectId of this.projectIds) {
        for (let i = 0; i < sessionsPerProject; i++) {
          promises.push(this.createSession(projectId, i));
        }
      }
      
      await Promise.all(promises);
    } else {
      // Sequential creation
      for (const projectId of this.projectIds) {
        for (let i = 0; i < sessionsPerProject; i++) {
          await this.createSession(projectId, i);
        }
      }
    }
    
    spinner.succeed(`Created ${this.sessionIds.length} sessions - Avg: ${this.getAvg(this.results.metrics.createTime).toFixed(2)}ms`);
  }
  
  /**
   * Create a single session and measure time
   */
  private async createSession(projectId: string, index: number): Promise<void> {
    const start = performance.now();
    
    try {
      const session = await this.provider.createSession({
        projectId,
        projectPath: `/test/project/${projectId}`,
        userId: `user-${index % 5}`,
        mode: index % 2 === 0 ? 'normal' : 'claude'
      });
      
      this.sessionIds.push(session.id);
      
      const duration = performance.now() - start;
      this.results.metrics.createTime.push(duration);
      
      if (this.config.verbose && index % 10 === 0) {
        console.log(chalk.gray(`  Created session ${session.id} in ${duration.toFixed(2)}ms`));
      }
    } catch (error) {
      this.results.errors.push(`Create failed: ${error}`);
    }
  }
  
  /**
   * Test session reading performance
   */
  private async testSessionReading(): Promise<void> {
    const spinner = ora('Testing session reading...').start();
    const readOps = Math.min(this.config.operations, this.sessionIds.length * 2);
    
    for (let i = 0; i < readOps; i++) {
      const sessionId = this.sessionIds[i % this.sessionIds.length];
      const start = performance.now();
      
      try {
        await this.provider.getSession(sessionId);
        const duration = performance.now() - start;
        this.results.metrics.readTime.push(duration);
      } catch (error) {
        this.results.errors.push(`Read failed: ${error}`);
      }
    }
    
    spinner.succeed(`Read ${readOps} sessions - Avg: ${this.getAvg(this.results.metrics.readTime).toFixed(2)}ms`);
  }
  
  /**
   * Test session update performance
   */
  private async testSessionUpdates(): Promise<void> {
    const spinner = ora('Testing session updates...').start();
    const updateOps = Math.min(this.config.operations, this.sessionIds.length);
    
    for (let i = 0; i < updateOps; i++) {
      const sessionId = this.sessionIds[i % this.sessionIds.length];
      const start = performance.now();
      
      try {
        await this.provider.updateSession(sessionId, {
          status: i % 2 === 0 ? 'active' : 'inactive',
          currentPath: `/test/path/${i}`
        });
        
        const duration = performance.now() - start;
        this.results.metrics.updateTime.push(duration);
      } catch (error) {
        this.results.errors.push(`Update failed: ${error}`);
      }
    }
    
    spinner.succeed(`Updated ${updateOps} sessions - Avg: ${this.getAvg(this.results.metrics.updateTime).toFixed(2)}ms`);
  }
  
  /**
   * Test project switching performance
   */
  private async testProjectSwitching(): Promise<void> {
    if (this.projectIds.length < 2) {
      console.log(chalk.yellow('Skipping project switch test (need at least 2 projects)'));
      return;
    }
    
    const spinner = ora('Testing project switching...').start();
    const switchOps = Math.min(10, this.config.operations);
    
    for (let i = 0; i < switchOps; i++) {
      const fromProject = this.projectIds[i % this.projectIds.length];
      const toProject = this.projectIds[(i + 1) % this.projectIds.length];
      
      const start = performance.now();
      
      try {
        // Simulate project switch
        const sessions = await this.provider.listSessions(toProject);
        
        // Set focus on first session
        if (sessions.length > 0) {
          await this.provider.setSessionFocus(sessions[0].id, true);
        }
        
        const duration = performance.now() - start;
        this.results.metrics.switchTime.push(duration);
      } catch (error) {
        this.results.errors.push(`Switch failed: ${error}`);
      }
    }
    
    spinner.succeed(`Switched ${switchOps} times - Avg: ${this.getAvg(this.results.metrics.switchTime).toFixed(2)}ms`);
  }
  
  /**
   * Test session deletion performance
   */
  private async testSessionDeletion(): Promise<void> {
    const spinner = ora('Testing session deletion...').start();
    const deleteOps = Math.min(this.sessionIds.length / 2, this.config.operations);
    
    for (let i = 0; i < deleteOps; i++) {
      const sessionId = this.sessionIds[i];
      const start = performance.now();
      
      try {
        await this.provider.deleteSession(sessionId);
        
        const duration = performance.now() - start;
        this.results.metrics.deleteTime.push(duration);
      } catch (error) {
        this.results.errors.push(`Delete failed: ${error}`);
      }
    }
    
    spinner.succeed(`Deleted ${deleteOps} sessions - Avg: ${this.getAvg(this.results.metrics.deleteTime).toFixed(2)}ms`);
  }
  
  /**
   * Cleanup after tests
   */
  private async cleanup(): Promise<void> {
    const spinner = ora('Cleaning up...').start();
    
    // Delete remaining sessions
    for (const sessionId of this.sessionIds) {
      try {
        await this.provider.deleteSession(sessionId);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
    
    // Cleanup storage
    await StorageFactory.cleanup();
    
    // Force garbage collection and measure final memory
    if (global.gc) global.gc();
    this.results.memory.final = process.memoryUsage().heapUsed;
    this.results.memory.leaked = Math.max(0, this.results.memory.final - this.results.memory.initial);
    
    spinner.succeed('Cleanup complete');
  }
  
  /**
   * Calculate summary statistics
   */
  private calculateSummary(): void {
    const metrics = this.results.metrics;
    
    this.results.summary = {
      avgCreateTime: this.getAvg(metrics.createTime),
      avgReadTime: this.getAvg(metrics.readTime),
      avgUpdateTime: this.getAvg(metrics.updateTime),
      avgDeleteTime: this.getAvg(metrics.deleteTime),
      avgSwitchTime: this.getAvg(metrics.switchTime),
      p95CreateTime: this.getPercentile(metrics.createTime, 95),
      p95ReadTime: this.getPercentile(metrics.readTime, 95),
      p95UpdateTime: this.getPercentile(metrics.updateTime, 95),
      p95DeleteTime: this.getPercentile(metrics.deleteTime, 95),
      p95SwitchTime: this.getPercentile(metrics.switchTime, 95),
      totalTime: this.results.summary.totalTime || 0,
      opsPerSecond: this.calculateOpsPerSecond(),
      successRate: this.calculateSuccessRate()
    };
  }
  
  /**
   * Display test results
   */
  private displayResults(): void {
    console.log(chalk.cyan.bold('\n📊 Performance Test Results\n'));
    console.log(chalk.gray('═'.repeat(60)));
    
    // Operation Times
    console.log(chalk.white.bold('Operation Performance:'));
    console.log(chalk.gray('  Create:'), 
      chalk.green(`Avg: ${this.results.summary.avgCreateTime.toFixed(2)}ms`),
      chalk.gray(`P95: ${this.results.summary.p95CreateTime.toFixed(2)}ms`)
    );
    console.log(chalk.gray('  Read:'), 
      chalk.green(`Avg: ${this.results.summary.avgReadTime.toFixed(2)}ms`),
      chalk.gray(`P95: ${this.results.summary.p95ReadTime.toFixed(2)}ms`)
    );
    console.log(chalk.gray('  Update:'), 
      chalk.green(`Avg: ${this.results.summary.avgUpdateTime.toFixed(2)}ms`),
      chalk.gray(`P95: ${this.results.summary.p95UpdateTime.toFixed(2)}ms`)
    );
    console.log(chalk.gray('  Delete:'), 
      chalk.green(`Avg: ${this.results.summary.avgDeleteTime.toFixed(2)}ms`),
      chalk.gray(`P95: ${this.results.summary.p95DeleteTime.toFixed(2)}ms`)
    );
    console.log(chalk.gray('  Switch:'), 
      chalk.green(`Avg: ${this.results.summary.avgSwitchTime.toFixed(2)}ms`),
      chalk.gray(`P95: ${this.results.summary.p95SwitchTime.toFixed(2)}ms`)
    );
    
    // Memory Usage
    console.log(chalk.white.bold('\nMemory Usage:'));
    console.log(chalk.gray('  Initial:'), `${(this.results.memory.initial / 1024 / 1024).toFixed(2)}MB`);
    console.log(chalk.gray('  Peak:'), `${(this.results.memory.peak / 1024 / 1024).toFixed(2)}MB`);
    console.log(chalk.gray('  Final:'), `${(this.results.memory.final / 1024 / 1024).toFixed(2)}MB`);
    console.log(chalk.gray('  Leaked:'), 
      this.results.memory.leaked > 10 * 1024 * 1024 
        ? chalk.red(`${(this.results.memory.leaked / 1024 / 1024).toFixed(2)}MB`)
        : chalk.green(`${(this.results.memory.leaked / 1024 / 1024).toFixed(2)}MB`)
    );
    
    // Overall Performance
    console.log(chalk.white.bold('\nOverall Performance:'));
    console.log(chalk.gray('  Total Time:'), `${(this.results.summary.totalTime / 1000).toFixed(2)}s`);
    console.log(chalk.gray('  Ops/Second:'), chalk.blue(this.results.summary.opsPerSecond.toFixed(0)));
    console.log(chalk.gray('  Success Rate:'), 
      this.results.summary.successRate >= 99 
        ? chalk.green(`${this.results.summary.successRate.toFixed(1)}%`)
        : chalk.yellow(`${this.results.summary.successRate.toFixed(1)}%`)
    );
    
    // Errors
    if (this.results.errors.length > 0) {
      console.log(chalk.red.bold('\nErrors:'));
      const uniqueErrors = [...new Set(this.results.errors)];
      uniqueErrors.slice(0, 5).forEach(error => {
        console.log(chalk.red(`  - ${error}`));
      });
      if (uniqueErrors.length > 5) {
        console.log(chalk.gray(`  ... and ${uniqueErrors.length - 5} more`));
      }
    }
    
    // Performance Assessment
    console.log(chalk.cyan.bold('\n🎯 Performance Assessment:'));
    
    const isExcellent = 
      this.results.summary.avgCreateTime < 100 &&
      this.results.summary.avgReadTime < 50 &&
      this.results.summary.avgSwitchTime < 500 &&
      this.results.summary.successRate >= 99;
    
    const isGood = 
      this.results.summary.avgCreateTime < 200 &&
      this.results.summary.avgReadTime < 100 &&
      this.results.summary.avgSwitchTime < 1000 &&
      this.results.summary.successRate >= 95;
    
    if (isExcellent) {
      console.log(chalk.green.bold('  ✨ EXCELLENT - Production Ready!'));
    } else if (isGood) {
      console.log(chalk.yellow.bold('  ✅ GOOD - Acceptable for production'));
    } else {
      console.log(chalk.red.bold('  ⚠️  NEEDS IMPROVEMENT - Review configuration'));
    }
  }
  
  // Utility functions
  private getAvg(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }
  
  private getPercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * (percentile / 100)) - 1;
    return sorted[Math.min(index, sorted.length - 1)];
  }
  
  private calculateOpsPerSecond(): number {
    const totalOps = 
      this.results.metrics.createTime.length +
      this.results.metrics.readTime.length +
      this.results.metrics.updateTime.length +
      this.results.metrics.deleteTime.length +
      this.results.metrics.switchTime.length;
    
    const totalSeconds = this.results.summary.totalTime / 1000;
    return totalOps / totalSeconds;
  }
  
  private calculateSuccessRate(): number {
    const totalOps = 
      this.results.metrics.createTime.length +
      this.results.metrics.readTime.length +
      this.results.metrics.updateTime.length +
      this.results.metrics.deleteTime.length +
      this.results.metrics.switchTime.length;
    
    const successOps = totalOps - this.results.errors.length;
    return (successOps / totalOps) * 100;
  }
}

// CLI Program
program
  .name('performance-test')
  .description('Performance test for Terminal Storage System')
  .version('1.0.0')
  .requiredOption('-m, --mode <mode>', 'Storage mode (LOCAL, DATABASE, HYBRID)')
  .option('-s, --sessions <number>', 'Number of sessions to create', '50')
  .option('-p, --projects <number>', 'Number of projects', '5')
  .option('-o, --operations <number>', 'Number of operations per test', '100')
  .option('-c, --concurrent', 'Run operations concurrently', false)
  .option('-v, --verbose', 'Show detailed output', false)
  .action(async (options) => {
    try {
      const config: TestConfig = {
        mode: options.mode as 'LOCAL' | 'DATABASE' | 'HYBRID',
        sessions: parseInt(options.sessions),
        projects: parseInt(options.projects),
        operations: parseInt(options.operations),
        concurrent: options.concurrent,
        verbose: options.verbose
      };
      
      // Validate mode
      if (!['LOCAL', 'DATABASE', 'HYBRID'].includes(config.mode)) {
        console.error(chalk.red(`Invalid mode: ${config.mode}`));
        process.exit(1);
      }
      
      // Run test
      const test = new PerformanceTest(config);
      await test.run();
      
      console.log(chalk.green.bold('\n✅ Performance test completed!\n'));
      process.exit(0);
      
    } catch (error) {
      console.error(chalk.red.bold('\n❌ Test failed:'));
      console.error(chalk.red(error));
      process.exit(1);
    }
  });

program.parse(process.argv);

export { PerformanceTest };