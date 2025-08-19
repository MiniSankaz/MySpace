#!/usr/bin/env tsx

import { AIAssistantConfigService } from "../src/services/ai-assistant-config.service";
import { SettingsService } from "../src/services/settings.service";
import { prisma } from "../src/core/database/prisma";

async function testAISettings() {
  console.log("🧪 Testing AI Assistant Settings Integration...\n");

  const configService = AIAssistantConfigService.getInstance();
  const settingsService = new SettingsService();

  const testUserId = "test-user-123";

  // 0. Ensure test user exists
  console.log("0️⃣ Creating test user...");
  await prisma.user.upsert({
    where: { id: testUserId },
    create: {
      id: testUserId,
      email: "test@ai-settings.com",
      username: "test-ai-user",
      passwordHash: "hashed_password_value",
      isActive: true,
      emailVerified: new Date(),
      updatedAt: new Date(),
    },
    update: {},
  });
  console.log("✅ Test user ready\n");

  // 1. Test saving settings
  console.log("1️⃣ Saving test settings...");
  const testSettings = [
    { key: "responseTimeout", value: 120, category: "ai_assistant" },
    { key: "maxContextMessages", value: 10, category: "ai_assistant" },
    { key: "temperature", value: 0.7, category: "ai_assistant" },
    { key: "maxTokens", value: 4000, category: "ai_assistant" },
    { key: "modelSelection", value: "claude-3-opus", category: "ai_assistant" },
    { key: "languagePreference", value: "th", category: "ai_assistant" },
    { key: "autoSaveConversations", value: true, category: "ai_assistant" },
    { key: "debugMode", value: true, category: "ai_assistant" },
  ];

  await settingsService.setUserConfigs(testUserId, testSettings);
  console.log("✅ Settings saved successfully\n");

  // 2. Test loading settings through AIAssistantConfigService
  console.log("2️⃣ Loading settings through AIAssistantConfigService...");
  const config = await configService.getUserConfig(testUserId);

  console.log("Loaded configuration:");
  console.log("  - Response Timeout:", config.responseTimeout, "seconds");
  console.log("  - Max Context Messages:", config.maxContextMessages);
  console.log("  - Temperature:", config.temperature);
  console.log("  - Max Tokens:", config.maxTokens);
  console.log("  - Model:", config.modelSelection);
  console.log("  - Language:", config.languagePreference);
  console.log("  - Auto Save:", config.autoSaveConversations);
  console.log("  - Debug Mode:", config.debugMode);
  console.log();

  // 3. Verify values match
  console.log("3️⃣ Verifying values...");
  const checks = [
    config.responseTimeout === 120,
    config.maxContextMessages === 10,
    config.temperature === 0.7,
    config.maxTokens === 4000,
    config.modelSelection === "claude-3-opus",
    config.languagePreference === "th",
    config.autoSaveConversations === true,
    config.debugMode === true,
  ];

  if (checks.every((check) => check)) {
    console.log(
      "✅ All values match! Settings integration is working correctly.",
    );
  } else {
    console.log("❌ Some values do not match. Integration may have issues.");
    checks.forEach((check, index) => {
      if (!check) {
        console.log(`  - Check ${index + 1} failed`);
      }
    });
  }

  // 4. Test cache invalidation
  console.log("\n4️⃣ Testing cache invalidation...");
  await configService.invalidateUserCache(testUserId);
  console.log("✅ Cache invalidated");

  // 5. Load again to verify it reads from database
  console.log("\n5️⃣ Loading settings again (should read from database)...");
  const configAfterInvalidation = await configService.getUserConfig(testUserId);
  console.log("✅ Settings loaded from database");
  console.log(
    "  - Response Timeout:",
    configAfterInvalidation.responseTimeout,
    "seconds",
  );

  console.log("\n✅ Test completed successfully!");
  process.exit(0);
}

testAISettings().catch((error) => {
  console.error("❌ Test failed:", error);
  process.exit(1);
});
