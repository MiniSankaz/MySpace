# Technical Specification: AI Assistant Claude CLI Integration

## Executive Summary

การออกแบบระบบ AI Assistant Service ที่ใช้ Claude CLI แทน API Key โดยอาศัย Terminal Service ที่มีอยู่เป็นตัวกลางในการ execute คำสั่ง `claude` บนเครื่อง server เพื่อลดความเสี่ยงจากการจัดการ API Key และใช้ประโยชน์จาก Claude CLI ที่ login ไว้แล้วบนเครื่อง server

## System Architecture Overview

### Architecture Diagram (Text-based)

```
┌─────────────────┐                 ┌──────────────────────┐
│                 │   HTTP Request   │                      │
│   Client App    │ ───────────────> │  AI Assistant        │
│   (Browser)     │                  │  Service             │
│                 │ <─────────────── │  (Port 4130)         │
└─────────────────┘   HTTP Response  └──────────────────────┘
                                              │
                                              │ WebSocket
                                              │ Connection
                                              ▼
                                     ┌──────────────────────┐
                                     │                      │
                                     │  Terminal Service    │
                                     │  (Port 4140)         │
                                     │                      │
                                     └──────────────────────┘
                                              │
                                              │ Process Spawn
                                              │ (node-pty)
                                              ▼
                                     ┌──────────────────────┐
                                     │                      │
                                     │  Claude CLI          │
                                     │  (Local Binary)      │
                                     │                      │
                                     └──────────────────────┘
```

### Component Relationships

1. **Client App**: ส่ง HTTP request มาที่ AI Assistant Service
2. **AI Assistant Service**:
   - รับ request จาก client
   - แปลงเป็น WebSocket message
   - ส่งไปยัง Terminal Service
   - รับ response และส่งกลับ client
3. **Terminal Service**:
   - รับคำสั่งผ่าน WebSocket
   - Execute claude CLI command
   - Stream output กลับมาที่ AI Assistant
4. **Claude CLI**:
   - Binary ที่ติดตั้งและ login แล้วบนเครื่อง
   - Process และ generate response

## Detailed Component Specifications

### 1. AI Assistant Service Enhancement

#### 1.1 New Claude CLI Service Module

```typescript
// src/services/claude-cli.service.ts

export interface ClaudeCLIConfig {
  terminalServiceUrl: string;
  terminalServicePort: number;
  commandTimeout: number;
  maxRetries: number;
  streamingEnabled: boolean;
}

export interface ClaudeCLISession {
  id: string;
  terminalSessionId: string;
  status: "initializing" | "ready" | "processing" | "error" | "closed";
  createdAt: Date;
  lastActivity: Date;
  messageCount: number;
}

export interface ClaudeCLIRequest {
  prompt: string;
  sessionId?: string;
  context?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface ClaudeCLIResponse {
  content: string;
  sessionId: string;
  commandExecuted: string;
  executionTime: number;
  tokens?: {
    input: number;
    output: number;
  };
}

export class ClaudeCLIService {
  private wsConnection: WebSocket | null = null;
  private sessions: Map<string, ClaudeCLISession>;
  private responseBuffers: Map<string, string>;
  private responseResolvers: Map<string, Function>;
  private streamCallbacks: Map<string, (chunk: string) => void>;

  constructor(private config: ClaudeCLIConfig) {
    this.sessions = new Map();
    this.responseBuffers = new Map();
    this.responseResolvers = new Map();
    this.streamCallbacks = new Map();
  }

  async initialize(): Promise<void>;
  async createSession(): Promise<ClaudeCLISession>;
  async sendPrompt(request: ClaudeCLIRequest): Promise<ClaudeCLIResponse>;
  async streamPrompt(request: ClaudeCLIRequest): AsyncGenerator<string>;
  async closeSession(sessionId: string): Promise<void>;
  private connectToTerminal(): Promise<void>;
  private executeClaudeCommand(
    prompt: string,
    sessionId: string,
  ): Promise<string>;
  private parseClaudeOutput(output: string): ClaudeCLIResponse;
  private handleStreamChunk(sessionId: string, chunk: string): void;
  private validateClaudeAvailability(): Promise<boolean>;
}
```

#### 1.2 WebSocket Handler Module

```typescript
// src/services/terminal-websocket.service.ts

export interface TerminalWebSocketConfig {
  url: string;
  reconnectDelay: number;
  maxReconnectAttempts: number;
  heartbeatInterval: number;
}

export class TerminalWebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts: number = 0;
  private heartbeatTimer: NodeJS.Timer | null = null;
  private messageQueue: Map<string, QueuedMessage>;

  constructor(private config: TerminalWebSocketConfig) {
    this.messageQueue = new Map();
  }

  async connect(): Promise<void>;
  async disconnect(): Promise<void>;
  async sendCommand(command: TerminalCommand): Promise<string>;
  async streamCommand(
    command: TerminalCommand,
    onData: (chunk: string) => void,
  ): Promise<void>;
  onMessage(handler: (message: TerminalMessage) => void): void;
  onError(handler: (error: Error) => void): void;
  onClose(handler: () => void): void;
  private handleReconnect(): Promise<void>;
  private startHeartbeat(): void;
  private stopHeartbeat(): void;
  private processMessageQueue(): void;
}
```

### 2. Terminal Service Enhancement

