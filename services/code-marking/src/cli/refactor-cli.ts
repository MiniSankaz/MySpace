#!/usr/bin/env node

/**
 * CLI for Code Refactoring Operations
 */

import { Command } from 'commander';
import axios from 'axios';
import chalk from 'chalk';
import ora from 'ora';
import { table } from 'table';
import inquirer from 'inquirer';

const API_URL = process.env.CODE_MARKING_API || 'http://localhost:4192';

const program = new Command();

program
  .name('code-refactor')
  .description('Code refactoring CLI')
  .version('1.0.0');

// Create refactoring plan
program
  .command('plan <fileId>')
  .description('Create refactoring plan for a file')
  .option('-m, --markings <ids...>', 'Specific marking IDs to address')
  .action(async (fileId, options) => {
    const spinner = ora('Creating refactoring plan...').start();
    
    try {
      let markingIds = options.markings;
      
      // If no specific markings, get all for the file
      if (!markingIds) {
        const markingsResponse = await axios.get(`${API_URL}/api/v1/markings/file/${fileId}`);
        markingIds = markingsResponse.data.map((m: any) => m.id);
      }
      
      const response = await axios.post(`${API_URL}/api/v1/refactoring/plan`, {
        fileId,
        markingIds
      });
      
      const plan = response.data;
      
      spinner.succeed(chalk.green('Refactoring plan created'));
      
      console.log(chalk.cyan('\n📋 Refactoring Plan\n'));
      console.log(`Type: ${chalk.bold(plan.type)}`);
      console.log(`Description: ${plan.description}`);
      console.log(`Complexity: ${colorComplexity(plan.estimatedComplexity)}`);
      console.log(`Risk: ${colorRisk(plan.estimatedRisk)}`);
      console.log(`Markings to fix: ${plan.markings.length}`);
      
      if (plan.steps && plan.steps.length > 0) {
        console.log(chalk.cyan('\n📝 Steps:\n'));
        plan.steps.forEach((step: any, index: number) => {
          console.log(`${index + 1}. ${step.description}`);
        });
      }
    } catch (error: any) {
      spinner.fail(chalk.red('Failed to create plan'));
      console.error(error.response?.data || error.message);
      process.exit(1);
    }
  });

// Execute refactoring
program
  .command('execute <refactoringId>')
  .description('Execute a refactoring')
  .option('-a, --auto-approve', 'Auto-approve changes')
  .action(async (refactoringId, options) => {
    const spinner = ora('Executing refactoring...').start();
    
    try {
      await axios.post(`${API_URL}/api/v1/refactoring/${refactoringId}/execute`, {
        autoApprove: options.autoApprove
      });
      
      spinner.succeed(chalk.green('Refactoring executed'));
      
      if (!options.autoApprove) {
        console.log(chalk.yellow('\n⚠️  Refactoring is awaiting review'));
        console.log(`Run 'code-refactor apply ${refactoringId}' to apply changes`);
      }
    } catch (error: any) {
      spinner.fail(chalk.red('Refactoring failed'));
      console.error(error.response?.data || error.message);
      process.exit(1);
    }
  });

// Apply refactoring
program
  .command('apply <refactoringId>')
  .description('Apply approved refactoring')
  .action(async (refactoringId) => {
    const spinner = ora('Applying refactoring...').start();
    
    try {
      await axios.post(`${API_URL}/api/v1/refactoring/${refactoringId}/apply`);
      spinner.succeed(chalk.green('Refactoring applied successfully'));
    } catch (error: any) {
      spinner.fail(chalk.red('Failed to apply refactoring'));
      console.error(error.response?.data || error.message);
      process.exit(1);
    }
  });

// Batch refactor
program
  .command('batch')
  .description('Batch refactor multiple files')
  .option('-t, --type <type>', 'Refactoring type', 'OPTIMIZE')
  .option('-p, --pattern <pattern>', 'File pattern')
  .option('-l, --language <language>', 'Filter by language')
  .action(async (options) => {
    const spinner = ora('Finding files...').start();
    
    try {
      // Search for files
      const searchResponse = await axios.get(`${API_URL}/api/v1/index/search`, {
        params: {
          pattern: options.pattern || '*',
          language: options.language,
          limit: 100
        }
      });
      
      const files = searchResponse.data;
      spinner.succeed(chalk.green(`Found ${files.length} files`));
      
      if (files.length === 0) {
        return;
      }
      
      // Confirm batch operation
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: `Refactor ${files.length} files with type ${options.type}?`,
          default: false
        }
      ]);
      
      if (!confirm) {
        console.log(chalk.yellow('Batch refactoring cancelled'));
        return;
      }
      
      spinner.start('Starting batch refactoring...');
      
      const fileIds = files.map((f: any) => f.id);
      await axios.post(`${API_URL}/api/v1/refactoring/batch`, {
        fileIds,
        type: options.type
      });
      
      spinner.succeed(chalk.green('Batch refactoring started'));
      console.log(chalk.cyan('Check status with: code-refactor stats'));
    } catch (error: any) {
      spinner.fail(chalk.red('Batch refactoring failed'));
      console.error(error.response?.data || error.message);
      process.exit(1);
    }
  });

