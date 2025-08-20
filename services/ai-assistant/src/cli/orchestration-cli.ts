#!/usr/bin/env node

/**
 * Orchestration CLI
 * Command-line interface for AI orchestration system
 */

import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import Table from 'cli-table3';
import ora from 'ora';
import { OrchestrationClient } from '../services/ai-orchestration/orchestration-client';
import { AgentType, AgentStatus } from '../services/ai-orchestration/agent-spawner.service';
import { ResourceType } from '../services/ai-orchestration/resource-lock-manager.service';

const program = new Command();
const client = new OrchestrationClient();

// Utility functions
const formatDuration = (ms: number): string => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
};

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'working':
      return chalk.green(status);
    case 'completed':
      return chalk.blue(status);
    case 'failed':
      return chalk.red(status);
    case 'waiting_approval':
      return chalk.yellow(status);
    default:
      return chalk.gray(status);
  }
};

// Configure program
program
  .name('orchestrate')
  .description('AI Orchestration CLI - Manage AI agents and tasks')
  .version('1.0.0');

// Agent commands
const agentCmd = program
  .command('agent')
  .description('Manage AI agents');

agentCmd
  .command('spawn')
  .description('Spawn a new AI agent')
  .option('-t, --type <type>', 'Agent type', 'general-purpose')
  .option('-m, --model <model>', 'Model to use (opus/sonnet/haiku)', 'sonnet')
  .option('--task <task>', 'Task description')
  .option('--prompt <prompt>', 'Task prompt')
  .option('--approval', 'Require approval for critical actions')
  .action(async (options) => {
    const spinner = ora('Spawning agent...').start();
    
    try {
      const agent = await client.spawnAgent(
        {
          type: options.type as AgentType,
          model: options.model,
          requiresApproval: options.approval
        },
        options.task ? {
          id: Date.now().toString(),
          description: options.task,
          prompt: options.prompt || options.task
        } : undefined
      );
      
      spinner.succeed(chalk.green(`Agent spawned successfully!`));
      console.log(chalk.gray(`Agent ID: ${agent.id}`));
      console.log(chalk.gray(`Type: ${agent.type}`));
      console.log(chalk.gray(`Status: ${agent.status}`));
    } catch (error) {
      spinner.fail(chalk.red('Failed to spawn agent'));
      console.error(error);
      process.exit(1);
    }
  });

agentCmd
  .command('list')
  .description('List all active agents')
  .action(async () => {
    const spinner = ora('Fetching agents...').start();
    
    try {
      const agents = await client.getAgents();
      spinner.stop();
      
      if (agents.length === 0) {
        console.log(chalk.yellow('No active agents'));
        return;
      }
      
      const table = new Table({
        head: ['ID', 'Type', 'Status', 'Task', 'Uptime'],
        style: { head: ['cyan'] }
      });
      
      agents.forEach(agent => {
        const uptime = formatDuration(
          Date.now() - new Date(agent.startTime).getTime()
        );
        
        table.push([
          agent.id.slice(0, 8),
          agent.type,
          getStatusColor(agent.status),
          agent.task?.description || '-',
          uptime
        ]);
      });
      
      console.log(table.toString());
    } catch (error) {
      spinner.fail(chalk.red('Failed to fetch agents'));
      console.error(error);
      process.exit(1);
    }
  });

agentCmd
  .command('terminate <agentId>')
  .description('Terminate an agent')
  .action(async (agentId) => {
    const spinner = ora('Terminating agent...').start();
    
    try {
      const success = await client.terminateAgent(agentId);
      
      if (success) {
        spinner.succeed(chalk.green('Agent terminated successfully'));
      } else {
        spinner.fail(chalk.red('Failed to terminate agent'));
      }
    } catch (error) {
      spinner.fail(chalk.red('Failed to terminate agent'));
      console.error(error);
      process.exit(1);
    }
  });

// Task commands
const taskCmd = program
  .command('task')
  .description('Manage tasks');

