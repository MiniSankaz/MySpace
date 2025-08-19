import { PrismaClient } from "@prisma/client";

/**
 * Database Manager with connection fallback and caching
 */
export class DatabaseManager {
  private static instance: DatabaseManager;
  private primaryClient: PrismaClient | null = null;
  private localClient: PrismaClient | null = null;
  private isConnected: boolean = false;
  private lastConnectionCheck: number = 0;
  private readonly CONNECTION_CHECK_INTERVAL = 30000; // 30 seconds

  private constructor() {}

  static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  /**
   * Get active database client with fallback
   */
  async getClient(): Promise<PrismaClient> {
    // Check if we need to test connection
    const now = Date.now();
    if (now - this.lastConnectionCheck > this.CONNECTION_CHECK_INTERVAL) {
      await this.checkConnection();
      this.lastConnectionCheck = now;
    }

    // Return primary if connected
    if (this.isConnected && this.primaryClient) {
      return this.primaryClient;
    }

    // Try to use local database as fallback
    if (this.localClient) {
      console.log("[DB] Using local database fallback");
      return this.localClient;
    }

    // Initialize clients if not done
    await this.initialize();

    return this.primaryClient || this.localClient || this.createMemoryClient();
  }

  /**
   * Initialize database connections
   */
  private async initialize() {
    // Try primary (DigitalOcean) database
    if (process.env.DATABASE_URL) {
      try {
        this.primaryClient = new PrismaClient({
          datasources: {
            db: {
              url: process.env.DATABASE_URL,
            },
          },
          log:
            process.env.NODE_ENV === "development"
              ? ["error", "warn"]
              : ["error"],
        });

        // Test connection
        await this.primaryClient.$queryRaw`SELECT 1`;
        this.isConnected = true;
        console.log("[DB] Connected to primary database");
      } catch (error) {
        console.error("[DB] Primary database connection failed:", error);
        this.isConnected = false;
      }
    }

    // Try local database as fallback
    if (!this.isConnected && process.env.LOCAL_DATABASE_URL) {
      try {
        this.localClient = new PrismaClient({
          datasources: {
            db: {
              url: process.env.LOCAL_DATABASE_URL,
            },
          },
          log: ["error", "warn"],
        });

        await this.localClient.$queryRaw`SELECT 1`;
        console.log("[DB] Connected to local fallback database");
      } catch (error) {
        console.error("[DB] Local database connection failed:", error);
      }
    }
  }

  /**
   * Check database connection
   */
  private async checkConnection() {
    if (this.primaryClient) {
      try {
        await this.primaryClient.$queryRaw`SELECT 1`;
        this.isConnected = true;
      } catch (error) {
        this.isConnected = false;
        console.error("[DB] Connection check failed");
      }
    }
  }

  /**
   * Create in-memory fallback (limited functionality)
   */
  private createMemoryClient(): PrismaClient {
    console.warn("[DB] Using in-memory fallback - limited functionality");
    // This would need a proper in-memory implementation
    return new PrismaClient();
  }

  /**
   * Disconnect all clients
   */
  async disconnect() {
    if (this.primaryClient) {
      await this.primaryClient.$disconnect();
    }
    if (this.localClient) {
      await this.localClient.$disconnect();
    }
  }
}

// Export singleton instance
export const dbManager = DatabaseManager.getInstance();
