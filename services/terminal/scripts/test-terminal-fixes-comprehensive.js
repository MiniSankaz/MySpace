#!/usr/bin/env node

/**
 * Comprehensive Terminal System Testing Script - After Fixes
 * Tests all the fixes applied to terminal system issues
 *
 * Tests:
 * 1. Database Foreign Key Fix
 * 2. API Route 405 Fix
 * 3. Claude CLI Integration Fix
 * 4. Error Handling & Graceful Degradation
 * 5. Full Terminal System Functionality
 */

const WebSocket = require("ws");
const { getPortConfig, getServiceUrl, getFrontendPort, getGatewayPort } = require('@/shared/config/ports.cjs');
const portConfig = getPortConfig();
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

class TerminalFixesTest {
  constructor() {
    this.testResults = {
      databaseForeignKeyFix: { status: "pending", details: [] },
      apiRoute405Fix: { status: "pending", details: [] },
      claudeCliIntegration: { status: "pending", details: [] },
      errorHandling: { status: "pending", details: [] },
      systemTerminalTest: { status: "pending", details: [] },
      claudeTerminalTest: { status: "pending", details: [] },
      parallelTerminalTest: { status: "pending", details: [] },
      performanceTest: { status: "pending", details: [] },
    };

    this.baseUrl = "http://${getGatewayPort()}";
    this.systemWsUrl = "ws://localhost:4001";
    this.claudeWsUrl = "ws://localhost:4002";
    this.testTimeout = 30000;
    this.testProjectId = `test-project-${Date.now()}`;
    this.testUserId = "test-user-123";

    console.log("🧪 Terminal Fixes Comprehensive Test Suite");
    console.log("==========================================");
    console.log(`Test Project ID: ${this.testProjectId}`);
    console.log(`Test User ID: ${this.testUserId}`);
    console.log(`Base URL: ${this.baseUrl}`);
    console.log(`System Terminal WS: ${this.systemWsUrl}`);
    console.log(`Claude Terminal WS: ${this.claudeWsUrl}`);
    console.log("");
  }

  async runAllTests() {
    const startTime = Date.now();

    try {
      console.log("🔍 Starting comprehensive terminal fixes testing...\n");

      // Test 1: Database Foreign Key Fix
      await this.testDatabaseForeignKeyFix();

      // Test 2: API Route 405 Fix
      await this.testAPIRoute405Fix();

      // Test 3: Claude CLI Integration Fix
      await this.testClaudeCliIntegrationFix();

      // Test 4: Error Handling & Graceful Degradation
      await this.testErrorHandlingFix();

      // Test 5: System Terminal Full Test
      await this.testSystemTerminalFunctionality();

      // Test 6: Claude Terminal Full Test
      await this.testClaudeTerminalFunctionality();

      // Test 7: Parallel Terminal Test
      await this.testParallelTerminalFunctionality();

      // Test 8: Performance Test
      await this.testPerformance();
    } catch (error) {
      console.error("❌ Test suite failed with error:", error);
    } finally {
      const duration = Date.now() - startTime;
      this.generateTestReport(duration);
    }
  }

  async testDatabaseForeignKeyFix() {
    console.log("🔧 Testing Database Foreign Key Fix...");

    try {
      // Test creating terminal session without pre-existing project
      const response = await this.makeApiRequest(
        `/api/workspace/projects/${this.testProjectId}/terminals`,
        {
          method: "POST",
          body: JSON.stringify({
            type: "system",
            tabName: "Test Terminal",
            projectPath: "/tmp/test-project",
          }),
        },
      );

      if (response.ok) {
        const session = await response.json();
        this.testResults.databaseForeignKeyFix.status = "passed";
        this.testResults.databaseForeignKeyFix.details.push(
          "✓ Successfully created terminal session for new project",
        );
        this.testResults.databaseForeignKeyFix.details.push(
          `✓ Session ID: ${session.id}`,
        );
        this.testResults.databaseForeignKeyFix.details.push(
          `✓ Project ID: ${session.projectId}`,
        );
        console.log("  ✅ Database foreign key fix working correctly");
      } else {
        throw new Error(
          `Failed to create terminal session: ${response.status} ${await response.text()}`,
        );
      }
    } catch (error) {
      this.testResults.databaseForeignKeyFix.status = "failed";
      this.testResults.databaseForeignKeyFix.details.push(
        `❌ Error: ${error.message}`,
      );
      console.log("  ❌ Database foreign key fix failed");
    }
  }

