/**
 * Database Connection Manager
 * Handles connection pooling, retry logic, and failover
 */

import { PrismaClient } from "@prisma/client";
import { developmentConfig } from "@/core/config/development.config";
import { offlineStore } from "./offline-store";

export enum ConnectionStatus {
  CONNECTED = "connected",
  CONNECTING = "connecting",
  DISCONNECTED = "disconnected",
  ERROR = "error",
  OFFLINE = "offline",
}

interface ConnectionMetrics {
  totalAttempts: number;
  successfulConnections: number;
  failedConnections: number;
  lastConnectionTime?: Date;
  lastErrorTime?: Date;
  lastError?: string;
  averageResponseTime: number;
}

class DatabaseConnectionManager {
  private static instance: DatabaseConnectionManager;
  private prismaClient: PrismaClient | null = null;
  private status: ConnectionStatus = ConnectionStatus.DISCONNECTED;
  private metrics: ConnectionMetrics = {
    totalAttempts: 0,
    successfulConnections: 0,
    failedConnections: 0,
    averageResponseTime: 0,
  };
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private connectionPromise: Promise<PrismaClient> | null = null;

  private constructor() {
    this.initialize();
  }

  static getInstance(): DatabaseConnectionManager {
    if (!DatabaseConnectionManager.instance) {
      DatabaseConnectionManager.instance = new DatabaseConnectionManager();
    }
    return DatabaseConnectionManager.instance;
  }

  private async initialize() {
    // Start health check interval
    this.startHealthCheck();

    // Attempt initial connection
    if (!developmentConfig.enableOfflineMode) {
      this.connect().catch((error) => {
        console.error("[DBManager] Initial connection failed:", error);
      });
    }
  }

  /**
   * Get Prisma client with automatic retry and fallback
   */
  async getClient(): Promise<PrismaClient | null> {
    // If we're in offline mode, return null immediately
    if (developmentConfig.enableOfflineMode || offlineStore.isOffline()) {
      this.status = ConnectionStatus.OFFLINE;
      return null;
    }

    // If already connected, return existing client
    if (this.prismaClient && this.status === ConnectionStatus.CONNECTED) {
      return this.prismaClient;
    }

    // If connection in progress, wait for it
    if (this.connectionPromise) {
      try {
        return await this.connectionPromise;
      } catch {
        return null;
      }
    }

    // Attempt to connect
    try {
      return await this.connect();
    } catch (error) {
      console.error("[DBManager] Failed to get client:", error);
      return null;
    }
  }

  /**
   * Connect to database with retry logic
   */
  private async connect(): Promise<PrismaClient> {
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = this.attemptConnection();

    try {
      const client = await this.connectionPromise;
      return client;
    } finally {
      this.connectionPromise = null;
    }
  }

  private async attemptConnection(): Promise<PrismaClient> {
    this.status = ConnectionStatus.CONNECTING;

    const maxAttempts = developmentConfig.databaseRetryAttempts;
    const retryDelay = developmentConfig.databaseRetryDelay;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      this.metrics.totalAttempts++;

      try {
        console.log(`[DBManager] Connection attempt ${attempt}/${maxAttempts}`);

        // Create new Prisma client if needed
        if (!this.prismaClient) {
          this.prismaClient = new PrismaClient({
            log:
              process.env.NODE_ENV === "development"
                ? ["warn", "error"]
                : ["error"],
            errorFormat: "minimal",
          });
        }

        // Test connection with timeout
        const startTime = Date.now();
        await this.testConnection();
        const responseTime = Date.now() - startTime;

        // Update metrics
        this.metrics.successfulConnections++;
        this.metrics.lastConnectionTime = new Date();
        this.metrics.averageResponseTime =
          (this.metrics.averageResponseTime + responseTime) / 2;

        this.status = ConnectionStatus.CONNECTED;
        console.log("[DBManager] Database connected successfully");

        return this.prismaClient;
      } catch (error) {
        this.metrics.failedConnections++;
        this.metrics.lastErrorTime = new Date();
        this.metrics.lastError =
          error instanceof Error ? error.message : "Unknown error";

        console.error(
          `[DBManager] Connection attempt ${attempt} failed:`,
          error,
        );

        if (attempt === maxAttempts) {
          this.status = ConnectionStatus.ERROR;

          // Switch to offline mode if configured
          if (developmentConfig.enableDatabaseFallback) {
            console.log("[DBManager] Switching to offline mode");
            offlineStore.setOfflineMode(true);
            this.status = ConnectionStatus.OFFLINE;
          }

          throw new Error(
            `Database connection failed after ${maxAttempts} attempts`,
          );
        }

        // Wait before retry with exponential backoff
        const delay = retryDelay * Math.pow(2, attempt - 1);
        console.log(`[DBManager] Retrying in ${delay}ms...`);
        await this.sleep(delay);
      }
    }

