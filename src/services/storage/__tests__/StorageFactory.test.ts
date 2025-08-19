/**
 * Unit Tests for Storage Factory
 */

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from "@jest/globals";
import { StorageFactory } from "../StorageFactory";
import { LocalStorageProvider } from "../providers/LocalStorageProvider";
import { DatabaseStorageProvider } from "../providers/DatabaseStorageProvider";
import { HybridStorageProvider } from "../providers/HybridStorageProvider";

describe("StorageFactory", () => {
  beforeEach(() => {
    // Reset factory before each test
    StorageFactory.reset();
    // Clear environment variables
    delete process.env.TERMINAL_STORAGE_MODE;
    delete process.env.DATABASE_URL;
  });

  afterEach(async () => {
    // Cleanup after each test
    await StorageFactory.cleanup();
    StorageFactory.reset();
  });

  describe("Initialization", () => {
    it("should initialize with default LOCAL mode when no env is set", () => {
      StorageFactory.initialize();
      expect(StorageFactory.getMode()).toBe("LOCAL");
    });

    it("should initialize with mode from environment variable", () => {
      process.env.TERMINAL_STORAGE_MODE = "DATABASE";
      process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";

      StorageFactory.initialize();
      expect(StorageFactory.getMode()).toBe("DATABASE");
    });

    it("should initialize with custom config", () => {
      StorageFactory.initialize({
        mode: "HYBRID",
        local: { maxSessions: 100 },
      });

      expect(StorageFactory.getMode()).toBe("HYBRID");
      const config = StorageFactory.getConfig();
      expect(config?.local?.maxSessions).toBe(100);
    });

    it("should auto-initialize when getting provider", () => {
      const provider = StorageFactory.getProvider();
      expect(provider).toBeDefined();
      expect(StorageFactory.getMode()).toBe("LOCAL");
    });
  });

  describe("Provider Creation", () => {
    it("should create LocalStorageProvider for LOCAL mode", () => {
      StorageFactory.initialize({ mode: "LOCAL" });
      const provider = StorageFactory.getProvider();

      expect(provider).toBeInstanceOf(LocalStorageProvider);
    });

    it("should create DatabaseStorageProvider for DATABASE mode", () => {
      process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
      StorageFactory.initialize({ mode: "DATABASE" });

      const provider = StorageFactory.getProvider();
      expect(provider).toBeInstanceOf(DatabaseStorageProvider);
    });

    it("should create HybridStorageProvider for HYBRID mode", () => {
      process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
      StorageFactory.initialize({ mode: "HYBRID" });

      const provider = StorageFactory.getProvider();
      expect(provider).toBeInstanceOf(HybridStorageProvider);
    });

    it("should throw error for DATABASE mode without DATABASE_URL", () => {
      StorageFactory.initialize({ mode: "DATABASE" });

      expect(() => StorageFactory.getProvider()).toThrow(
        "DATABASE mode requires DATABASE_URL environment variable",
      );
    });

    it("should reuse the same provider instance", () => {
      StorageFactory.initialize({ mode: "LOCAL" });

      const provider1 = StorageFactory.getProvider();
      const provider2 = StorageFactory.getProvider();

      expect(provider1).toBe(provider2);
    });
  });

  describe("Mode Validation", () => {
    it("should validate valid modes", () => {
      expect(StorageFactory.isValidMode("LOCAL")).toBe(true);
      expect(StorageFactory.isValidMode("DATABASE")).toBe(true);
      expect(StorageFactory.isValidMode("HYBRID")).toBe(true);
    });

    it("should reject invalid modes", () => {
      expect(StorageFactory.isValidMode("INVALID")).toBe(false);
      expect(StorageFactory.isValidMode("")).toBe(false);
      expect(StorageFactory.isValidMode("local")).toBe(false); // Case sensitive
    });
  });

  describe("Mode Switching", () => {
    it("should switch from LOCAL to DATABASE mode", async () => {
      process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
      StorageFactory.initialize({ mode: "LOCAL" });

      await StorageFactory.switchMode("DATABASE", false);

      expect(StorageFactory.getMode()).toBe("DATABASE");
      const provider = StorageFactory.getProvider();
      expect(provider).toBeInstanceOf(DatabaseStorageProvider);
    });

    it("should not switch if already in the same mode", async () => {
      StorageFactory.initialize({ mode: "LOCAL" });
      const consoleSpy = jest.spyOn(console, "log");

      await StorageFactory.switchMode("LOCAL", false);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Already in LOCAL mode"),
      );
    });

    it("should migrate data when switching modes if requested", async () => {
      StorageFactory.initialize({ mode: "LOCAL" });
      const provider = StorageFactory.getProvider();

      // Create test session
      const session = await provider.createSession({
        projectId: "test-project",
        projectPath: "/test/path",
        mode: "normal",
      });

      process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";

      // Mock database provider to avoid actual DB connection
      const mockDbProvider = {
        createSession: jest.fn().mockResolvedValue(session),
        findSessions: jest.fn().mockResolvedValue([]),
        flush: jest.fn().mockResolvedValue(undefined),
        cleanup: jest.fn().mockResolvedValue(undefined),
      };

      // Switch with migration
      await StorageFactory.switchMode("DATABASE", true);

      expect(StorageFactory.getMode()).toBe("DATABASE");
    });
  });

  describe("Capabilities", () => {
    it("should return correct capabilities for LOCAL mode", () => {
      StorageFactory.initialize({ mode: "LOCAL" });
      const capabilities = StorageFactory.getCapabilities();

      expect(capabilities).toEqual({
        persistence: false,
        sync: false,
        performance: "high",
        scalability: "low",
      });
    });

    it("should return correct capabilities for DATABASE mode", () => {
      process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
      StorageFactory.initialize({ mode: "DATABASE" });
      const capabilities = StorageFactory.getCapabilities();

      expect(capabilities).toEqual({
        persistence: true,
        sync: false,
        performance: "low",
        scalability: "high",
      });
    });

    it("should return correct capabilities for HYBRID mode", () => {
      process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
      StorageFactory.initialize({ mode: "HYBRID" });
      const capabilities = StorageFactory.getCapabilities();

      expect(capabilities).toEqual({
        persistence: true,
        sync: true,
        performance: "medium",
        scalability: "high",
      });
    });
  });

  describe("Storage Info and Health", () => {
    it("should get storage info from current provider", async () => {
      StorageFactory.initialize({ mode: "LOCAL" });

      const info = await StorageFactory.getStorageInfo();

      expect(info).toHaveProperty("mode", "LOCAL");
      expect(info).toHaveProperty("sessionCount");
      expect(info).toHaveProperty("memoryUsage");
      expect(info).toHaveProperty("performance");
    });

    it("should perform health check on current provider", async () => {
      StorageFactory.initialize({ mode: "LOCAL" });

      const health = await StorageFactory.healthCheck();

      expect(health).toHaveProperty("healthy");
      expect(health).toHaveProperty("mode", "LOCAL");
      expect(health).toHaveProperty("lastCheck");
    });
  });

  describe("Configuration", () => {
    it("should merge environment variables with custom config", () => {
      process.env.TERMINAL_STORAGE_MODE = "LOCAL";
      process.env.TERMINAL_MAX_SESSIONS = "75";
      process.env.TERMINAL_PERSIST_TO_DISK = "true";

      StorageFactory.initialize({
        local: { flushInterval: 10000 },
      });

      const config = StorageFactory.getConfig();
      expect(config?.mode).toBe("LOCAL");
      expect(config?.local?.maxSessions).toBe(75);
      expect(config?.local?.persistToDisk).toBe(true);
      expect(config?.local?.flushInterval).toBe(10000);
    });

    it("should use default values when env variables are not set", () => {
      StorageFactory.initialize();

      const config = StorageFactory.getConfig();
      expect(config?.local?.maxSessions).toBe(50);
      expect(config?.local?.flushInterval).toBe(5000);
      expect(config?.database?.poolSize).toBe(10);
      expect(config?.hybrid?.syncStrategy).toBe("eventual");
    });
  });

  describe("Cleanup", () => {
    it("should cleanup all providers", async () => {
      StorageFactory.initialize({ mode: "LOCAL" });
      const provider = StorageFactory.getProvider();

      // Create a session to ensure provider is active
      await provider.createSession({
        projectId: "test",
        projectPath: "/test",
        mode: "normal",
      });

      await StorageFactory.cleanup();

      // After cleanup, providers should be cleared
      StorageFactory.reset();
      expect(StorageFactory.getMode()).toBeNull();
    });
  });
});