#### 2.1 Claude Mode Handler

```typescript
// Add to existing terminal.service.ts

export interface ClaudeTerminalSession extends TerminalSession {
  mode: SessionMode.CLAUDE;
  claudeConfig: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
  };
  commandBuffer: string;
  outputBuffer: string;
  isProcessing: boolean;
}

export class TerminalService {
  // Existing code...

  public async createClaudeSession(
    request: CreateClaudeSessionRequest,
  ): Promise<ClaudeTerminalSession> {
    const session = await this.createTerminal({
      ...request,
      mode: SessionMode.CLAUDE,
      shell: "/bin/bash", // Use bash for claude commands
      environment: {
        ...process.env,
        CLAUDE_INTERACTIVE: "false", // Non-interactive mode
        CLAUDE_FORMAT: "json", // JSON output format if supported
      },
    });

    return {
      ...session,
      claudeConfig: request.claudeConfig || {},
      commandBuffer: "",
      outputBuffer: "",
      isProcessing: false,
    } as ClaudeTerminalSession;
  }

  public async executeClaudeCommand(
    sessionId: string,
    prompt: string,
    options?: ClaudeCommandOptions,
  ): Promise<void> {
    const session = this.sessions.get(sessionId) as ClaudeTerminalSession;
    if (!session || session.mode !== SessionMode.CLAUDE) {
      throw new Error("Invalid Claude session");
    }

    // Build claude command
    const command = this.buildClaudeCommand(prompt, options);

    // Mark as processing
    session.isProcessing = true;
    session.commandBuffer = command;
    session.outputBuffer = "";

    // Execute command
    this.writeToTerminal(sessionId, command + "\n");
  }

  private buildClaudeCommand(
    prompt: string,
    options?: ClaudeCommandOptions,
  ): string {
    // Escape prompt for shell
    const escapedPrompt = this.escapeShellArg(prompt);

    let command = `claude chat "${escapedPrompt}"`;

    if (options?.model) {
      command += ` --model ${options.model}`;
    }

    if (options?.temperature !== undefined) {
      command += ` --temperature ${options.temperature}`;
    }

    if (options?.maxTokens) {
      command += ` --max-tokens ${options.maxTokens}`;
    }

    return command;
  }

  private escapeShellArg(arg: string): string {
    return arg
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\$/g, "\\$")
      .replace(/`/g, "\\`")
      .replace(/\n/g, "\\n");
  }
}
```

## Data Models and Schemas

### WebSocket Message Formats

#### 1. AI Assistant → Terminal Service

```typescript
interface AIToTerminalMessage {
  type: "claude_command" | "claude_stream" | "session_control";
  sessionId: string;
  timestamp: number;
  data: {
    // For claude_command
    prompt?: string;
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      systemPrompt?: string;
    };

    // For session_control
    action?: "create" | "close" | "reset";
    config?: ClaudeSessionConfig;
  };
  metadata: {
    requestId: string;
    userId?: string;
    projectId?: string;
  };
}
```

#### 2. Terminal Service → AI Assistant

```typescript
interface TerminalToAIMessage {
  type: "output" | "error" | "status" | "stream_chunk" | "command_complete";
  sessionId: string;
  timestamp: number;
  data: {
    // For output/stream_chunk
    content?: string;

    // For error
    error?: {
      code: string;
      message: string;
      details?: any;
    };

    // For status
    status?: "ready" | "processing" | "completed" | "failed";

    // For command_complete
    result?: {
      fullOutput: string;
      executionTime: number;
      exitCode: number;
    };
  };
  metadata: {
    requestId: string;
    sequenceNumber?: number;
  };
}
```

### Database Schema Updates

```prisma
// Add to existing schema.prisma

model ClaudeCLISession {
  id              String   @id @default(cuid())
  userId          String
  projectId       String?
  terminalSessionId String
  status          String   // initializing, ready, processing, error, closed
  messageCount    Int      @default(0)
  totalTokensUsed Int      @default(0)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  closedAt        DateTime?

  user            User     @relation(fields: [userId], references: [id])
  messages        ClaudeCLIMessage[]

  @@index([userId])
  @@index([projectId])
  @@index([status])
}

model ClaudeCLIMessage {
  id              String   @id @default(cuid())
  sessionId       String
  role            String   // user, assistant, system
  content         String   @db.Text
  command         String?  @db.Text // Actual CLI command executed
  executionTime   Int?     // milliseconds
  tokenCount      Int?
  error           String?
  createdAt       DateTime @default(now())

  session         ClaudeCLISession @relation(fields: [sessionId], references: [id])

  @@index([sessionId])
  @@index([createdAt])
}
```

## API Specifications

### REST Endpoints

#### 1. Create Claude CLI Session

```typescript
POST /api/assistant/claude-cli/sessions
Authorization: Bearer <token>

Request:
{
  "projectId": "string",
  "config": {
    "model": "claude-3-opus-20240229",
    "temperature": 0.7,
    "maxTokens": 4096,
    "systemPrompt": "You are a helpful assistant"
  }
}

Response:
{
  "session": {
    "id": "session_123",
    "status": "ready",
    "terminalSessionId": "terminal_456",
    "createdAt": "2025-08-15T10:00:00Z"
  }
}
```

#### 2. Send Prompt to Claude CLI

```typescript
POST /api/assistant/claude-cli/chat
Authorization: Bearer <token>

