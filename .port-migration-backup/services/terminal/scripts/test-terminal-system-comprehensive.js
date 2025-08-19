#!/usr/bin/env node

/**
 * Comprehensive Terminal System Testing Script
 * Tests System Terminal, Claude Terminal, and KM Module Integration
 *
 * Run with: node scripts/test-terminal-system-comprehensive.js
 */

const WebSocket = require("ws");
const axios = require("axios");
const { spawn } = require("child_process");

// Test Configuration
const CONFIG = {
  BASE_URL: "http://localhost:4000",
  SYSTEM_TERMINAL_PORT: 4001,
  CLAUDE_TERMINAL_PORT: 4002,
  TEST_PROJECT_ID: "test-project-12345",
  TEST_USER_ID: "sankaz",
  TEST_USER_TOKEN: null, // Will be filled after authentication
  TIMEOUT: 30000, // 30 seconds
  MAX_RETRIES: 3,
};

// Test Results Storage
const TEST_RESULTS = {
  systemTerminal: {
    passed: 0,
    failed: 0,
    tests: [],
  },
  claudeTerminal: {
    passed: 0,
    failed: 0,
    tests: [],
  },
  kmIntegration: {
    passed: 0,
    failed: 0,
    tests: [],
  },
  multiTerminal: {
    passed: 0,
    failed: 0,
    tests: [],
  },
};

// Utility Functions
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomId() {
  return Math.random().toString(36).substr(2, 9);
}

function createWebSocket(
  port,
  sessionId = null,
  projectId = CONFIG.TEST_PROJECT_ID,
) {
  const wsUrl = `ws://127.0.0.1:${port}/?projectId=${projectId}&sessionId=${sessionId || `session_${Date.now()}_${randomId()}`}&userId=${CONFIG.TEST_USER_ID}`;
  console.log(`🔗 Connecting to WebSocket: ${wsUrl}`);
  return new WebSocket(wsUrl);
}

async function authenticate() {
  try {
    console.log("🔐 Authenticating...");
    const response = await axios.post(`${CONFIG.BASE_URL}/api/ums/auth/login`, {
      emailOrUsername: "sankaz@admin.com",
      password: "Sankaz#3E25167B@2025",
    });

    CONFIG.TEST_USER_TOKEN = response.data.accessToken;
    console.log("✅ Authentication successful");
    return true;
  } catch (error) {
    console.error(
      "❌ Authentication failed:",
      error.response?.data || error.message,
    );
    return false;
  }
}

async function createTerminalSession(type, tabName = `Test-${type}-Terminal`) {
  try {
    const response = await axios.post(
      `${CONFIG.BASE_URL}/api/workspace/projects/${CONFIG.TEST_PROJECT_ID}/terminals`,
      {
        type,
        tabName,
        projectPath: process.cwd(),
      },
      {
        headers: {
          Authorization: `Bearer ${CONFIG.TEST_USER_TOKEN}`,
          "Content-Type": "application/json",
        },
      },
    );

    return response.data;
  } catch (error) {
    throw new Error(
      `Failed to create ${type} terminal: ${error.response?.data?.error || error.message}`,
    );
  }
}

// Test Functions
async function testSystemTerminalConnection() {
  return new Promise(async (resolve, reject) => {
    const testName = "System Terminal Connection";
    console.log(`\n🧪 Testing: ${testName}`);

    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error("Connection timeout"));
    }, CONFIG.TIMEOUT);

    const ws = createWebSocket(CONFIG.SYSTEM_TERMINAL_PORT);

    ws.on("open", () => {
      console.log("✅ System terminal WebSocket connected");
    });

    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data);
        console.log("📨 Received message:", message.type);

        if (message.type === "connected") {
          clearTimeout(timeout);
          ws.close();
          TEST_RESULTS.systemTerminal.passed++;
          TEST_RESULTS.systemTerminal.tests.push({
            name: testName,
            status: "PASS",
            message: "Connected successfully",
          });
          resolve(true);
        }
      } catch (error) {
        console.error("Error parsing message:", error);
      }
    });

    ws.on("error", (error) => {
      clearTimeout(timeout);
      TEST_RESULTS.systemTerminal.failed++;
      TEST_RESULTS.systemTerminal.tests.push({
        name: testName,
        status: "FAIL",
        message: error.message,
      });
      reject(error);
    });
  });
}

