#!/usr/bin/env node
const fetch = require("node-fetch");
const { getPortConfig, getServiceUrl, getFrontendPort, getGatewayPort } = require('@/shared/config/ports.cjs');
const portConfig = getPortConfig();

// Test configuration
const BASE_URL = "http://${getFrontendPort()}";
const TEST_USER_EMAIL = "test@example.com";
const TEST_USER_PASSWORD = "password123";
const TEST_PROJECT_ID = "test-project-001";

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function loginUser() {
  log("\n🔐 Logging in user...", colors.cyan);

  const response = await fetch(`${BASE_URL}/api/ums/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD,
    }),
  });

  if (!response.ok) {
    throw new Error(`Login failed: ${response.statusText}`);
  }

  const data = await response.json();
  const cookies = response.headers.get("set-cookie");
  log("✅ Login successful", colors.green);

  return { token: data.token, cookies };
}

async function testAssistantLogging(auth) {
  log("\n🤖 Testing AI Assistant Logging...", colors.cyan);

  // Send a test message
  const chatResponse = await fetch(`${BASE_URL}/api/assistant/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${auth.token}`,
      Cookie: auth.cookies || "",
    },
    body: JSON.stringify({
      message: "Hello, this is a test message for logging",
      projectId: TEST_PROJECT_ID,
      sessionId: `test-session-${Date.now()}`,
    }),
  });

  if (!chatResponse.ok) {
    throw new Error(`Chat request failed: ${chatResponse.statusText}`);
  }

  const chatData = await chatResponse.json();
  log(`✅ Chat message sent. Session ID: ${chatData.sessionId}`, colors.green);

  // Get assistant logs
  const logsResponse = await fetch(
    `${BASE_URL}/api/logs/assistant?projectId=${TEST_PROJECT_ID}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${auth.token}`,
        Cookie: auth.cookies || "",
      },
    },
  );

  if (!logsResponse.ok) {
    throw new Error(`Failed to get assistant logs: ${logsResponse.statusText}`);
  }

  const logsData = await logsResponse.json();
  log(`✅ Assistant logs retrieved:`, colors.green);
  log(`   - Sessions: ${logsData.sessions?.length || 0}`, colors.white);
  log(`   - Total tokens: ${logsData.stats?.totalTokens || 0}`, colors.white);
  log(`   - Total cost: $${logsData.stats?.totalCost || 0}`, colors.white);

  return logsData;
}

async function testTerminalLogging(auth) {
  log("\n💻 Testing Terminal Logging...", colors.cyan);

  // Get terminal logs for project
  const logsResponse = await fetch(
    `${BASE_URL}/api/logs/terminal?projectId=${TEST_PROJECT_ID}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${auth.token}`,
        Cookie: auth.cookies || "",
      },
    },
  );

  if (!logsResponse.ok) {
    log(
      `⚠️ Terminal logs not available: ${logsResponse.statusText}`,
      colors.yellow,
    );
    return null;
  }

  const logsData = await logsResponse.json();
  log(`✅ Terminal logs retrieved:`, colors.green);
  log(
    `   - Total sessions: ${logsData.stats?.totalSessions || 0}`,
    colors.white,
  );
  log(
    `   - Active sessions: ${logsData.stats?.activeSessions || 0}`,
    colors.white,
  );
  log(
    `   - Total commands: ${logsData.stats?.totalCommands || 0}`,
    colors.white,
  );
  log(
    `   - Error rate: ${logsData.stats?.errorRate?.toFixed(2) || 0}%`,
    colors.white,
  );

  return logsData;
}

async function testLogsSummary(auth) {
  log("\n📊 Testing Logs Summary...", colors.cyan);

  const summaryResponse = await fetch(
    `${BASE_URL}/api/logs/summary?projectId=${TEST_PROJECT_ID}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${auth.token}`,
        Cookie: auth.cookies || "",
      },
    },
  );

  if (!summaryResponse.ok) {
    throw new Error(
      `Failed to get logs summary: ${summaryResponse.statusText}`,
    );
  }

  const summaryData = await summaryResponse.json();
  log(`✅ Logs summary retrieved:`, colors.green);
  log(`   Overall Statistics:`, colors.bright);
  log(
    `   - Total AI tokens: ${summaryData.summary?.overall?.totalAiTokens || 0}`,
    colors.white,
  );
  log(
    `   - Total AI cost: $${summaryData.summary?.overall?.totalAiCost || 0}`,
    colors.white,
  );
  log(
    `   - Total terminal commands: ${summaryData.summary?.overall?.totalTerminalCommands || 0}`,
    colors.white,
  );
  log(
    `   - Error rate: ${summaryData.summary?.overall?.errorRate?.toFixed(2) || 0}%`,
    colors.white,
  );

  return summaryData;
}

async function runTests() {
  log("\n🚀 Starting Logging System Tests", colors.bright + colors.blue);
  log("================================", colors.blue);

  try {
    // Login first
    const auth = await loginUser();

    // Test assistant logging
    const assistantLogs = await testAssistantLogging(auth);

    // Test terminal logging
    const terminalLogs = await testTerminalLogging(auth);

    // Test summary endpoint
    const summary = await testLogsSummary(auth);

    log("\n✅ All tests completed successfully!", colors.bright + colors.green);
    log("================================", colors.green);

    // Display summary
    log("\n📈 Test Results Summary:", colors.bright + colors.magenta);
    log(
      `- Assistant logging: ${assistantLogs ? "Working" : "Failed"}`,
      colors.white,
    );
    log(
      `- Terminal logging: ${terminalLogs ? "Working" : "Not available"}`,
      colors.white,
    );
    log(`- Summary endpoint: ${summary ? "Working" : "Failed"}`, colors.white);
  } catch (error) {
    log(`\n❌ Test failed: ${error.message}`, colors.bright + colors.red);
    log(error.stack, colors.red);
    process.exit(1);
  }
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch(`${BASE_URL}/api/health`);
    if (!response.ok) {
      throw new Error("Server is not responding");
    }
    return true;
  } catch (error) {
    log(`❌ Server is not running at ${BASE_URL}`, colors.red);
    log("Please start the server with: npm run dev", colors.yellow);
    process.exit(1);
  }
}

// Main execution
(async () => {
  await checkServer();
  await runTests();
})();