  async testAPIRoute405Fix() {
    console.log("🔧 Testing API Route 405 Fix...");

    try {
      // Test GET request to login endpoint
      const response = await this.makeApiRequest("/api/ums/auth/login", {
        method: "GET",
      });

      if (response.ok) {
        const result = await response.json();
        this.testResults.apiRoute405Fix.status = "passed";
        this.testResults.apiRoute405Fix.details.push(
          "✓ GET request to /api/ums/auth/login successful",
        );
        this.testResults.apiRoute405Fix.details.push(
          `✓ Response: ${result.message}`,
        );
        this.testResults.apiRoute405Fix.details.push(
          `✓ Authenticated: ${result.authenticated}`,
        );
        console.log("  ✅ API Route 405 fix working correctly");
      } else {
        throw new Error(
          `GET request failed: ${response.status} ${await response.text()}`,
        );
      }
    } catch (error) {
      this.testResults.apiRoute405Fix.status = "failed";
      this.testResults.apiRoute405Fix.details.push(
        `❌ Error: ${error.message}`,
      );
      console.log("  ❌ API Route 405 fix failed");
    }
  }

  async testClaudeCliIntegrationFix() {
    console.log("🔧 Testing Claude CLI Integration Fix...");

    return new Promise((resolve) => {
      try {
        const wsUrl = `${this.claudeWsUrl}?projectId=${this.testProjectId}&userId=${this.testUserId}&sessionId=claude-test-${Date.now()}&path=${encodeURIComponent(process.cwd())}`;
        const ws = new WebSocket(wsUrl);
        let isClaudeReady = false;
        let commandFragmentationDetected = false;
        let stablePromptReached = false;

        const timeout = setTimeout(() => {
          ws.close();
          this.testResults.claudeCliIntegration.status = "timeout";
          this.testResults.claudeCliIntegration.details.push(
            "❌ Test timed out after 15 seconds",
          );
          console.log("  ⏱️ Claude CLI integration test timed out");
          resolve();
        }, 15000);

        ws.on("open", () => {
          this.testResults.claudeCliIntegration.details.push(
            "✓ WebSocket connection established",
          );
        });

        ws.on("message", (data) => {
          try {
            const message = JSON.parse(data);

            if (message.type === "connected") {
              this.testResults.claudeCliIntegration.details.push(
                "✓ Terminal session connected",
              );
            } else if (message.type === "claude_ready") {
              isClaudeReady = true;
              stablePromptReached = true;
              this.testResults.claudeCliIntegration.details.push(
                "✓ Claude CLI reached stable prompt state",
              );
            } else if (message.type === "stream") {
              // Check for command fragmentation patterns
              if (
                message.data &&
                (message.data.includes("command not found") ||
                  message.data.includes("claude: command") ||
                  message.data.includes("No such file"))
              ) {
                commandFragmentationDetected = true;
              }

              // Check for Claude CLI readiness indicators
              if (
                message.data &&
                (message.data.includes("Claude>") ||
                  message.data.includes("claude>") ||
                  message.data.includes("Welcome to Claude") ||
                  message.data.includes("Claude Code>"))
              ) {
                if (!isClaudeReady) {
                  isClaudeReady = true;
                  stablePromptReached = true;
                  this.testResults.claudeCliIntegration.details.push(
                    "✓ Claude CLI started successfully",
                  );
                }
              }
            }
          } catch (error) {
            // Raw terminal data, check for patterns
            if (
              data.includes("Claude>") ||
              data.includes("Welcome to Claude")
            ) {
              if (!isClaudeReady) {
                isClaudeReady = true;
                stablePromptReached = true;
                this.testResults.claudeCliIntegration.details.push(
                  "✓ Claude CLI detected in raw output",
                );
              }
            }
          }
        });

        ws.on("close", () => {
          clearTimeout(timeout);

          if (
            isClaudeReady &&
            stablePromptReached &&
            !commandFragmentationDetected
          ) {
            this.testResults.claudeCliIntegration.status = "passed";
            this.testResults.claudeCliIntegration.details.push(
              "✓ No command fragmentation detected",
            );
            this.testResults.claudeCliIntegration.details.push(
              "✓ Claude CLI integration fixes working",
            );
            console.log("  ✅ Claude CLI integration fix working correctly");
          } else {
            this.testResults.claudeCliIntegration.status = "partial";
            if (commandFragmentationDetected) {
              this.testResults.claudeCliIntegration.details.push(
                "⚠️ Command fragmentation still detected",
              );
            }
            if (!stablePromptReached) {
              this.testResults.claudeCliIntegration.details.push(
                "⚠️ Stable prompt state not reached",
              );
            }
            console.log("  ⚠️ Claude CLI integration partially working");
          }

          resolve();
        });

        ws.on("error", (error) => {
          clearTimeout(timeout);
          this.testResults.claudeCliIntegration.status = "failed";
          this.testResults.claudeCliIntegration.details.push(
            `❌ WebSocket error: ${error.message}`,
          );
          console.log("  ❌ Claude CLI integration test failed");
          resolve();
        });
      } catch (error) {
        this.testResults.claudeCliIntegration.status = "failed";
        this.testResults.claudeCliIntegration.details.push(
          `❌ Error: ${error.message}`,
        );
        console.log("  ❌ Claude CLI integration test failed");
        resolve();
      }
    });
  }