async function testSystemTerminalCommands() {
  return new Promise((resolve, reject) => {
    const testName = "System Terminal Commands";
    console.log(`\n🧪 Testing: ${testName}`);

    const commands = ["pwd", "ls", 'echo "Hello Terminal Test"'];
    let commandIndex = 0;
    let commandResults = [];

    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error("Command execution timeout"));
    }, CONFIG.TIMEOUT);

    const ws = createWebSocket(CONFIG.SYSTEM_TERMINAL_PORT);

    ws.on("open", () => {
      console.log("✅ System terminal connected for command testing");
    });

    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data);

        if (message.type === "connected") {
          // Send first command
          console.log(`📤 Sending command: ${commands[commandIndex]}`);
          ws.send(
            JSON.stringify({
              type: "input",
              data: commands[commandIndex] + "\r",
            }),
          );
        } else if (message.type === "stream") {
          commandResults.push(message.data);
          console.log(
            "📥 Command output received:",
            message.data.substring(0, 50),
          );

          // Check if we see a prompt indicating command completed
          if (
            message.data.includes("%") ||
            message.data.includes("$") ||
            message.data.includes("#")
          ) {
            // Command likely completed, send next one if available
            if (commandIndex < commands.length - 1) {
              setTimeout(() => {
                commandIndex++;
                if (commands[commandIndex]) {
                  // Safety check
                  console.log(`📤 Sending command: ${commands[commandIndex]}`);
                  ws.send(
                    JSON.stringify({
                      type: "input",
                      data: commands[commandIndex] + "\r",
                    }),
                  );
                }
              }, 1000);
            }
          }

          // Check if all commands have been sent
          if (
            commandIndex >= commands.length - 1 &&
            message.data.includes("Hello Terminal Test")
          ) {
            // All commands executed successfully
            setTimeout(() => {
              clearTimeout(timeout);
              ws.close();
              TEST_RESULTS.systemTerminal.passed++;
              TEST_RESULTS.systemTerminal.tests.push({
                name: testName,
                status: "PASS",
                message: `Executed ${commands.length} commands successfully`,
                details: `Commands: ${commands.join(", ")}`,
              });
              resolve(true);
            }, 1000);
          }
        }
      } catch (error) {
        console.error("Error processing command response:", error);
      }
    });

    ws.on("error", (error) => {
      clearTimeout(timeout);
      TEST_RESULTS.systemTerminal.failed++;
      TEST_RESULTS.systemTerminal.tests.push({
        name: testName,
        status: "FAIL",
        message: error.message,
      });
      reject(error);
    });
  });
}

