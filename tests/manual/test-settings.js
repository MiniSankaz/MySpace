#!/usr/bin/env node

/**
 * Test script for Settings system
 */

const { prisma } = require("../src/core/database/prisma");
const { SettingsService } = require("../src/services/settings.service");

async function testSettings() {
  console.log("🧪 Testing Settings System...\n");

  const settingsService = new SettingsService();
  const testUserId = "test-user-" + Date.now();

  try {
    // Create test user
    console.log("1️⃣ Creating test user...");
    await prisma.user.create({
      data: {
        id: testUserId,
        email: `${testUserId}@test.local`,
        username: testUserId,
        passwordHash: "TEST",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    console.log("✅ Test user created:", testUserId);

    // Test User Settings
    console.log("\n2️⃣ Testing User Settings...");
    await settingsService.setUserConfig(
      testUserId,
      "theme",
      "dark",
      "appearance",
    );
    await settingsService.setUserConfig(
      testUserId,
      "language",
      "th",
      "preferences",
    );
    await settingsService.setUserConfig(
      testUserId,
      "timezone",
      "Asia/Bangkok",
      "preferences",
    );

    const userConfigs = await settingsService.getUserConfig(testUserId);
    console.log("✅ User configs saved:", userConfigs.length, "items");

    const theme = await settingsService.getUserConfig(testUserId, "theme");
    console.log("✅ Retrieved theme:", theme);

    // Test API Settings
    console.log("\n3️⃣ Testing API Settings...");
    await settingsService.setApiConfig(
      testUserId,
      "maxRequestsPerHour",
      1000,
      "limits",
      "Max requests per hour",
    );
    await settingsService.setApiConfig(
      testUserId,
      "webhookUrl",
      "https://example.com/webhook",
      "webhooks",
      "Webhook endpoint",
    );

    const apiConfigs = await settingsService.getApiConfig(testUserId);
    console.log("✅ API configs saved:", apiConfigs.length, "items");

    // Test System Settings (Global)
    console.log("\n4️⃣ Testing System Settings...");
    await settingsService.setSystemConfig(
      "maintenanceMode",
      false,
      "system",
      "Maintenance mode flag",
    );
    await settingsService.setSystemConfig(
      "maxUploadSize",
      "10MB",
      "storage",
      "Maximum upload size",
    );

    const systemConfigs = await settingsService.getSystemConfig();
    console.log("✅ System configs saved:", systemConfigs.length, "items");

    // Test Bulk Operations
    console.log("\n5️⃣ Testing Bulk Operations...");
    const bulkConfigs = [
      { key: "notifications.email", value: true, category: "notifications" },
      { key: "notifications.push", value: false, category: "notifications" },
      { key: "notifications.sms", value: false, category: "notifications" },
    ];

    await settingsService.setUserConfigs(testUserId, bulkConfigs);
    const notificationConfigs = await settingsService.getUserConfig(
      testUserId,
      null,
      "notifications",
    );
    console.log(
      "✅ Bulk configs saved:",
      notificationConfigs.length,
      "notification settings",
    );

    // Test Default Settings
    console.log("\n6️⃣ Testing Default Settings...");
    const defaultUser = settingsService.getDefaultUserSettings();
    console.log(
      "✅ Default user settings:",
      Object.keys(defaultUser).length,
      "categories",
    );

    const defaultApi = settingsService.getDefaultApiSettings();
    console.log(
      "✅ Default API settings:",
      Object.keys(defaultApi).length,
      "categories",
    );

    const defaultSystem = settingsService.getDefaultSystemSettings();
    console.log(
      "✅ Default system settings:",
      Object.keys(defaultSystem).length,
      "categories",
    );

    // Summary
    console.log("\n✨ Settings System Test Summary:");
    console.log("-----------------------------------");
    console.log("✅ User Settings: Working");
    console.log("✅ API Settings: Working");
    console.log("✅ System Settings: Working");
    console.log("✅ Bulk Operations: Working");
    console.log("✅ Default Settings: Working");
    console.log("\n🎉 All tests passed successfully!");

    // Cleanup
    console.log("\n🧹 Cleaning up test data...");
    await settingsService.deleteAllUserConfigs(testUserId);
    await prisma.apiConfig.deleteMany({ where: { userId: testUserId } });
    await prisma.user.delete({ where: { id: testUserId } });
    console.log("✅ Test data cleaned up");
  } catch (error) {
    console.error("\n❌ Test failed:", error.message);
    console.error(error);

    // Cleanup on error
    try {
      await prisma.userConfig.deleteMany({ where: { userId: testUserId } });
      await prisma.apiConfig.deleteMany({ where: { userId: testUserId } });
      await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
    } catch (cleanupError) {
      // Ignore cleanup errors
    }

    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run tests
testSettings().catch(console.error);