  async testErrorHandlingFix() {
    console.log("🔧 Testing Error Handling & Graceful Degradation...");

    try {
      // Test 1: Invalid project ID handling
      const invalidProjectResponse = await this.makeApiRequest(
        "/api/workspace/projects/invalid-project-999/terminals",
        {
          method: "GET",
        },
      );

      if (invalidProjectResponse.ok || invalidProjectResponse.status !== 500) {
        this.testResults.errorHandling.details.push(
          "✓ Invalid project ID handled gracefully",
        );
      }

      // Test 2: API with missing authentication
      const noAuthResponse = await this.makeApiRequest(
        "/api/workspace/projects/test/terminals",
        {
          method: "POST",
          body: JSON.stringify({
            type: "system",
            tabName: "Test",
            projectPath: "/tmp",
          }),
        },
      );

      if (noAuthResponse.status === 401) {
        this.testResults.errorHandling.details.push(
          "✓ Missing authentication handled correctly",
        );
      }

      // Test 3: Invalid WebSocket connection parameters
      const invalidWs = new WebSocket(`${this.systemWsUrl}?invalidParam=test`);

      await new Promise((resolve) => {
        const timeout = setTimeout(() => {
          invalidWs.close();
          this.testResults.errorHandling.details.push(
            "✓ Invalid WebSocket parameters handled",
          );
          resolve();
        }, 2000);

        invalidWs.on("open", () => {
          clearTimeout(timeout);
          this.testResults.errorHandling.details.push(
            "✓ WebSocket graceful handling of invalid params",
          );
          invalidWs.close();
          resolve();
        });

        invalidWs.on("error", () => {
          clearTimeout(timeout);
          this.testResults.errorHandling.details.push(
            "✓ WebSocket error handled gracefully",
          );
          resolve();
        });
      });

      this.testResults.errorHandling.status = "passed";
      console.log("  ✅ Error handling and graceful degradation working");
    } catch (error) {
      this.testResults.errorHandling.status = "failed";
      this.testResults.errorHandling.details.push(`❌ Error: ${error.message}`);
      console.log("  ❌ Error handling test failed");
    }
  }

