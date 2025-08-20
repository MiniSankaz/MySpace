#!/usr/bin/env node

/**
 * CLI for Code Indexing Operations
 */

import { Command } from 'commander';
import axios from 'axios';
import chalk from 'chalk';
import ora from 'ora';
import { table } from 'table';
import * as fs from 'fs';

const API_URL = process.env.CODE_MARKING_API || 'http://localhost:4192';

const program = new Command();

program
  .name('code-index')
  .description('Code indexing CLI')
  .version('1.0.0');

// Build index command
program
  .command('build')
  .description('Build complete code index')
  .option('-f, --force', 'Force re-indexing of all files')
  .option('-s, --symbols', 'Extract symbols')
  .option('-d, --dependencies', 'Detect dependencies')
  .option('-p, --patterns <patterns...>', 'File patterns to index')
  .action(async (options) => {
    const spinner = ora('Starting indexing...').start();
    
    try {
      const response = await axios.post(`${API_URL}/api/v1/index/build`, {
        force: options.force,
        extractSymbols: options.symbols,
        detectDependencies: options.dependencies,
        patterns: options.patterns
      });
      
      spinner.succeed(chalk.green('Indexing started successfully'));
      console.log(chalk.cyan('Status:'), response.data.status);
      
      // Poll for status
      if (options.watch) {
        await watchIndexingStatus();
      }
    } catch (error: any) {
      spinner.fail(chalk.red('Failed to start indexing'));
      console.error(error.response?.data || error.message);
      process.exit(1);
    }
  });

// Index single file
program
  .command('file <path>')
  .description('Index a single file')
  .option('-f, --force', 'Force re-indexing')
  .action(async (filePath, options) => {
    const spinner = ora(`Indexing ${filePath}...`).start();
    
    try {
      await axios.post(`${API_URL}/api/v1/index/file`, {
        filePath,
        options: {
          force: options.force,
          extractSymbols: true,
          detectDependencies: true
        }
      });
      
      spinner.succeed(chalk.green(`File indexed: ${filePath}`));
    } catch (error: any) {
      spinner.fail(chalk.red('Failed to index file'));
      console.error(error.response?.data || error.message);
      process.exit(1);
    }
  });

// Get indexing status
program
  .command('status')
  .description('Get indexing status')
  .action(async () => {
    try {
      const response = await axios.get(`${API_URL}/api/v1/index/status`);
      const status = response.data;
      
      console.log(chalk.cyan('\n📊 Indexing Status\n'));
      console.log(`Status: ${status.isRunning ? chalk.yellow('Running') : chalk.green('Idle')}`);
      console.log(`Total Files: ${status.totalFiles}`);
      console.log(`Indexed: ${chalk.green(status.indexedFiles)}`);
      console.log(`Pending: ${chalk.yellow(status.pendingFiles)}`);
      console.log(`Failed: ${chalk.red(status.failedFiles)}`);
      console.log(`Progress: ${status.progress.toFixed(2)}%`);
      
      if (status.startTime) {
        console.log(`Started: ${new Date(status.startTime).toLocaleString()}`);
      }
    } catch (error: any) {
      console.error(chalk.red('Failed to get status'));
      console.error(error.response?.data || error.message);
      process.exit(1);
    }
  });

// Search files
program
  .command('search <pattern>')
  .description('Search indexed files')
  .option('-l, --language <language>', 'Filter by language')
  .option('-n, --limit <limit>', 'Limit results', '20')
  .action(async (pattern, options) => {
    try {
      const response = await axios.get(`${API_URL}/api/v1/index/search`, {
        params: {
          pattern,
          language: options.language,
          limit: parseInt(options.limit)
        }
      });
      
      const files = response.data;
      
      if (files.length === 0) {
        console.log(chalk.yellow('No files found'));
        return;
      }
      
      console.log(chalk.cyan(`\n📁 Found ${files.length} files:\n`));
      
      const tableData = [
        ['Path', 'Language', 'Lines', 'Size', 'Modified'],
        ...files.map((f: any) => [
          f.relativePath,
          f.language || '-',
          f.lines,
          formatBytes(f.size),
          new Date(f.lastModified).toLocaleDateString()
        ])
      ];
      
      console.log(table(tableData));
    } catch (error: any) {
      console.error(chalk.red('Search failed'));
      console.error(error.response?.data || error.message);
      process.exit(1);
    }
  });

// Get metrics
program
  .command('metrics')
  .description('Get indexing metrics')
  .action(async () => {
    try {
      const response = await axios.get(`${API_URL}/api/v1/index/metrics`);
      const metrics = response.data;
      
      console.log(chalk.cyan('\n📈 Code Metrics\n'));
      console.log(`Total Files: ${chalk.bold(metrics.totalFiles)}`);
      console.log(`Total Lines: ${chalk.bold(metrics.totalLines.toLocaleString())}`);
      console.log(`Total Symbols: ${chalk.bold(metrics.totalSymbols)}`);
      console.log(`Total Dependencies: ${chalk.bold(metrics.totalDependencies)}`);
      
      if (metrics.languages.length > 0) {
        console.log(chalk.cyan('\n🔤 Languages:\n'));
        
        const langData = [
          ['Language', 'Files'],
          ...metrics.languages.map((l: any) => [
            l.language || 'Unknown',
            l.count
          ])
        ];
        
        console.log(table(langData));
      }
    } catch (error: any) {
      console.error(chalk.red('Failed to get metrics'));
      console.error(error.response?.data || error.message);
      process.exit(1);
    }
  });

// Helper function to watch indexing status
async function watchIndexingStatus() {
  const spinner = ora('Watching indexing progress...').start();
  
  const interval = setInterval(async () => {
    try {
      const response = await axios.get(`${API_URL}/api/v1/index/status`);
      const status = response.data;
      
      spinner.text = `Progress: ${status.progress.toFixed(2)}% (${status.indexedFiles}/${status.totalFiles})`;
      
      if (!status.isRunning) {
        spinner.succeed(chalk.green('Indexing completed!'));
        clearInterval(interval);
      }
    } catch (error) {
      spinner.fail(chalk.red('Failed to get status'));
      clearInterval(interval);
    }
  }, 2000);
}

// Helper function to format bytes
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

program.parse();