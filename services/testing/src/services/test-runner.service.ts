import { exec } from 'child_process';
import { promisify } from 'util';
import { TestSuite } from '../config/suites';
import { isCommandSafe } from '../config/whitelist';
import { logger } from '../utils/logger';

const execAsync = promisify(exec);

interface TestResult {
  testId: string;
  suite: string;
  status: 'running' | 'completed' | 'failed';
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  startedAt: string;
  completedAt?: string;
  results: CommandResult[];
}

interface CommandResult {
  command: string;
  success: boolean;
  output?: string;
  error?: string;
  duration: number;
}

export class TestRunnerService {
  private testResults: Map<string, TestResult> = new Map();
  
  /**
   * Run a test suite
   */
  async runSuite(suite: TestSuite, options: any = {}): Promise<string> {
    const testId = `test_${Date.now()}`;
    const result: TestResult = {
      testId,
      suite: suite.name,
      status: 'running',
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
      startedAt: new Date().toISOString(),
      results: []
    };
    
    this.testResults.set(testId, result);
    
    // Run tests asynchronously
    this.executeTests(testId, suite, options);
    
    return testId;
  }
  
  /**
   * Execute test commands
   */
  private async executeTests(testId: string, suite: TestSuite, options: any) {
    const result = this.testResults.get(testId);
    if (!result) return;
    
    const startTime = Date.now();
    const timeout = options.timeout || suite.timeout || 60000;
    const parallel = options.parallel ?? suite.parallel ?? false;
    
    try {
      if (parallel) {
        // Run commands in parallel
        const promises = suite.commands.map(cmd => this.executeCommand(cmd, timeout));
        const commandResults = await Promise.all(promises);
        result.results = commandResults;
      } else {
        // Run commands sequentially
        for (const cmd of suite.commands) {
          const cmdResult = await this.executeCommand(cmd, timeout);
          result.results.push(cmdResult);
        }
      }
      
      // Update statistics
      result.results.forEach(r => {
        if (r.success) result.passed++;
        else result.failed++;
      });
      
      result.status = result.failed > 0 ? 'failed' : 'completed';
    } catch (error) {
      logger.error(`Test suite ${testId} failed:`, error);
      result.status = 'failed';
    }
    
    result.duration = Date.now() - startTime;
    result.completedAt = new Date().toISOString();
    
    logger.info(`Test suite ${testId} completed:`, {
      passed: result.passed,
      failed: result.failed,
      duration: result.duration
    });
  }
  
  /**
   * Execute a single command
   */
  private async executeCommand(command: string, timeout: number): Promise<CommandResult> {
    const startTime = Date.now();
    
    // Check if command is safe
    const validation = isCommandSafe(command);
    if (!validation.safe && validation.requiresApproval) {
      return {
        command,
        success: false,
        error: 'Command requires approval',
        duration: Date.now() - startTime
      };
    }
    
    try {
      const { stdout, stderr } = await execAsync(command, { timeout });
      
      return {
        command,
        success: true,
        output: stdout || stderr,
        duration: Date.now() - startTime
      };
    } catch (error: any) {
      return {
        command,
        success: false,
        error: error.message,
        duration: Date.now() - startTime
      };
    }
  }
  
  /**
   * Get test results
   */
  async getResults(testId?: string, limit: number = 10): Promise<TestResult | TestResult[]> {
    if (testId) {
      const result = this.testResults.get(testId);
      if (!result) {
        throw new Error(`Test ${testId} not found`);
      }
      return result;
    }
    
    // Return latest results
    const results = Array.from(this.testResults.values())
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
      .slice(0, limit);
    
    return results;
  }
}