taskCmd
  .command('create')
  .description('Create a new task')
  .option('-d, --description <desc>', 'Task description')
  .option('-p, --prompt <prompt>', 'Task prompt')
  .option('--priority <priority>', 'Task priority (1-10)', '5')
  .option('-t, --template <template>', 'Use a template')
  .action(async (options) => {
    let task;
    
    if (options.template) {
      // Use template
      const template = client.getTemplate(options.template);
      if (!template) {
        console.error(chalk.red(`Template '${options.template}' not found`));
        process.exit(1);
      }
      
      // Prompt for template parameters
      const questions = Object.entries(template.parameters)
        .filter(([_, param]) => param.required)
        .map(([key, param]) => ({
          type: param.type === 'boolean' ? 'confirm' : 'input',
          name: key,
          message: param.description || `Enter ${key}:`,
          default: param.default
        }));
      
      const answers = await inquirer.prompt(questions);
      task = client.createTaskFromTemplate(options.template, answers);
    } else {
      // Create custom task
      if (!options.description || !options.prompt) {
        console.error(chalk.red('Description and prompt are required'));
        process.exit(1);
      }
      
      task = {
        id: Date.now().toString(),
        description: options.description,
        prompt: options.prompt,
        priority: parseInt(options.priority)
      };
    }
    
    const spinner = ora('Creating task...').start();
    
    try {
      const queueItem = await client.queueTask(task);
      spinner.succeed(chalk.green('Task created successfully!'));
      console.log(chalk.gray(`Task ID: ${queueItem.id}`));
      console.log(chalk.gray(`Status: ${queueItem.status}`));
    } catch (error) {
      spinner.fail(chalk.red('Failed to create task'));
      console.error(error);
      process.exit(1);
    }
  });

taskCmd
  .command('list')
  .description('List all tasks in queue')
  .action(async () => {
    const tasks = client.getTaskQueue();
    
    if (tasks.length === 0) {
      console.log(chalk.yellow('No tasks in queue'));
      return;
    }
    
    const table = new Table({
      head: ['ID', 'Description', 'Status', 'Priority', 'Progress'],
      style: { head: ['cyan'] }
    });
    
    tasks.forEach(task => {
      table.push([
        task.id.slice(0, 8),
        task.description.slice(0, 40) + (task.description.length > 40 ? '...' : ''),
        getStatusColor(task.status),
        task.priority || 5,
        task.progress ? `${task.progress}%` : '-'
      ]);
    });
    
    console.log(table.toString());
  });

taskCmd
  .command('cancel <taskId>')
  .description('Cancel a task')
  .action(async (taskId) => {
    const spinner = ora('Cancelling task...').start();
    
    try {
      const success = await client.cancelTask(taskId);
      
      if (success) {
        spinner.succeed(chalk.green('Task cancelled successfully'));
      } else {
        spinner.fail(chalk.red('Failed to cancel task'));
      }
    } catch (error) {
      spinner.fail(chalk.red('Failed to cancel task'));
      console.error(error);
      process.exit(1);
    }
  });

// Template commands
const templateCmd = program
  .command('template')
  .description('Manage task templates');

templateCmd
  .command('list')
  .description('List available templates')
  .action(() => {
    const templates = client.getTemplates();
    
    if (templates.length === 0) {
      console.log(chalk.yellow('No templates available'));
      return;
    }
    
    const table = new Table({
      head: ['ID', 'Name', 'Description', 'Agent Type'],
      style: { head: ['cyan'] }
    });
    
    templates.forEach(template => {
      table.push([
        template.id,
        template.name,
        template.description.slice(0, 40) + (template.description.length > 40 ? '...' : ''),
        template.agentType
      ]);
    });
    
    console.log(table.toString());
  });