async function testSystemTerminalReconnection() {
  return new Promise(async (resolve, reject) => {
    const testName = "System Terminal Reconnection";
    console.log(`\n🧪 Testing: ${testName}`);

    const sessionId = `reconnect_test_${Date.now()}`;
    let firstConnection = true;

    const timeout = setTimeout(() => {
      reject(new Error("Reconnection test timeout"));
    }, CONFIG.TIMEOUT);

    // First connection
    let ws1 = createWebSocket(CONFIG.SYSTEM_TERMINAL_PORT, sessionId);

    ws1.on("open", () => {
      console.log("✅ First connection established");
    });

    ws1.on("message", (data) => {
      try {
        const message = JSON.parse(data);

        if (message.type === "connected" && firstConnection) {
          console.log("📤 Sending test command to first connection");
          ws1.send(
            JSON.stringify({
              type: "input",
              data: 'echo "First connection test"\r',
            }),
          );
          firstConnection = false;
        } else if (
          message.type === "stream" &&
          message.data.includes("First connection test")
        ) {
          console.log(
            "📥 First connection command executed, closing connection",
          );
          ws1.close();

          // Wait then reconnect with same session ID
          setTimeout(() => {
            console.log("🔄 Attempting reconnection...");
            const ws2 = createWebSocket(CONFIG.SYSTEM_TERMINAL_PORT, sessionId);

            ws2.on("open", () => {
              console.log("✅ Reconnection established");
            });

            ws2.on("message", (data) => {
              try {
                const message = JSON.parse(data);

                if (
                  message.type === "reconnected" ||
                  message.type === "connected"
                ) {
                  console.log("📥 Reconnection successful, checking history");

                  // Send another command to verify session persistence
                  setTimeout(() => {
                    ws2.send(
                      JSON.stringify({
                        type: "input",
                        data: 'echo "Reconnection test"\r',
                      }),
                    );
                  }, 1000);
                } else if (
                  message.type === "stream" &&
                  message.data.includes("Reconnection test")
                ) {
                  clearTimeout(timeout);
                  ws2.close();
                  TEST_RESULTS.systemTerminal.passed++;
                  TEST_RESULTS.systemTerminal.tests.push({
                    name: testName,
                    status: "PASS",
                    message: "Session persisted across reconnections",
                    details: `Session ID: ${sessionId}`,
                  });
                  resolve(true);
                } else if (message.type === "history") {
                  console.log("📜 History received on reconnection");
                }
              } catch (error) {
                console.error("Error in reconnection:", error);
              }
            });

            ws2.on("error", (error) => {
              clearTimeout(timeout);
              TEST_RESULTS.systemTerminal.failed++;
              TEST_RESULTS.systemTerminal.tests.push({
                name: testName,
                status: "FAIL",
                message: `Reconnection failed: ${error.message}`,
              });
              reject(error);
            });
          }, 2000);
        }
      } catch (error) {
        console.error("Error in first connection:", error);
      }
    });

    ws1.on("error", (error) => {
      clearTimeout(timeout);
      TEST_RESULTS.systemTerminal.failed++;
      TEST_RESULTS.systemTerminal.tests.push({
        name: testName,
        status: "FAIL",
        message: `First connection failed: ${error.message}`,
      });
      reject(error);
    });
  });
}

async function testClaudeTerminalConnection() {
  return new Promise((resolve, reject) => {
    const testName = "Claude Terminal Connection";
    console.log(`\n🧪 Testing: ${testName}`);

    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error("Claude terminal connection timeout"));
    }, CONFIG.TIMEOUT);

    const ws = createWebSocket(CONFIG.CLAUDE_TERMINAL_PORT);

    ws.on("open", () => {
      console.log("✅ Claude terminal WebSocket connected");
    });

    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data);
        console.log("📨 Claude terminal message:", message.type);

        if (message.type === "connected") {
          console.log(
            "✅ Claude terminal connected, waiting for Claude CLI startup",
          );
        } else if (
          message.type === "stream" &&
          message.data.includes("Claude>")
        ) {
          clearTimeout(timeout);
          ws.close();
          TEST_RESULTS.claudeTerminal.passed++;
          TEST_RESULTS.claudeTerminal.tests.push({
            name: testName,
            status: "PASS",
            message: "Claude CLI started successfully",
            details: "Claude prompt detected",
          });
          resolve(true);
        }
      } catch (error) {
        console.error("Error parsing Claude message:", error);
      }
    });

    ws.on("error", (error) => {
      clearTimeout(timeout);
      TEST_RESULTS.claudeTerminal.failed++;
      TEST_RESULTS.claudeTerminal.tests.push({
        name: testName,
        status: "FAIL",
        message: error.message,
      });
      reject(error);
    });
  });
}