Request:
{
  "sessionId": "session_123",
  "prompt": "Explain quantum computing",
  "stream": true
}

Response (Streaming):
data: {"chunk": "Quantum computing is", "index": 0}
data: {"chunk": " a revolutionary", "index": 1}
data: {"chunk": " technology...", "index": 2}
data: {"done": true, "totalTokens": 150}

Response (Non-streaming):
{
  "content": "Quantum computing is a revolutionary technology...",
  "sessionId": "session_123",
  "executionTime": 2500,
  "tokens": {
    "input": 10,
    "output": 150
  }
}
```

#### 3. Get Session History

```typescript
GET /api/assistant/claude-cli/sessions/:sessionId/messages
Authorization: Bearer <token>

Response:
{
  "messages": [
    {
      "id": "msg_1",
      "role": "user",
      "content": "Explain quantum computing",
      "createdAt": "2025-08-15T10:00:00Z"
    },
    {
      "id": "msg_2",
      "role": "assistant",
      "content": "Quantum computing is...",
      "executionTime": 2500,
      "tokenCount": 150,
      "createdAt": "2025-08-15T10:00:02Z"
    }
  ],
  "totalMessages": 2,
  "totalTokens": 160
}
```

## Implementation Guidelines

### Phase 1: Terminal Service Enhancement (2 days)

1. **Add Claude session mode**
   - Extend TerminalSession type with Claude-specific fields
   - Implement claude command builder with proper escaping
   - Add output parsing for claude responses

2. **Implement command execution tracking**
   - Track command start/end times
   - Buffer output for complete responses
   - Detect command completion patterns

3. **Add WebSocket message handlers**
   - Handle claude_command messages
   - Implement streaming output for real-time response
   - Add error handling for claude CLI failures

### Phase 2: AI Assistant Service Integration (3 days)

1. **Create ClaudeCLIService**
   - Implement WebSocket connection to Terminal Service
   - Add session management
   - Implement prompt queueing and retry logic

2. **Update chat controller**
   - Add endpoint for Claude CLI mode
   - Implement streaming response handler
   - Add fallback to API mode if CLI fails

3. **Database integration**
   - Store session and message history
   - Track token usage estimates
   - Implement session cleanup

### Phase 3: Error Handling & Monitoring (2 days)

1. **Error handling strategies**
   - Claude not logged in detection
   - Command timeout handling
   - Network disconnection recovery
   - Rate limiting

2. **Monitoring & Metrics**
   - Command execution time tracking
   - Success/failure rates
   - Token usage estimation
   - Session lifecycle events

### Phase 4: Testing & Optimization (2 days)

1. **Integration testing**
   - End-to-end flow testing
   - Concurrent session handling
   - Error scenario testing
   - Performance benchmarking

2. **Optimization**
   - Response caching for repeated prompts
   - Connection pooling
   - Output buffering optimization
   - Memory usage optimization

## Security Specifications

### Authentication & Authorization

1. **Session Security**
   - Validate user ownership of sessions
   - Implement session timeout (30 minutes)
   - Rate limiting per user

2. **Command Injection Prevention**
   - Strict input validation
   - Shell argument escaping
   - Command whitelist (only `claude` command)
   - Sanitize prompt content

3. **Data Protection**
   - Encrypt sensitive prompts in database
   - Audit logging for all commands
   - PII detection and masking

### Access Control

```typescript
interface ClaudeAccessControl {
  maxSessionsPerUser: 5;
  maxPromptsPerMinute: 10;
  maxTokensPerDay: 100000;
  allowedModels: string[];
  blockedPromptPatterns: RegExp[];
}
```

## Performance Requirements

### Response Time Targets

- Session creation: < 500ms
- First token latency: < 2s
- Streaming chunk delivery: < 100ms
- Total response time: < 30s for 4096 tokens

### Scalability Targets

- Concurrent sessions: 50
- Messages per second: 100
- WebSocket connections: 200
- Memory per session: < 10MB

### Resource Limits

```typescript
interface ResourceLimits {
  maxPromptLength: 10000; // characters
  maxResponseLength: 50000; // characters
  commandTimeout: 60000; // 60 seconds
  sessionTimeout: 1800000; // 30 minutes
  maxRetries: 3;
  reconnectDelay: 1000; // 1 second
}
```

## Error Handling Strategy

### Error Types and Recovery

```typescript
enum ClaudeCLIError {
  NOT_LOGGED_IN = "CLAUDE_NOT_LOGGED_IN",
  COMMAND_TIMEOUT = "CLAUDE_COMMAND_TIMEOUT",
  INVALID_RESPONSE = "CLAUDE_INVALID_RESPONSE",
  RATE_LIMITED = "CLAUDE_RATE_LIMITED",
  TERMINAL_DISCONNECTED = "TERMINAL_DISCONNECTED",
  SESSION_NOT_FOUND = "SESSION_NOT_FOUND",
  MAX_SESSIONS_REACHED = "MAX_SESSIONS_REACHED",
}