templateCmd
  .command('show <templateId>')
  .description('Show template details')
  .action((templateId) => {
    const template = client.getTemplate(templateId);
    
    if (!template) {
      console.error(chalk.red(`Template '${templateId}' not found`));
      process.exit(1);
    }
    
    console.log(chalk.cyan('Template Details:'));
    console.log(chalk.gray('ID:'), template.id);
    console.log(chalk.gray('Name:'), template.name);
    console.log(chalk.gray('Description:'), template.description);
    console.log(chalk.gray('Agent Type:'), template.agentType);
    console.log(chalk.gray('Requires Approval:'), template.requiresApproval || false);
    console.log(chalk.gray('Estimated Duration:'), template.estimatedDuration ? formatDuration(template.estimatedDuration) : 'N/A');
    
    console.log('\n' + chalk.cyan('Parameters:'));
    Object.entries(template.parameters).forEach(([key, param]) => {
      console.log(chalk.gray(`  ${key}:`));
      console.log(chalk.gray(`    Type: ${param.type}`));
      console.log(chalk.gray(`    Required: ${param.required || false}`));
      if (param.default !== undefined) {
        console.log(chalk.gray(`    Default: ${param.default}`));
      }
      if (param.description) {
        console.log(chalk.gray(`    Description: ${param.description}`));
      }
    });
    
    console.log('\n' + chalk.cyan('Prompt Template:'));
    console.log(chalk.gray(template.promptTemplate));
  });

// Lock commands
const lockCmd = program
  .command('lock')
  .description('Manage resource locks');

lockCmd
  .command('list')
  .description('List current resource locks')
  .action(async () => {
    const spinner = ora('Fetching locks...').start();
    
    try {
      const locks = await client.getLocks();
      spinner.stop();
      
      if (locks.length === 0) {
        console.log(chalk.yellow('No active locks'));
        return;
      }
      
      const table = new Table({
        head: ['Resource', 'Type', 'Owner', 'Status', 'Expires'],
        style: { head: ['cyan'] }
      });
      
      locks.forEach(lock => {
        const expires = lock.expiresAt
          ? new Date(lock.expiresAt).toLocaleTimeString()
          : 'Never';
        
        table.push([
          lock.resourceId.slice(0, 20),
          lock.resourceType,
          lock.ownerId.slice(0, 8),
          getStatusColor(lock.status),
          expires
        ]);
      });
      
      console.log(table.toString());
    } catch (error) {
      spinner.fail(chalk.red('Failed to fetch locks'));
      console.error(error);
      process.exit(1);
    }
  });

// Stats command
program
  .command('stats')
  .description('Show orchestration statistics')
  .action(async () => {
    const stats = client.getStats();
    const usage = await client.getUsageSummary();
    
    console.log(chalk.cyan('Orchestration Statistics:'));
    console.log(chalk.gray('Active Agents:'), stats.activeAgents);
    console.log(chalk.gray('Queued Tasks:'), stats.queuedTasks);
    console.log(chalk.gray('Completed Tasks:'), stats.completedTasks);
    console.log(chalk.gray('Failed Tasks:'), stats.failedTasks);
    console.log(chalk.gray('Resource Locks:'), stats.resourceLocks);
    
    console.log('\n' + chalk.cyan('Usage Summary:'));
    console.log(chalk.gray('Opus:'), stats.totalUsage.opus, 'tokens');
    console.log(chalk.gray('Sonnet:'), stats.totalUsage.sonnet, 'tokens');
    console.log(chalk.gray('Haiku:'), stats.totalUsage.haiku, 'tokens');
    console.log(chalk.gray('Estimated Cost:'), '$' + stats.estimatedCost.toFixed(2));
    
    if (usage) {
      console.log('\n' + chalk.cyan('Period Usage:'));
      console.log(chalk.gray('Weekly Limit:'), usage.weeklyLimit || 'N/A');
      console.log(chalk.gray('Used This Week:'), usage.weeklyUsed || 0);
      console.log(chalk.gray('Remaining:'), usage.weeklyRemaining || 'N/A');
    }
  });

