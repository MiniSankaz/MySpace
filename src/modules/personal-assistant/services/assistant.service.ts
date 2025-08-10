import { 
  Message, 
  AssistantContext, 
  AssistantResponse,
  Command 
} from '../types';
import { CommandRegistry } from './command-registry';
import { ContextManager } from './context-manager';
import { NLPProcessor } from './nlp-processor';
import { ClaudeAIService } from './claude-ai.service';
import { assistantLogger } from '@/services/assistant-logging.service';

export class AssistantService {
  private commandRegistry: CommandRegistry;
  private contextManager: ContextManager;
  private nlpProcessor: NLPProcessor;
  private claudeAI: ClaudeAIService;
  private aiEnabled: boolean = false;

  constructor() {
    this.commandRegistry = new CommandRegistry();
    this.contextManager = new ContextManager();
    this.nlpProcessor = new NLPProcessor();
    this.claudeAI = ClaudeAIService.getInstance();
    
    // Initialize Claude AI in background
    this.initializeAI();
  }
  
  private async initializeAI(): Promise<void> {
    try {
      await this.claudeAI.initialize();
      this.aiEnabled = true;
      console.log('Claude AI initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Claude AI:', error);
      this.aiEnabled = false;
    }
  }

  async processMessage(
    userId: string,
    sessionId: string,
    message: string
  ): Promise<AssistantResponse> {
    const context = await this.contextManager.getContext(userId, sessionId);
    
    const userMessage: Message = {
      id: this.generateId(),
      userId,
      content: message,
      type: 'user',
      timestamp: new Date()
    };
    
    context.conversation.push(userMessage);
    
    const intent = await this.nlpProcessor.extractIntent(message);
    
    if (intent.command) {
      const command = this.commandRegistry.getCommand(intent.command);
      if (command) {
        const response = await command.handler(context, intent.parameters);
        await this.saveAssistantMessage(context, response.message);
        return response;
      }
    }
    
    const fallbackResponse = await this.generateFallbackResponse(message, context);
    await this.saveAssistantMessage(context, fallbackResponse.message);
    return fallbackResponse;
  }

  private async saveAssistantMessage(
    context: AssistantContext,
    message: string
  ): Promise<void> {
    const assistantMessage: Message = {
      id: this.generateId(),
      userId: context.userId,
      content: message,
      type: 'assistant',
      timestamp: new Date()
    };
    
    // Add to in-memory context
    context.conversation.push(assistantMessage);
    
    // Also save to database via AssistantLogger
    try {
      // Ensure session exists (defensive programming)
      await assistantLogger.createSession({
        sessionId: context.sessionId,
        userId: context.userId,
        sessionName: `Chat - ${new Date().toLocaleString()}`,
        model: 'claude-assistant'
      }).catch(() => {
        // Session likely already exists
      });
      
      await assistantLogger.logMessage({
        sessionId: context.sessionId,
        role: 'assistant',
        content: message,
        userId: context.userId,
        projectId: null
      });
    } catch (error) {
      console.error('Failed to log assistant message:', error);
    }
    
    // Keep the context save for in-memory management - DISABLED
    // Context is saved through assistant-logging.service.ts now
    // await this.contextManager.saveContext(context);
  }

  private async generateFallbackResponse(
    message: string,
    context: AssistantContext
  ): Promise<AssistantResponse> {
    // ถ้ามี AI ให้ใช้ Claude ช่วยตอบ
    if (this.aiEnabled && this.shouldUseAI(message)) {
      try {
        // Include conversation history for context
        const conversationHistory = context.conversation.slice(-10).map(msg => ({
          role: msg.type === 'user' ? 'user' as const : 'assistant' as const,
          content: msg.content
        }));
        
        const aiResponse = await this.claudeAI.sendMessage(message, [
          {
            role: 'system',
            content: 'You are a helpful AI assistant integrated into a personal assistant system. Help users with coding, technical questions, and general tasks. Respond in Thai if the user writes in Thai. You have access to the conversation history to maintain context.'
          },
          ...conversationHistory
        ]);
        
        return {
          message: aiResponse.content,
          suggestions: this.commandRegistry.getSuggestions(message),
          data: { source: 'claude-ai', model: aiResponse.model }
        };
      } catch (error) {
        console.error('AI response failed:', error);
      }
    }
    
    const suggestions = this.commandRegistry.getSuggestions(message);
    
    return {
      message: `I understand you said: "${message}". How can I help you today?`,
      suggestions: suggestions.length > 0 ? suggestions : [
        'help - Show available commands',
        'task add - Add a new task',
        'reminder set - Set a reminder',
        'note create - Create a new note'
      ]
    };
  }
  
