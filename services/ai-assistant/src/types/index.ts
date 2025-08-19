// ============================================
// AI Assistant Service - Local Types
// ============================================

// Base Types
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
  service?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

// AI Assistant Types
export interface ChatMessage {
  id: string;
  sessionId: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  metadata?: {
    model?: string;
    tokens?: number;
    inputTokens?: number;
    outputTokens?: number;
    processingTime?: number;
    context?: string;
    responseId?: string;
  };
}

export interface ChatSession extends BaseEntity {
  userId: string;
  folderId?: string;
  title: string;
  messages: ChatMessage[];
  isActive: boolean;
  lastMessageAt?: Date;
  metadata?: {
    model: string;
    totalTokens: number;
    totalMessages: number;
  };
}

export interface ChatFolder extends BaseEntity {
  userId: string;
  name: string;
  description?: string;
  color?: string;
  isDefault: boolean;
  sessionCount: number;
}

export interface AIModelConfig {
  name: string;
  provider: "anthropic" | "openai" | "local";
  model: string;
  maxTokens: number;
  temperature: number;
  topP: number;
  systemPrompt?: string;
}

// Service Health Types
export interface ServiceHealth {
  service: string;
  status: "OK" | "WARNING" | "ERROR" | "UNKNOWN";
  timestamp: string;
  uptime: number;
  memory: NodeJS.MemoryUsage;
  version: string;
  environment: string;
  dependencies?: ServiceDependencyHealth[];
  metrics?: ServiceMetrics;
}

export interface ServiceDependencyHealth {
  name: string;
  status: "OK" | "ERROR" | "UNKNOWN";
  url?: string;
  responseTime?: number;
  lastChecked: Date;
}

export interface ServiceMetrics {
  requestsPerMinute: number;
  averageResponseTime: number;
  errorRate: number;
  activeConnections?: number;
  [key: string]: any;
}

// WebSocket Types
export interface WebSocketMessage<T = any> {
  type: string;
  data: T;
  timestamp: Date;
  sessionId?: string;
  userId?: string;
}

export interface WebSocketError {
  code: string;
  message: string;
  timestamp: Date;
  context?: any;
}

// Error Types
export interface ServiceError extends Error {
  code: string;
  service: string;
  statusCode: number;
  timestamp: Date;
  context?: any;
  stack?: string;
}

// User Types (minimal for AI Assistant)
export interface User extends BaseEntity {
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  role: string;
  isActive: boolean;
}

// Export utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type PartialExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>;
