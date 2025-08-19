/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascading failures in distributed systems
 */

import { EventEmitter } from "events";
import { logger } from "../utils/logger";

export enum CircuitState {
  CLOSED = "CLOSED",
  OPEN = "OPEN",
  HALF_OPEN = "HALF_OPEN",
}

export interface CircuitBreakerConfig {
  name?: string;
  failureThreshold?: number;
  successThreshold?: number;
  timeout?: number;
  volumeThreshold?: number;
  errorThresholdPercentage?: number;
  rollingWindowSize?: number;
  onStateChange?: (from: CircuitState, to: CircuitState) => void;
}

export interface CircuitBreakerMetrics {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  totalCount: number;
  errorPercentage: number;
  lastFailureTime: number;
  nextAttempt: number;
  isOpen: boolean;
  isHalfOpen: boolean;
  isClosed: boolean;
}

export class CircuitOpenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CircuitOpenError";
  }
}

interface RequestMetrics {
  timestamp: number;
  success: boolean;
  responseTime?: number;
  error?: Error;
}

export class CircuitBreaker extends EventEmitter {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime: number = 0;
  private nextAttempt: number = 0;
  private requestMetrics: RequestMetrics[] = [];
  private readonly config: Required<CircuitBreakerConfig>;

  constructor(config: CircuitBreakerConfig = {}) {
    super();

    // Apply default configuration
    this.config = {
      name: config.name || "circuit-breaker",
      failureThreshold: config.failureThreshold || 5,
      successThreshold: config.successThreshold || 2,
      timeout: config.timeout || 60000, // 60 seconds
      volumeThreshold: config.volumeThreshold || 10,
      errorThresholdPercentage: config.errorThresholdPercentage || 50,
      rollingWindowSize: config.rollingWindowSize || 10000, // 10 seconds
      onStateChange: config.onStateChange || (() => {}),
    };
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit is open
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttempt) {
        const waitTime = Math.ceil((this.nextAttempt - Date.now()) / 1000);
        throw new CircuitOpenError(
          `Circuit breaker is open. Try again in ${waitTime} seconds`,
        );
      }
      // Transition to half-open state
      this.transitionTo(CircuitState.HALF_OPEN);
    }

    const startTime = Date.now();

    try {
      const result = await fn();
      const responseTime = Date.now() - startTime;

      this.onSuccess(responseTime);
      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.onFailure(error as Error, responseTime);
      throw error;
    }
  }

  /**
   * Execute a function with fallback
   */
  async executeWithFallback<T>(
    fn: () => Promise<T>,
    fallback: () => T | Promise<T>,
  ): Promise<T> {
    try {
      return await this.execute(fn);
    } catch (error) {
      if (error instanceof CircuitOpenError) {
        logger.warn(`Circuit open, using fallback for ${this.config.name}`);
        return await fallback();
      }
      throw error;
    }
  }

  /**
   * Handle successful execution
   */
  private onSuccess(responseTime: number): void {
    // Record metrics
    this.recordMetrics(true, responseTime);

    // Reset failure count on success in closed state
    if (this.state === CircuitState.CLOSED) {
      this.failureCount = 0;
    }

    // Handle half-open state
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;

      if (this.successCount >= this.config.successThreshold) {
        // Circuit has proven to be healthy again
        this.transitionTo(CircuitState.CLOSED);
        this.successCount = 0;
        this.failureCount = 0;
      }
    }

    // Emit success event
    this.emit("success", { responseTime });
  }

  /**
   * Handle failed execution
   */
  private onFailure(error: Error, responseTime: number): void {
    // Record metrics
    this.recordMetrics(false, responseTime, error);

    this.failureCount++;
    this.lastFailureTime = Date.now();

    // Handle half-open state
    if (this.state === CircuitState.HALF_OPEN) {
      // Single failure in half-open state opens the circuit
      this.transitionTo(CircuitState.OPEN);
      this.nextAttempt = Date.now() + this.config.timeout;
      this.successCount = 0;
    }
    // Handle closed state
    else if (this.state === CircuitState.CLOSED) {
      // Check if we should open the circuit
      if (this.shouldOpen()) {
        this.transitionTo(CircuitState.OPEN);
        this.nextAttempt = Date.now() + this.config.timeout;
      }
    }

    // Emit failure event
    this.emit("failure", { error, responseTime });
  }

  /**
   * Check if circuit should open based on metrics
   */
  private shouldOpen(): boolean {
    // Simple threshold check
    if (this.failureCount >= this.config.failureThreshold) {
      return true;
    }

    // Percentage-based threshold with volume check
    const recentMetrics = this.getRecentMetrics();

    if (recentMetrics.length >= this.config.volumeThreshold) {
      const errorCount = recentMetrics.filter((m) => !m.success).length;
      const errorPercentage = (errorCount / recentMetrics.length) * 100;

      if (errorPercentage >= this.config.errorThresholdPercentage) {
        return true;
      }
    }

    return false;
  }

  /**
   * Record request metrics
   */
  private recordMetrics(
    success: boolean,
    responseTime: number,
    error?: Error,
  ): void {
    const metric: RequestMetrics = {
      timestamp: Date.now(),
      success,
      responseTime,
      error,
    };

    this.requestMetrics.push(metric);

    // Clean old metrics
    this.cleanOldMetrics();
  }

  /**
   * Get recent metrics within the rolling window
   */
  private getRecentMetrics(): RequestMetrics[] {
    const now = Date.now();
    const windowStart = now - this.config.rollingWindowSize;

    return this.requestMetrics.filter((m) => m.timestamp >= windowStart);
  }

  /**
   * Clean old metrics outside the rolling window
   */
  private cleanOldMetrics(): void {
    const now = Date.now();
    const windowStart = now - this.config.rollingWindowSize;

    this.requestMetrics = this.requestMetrics.filter(
      (m) => m.timestamp >= windowStart,
    );
  }

  /**
   * Transition to a new state
   */
  private transitionTo(newState: CircuitState): void {
    const oldState = this.state;

    if (oldState === newState) {
      return;
    }

    this.state = newState;

    // Log state transition
    logger.info(
      `Circuit breaker ${this.config.name} transitioned from ${oldState} to ${newState}`,
    );

    // Call state change callback
    this.config.onStateChange(oldState, newState);

    // Emit state change event
    this.emit("stateChange", { from: oldState, to: newState });
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get circuit breaker metrics
   */
  getMetrics(): CircuitBreakerMetrics {
    const recentMetrics = this.getRecentMetrics();
    const totalCount = recentMetrics.length;
    const errorCount = recentMetrics.filter((m) => !m.success).length;
    const errorPercentage =
      totalCount > 0 ? (errorCount / totalCount) * 100 : 0;

    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      totalCount,
      errorPercentage: Math.round(errorPercentage * 100) / 100,
      lastFailureTime: this.lastFailureTime,
      nextAttempt: this.nextAttempt,
      isOpen: this.state === CircuitState.OPEN,
      isHalfOpen: this.state === CircuitState.HALF_OPEN,
      isClosed: this.state === CircuitState.CLOSED,
    };
  }

  /**
   * Get detailed statistics
   */
  getStatistics(): {
    metrics: CircuitBreakerMetrics;
    recentRequests: number;
    averageResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
  } {
    const metrics = this.getMetrics();
    const recentMetrics = this.getRecentMetrics();

    // Calculate response time statistics
    const responseTimes = recentMetrics
      .filter((m) => m.responseTime !== undefined)
      .map((m) => m.responseTime!);

    const averageResponseTime =
      responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : 0;

    // Calculate percentiles
    const sortedTimes = responseTimes.sort((a, b) => a - b);
    const p95Index = Math.floor(sortedTimes.length * 0.95);
    const p99Index = Math.floor(sortedTimes.length * 0.99);

    return {
      metrics,
      recentRequests: recentMetrics.length,
      averageResponseTime: Math.round(averageResponseTime),
      p95ResponseTime: sortedTimes[p95Index] || 0,
      p99ResponseTime: sortedTimes[p99Index] || 0,
    };
  }

  /**
   * Manually open the circuit
   */
  open(): void {
    this.transitionTo(CircuitState.OPEN);
    this.nextAttempt = Date.now() + this.config.timeout;
  }

  /**
   * Manually close the circuit
   */
  close(): void {
    this.transitionTo(CircuitState.CLOSED);
    this.failureCount = 0;
    this.successCount = 0;
  }

  /**
   * Reset the circuit breaker
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
    this.nextAttempt = 0;
    this.requestMetrics = [];

    logger.info(`Circuit breaker ${this.config.name} has been reset`);
    this.emit("reset");
  }

  /**
   * Check if circuit is allowing requests
   */
  isAllowingRequests(): boolean {
    if (
      this.state === CircuitState.CLOSED ||
      this.state === CircuitState.HALF_OPEN
    ) {
      return true;
    }

    // Check if timeout has expired for open circuit
    if (this.state === CircuitState.OPEN && Date.now() >= this.nextAttempt) {
      return true;
    }

    return false;
  }

  /**
   * Get circuit health status
   */
  getHealth(): {
    healthy: boolean;
    state: CircuitState;
    message: string;
  } {
    switch (this.state) {
      case CircuitState.CLOSED:
        return {
          healthy: true,
          state: this.state,
          message: "Circuit is closed and healthy",
        };

      case CircuitState.HALF_OPEN:
        return {
          healthy: true,
          state: this.state,
          message: "Circuit is recovering (half-open)",
        };

      case CircuitState.OPEN:
        const waitTime = Math.max(
          0,
          Math.ceil((this.nextAttempt - Date.now()) / 1000),
        );
        return {
          healthy: false,
          state: this.state,
          message: `Circuit is open. Recovery in ${waitTime} seconds`,
        };

      default:
        return {
          healthy: false,
          state: this.state,
          message: "Unknown circuit state",
        };
    }
  }
}

/**
 * Circuit Breaker Factory
 */
export class CircuitBreakerFactory {
  private static breakers: Map<string, CircuitBreaker> = new Map();

  /**
   * Get or create a circuit breaker
   */
  static getBreaker(
    name: string,
    config?: CircuitBreakerConfig,
  ): CircuitBreaker {
    let breaker = this.breakers.get(name);

    if (!breaker) {
      breaker = new CircuitBreaker({ ...config, name });
      this.breakers.set(name, breaker);
    }

    return breaker;
  }

  /**
   * Get all circuit breakers
   */
  static getAllBreakers(): Map<string, CircuitBreaker> {
    return new Map(this.breakers);
  }

  /**
   * Reset all circuit breakers
   */
  static resetAll(): void {
    this.breakers.forEach((breaker) => {
      breaker.reset();
    });
  }

  /**
   * Get health status of all breakers
   */
  static getHealthStatus(): Record<string, any> {
    const status: Record<string, any> = {};

    this.breakers.forEach((breaker, name) => {
      status[name] = breaker.getHealth();
    });

    return status;
  }

  /**
   * Clear all circuit breakers
   */
  static clear(): void {
    this.breakers.clear();
  }
}

export default CircuitBreaker;
