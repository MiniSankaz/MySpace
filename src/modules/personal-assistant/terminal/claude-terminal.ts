#!/usr/bin/env node

import readline from 'readline';
import { spawn, ChildProcess } from 'child_process';
import chalk from 'chalk';
import ora from 'ora';

export class ClaudeTerminal {
  private rl: readline.Interface;
  private claudeProcess: ChildProcess | null = null;
  private isRunning: boolean = false;
  private spinner: any;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: chalk.cyan('claude> ')
    });
    
    this.setupTerminal();
  }

  private setupTerminal(): void {
    console.clear();
    console.log(chalk.bold.blue('╔══════════════════════════════════════════╗'));
    console.log(chalk.bold.blue('║     Claude AI Terminal Interface        ║'));
    console.log(chalk.bold.blue('║     Type "help" for commands            ║'));
    console.log(chalk.bold.blue('╚══════════════════════════════════════════╝'));
    console.log();

    this.rl.prompt();

    this.rl.on('line', async (line) => {
      const command = line.trim();
      
      if (command === 'exit' || command === 'quit') {
        this.exit();
        return;
      }
      
      if (command === 'help') {
        this.showHelp();
        this.rl.prompt();
        return;
      }
      
      if (command === 'status') {
        this.showStatus();
        this.rl.prompt();
        return;
      }
      
      if (command.startsWith('!')) {
        // Execute system command
        this.executeSystemCommand(command.substring(1));
        return;
      }
      
      // Send to Claude
      await this.sendToClaude(command);
    });

    this.rl.on('close', () => {
      this.exit();
    });
  }

  private showHelp(): void {
    console.log(chalk.yellow('\n📚 Available Commands:'));
    console.log(chalk.green('  help      ') + '- Show this help message');
    console.log(chalk.green('  status    ') + '- Show Claude connection status');
    console.log(chalk.green('  clear     ') + '- Clear the screen');
    console.log(chalk.green('  !command  ') + '- Execute system command');
    console.log(chalk.green('  exit/quit ') + '- Exit the terminal');
    console.log(chalk.yellow('\n💡 Tips:'));
    console.log('  • Just type your question to chat with Claude');
    console.log('  • Use "code:" prefix for code generation');
    console.log('  • Use "explain:" prefix for explanations');
    console.log('  • Use "debug:" prefix for debugging help\n');
  }

  private showStatus(): void {
    console.log(chalk.yellow('\n📊 Status:'));
    console.log(`  Claude Process: ${this.claudeProcess ? chalk.green('Running') : chalk.red('Not Running')}`);
    console.log(`  Terminal Active: ${chalk.green('Yes')}`);
    console.log(`  API Key: ${process.env.CLAUDE_API_KEY ? chalk.green('Set') : chalk.yellow('Not Set (using local mode)')}`);
    console.log();
  }

  private async sendToClaude(message: string): Promise<void> {
    this.spinner = ora('Thinking...').start();
    
    try {
      // Check for special prefixes
      let processedMessage = message;
      let mode = 'chat';
      
      if (message.startsWith('code:')) {
        processedMessage = `Generate code for: ${message.substring(5)}`;
        mode = 'code';
      } else if (message.startsWith('explain:')) {
        processedMessage = `Explain: ${message.substring(8)}`;
        mode = 'explain';
      } else if (message.startsWith('debug:')) {
        processedMessage = `Debug this: ${message.substring(6)}`;
        mode = 'debug';
      }
      
      // Simulate Claude response (replace with actual Claude API call)
      const response = await this.getClaudeResponse(processedMessage, mode);
      
      this.spinner.succeed('Response received');
      
      // Display response with formatting
      console.log();
      if (mode === 'code') {
        console.log(chalk.cyan('```'));
        console.log(chalk.white(response));
        console.log(chalk.cyan('```'));
      } else {
        console.log(chalk.white(response));
      }
      console.log();
      
    } catch (error) {
      this.spinner.fail('Failed to get response');
      console.error(chalk.red('Error:'), error);
    }
    
    this.rl.prompt();
  }

  private async getClaudeResponse(message: string, mode: string): Promise<string> {
    // This would be replaced with actual Claude API call
    // For now, return a mock response
    return new Promise((resolve) => {
      setTimeout(() => {
        if (mode === 'code') {
          resolve(`function example() {\n  console.log("This is generated code");\n  return true;\n}`);
        } else if (mode === 'explain') {
          resolve('This is an explanation of the concept you asked about. Claude would provide detailed information here.');
        } else if (mode === 'debug') {
          resolve('Here\'s the debugging solution: Check your variables and ensure proper error handling.');
        } else {
          resolve(`I understand you're asking about: "${message}". Here's my response...`);
        }
      }, 1500);
    });
  }

  private executeSystemCommand(command: string): void {
    const child = spawn(command, [], { shell: true });
    
    child.stdout.on('data', (data) => {
      console.log(chalk.gray(data.toString()));
    });
    
    child.stderr.on('data', (data) => {
      console.error(chalk.red(data.toString()));
    });
    
    child.on('close', (code) => {
      if (code !== 0) {
        console.log(chalk.yellow(`Command exited with code ${code}`));
      }
      this.rl.prompt();
    });
  }

  private exit(): void {
    console.log(chalk.blue('\n👋 Goodbye!'));
    if (this.claudeProcess) {
      this.claudeProcess.kill();
    }
    process.exit(0);
  }

  public start(): void {
    this.isRunning = true;
  }
}

// Run if executed directly
if (require.main === module) {
  const terminal = new ClaudeTerminal();
  terminal.start();
}