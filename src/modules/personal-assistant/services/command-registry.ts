import { Command } from '../types';

export class CommandRegistry {
  private commands: Map<string, Command> = new Map();
  private aliases: Map<string, string> = new Map();

  register(command: Command): void {
    this.commands.set(command.name.toLowerCase(), command);
    
    if (command.aliases) {
      command.aliases.forEach(alias => {
        this.aliases.set(alias.toLowerCase(), command.name.toLowerCase());
      });
    }
  }

  getCommand(name: string): Command | undefined {
    const normalizedName = name.toLowerCase();
    const commandName = this.aliases.get(normalizedName) || normalizedName;
    return this.commands.get(commandName);
  }

  getAllCommands(): Command[] {
    return Array.from(this.commands.values());
  }

  getSuggestions(input: string): string[] {
    const normalizedInput = input.toLowerCase();
    const suggestions: string[] = [];
    
    this.commands.forEach((command, name) => {
      if (name.includes(normalizedInput) || 
          command.description.toLowerCase().includes(normalizedInput)) {
        suggestions.push(`${command.name} - ${command.description}`);
      }
    });
    
    return suggestions.slice(0, 5);
  }

  hasCommand(name: string): boolean {
    const normalizedName = name.toLowerCase();
    return this.commands.has(normalizedName) || this.aliases.has(normalizedName);
  }
}