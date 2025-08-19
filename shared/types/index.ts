// ============================================
// Stock Portfolio v3.0 - Shared Types
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

// User Management Types
export interface User extends BaseEntity {
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  isActive: boolean;
  emailVerified: boolean;
  lastLoginAt?: Date;
  preferences?: UserPreferences;
}

export enum UserRole {
  ADMIN = "ADMIN",
  USER = "USER",
  PREMIUM = "PREMIUM",
  GUEST = "GUEST",
}

export interface UserPreferences {
  theme: "light" | "dark" | "system";
  language: string;
  timezone: string;
  notifications: {
    email: boolean;
    push: boolean;
    marketing: boolean;
  };
  dashboard: {
    layout: string;
    widgets: string[];
  };
}

export interface AuthToken {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  tokenType: "Bearer";
}

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  username?: string;
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

// Terminal Types
export interface TerminalSession extends BaseEntity {
  userId: string;
  projectId?: string;
  name: string;
  cwd: string;
  shell: string;
  environment: Record<string, string>;
  isActive: boolean;
  pid?: number;
  lastActivityAt?: Date;
  metadata?: {
    dimensions: { cols: number; rows: number };
    encoding: string;
    terminalType: string;
  };
}

export interface TerminalCommand {
  id: string;
  sessionId: string;
  command: string;
  output?: string;
  exitCode?: number;
  startTime: Date;
  endTime?: Date;
  duration?: number;
}

export interface TerminalMetrics {
  sessionId: string;
  cpuUsage: number;
  memoryUsage: number;
  activeSessions: number;
  totalCommands: number;
  averageResponseTime: number;
  timestamp: Date;
}

// Workspace Types
export interface Project extends BaseEntity {
  userId: string;
  name: string;
  description?: string;
  path: string;
  type: ProjectType;
  isActive: boolean;
  lastAccessedAt?: Date;
  settings?: ProjectSettings;
  gitConfig?: GitConfig;
}

export enum ProjectType {
  NODEJS = "NODEJS",
  REACT = "REACT",
  NEXTJS = "NEXTJS",
  PYTHON = "PYTHON",
  JAVA = "JAVA",
  OTHER = "OTHER",
}

export interface ProjectSettings {
  defaultShell: string;
  autoSave: boolean;
  tabSize: number;
  wordWrap: boolean;
  theme: string;
  extensions: string[];
}

export interface GitConfig {
  repositoryUrl?: string;
  branch: string;
  remotes: GitRemote[];
  lastCommit?: GitCommit;
  isDirty: boolean;
}

export interface GitRemote {
  name: string;
  url: string;
  type: "push" | "fetch" | "both";
}

export interface GitCommit {
  hash: string;
  author: string;
  email: string;
  message: string;
  timestamp: Date;
}

export interface FileItem {
  name: string;
  path: string;
  type: "file" | "directory";
  size: number;
  lastModified: Date;
  permissions: string;
  isHidden: boolean;
  extension?: string;
  mimeType?: string;
}

// Portfolio Types
export interface Portfolio extends BaseEntity {
  userId: string;
  name: string;
  description?: string;
  currency: string;
  totalValue: number;
  totalCost: number;
  totalGainLoss: number;
  totalGainLossPercentage: number;
  isActive: boolean;
  positions: PortfolioPosition[];
  performance?: PortfolioPerformance;
}

export interface PortfolioPosition extends BaseEntity {
  portfolioId: string;
  symbol: string;
  name: string;
  quantity: number;
  averageCost: number;
  currentPrice: number;
  marketValue: number;
  gainLoss: number;
  gainLossPercentage: number;
  weight: number;
  lastUpdated: Date;
}

export interface Stock {
  symbol: string;
  name: string;
  exchange: string;
  sector?: string;
  industry?: string;
  marketCap?: number;
  price: number;
  change: number;
  changePercentage: number;
  volume: number;
  lastUpdated: Date;
  metrics?: StockMetrics;
}

export interface StockMetrics {
  pe: number;
  eps: number;
  beta: number;
  dividendYield: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  averageVolume: number;
}

export interface Trade extends BaseEntity {
  userId: string;
  portfolioId: string;
  symbol: string;
  type: TradeType;
  quantity: number;
  price: number;
  totalAmount: number;
  fees: number;
  executedAt: Date;
  status: TradeStatus;
  notes?: string;
}

export enum TradeType {
  BUY = "BUY",
  SELL = "SELL",
  DIVIDEND = "DIVIDEND",
  SPLIT = "SPLIT",
}

export enum TradeStatus {
  PENDING = "PENDING",
  EXECUTED = "EXECUTED",
  CANCELLED = "CANCELLED",
  FAILED = "FAILED",
}

export interface PortfolioPerformance {
  portfolioId: string;
  period: PerformancePeriod;
  totalReturn: number;
  totalReturnPercentage: number;
  annualizedReturn: number;
  volatility: number;
  sharpeRatio: number;
  maxDrawdown: number;
  benchmarkComparison?: BenchmarkComparison;
  historicalData: PerformanceDataPoint[];
}

export enum PerformancePeriod {
  ONE_DAY = "1D",
  ONE_WEEK = "1W",
  ONE_MONTH = "1M",
  THREE_MONTHS = "3M",
  SIX_MONTHS = "6M",
  ONE_YEAR = "1Y",
  THREE_YEARS = "3Y",
  FIVE_YEARS = "5Y",
  ALL = "ALL",
}

export interface BenchmarkComparison {
  benchmarkSymbol: string;
  benchmarkReturn: number;
  alpha: number;
  beta: number;
  correlation: number;
}

export interface PerformanceDataPoint {
  date: Date;
  value: number;
  return: number;
  returnPercentage: number;
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

// Configuration Types
export interface ServiceConfig {
  name: string;
  port: number;
  host: string;
  environment: "development" | "staging" | "production";
  database?: DatabaseConfig;
  redis?: RedisConfig;
  logging?: LoggingConfig;
}

export interface DatabaseConfig {
  url: string;
  maxConnections: number;
  ssl: boolean;
  logging: boolean;
}

export interface RedisConfig {
  url: string;
  db: number;
  keyPrefix: string;
  ttl: number;
}

export interface LoggingConfig {
  level: "debug" | "info" | "warn" | "error";
  format: "json" | "simple";
  transports: ("console" | "file" | "database")[];
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

// Event Types
export interface DomainEvent<T = any> {
  id: string;
  type: string;
  aggregateId: string;
  aggregateType: string;
  data: T;
  timestamp: Date;
  version: number;
  userId?: string;
}

// Export utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type PartialExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>;

// Export all types for easier importing
export * from "./auth.types";
export * from "./api.types";

// Common types are already exported above