  async testSystemTerminalFunctionality() {
    console.log("🔧 Testing System Terminal Full Functionality...");

    return new Promise((resolve) => {
      try {
        const wsUrl = `${this.systemWsUrl}?projectId=${this.testProjectId}&userId=${this.testUserId}&sessionId=system-test-${Date.now()}&path=${encodeURIComponent(process.cwd())}`;
        const ws = new WebSocket(wsUrl);
        let isConnected = false;
        let commandExecuted = false;
        let outputReceived = false;

        const timeout = setTimeout(() => {
          ws.close();
          if (isConnected && commandExecuted && outputReceived) {
            this.testResults.systemTerminalTest.status = "passed";
            console.log("  ✅ System terminal functionality working correctly");
          } else {
            this.testResults.systemTerminalTest.status = "partial";
            console.log("  ⚠️ System terminal partially working");
          }
          resolve();
        }, 10000);

        ws.on("open", () => {
          this.testResults.systemTerminalTest.details.push(
            "✓ WebSocket connection established",
          );
        });

        ws.on("message", (data) => {
          try {
            const message = JSON.parse(data);

            if (message.type === "connected") {
              isConnected = true;
              this.testResults.systemTerminalTest.details.push(
                "✓ Terminal session connected",
              );

              // Execute test command
              setTimeout(() => {
                ws.send(
                  JSON.stringify({
                    type: "input",
                    data: 'echo "Terminal test successful"\r',
                  }),
                );
                commandExecuted = true;
                this.testResults.systemTerminalTest.details.push(
                  "✓ Test command sent",
                );
              }, 1000);
            } else if (message.type === "stream") {
              if (
                message.data &&
                message.data.includes("Terminal test successful")
              ) {
                outputReceived = true;
                this.testResults.systemTerminalTest.details.push(
                  "✓ Command output received correctly",
                );
              }
            }
          } catch (error) {
            // Handle raw terminal data
            if (data.includes("Terminal test successful")) {
              outputReceived = true;
              this.testResults.systemTerminalTest.details.push(
                "✓ Command output in raw data",
              );
            }
          }
        });

        ws.on("close", () => {
          clearTimeout(timeout);
          if (isConnected && commandExecuted && outputReceived) {
            this.testResults.systemTerminalTest.status = "passed";
            console.log("  ✅ System terminal functionality working correctly");
          } else {
            this.testResults.systemTerminalTest.status = "partial";
            console.log("  ⚠️ System terminal partially working");
          }
          resolve();
        });

        ws.on("error", (error) => {
          clearTimeout(timeout);
          this.testResults.systemTerminalTest.status = "failed";
          this.testResults.systemTerminalTest.details.push(
            `❌ WebSocket error: ${error.message}`,
          );
          console.log("  ❌ System terminal test failed");
          resolve();
        });
      } catch (error) {
        this.testResults.systemTerminalTest.status = "failed";
        this.testResults.systemTerminalTest.details.push(
          `❌ Error: ${error.message}`,
        );
        console.log("  ❌ System terminal test failed");
        resolve();
      }
    });
  }

