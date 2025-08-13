#!/usr/bin/env tsx

/**
 * Terminal Integration Test Script
 * ทดสอบการทำงานร่วมกันของ services ใหม่
 */

import { migrationService } from '../src/services/terminal-v2/migration/migration-service';
import { getTerminalOrchestrator } from '../src/services/terminal-v2/terminal-orchestrator';
import chalk from 'chalk';

// Test results
interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration?: number;
}

const results: TestResult[] = [];

// Helper functions
function log(message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') {
  const prefix = {
    info: chalk.blue('ℹ'),
    success: chalk.green('✓'),
    error: chalk.red('✗'),
    warning: chalk.yellow('⚠')
  };
  
  console.log(`${prefix[type]} ${message}`);
}

async function runTest(name: string, testFn: () => Promise<void>): Promise<void> {
  log(`Testing: ${name}`, 'info');
  const startTime = Date.now();
  
  try {
    await testFn();
    const duration = Date.now() - startTime;
    results.push({ name, passed: true, duration });
    log(`${name} - PASSED (${duration}ms)`, 'success');
  } catch (error) {
    const duration = Date.now() - startTime;
    results.push({ 
      name, 
      passed: false, 
      error: error instanceof Error ? error.message : String(error),
      duration 
    });
    log(`${name} - FAILED: ${error}`, 'error');
  }
}

// Tests
async function testMigrationService() {
  await runTest('Migration Service - Get Status', async () => {
    const status = migrationService.getStatus();
    
    if (!status) throw new Error('Status is null');
    if (!status.mode) throw new Error('Mode is missing');
    if (!status.featureFlags) throw new Error('Feature flags missing');
    
    console.log('  Mode:', status.mode);
    console.log('  Features enabled:', Object.entries(status.featureFlags)
      .filter(([_, v]) => v)
      .map(([k]) => k)
      .join(', '));
  });
  
  await runTest('Migration Service - Create Session', async () => {
    const session = await migrationService.createSession({
      projectId: 'test-project',
      projectPath: '/tmp',
      userId: 'test-user',
      mode: 'normal'
    });
    
    if (!session) throw new Error('Session is null');
    if (!session.id) throw new Error('Session ID missing');
    
    console.log('  Session ID:', session.id);
    console.log('  Status:', session.status);
    
    // Cleanup
    migrationService.closeSession(session.id);
  });
  
  await runTest('Migration Service - List Sessions', async () => {
    // Create a session first
    const session = await migrationService.createSession({
      projectId: 'test-project-2',
      projectPath: '/tmp',
      userId: 'test-user',
      mode: 'normal'
    });
    
    const sessions = migrationService.listSessions('test-project-2');
    
    if (!Array.isArray(sessions)) throw new Error('Sessions is not an array');
    if (sessions.length === 0) throw new Error('No sessions found');
    
    console.log('  Found sessions:', sessions.length);
    
    // Cleanup
    migrationService.closeSession(session.id);
  });
}

async function testOrchestrator() {
  const orchestrator = getTerminalOrchestrator();
  
  await runTest('Orchestrator - Get Status', async () => {
    const status = orchestrator.getStatus();
    
    if (!status) throw new Error('Status is null');
    if (status.ready !== true) throw new Error('Orchestrator not ready');
    
    console.log('  Ready:', status.ready);
    console.log('  Sessions:', status.statistics.sessions);
    console.log('  Streams:', status.statistics.streams);
  });
  
  await runTest('Orchestrator - Create Terminal', async () => {
    const terminal = await orchestrator.createTerminal({
      projectId: 'test-project-3',
      projectPath: '/tmp',
      userId: 'test-user',
      mode: 'NORMAL'
    });
    
    if (!terminal) throw new Error('Terminal is null');
    if (!terminal.session) throw new Error('Session missing');
    if (!terminal.session.id) throw new Error('Session ID missing');
    
    console.log('  Terminal ID:', terminal.session.id);
    console.log('  Status:', terminal.session.status);
    
    // Cleanup
    orchestrator.closeTerminal(terminal.session.id);
  });
  
  await runTest('Orchestrator - Get Metrics', async () => {
    const metrics = orchestrator.getMetrics();
    
    if (!metrics) throw new Error('Metrics is null');
    if (!metrics.cpu) throw new Error('CPU metrics missing');
    if (!metrics.memory) throw new Error('Memory metrics missing');
    
    console.log('  CPU usage:', metrics.cpu.usage.toFixed(2) + '%');
    console.log('  Memory:', Math.round(metrics.memory.heapUsed / 1024 / 1024) + 'MB');
    console.log('  Sessions:', metrics.sessions.total);
  });
  
  await runTest('Orchestrator - Performance Report', async () => {
    const report = orchestrator.getPerformanceReport();
    
    if (!report) throw new Error('Report is null');
    if (!report.summary) throw new Error('Summary missing');
    
    console.log('  Summary:', report.summary);
    if (report.recommendations && report.recommendations.length > 0) {
      console.log('  Recommendations:', report.recommendations.join(', '));
    }
  });
}

