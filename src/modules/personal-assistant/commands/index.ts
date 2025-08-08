import { helpCommand } from './help.command';
import { taskAddCommand, taskListCommand, taskCompleteCommand } from './task.commands';
import { reminderSetCommand, reminderListCommand, reminderDeleteCommand } from './reminder.commands';
import { noteCreateCommand, noteListCommand, noteSearchCommand, noteDeleteCommand } from './note.commands';
import { aiCodeCommand, aiExplainCommand, aiDebugCommand, aiAnalyzeCommand, aiChatCommand } from './ai.commands';
import { Command } from '../types';

export const commands: Command[] = [
  helpCommand,
  // Task commands
  taskAddCommand,
  taskListCommand,
  taskCompleteCommand,
  // Reminder commands
  reminderSetCommand,
  reminderListCommand,
  reminderDeleteCommand,
  // Note commands
  noteCreateCommand,
  noteListCommand,
  noteSearchCommand,
  noteDeleteCommand,
  // AI commands
  aiCodeCommand,
  aiExplainCommand,
  aiDebugCommand,
  aiAnalyzeCommand,
  aiChatCommand
];

export function registerAllCommands(registry: any): void {
  commands.forEach(command => {
    registry.register(command);
  });
}