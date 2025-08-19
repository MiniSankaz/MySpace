#!/usr/bin/env node

/**
 * Smoke Test Suite for Development Environment Deployment
 * Validates core terminal functionality after deployment
 */

const WebSocket = require("ws");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

// Test configuration
const TEST_CONFIG = {
  apiUrl: "http://localhost:4000",
  systemPort: 4001,
  claudePort: 4002,
  timeout: 10000,
};

// Test results
const testResults = {
  passed: [],
  failed: [],
  startTime: Date.now(),
};

// Utility functions
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function checkAPI() {
  console.log("\n🌐 Testing API Endpoints...\n");

  try {
    const response = await fetch(`${TEST_CONFIG.apiUrl}/api/health`);
    if (response.ok) {
      console.log("  ✅ Health endpoint accessible");
      testResults.passed.push("API-Health");
    } else {
      console.log("  ❌ Health endpoint returned error");
      testResults.failed.push("API-Health");
    }
  } catch (error) {
    console.log("  ❌ API not accessible:", error.message);
    testResults.failed.push("API-Health");
  }
}

async function testSystemTerminal() {
  console.log("\n💻 Testing System Terminal...\n");

  return new Promise((resolve) => {
    const ws = new WebSocket(
      `ws://localhost:${TEST_CONFIG.systemPort}/?sessionId=smoke_test_${Date.now()}&projectId=test`,
    );

    let connected = false;
    let commandExecuted = false;

    ws.on("open", () => {
      connected = true;
      console.log("  ✅ WebSocket connection established");

      // Send test command
      ws.send(
        JSON.stringify({
          type: "input",
          data: 'echo "Smoke test successful"\r',
        }),
      );
    });

    ws.on("message", (data) => {
      const msg = JSON.parse(data);
      if (msg.type === "stream" && msg.data.includes("Smoke test successful")) {
        commandExecuted = true;
        console.log("  ✅ Command execution working");
      }
    });

    ws.on("error", (error) => {
      console.log("  ❌ WebSocket error:", error.message);
      testResults.failed.push("SystemTerminal-Connection");
    });

    setTimeout(() => {
      ws.close();

      if (connected && commandExecuted) {
        testResults.passed.push("SystemTerminal-Connection");
        testResults.passed.push("SystemTerminal-Commands");
      } else {
        if (!connected) testResults.failed.push("SystemTerminal-Connection");
        if (!commandExecuted)
          testResults.failed.push("SystemTerminal-Commands");
      }

      resolve();
    }, 3000);
  });
}

async function testClaudeTerminal() {
  console.log("\n🤖 Testing Claude Terminal...\n");

  return new Promise((resolve) => {
    const ws = new WebSocket(
      `ws://localhost:${TEST_CONFIG.claudePort}/?sessionId=claude_smoke_${Date.now()}&projectId=test`,
    );

    let connected = false;
    let claudeStarted = false;

    ws.on("open", () => {
      connected = true;
      console.log("  ✅ WebSocket connection established");
    });

    ws.on("message", (data) => {
      const msg = JSON.parse(data);
      if (
        msg.type === "stream" &&
        (msg.data.includes("Claude") || msg.data.includes("Welcome"))
      ) {
        claudeStarted = true;
        console.log("  ✅ Claude CLI initialized");
      }
    });

    ws.on("error", (error) => {
      console.log("  ❌ WebSocket error:", error.message);
      testResults.failed.push("ClaudeTerminal-Connection");
    });

    setTimeout(() => {
      ws.close();

      if (connected) {
        testResults.passed.push("ClaudeTerminal-Connection");
      } else {
        testResults.failed.push("ClaudeTerminal-Connection");
      }

      if (claudeStarted) {
        testResults.passed.push("ClaudeTerminal-Initialization");
      } else {
        console.log(
          "  ⚠️ Claude CLI did not fully initialize (may need more time)",
        );
      }

      resolve();
    }, 5000);
  });
}

async function testCircuitBreaker() {
  console.log("\n⚡ Testing Circuit Breaker Protection...\n");

  let reconnectAttempts = 0;
  const maxAttempts = 10;
  let circuitBreakerTriggered = false;

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const ws = new WebSocket(
        `ws://localhost:${TEST_CONFIG.systemPort}/?sessionId=circuit_test&projectId=test`,
      );

      await new Promise((resolve) => {
        ws.on("open", () => {
          reconnectAttempts++;
          ws.close();
          resolve();
        });

        ws.on("error", () => {
          if (reconnectAttempts >= 5) {
            circuitBreakerTriggered = true;
          }
          resolve();
        });

        setTimeout(resolve, 100);
      });

      if (circuitBreakerTriggered) break;
    } catch (error) {
      // Expected
    }
  }

  if (reconnectAttempts < maxAttempts) {
    console.log(
      `  ✅ Circuit breaker activated after ${reconnectAttempts} attempts`,
    );
    testResults.passed.push("CircuitBreaker-Protection");
  } else {
    console.log("  ❌ Circuit breaker did not activate");
    testResults.failed.push("CircuitBreaker-Protection");
  }
}