    throw new Error("Connection failed");
  }

  /**
   * Test database connection
   */
  private async testConnection(): Promise<void> {
    if (!this.prismaClient) {
      throw new Error("Prisma client not initialized");
    }

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(
        () => reject(new Error("Connection timeout")),
        developmentConfig.databaseTimeout,
      );
    });

    const queryPromise = this.prismaClient.$queryRaw`SELECT 1`;

    await Promise.race([queryPromise, timeoutPromise]);
  }

  /**
   * Disconnect from database
   */
  async disconnect(): Promise<void> {
    if (this.prismaClient) {
      await this.prismaClient.$disconnect();
      this.prismaClient = null;
      this.status = ConnectionStatus.DISCONNECTED;
      console.log("[DBManager] Database disconnected");
    }

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * Start health check interval
   */
  private startHealthCheck(): void {
    if (this.healthCheckInterval) {
      return;
    }

    // Health check every 30 seconds
    this.healthCheckInterval = setInterval(async () => {
      if (this.status === ConnectionStatus.CONNECTED && this.prismaClient) {
        try {
          await this.testConnection();
        } catch (error) {
          console.error("[DBManager] Health check failed:", error);
          this.status = ConnectionStatus.ERROR;

          // Attempt reconnection
          if (developmentConfig.enableAutoRetry) {
            this.connect().catch((err) => {
              console.error("[DBManager] Reconnection failed:", err);
            });
          }
        }
      }
    }, 30000);
  }

  /**
   * Execute query with fallback
   */
  async executeWithFallback<T>(
    query: (client: PrismaClient) => Promise<T>,
    fallback: () => T | Promise<T>,
  ): Promise<T> {
    const client = await this.getClient();

    if (client) {
      try {
        return await query(client);
      } catch (error) {
        console.error("[DBManager] Query failed:", error);

        // If query fails, try fallback
        if (developmentConfig.enableDatabaseFallback) {
          console.log("[DBManager] Using fallback");
          return await fallback();
        }

        throw error;
      }
    } else {
      // No client available, use fallback
      console.log("[DBManager] No database connection, using fallback");
      return await fallback();
    }
  }

  /**
   * Get connection status
   */
  getStatus(): ConnectionStatus {
    return this.status;
  }

  /**
   * Get connection metrics
   */
  getMetrics(): ConnectionMetrics {
    return { ...this.metrics };
  }

  /**
   * Check if database is available
   */
  isAvailable(): boolean {
    return this.status === ConnectionStatus.CONNECTED;
  }

  /**
   * Force offline mode
   */
  forceOffline(): void {
    this.disconnect();
    this.status = ConnectionStatus.OFFLINE;
    offlineStore.setOfflineMode(true);
  }

  /**
   * Attempt to go online
   */
  async goOnline(): Promise<void> {
    offlineStore.setOfflineMode(false);
    await this.connect();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const dbManager = DatabaseConnectionManager.getInstance();