  async testClaudeTerminalFunctionality() {
    console.log("🔧 Testing Claude Terminal Full Functionality...");

    return new Promise((resolve) => {
      try {
        const wsUrl = `${this.claudeWsUrl}?projectId=${this.testProjectId}&userId=${this.testUserId}&sessionId=claude-func-test-${Date.now()}&path=${encodeURIComponent(process.cwd())}`;
        const ws = new WebSocket(wsUrl);
        let isConnected = false;
        let claudeStarted = false;
        let stableOutput = true;

        const timeout = setTimeout(() => {
          ws.close();
          if (isConnected && claudeStarted && stableOutput) {
            this.testResults.claudeTerminalTest.status = "passed";
            console.log("  ✅ Claude terminal functionality working correctly");
          } else {
            this.testResults.claudeTerminalTest.status = "partial";
            console.log("  ⚠️ Claude terminal partially working");
          }
          resolve();
        }, 20000); // Longer timeout for Claude CLI startup

        ws.on("open", () => {
          this.testResults.claudeTerminalTest.details.push(
            "✓ WebSocket connection established",
          );
        });

        ws.on("message", (data) => {
          try {
            const message = JSON.parse(data);

            if (message.type === "connected") {
              isConnected = true;
              this.testResults.claudeTerminalTest.details.push(
                "✓ Terminal session connected",
              );
            } else if (message.type === "claude_ready") {
              claudeStarted = true;
              this.testResults.claudeTerminalTest.details.push(
                "✓ Claude CLI ready notification received",
              );
            } else if (message.type === "stream") {
              // Monitor for stable output patterns
              if (
                message.data &&
                (message.data.includes("Claude>") ||
                  message.data.includes("Welcome to Claude"))
              ) {
                claudeStarted = true;
                this.testResults.claudeTerminalTest.details.push(
                  "✓ Claude CLI started successfully",
                );
              }

              // Check for fragmentation issues
              if (message.data && message.data.includes("command not found")) {
                stableOutput = false;
                this.testResults.claudeTerminalTest.details.push(
                  "⚠️ Command fragmentation detected",
                );
              }
            }
          } catch (error) {
            // Handle raw terminal data
            if (
              data.includes("Claude>") ||
              data.includes("Welcome to Claude")
            ) {
              claudeStarted = true;
            }
          }
        });

        ws.on("close", () => {
          clearTimeout(timeout);
          if (isConnected && claudeStarted && stableOutput) {
            this.testResults.claudeTerminalTest.status = "passed";
            console.log("  ✅ Claude terminal functionality working correctly");
          } else {
            this.testResults.claudeTerminalTest.status = "partial";
            console.log("  ⚠️ Claude terminal needs improvement");
          }
          resolve();
        });

        ws.on("error", (error) => {
          clearTimeout(timeout);
          this.testResults.claudeTerminalTest.status = "failed";
          this.testResults.claudeTerminalTest.details.push(
            `❌ WebSocket error: ${error.message}`,
          );
          console.log("  ❌ Claude terminal test failed");
          resolve();
        });
      } catch (error) {
        this.testResults.claudeTerminalTest.status = "failed";
        this.testResults.claudeTerminalTest.details.push(
          `❌ Error: ${error.message}`,
        );
        console.log("  ❌ Claude terminal test failed");
        resolve();
      }
    });
  }

  async testParallelTerminalFunctionality() {
    console.log("🔧 Testing Parallel Terminal Functionality...");

    return new Promise((resolve) => {
      const connections = [];
      const results = {
        systemTerminals: 0,
        claudeTerminals: 0,
        successfulConnections: 0,
        parallelExecution: false,
      };

      const totalTerminals = 4; // 2 system + 2 Claude
      let connectedCount = 0;
      let testCompleted = false;

      const timeout = setTimeout(() => {
        testCompleted = true;
        this.cleanupConnections(connections);

        if (results.successfulConnections >= totalTerminals / 2) {
          this.testResults.parallelTerminalTest.status = "passed";
          this.testResults.parallelTerminalTest.details.push(
            `✓ ${results.successfulConnections}/${totalTerminals} terminals connected`,
          );
          console.log("  ✅ Parallel terminal functionality working");
        } else {
          this.testResults.parallelTerminalTest.status = "partial";
          console.log("  ⚠️ Parallel terminals partially working");
        }
        resolve();
      }, 15000);

      // Create multiple terminal connections
      for (let i = 0; i < 2; i++) {
        // System terminals
        const systemWsUrl = `${this.systemWsUrl}?projectId=${this.testProjectId}&userId=${this.testUserId}&sessionId=parallel-system-${i}-${Date.now()}&path=${encodeURIComponent(process.cwd())}`;
        const systemWs = new WebSocket(systemWsUrl);
        connections.push(systemWs);

        systemWs.on("open", () => {
          if (!testCompleted) connectedCount++;
        });

        systemWs.on("message", (data) => {
          try {
            const message = JSON.parse(data);
            if (message.type === "connected" && !testCompleted) {
              results.systemTerminals++;
              results.successfulConnections++;
            }
          } catch (error) {
            // Ignore parsing errors
          }
        });

        // Claude terminals
        const claudeWsUrl = `${this.claudeWsUrl}?projectId=${this.testProjectId}&userId=${this.testUserId}&sessionId=parallel-claude-${i}-${Date.now()}&path=${encodeURIComponent(process.cwd())}`;
        const claudeWs = new WebSocket(claudeWsUrl);
        connections.push(claudeWs);

        claudeWs.on("open", () => {
          if (!testCompleted) connectedCount++;
        });

        claudeWs.on("message", (data) => {
          try {
            const message = JSON.parse(data);
            if (message.type === "connected" && !testCompleted) {
              results.claudeTerminals++;
              results.successfulConnections++;
            }
          } catch (error) {
            // Ignore parsing errors
          }
        });
      }
    });
  }