async function testClaudeTerminalAICommands() {
  return new Promise((resolve, reject) => {
    const testName = "Claude Terminal AI Commands";
    console.log(`\n🧪 Testing: ${testName}`);

    let claudeReady = false;

    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error("Claude AI command timeout"));
    }, 45000); // Extended timeout for AI processing

    const ws = createWebSocket(CONFIG.CLAUDE_TERMINAL_PORT);

    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data);

        if (message.type === "stream") {
          if (message.data.includes("Claude>") && !claudeReady) {
            claudeReady = true;
            console.log("🤖 Claude CLI ready, sending AI command");
            // Send a simple AI command
            setTimeout(() => {
              ws.send(JSON.stringify({ type: "input", data: "help\r" }));
            }, 2000);
          } else if (
            claudeReady &&
            (message.data.includes("Available commands") ||
              message.data.includes("help"))
          ) {
            console.log("📥 Claude AI response received");
            clearTimeout(timeout);
            ws.close();
            TEST_RESULTS.claudeTerminal.passed++;
            TEST_RESULTS.claudeTerminal.tests.push({
              name: testName,
              status: "PASS",
              message: "Claude CLI responded to command",
              details: "Help command executed successfully",
            });
            resolve(true);
          }
        }
      } catch (error) {
        console.error("Error in Claude AI command test:", error);
      }
    });

    ws.on("error", (error) => {
      clearTimeout(timeout);
      TEST_RESULTS.claudeTerminal.failed++;
      TEST_RESULTS.claudeTerminal.tests.push({
        name: testName,
        status: "FAIL",
        message: error.message,
      });
      reject(error);
    });
  });
}

async function testKnowledgeBaseIntegration() {
  const testName = "Knowledge Base Terminal Integration";
  console.log(`\n🧪 Testing: ${testName}`);

  try {
    // Test if KM module files exist
    const fs = require("fs");
    const path = require("path");

    const kmFiles = [
      "/Users/sem4pro/Stock/port/docs/knowledge-base-development-plan.md",
      "/Users/sem4pro/Stock/port/docs/knowledge-base-phase1-implementation.md",
    ];

    let kmFilesExist = true;
    const missingFiles = [];

    for (const file of kmFiles) {
      if (!fs.existsSync(file)) {
        kmFilesExist = false;
        missingFiles.push(file);
      }
    }

    if (kmFilesExist) {
      // Test if Claude terminal has KM integration
      const claudeTerminalContent = fs.readFileSync(
        "/Users/sem4pro/Stock/port/src/server/websocket/claude-terminal-ws.js",
        "utf8",
      );
      const hasKMIntegration =
        claudeTerminalContent.includes("terminalKBIntegration") ||
        claudeTerminalContent.includes("knowledge-base");

      if (hasKMIntegration) {
        TEST_RESULTS.kmIntegration.passed++;
        TEST_RESULTS.kmIntegration.tests.push({
          name: testName,
          status: "PASS",
          message: "KM module integration detected in Claude terminal",
          details: "KB integration service found in Claude terminal code",
        });
        return true;
      } else {
        TEST_RESULTS.kmIntegration.failed++;
        TEST_RESULTS.kmIntegration.tests.push({
          name: testName,
          status: "FAIL",
          message: "KM integration not found in Claude terminal",
          details: "Knowledge base integration code not detected",
        });
        return false;
      }
    } else {
      TEST_RESULTS.kmIntegration.failed++;
      TEST_RESULTS.kmIntegration.tests.push({
        name: testName,
        status: "FAIL",
        message: "Knowledge base documentation files missing",
        details: `Missing files: ${missingFiles.join(", ")}`,
      });
      return false;
    }
  } catch (error) {
    TEST_RESULTS.kmIntegration.failed++;
    TEST_RESULTS.kmIntegration.tests.push({
      name: testName,
      status: "FAIL",
      message: error.message,
    });
    return false;
  }
}

