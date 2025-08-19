#!/usr/bin/env tsx

/**
 * Terminal Load Testing Script
 * ทดสอบ performance และ scalability
 */

import WebSocket from "ws";
import chalk from "chalk";

interface TestConfig {
  baseUrl: string;
  wsUrl: string;
  numProjects: number;
  sessionsPerProject: number;
  messageInterval: number; // ms
  testDuration: number; // ms
}

interface TestResult {
  totalSessions: number;
  successfulConnections: number;
  failedConnections: number;
  messagesPerSecond: number;
  averageLatency: number;
  maxLatency: number;
  minLatency: number;
  memoryUsage: number;
  errors: string[];
}

class LoadTester {
  private config: TestConfig;
  private connections: Map<string, WebSocket> = new Map();
  private metrics = {
    messagesSent: 0,
    messagesReceived: 0,
    latencies: [] as number[],
    errors: [] as string[],
    startTime: 0,
    endTime: 0,
  };

  constructor(config: TestConfig) {
    this.config = config;
  }

  async run(): Promise<TestResult> {
    console.log(chalk.bold.cyan("\n🚀 Starting Load Test\n"));
    console.log(`Projects: ${this.config.numProjects}`);
    console.log(`Sessions per project: ${this.config.sessionsPerProject}`);
    console.log(
      `Total sessions: ${this.config.numProjects * this.config.sessionsPerProject}`,
    );
    console.log(`Test duration: ${this.config.testDuration / 1000}s\n`);

    this.metrics.startTime = Date.now();

    // Phase 1: Create sessions
    console.log(chalk.yellow("Phase 1: Creating sessions..."));
    await this.createSessions();

    // Phase 2: Send messages
    console.log(chalk.yellow("\nPhase 2: Sending messages..."));
    await this.sendMessages();

    // Phase 3: Wait for test duration
    console.log(chalk.yellow("\nPhase 3: Running test..."));
    await this.waitForDuration();

    // Phase 4: Cleanup
    console.log(chalk.yellow("\nPhase 4: Cleaning up..."));
    await this.cleanup();

    this.metrics.endTime = Date.now();

    return this.calculateResults();
  }

  private async createSessions(): Promise<void> {
    const promises: Promise<void>[] = [];

    for (let p = 0; p < this.config.numProjects; p++) {
      const projectId = `load-test-project-${p}`;

      for (let s = 0; s < this.config.sessionsPerProject; s++) {
        const sessionId = `${projectId}-session-${s}`;
        promises.push(this.createSession(sessionId, projectId));
      }
    }

    await Promise.allSettled(promises);
    console.log(`Created ${this.connections.size} connections`);
  }