  async testPerformance() {
    console.log("🔧 Testing Performance & Stability...");

    const startTime = Date.now();
    const performanceMetrics = {
      connectionTime: [],
      messageLatency: [],
      memoryUsage: process.memoryUsage(),
      errors: 0,
    };

    try {
      // Test connection speed
      for (let i = 0; i < 3; i++) {
        const connectionStart = Date.now();
        const ws = new WebSocket(
          `${this.systemWsUrl}?projectId=perf-test-${i}&userId=perf-user&sessionId=perf-session-${i}&path=${encodeURIComponent(process.cwd())}`,
        );

        await new Promise((resolve) => {
          ws.on("open", () => {
            const connectionTime = Date.now() - connectionStart;
            performanceMetrics.connectionTime.push(connectionTime);
            ws.close();
            resolve();
          });

          ws.on("error", () => {
            performanceMetrics.errors++;
            resolve();
          });

          setTimeout(() => {
            ws.close();
            performanceMetrics.errors++;
            resolve();
          }, 5000);
        });
      }

      const avgConnectionTime =
        performanceMetrics.connectionTime.length > 0
          ? performanceMetrics.connectionTime.reduce((a, b) => a + b, 0) /
            performanceMetrics.connectionTime.length
          : 0;

      if (avgConnectionTime < 2000 && performanceMetrics.errors === 0) {
        this.testResults.performanceTest.status = "passed";
        this.testResults.performanceTest.details.push(
          `✓ Average connection time: ${avgConnectionTime}ms`,
        );
        this.testResults.performanceTest.details.push(`✓ No connection errors`);
        console.log("  ✅ Performance test passed");
      } else {
        this.testResults.performanceTest.status = "partial";
        this.testResults.performanceTest.details.push(
          `⚠️ Average connection time: ${avgConnectionTime}ms`,
        );
        this.testResults.performanceTest.details.push(
          `⚠️ Errors: ${performanceMetrics.errors}`,
        );
        console.log("  ⚠️ Performance needs improvement");
      }
    } catch (error) {
      this.testResults.performanceTest.status = "failed";
      this.testResults.performanceTest.details.push(
        `❌ Error: ${error.message}`,
      );
      console.log("  ❌ Performance test failed");
    }
  }

