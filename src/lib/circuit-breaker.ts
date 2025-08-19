/**
 * Enhanced Circuit Breaker for WebSocket connections with cooldown
 */
export class CircuitBreaker {
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private lastAttemptTime: number = 0;
  private state: "closed" | "open" | "half-open" = "closed";

  private readonly config = {
    maxFailures: 3,
    resetTimeout: 30000, // 30 seconds
    halfOpenTimeout: 15000, // 15 seconds
    backoffMultiplier: 1.5,
    initialDelay: 1000,
    maxDelay: 30000,
    connectionCooldown: 5000, // 5 second minimum between attempts
    healthCheckInterval: 30000, // 30 second background health check
  };

  constructor(customConfig?: Partial<typeof CircuitBreaker.prototype.config>) {
    if (customConfig) {
      this.config = { ...this.config, ...customConfig };
    }
  }

  /**
   * Check if circuit breaker allows connection attempt with cooldown
   */
  canAttempt(): boolean {
    const now = Date.now();

    // Enforce cooldown period between attempts
    const timeSinceLastAttempt = now - this.lastAttemptTime;
    if (timeSinceLastAttempt < this.config.connectionCooldown) {
      console.log(
        `[Circuit Breaker] Cooldown period active, ${this.config.connectionCooldown - timeSinceLastAttempt}ms remaining`,
      );
      return false;
    }

    switch (this.state) {
      case "closed":
        return true;

      case "open":
        // Check if enough time has passed to try half-open
        if (now - this.lastFailureTime > this.config.resetTimeout) {
          this.state = "half-open";
          console.log("[Circuit Breaker] Transitioning to half-open state");
          return true;
        }
        return false;

      case "half-open":
        // Allow one attempt in half-open state
        return true;

      default:
        return false;
    }
  }

  /**
   * Record connection attempt
   */
  recordAttempt(): void {
    this.lastAttemptTime = Date.now();
    console.log("[Circuit Breaker] Connection attempt recorded");
  }

  /**
   * Record successful connection
   */
  recordSuccess(): void {
    if (this.state === "half-open") {
      console.log(
        "[Circuit Breaker] Success in half-open state, closing circuit",
      );
    }

    this.failures = 0;
    this.state = "closed";
  }

  /**
   * Record failed connection
   */
  recordFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.state === "half-open") {
      // Failed in half-open, go back to open
      this.state = "open";
      console.log(
        "[Circuit Breaker] Failed in half-open state, reopening circuit",
      );
    } else if (this.failures >= this.config.maxFailures) {
      // Too many failures, open the circuit
      this.state = "open";
      console.log(
        `[Circuit Breaker] Opening circuit after ${this.failures} failures`,
      );
    }
  }

  /**
   * Get delay for next retry attempt
   */
  getRetryDelay(): number {
    const baseDelay = this.config.initialDelay;
    const multiplier = Math.pow(
      this.config.backoffMultiplier,
      this.failures - 1,
    );
    const delay = Math.min(baseDelay * multiplier, this.config.maxDelay);

    return delay;
  }

  /**
   * Reset circuit breaker
   */
  reset(): void {
    this.failures = 0;
    this.lastFailureTime = 0;
    this.state = "closed";
    console.log("[Circuit Breaker] Reset to initial state");
  }

  /**
   * Get current state info with cooldown information
   */
  getState(): {
    state: string;
    failures: number;
    canAttempt: boolean;
    nextRetryIn: number;
    cooldownRemaining: number;
  } {
    const now = Date.now();
    let nextRetryIn = 0;

    if (this.state === "open") {
      const timeSinceFailure = now - this.lastFailureTime;
      nextRetryIn = Math.max(0, this.config.resetTimeout - timeSinceFailure);
    }

    // Calculate cooldown remaining
    const timeSinceLastAttempt = now - this.lastAttemptTime;
    const cooldownRemaining = Math.max(
      0,
      this.config.connectionCooldown - timeSinceLastAttempt,
    );

    return {
      state: this.state,
      failures: this.failures,
      canAttempt: this.canAttempt(),
      nextRetryIn: Math.max(nextRetryIn, cooldownRemaining),
      cooldownRemaining,
    };
  }
}