  private shouldUseAI(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    
    // ใช้ AI สำหรับคำถามที่ซับซ้อนหรือต้องการความช่วยเหลือด้านโค้ด
    const aiTriggers = [
      'code', 'โค้ด', 'function', 'ฟังก์ชัน',
      'explain', 'อธิบาย', 'debug', 'fix',
      'error', 'ข้อผิดพลาด', 'how to', 'วิธี',
      'what is', 'คืออะไร', 'implement', 'สร้าง',
      'help me', 'ช่วย', 'ai', 'claude'
    ];
    
    return aiTriggers.some(trigger => lowerMessage.includes(trigger));
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  registerCommand(command: Command): void {
    this.commandRegistry.register(command);
  }

  async getConversationHistory(
    userId: string,
    sessionId: string
  ): Promise<Message[]> {
    const context = await this.contextManager.getContext(userId, sessionId);
    return context.conversation;
  }

  async getConversationHistoryBySessionId(
    sessionId: string
  ): Promise<Message[]> {
    // Load directly from database by sessionId only
    return await this.contextManager.getConversationBySessionId(sessionId);
  }

  async sendDirectToClaude(
    userId: string,
    sessionId: string,
    message: string
  ): Promise<AssistantResponse> {
    const context = await this.contextManager.getContext(userId, sessionId);
    
    // Save user message
    const userMessage: Message = {
      id: this.generateId(),
      userId,
      content: message,
      type: 'user',
      timestamp: new Date()
    };
    
    // Don't push the message yet, we'll do it after getting response
    
    try {
      // Prepare conversation history (before adding current message)
      const conversationHistory = context.conversation.slice(-10).map(msg => ({
        role: msg.type === 'user' ? 'user' as const : 'assistant' as const,
        content: msg.content
      }));
      
      // Ensure session exists before logging message
      try {
        // Create or verify session first
        await assistantLogger.createSession({
          sessionId: sessionId,
          userId: userId,
          sessionName: `Direct Chat - ${new Date().toLocaleString()}`,
          model: 'claude-direct'
        }).catch(() => {
          // Session might already exist, that's fine
        });
        
        // Now log the message
        await assistantLogger.logMessage({
          sessionId: sessionId,
          role: 'user',
          content: message,
          userId: userId,
          projectId: null
        });
      } catch (error) {
        console.error('Failed to log user message:', error);
      }
      
      // Send directly to Claude with session and full context
      const claudeResponse = await this.claudeAI.sendMessageWithSession(message, sessionId, [
        {
          role: 'system',
          content: 'You are Claude, a helpful AI assistant. Respond naturally in the same language as the user. If they write in Thai, respond in Thai. If they write in English, respond in English. Be conversational and helpful. You have access to the conversation history to maintain context.'
        },
        ...conversationHistory
      ], userId);
      
      // Now add both messages to context
      context.conversation.push(userMessage);

      const response: AssistantResponse = {
        message: claudeResponse.content,
        suggestions: [],
        data: {
          source: 'claude-direct',
          model: claudeResponse.model
        }
      };

      // Save assistant message - DISABLED to prevent duplicate logging
      // Message is already saved in assistant-logging.service.ts
      // await this.saveAssistantMessage(context, response.message);
      
      return response;
    } catch (error) {
      console.error('Error sending to Claude:', error);
      
      // Fallback response
      const fallbackResponse: AssistantResponse = {
        message: 'ขออภัย ไม่สามารถติดต่อ Claude ได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง',
        suggestions: ['help', 'task list', 'note create']
      };
      
      // DISABLED - already logged in assistant-logging.service.ts
      // await this.saveAssistantMessage(context, fallbackResponse.message);
      return fallbackResponse;
    }
  }
}