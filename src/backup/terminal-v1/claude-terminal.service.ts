import { ClaudeService } from '@/services/claude.service';

export interface ClaudeCommand {
  type: 'code' | 'explain' | 'fix' | 'refactor' | 'test' | 'document' | 'general';
  command: string;
  context?: {
    currentFile?: string;
    selectedCode?: string;
    projectPath?: string;
    language?: string;
  };
}

export class ClaudeTerminalService {
  private claudeService: ClaudeService;
  private commandHistory: ClaudeCommand[] = [];

  constructor() {
    this.claudeService = new ClaudeService();
  }

  /**
   * Parse and execute Claude commands
   */
  async executeCommand(input: string, context?: any): Promise<string> {
    try {
      const command = this.parseCommand(input);
      command.context = context;
      
      this.commandHistory.push(command);
      
      switch (command.type) {
        case 'code':
          return await this.handleCodeGeneration(command);
        
        case 'explain':
          return await this.handleExplain(command);
        
        case 'fix':
          return await this.handleFix(command);
        
        case 'refactor':
          return await this.handleRefactor(command);
        
        case 'test':
          return await this.handleTestGeneration(command);
        
        case 'document':
          return await this.handleDocumentation(command);
        
        default:
          return await this.handleGeneralQuery(command);
      }
    } catch (error) {
      return `Error: ${error.message}`;
    }
  }

  /**
   * Parse command to determine type and extract parameters
   */
  private parseCommand(input: string): ClaudeCommand {
    const lowerInput = input.toLowerCase().trim();
    
    // Code generation commands
    if (lowerInput.startsWith('create ') || lowerInput.startsWith('generate ') || lowerInput.startsWith('code ')) {
      return {
        type: 'code',
        command: input.replace(/^(create|generate|code)\s+/i, '')
      };
    }
    
    // Explain commands
    if (lowerInput.startsWith('explain ') || lowerInput.startsWith('what is ') || lowerInput.startsWith('how does ')) {
      return {
        type: 'explain',
        command: input.replace(/^(explain|what is|how does)\s+/i, '')
      };
    }
    
    // Fix commands
    if (lowerInput.startsWith('fix ') || lowerInput.startsWith('debug ') || lowerInput.startsWith('solve ')) {
      return {
        type: 'fix',
        command: input.replace(/^(fix|debug|solve)\s+/i, '')
      };
    }
    
    // Refactor commands
    if (lowerInput.startsWith('refactor ') || lowerInput.startsWith('improve ') || lowerInput.startsWith('optimize ')) {
      return {
        type: 'refactor',
        command: input.replace(/^(refactor|improve|optimize)\s+/i, '')
      };
    }
    
    // Test commands
    if (lowerInput.startsWith('test ') || lowerInput.startsWith('write test ')) {
      return {
        type: 'test',
        command: input.replace(/^(write test|test)\s+/i, '')
      };
    }
    
    // Documentation commands
    if (lowerInput.startsWith('document ') || lowerInput.startsWith('add docs ')) {
      return {
        type: 'document',
        command: input.replace(/^(document|add docs)\s+/i, '')
      };
    }
    
    // General query
    return {
      type: 'general',
      command: input
    };
  }

  /**
   * Handle code generation requests
   */
  private async handleCodeGeneration(command: ClaudeCommand): Promise<string> {
    const prompt = `Generate code for: ${command.command}
    
Context:
- Project Path: ${command.context?.projectPath || 'Not specified'}
- Language: ${command.context?.language || 'Auto-detect'}

Requirements:
1. Provide clean, production-ready code
2. Include necessary imports
3. Follow best practices
4. Add brief comments for complex logic`;

    const response = await this.claudeService.sendMessage(prompt);
    return this.formatCodeResponse(response);
  }