interface ErrorRecoveryStrategy {
  [ClaudeCLIError.NOT_LOGGED_IN]: {
    action: "fallback_to_api";
    notify: true;
    retry: false;
  };
  [ClaudeCLIError.COMMAND_TIMEOUT]: {
    action: "retry_with_backoff";
    maxRetries: 3;
    backoffMs: [1000, 2000, 4110];
  };
  [ClaudeCLIError.TERMINAL_DISCONNECTED]: {
    action: "reconnect_and_retry";
    maxReconnects: 5;
    reconnectDelayMs: 1000;
  };
}
```

### Error Response Format

```typescript
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: {
      sessionId?: string;
      commandExecuted?: string;
      executionTime?: number;
      retryAfter?: number;
    };
    recovery?: {
      action: string;
      fallbackAvailable: boolean;
      userAction?: string;
    };
  };
  timestamp: string;
  requestId: string;
}
```

## Code Examples

### 1. Claude CLI Service Implementation

```typescript
// services/ai-assistant/src/services/claude-cli.service.ts

import { WebSocket } from "ws";
import { EventEmitter } from "events";
import { v4 as uuidv4 } from "uuid";
import { logger } from "../utils/logger";

export class ClaudeCLIService extends EventEmitter {
  private ws: WebSocket | null = null;
  private sessions: Map<string, ClaudeCLISession> = new Map();
  private responseBuffers: Map<string, string> = new Map();
  private responseResolvers: Map<
    string,
    {
      resolve: (value: any) => void;
      reject: (error: any) => void;
      timeout: NodeJS.Timeout;
    }
  > = new Map();

  constructor(private config: ClaudeCLIConfig) {
    super();
    this.initialize();
  }

  async initialize(): Promise<void> {
    await this.connectToTerminal();
    await this.validateClaudeAvailability();
    logger.info("Claude CLI Service initialized");
  }

  private async connectToTerminal(): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = `ws://${this.config.terminalServiceUrl}:${this.config.terminalServicePort}/ws/terminal`;

      this.ws = new WebSocket(wsUrl);

      this.ws.on("open", () => {
        logger.info("Connected to Terminal Service");
        resolve();
      });

      this.ws.on("message", (data: string) => {
        this.handleTerminalMessage(JSON.parse(data));
      });

      this.ws.on("error", (error) => {
        logger.error("WebSocket error:", error);
        reject(error);
      });

