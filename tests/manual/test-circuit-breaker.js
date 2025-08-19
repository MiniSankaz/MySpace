#!/usr/bin/env node

/**
 * Test script for WebSocket circuit breaker functionality
 * Tests that the circuit breaker properly prevents infinite reconnection loops
 */

const WebSocket = require("ws");

// Test configuration
const WS_URL = "ws://localhost:4001";
const TEST_SESSION_ID = `circuit_test_${Date.now()}`;
const PROJECT_ID = "test_project";

let reconnectCount = 0;
let lastCloseCode = null;
let testPassed = false;

console.log("🧪 Testing WebSocket Circuit Breaker...");
console.log(`Session ID: ${TEST_SESSION_ID}`);
console.log("Expected behavior: Should stop reconnecting after 3 failures\n");

function connectWebSocket() {
  reconnectCount++;
  console.log(`[Attempt ${reconnectCount}] Connecting to ${WS_URL}...`);

  const ws = new WebSocket(
    `${WS_URL}?sessionId=${TEST_SESSION_ID}&projectId=${PROJECT_ID}`,
  );

  ws.on("open", () => {
    console.log(`[Attempt ${reconnectCount}] ✅ Connected`);

    // Simulate a failure by immediately closing
    // Note: 1006 is reserved and cannot be sent by client
    setTimeout(() => {
      console.log(`[Attempt ${reconnectCount}] 🔌 Simulating disconnection...`);
      ws.terminate(); // Force close to simulate network failure
    }, 100);
  });

  ws.on("close", (code, reason) => {
    lastCloseCode = code;
    console.log(
      `[Attempt ${reconnectCount}] ❌ Closed with code ${code}: ${reason}`,
    );

    // Check if circuit breaker triggered (code 4001)
    if (code >= 4000 && code <= 4099) {
      console.log("\n🎯 Circuit breaker triggered! Connection stopped.");
      testPassed = true;
      checkTestResult();
      return;
    }

    // Stop after 10 attempts to prevent actual infinite loop
    if (reconnectCount >= 10) {
      console.log("\n⚠️  Stopped after 10 attempts (safety limit)");
      checkTestResult();
      return;
    }

    // Simulate reconnection delay
    const delay = Math.min(1000 * Math.pow(2, reconnectCount - 1), 30000);
    console.log(`⏱️  Waiting ${delay}ms before reconnection...`);

    setTimeout(() => {
      connectWebSocket();
    }, delay);
  });

  ws.on("error", (error) => {
    console.log(`[Attempt ${reconnectCount}] ⚠️  Error: ${error.message}`);
  });
}

function checkTestResult() {
  console.log("\n" + "=".repeat(50));
  console.log("TEST RESULTS:");
  console.log("=".repeat(50));
  console.log(`Total reconnection attempts: ${reconnectCount}`);
  console.log(`Last close code: ${lastCloseCode}`);

  if (testPassed) {
    console.log(
      "✅ TEST PASSED: Circuit breaker successfully prevented infinite loop",
    );
    process.exit(0);
  } else if (reconnectCount <= 5) {
    console.log(
      "✅ TEST PASSED: Reconnections stopped within reasonable limit",
    );
    process.exit(0);
  } else {
    console.log("❌ TEST FAILED: Too many reconnection attempts");
    console.log("   Circuit breaker may not be working properly");
    process.exit(1);
  }
}

// Start the test
console.log("Starting test...\n");
connectWebSocket();

// Timeout after 2 minutes
setTimeout(() => {
  console.log("\n⏰ Test timeout after 2 minutes");
  checkTestResult();
}, 120000);
