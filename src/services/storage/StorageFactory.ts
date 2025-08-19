/**
 * Storage Factory
 * Creates and manages storage providers based on configuration
 */

import {
  ITerminalStorageService,
  StorageMode,
  StorageConfig,
  StorageInfo,
  HealthStatus,
} from "./interfaces/ITerminalStorageService";
import { LocalStorageProvider } from "./providers/LocalStorageProvider";
import { DatabaseStorageProvider } from "./providers/DatabaseStorageProvider";
import { HybridStorageProvider } from "./providers/HybridStorageProvider";

/**
 * Storage Factory for creating terminal storage providers
 */
export class StorageFactory {
  private static providers: Map<StorageMode, ITerminalStorageService> =
    new Map();
  private static currentMode: StorageMode | null = null;
  private static config: StorageConfig | null = null;
  private static isInitialized = false;

  /**
   * Initialize the storage factory with configuration
   */
  public static initialize(config?: Partial<StorageConfig>): void {
    // Get mode from environment or config
    const mode =
      (process.env.TERMINAL_STORAGE_MODE as StorageMode) ||
      config?.mode ||
      "LOCAL";

    // Build complete configuration
    this.config = {
      mode,
      local: {
        basePath: process.env.TERMINAL_STORAGE_PATH || "/tmp/terminal-sessions",
        compression: process.env.TERMINAL_STORAGE_COMPRESSION === "true",
        maxSessions: parseInt(process.env.TERMINAL_MAX_SESSIONS || "50"),
        flushInterval: parseInt(process.env.TERMINAL_FLUSH_INTERVAL || "5000"),
        persistToDisk: process.env.TERMINAL_PERSIST_TO_DISK === "true",
        ...config?.local,
      },
      database: {
        connectionString: process.env.DATABASE_URL,
        poolSize: parseInt(process.env.TERMINAL_DB_POOL_SIZE || "10"),
        timeout: parseInt(process.env.TERMINAL_DB_TIMEOUT || "5000"),
        cacheEnabled: process.env.TERMINAL_DB_CACHE !== "false",
        cacheTTL: parseInt(process.env.TERMINAL_CACHE_TTL || "300000"),
        ...config?.database,
      },
      hybrid: {
        syncStrategy:
          (process.env.TERMINAL_SYNC_STRATEGY as
            | "immediate"
            | "eventual"
            | "manual") || "eventual",
        syncInterval: parseInt(process.env.TERMINAL_SYNC_INTERVAL || "30000"),
        conflictResolution:
          (process.env.TERMINAL_CONFLICT_RESOLUTION as
            | "local-wins"
            | "database-wins"
            | "latest-wins") || "latest-wins",
        maxSyncBatch: parseInt(process.env.TERMINAL_SYNC_BATCH_SIZE || "10"),
        ...config?.hybrid,
      },
    };

    this.currentMode = mode;
    this.isInitialized = true;

    console.log(`[StorageFactory] Initialized with mode: ${mode}`, {
      local: this.config.local,
      database: this.config.database
        ? { ...this.config.database, connectionString: "***" }
        : undefined,
      hybrid: this.config.hybrid,
    });
  }

  /**
   * Get storage provider instance
   */
  public static getProvider(): ITerminalStorageService {
    if (!this.isInitialized) {
      this.initialize();
    }

    if (!this.currentMode || !this.config) {
      throw new Error("StorageFactory not properly initialized");
    }

    // Check if provider already exists
    if (!this.providers.has(this.currentMode)) {
      const provider = this.createProvider(this.currentMode);
      this.providers.set(this.currentMode, provider);
    }

    return this.providers.get(this.currentMode)!;
  }

  /**
   * Create a new storage provider based on mode
   */
  private static createProvider(mode: StorageMode): ITerminalStorageService {
    if (!this.config) {
      throw new Error("Storage configuration not initialized");
    }

    console.log(`[StorageFactory] Creating ${mode} storage provider`);

    switch (mode) {
      case "LOCAL":
        return new LocalStorageProvider(this.config.local);

      case "DATABASE":
        if (!this.config.database?.connectionString) {
          throw new Error(
            "DATABASE mode requires DATABASE_URL environment variable",
          );
        }
        return new DatabaseStorageProvider(this.config.database);

      case "HYBRID":
        if (!this.config.database?.connectionString) {
          throw new Error(
            "HYBRID mode requires DATABASE_URL environment variable",
          );
        }
        // Hybrid provider uses both local and database configurations
        return new HybridStorageProvider(
          this.config.local,
          this.config.database,
          this.config.hybrid,
        );

      default:
        throw new Error(`Unknown storage mode: ${mode}`);
    }
  }