      this.ws.on("close", () => {
        logger.warn("WebSocket connection closed");
        this.handleReconnect();
      });
    });
  }

  async createSession(): Promise<ClaudeCLISession> {
    const sessionId = uuidv4();

    // Request terminal session creation
    const terminalRequest = {
      type: "claude_command",
      sessionId,
      timestamp: Date.now(),
      data: {
        action: "create",
        config: {
          mode: "claude",
          shell: "/bin/bash",
        },
      },
      metadata: {
        requestId: uuidv4(),
      },
    };

    this.ws?.send(JSON.stringify(terminalRequest));

    // Wait for terminal session confirmation
    const terminalSessionId = await this.waitForTerminalSession(sessionId);

    const session: ClaudeCLISession = {
      id: sessionId,
      terminalSessionId,
      status: "ready",
      createdAt: new Date(),
      lastActivity: new Date(),
      messageCount: 0,
    };

    this.sessions.set(sessionId, session);

    return session;
  }

  async sendPrompt(request: ClaudeCLIRequest): Promise<ClaudeCLIResponse> {
    const sessionId =
      request.sessionId || (await this.createSession().then((s) => s.id));
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new Error("Session not found");
    }

    session.status = "processing";
    session.lastActivity = new Date();

    const requestId = uuidv4();
    const startTime = Date.now();

    // Build and send command
    const message = {
      type: "claude_command",
      sessionId,
      timestamp: startTime,
      data: {
        prompt: request.prompt,
        options: {
          temperature: request.temperature,
          maxTokens: request.maxTokens,
        },
      },
      metadata: {
        requestId,
      },
    };

    this.ws?.send(JSON.stringify(message));

    // Set up response promise with timeout
    const responsePromise = new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.responseResolvers.delete(requestId);
        reject(new Error("Command timeout"));
      }, this.config.commandTimeout);

      this.responseResolvers.set(requestId, { resolve, reject, timeout });
    });

    // Initialize response buffer
    this.responseBuffers.set(requestId, "");

    try {
      const output = await responsePromise;
      const executionTime = Date.now() - startTime;

      session.status = "ready";
      session.messageCount++;

      return {
        content: output,
        sessionId,
        commandExecuted: `claude chat "${request.prompt}"`,
        executionTime,
      };
    } catch (error) {
      session.status = "error";
      throw error;
    } finally {
      this.responseBuffers.delete(requestId);
    }
  }

  async *streamPrompt(request: ClaudeCLIRequest): AsyncGenerator<string> {
    const sessionId =
      request.sessionId || (await this.createSession().then((s) => s.id));
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new Error("Session not found");
    }

    const requestId = uuidv4();
    const chunks: string[] = [];
    let isComplete = false;

    // Set up stream callback
    this.streamCallbacks.set(requestId, (chunk: string) => {
      chunks.push(chunk);
    });

    // Send command with streaming flag
    const message = {
      type: "claude_stream",
      sessionId,
      timestamp: Date.now(),
      data: {
        prompt: request.prompt,
        options: {
          stream: true,
          ...request,
        },
      },
      metadata: {
        requestId,
      },
    };

    this.ws?.send(JSON.stringify(message));

    // Yield chunks as they arrive
    while (!isComplete) {
      if (chunks.length > 0) {
        const chunk = chunks.shift()!;

        if (chunk === "[DONE]") {
          isComplete = true;
          break;
        }

        yield chunk;
      } else {
        // Wait for more chunks
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    }

    this.streamCallbacks.delete(requestId);
  }

  private handleTerminalMessage(message: TerminalToAIMessage): void {
    const { type, data, metadata } = message;

    switch (type) {
      case "output":
      case "stream_chunk":
        this.handleOutput(metadata.requestId, data.content || "");
        break;

      case "command_complete":
        this.handleCommandComplete(metadata.requestId, data.result);
        break;

      case "error":
        this.handleError(metadata.requestId, data.error);
        break;

      case "status":
        this.handleStatus(message.sessionId, data.status);
        break;
    }
  }

  private handleOutput(requestId: string, content: string): void {
    // Accumulate output in buffer
    const buffer = this.responseBuffers.get(requestId);
    if (buffer !== undefined) {
      this.responseBuffers.set(requestId, buffer + content);
    }

    // Handle streaming callback
    const streamCallback = this.streamCallbacks.get(requestId);
    if (streamCallback) {
      streamCallback(content);
    }
  }

  private handleCommandComplete(requestId: string, result: any): void {
    const resolver = this.responseResolvers.get(requestId);
    if (resolver) {
      clearTimeout(resolver.timeout);
      const output =
        this.responseBuffers.get(requestId) || result?.fullOutput || "";
      resolver.resolve(output);
      this.responseResolvers.delete(requestId);
    }
  }

  private handleError(requestId: string, error: any): void {
    const resolver = this.responseResolvers.get(requestId);
    if (resolver) {
      clearTimeout(resolver.timeout);
      resolver.reject(new Error(error?.message || "Command failed"));
      this.responseResolvers.delete(requestId);
    }
  }

  private handleStatus(sessionId: string, status: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = status as any;
    }
  }

  private async validateClaudeAvailability(): Promise<boolean> {
    try {
      // Test claude command availability
      const testSession = await this.createSession();
      const response = await this.sendPrompt({
        prompt: "Hi",
        sessionId: testSession.id,
        maxTokens: 10,
      });

      await this.closeSession(testSession.id);

      return response.content.length > 0;
    } catch (error) {
      logger.error("Claude CLI validation failed:", error);
      return false;
    }
  }

  async closeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    // Send close command to terminal
    const message = {
      type: "session_control",
      sessionId,
      timestamp: Date.now(),
      data: {
        action: "close",
      },
      metadata: {
        requestId: uuidv4(),
      },
    };

    this.ws?.send(JSON.stringify(message));

    // Clean up local state
    this.sessions.delete(sessionId);
    session.status = "closed";

    logger.info(`Claude CLI session closed: ${sessionId}`);
  }

  private async handleReconnect(): Promise<void> {
    logger.info("Attempting to reconnect to Terminal Service...");

    let retries = 0;
    const maxRetries = this.config.maxRetries;

    while (retries < maxRetries) {
      try {
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * Math.pow(2, retries)),
        );
        await this.connectToTerminal();
        logger.info("Reconnected successfully");
        break;
      } catch (error) {
        retries++;
        logger.error(`Reconnection attempt ${retries} failed:`, error);
      }
    }

    if (retries >= maxRetries) {
      logger.error("Failed to reconnect after maximum retries");
      this.emit("connection:lost");
    }
  }

  private async waitForTerminalSession(sessionId: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Terminal session creation timeout"));
      }, 5000);

      const handler = (message: any) => {
        if (
          message.sessionId === sessionId &&
          message.type === "session_created"
        ) {
          clearTimeout(timeout);
          this.removeListener("terminal:session_created", handler);
          resolve(message.terminalSessionId);
        }
      };

      this.on("terminal:session_created", handler);
    });
  }
}
```

### 2. Terminal Service Claude Handler

```typescript
// services/terminal/src/services/claude-handler.ts

import { TerminalService } from "./terminal.service";
import { logger } from "../utils/logger";

export class ClaudeTerminalHandler {
  private outputPatterns = {
    start: /^Claude:/,
    end: /\n\n$/,
    error: /^Error:|^Failed:/i,
    thinking: /^Thinking\.\.\./,
  };

  constructor(private terminalService: TerminalService) {
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.terminalService.on(
      "terminal:data",
      ({ sessionId, data, direction }) => {
        if (direction === "output") {
          this.handleClaudeOutput(sessionId, data);
        }
      },
    );
  }

  private handleClaudeOutput(sessionId: string, data: string): void {
    const session = this.terminalService.getSession(sessionId);
    if (!session || session.mode !== "claude") return;

    const claudeSession = session as any;

    // Accumulate output
    claudeSession.outputBuffer += data;

    // Check for completion patterns
    if (this.isOutputComplete(claudeSession.outputBuffer)) {
      this.processCompleteOutput(sessionId, claudeSession.outputBuffer);
      claudeSession.outputBuffer = "";
      claudeSession.isProcessing = false;
    }

    // Stream chunk to WebSocket
    this.terminalService.emit("claude:stream", {
      sessionId,
      chunk: data,
      isComplete: false,
    });
  }

