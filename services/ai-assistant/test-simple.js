// Simple test to check what's failing
console.log("Starting simple test...");

try {
  console.log("1. Testing environment variables...");
  require("dotenv").config();
  console.log("2. Environment loaded");

  console.log("3. Testing logger import...");
  const logger = require("./dist/utils/logger");
  console.log("4. Logger imported");

  console.log("5. Testing Prisma client...");
  const { PrismaClient } = require("@prisma/client");
  console.log("6. Prisma imported");

  console.log("7. Testing types import...");
  // Note: types are TypeScript only, so this will fail in JS
  // const types = require('./dist/types');
  console.log("7. Types skipped (TS only)");

  console.log("8. Testing Claude service...");
  // const ClaudeService = require('./dist/services/claude.service');
  console.log("8. Claude service skipped");

  console.log("✅ Basic imports working");
} catch (error) {
  console.error("❌ Error:", error.message);
  console.error("Stack:", error.stack);
}
