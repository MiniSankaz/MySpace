// Mock Claude Service for testing without API key
import { logger } from "../utils/logger";
import { ChatMessage } from "../types";
import { v4 as uuidv4 } from "uuid";

export interface ClaudeResponse {
  id: string;
  content: string;
  role: "assistant";
  model: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
  timestamp: Date;
}

export class MockClaudeService {
  private readonly model: string = "mock-claude-model";
  private readonly maxTokens: number = 4096;

  constructor() {
    logger.info("Using Mock Claude Service for testing");
  }

  async chat(
    messages: ChatMessage[],
    systemPrompt?: string,
  ): Promise<ClaudeResponse> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    const userMessage = messages[messages.length - 1]?.content || "";

    // Generate mock response
    const mockResponse = `This is a mock response to: "${userMessage}". 
    The AI Assistant service is running in test mode without a real Claude API key.
    This allows testing of the service infrastructure.`;

    return {
      id: uuidv4(),
      content: mockResponse,
      role: "assistant",
      model: this.model,
      usage: {
        input_tokens: userMessage.length,
        output_tokens: mockResponse.length,
      },
      timestamp: new Date(),
    };
  }

  async *streamChat(
    messages: ChatMessage[],
    systemPrompt?: string,
  ): AsyncGenerator<any> {
    const response = await this.chat(messages, systemPrompt);

    // Simulate streaming
    const words = response.content.split(" ");
    for (const word of words) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      yield {
        type: "content_block_delta",
        delta: { text: word + " " },
      };
    }

    yield {
      type: "message_stop",
      message: {
        id: response.id,
        usage: response.usage,
      },
    };
  }

  async validateApiKey(): Promise<boolean> {
    return true; // Mock always returns true
  }

  getAvailableModels(): string[] {
    return ["mock-claude-model"];
  }

  getConfig(): any {
    return {
      model: this.model,
      maxTokens: this.maxTokens,
      apiKey: "mock-key",
    };
  }
}