// Interactive mode
program
  .command('interactive')
  .alias('i')
  .description('Start interactive mode')
  .action(async () => {
    console.log(chalk.cyan('AI Orchestration Interactive Mode'));
    console.log(chalk.gray('Type "help" for available commands or "exit" to quit\n'));
    
    const commands = [
      'agent spawn',
      'agent list',
      'agent terminate',
      'task create',
      'task list',
      'task cancel',
      'template list',
      'lock list',
      'stats',
      'help',
      'exit'
    ];
    
    while (true) {
      const { command } = await inquirer.prompt([
        {
          type: 'list',
          name: 'command',
          message: 'What would you like to do?',
          choices: commands
        }
      ]);
      
      if (command === 'exit') {
        console.log(chalk.green('Goodbye!'));
        process.exit(0);
      }
      
      if (command === 'help') {
        console.log(chalk.cyan('\nAvailable Commands:'));
        commands.forEach(cmd => {
          if (cmd !== 'help' && cmd !== 'exit') {
            console.log(chalk.gray(`  ${cmd}`));
          }
        });
        console.log();
        continue;
      }
      
      // Execute the selected command
      const [category, action] = command.split(' ');
      
      switch (command) {
        case 'agent spawn':
          const spawnAnswers = await inquirer.prompt([
            {
              type: 'list',
              name: 'type',
              message: 'Agent type:',
              choices: Object.values(AgentType)
            },
            {
              type: 'list',
              name: 'model',
              message: 'Model:',
              choices: ['opus', 'sonnet', 'haiku']
            },
            {
              type: 'input',
              name: 'task',
              message: 'Task description (optional):'
            },
            {
              type: 'confirm',
              name: 'approval',
              message: 'Require approval?',
              default: false
            }
          ]);
          
          const spinner = ora('Spawning agent...').start();
          try {
            const agent = await client.spawnAgent(
              {
                type: spawnAnswers.type,
                model: spawnAnswers.model,
                requiresApproval: spawnAnswers.approval
              },
              spawnAnswers.task ? {
                id: Date.now().toString(),
                description: spawnAnswers.task,
                prompt: spawnAnswers.task
              } : undefined
            );
            spinner.succeed(chalk.green('Agent spawned successfully!'));
            console.log(chalk.gray(`Agent ID: ${agent.id}\n`));
          } catch (error) {
            spinner.fail(chalk.red('Failed to spawn agent'));
            console.error(error);
          }
          break;
          
        case 'agent list':
          await agentCmd.parse(['', '', 'list']);
          break;
          
        case 'task list':
          await taskCmd.parse(['', '', 'list']);
          break;
          
        case 'template list':
          await templateCmd.parse(['', '', 'list']);
          break;
          
        case 'lock list':
          await lockCmd.parse(['', '', 'list']);
          break;
          
        case 'stats':
          await program.parse(['', '', 'stats']);
          break;
          
        default:
          console.log(chalk.yellow(`Command '${command}' not yet implemented in interactive mode`));
      }
    }
  });

// Monitor command (real-time monitoring)
program
  .command('monitor')
  .description('Start real-time monitoring')
  .action(() => {
    console.log(chalk.cyan('Real-time Orchestration Monitor'));
    console.log(chalk.gray('Press Ctrl+C to exit\n'));
    
    // Subscribe to events
    client.on('agent:spawned', (agent) => {
      console.log(chalk.green(`[AGENT] Spawned: ${agent.type} (${agent.id.slice(0, 8)})`));
    });
    
    client.on('agent:status', ({ agentId, status }) => {
      console.log(chalk.blue(`[AGENT] Status: ${agentId.slice(0, 8)} → ${status}`));
    });
    
    client.on('agent:terminated', (agentId) => {
      console.log(chalk.red(`[AGENT] Terminated: ${agentId.slice(0, 8)}`));
    });
    
    client.on('task:queued', (task) => {
      console.log(chalk.cyan(`[TASK] Queued: ${task.description} (${task.id.slice(0, 8)})`));
    });
    
    client.on('task:progress', ({ taskId, progress }) => {
      console.log(chalk.yellow(`[TASK] Progress: ${taskId.slice(0, 8)} → ${progress}%`));
    });
    
    client.on('task:completed', ({ taskId }) => {
      console.log(chalk.green(`[TASK] Completed: ${taskId.slice(0, 8)}`));
    });
    
    client.on('task:failed', ({ taskId, error }) => {
      console.log(chalk.red(`[TASK] Failed: ${taskId.slice(0, 8)} - ${error}`));
    });
    
    client.on('approval:required', (approval) => {
      console.log(chalk.yellow(`[APPROVAL] Required: ${approval.description}`));
    });
    
    client.on('usage:update', (usage) => {
      console.log(chalk.magenta(`[USAGE] Update: $${usage.estimatedCost?.toFixed(2) || '0.00'}`));
    });
    
    // Keep the process running
    process.stdin.resume();
  });

// Parse command line arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}