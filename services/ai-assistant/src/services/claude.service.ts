import Anthropic from "@anthropic-ai/sdk";
import { logger } from "../utils/logger";
import { ChatMessage, ChatSession } from "../types";
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

export interface ClaudeStreamChunk {
  type:
    | "message_start"
    | "content_block_start"
    | "content_block_delta"
    | "content_block_stop"
    | "message_delta"
    | "message_stop";
  delta?: {
    text?: string;
    usage?: {
      output_tokens?: number;
    };
  };
  message?: {
    id: string;
    usage?: {
      input_tokens: number;
      output_tokens: number;
    };
  };
}

export class ClaudeService {
  private anthropic: Anthropic;
  private readonly model: string;
  private readonly maxTokens: number;

  constructor() {
    const apiKey =
      process.env.CLAUDE_API_KEY || "sk-ant-api03-placeholder-key-for-testing";

    // Log warning if using placeholder key
    if (!process.env.CLAUDE_API_KEY) {
      logger.warn("CLAUDE_API_KEY not set, using placeholder key for testing");
    }

    this.anthropic = new Anthropic({
      apiKey,
    });

    this.model = process.env.CLAUDE_MODEL || "claude-3-sonnet-20240229";
    this.maxTokens = parseInt(process.env.MAX_TOKENS || "4096", 10);

    logger.info(`Claude service initialized with model: ${this.model}`);
  }

  /**
   * Send a single message to Claude and get a complete response
   */
  async chat(
    messages: ChatMessage[],
    systemPrompt?: string,
  ): Promise<ClaudeResponse> {
    try {
      const anthropicMessages = this.formatMessagesForAnthropic(messages);

      const requestOptions: any = {
        model: this.model,
        max_tokens: this.maxTokens,
        messages: anthropicMessages,
      };

      if (systemPrompt) {
        requestOptions.system = systemPrompt;
      }

      logger.debug("Sending request to Claude:", {
        model: this.model,
        messageCount: anthropicMessages.length,
        systemPrompt: !!systemPrompt,
      });

      const response = await this.anthropic.messages.create(requestOptions);

      const content = response.content
        .filter((block) => block.type === "text")
        .map((block: any) => block.text)
        .join("");

      const claudeResponse: ClaudeResponse = {
        id: response.id,
        content,
        role: "assistant",
        model: response.model,
        usage: {
          input_tokens: response.usage.input_tokens,
          output_tokens: response.usage.output_tokens,
        },
        timestamp: new Date(),
      };

      logger.info("Claude response received:", {
        id: response.id,
        model: response.model,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        contentLength: content.length,
      });

      return claudeResponse;
    } catch (error: any) {
      logger.error("Claude API error:", error);

      // Handle specific Claude API errors
      if (error.status === 400) {
        throw new Error(`Claude API Bad Request: ${error.message}`);
      } else if (error.status === 401) {
        throw new Error("Claude API: Invalid API key");
      } else if (error.status === 429) {
        throw new Error("Claude API: Rate limit exceeded");
      } else if (error.status >= 500) {
        throw new Error("Claude API: Service temporarily unavailable");
      }

      throw new Error(`Claude API error: ${error.message}`);
    }
  }

  /**
   * Stream a chat response from Claude
   */
  async *streamChat(
    messages: ChatMessage[],
    systemPrompt?: string,
  ): AsyncGenerator<ClaudeStreamChunk, void, unknown> {
    try {
      const anthropicMessages = this.formatMessagesForAnthropic(messages);

      const requestOptions: any = {
        model: this.model,
        max_tokens: this.maxTokens,
        messages: anthropicMessages,
        stream: true,
      };

      if (systemPrompt) {
        requestOptions.system = systemPrompt;
      }

      logger.debug("Starting Claude stream:", {
        model: this.model,
        messageCount: anthropicMessages.length,
        systemPrompt: !!systemPrompt,
      });

      const stream = (await this.anthropic.messages.create(
        requestOptions,
      )) as any;

      for await (const chunk of stream) {
        yield {
          type: chunk.type as any,
          delta: chunk.delta,
          message: chunk.message,
        };
      }

      logger.debug("Claude stream completed");
    } catch (error: any) {
      logger.error("Claude streaming error:", error);
      throw new Error(`Claude streaming error: ${error.message}`);
    }
  }

  /**
   * Format messages for Anthropic API
   */
  private formatMessagesForAnthropic(
    messages: ChatMessage[],
  ): Array<{ role: "user" | "assistant"; content: string }> {
    return messages
      .filter((msg) => msg.role !== "system")
      .map((msg) => ({
        role: msg.role === "user" ? "user" : "assistant",
        content: msg.content,
      }));
  }

  /**
   * Get available models
   */
  getAvailableModels(): string[] {
    return [
      "claude-3-5-sonnet-20241022",
      "claude-3-5-haiku-20241022",
      "claude-3-opus-20240229",
      "claude-3-sonnet-20240229",
      "claude-3-haiku-20240307",
    ];
  }

  /**
   * Validate API key
   */
  async validateApiKey(): Promise<boolean> {
    try {
      const testMessages = [{ role: "user" as const, content: "Hello" }];
      await this.anthropic.messages.create({
        model: "claude-3-haiku-20240307",
        max_tokens: 10,
        messages: testMessages,
      });
      return true;
    } catch (error) {
      logger.error("Claude API key validation failed:", error);
      return false;
    }
  }

  /**
   * Get current configuration
   */
  getConfig() {
    return {
      model: this.model,
      maxTokens: this.maxTokens,
      hasApiKey: !!process.env.CLAUDE_API_KEY,
    };
  }
}
