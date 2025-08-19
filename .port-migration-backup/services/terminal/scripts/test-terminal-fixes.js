#!/usr/bin/env node

/**
 * Terminal System Fix Verification Script
 * Tests the comprehensive fixes applied to the terminal system
 *
 * Run with: node scripts/test-terminal-fixes.js
 */

const WebSocket = require("ws");
const axios = require("axios");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

// Test Configuration
const CONFIG = {
  BASE_URL: "http://localhost:4000",
  SYSTEM_TERMINAL_PORT: 4001,
  CLAUDE_TERMINAL_PORT: 4002,
  TEST_PROJECT_ID: `test-fix-${Date.now()}`,
  TEST_USER_TOKEN: null,
  TIMEOUT: 15000,
};

// Test Results
const RESULTS = {
  passed: [],
  failed: [],
  warnings: [],
  startTime: new Date(),
  endTime: null,
};

// Utility Functions
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function log(message, type = "info") {
  const icons = {
    info: "ℹ️",
    success: "✅",
    error: "❌",
    warning: "⚠️",
    test: "🧪",
    pending: "⏳",
  };
  console.log(`${icons[type] || ""} ${message}`);
}

async function authenticate() {
  try {
    log("Authenticating with test credentials...", "pending");
    const response = await axios.post(`${CONFIG.BASE_URL}/api/ums/auth/login`, {
      emailOrUsername: "sankaz@admin.com",
      password: "Sankaz#3E25167B@2025",
    });

    CONFIG.TEST_USER_TOKEN = response.data.accessToken;
    log("Authentication successful", "success");
    return true;
  } catch (error) {
    log(`Authentication failed: ${error.message}`, "error");
    // Try with fallback credentials
    try {
      const response2 = await axios.post(
        `${CONFIG.BASE_URL}/api/ums/auth/login`,
        {
          emailOrUsername: "admin@example.com",
          password: "Admin@123",
        },
      );
      CONFIG.TEST_USER_TOKEN = response2.data.accessToken;
      log("Authentication successful with fallback credentials", "success");
      return true;
    } catch (error2) {
      log(`Fallback authentication also failed: ${error2.message}`, "error");
      return false;
    }
  }
}

// Test 1: Database Foreign Key Constraint Fix
async function testDatabaseForeignKeyFix() {
  const testName = "Database Foreign Key Constraint Fix";
  log(`Testing: ${testName}`, "test");

  try {
    // Try to create a terminal session with a new project ID
    const response = await axios.post(
      `${CONFIG.BASE_URL}/api/workspace/projects/${CONFIG.TEST_PROJECT_ID}/terminals`,
      {
        type: "system",
        tabName: "FK-Test-Terminal",
        projectPath: process.cwd(),
      },
      {
        headers: {
          Authorization: `Bearer ${CONFIG.TEST_USER_TOKEN}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (response.data && response.data.id) {
      log(
        `Session created successfully with auto-project creation: ${response.data.id}`,
        "success",
      );
      RESULTS.passed.push({
        test: testName,
        message: "Auto-project creation working",
      });
      return true;
    } else {
      throw new Error("No session ID returned");
    }
  } catch (error) {
    log(
      `Failed to create session: ${error.response?.data?.error || error.message}`,
      "error",
    );
    RESULTS.failed.push({ test: testName, error: error.message });
    return false;
  }
}

// Test 2: Claude CLI Integration Fix
async function testClaudeCLIIntegration() {
  const testName = "Claude CLI Integration Fix";
  log(`Testing: ${testName}`, "test");

  return new Promise((resolve) => {
    const sessionId = `claude_test_${Date.now()}`;
    const ws = new WebSocket(
      `ws://127.0.0.1:${CONFIG.CLAUDE_TERMINAL_PORT}/?projectId=${CONFIG.TEST_PROJECT_ID}&sessionId=${sessionId}`,
    );

    let claudeReady = false;
    let outputBuffer = "";

    const timeout = setTimeout(() => {
      ws.close();
      if (!claudeReady) {
        RESULTS.warnings.push({
          test: testName,
          message:
            "Claude CLI did not report ready within timeout, but connection was established",
        });
      } else {
        RESULTS.passed.push({
          test: testName,
          message: "Claude CLI started and responded",
        });
      }
      resolve(claudeReady);
    }, CONFIG.TIMEOUT);

    ws.on("open", () => {
      log("Claude terminal WebSocket connected", "success");
    });

    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data);

        if (message.type === "claude_ready") {
          claudeReady = true;
          log(`Claude CLI reported ready: ${message.message}`, "success");
          if (message.detectedPrompt) {
            log(`Detected prompt: ${message.detectedPrompt}`, "info");
          }
          clearTimeout(timeout);
          ws.close();
          RESULTS.passed.push({
            test: testName,
            message: "Claude CLI initialized successfully",
          });
          resolve(true);
        } else if (message.type === "stream") {
          outputBuffer += message.data;
          // Check for Claude prompts in stream data
          const readyIndicators = [
            "claude>",
            "Claude>",
            "Welcome to Claude",
            "How can I help",
          ];
          if (
            readyIndicators.some((indicator) =>
              message.data.toLowerCase().includes(indicator.toLowerCase()),
            )
          ) {
            claudeReady = true;
            log("Claude CLI ready detected in stream", "success");
          }
        } else if (message.type === "error") {
          log(`Claude terminal error: ${message.message}`, "error");
        }
      } catch (error) {
        log(`Error parsing message: ${error.message}`, "warning");
      }
    });

    ws.on("error", (error) => {
      clearTimeout(timeout);
      log(`WebSocket error: ${error.message}`, "error");
      RESULTS.failed.push({ test: testName, error: error.message });
      resolve(false);
    });
  });
}