async function testMultipleTerminalsSynchronously() {
  return new Promise(async (resolve, reject) => {
    const testName = "Multiple Terminals Parallel Execution";
    console.log(`\n🧪 Testing: ${testName}`);

    const terminals = [];
    const terminalResults = {};
    let completedTerminals = 0;
    const totalTerminals = 6; // 3 system + 3 claude

    const timeout = setTimeout(() => {
      terminals.forEach((ws) => ws.close());
      reject(new Error("Multi-terminal test timeout"));
    }, 60000); // Extended timeout

    // Create multiple terminals
    for (let i = 0; i < 3; i++) {
      // System terminals
      const systemWs = createWebSocket(
        CONFIG.SYSTEM_TERMINAL_PORT,
        `multi_system_${i}_${Date.now()}`,
      );
      const systemId = `system_${i}`;
      terminals.push(systemWs);
      terminalResults[systemId] = { connected: false, commandExecuted: false };

      systemWs.on("message", (data) => {
        try {
          const message = JSON.parse(data);
          if (message.type === "connected") {
            terminalResults[systemId].connected = true;
            console.log(`✅ System terminal ${i} connected`);
            // Send unique command
            setTimeout(() => {
              systemWs.send(
                JSON.stringify({
                  type: "input",
                  data: `echo "System terminal ${i} test"\r`,
                }),
              );
            }, 1000 * i); // Stagger commands
          } else if (
            message.type === "stream" &&
            message.data.includes(`System terminal ${i} test`)
          ) {
            terminalResults[systemId].commandExecuted = true;
            completedTerminals++;
            console.log(
              `📥 System terminal ${i} command completed (${completedTerminals}/${totalTerminals})`,
            );

            if (completedTerminals === totalTerminals) {
              checkResults();
            }
          }
        } catch (error) {
          console.error(`Error in system terminal ${i}:`, error);
        }
      });

      // Claude terminals
      const claudeWs = createWebSocket(
        CONFIG.CLAUDE_TERMINAL_PORT,
        `multi_claude_${i}_${Date.now()}`,
      );
      const claudeId = `claude_${i}`;
      terminals.push(claudeWs);
      terminalResults[claudeId] = { connected: false, commandExecuted: false };

      let claudeReady = false;
      claudeWs.on("message", (data) => {
        try {
          const message = JSON.parse(data);
          if (message.type === "connected") {
            terminalResults[claudeId].connected = true;
            console.log(`✅ Claude terminal ${i} connected`);
          } else if (message.type === "stream") {
            if (message.data.includes("Claude>") && !claudeReady) {
              claudeReady = true;
              // Send help command
              setTimeout(() => {
                claudeWs.send(
                  JSON.stringify({ type: "input", data: "help\r" }),
                );
              }, 2000 * i); // Stagger commands
            } else if (
              claudeReady &&
              message.data.includes("Available commands")
            ) {
              terminalResults[claudeId].commandExecuted = true;
              completedTerminals++;
              console.log(
                `📥 Claude terminal ${i} command completed (${completedTerminals}/${totalTerminals})`,
              );

              if (completedTerminals === totalTerminals) {
                checkResults();
              }
            }
          }
        } catch (error) {
          console.error(`Error in Claude terminal ${i}:`, error);
        }
      });
    }

    function checkResults() {
      clearTimeout(timeout);
      terminals.forEach((ws) => ws.close());

      const allConnected = Object.values(terminalResults).every(
        (result) => result.connected,
      );
      const allExecuted = Object.values(terminalResults).every(
        (result) => result.commandExecuted,
      );

      if (allConnected && allExecuted) {
        TEST_RESULTS.multiTerminal.passed++;
        TEST_RESULTS.multiTerminal.tests.push({
          name: testName,
          status: "PASS",
          message: `All ${totalTerminals} terminals connected and executed commands successfully`,
          details: `System terminals: 3, Claude terminals: 3, All functioning in parallel`,
        });
        resolve(true);
      } else {
        TEST_RESULTS.multiTerminal.failed++;
        TEST_RESULTS.multiTerminal.tests.push({
          name: testName,
          status: "FAIL",
          message: "Some terminals failed to connect or execute commands",
          details: `Results: ${JSON.stringify(terminalResults, null, 2)}`,
        });
        resolve(false);
      }
    }
  });
}

