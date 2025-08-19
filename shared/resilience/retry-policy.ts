/**
 * Retry Policy Implementation with Various Strategies
 * Provides exponential backoff, linear, and fixed retry strategies
 */

import { logger } from "../utils/logger";

export interface RetryConfig {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  factor?: number;
  jitter?: boolean;
  retryOn?: (error: any) => boolean;
}

export class MaxRetriesExceededError extends Error {
  constructor(
    message: string,
    public lastError?: Error,
    public attempts?: number,
  ) {
    super(message);
    this.name = "MaxRetriesExceededError";
  }
}

export interface RetryPolicy {
  execute<T>(fn: () => Promise<T>): Promise<T>;
}

/**
 * Base retry policy class
 */
export abstract class BaseRetryPolicy implements RetryPolicy {
  protected readonly config: Required<RetryConfig>;

  constructor(config: RetryConfig = {}) {
    this.config = {
      maxAttempts: config.maxAttempts || 3,
      baseDelay: config.baseDelay || 1000,
      maxDelay: config.maxDelay || 30000,
      factor: config.factor || 2,
      jitter: config.jitter ?? true,
      retryOn: config.retryOn || this.defaultRetryOn,
    };
  }

  /**
   * Execute function with retry logic
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < this.config.maxAttempts; attempt++) {
      try {
        logger.debug(`Retry attempt ${attempt + 1}/${this.config.maxAttempts}`);
        return await fn();
      } catch (error: any) {
        lastError = error;

        // Check if error is retriable
        if (!this.isRetriable(error)) {
          logger.debug(`Error is not retriable: ${error.message}`);
          throw error;
        }

        // Don't sleep after the last attempt
        if (attempt < this.config.maxAttempts - 1) {
          const delay = this.calculateDelay(attempt);
          logger.debug(`Retrying after ${delay}ms delay`);
          await this.sleep(delay);
        }
      }
    }

    throw new MaxRetriesExceededError(
      `Failed after ${this.config.maxAttempts} attempts`,
      lastError,
      this.config.maxAttempts,
    );
  }

  /**
   * Calculate delay for the given attempt
   */
  protected abstract calculateDelay(attempt: number): number;

  /**
   * Check if error is retriable
   */
  protected isRetriable(error: any): boolean {
    // Check if error has explicit retriable flag
    if (error.retriable !== undefined) {
      return error.retriable;
    }

    // Use custom retry condition if provided
    return this.config.retryOn(error);
  }

  /**
   * Default retry condition
   */
  protected defaultRetryOn(error: any): boolean {
    // Network errors
    if (
      error.code === "ECONNREFUSED" ||
      error.code === "ETIMEDOUT" ||
      error.code === "ECONNRESET" ||
      error.code === "EPIPE"
    ) {
      return true;
    }

    // HTTP status codes
    if (error.response) {
      const status = error.response.status;
      // Retry on 5xx errors and specific 4xx errors
      return status >= 500 || status === 429 || status === 408;
    }

    // Circuit breaker open errors should not be retried
    if (error.name === "CircuitOpenError") {
      return false;
    }

    return false;
  }

  /**
   * Sleep for specified milliseconds
   */
  protected async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Add jitter to delay to prevent thundering herd
   */
  protected addJitter(delay: number): number {
    if (!this.config.jitter) {
      return delay;
    }

    // Add random jitter between 0% and 30% of the delay
    const jitter = Math.random() * 0.3 * delay;
    return Math.round(delay + jitter);
  }
}

/**
 * Exponential backoff retry policy
 */
export class ExponentialBackoffRetry extends BaseRetryPolicy {
  protected calculateDelay(attempt: number): number {
    const exponentialDelay =
      this.config.baseDelay * Math.pow(this.config.factor, attempt);
    const delay = Math.min(exponentialDelay, this.config.maxDelay);
    return this.addJitter(delay);
  }
}

/**
 * Linear backoff retry policy
 */
export class LinearBackoffRetry extends BaseRetryPolicy {
  protected calculateDelay(attempt: number): number {
    const linearDelay = this.config.baseDelay * (attempt + 1);
    const delay = Math.min(linearDelay, this.config.maxDelay);
    return this.addJitter(delay);
  }
}

/**
 * Fixed delay retry policy
 */
export class FixedDelayRetry extends BaseRetryPolicy {
  protected calculateDelay(_attempt: number): number {
    return this.addJitter(this.config.baseDelay);
  }
}

/**
 * Fibonacci backoff retry policy
 */
export class FibonacciBackoffRetry extends BaseRetryPolicy {
  private fibCache: Map<number, number> = new Map([
    [0, 1],
    [1, 1],
  ]);

  protected calculateDelay(attempt: number): number {
    const fibValue = this.fibonacci(attempt);
    const delay = Math.min(
      this.config.baseDelay * fibValue,
      this.config.maxDelay,
    );
    return this.addJitter(delay);
  }