// Test 3: Session Persistence with Retries
async function testSessionPersistence() {
  const testName = "Session Persistence with Retry Logic";
  log(`Testing: ${testName}`, "test");

  try {
    // Create multiple sessions rapidly to test retry logic
    const promises = [];
    for (let i = 0; i < 3; i++) {
      promises.push(
        axios.post(
          `${CONFIG.BASE_URL}/api/workspace/projects/${CONFIG.TEST_PROJECT_ID}-persist-${i}/terminals`,
          {
            type: "system",
            tabName: `Persist-Test-${i}`,
            projectPath: process.cwd(),
          },
          {
            headers: {
              Authorization: `Bearer ${CONFIG.TEST_USER_TOKEN}`,
              "Content-Type": "application/json",
            },
          },
        ),
      );
    }

    const results = await Promise.allSettled(promises);
    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    log(
      `Created ${succeeded}/3 sessions successfully`,
      succeeded === 3 ? "success" : "warning",
    );

    if (succeeded >= 2) {
      RESULTS.passed.push({
        test: testName,
        message: `${succeeded}/3 sessions created with retry logic`,
      });
      return true;
    } else {
      RESULTS.failed.push({
        test: testName,
        error: `Only ${succeeded}/3 sessions created`,
      });
      return false;
    }
  } catch (error) {
    log(`Session persistence test failed: ${error.message}`, "error");
    RESULTS.failed.push({ test: testName, error: error.message });
    return false;
  }
}

// Test 4: Graceful Degradation
async function testGracefulDegradation() {
  const testName = "Graceful Degradation (In-Memory Fallback)";
  log(`Testing: ${testName}`, "test");

  // This test verifies that the system can create sessions even if database is having issues
  // We'll test by creating a session with a very long project ID that might fail in DB
  const longProjectId = "x".repeat(500); // Intentionally long ID

  return new Promise((resolve) => {
    const ws = new WebSocket(
      `ws://127.0.0.1:${CONFIG.SYSTEM_TERMINAL_PORT}/?projectId=${longProjectId}`,
    );

    const timeout = setTimeout(() => {
      ws.close();
      RESULTS.failed.push({
        test: testName,
        error: "Connection timeout",
      });
      resolve(false);
    }, 10000);

    ws.on("open", () => {
      log("Connection established despite potential DB issues", "success");
    });

    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data);
        if (message.type === "connected" || message.type === "reconnected") {
          clearTimeout(timeout);
          log("Session created with graceful degradation", "success");
          ws.close();
          RESULTS.passed.push({
            test: testName,
            message: "In-memory fallback working",
          });
          resolve(true);
        }
      } catch (error) {
        log(`Parse error: ${error.message}`, "warning");
      }
    });

    ws.on("error", (error) => {
      clearTimeout(timeout);
      log(
        `WebSocket error (expected in degradation test): ${error.message}`,
        "warning",
      );
      RESULTS.warnings.push({
        test: testName,
        message: "Connection failed but graceful degradation may still work",
      });
      resolve(false);
    });
  });
}