  /**
   * Switch to a different storage mode (with data migration)
   */
  public static async switchMode(
    newMode: StorageMode,
    migrateData: boolean = true,
  ): Promise<void> {
    if (!this.isInitialized) {
      throw new Error("StorageFactory not initialized");
    }

    if (this.currentMode === newMode) {
      console.log(`[StorageFactory] Already in ${newMode} mode`);
      return;
    }

    console.log(
      `[StorageFactory] Switching from ${this.currentMode} to ${newMode} mode`,
    );

    // Get current provider
    const currentProvider = this.providers.get(this.currentMode!);

    // Create new provider
    const newProvider = this.createProvider(newMode);

    // Migrate data if requested
    if (migrateData && currentProvider) {
      console.log("[StorageFactory] Starting data migration...");

      try {
        // Get all sessions from current provider
        const allSessions = await currentProvider.findSessions({});

        // Flush current provider
        await currentProvider.flush();

        // Bulk insert into new provider
        for (const session of allSessions) {
          await newProvider.createSession({
            projectId: session.projectId,
            projectPath: session.currentPath,
            userId: session.userId,
            mode: session.mode,
            metadata: session.metadata,
          });
        }

        console.log(
          `[StorageFactory] Migrated ${allSessions.length} sessions to ${newMode} mode`,
        );
      } catch (error) {
        console.error("[StorageFactory] Data migration failed:", error);
        throw new Error(`Failed to migrate data to ${newMode} mode: ${error}`);
      }
    }

    // Cleanup old provider
    if (currentProvider) {
      await currentProvider.cleanup();
    }

    // Update current mode and provider
    this.currentMode = newMode;
    this.providers.set(newMode, newProvider);

    // Update configuration
    if (this.config) {
      this.config.mode = newMode;
    }

    console.log(`[StorageFactory] Successfully switched to ${newMode} mode`);
  }

  /**
   * Get current storage mode
   */
  public static getMode(): StorageMode | null {
    return this.currentMode;
  }

  /**
   * Get storage configuration
   */
  public static getConfig(): StorageConfig | null {
    return this.config;
  }

  /**
   * Get storage information from current provider
   */
  public static async getStorageInfo(): Promise<StorageInfo> {
    const provider = this.getProvider();
    return provider.getStorageInfo();
  }

  /**
   * Perform health check on current provider
   */
  public static async healthCheck(): Promise<HealthStatus> {
    const provider = this.getProvider();
    return provider.healthCheck();
  }

  /**
   * Cleanup all providers
   */
  public static async cleanup(): Promise<void> {
    for (const [mode, provider] of this.providers) {
      console.log(`[StorageFactory] Cleaning up ${mode} provider`);
      await provider.cleanup();
    }
    this.providers.clear();
  }

  /**
   * Reset factory (for testing)
   */
  public static reset(): void {
    this.providers.clear();
    this.currentMode = null;
    this.config = null;
    this.isInitialized = false;
  }

  /**
   * Validate storage mode
   */
  public static isValidMode(mode: string): mode is StorageMode {
    return ["LOCAL", "DATABASE", "HYBRID"].includes(mode);
  }

  /**
   * Get feature capabilities for current mode
   */
  public static getCapabilities(): {
    persistence: boolean;
    sync: boolean;
    performance: "high" | "medium" | "low";
    scalability: "high" | "medium" | "low";
  } {
    switch (this.currentMode) {
      case "LOCAL":
        return {
          persistence: false,
          sync: false,
          performance: "high",
          scalability: "low",
        };
      case "DATABASE":
        return {
          persistence: true,
          sync: false,
          performance: "low",
          scalability: "high",
        };
      case "HYBRID":
        return {
          persistence: true,
          sync: true,
          performance: "medium",
          scalability: "high",
        };
      default:
        return {
          persistence: false,
          sync: false,
          performance: "low",
          scalability: "low",
        };
    }
  }
}

// Auto-initialize on import if environment is configured
if (process.env.TERMINAL_STORAGE_MODE) {
  StorageFactory.initialize();
}

// Export singleton instance for convenience
export const storageFactory = StorageFactory;
