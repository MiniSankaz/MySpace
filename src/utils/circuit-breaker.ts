/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascading failures in database operations
 */

export enum CircuitState {
  CLOSED = 'closed',
  OPEN = 'open', 
  HALF_OPEN = 'half_open'
}

export interface CircuitBreakerOptions {
  threshold: number;          // Number of failures before opening
  timeout: number;            // Time in ms before trying half-open
  resetTimeout: number;       // Time in ms to reset after success
  monitoringPeriod: number;   // Time window for failure counting
  onStateChange?: (state: CircuitState) => void;
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number = 0;
  private successCount: number = 0;
  private lastFailureTime: Date | null = null;
  private nextAttempt: Date | null = null;
  private readonly options: CircuitBreakerOptions;
  
  constructor(options: CircuitBreakerOptions) {
    this.options = {
      threshold: options.threshold || 5,
      timeout: options.timeout || 60000,
      resetTimeout: options.resetTimeout || 30000,
      monitoringPeriod: options.monitoringPeriod || 60000,
      onStateChange: options.onStateChange
    };
  }
  
  /**
   * Execute function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit should transition to half-open
    this.checkHalfOpen();
    
    if (this.state === CircuitState.OPEN) {
      throw new Error(`Circuit breaker is OPEN. Next attempt at ${this.nextAttempt}`);
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  /**
   * Execute with fallback function
   */
  async executeWithFallback<T>(
    fn: () => Promise<T>,
    fallback: () => T | Promise<T>
  ): Promise<T> {
    try {
      return await this.execute(fn);
    } catch (error) {
      if (this.state === CircuitState.OPEN) {
        console.log('[CircuitBreaker] Circuit OPEN, using fallback');
        return await fallback();
      }
      throw error;
    }
  }
  
  /**
   * Record successful execution
   */
  private onSuccess(): void {
    this.failures = 0;
    
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      
      // Need multiple successes to fully close
      if (this.successCount >= 3) {
        this.changeState(CircuitState.CLOSED);
        this.successCount = 0;
      }
    }
  }
  
  /**
   * Record failed execution
   */
  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = new Date();
    
    if (this.state === CircuitState.HALF_OPEN) {
      // Single failure in half-open reopens circuit
      this.changeState(CircuitState.OPEN);
      this.setNextAttempt();
    } else if (this.failures >= this.options.threshold) {
      // Threshold reached, open circuit
      this.changeState(CircuitState.OPEN);
      this.setNextAttempt();
    }
  }
  
  /**
   * Check if circuit should transition to half-open
   */
  private checkHalfOpen(): void {
    if (this.state === CircuitState.OPEN && this.nextAttempt) {
      if (new Date() >= this.nextAttempt) {
        this.changeState(CircuitState.HALF_OPEN);
        this.successCount = 0;
      }
    }
  }
  
  /**
   * Set next attempt time
   */
  private setNextAttempt(): void {
    this.nextAttempt = new Date(Date.now() + this.options.timeout);
  }
  
  /**
   * Change circuit state
   */
  private changeState(newState: CircuitState): void {
    const oldState = this.state;
    this.state = newState;
    
    console.log(`[CircuitBreaker] State change: ${oldState} → ${newState}`);
    
    if (this.options.onStateChange) {
      this.options.onStateChange(newState);
    }
  }
  
  /**
   * Get current circuit state
   */
  public getState(): CircuitState {
    return this.state;
  }
  
  /**
   * Get circuit statistics
   */
  public getStats(): any {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime,
      nextAttempt: this.nextAttempt,
      successCount: this.successCount
    };
  }
  
  /**
   * Manually reset circuit
   */
  public reset(): void {
    this.changeState(CircuitState.CLOSED);
    this.failures = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.nextAttempt = null;
  }
  
  /**
   * Force open circuit (for testing/emergency)
   */
  public forceOpen(): void {
    this.changeState(CircuitState.OPEN);
    this.setNextAttempt();
  }
}

/**
 * Circuit Breaker Manager for multiple circuits
 */
export class CircuitBreakerManager {
  private static instance: CircuitBreakerManager;
  private circuits: Map<string, CircuitBreaker> = new Map();
  
  private constructor() {}
  
  public static getInstance(): CircuitBreakerManager {
    if (!this.instance) {
      this.instance = new CircuitBreakerManager();
    }
    return this.instance;
  }
  
  /**
   * Get or create circuit breaker
   */
  public getCircuit(
    name: string,
    options?: CircuitBreakerOptions
  ): CircuitBreaker {
    if (!this.circuits.has(name)) {
      const circuit = new CircuitBreaker(
        options || {
          threshold: 5,
          timeout: 60000,
          resetTimeout: 30000,
          monitoringPeriod: 60000
        }
      );
      this.circuits.set(name, circuit);
    }
    return this.circuits.get(name)!;
  }
  
  /**
   * Get all circuit states
   */
  public getAllStates(): Record<string, any> {
    const states: Record<string, any> = {};
    
    for (const [name, circuit] of this.circuits) {
      states[name] = circuit.getStats();
    }
    
    return states;
  }
  
  /**
   * Reset all circuits
   */
  public resetAll(): void {
    for (const circuit of this.circuits.values()) {
      circuit.reset();
    }
  }
  
  /**
   * Emergency open all circuits
   */
  public emergencyOpenAll(): void {
    for (const circuit of this.circuits.values()) {
      circuit.forceOpen();
    }
    console.log('[CircuitBreakerManager] Emergency: All circuits opened');
  }
}

export const circuitBreakerManager = CircuitBreakerManager.getInstance();