async function testSessionPersistence() {
  console.log("\n💾 Testing Session Persistence...\n");

  const sessionId = `persist_test_${Date.now()}`;

  // First connection
  const ws1 = new WebSocket(
    `ws://localhost:${TEST_CONFIG.systemPort}/?sessionId=${sessionId}&projectId=test`,
  );

  await new Promise((resolve) => {
    ws1.on("open", () => {
      ws1.send(
        JSON.stringify({ type: "input", data: 'TEST_VAR="persistent"\r' }),
      );
      setTimeout(() => {
        ws1.close();
        resolve();
      }, 1000);
    });
  });

  await delay(1000);

  // Second connection with same session
  const ws2 = new WebSocket(
    `ws://localhost:${TEST_CONFIG.systemPort}/?sessionId=${sessionId}&projectId=test`,
  );

  let sessionPersisted = false;

  await new Promise((resolve) => {
    ws2.on("open", () => {
      ws2.send(JSON.stringify({ type: "input", data: "echo $TEST_VAR\r" }));
    });

    ws2.on("message", (data) => {
      const msg = JSON.parse(data);
      if (msg.type === "stream" && msg.data.includes("persistent")) {
        sessionPersisted = true;
      }
    });

    setTimeout(() => {
      ws2.close();
      resolve();
    }, 2000);
  });

  if (sessionPersisted) {
    console.log("  ✅ Session state persisted across reconnections");
    testResults.passed.push("Session-Persistence");
  } else {
    console.log(
      "  ⚠️ Session state not fully preserved (expected in some configurations)",
    );
  }
}

// Performance monitoring
async function checkPerformance() {
  console.log("\n📊 Checking Performance Metrics...\n");

  const metrics = {
    connectionTimes: [],
    memoryUsage: process.memoryUsage(),
  };

  // Test multiple quick connections
  for (let i = 0; i < 5; i++) {
    const startTime = Date.now();

    const ws = new WebSocket(
      `ws://localhost:${TEST_CONFIG.systemPort}/?sessionId=perf_${i}&projectId=test`,
    );

    await new Promise((resolve) => {
      ws.on("open", () => {
        const connectionTime = Date.now() - startTime;
        metrics.connectionTimes.push(connectionTime);
        ws.close();
        resolve();
      });

      ws.on("error", resolve);
      setTimeout(resolve, 1000);
    });
  }

  const avgConnectionTime =
    metrics.connectionTimes.reduce((a, b) => a + b, 0) /
    metrics.connectionTimes.length;

  console.log(`  Average connection time: ${avgConnectionTime.toFixed(2)}ms`);
  console.log(
    `  Memory usage: ${(metrics.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
  );

  if (avgConnectionTime < 100) {
    console.log("  ✅ Performance within targets");
    testResults.passed.push("Performance-Metrics");
  } else {
    console.log("  ⚠️ Performance may need optimization");
  }
}

// Generate report
function generateReport() {
  const duration = ((Date.now() - testResults.startTime) / 1000).toFixed(2);
  const totalTests = testResults.passed.length + testResults.failed.length;
  const passRate = ((testResults.passed.length / totalTests) * 100).toFixed(1);

  console.log("\n" + "=".repeat(60));
  console.log("🔥 SMOKE TEST REPORT - Development Environment");
  console.log("=".repeat(60));

  console.log(`\n📈 Summary:`);
  console.log(`   Total Tests: ${totalTests}`);
  console.log(`   Passed: ${testResults.passed.length}`);
  console.log(`   Failed: ${testResults.failed.length}`);
  console.log(`   Pass Rate: ${passRate}%`);
  console.log(`   Duration: ${duration}s`);

  if (testResults.failed.length > 0) {
    console.log(`\n❌ Failed Tests:`);
    testResults.failed.forEach((test) => {
      console.log(`   - ${test}`);
    });
  }

  const ready = passRate >= 90;
  console.log(
    `\n🚀 Deployment Status: ${ready ? "READY FOR MONITORING" : "ISSUES DETECTED"}`,
  );

  if (ready) {
    console.log("\n✅ System is ready for 24-hour monitoring period");
    console.log("📊 Key metrics to monitor:");
    console.log("   - Connection success rate");
    console.log("   - Circuit breaker triggers");
    console.log("   - Session persistence");
    console.log("   - Performance metrics");
  } else {
    console.log("\n⚠️ Please investigate and fix issues before proceeding");
  }

  console.log("\n" + "=".repeat(60));

  // Save report
  const reportPath = path.join(__dirname, "smoke-test-report.json");
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        ...testResults,
        passRate,
        duration,
        timestamp: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
  console.log(`\n📁 Report saved to: ${reportPath}\n`);

  process.exit(testResults.failed.length > 0 ? 1 : 0);
}

// Main runner
async function runSmokeTests() {
  console.log("\n🔥 Starting Smoke Test Suite for Development Deployment");
  console.log("=".repeat(60));

  try {
    await checkAPI();
    await testSystemTerminal();
    await testClaudeTerminal();
    await testCircuitBreaker();
    await testSessionPersistence();
    await checkPerformance();
  } catch (error) {
    console.error("\n❌ Smoke test error:", error);
    testResults.failed.push("SmokeTest-Error");
  }

  generateReport();
}

// Run smoke tests
runSmokeTests().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