  /**
   * Handle explanation requests
   */
  private async handleExplain(command: ClaudeCommand): Promise<string> {
    const prompt = `Explain: ${command.command}
    
${command.context?.selectedCode ? `Code to explain:\n\`\`\`\n${command.context.selectedCode}\n\`\`\`` : ''}

Please provide:
1. Clear explanation of what this does
2. How it works step by step
3. Any important concepts or patterns used`;

    const response = await this.claudeService.sendMessage(prompt);
    return response;
  }

  /**
   * Handle fix/debug requests
   */
  private async handleFix(command: ClaudeCommand): Promise<string> {
    const prompt = `Fix/Debug: ${command.command}
    
${command.context?.selectedCode ? `Code with issue:\n\`\`\`\n${command.context.selectedCode}\n\`\`\`` : ''}

Please:
1. Identify the issue
2. Explain why it's happening
3. Provide the corrected code
4. Suggest how to prevent similar issues`;

    const response = await this.claudeService.sendMessage(prompt);
    return this.formatCodeResponse(response);
  }

  /**
   * Handle refactor requests
   */
  private async handleRefactor(command: ClaudeCommand): Promise<string> {
    const prompt = `Refactor: ${command.command}
    
${command.context?.selectedCode ? `Code to refactor:\n\`\`\`\n${command.context.selectedCode}\n\`\`\`` : ''}

Focus on:
1. Improving code quality and readability
2. Following best practices and patterns
3. Optimizing performance where applicable
4. Maintaining functionality`;

    const response = await this.claudeService.sendMessage(prompt);
    return this.formatCodeResponse(response);
  }

  /**
   * Handle test generation
   */
  private async handleTestGeneration(command: ClaudeCommand): Promise<string> {
    const prompt = `Generate tests for: ${command.command}
    
${command.context?.selectedCode ? `Code to test:\n\`\`\`\n${command.context.selectedCode}\n\`\`\`` : ''}

Requirements:
1. Cover main functionality
2. Include edge cases
3. Use appropriate testing framework
4. Add descriptive test names`;

    const response = await this.claudeService.sendMessage(prompt);
    return this.formatCodeResponse(response);
  }

  /**
   * Handle documentation requests
   */
  private async handleDocumentation(command: ClaudeCommand): Promise<string> {
    const prompt = `Add documentation for: ${command.command}
    
${command.context?.selectedCode ? `Code to document:\n\`\`\`\n${command.context.selectedCode}\n\`\`\`` : ''}

Include:
1. Function/class descriptions
2. Parameter documentation
3. Return value documentation
4. Usage examples if applicable`;

    const response = await this.claudeService.sendMessage(prompt);
    return this.formatCodeResponse(response);
  }

  /**
   * Handle general queries
   */
  private async handleGeneralQuery(command: ClaudeCommand): Promise<string> {
    const prompt = `${command.command}
    
Context: Working in project at ${command.context?.projectPath || 'current directory'}`;

    const response = await this.claudeService.sendMessage(prompt);
    return response;
  }

  /**
   * Format code responses for better display
   */
  private formatCodeResponse(response: string): string {
    // Extract code blocks and format them
    const codeBlockRegex = /```[\s\S]*?```/g;
    let formatted = response;
    
    const codeBlocks = response.match(codeBlockRegex);
    if (codeBlocks) {
      codeBlocks.forEach(block => {
        const cleanBlock = block
          .replace(/```(\w+)?\n/, '--- CODE ---\n')
          .replace(/```$/, '\n--- END CODE ---');
        formatted = formatted.replace(block, cleanBlock);
      });
    }
    
    return formatted;
  }

  /**
   * Get command suggestions based on context
   */
  getSuggestions(partialInput: string): string[] {
    const suggestions = [
      'create component',
      'generate API endpoint',
      'explain this code',
      'fix error',
      'refactor for performance',
      'write tests',
      'document this function',
      'how to implement',
      'what is the best way to',
      'optimize this query',
      'add error handling',
      'implement authentication',
      'create database schema',
      'setup CI/CD pipeline',
    ];
    
    return suggestions
      .filter(s => s.toLowerCase().includes(partialInput.toLowerCase()))
      .slice(0, 5);
  }

  /**
   * Get command history
   */
  getHistory(): ClaudeCommand[] {
    return this.commandHistory.slice(-20);
  }

  /**
   * Clear command history
   */
  clearHistory(): void {
    this.commandHistory = [];
  }
}

export const claudeTerminalService = new ClaudeTerminalService();