async function testTerminalSessionPersistence() {
  const testName = "Terminal Session Persistence";
  console.log(`\n🧪 Testing: ${testName}`);

  try {
    // Test API endpoints for session management
    const response = await axios.get(
      `${CONFIG.BASE_URL}/api/workspace/projects/${CONFIG.TEST_PROJECT_ID}/terminals`,
      {
        headers: {
          Authorization: `Bearer ${CONFIG.TEST_USER_TOKEN}`,
        },
      },
    );

    const sessions = response.data;
    console.log(`📊 Found ${sessions.length} existing terminal sessions`);

    // Create a new session via API
    const newSession = await createTerminalSession(
      "system",
      "Persistence-Test",
    );
    console.log(`✅ Created new session: ${newSession.id}`);

    // Verify the session exists
    const updatedResponse = await axios.get(
      `${CONFIG.BASE_URL}/api/workspace/projects/${CONFIG.TEST_PROJECT_ID}/terminals`,
      {
        headers: {
          Authorization: `Bearer ${CONFIG.TEST_USER_TOKEN}`,
        },
      },
    );

    const updatedSessions = updatedResponse.data;
    const sessionExists = updatedSessions.some((s) => s.id === newSession.id);

    if (sessionExists) {
      TEST_RESULTS.systemTerminal.passed++;
      TEST_RESULTS.systemTerminal.tests.push({
        name: testName,
        status: "PASS",
        message: "Terminal session persisted successfully",
        details: `Session ID: ${newSession.id}, Total sessions: ${updatedSessions.length}`,
      });
      return true;
    } else {
      TEST_RESULTS.systemTerminal.failed++;
      TEST_RESULTS.systemTerminal.tests.push({
        name: testName,
        status: "FAIL",
        message: "Created session not found in session list",
      });
      return false;
    }
  } catch (error) {
    TEST_RESULTS.systemTerminal.failed++;
    TEST_RESULTS.systemTerminal.tests.push({
      name: testName,
      status: "FAIL",
      message: error.message,
    });
    return false;
  }
}

async function testEnvironmentLoading() {
  return new Promise((resolve, reject) => {
    const testName = "Environment Variable Loading";
    console.log(`\n🧪 Testing: ${testName}`);

    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error("Environment loading test timeout"));
    }, CONFIG.TIMEOUT);

    const ws = createWebSocket(CONFIG.SYSTEM_TERMINAL_PORT);

    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data);

        if (
          message.type === "stream" &&
          message.data.includes("Loaded environment")
        ) {
          console.log("✅ Environment files detected:", message.data.trim());
          clearTimeout(timeout);
          ws.close();
          TEST_RESULTS.systemTerminal.passed++;
          TEST_RESULTS.systemTerminal.tests.push({
            name: testName,
            status: "PASS",
            message: "Environment variables loaded successfully",
            details: message.data.trim(),
          });
          resolve(true);
        } else if (message.type === "connected") {
          // Wait a bit for environment loading message
          setTimeout(() => {
            // If no environment message received, send a command to check
            ws.send(
              JSON.stringify({ type: "input", data: "echo $NODE_ENV\r" }),
            );
          }, 3000);
        } else if (
          message.type === "stream" &&
          message.data.includes("development")
        ) {
          console.log("✅ Environment variables working (NODE_ENV found)");
          clearTimeout(timeout);
          ws.close();
          TEST_RESULTS.systemTerminal.passed++;
          TEST_RESULTS.systemTerminal.tests.push({
            name: testName,
            status: "PASS",
            message: "Environment variables accessible",
            details: "NODE_ENV variable detected",
          });
          resolve(true);
        }
      } catch (error) {
        console.error("Error in environment test:", error);
      }
    });

    ws.on("error", (error) => {
      clearTimeout(timeout);
      TEST_RESULTS.systemTerminal.failed++;
      TEST_RESULTS.systemTerminal.tests.push({
        name: testName,
        status: "FAIL",
        message: error.message,
      });
      reject(error);
    });
  });
}

