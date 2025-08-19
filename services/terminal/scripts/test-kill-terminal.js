#!/usr/bin/env node

/**
 * Test script for Kill Terminal functionality
 * ทดสอบการทำงานของปุ่ม Kill terminal
 */

const WebSocket = require("ws");

// Test configuration
const WS_URL = "ws://localhost:4001";
const TEST_SESSION_ID = `kill_test_${Date.now()}`;
const PROJECT_ID = "test_project";

console.log("🧪 Testing Kill Terminal Functionality...");
console.log(`Session ID: ${TEST_SESSION_ID}`);
console.log(
  "Expected behavior: Session should be killed when closed with code 1000\n",
);

let processKilled = false;

function testKillTerminal() {
  console.log("1️⃣ Creating WebSocket connection...");

  const ws = new WebSocket(
    `${WS_URL}?sessionId=${TEST_SESSION_ID}&projectId=${PROJECT_ID}`,
  );

  ws.on("open", () => {
    console.log("✅ Connected to terminal WebSocket");
    console.log("2️⃣ Sending test command to verify session is alive...");

    // Send a test command
    ws.send(
      JSON.stringify({
        type: "input",
        data: 'echo "Terminal is alive"\r',
      }),
    );

    // Wait for output, then close with code 1000
    setTimeout(() => {
      console.log("3️⃣ Sending close signal with code 1000 (kill terminal)...");
      ws.close(1000, "Kill terminal test");
    }, 1000);
  });

  ws.on("message", (data) => {
    const message = JSON.parse(data.toString());
    if (message.type === "stream" || message.type === "output") {
      console.log("📤 Output received:", message.data.replace(/[\r\n]/g, ""));
    } else if (message.type === "exit") {
      console.log(`📴 Process exited with code: ${message.code}`);
      processKilled = true;
    }
  });

  ws.on("close", (code, reason) => {
    console.log(`\n4️⃣ WebSocket closed with code ${code}: ${reason}`);

    // Try to reconnect to verify session was killed
    setTimeout(() => {
      verifySessionKilled();
    }, 1000);
  });

  ws.on("error", (error) => {
    console.log(`⚠️ Error: ${error.message}`);
  });
}

function verifySessionKilled() {
  console.log("\n5️⃣ Attempting to reconnect to verify session was killed...");

  const ws2 = new WebSocket(
    `${WS_URL}?sessionId=${TEST_SESSION_ID}&projectId=${PROJECT_ID}`,
  );

  ws2.on("open", () => {
    console.log("🔄 Reconnected to WebSocket");

    // Check if it's a new session or the same one
    ws2.send(
      JSON.stringify({
        type: "input",
        data: 'echo "Is this a new session?"\r',
      }),
    );

    setTimeout(() => {
      ws2.close();
      checkTestResult();
    }, 1500);
  });

  ws2.on("message", (data) => {
    const message = JSON.parse(data.toString());
    if (message.type === "connected") {
      console.log("📝 New session created (old one was killed successfully)");
      processKilled = true;
    } else if (message.type === "reconnected") {
      console.log("⚠️ Reconnected to existing session (process NOT killed)");
      processKilled = false;
    }
  });

  ws2.on("close", () => {
    // Test complete
  });

  ws2.on("error", (error) => {
    console.log(`Connection error: ${error.message}`);
    checkTestResult();
  });
}

function checkTestResult() {
  console.log("\n" + "=".repeat(50));
  console.log("TEST RESULTS:");
  console.log("=".repeat(50));

  if (processKilled) {
    console.log("✅ TEST PASSED: Terminal process was successfully killed");
    console.log("   The Kill button is working correctly!");
    process.exit(0);
  } else {
    console.log("❌ TEST FAILED: Terminal process was NOT killed");
    console.log("   The session persisted after close signal");
    process.exit(1);
  }
}

// Start the test
console.log("Starting test...\n");
testKillTerminal();

// Timeout after 10 seconds
setTimeout(() => {
  console.log("\n⏰ Test timeout after 10 seconds");
  checkTestResult();
}, 10000);
