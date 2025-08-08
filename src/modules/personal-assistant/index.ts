export * from './types';
export * from './services/assistant.service';
export * from './services/command-registry';
export * from './services/context-manager';
export * from './services/nlp-processor';
export * from './commands';

import { AssistantService } from './services/assistant.service';
import { commands } from './commands';

let assistantInstance: AssistantService | null = null;

export function getAssistantInstance(): AssistantService {
  if (!assistantInstance) {
    assistantInstance = new AssistantService();
    // Register all commands
    commands.forEach(command => {
      assistantInstance!.registerCommand(command);
    });
  }
  return assistantInstance;
}