#!/usr/bin/env tsx
/**
 * Parallel AI Orchestration Simulation Demo
 * แสดงการทำงานแบบ parallel ของ AI agents
 */

import { EventEmitter } from 'events';
import chalk from 'chalk';

// Agent types
enum AgentType {
  BUSINESS_ANALYST = 'business-analyst',
  CODE_REVIEWER = 'code-reviewer',
  TEST_RUNNER = 'test-runner'
}

// Agent status
enum AgentStatus {
  INITIALIZING = 'initializing',
  WORKING = 'working',
  COMPLETED = 'completed'
}

// Mock Agent
class MockAgent extends EventEmitter {
  public id: string;
  public type: AgentType;
  public status: AgentStatus;
  public task: string;
  public progress: number = 0;
  private interval?: NodeJS.Timeout;

  constructor(id: string, type: AgentType, task: string) {
    super();
    this.id = id;
    this.type = type;
    this.task = task;
    this.status = AgentStatus.INITIALIZING;
  }

  start() {
    setTimeout(() => {
      this.status = AgentStatus.WORKING;
      this.emit('started');
      
      // Simulate work progress
      this.interval = setInterval(() => {
        this.progress += Math.random() * 20;
        
        if (this.progress >= 100) {
          this.progress = 100;
          this.complete();
        } else {
          this.emit('progress', this.progress);
        }
      }, 1000);
    }, Math.random() * 2000); // Random start delay
  }

  complete() {
    if (this.interval) {
      clearInterval(this.interval);
    }
    this.status = AgentStatus.COMPLETED;
    this.emit('completed');
  }
}

// Orchestration Demo
class OrchestrationDemo {
  private agents: MockAgent[] = [];
  private startTime: number = Date.now();

  async run() {
    console.clear();
    console.log(chalk.blue.bold('🚀 AI Orchestration System - Parallel Demo'));
    console.log(chalk.gray('=' .repeat(50)));
    console.log();

    // Create agents
    this.createAgents();
    
    // Start all agents in parallel
    console.log(chalk.yellow('⚡ Starting all agents in parallel...'));
    console.log();
    
    this.agents.forEach(agent => {
      agent.on('started', () => this.onAgentStarted(agent));
      agent.on('progress', (progress) => this.onAgentProgress(agent, progress));
      agent.on('completed', () => this.onAgentCompleted(agent));
      
      agent.start();
    });

    // Wait for all to complete
    await this.waitForCompletion();
  }

  private createAgents() {
    const tasks = [
      {
        id: 'agent-001',
        type: AgentType.BUSINESS_ANALYST,
        task: 'Analyzing authentication requirements'
      },
      {
        id: 'agent-002',
        type: AgentType.CODE_REVIEWER,
        task: 'Reviewing user service code quality'
      },
      {
        id: 'agent-003',
        type: AgentType.TEST_RUNNER,
        task: 'Creating integration tests for API'
      }
    ];

    tasks.forEach(t => {
      const agent = new MockAgent(t.id, t.type, t.task);
      this.agents.push(agent);
    });

    console.log(chalk.green(`✓ Created ${this.agents.length} agents`));
    this.agents.forEach(agent => {
      console.log(chalk.gray(`  → ${agent.id} (${agent.type})`));
    });
    console.log();
  }

  private onAgentStarted(agent: MockAgent) {
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
    console.log(chalk.green(`[${elapsed}s] 🟢 ${agent.id} started working`));
  }

  private onAgentProgress(agent: MockAgent, progress: number) {
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
    const progressBar = this.createProgressBar(progress);
    console.log(chalk.cyan(`[${elapsed}s] ${agent.id}: ${progressBar} ${progress.toFixed(0)}%`));
  }

  private onAgentCompleted(agent: MockAgent) {
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
    console.log(chalk.green.bold(`[${elapsed}s] ✅ ${agent.id} completed!`));
  }

  private createProgressBar(progress: number): string {
    const width = 20;
    const filled = Math.floor((progress / 100) * width);
    const empty = width - filled;
    return `[${chalk.green('█'.repeat(filled))}${chalk.gray('░'.repeat(empty))}]`;
  }

  private async waitForCompletion(): Promise<void> {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        const allCompleted = this.agents.every(a => a.status === AgentStatus.COMPLETED);
        
        if (allCompleted) {
          clearInterval(checkInterval);
          this.showSummary();
          resolve();
        }
      }, 100);
    });
  }

  private showSummary() {
    const totalTime = ((Date.now() - this.startTime) / 1000).toFixed(1);
    
    console.log();
    console.log(chalk.gray('=' .repeat(50)));
    console.log(chalk.blue.bold('📊 Summary'));
    console.log(chalk.gray('=' .repeat(50)));
    
    this.agents.forEach(agent => {
      const icon = agent.status === AgentStatus.COMPLETED ? '✅' : '❌';
      console.log(`${icon} ${agent.id}: ${agent.task}`);
      console.log(chalk.gray(`   Status: ${agent.status}, Progress: ${agent.progress.toFixed(0)}%`));
    });
    
    console.log();
    console.log(chalk.green.bold(`⏱️  Total execution time: ${totalTime} seconds`));
    console.log(chalk.yellow.bold('🎉 All agents completed successfully!'));
    console.log();
    console.log(chalk.magenta('💡 This demonstrates how multiple AI agents can work'));
    console.log(chalk.magenta('   in parallel on different tasks simultaneously.'));
  }
}

// Run demo
async function main() {
  try {
    const demo = new OrchestrationDemo();
    await demo.run();
  } catch (error) {
    console.error(chalk.red('Error:'), error);
    process.exit(1);
  }
}

// Check if chalk is installed
import { execSync } from 'child_process';
try {
  require.resolve('chalk');
} catch {
  console.log('Installing chalk...');
  execSync('npm install chalk', { stdio: 'inherit' });
}

main();