  private fibonacci(n: number): number {
    if (this.fibCache.has(n)) {
      return this.fibCache.get(n)!;
    }

    const value = this.fibonacci(n - 1) + this.fibonacci(n - 2);
    this.fibCache.set(n, value);
    return value;
  }
}

/**
 * Decorrelated jitter retry policy
 * Based on https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/
 */
export class DecorrelatedJitterRetry extends BaseRetryPolicy {
  private lastDelay: number = 0;

  protected calculateDelay(attempt: number): number {
    if (attempt === 0) {
      this.lastDelay = this.config.baseDelay;
    } else {
      const minDelay = this.config.baseDelay;
      const maxDelay = Math.min(this.lastDelay * 3, this.config.maxDelay);
      this.lastDelay = Math.random() * (maxDelay - minDelay) + minDelay;
    }

    return Math.round(this.lastDelay);
  }
}

/**
 * Retry policy with circuit breaker integration
 */
export class CircuitBreakerRetry extends BaseRetryPolicy {
  private consecutiveFailures: number = 0;
  private circuitOpen: boolean = false;
  private circuitOpenUntil: number = 0;

  constructor(
    config: RetryConfig = {},
    private circuitConfig: {
      failureThreshold?: number;
      recoveryTimeout?: number;
    } = {},
  ) {
    super(config);
    this.circuitConfig = {
      failureThreshold: circuitConfig.failureThreshold || 5,
      recoveryTimeout: circuitConfig.recoveryTimeout || 60000,
    };
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit is open
    if (this.circuitOpen && Date.now() < this.circuitOpenUntil) {
      throw new Error("Circuit breaker is open");
    }

    // Reset circuit if recovery timeout has passed
    if (this.circuitOpen && Date.now() >= this.circuitOpenUntil) {
      this.circuitOpen = false;
      this.consecutiveFailures = 0;
    }

    try {
      const result = await super.execute(fn);
      // Reset failure count on success
      this.consecutiveFailures = 0;
      return result;
    } catch (error) {
      this.consecutiveFailures++;

      // Open circuit if threshold is reached
      if (this.consecutiveFailures >= this.circuitConfig.failureThreshold!) {
        this.circuitOpen = true;
        this.circuitOpenUntil =
          Date.now() + this.circuitConfig.recoveryTimeout!;
        logger.warn("Circuit breaker opened due to consecutive failures");
      }

      throw error;
    }
  }

  protected calculateDelay(attempt: number): number {
    // Use exponential backoff
    const exponentialDelay =
      this.config.baseDelay * Math.pow(this.config.factor, attempt);
    const delay = Math.min(exponentialDelay, this.config.maxDelay);
    return this.addJitter(delay);
  }
}

/**
 * Retry policy factory
 */
export class RetryPolicyFactory {
  static createExponentialBackoff(
    config?: RetryConfig,
  ): ExponentialBackoffRetry {
    return new ExponentialBackoffRetry(config);
  }

  static createLinearBackoff(config?: RetryConfig): LinearBackoffRetry {
    return new LinearBackoffRetry(config);
  }

  static createFixedDelay(config?: RetryConfig): FixedDelayRetry {
    return new FixedDelayRetry(config);
  }

  static createFibonacciBackoff(config?: RetryConfig): FibonacciBackoffRetry {
    return new FibonacciBackoffRetry(config);
  }

  static createDecorrelatedJitter(
    config?: RetryConfig,
  ): DecorrelatedJitterRetry {
    return new DecorrelatedJitterRetry(config);
  }

  static createWithCircuitBreaker(
    config?: RetryConfig,
    circuitConfig?: { failureThreshold?: number; recoveryTimeout?: number },
  ): CircuitBreakerRetry {
    return new CircuitBreakerRetry(config, circuitConfig);
  }

  static create(
    strategy:
      | "exponential"
      | "linear"
      | "fixed"
      | "fibonacci"
      | "decorrelated" = "exponential",
    config?: RetryConfig,
  ): RetryPolicy {
    switch (strategy) {
      case "exponential":
        return this.createExponentialBackoff(config);
      case "linear":
        return this.createLinearBackoff(config);
      case "fixed":
        return this.createFixedDelay(config);
      case "fibonacci":
        return this.createFibonacciBackoff(config);
      case "decorrelated":
        return this.createDecorrelatedJitter(config);
      default:
        throw new Error(`Unknown retry strategy: ${strategy}`);
    }
  }
}

/**
 * Retry decorator for methods
 */
export function Retry(config?: RetryConfig) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;
    const retryPolicy = new ExponentialBackoffRetry(config);

    descriptor.value = async function (...args: any[]) {
      return await retryPolicy.execute(() => originalMethod.apply(this, args));
    };

    return descriptor;
  };
}

export default ExponentialBackoffRetry;