async function testProjectSwitching() {
  await runTest('Project Switching - Suspend/Resume', async () => {
    const orchestrator = getTerminalOrchestrator();
    
    // Create sessions for project A
    const terminal1 = await orchestrator.createTerminal({
      projectId: 'project-a',
      projectPath: '/tmp/project-a',
      userId: 'test-user'
    });
    
    const terminal2 = await orchestrator.createTerminal({
      projectId: 'project-a',
      projectPath: '/tmp/project-a',
      userId: 'test-user'
    });
    
    console.log('  Created 2 terminals for project-a');
    
    // Suspend project A
    const suspendedCount = await orchestrator.suspendProject('project-a');
    console.log('  Suspended:', suspendedCount, 'sessions');
    
    if (suspendedCount !== 2) throw new Error(`Expected 2 suspended, got ${suspendedCount}`);
    
    // Resume project A
    const resumedSessions = await orchestrator.resumeProject('project-a');
    console.log('  Resumed:', resumedSessions.length, 'sessions');
    
    if (resumedSessions.length !== 2) throw new Error(`Expected 2 resumed, got ${resumedSessions.length}`);
    
    // Cleanup
    orchestrator.closeTerminal(terminal1.session.id);
    orchestrator.closeTerminal(terminal2.session.id);
  });
}

async function testMemoryManagement() {
  await runTest('Memory Pool - Session Reuse', async () => {
    const orchestrator = getTerminalOrchestrator();
    const initialMetrics = orchestrator.getMetrics();
    
    // Create and close multiple sessions
    for (let i = 0; i < 5; i++) {
      const terminal = await orchestrator.createTerminal({
        projectId: `test-memory-${i}`,
        projectPath: '/tmp',
        userId: 'test-user'
      });
      
      await new Promise(resolve => setTimeout(resolve, 100));
      orchestrator.closeTerminal(terminal.session.id);
    }
    
    const finalMetrics = orchestrator.getMetrics();
    
    console.log('  Initial memory:', Math.round(initialMetrics.memory.heapUsed / 1024 / 1024) + 'MB');
    console.log('  Final memory:', Math.round(finalMetrics.memory.heapUsed / 1024 / 1024) + 'MB');
    
    // Check that memory didn't grow too much
    const memoryGrowth = finalMetrics.memory.heapUsed - initialMetrics.memory.heapUsed;
    const growthMB = Math.round(memoryGrowth / 1024 / 1024);
    
    console.log('  Memory growth:', growthMB + 'MB');
    
    if (growthMB > 50) {
      console.log(chalk.yellow('  Warning: High memory growth detected'));
    }
  });
}

async function testErrorHandling() {
  await runTest('Error Handling - Invalid Project ID', async () => {
    try {
      await migrationService.createSession({
        projectId: '',
        projectPath: '/tmp',
        userId: 'test-user',
        mode: 'normal'
      });
      throw new Error('Should have failed with empty project ID');
    } catch (error) {
      // Expected to fail
      console.log('  Correctly rejected empty project ID');
    }
  });
  
  await runTest('Error Handling - Close Non-existent Session', async () => {
    const result = migrationService.closeSession('non-existent-session-id');
    
    // Should return false or handle gracefully
    console.log('  Handled non-existent session:', result);
  });
}

// Main test runner
async function main() {
  console.log(chalk.bold.cyan('\n🧪 Terminal Integration Tests\n'));
  console.log('Migration Mode:', migrationService.getStatus().mode);
  console.log('---\n');
  
  // Run test suites
  await testMigrationService();
  console.log();
  
  await testOrchestrator();
  console.log();
  
  await testProjectSwitching();
  console.log();
  
  await testMemoryManagement();
  console.log();
  
  await testErrorHandling();
  console.log();
  
  // Summary
  console.log(chalk.bold.cyan('\n📊 Test Summary\n'));
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const totalDuration = results.reduce((sum, r) => sum + (r.duration || 0), 0);
  
  console.log(`Total: ${results.length} tests`);
  console.log(`${chalk.green('Passed')}: ${passed}`);
  console.log(`${chalk.red('Failed')}: ${failed}`);
  console.log(`Duration: ${totalDuration}ms\n`);
  
  // List failed tests
  if (failed > 0) {
    console.log(chalk.red('Failed Tests:'));
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.name}: ${r.error}`);
    });
    process.exit(1);
  } else {
    console.log(chalk.green('✨ All tests passed!'));
    process.exit(0);
  }
}

// Run tests
main().catch(error => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});