  private isOutputComplete(output: string): boolean {
    // Check for command prompt return
    if (output.includes("$") && output.endsWith("$ ")) {
      return true;
    }

    // Check for known end patterns
    if (this.outputPatterns.end.test(output)) {
      return true;
    }

    // Check for error patterns
    if (this.outputPatterns.error.test(output)) {
      return true;
    }

    return false;
  }

  private processCompleteOutput(sessionId: string, output: string): void {
    // Clean output (remove prompt, ANSI codes, etc.)
    const cleanOutput = this.cleanOutput(output);

    // Extract actual Claude response
    const response = this.extractClaudeResponse(cleanOutput);

    // Emit complete event
    this.terminalService.emit("claude:complete", {
      sessionId,
      output: response,
      rawOutput: output,
    });
  }

  private cleanOutput(output: string): string {
    return (
      output
        // Remove ANSI escape codes
        .replace(/\x1b\[[0-9;]*m/g, "")
        // Remove command echo
        .replace(/^claude chat.*\n/, "")
        // Remove shell prompt
        .replace(/\$ $/, "")
        .trim()
    );
  }

  private extractClaudeResponse(output: string): string {
    // Find Claude response between markers
    const lines = output.split("\n");
    let response = "";
    let inResponse = false;

    for (const line of lines) {
      if (this.outputPatterns.start.test(line)) {
        inResponse = true;
        continue;
      }

      if (inResponse) {
        if (line.startsWith("$") || this.outputPatterns.error.test(line)) {
          break;
        }
        response += line + "\n";
      }
    }

    return response.trim();
  }

  async executeClaudeCommand(
    sessionId: string,
    prompt: string,
    options?: any,
  ): Promise<void> {
    const command = this.buildCommand(prompt, options);

    logger.info(`Executing Claude command for session ${sessionId}:`, {
      command: command.substring(0, 100) + "...",
    });

    await this.terminalService.executeClaudeCommand(sessionId, prompt, options);
  }

  private buildCommand(prompt: string, options?: any): string {
    const escapedPrompt = prompt
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\$/g, "\\$")
      .replace(/`/g, "\\`");

    let command = `claude chat "${escapedPrompt}"`;

    if (options?.model) {
      command += ` --model ${options.model}`;
    }

    if (options?.temperature !== undefined) {
      command += ` --temperature ${options.temperature}`;
    }

    if (options?.maxTokens) {
      command += ` --max-tokens ${options.maxTokens}`;
    }

    return command;
  }
}
```

### 3. Updated Chat Controller

```typescript
// services/ai-assistant/src/controllers/chat.controller.ts

import { Request, Response } from "express";
import { ClaudeCLIService } from "../services/claude-cli.service";
import { ClaudeService } from "../services/claude.service";
import { logger } from "../utils/logger";

export class ChatController {
  private claudeCLI: ClaudeCLIService;
  private claudeAPI: ClaudeService;
  private useCliMode: boolean;

  constructor() {
    // Initialize Claude CLI service
    this.claudeCLI = new ClaudeCLIService({
      terminalServiceUrl: process.env.TERMINAL_SERVICE_URL || "localhost",
      terminalServicePort: parseInt(
        process.env.TERMINAL_SERVICE_PORT || "4140",
      ),
      commandTimeout: 60000,
      maxRetries: 3,
      streamingEnabled: true,
    });

    // Initialize Claude API service as fallback
    this.claudeAPI = new ClaudeService();

    // Determine mode based on configuration
    this.useCliMode = process.env.USE_CLAUDE_CLI === "true";

    this.initializeServices();
  }

  private async initializeServices(): Promise<void> {
    if (this.useCliMode) {
      try {
        await this.claudeCLI.initialize();
        logger.info("Claude CLI mode enabled");
      } catch (error) {
        logger.error(
          "Failed to initialize Claude CLI, falling back to API:",
          error,
        );
        this.useCliMode = false;
      }
    }
  }

  async chat(req: Request, res: Response): Promise<void> {
    try {
      const { prompt, sessionId, stream = false } = req.body;

      if (!prompt) {
        res.status(400).json({ error: "Prompt is required" });
        return;
      }

      // Determine which service to use
      const service = this.useCliMode ? "cli" : "api";
      logger.info(`Processing chat request using ${service} mode`);

      if (stream) {
        await this.handleStreamingChat(req, res);
      } else {
        await this.handleNormalChat(req, res);
      }
    } catch (error: any) {
      logger.error("Chat error:", error);

      // Handle specific errors
      if (error.message.includes("CLAUDE_NOT_LOGGED_IN")) {
        // Fallback to API mode
        this.useCliMode = false;
        logger.warn("Claude CLI not logged in, falling back to API");
        await this.handleNormalChat(req, res);
      } else {
        res.status(500).json({
          error: "Failed to process chat request",
          details: error.message,
        });
      }
    }
  }

  private async handleNormalChat(req: Request, res: Response): Promise<void> {
    const { prompt, sessionId, context, temperature, maxTokens } = req.body;

    if (this.useCliMode) {
      // Use Claude CLI
      const response = await this.claudeCLI.sendPrompt({
        prompt,
        sessionId,
        context,
        temperature,
        maxTokens,
      });

      res.json({
        content: response.content,
        sessionId: response.sessionId,
        executionTime: response.executionTime,
        service: "cli",
      });
    } else {
      // Use Claude API
      const messages = [{ role: "user" as const, content: prompt }];

      const response = await this.claudeAPI.chat(messages, context);

      res.json({
        content: response.content,
        sessionId,
        tokens: response.usage,
        service: "api",
      });
    }
  }

