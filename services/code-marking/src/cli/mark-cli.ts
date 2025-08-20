#!/usr/bin/env node

/**
 * CLI for Code Marking Operations
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
  .name('code-mark')
  .description('Code marking and analysis CLI')
  .version('1.0.0');

// Analyze file
program
  .command('analyze <fileId>')
  .description('Analyze file for code markings')
  .option('-d, --duplicates', 'Detect duplicate code')
  .option('-c, --complexity', 'Analyze complexity')
  .option('-p, --patterns', 'Check patterns')
  .option('-s, --security', 'Check security issues')
  .option('-u, --unused', 'Check for unused code')
  .option('-n, --naming', 'Check naming conventions')
  .action(async (fileId, options) => {
    const spinner = ora('Analyzing file...').start();
    
    try {
      await axios.post(`${API_URL}/api/v1/markings/analyze`, {
        fileId,
        options: {
          detectDuplicates: options.duplicates,
          analyzeComplexity: options.complexity,
          checkPatterns: options.patterns,
          checkSecurity: options.security,
          checkUnused: options.unused,
          checkNaming: options.naming
        }
      });
      
      spinner.succeed(chalk.green('Analysis completed'));
      
      // Get and display markings
      await displayMarkings(fileId);
    } catch (error: any) {
      spinner.fail(chalk.red('Analysis failed'));
      console.error(error.response?.data || error.message);
      process.exit(1);
    }
  });

// List markings
program
  .command('list <fileId>')
  .description('List markings for a file')
  .option('-s, --severity <severity>', 'Filter by severity')
  .option('-t, --type <type>', 'Filter by type')
  .option('-f, --fixed', 'Show only fixed markings')
  .action(async (fileId, options) => {
    await displayMarkings(fileId, options);
  });

// Get marking statistics
program
  .command('stats [fileId]')
  .description('Get marking statistics')
  .action(async (fileId) => {
    try {
      const url = fileId 
        ? `${API_URL}/api/v1/markings/stats?fileId=${fileId}`
        : `${API_URL}/api/v1/markings/stats`;
      
      const response = await axios.get(url);
      const stats = response.data;
      
      console.log(chalk.cyan('\n📊 Marking Statistics\n'));
      
      // By Type
      if (stats.byType.length > 0) {
        console.log(chalk.yellow('By Type:'));
        const typeData = [
          ['Type', 'Count'],
          ...stats.byType.map((s: any) => [s.type, s.count])
        ];
        console.log(table(typeData));
      }
      
      // By Severity
      if (stats.bySeverity.length > 0) {
        console.log(chalk.yellow('By Severity:'));
        const severityData = [
          ['Severity', 'Count'],
          ...stats.bySeverity.map((s: any) => [
            colorSeverity(s.severity),
            s.count
          ])
        ];
        console.log(table(severityData));
      }
      
      // By Category
      if (stats.byCategory.length > 0) {
        console.log(chalk.yellow('By Category:'));
        const categoryData = [
          ['Category', 'Count'],
          ...stats.byCategory.map((s: any) => [s.category, s.count])
        ];
        console.log(table(categoryData));
      }
    } catch (error: any) {
      console.error(chalk.red('Failed to get statistics'));
      console.error(error.response?.data || error.message);
      process.exit(1);
    }
  });

// Interactive marking review
program
  .command('review <fileId>')
  .description('Interactive marking review')
  .action(async (fileId) => {
    try {
      const response = await axios.get(`${API_URL}/api/v1/markings/file/${fileId}`);
      const markings = response.data;
      
      if (markings.length === 0) {
        console.log(chalk.yellow('No markings found'));
        return;
      }
      
      console.log(chalk.cyan(`\nFound ${markings.length} markings\n`));
      
      for (const marking of markings) {
        displaySingleMarking(marking);
        
        const { action } = await inquirer.prompt([
          {
            type: 'list',
            name: 'action',
            message: 'What would you like to do?',
            choices: [
              { name: 'Next', value: 'next' },
              { name: 'Mark as fixed', value: 'fix' },
              { name: 'Ignore', value: 'ignore' },
              { name: 'Create refactoring', value: 'refactor' },
              { name: 'Exit', value: 'exit' }
            ]
          }
        ]);
        
        switch (action) {
          case 'fix':
            await markAsFixed(marking.id);
            break;
          case 'ignore':
            await markAsIgnored(marking.id);
            break;
          case 'refactor':
            await createRefactoring(fileId, [marking.id]);
            break;
          case 'exit':
            return;
        }
      }
      
      console.log(chalk.green('\nReview completed!'));
    } catch (error: any) {
      console.error(chalk.red('Review failed'));
      console.error(error.response?.data || error.message);
      process.exit(1);
    }
  });

// Batch analyze
program
  .command('batch')
  .description('Batch analyze multiple files')
  .option('-p, --pattern <pattern>', 'File pattern to analyze')
  .option('-l, --language <language>', 'Filter by language')
  .action(async (options) => {
    const spinner = ora('Finding files...').start();
    
    try {
      // Search for files
      const searchResponse = await axios.get(`${API_URL}/api/v1/index/search`, {
        params: {
          pattern: options.pattern || '*',
          language: options.language,
          limit: 1000
        }
      });
      
      const files = searchResponse.data;
      spinner.succeed(chalk.green(`Found ${files.length} files`));
      
      if (files.length === 0) {
        return;
      }
      
      // Analyze each file
      console.log(chalk.cyan('\nAnalyzing files...\n'));
      
      let analyzed = 0;
      let totalMarkings = 0;
      
      for (const file of files) {
        const fileSpinner = ora(`Analyzing ${file.relativePath}...`).start();
        
        try {
          await axios.post(`${API_URL}/api/v1/markings/analyze`, {
            fileId: file.id,
            options: {
              detectDuplicates: true,
              analyzeComplexity: true,
              checkPatterns: true,
              checkSecurity: true,
              checkUnused: true,
              checkNaming: true
            }
          });
          
          // Get marking count
          const markingsResponse = await axios.get(`${API_URL}/api/v1/markings/file/${file.id}`);
          const markings = markingsResponse.data;
          
          analyzed++;
          totalMarkings += markings.length;
          
          fileSpinner.succeed(chalk.green(`✓ ${file.relativePath} (${markings.length} markings)`));
        } catch (error) {
          fileSpinner.fail(chalk.red(`✗ ${file.relativePath}`));
        }
      }
      
      console.log(chalk.cyan('\n📊 Batch Analysis Complete\n'));
      console.log(`Files Analyzed: ${analyzed}/${files.length}`);
      console.log(`Total Markings: ${totalMarkings}`);
      console.log(`Average per File: ${(totalMarkings / analyzed).toFixed(2)}`);
      
    } catch (error: any) {
      spinner.fail(chalk.red('Batch analysis failed'));
      console.error(error.response?.data || error.message);
      process.exit(1);
    }
  });

// Helper function to display markings
async function displayMarkings(fileId: string, options: any = {}) {
  try {
    const params: any = {};
    if (options.severity) params.severity = options.severity;
    if (options.type) params.type = options.type;
    if (options.fixed) params.fixed = true;
    
    const response = await axios.get(`${API_URL}/api/v1/markings/file/${fileId}`, { params });
    const markings = response.data;
    
    if (markings.length === 0) {
      console.log(chalk.yellow('No markings found'));
      return;
    }
    
    console.log(chalk.cyan(`\n🔍 Found ${markings.length} markings:\n`));
    
    // Group by severity
    const bySeverity: any = {};
    markings.forEach((m: any) => {
      if (!bySeverity[m.severity]) {
        bySeverity[m.severity] = [];
      }
      bySeverity[m.severity].push(m);
    });
    
    // Display by severity
    const severityOrder = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];
    
    for (const severity of severityOrder) {
      const severityMarkings = bySeverity[severity];
      if (!severityMarkings) continue;
      
      console.log(colorSeverity(severity) + ` (${severityMarkings.length})`);
      
      for (const marking of severityMarkings) {
        console.log(`  ${marking.type} at line ${marking.line}: ${marking.message}`);
        if (marking.suggestion) {
          console.log(chalk.gray(`    💡 ${marking.suggestion}`));
        }
      }
      console.log();
    }
  } catch (error: any) {
    console.error(chalk.red('Failed to get markings'));
    console.error(error.response?.data || error.message);
    process.exit(1);
  }
}

// Helper function to display single marking
function displaySingleMarking(marking: any) {
  console.log(chalk.cyan('─'.repeat(60)));
  console.log(`${colorSeverity(marking.severity)} ${marking.type}`);
  console.log(`📍 Line ${marking.line}${marking.column ? `:${marking.column}` : ''}`);
  console.log(`📝 ${marking.message}`);
  if (marking.suggestion) {
    console.log(chalk.gray(`💡 ${marking.suggestion}`));
  }
  if (marking.autoFixable) {
    console.log(chalk.green('✨ Auto-fix available'));
  }
  console.log(chalk.cyan('─'.repeat(60)));
}

// Helper function to color severity
function colorSeverity(severity: string): string {
  switch (severity) {
    case 'CRITICAL':
      return chalk.red.bold(severity);
    case 'HIGH':
      return chalk.red(severity);
    case 'MEDIUM':
      return chalk.yellow(severity);
    case 'LOW':
      return chalk.blue(severity);
    case 'INFO':
      return chalk.gray(severity);
    default:
      return severity;
  }
}

// Helper functions for actions
async function markAsFixed(markingId: string) {
  // Implementation would call API to mark as fixed
  console.log(chalk.green(`Marked as fixed: ${markingId}`));
}

async function markAsIgnored(markingId: string) {
  // Implementation would call API to mark as ignored
  console.log(chalk.yellow(`Marked as ignored: ${markingId}`));
}

async function createRefactoring(fileId: string, markingIds: string[]) {
  try {
    const response = await axios.post(`${API_URL}/api/v1/refactoring/plan`, {
      fileId,
      markingIds
    });
    console.log(chalk.green('Refactoring plan created'));
  } catch (error) {
    console.error(chalk.red('Failed to create refactoring'));
  }
}

program.parse();