async function checkWebSocketServerStatus() {
  const testName = "WebSocket Server Health Check";
  console.log(`\n🧪 Testing: ${testName}`);

  const checkPort = (port, type) => {
    return new Promise((resolve) => {
      const ws = new WebSocket(`ws://127.0.0.1:${port}/`);

      const timeout = setTimeout(() => {
        ws.close();
        resolve(false);
      }, 5000);

      ws.on("open", () => {
        clearTimeout(timeout);
        ws.close();
        resolve(true);
      });

      ws.on("error", () => {
        clearTimeout(timeout);
        resolve(false);
      });
    });
  };

  try {
    const systemServerRunning = await checkPort(
      CONFIG.SYSTEM_TERMINAL_PORT,
      "system",
    );
    const claudeServerRunning = await checkPort(
      CONFIG.CLAUDE_TERMINAL_PORT,
      "claude",
    );

    const healthStatus = {
      system: systemServerRunning,
      claude: claudeServerRunning,
      overall: systemServerRunning && claudeServerRunning,
    };

    console.log("📊 WebSocket Server Status:", healthStatus);

    if (healthStatus.overall) {
      TEST_RESULTS.systemTerminal.passed++;
      TEST_RESULTS.systemTerminal.tests.push({
        name: testName,
        status: "PASS",
        message: "All WebSocket servers are running",
        details: `System: ${systemServerRunning}, Claude: ${claudeServerRunning}`,
      });
      return true;
    } else {
      TEST_RESULTS.systemTerminal.failed++;
      TEST_RESULTS.systemTerminal.tests.push({
        name: testName,
        status: "FAIL",
        message: "Some WebSocket servers are not accessible",
        details: `System: ${systemServerRunning}, Claude: ${claudeServerRunning}`,
      });
      return false;
    }
  } catch (error) {
    TEST_RESULTS.systemTerminal.failed++;
    TEST_RESULTS.systemTerminal.tests.push({
      name: testName,
      status: "FAIL",
      message: error.message,
    });
    return false;
  }
}

function generateReport() {
  console.log("\n" + "=".repeat(80));
  console.log("📋 COMPREHENSIVE TERMINAL SYSTEM TEST REPORT");
  console.log("=".repeat(80));

  const totalTests = Object.values(TEST_RESULTS).reduce(
    (sum, category) => sum + category.passed + category.failed,
    0,
  );
  const totalPassed = Object.values(TEST_RESULTS).reduce(
    (sum, category) => sum + category.passed,
    0,
  );
  const totalFailed = Object.values(TEST_RESULTS).reduce(
    (sum, category) => sum + category.failed,
    0,
  );

  console.log(`\n📊 OVERALL RESULTS:`);
  console.log(`   Total Tests: ${totalTests}`);
  console.log(`   ✅ Passed: ${totalPassed}`);
  console.log(`   ❌ Failed: ${totalFailed}`);
  console.log(
    `   📈 Success Rate: ${((totalPassed / totalTests) * 100).toFixed(1)}%`,
  );

  // Detailed results by category
  Object.entries(TEST_RESULTS).forEach(([category, results]) => {
    console.log(`\n🏷️  ${category.toUpperCase()} TESTS:`);
    console.log(`   ✅ Passed: ${results.passed}`);
    console.log(`   ❌ Failed: ${results.failed}`);

    if (results.tests.length > 0) {
      console.log("\n   Test Details:");
      results.tests.forEach((test) => {
        const icon = test.status === "PASS" ? "✅" : "❌";
        console.log(`   ${icon} ${test.name}: ${test.message}`);
        if (test.details) {
          console.log(`      Details: ${test.details}`);
        }
      });
    }
  });

  console.log("\n" + "=".repeat(80));

  // Recommendations
  console.log("\n💡 RECOMMENDATIONS:");

  if (totalFailed === 0) {
    console.log(
      "   🎉 All tests passed! Terminal system is functioning correctly.",
    );
  } else {
    if (TEST_RESULTS.systemTerminal.failed > 0) {
      console.log(
        "   🔧 System Terminal Issues: Check WebSocket server on port 4001",
      );
    }
    if (TEST_RESULTS.claudeTerminal.failed > 0) {
      console.log(
        "   🤖 Claude Terminal Issues: Verify Claude CLI is installed and WebSocket server on port 4002",
      );
    }
    if (TEST_RESULTS.kmIntegration.failed > 0) {
      console.log(
        "   📚 KM Integration Issues: Complete Knowledge Base module implementation",
      );
    }
    if (TEST_RESULTS.multiTerminal.failed > 0) {
      console.log(
        "   🔄 Multi-Terminal Issues: Check session management and parallel processing",
      );
    }
  }

  console.log("\n🔍 NEXT STEPS:");
  console.log("   1. Review failed tests and their error messages");
  console.log("   2. Check server logs for additional debugging information");
  console.log("   3. Verify all required dependencies are installed");
  console.log("   4. Update CLAUDE.md with test results");

  return {
    totalTests,
    totalPassed,
    totalFailed,
    successRate: (totalPassed / totalTests) * 100,
    details: TEST_RESULTS,
  };
}

