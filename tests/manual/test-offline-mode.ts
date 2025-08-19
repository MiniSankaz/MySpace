#!/usr/bin/env tsx

/**
 * Test Script for Offline Mode
 * Simulates database failures and tests fallback mechanisms
 */

import {
  dbManager,
  ConnectionStatus,
} from "../src/core/database/connection-manager";
import { offlineStore } from "../src/core/database/offline-store";
import { enhancedUserService } from "../src/modules/ums/services/user.service.enhanced";
import { developmentConfig } from "../src/core/config/development.config";

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  gray: "\x1b[90m",
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title: string) {
  console.log("\n" + "=".repeat(60));
  log(title, colors.blue);
  console.log("=".repeat(60));
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function testDatabaseConnection() {
  logSection("Testing Database Connection");

  try {
    log("Checking initial connection status...", colors.gray);
    const status = dbManager.getStatus();
    log(
      `Initial status: ${status}`,
      status === ConnectionStatus.CONNECTED ? colors.green : colors.yellow,
    );

    log("Attempting to get database client...", colors.gray);
    const client = await dbManager.getClient();

    if (client) {
      log("✓ Database connection successful", colors.green);
      const metrics = dbManager.getMetrics();
      log(`  - Response time: ${metrics.averageResponseTime}ms`, colors.gray);
      log(
        `  - Successful connections: ${metrics.successfulConnections}`,
        colors.gray,
      );
      log(`  - Failed connections: ${metrics.failedConnections}`, colors.gray);
    } else {
      log(
        "✗ Database connection failed - running in offline mode",
        colors.yellow,
      );
    }
  } catch (error) {
    log(`✗ Database connection error: ${error}`, colors.red);
  }
}

async function testOfflineStore() {
  logSection("Testing Offline Store");

  try {
    // Test setting and getting data
    log("Testing cache operations...", colors.gray);

    const testData = { id: "test_1", name: "Test Data", timestamp: Date.now() };
    await offlineStore.set("test_key", testData);
    log("✓ Data stored successfully", colors.green);

    const retrieved = await offlineStore.get("test_key");
    if (retrieved && retrieved.id === testData.id) {
      log("✓ Data retrieved successfully", colors.green);
    } else {
      log("✗ Data retrieval failed", colors.red);
    }

    // Test user operations
    log("\nTesting user operations...", colors.gray);
    const mockUser = await offlineStore.getCurrentUser();
    if (mockUser) {
      log("✓ Mock user generated successfully", colors.green);
      log(`  - User ID: ${mockUser.id}`, colors.gray);
      log(`  - Email: ${mockUser.email}`, colors.gray);
      log(`  - Roles: ${mockUser.roles.join(", ")}`, colors.gray);
    } else {
      log("✗ Failed to generate mock user", colors.red);
    }

    // Clean up
    await offlineStore.delete("test_key");
    log("✓ Test data cleaned up", colors.green);
  } catch (error) {
    log(`✗ Offline store error: ${error}`, colors.red);
  }
}

async function testUserServiceFallback() {
  logSection("Testing User Service Fallback");

  try {
    // Test getting user with fallback
    log("Testing user retrieval with fallback...", colors.gray);

    const user = await enhancedUserService.getCurrentUser();
    if (user) {
      log("✓ User retrieved successfully", colors.green);
      log(
        `  - Source: ${dbManager.isAvailable() ? "Database" : "Offline/Mock"}`,
        colors.gray,
      );
      log(
        `  - User: ${user.displayName || user.username} (${user.email})`,
        colors.gray,
      );
    } else {
      log("✗ Failed to retrieve user", colors.red);
    }

    // Test user list with fallback
    log("\nTesting user list with fallback...", colors.gray);
    const userList = await enhancedUserService.listUsers();
    if (userList && userList.users) {
      log("✓ User list retrieved successfully", colors.green);
      log(`  - Total users: ${userList.users.length}`, colors.gray);
      log(
        `  - Source: ${dbManager.isAvailable() ? "Database" : "Mock data"}`,
        colors.gray,
      );
    } else {
      log("✗ Failed to retrieve user list", colors.red);
    }
  } catch (error) {
    log(`✗ User service error: ${error}`, colors.red);
  }
}

async function simulateDatabaseFailure() {
  logSection("Simulating Database Failure");

  try {
    log("Forcing database offline...", colors.yellow);
    dbManager.forceOffline();
    await sleep(1000);

    const status = dbManager.getStatus();
    log(
      `Database status: ${status}`,
      status === ConnectionStatus.OFFLINE ? colors.green : colors.red,
    );

    // Test operations in offline mode
    log("\nTesting operations in offline mode...", colors.gray);

    // Should use fallback
    const user = await enhancedUserService.getCurrentUser();
    if (user) {
      log("✓ User service working in offline mode", colors.green);
    } else {
      log("✗ User service failed in offline mode", colors.red);
    }

    // Check offline store status
    const isOffline = offlineStore.isOffline();
    log(
      `Offline store status: ${isOffline ? "OFFLINE" : "ONLINE"}`,
      isOffline ? colors.yellow : colors.green,
    );
  } catch (error) {
    log(`✗ Simulation error: ${error}`, colors.red);
  }
}

async function testRecovery() {
  logSection("Testing Recovery from Offline Mode");

  try {
    log("Attempting to go back online...", colors.gray);
    await dbManager.goOnline();
    await sleep(2000);

    const status = dbManager.getStatus();
    if (status === ConnectionStatus.CONNECTED) {
      log("✓ Successfully reconnected to database", colors.green);
    } else if (status === ConnectionStatus.ERROR) {
      log("✗ Failed to reconnect - database may be unavailable", colors.yellow);
    } else {
      log(`Database status: ${status}`, colors.gray);
    }

    const metrics = dbManager.getMetrics();
    log("\nConnection Metrics:", colors.blue);
    log(`  - Total attempts: ${metrics.totalAttempts}`, colors.gray);
    log(`  - Successful: ${metrics.successfulConnections}`, colors.gray);
    log(`  - Failed: ${metrics.failedConnections}`, colors.gray);
    if (metrics.lastError) {
      log(`  - Last error: ${metrics.lastError}`, colors.red);
    }
  } catch (error) {
    log(`✗ Recovery error: ${error}`, colors.red);
  }
}

async function runAllTests() {
  console.clear();
  log("🧪 Offline Mode Test Suite", colors.blue);
  log("Testing database resilience and fallback mechanisms\n", colors.gray);

  // Check environment
  log(`Environment: ${process.env.NODE_ENV || "development"}`, colors.gray);
  log(
    `Offline mode enabled: ${developmentConfig.enableOfflineMode}`,
    colors.gray,
  );
  log(`Mock data enabled: ${developmentConfig.enableMockData}`, colors.gray);
  log(
    `Database fallback enabled: ${developmentConfig.enableDatabaseFallback}`,
    colors.gray,
  );

  try {
    // Run tests in sequence
    await testDatabaseConnection();
    await sleep(1000);

    await testOfflineStore();
    await sleep(1000);

    await testUserServiceFallback();
    await sleep(1000);

    await simulateDatabaseFailure();
    await sleep(1000);

    await testRecovery();

    // Summary
    logSection("Test Summary");
    log("✓ All tests completed", colors.green);
    log("\nRecommendations:", colors.blue);

    if (!dbManager.isAvailable()) {
      log("  - Database is currently unavailable", colors.yellow);
      log("  - Application is running in offline mode", colors.yellow);
      log("  - All features using mock/cached data", colors.yellow);
    } else {
      log("  - Database connection is healthy", colors.green);
      log("  - Fallback mechanisms are ready if needed", colors.green);
    }

    log("\nTo test offline mode in the application:", colors.blue);
    log("  1. Set OFFLINE_MODE=true in .env.local", colors.gray);
    log("  2. Or set FORCE_OFFLINE=true", colors.gray);
    log("  3. Restart the development server", colors.gray);
    log("  4. The app will work without database connection", colors.gray);
  } catch (error) {
    log(`\n✗ Test suite failed: ${error}`, colors.red);
    process.exit(1);
  }

  // Cleanup
  await dbManager.disconnect();
  process.exit(0);
}

// Run tests
runAllTests().catch((error) => {
  log(`Fatal error: ${error}`, colors.red);
  process.exit(1);
});