  private async handleStreamingChat(
    req: Request,
    res: Response,
  ): Promise<void> {
    const { prompt, sessionId, context, temperature, maxTokens } = req.body;

    // Set up SSE headers
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    try {
      if (this.useCliMode) {
        // Stream from Claude CLI
        const stream = this.claudeCLI.streamPrompt({
          prompt,
          sessionId,
          context,
          temperature,
          maxTokens,
          stream: true,
        });

        for await (const chunk of stream) {
          res.write(`data: ${JSON.stringify({ chunk, service: "cli" })}\n\n`);
        }
      } else {
        // Stream from Claude API
        const messages = [{ role: "user" as const, content: prompt }];

        const stream = this.claudeAPI.streamChat(messages, context);

        for await (const chunk of stream) {
          if (chunk.delta?.text) {
            res.write(
              `data: ${JSON.stringify({
                chunk: chunk.delta.text,
                service: "api",
              })}\n\n`,
            );
          }
        }
      }

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error: any) {
      logger.error("Streaming error:", error);
      res.write(
        `data: ${JSON.stringify({
          error: error.message,
        })}\n\n`,
      );
      res.end();
    }
  }

  async createSession(req: Request, res: Response): Promise<void> {
    try {
      if (this.useCliMode) {
        const session = await this.claudeCLI.createSession();
        res.json({ session });
      } else {
        // Return a mock session for API mode
        res.json({
          session: {
            id: `api_session_${Date.now()}`,
            status: "ready",
            createdAt: new Date(),
          },
        });
      }
    } catch (error: any) {
      logger.error("Session creation error:", error);
      res.status(500).json({
        error: "Failed to create session",
        details: error.message,
      });
    }
  }

  async closeSession(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;

      if (this.useCliMode) {
        await this.claudeCLI.closeSession(sessionId);
      }

      res.json({ success: true });
    } catch (error: any) {
      logger.error("Session close error:", error);
      res.status(500).json({
        error: "Failed to close session",
        details: error.message,
      });
    }
  }

  async getServiceStatus(req: Request, res: Response): Promise<void> {
    res.json({
      mode: this.useCliMode ? "cli" : "api",
      cliAvailable: this.useCliMode,
      apiAvailable: !!process.env.CLAUDE_API_KEY,
      terminalServiceConnected: this.useCliMode && this.claudeCLI.isConnected(),
      config: {
        terminalServiceUrl: process.env.TERMINAL_SERVICE_URL,
        terminalServicePort: process.env.TERMINAL_SERVICE_PORT,
        commandTimeout: 60000,
      },
    });
  }
}
```

## Testing Requirements

### Unit Tests

```typescript
// tests/unit/claude-cli.service.test.ts

describe("ClaudeCLIService", () => {
  let service: ClaudeCLIService;
  let mockWs: MockWebSocket;

  beforeEach(() => {
    mockWs = new MockWebSocket();
    service = new ClaudeCLIService({
      terminalServiceUrl: "localhost",
      terminalServicePort: 4140,
      commandTimeout: 5000,
      maxRetries: 3,
      streamingEnabled: true,
    });
  });

  describe("sendPrompt", () => {
    it("should send prompt and receive response", async () => {
      const prompt = "Test prompt";
      const expectedResponse = "Test response";

      mockWs.mockResponse({
        type: "command_complete",
        data: {
          result: {
            fullOutput: expectedResponse,
            executionTime: 1000,
            exitCode: 0,
          },
        },
      });

      const response = await service.sendPrompt({ prompt });

      expect(response.content).toBe(expectedResponse);
      expect(response.executionTime).toBeGreaterThan(0);
    });

    it("should handle command timeout", async () => {
      const prompt = "Timeout test";

      // Don't send any response
      await expect(service.sendPrompt({ prompt })).rejects.toThrow(
        "Command timeout",
      );
    });

    it("should handle Claude not logged in error", async () => {
      mockWs.mockResponse({
        type: "error",
        data: {
          error: {
            code: "CLAUDE_NOT_LOGGED_IN",
            message: "Claude CLI is not logged in",
          },
        },
      });

      await expect(service.sendPrompt({ prompt: "Test" })).rejects.toThrow(
        "CLAUDE_NOT_LOGGED_IN",
      );
    });
  });

  describe("streamPrompt", () => {
    it("should stream response chunks", async () => {
      const chunks = ["Hello", " ", "World", "!"];
      const collected: string[] = [];

      // Mock streaming responses
      for (const chunk of chunks) {
        mockWs.mockResponse({
          type: "stream_chunk",
          data: { content: chunk },
        });
      }

      mockWs.mockResponse({
        type: "stream_chunk",
        data: { content: "[DONE]" },
      });

      const stream = service.streamPrompt({ prompt: "Test" });

      for await (const chunk of stream) {
        collected.push(chunk);
      }

      expect(collected).toEqual(chunks);
    });
  });
});
```

### Integration Tests

```typescript
// tests/integration/claude-cli-flow.test.ts