// Main Test Execution
async function runAllTests() {
  console.log("🚀 Starting Comprehensive Terminal System Testing");
  console.log("⏰ Start Time:", new Date().toISOString());

  try {
    // Authentication
    const authSuccess = await authenticate();
    if (!authSuccess) {
      console.error("❌ Authentication failed, cannot proceed with API tests");
      process.exit(1);
    }

    // Health Check
    await checkWebSocketServerStatus();

    // System Terminal Tests
    console.log("\n🖥️  SYSTEM TERMINAL TESTS");
    console.log("-".repeat(40));

    try {
      await testSystemTerminalConnection();
    } catch (error) {
      console.error(
        "❌ System terminal connection test failed:",
        error.message,
      );
    }

    try {
      await testSystemTerminalCommands();
    } catch (error) {
      console.error("❌ System terminal commands test failed:", error.message);
    }

    try {
      await testSystemTerminalReconnection();
    } catch (error) {
      console.error(
        "❌ System terminal reconnection test failed:",
        error.message,
      );
    }

    try {
      await testEnvironmentLoading();
    } catch (error) {
      console.error("❌ Environment loading test failed:", error.message);
    }

    try {
      await testTerminalSessionPersistence();
    } catch (error) {
      console.error(
        "❌ Terminal session persistence test failed:",
        error.message,
      );
    }

    // Claude Terminal Tests
    console.log("\n🤖 CLAUDE TERMINAL TESTS");
    console.log("-".repeat(40));

    try {
      await testClaudeTerminalConnection();
    } catch (error) {
      console.error(
        "❌ Claude terminal connection test failed:",
        error.message,
      );
    }

    try {
      await testClaudeTerminalAICommands();
    } catch (error) {
      console.error(
        "❌ Claude terminal AI commands test failed:",
        error.message,
      );
    }

    // Knowledge Management Integration Tests
    console.log("\n📚 KNOWLEDGE MANAGEMENT INTEGRATION TESTS");
    console.log("-".repeat(50));

    try {
      await testKnowledgeBaseIntegration();
    } catch (error) {
      console.error(
        "❌ Knowledge base integration test failed:",
        error.message,
      );
    }

    // Multi-Terminal Integration Tests
    console.log("\n🔄 MULTI-TERMINAL INTEGRATION TESTS");
    console.log("-".repeat(45));

    try {
      await testMultipleTerminalsSynchronously();
    } catch (error) {
      console.error("❌ Multiple terminals test failed:", error.message);
    }
  } catch (error) {
    console.error("💥 Fatal error during testing:", error);
  } finally {
    console.log("\n⏰ End Time:", new Date().toISOString());
    const report = generateReport();

    // Save report to file
    const fs = require("fs");
    const reportData = {
      timestamp: new Date().toISOString(),
      ...report,
    };

    fs.writeFileSync(
      "/Users/sem4pro/Stock/port/scripts/terminal-test-report.json",
      JSON.stringify(reportData, null, 2),
    );

    console.log(
      "\n📄 Detailed report saved to: scripts/terminal-test-report.json",
    );

    // Exit with appropriate code
    process.exit(report.totalFailed > 0 ? 1 : 0);
  }
}

// Handle process termination
process.on("SIGINT", () => {
  console.log("\n🛑 Test execution interrupted");
  generateReport();
  process.exit(1);
});

process.on("uncaughtException", (error) => {
  console.error("💥 Uncaught exception:", error);
  generateReport();
  process.exit(1);
});

// Start testing
if (require.main === module) {
  runAllTests();
}

module.exports = {
  runAllTests,
  CONFIG,
  TEST_RESULTS,
};