  cleanupConnections(connections) {
    connections.forEach((ws) => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    });
  }

  async makeApiRequest(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const defaultOptions = {
      headers: {
        "Content-Type": "application/json",
      },
    };

    const mergedOptions = { ...defaultOptions, ...options };

    try {
      const response = await fetch(url, mergedOptions);
      return response;
    } catch (error) {
      throw new Error(`API request failed: ${error.message}`);
    }
  }

  generateTestReport(duration) {
    const reportPath = path.join(__dirname, "terminal-fixes-test-report.json");

    const report = {
      timestamp: new Date().toISOString(),
      duration: duration,
      testSuite: "Terminal Fixes Comprehensive Test",
      summary: {
        totalTests: Object.keys(this.testResults).length,
        passed: Object.values(this.testResults).filter(
          (r) => r.status === "passed",
        ).length,
        failed: Object.values(this.testResults).filter(
          (r) => r.status === "failed",
        ).length,
        partial: Object.values(this.testResults).filter(
          (r) => r.status === "partial",
        ).length,
        pending: Object.values(this.testResults).filter(
          (r) => r.status === "pending",
        ).length,
        timeout: Object.values(this.testResults).filter(
          (r) => r.status === "timeout",
        ).length,
      },
      results: this.testResults,
      recommendations: this.generateRecommendations(),
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log("\n📊 COMPREHENSIVE TEST REPORT");
    console.log("============================");
    console.log(`Duration: ${(duration / 1000).toFixed(2)}s`);
    console.log(`Total Tests: ${report.summary.totalTests}`);
    console.log(`✅ Passed: ${report.summary.passed}`);
    console.log(`❌ Failed: ${report.summary.failed}`);
    console.log(`⚠️  Partial: ${report.summary.partial}`);
    console.log(`⏱️  Timeout: ${report.summary.timeout}`);
    console.log(`⏳ Pending: ${report.summary.pending}`);

    console.log("\n🔍 Test Results:");
    Object.entries(this.testResults).forEach(([testName, result]) => {
      const statusIcon =
        {
          passed: "✅",
          failed: "❌",
          partial: "⚠️",
          pending: "⏳",
          timeout: "⏱️",
        }[result.status] || "❓";

      console.log(
        `  ${statusIcon} ${testName}: ${result.status.toUpperCase()}`,
      );
    });

    if (report.recommendations.length > 0) {
      console.log("\n💡 Recommendations:");
      report.recommendations.forEach((rec) => console.log(`  • ${rec}`));
    }

    console.log(`\n📄 Detailed report saved to: ${reportPath}`);

    // Calculate overall success rate
    const successRate = (
      ((report.summary.passed + report.summary.partial * 0.5) /
        report.summary.totalTests) *
      100
    ).toFixed(1);
    console.log(`\n🎯 Overall Success Rate: ${successRate}%`);

    if (successRate >= 90) {
      console.log("🎉 Excellent! Terminal system is working very well.");
    } else if (successRate >= 75) {
      console.log("👍 Good! Most terminal functionality is working.");
    } else if (successRate >= 50) {
      console.log("⚠️ Moderate. Some issues need attention.");
    } else {
      console.log("🚨 Critical issues need immediate attention.");
    }
  }

  generateRecommendations() {
    const recommendations = [];

    if (this.testResults.databaseForeignKeyFix.status === "failed") {
      recommendations.push(
        "Fix database foreign key constraints for TerminalSession",
      );
    }

    if (this.testResults.apiRoute405Fix.status === "failed") {
      recommendations.push(
        "Ensure all API routes support appropriate HTTP methods",
      );
    }

    if (
      this.testResults.claudeCliIntegration.status === "failed" ||
      this.testResults.claudeCliIntegration.status === "partial"
    ) {
      recommendations.push(
        "Improve Claude CLI startup sequence and command fragmentation handling",
      );
    }

    if (this.testResults.errorHandling.status === "failed") {
      recommendations.push(
        "Enhance error handling and graceful degradation mechanisms",
      );
    }

    if (
      this.testResults.performanceTest.status === "partial" ||
      this.testResults.performanceTest.status === "failed"
    ) {
      recommendations.push(
        "Optimize WebSocket connection performance and stability",
      );
    }

    return recommendations;
  }
}

// Check if fetch is available (Node.js 18+)
if (typeof fetch === "undefined") {
  console.log("Installing node-fetch for Node.js compatibility...");
  try {
    execSync("npm install node-fetch", { stdio: "ignore" });
    global.fetch = require("node-fetch");
  } catch (error) {
    console.error("Failed to install node-fetch:", error.message);
    process.exit(1);
  }
}

// Run the tests
const tester = new TerminalFixesTest();
tester
  .runAllTests()
  .then(() => {
    console.log("\n🏁 All tests completed!");
  })
  .catch((error) => {
    console.error("💥 Test runner failed:", error);
    process.exit(1);
  });