  private async createSession(
    sessionId: string,
    projectId: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // First create session via API
        fetch(`${this.config.baseUrl}/api/terminal-v2/create`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId,
            projectPath: `/tmp/${projectId}`,
            mode: "normal",
          }),
        })
          .then(async (response) => {
            if (!response.ok) {
              throw new Error(`API error: ${response.statusText}`);
            }

            const data = await response.json();
            const actualSessionId = data.session.id;

            // Connect WebSocket
            const ws = new WebSocket(
              `${this.config.wsUrl}?sessionId=${actualSessionId}&projectId=${projectId}`,
            );

            ws.on("open", () => {
              this.connections.set(sessionId, ws);
              resolve();
            });

            ws.on("error", (error) => {
              this.metrics.errors.push(
                `WS error for ${sessionId}: ${error.message}`,
              );
              reject(error);
            });

            ws.on("message", (data) => {
              this.metrics.messagesReceived++;
              // Track latency if message has timestamp
              try {
                const message = JSON.parse(data.toString());
                if (message.timestamp) {
                  const latency = Date.now() - message.timestamp;
                  this.metrics.latencies.push(latency);
                }
              } catch {
                // Not JSON, ignore
              }
            });
          })
          .catch(reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  private async sendMessages(): Promise<void> {
    const interval = setInterval(() => {
      for (const [sessionId, ws] of this.connections) {
        if (ws.readyState === WebSocket.OPEN) {
          const message = JSON.stringify({
            type: "input",
            data: 'echo "Load test message"\\n',
            timestamp: Date.now(),
          });
          ws.send(message);
          this.metrics.messagesSent++;
        }
      }
    }, this.config.messageInterval);

    // Store interval ID for cleanup
    (this as any).messageInterval = interval;
  }

  private async waitForDuration(): Promise<void> {
    const startTime = Date.now();
    const updateInterval = 1000; // Update every second

    return new Promise((resolve) => {
      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = (elapsed / this.config.testDuration) * 100;

        process.stdout.write(
          `\rProgress: ${progress.toFixed(0)}% | ` +
            `Messages: ${this.metrics.messagesSent} sent, ${this.metrics.messagesReceived} received | ` +
            `Active: ${Array.from(this.connections.values()).filter((ws) => ws.readyState === WebSocket.OPEN).length}`,
        );

        if (elapsed >= this.config.testDuration) {
          clearInterval(interval);
          console.log(); // New line
          resolve();
        }
      }, updateInterval);
    });
  }

  private async cleanup(): Promise<void> {
    // Stop sending messages
    if ((this as any).messageInterval) {
      clearInterval((this as any).messageInterval);
    }

    // Close all connections
    for (const [sessionId, ws] of this.connections) {
      ws.close();
    }

    // Clean up via API
    const projectIds = new Set<string>();
    for (const sessionId of this.connections.keys()) {
      const projectId = sessionId.split("-session-")[0];
      projectIds.add(projectId);
    }

    for (const projectId of projectIds) {
      try {
        await fetch(`${this.config.baseUrl}/api/terminal/cleanup`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId }),
        });
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  }

  private calculateResults(): TestResult {
    const duration = (this.metrics.endTime - this.metrics.startTime) / 1000; // seconds
    const activeConnections = Array.from(this.connections.values()).filter(
      (ws) => ws.readyState === WebSocket.OPEN,
    ).length;

    const avgLatency =
      this.metrics.latencies.length > 0
        ? this.metrics.latencies.reduce((a, b) => a + b, 0) /
          this.metrics.latencies.length
        : 0;

    const maxLatency =
      this.metrics.latencies.length > 0
        ? Math.max(...this.metrics.latencies)
        : 0;

    const minLatency =
      this.metrics.latencies.length > 0
        ? Math.min(...this.metrics.latencies)
        : 0;

    return {
      totalSessions: this.config.numProjects * this.config.sessionsPerProject,
      successfulConnections: this.connections.size,
      failedConnections:
        this.config.numProjects * this.config.sessionsPerProject -
        this.connections.size,
      messagesPerSecond: this.metrics.messagesSent / duration,
      averageLatency: avgLatency,
      maxLatency,
      minLatency,
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024, // MB
      errors: this.metrics.errors.slice(0, 10), // First 10 errors
    };
  }
}

// Main
async function main() {
  const config: TestConfig = {
    baseUrl: process.env.BASE_URL || "http://localhost:4000",
    wsUrl: process.env.WS_URL || "ws://localhost:4000/ws/terminal-v2",
    numProjects: parseInt(process.env.NUM_PROJECTS || "3"),
    sessionsPerProject: parseInt(process.env.SESSIONS_PER_PROJECT || "5"),
    messageInterval: parseInt(process.env.MESSAGE_INTERVAL || "1000"),
    testDuration: parseInt(process.env.TEST_DURATION || "30000"), // 30 seconds
  };

  const tester = new LoadTester(config);
  const results = await tester.run();

  // Display results
  console.log(chalk.bold.cyan("\n📊 Test Results\n"));
  console.log(`Total Sessions: ${results.totalSessions}`);
  console.log(
    `Successful Connections: ${chalk.green(results.successfulConnections)}`,
  );
  console.log(`Failed Connections: ${chalk.red(results.failedConnections)}`);
  console.log(`Messages/sec: ${results.messagesPerSecond.toFixed(2)}`);
  console.log(`Average Latency: ${results.averageLatency.toFixed(2)}ms`);
  console.log(`Max Latency: ${results.maxLatency}ms`);
  console.log(`Min Latency: ${results.minLatency}ms`);
  console.log(`Memory Usage: ${results.memoryUsage.toFixed(2)}MB`);

  if (results.errors.length > 0) {
    console.log(chalk.red("\nErrors:"));
    results.errors.forEach((err) => console.log(`  - ${err}`));
  }

  // Performance rating
  console.log(chalk.bold.cyan("\n🎯 Performance Rating\n"));

  const connectionRate =
    (results.successfulConnections / results.totalSessions) * 100;
  if (connectionRate === 100) {
    console.log(chalk.green("✅ Excellent: All connections successful"));
  } else if (connectionRate >= 95) {
    console.log(chalk.yellow("⚠️ Good: Most connections successful"));
  } else {
    console.log(chalk.red("❌ Poor: Many connection failures"));
  }

  if (results.averageLatency < 50) {
    console.log(chalk.green("✅ Excellent latency"));
  } else if (results.averageLatency < 200) {
    console.log(chalk.yellow("⚠️ Acceptable latency"));
  } else {
    console.log(chalk.red("❌ High latency detected"));
  }

  process.exit(results.failedConnections > 0 ? 1 : 0);
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error(chalk.red("Fatal error:"), error);
    process.exit(1);
  });
}

export { LoadTester, TestConfig, TestResult };