describe("Claude CLI Integration", () => {
  let app: Application;
  let terminalService: TerminalService;
  let aiAssistantService: AIAssistantService;

  beforeAll(async () => {
    // Start services
    terminalService = await startTerminalService();
    aiAssistantService = await startAIAssistantService();
    app = await createTestApp();
  });

  it("should complete end-to-end chat flow", async () => {
    // Create session
    const sessionResponse = await request(app)
      .post("/api/assistant/claude-cli/sessions")
      .expect(200);

    const sessionId = sessionResponse.body.session.id;

    // Send prompt
    const chatResponse = await request(app)
      .post("/api/assistant/claude-cli/chat")
      .send({
        sessionId,
        prompt: "What is 2+2?",
      })
      .expect(200);

    expect(chatResponse.body.content).toContain("4");
    expect(chatResponse.body.executionTime).toBeGreaterThan(0);

    // Close session
    await request(app)
      .delete(`/api/assistant/claude-cli/sessions/${sessionId}`)
      .expect(200);
  });

  it("should handle streaming responses", async () => {
    const response = await request(app)
      .post("/api/assistant/claude-cli/chat")
      .send({
        prompt: "Count from 1 to 5",
        stream: true,
      })
      .expect(200);

    const chunks = response.text
      .split("\n\n")
      .filter((chunk) => chunk.startsWith("data: "))
      .map((chunk) => JSON.parse(chunk.replace("data: ", "")));

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[chunks.length - 1]).toHaveProperty("done", true);
  });

  it("should fallback to API when CLI fails", async () => {
    // Simulate CLI failure
    process.env.USE_CLAUDE_CLI = "true";

    // Stop terminal service to simulate failure
    await terminalService.stop();

    const response = await request(app)
      .post("/api/assistant/claude-cli/chat")
      .send({
        prompt: "Test fallback",
      })
      .expect(200);

    expect(response.body.service).toBe("api");

    // Restart terminal service
    await terminalService.start();
  });
});
```

## Deployment Considerations

### Environment Variables

```bash
# AI Assistant Service
USE_CLAUDE_CLI=true                    # Enable CLI mode
CLAUDE_API_KEY=sk-ant-xxx             # Fallback API key
TERMINAL_SERVICE_URL=localhost
TERMINAL_SERVICE_PORT=4140
CLAUDE_CLI_TIMEOUT=60000
CLAUDE_CLI_MAX_RETRIES=3

# Terminal Service
CLAUDE_CLI_PATH=/usr/local/bin/claude
CLAUDE_SESSION_TIMEOUT=1800000
CLAUDE_MAX_SESSIONS=50
```

### Health Checks

```typescript
// Health check endpoint
GET /api/health/claude-cli

Response:
{
  "status": "healthy",
  "checks": {
    "claudeCLI": {
      "available": true,
      "loggedIn": true,
      "version": "1.0.0"
    },
    "terminalService": {
      "connected": true,
      "latency": 5
    },
    "fallbackAPI": {
      "available": true,
      "hasKey": true
    }
  },
  "metrics": {
    "activeSessions": 10,
    "requestsPerMinute": 50,
    "averageResponseTime": 2500,
    "errorRate": 0.02
  }
}
```

### Monitoring Alerts

```yaml
# Prometheus alert rules
groups:
  - name: claude_cli_alerts
    rules:
      - alert: ClaudeCLINotLoggedIn
        expr: claude_cli_logged_in == 0
        for: 5m
        annotations:
          summary: "Claude CLI is not logged in"

      - alert: HighCommandTimeout
        expr: rate(claude_cli_timeouts[5m]) > 0.1
        annotations:
          summary: "High Claude CLI command timeout rate"

      - alert: TerminalServiceDisconnected
        expr: terminal_service_connected == 0
        for: 1m
        annotations:
          summary: "Terminal Service connection lost"
```

## Appendices

### Glossary

- **Claude CLI**: Command-line interface for Claude AI
- **Terminal Service**: Service ที่จัดการ terminal sessions และ execute commands
- **AI Assistant Service**: Service ที่ให้บริการ chat interface สำหรับ users
- **WebSocket**: Protocol สำหรับ real-time bidirectional communication
- **node-pty**: Node.js library สำหรับ pseudo-terminal operations
- **SSE (Server-Sent Events)**: Protocol สำหรับ server push to client

### References

- [Claude CLI Documentation](https://docs.anthropic.com/claude/cli)
- [node-pty Documentation](https://github.com/microsoft/node-pty)
- [WebSocket Protocol RFC](https://tools.ietf.org/html/rfc6455)
- [Server-Sent Events Specification](https://html.spec.whatwg.org/multipage/server-sent-events.html)

### Alternative Approaches Considered

1. **Direct Process Spawning**: ถูกปฏิเสธเนื่องจากขาด session management และ resource control
2. **SSH Tunneling**: ถูกปฏิเสธเนื่องจากเพิ่ม complexity และ latency
3. **Custom Claude Protocol**: ถูกปฏิเสธเนื่องจากต้อง reverse engineer Claude CLI
4. **Container-based Isolation**: ถูกปฏิเสธเนื่องจาก overhead สูงและซับซ้อนเกินไป

---

_Document Version: 1.0.0_  
_Created: 2025-08-15_  
_Author: Technical Architect Agent_  
_Status: Ready for Implementation_
