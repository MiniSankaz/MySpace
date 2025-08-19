/**
 * Test script for Phase 1 of Terminal Management System Redesign
 * Tests:
 * 1. Unified Terminal Service
 * 2. New API endpoints
 * 3. Focus-aware WebSocket servers
 */

const axios = require("axios");
const { getPortConfig, getServiceUrl, getFrontendPort, getGatewayPort } = require('@/shared/config/ports.cjs');
const portConfig = getPortConfig();

const BASE_URL = "http://${getGatewayPort()}";
const API_URL = `${BASE_URL}/api/terminal`;

// Test configuration
const testProjectId = "test-project-" + Date.now();
const testProjectPath = "/tmp/test-terminal";

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function testAPI() {
  log("\n=== Testing Phase 1: Terminal Management System ===\n", "cyan");

  try {
    // Test 1: Health Check
    log("Test 1: Health Check", "yellow");
    const healthResponse = await axios.get(`${API_URL}/health`);
    log("✓ Health check passed", "green");
    log(`  System status: ${healthResponse.data.system.status}`);
    log(`  Claude status: ${healthResponse.data.claude.status}`);

    // Test 2: Create Terminal Session
    log("\nTest 2: Create Terminal Session", "yellow");
    const createResponse = await axios.post(`${API_URL}/create`, {
      projectId: testProjectId,
      type: "system",
      tabName: "Test Terminal",
      projectPath: testProjectPath,
    });

    const sessionId = createResponse.data.sessionId;
    log("✓ Terminal session created", "green");
    log(`  Session ID: ${sessionId}`);
    log(`  WebSocket URL: ${createResponse.data.wsUrl}`);

    // Test 3: List Sessions
    log("\nTest 3: List Sessions", "yellow");
    const listResponse = await axios.get(
      `${API_URL}/list?projectId=${testProjectId}`,
    );
    log("✓ Sessions listed successfully", "green");
    log(`  Sessions found: ${listResponse.data.sessions.length}`);
    log(`  Focused system: ${listResponse.data.focused.system || "none"}`);
    log(`  Focused claude: ${listResponse.data.focused.claude || "none"}`);

    // Test 4: Set Focus
    log("\nTest 4: Set Focus", "yellow");
    const focusResponse = await axios.put(`${API_URL}/focus`, {
      sessionId: sessionId,
      projectId: testProjectId,
      type: "system",
    });
    log("✓ Focus set successfully", "green");
    log(`  Previous focus: ${focusResponse.data.previousFocus || "none"}`);
    log(
      `  Buffered output: ${focusResponse.data.bufferedOutput ? "yes" : "no"}`,
    );

    // Test 5: Create Claude Terminal
    log("\nTest 5: Create Claude Terminal", "yellow");
    const claudeResponse = await axios.post(`${API_URL}/create`, {
      projectId: testProjectId,
      type: "claude",
      tabName: "Claude Terminal",
      projectPath: testProjectPath,
    });

    const claudeSessionId = claudeResponse.data.sessionId;
    log("✓ Claude terminal created", "green");
    log(`  Session ID: ${claudeSessionId}`);
    log(`  WebSocket URL: ${claudeResponse.data.wsUrl}`);

    // Test 6: Switch Focus
    log("\nTest 6: Switch Focus to Claude", "yellow");
    const switchFocusResponse = await axios.put(`${API_URL}/focus`, {
      sessionId: claudeSessionId,
      projectId: testProjectId,
      type: "claude",
    });
    log("✓ Focus switched successfully", "green");
    log(
      `  Previous focus: ${switchFocusResponse.data.previousFocus || "none"}`,
    );

    // Test 7: Close Terminal
    log("\nTest 7: Close Terminal", "yellow");
    const closeResponse = await axios.delete(`${API_URL}/close/${sessionId}`);
    log("✓ Terminal closed successfully", "green");
    log(`  Status: ${closeResponse.data.status}`);
    log(`  New focus: ${closeResponse.data.newFocus || "none"}`);

    // Test 8: Cleanup Project Sessions
    log("\nTest 8: Cleanup Project Sessions", "yellow");
    const cleanupResponse = await axios.delete(
      `${API_URL}/cleanup?projectId=${testProjectId}`,
    );
    log("✓ Project sessions cleaned up", "green");
    log(`  Closed count: ${cleanupResponse.data.closedCount}`);
    log(`  Errors: ${cleanupResponse.data.errors.length}`);

    log("\n=== All Phase 1 Tests Passed! ===\n", "green");
  } catch (error) {
    log("\n✗ Test failed!", "red");
    if (error.response) {
      log(`  Status: ${error.response.status}`, "red");
      log(`  Error: ${JSON.stringify(error.response.data)}`, "red");
    } else {
      log(`  Error: ${error.message}`, "red");
    }
    process.exit(1);
  }
}

// Run tests
testAPI().catch((error) => {
  log(`\nUnexpected error: ${error.message}`, "red");
  process.exit(1);
});