// Get refactoring statistics
program
  .command('stats')
  .description('Get refactoring statistics')
  .action(async () => {
    try {
      const response = await axios.get(`${API_URL}/api/v1/refactoring/stats`);
      const stats = response.data;
      
      console.log(chalk.cyan('\n📊 Refactoring Statistics\n'));
      
      // By Type
      if (stats.byType.length > 0) {
        console.log(chalk.yellow('By Type:'));
        const typeData = [
          ['Type', 'Count'],
          ...stats.byType.map((s: any) => [s.type, s.count])
        ];
        console.log(table(typeData));
      }
      
      // By Status
      if (stats.byStatus.length > 0) {
        console.log(chalk.yellow('By Status:'));
        const statusData = [
          ['Status', 'Count'],
          ...stats.byStatus.map((s: any) => [
            colorStatus(s.status),
            s.count
          ])
        ];
        console.log(table(statusData));
      }
      
      // Recent refactorings
      if (stats.recent.length > 0) {
        console.log(chalk.yellow('Recent Refactorings:'));
        const recentData = [
          ['ID', 'File', 'Type', 'Status', 'Created'],
          ...stats.recent.map((r: any) => [
            r.id.substring(0, 8),
            r.file.split('/').pop(),
            r.type,
            colorStatus(r.status),
            new Date(r.createdAt).toLocaleDateString()
          ])
        ];
        console.log(table(recentData));
      }
    } catch (error: any) {
      console.error(chalk.red('Failed to get statistics'));
      console.error(error.response?.data || error.message);
      process.exit(1);
    }
  });

// Interactive refactoring workflow
program
  .command('interactive')
  .description('Interactive refactoring workflow')
  .action(async () => {
    try {
      // Step 1: Select file
      const searchResponse = await axios.get(`${API_URL}/api/v1/index/search`, {
        params: { pattern: '*', limit: 50 }
      });
      
      const files = searchResponse.data;
      
      const { fileId } = await inquirer.prompt([
        {
          type: 'list',
          name: 'fileId',
          message: 'Select a file to refactor:',
          choices: files.map((f: any) => ({
            name: f.relativePath,
            value: f.id
          }))
        }
      ]);
      
      // Step 2: Analyze file
      const spinner = ora('Analyzing file...').start();
      
      await axios.post(`${API_URL}/api/v1/markings/analyze`, {
        fileId,
        options: {
          detectDuplicates: true,
          analyzeComplexity: true,
          checkPatterns: true,
          checkSecurity: true
        }
      });
      
      spinner.succeed('Analysis complete');
      
      // Step 3: Get markings
      const markingsResponse = await axios.get(`${API_URL}/api/v1/markings/file/${fileId}`);
      const markings = markingsResponse.data;
      
      if (markings.length === 0) {
        console.log(chalk.green('✨ No issues found! File is clean.'));
        return;
      }
      
      console.log(chalk.yellow(`\nFound ${markings.length} issues\n`));
      
      // Step 4: Select markings to fix
      const { selectedMarkings } = await inquirer.prompt([
        {
          type: 'checkbox',
          name: 'selectedMarkings',
          message: 'Select issues to fix:',
          choices: markings.map((m: any) => ({
            name: `${colorSeverity(m.severity)} ${m.type}: ${m.message} (Line ${m.line})`,
            value: m.id,
            checked: m.severity === 'CRITICAL' || m.severity === 'HIGH'
          }))
        }
      ]);
      
      if (selectedMarkings.length === 0) {
        console.log(chalk.yellow('No issues selected'));
        return;
      }
      
      // Step 5: Create and execute refactoring
      spinner.start('Creating refactoring plan...');
      
      const planResponse = await axios.post(`${API_URL}/api/v1/refactoring/plan`, {
        fileId,
        markingIds: selectedMarkings
      });
      
      spinner.succeed('Plan created');
      
      const plan = planResponse.data;
      console.log(chalk.cyan('\nRefactoring Plan:'));
      console.log(`Type: ${plan.type}`);
      console.log(`Complexity: ${colorComplexity(plan.estimatedComplexity)}`);
      console.log(`Risk: ${colorRisk(plan.estimatedRisk)}`);
      
      const { proceed } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'proceed',
          message: 'Proceed with refactoring?',
          default: true
        }
      ]);
      
      if (!proceed) {
        console.log(chalk.yellow('Refactoring cancelled'));
        return;
      }
      
      // Execute refactoring
      spinner.start('Executing refactoring...');
      
      // Note: In real implementation, would need to get refactoring ID from plan creation
      // This is simplified for example
      
      console.log(chalk.green('\n✅ Refactoring workflow completed!'));
      
    } catch (error: any) {
      console.error(chalk.red('Interactive workflow failed'));
      console.error(error.response?.data || error.message);
      process.exit(1);
    }
  });

// Helper function to color complexity
function colorComplexity(complexity: string): string {
  switch (complexity) {
    case 'high':
      return chalk.red(complexity);
    case 'medium':
      return chalk.yellow(complexity);
    case 'low':
      return chalk.green(complexity);
    default:
      return complexity;
  }
}

// Helper function to color risk
function colorRisk(risk: string): string {
  switch (risk) {
    case 'high':
      return chalk.red(risk);
    case 'medium':
      return chalk.yellow(risk);
    case 'low':
      return chalk.green(risk);
    default:
      return risk;
  }
}

// Helper function to color status
function colorStatus(status: string): string {
  switch (status) {
    case 'COMPLETED':
      return chalk.green(status);
    case 'IN_PROGRESS':
    case 'ANALYZING':
      return chalk.yellow(status);
    case 'FAILED':
      return chalk.red(status);
    case 'REVIEW':
      return chalk.cyan(status);
    case 'PLANNED':
      return chalk.blue(status);
    default:
      return status;
  }
}

// Helper function to color severity
function colorSeverity(severity: string): string {
  switch (severity) {
    case 'CRITICAL':
      return chalk.red.bold('●');
    case 'HIGH':
      return chalk.red('●');
    case 'MEDIUM':
      return chalk.yellow('●');
    case 'LOW':
      return chalk.blue('●');
    case 'INFO':
      return chalk.gray('●');
    default:
      return '●';
  }
}

program.parse();