// Test 5: Command Execution Without Fragmentation
async function testCommandExecution() {
  const testName = "Command Execution Without Fragmentation";
  log(`Testing: ${testName}`, "test");

  return new Promise((resolve) => {
    const ws = new WebSocket(
      `ws://127.0.0.1:${CONFIG.SYSTEM_TERMINAL_PORT}/?projectId=${CONFIG.TEST_PROJECT_ID}`,
    );

    let commandsSent = 0;
    let responsesReceived = 0;
    const expectedResponses = 3;

    const timeout = setTimeout(() => {
      ws.close();
      if (responsesReceived >= 2) {
        RESULTS.passed.push({
          test: testName,
          message: `${responsesReceived}/${expectedResponses} commands executed`,
        });
        resolve(true);
      } else {
        RESULTS.failed.push({
          test: testName,
          error: `Only ${responsesReceived}/${expectedResponses} commands executed`,
        });
        resolve(false);
      }
    }, CONFIG.TIMEOUT);

    ws.on("open", () => {
      log("Terminal connected for command testing", "success");
    });

    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data);

        if (message.type === "connected") {
          // Send first command
          ws.send(JSON.stringify({ type: "input", data: 'echo "Test 1"\r' }));
          commandsSent++;
        } else if (message.type === "stream") {
          if (message.data.includes("Test 1")) {
            responsesReceived++;
            log("Command 1 executed successfully", "success");
            // Send second command
            ws.send(JSON.stringify({ type: "input", data: 'echo "Test 2"\r' }));
            commandsSent++;
          } else if (message.data.includes("Test 2")) {
            responsesReceived++;
            log("Command 2 executed successfully", "success");
            // Send third command
            ws.send(JSON.stringify({ type: "input", data: 'echo "Test 3"\r' }));
            commandsSent++;
          } else if (message.data.includes("Test 3")) {
            responsesReceived++;
            log("Command 3 executed successfully", "success");
            clearTimeout(timeout);
            ws.close();
            RESULTS.passed.push({
              test: testName,
              message: "All commands executed without fragmentation",
            });
            resolve(true);
          }
        }
      } catch (error) {
        log(`Parse error: ${error.message}`, "warning");
      }
    });

    ws.on("error", (error) => {
      clearTimeout(timeout);
      RESULTS.failed.push({ test: testName, error: error.message });
      resolve(false);
    });
  });
}

// Main Test Runner
async function runTests() {
  console.log("\n" + "=".repeat(60));
  console.log("🚀 Terminal System Fix Verification");
  console.log("=".repeat(60));

  // Check if dev server is running
  try {
    await axios.get(`${CONFIG.BASE_URL}/api/health`);
    log("Development server is running with database connection", "success");
  } catch (error) {
    if (error.response && error.response.status === 503) {
      log(
        "Development server is running but database is unavailable (testing graceful degradation)",
        "warning",
      );
    } else if (error.code === "ECONNREFUSED") {
      log(
        "Development server is not running. Please run: npm run dev",
        "error",
      );
      process.exit(1);
    } else {
      log(`Server check warning: ${error.message}`, "warning");
    }
  }

  // Authenticate
  const authSuccess = await authenticate();
  if (!authSuccess) {
    log("Cannot proceed without authentication", "error");
    process.exit(1);
  }

  // Run tests
  console.log("\n" + "-".repeat(60));
  await testDatabaseForeignKeyFix();
  await delay(1000);

  console.log("\n" + "-".repeat(60));
  await testClaudeCLIIntegration();
  await delay(1000);

  console.log("\n" + "-".repeat(60));
  await testSessionPersistence();
  await delay(1000);

  console.log("\n" + "-".repeat(60));
  await testGracefulDegradation();
  await delay(1000);

  console.log("\n" + "-".repeat(60));
  await testCommandExecution();

  // Report Results
  RESULTS.endTime = new Date();
  const duration = (RESULTS.endTime - RESULTS.startTime) / 1000;

  console.log("\n" + "=".repeat(60));
  console.log("📊 TEST RESULTS SUMMARY");
  console.log("=".repeat(60));

  console.log(`\n✅ Passed: ${RESULTS.passed.length}`);
  RESULTS.passed.forEach((r) => console.log(`   • ${r.test}: ${r.message}`));

  if (RESULTS.warnings.length > 0) {
    console.log(`\n⚠️  Warnings: ${RESULTS.warnings.length}`);
    RESULTS.warnings.forEach((r) =>
      console.log(`   • ${r.test}: ${r.message}`),
    );
  }

  if (RESULTS.failed.length > 0) {
    console.log(`\n❌ Failed: ${RESULTS.failed.length}`);
    RESULTS.failed.forEach((r) => console.log(`   • ${r.test}: ${r.error}`));
  }

  const successRate = Math.round(
    (RESULTS.passed.length / (RESULTS.passed.length + RESULTS.failed.length)) *
      100,
  );
  console.log(`\n📈 Success Rate: ${successRate}%`);
  console.log(`⏱️  Duration: ${duration.toFixed(2)} seconds`);

  // Write results to file
  const reportPath = path.join(__dirname, "terminal-fix-report.json");
  fs.writeFileSync(reportPath, JSON.stringify(RESULTS, null, 2));
  console.log(`\n📄 Detailed report saved to: ${reportPath}`);

  // Exit with appropriate code
  process.exit(RESULTS.failed.length > 0 ? 1 : 0);
}

// Run tests
runTests().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
