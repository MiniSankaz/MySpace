/**
 * Terminal Session Contract - Standardized interfaces for WebSocket terminal sessions
 * This file defines the contract between frontend and backend terminal components
 * to prevent session ID format mismatches and ensure consistent session management.
 * 
 * Session ID Format: `session_{timestamp}_{random}`
 * Example: session_1704123456789_abc123
 */

/**
 * Standardized session identifier format
 * Must follow the pattern: session_{timestamp}_{random}
 */
export interface SessionIdentifier {
  /** Full session ID in format: session_{timestamp}_{random} */
  sessionId: string;
  /** Project ID (separate from session ID) */
  projectId: string;
  /** Terminal type */
  type: 'system' | 'claude';
}

/**
 * Session creation parameters
 */
export interface SessionCreationParams {
  projectId: string;
  projectPath: string;
  type: 'system' | 'claude';
  tabName: string;
  userId?: string;
  environment?: Record<string, string>;
}

/**
 * WebSocket connection parameters
 */
export interface WebSocketConnectionParams {
  /** Session ID (must be in standard format) */
  sessionId: string;
  /** Project ID (separate from session ID) */
  projectId: string;
  /** Working directory path */
  path: string;
  /** Authentication token */
  token?: string;
  /** Terminal type for port selection */
  type: 'system' | 'claude';
}

/**
 * Session state for tracking
 */
export interface SessionState {
  sessionId: string;
  projectId: string;
  type: 'system' | 'claude';
  status: 'connecting' | 'connected' | 'disconnected' | 'error' | 'reconnecting';
  reconnectAttempts: number;
  lastActivity: Date;
  isBackground: boolean;
  outputBuffer: string[];
}

/**
 * WebSocket message format
 */
export interface WebSocketMessage {
  type: 'input' | 'output' | 'resize' | 'clear' | 'error' | 'status' | 'connected' | 'disconnected' | 'stream' | 'history' | 'exit';
  sessionId?: string;
  data?: any;
  error?: string;
  code?: number;
  timestamp?: Date;
}

/**
 * Circuit breaker configuration for preventing infinite reconnection loops
 */
export interface CircuitBreakerConfig {
  /** Maximum failures before opening circuit */
  failureThreshold: number;
  /** Time window for counting failures (ms) */
  failureWindow: number;
  /** Recovery timeout before attempting to close circuit (ms) */
  recoveryTimeout: number;
  /** Maximum consecutive reconnection attempts */
  maxReconnectAttempts: number;
  /** Base delay between reconnection attempts (ms) */
  reconnectBaseDelay: number;
  /** Maximum delay between reconnection attempts (ms) */
  reconnectMaxDelay: number;
}

/**
 * Circuit breaker state
 */
export interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half-open';
  failures: number;
  lastFailureTime: Date | null;
  nextRetryTime: Date | null;
}

/**
 * Session validation utilities
 */
export class SessionValidator {
  /**
   * Validates if a session ID follows the standard format
   * @param sessionId The session ID to validate
   * @returns True if valid, false otherwise
   */
  static isValidSessionId(sessionId: string): boolean {
    // Check if it matches the pattern: session_{timestamp}_{random}
    const pattern = /^session_\d{13,}_[a-z0-9]{6,}$/;
    return pattern.test(sessionId);
  }

  /**
   * Generates a new session ID in the standard format
   * @returns A new session ID
   */
  static generateSessionId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 8);
    return `session_${timestamp}_${random}`;
  }

  /**
   * Extracts components from a session ID
   * @param sessionId The session ID to parse
   * @returns Parsed components or null if invalid
   */
  static parseSessionId(sessionId: string): { timestamp: number; random: string } | null {
    const match = sessionId.match(/^session_(\d+)_([a-z0-9]+)$/);
    if (!match) return null;
    
    return {
      timestamp: parseInt(match[1], 10),
      random: match[2]
    };
  }

  /**
   * Checks if a session ID is from an old format (for backward compatibility)
   * @param sessionId The session ID to check
   * @returns True if it's an old format
   */
  static isLegacyFormat(sessionId: string): boolean {
    // Check for old composite format: {sessionId}_{projectId}
    return sessionId.includes('_') && !sessionId.startsWith('session_');
  }

  /**
   * Migrates an old format session ID to the new format
   * @param legacyId The legacy session ID
   * @returns A new format session ID
   */
  static migrateLegacyId(legacyId: string): string {
    console.warn(`Migrating legacy session ID: ${legacyId}`);
    return this.generateSessionId();
  }
}

/**
 * Default circuit breaker configuration
 * Optimized to stop loops quickly while allowing recovery
 */
export const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 2, // Open circuit after just 2 failures (more aggressive)
  failureWindow: 10000, // 10 seconds window (faster detection)
  recoveryTimeout: 30000, // 30 seconds recovery (allow retry sooner)
  maxReconnectAttempts: 3, // Max 3 attempts only (stop loops faster)
  reconnectBaseDelay: 1000, // 1 second base delay (faster initial retry)
  reconnectMaxDelay: 5000, // 5 seconds max (prevent long waits)
};