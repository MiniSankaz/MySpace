#!/usr/bin/env node

/**
 * Real-time Monitoring Script for Terminal System Deployment
 * Tracks key metrics and generates alerts for issues
 */

const WebSocket = require("ws");
const fs = require("fs");
const path = require("path");

// Monitoring configuration
const MONITOR_CONFIG = {
  systemPort: 4001,
  claudePort: 4002,
  apiUrl: "http://localhost:4000",
  checkInterval: 60000, // 1 minute
  metricsFile: path.join(__dirname, "deployment-metrics.json"),
  alertsFile: path.join(__dirname, "deployment-alerts.json"),
};

// Metrics tracking
const metrics = {
  startTime: Date.now(),
  checks: [],
  connectionSuccesses: 0,
  connectionFailures: 0,
  circuitBreakerTriggers: 0,
  sessionReuses: 0,
  averageLatency: [],
  memoryUsage: [],
  errors: [],
  alerts: [],
};

// Load existing metrics if available
function loadMetrics() {
  try {
    if (fs.existsSync(MONITOR_CONFIG.metricsFile)) {
      const data = JSON.parse(
        fs.readFileSync(MONITOR_CONFIG.metricsFile, "utf8"),
      );
      Object.assign(metrics, data);
      console.log(
        "📊 Loaded existing metrics from previous monitoring session",
      );
    }
  } catch (error) {
    console.log("📊 Starting fresh monitoring session");
  }
}

// Save metrics to file
function saveMetrics() {
  fs.writeFileSync(
    MONITOR_CONFIG.metricsFile,
    JSON.stringify(metrics, null, 2),
  );
}

// Generate alert
function generateAlert(severity, message, details = {}) {
  const alert = {
    timestamp: new Date().toISOString(),
    severity, // 'critical', 'warning', 'info'
    message,
    details,
  };

  metrics.alerts.push(alert);

  // Console output with color coding
  const colors = {
    critical: "\x1b[31m", // Red
    warning: "\x1b[33m", // Yellow
    info: "\x1b[36m", // Cyan
  };
  const reset = "\x1b[0m";

  console.log(
    `${colors[severity]}⚠️ [${severity.toUpperCase()}] ${message}${reset}`,
  );

  // Save alerts
  fs.writeFileSync(
    MONITOR_CONFIG.alertsFile,
    JSON.stringify(metrics.alerts, null, 2),
  );

  return alert;
}

// Check WebSocket connectivity
async function checkWebSocketHealth(port, name) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const sessionId = `monitor_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;

    const ws = new WebSocket(
      `ws://localhost:${port}/?sessionId=${sessionId}&projectId=monitor`,
    );

    let connected = false;
    let responseReceived = false;

    ws.on("open", () => {
      connected = true;
      const latency = Date.now() - startTime;
      metrics.averageLatency.push(latency);

      // Send test command
      ws.send(JSON.stringify({ type: "input", data: 'echo "health check"\r' }));
    });

    ws.on("message", (data) => {
      const msg = JSON.parse(data);
      if (msg.type === "stream" && msg.data.includes("health check")) {
        responseReceived = true;
      }
    });

    ws.on("error", (error) => {
      metrics.connectionFailures++;
      metrics.errors.push({
        timestamp: new Date().toISOString(),
        service: name,
        error: error.message,
      });
    });

    setTimeout(() => {
      ws.close();

      if (connected && responseReceived) {
        metrics.connectionSuccesses++;
        resolve({ status: "healthy", latency: Date.now() - startTime });
      } else if (connected) {
        resolve({ status: "partial", latency: Date.now() - startTime });
      } else {
        resolve({ status: "unhealthy", latency: null });
      }
    }, 3000);
  });
}

// Monitor circuit breaker status
async function checkCircuitBreaker() {
  let rapidFailures = 0;
  const testSessionId = `circuit_monitor_${Date.now()}`;

  for (let i = 0; i < 3; i++) {
    try {
      const ws = new WebSocket(
        `ws://localhost:${MONITOR_CONFIG.systemPort}/?sessionId=${testSessionId}&projectId=monitor`,
      );

      await new Promise((resolve) => {
        ws.on("open", () => {
          ws.close();
          resolve();
        });

        ws.on("error", () => {
          rapidFailures++;
          resolve();
        });

        setTimeout(resolve, 100);
      });
    } catch (error) {
      rapidFailures++;
    }
  }

  return rapidFailures < 3; // Circuit breaker is working if it limits connections
}

// Check memory usage
function checkMemoryUsage() {
  const usage = process.memoryUsage();
  const heapUsedMB = usage.heapUsed / 1024 / 1024;

  metrics.memoryUsage.push({
    timestamp: new Date().toISOString(),
    heapUsed: heapUsedMB,
    heapTotal: usage.heapTotal / 1024 / 1024,
    rss: usage.rss / 1024 / 1024,
  });

  // Alert if memory usage is high
  if (heapUsedMB > 100) {
    generateAlert("warning", `High memory usage: ${heapUsedMB.toFixed(2)}MB`, {
      heapUsedMB,
    });
  }

  return heapUsedMB;
}

// Calculate statistics
function calculateStats() {
  const totalConnections =
    metrics.connectionSuccesses + metrics.connectionFailures;
  const successRate =
    totalConnections > 0
      ? ((metrics.connectionSuccesses / totalConnections) * 100).toFixed(2)
      : 0;

  const avgLatency =
    metrics.averageLatency.length > 0
      ? (
          metrics.averageLatency.reduce((a, b) => a + b, 0) /
          metrics.averageLatency.length
        ).toFixed(2)
      : 0;

  const uptime = ((Date.now() - metrics.startTime) / 1000 / 60).toFixed(2); // minutes

  return {
    uptime,
    successRate,
    avgLatency,
    totalConnections,
    failures: metrics.connectionFailures,
    circuitBreakerTriggers: metrics.circuitBreakerTriggers,
    errorCount: metrics.errors.length,
    alertCount: metrics.alerts.length,
  };
}

// Main monitoring loop
async function runMonitoringCheck() {
  console.log("\n🔍 Running monitoring check...");

  const checkResult = {
    timestamp: new Date().toISOString(),
    systemTerminal: await checkWebSocketHealth(
      MONITOR_CONFIG.systemPort,
      "System Terminal",
    ),
    claudeTerminal: await checkWebSocketHealth(
      MONITOR_CONFIG.claudePort,
      "Claude Terminal",
    ),
    circuitBreaker: await checkCircuitBreaker(),
    memoryUsage: checkMemoryUsage(),
  };

  metrics.checks.push(checkResult);

  // Generate alerts based on health status
  if (checkResult.systemTerminal.status === "unhealthy") {
    generateAlert(
      "critical",
      "System Terminal is not responding",
      checkResult.systemTerminal,
    );
  }

  if (checkResult.claudeTerminal.status === "unhealthy") {
    generateAlert(
      "warning",
      "Claude Terminal is not responding",
      checkResult.claudeTerminal,
    );
  }

  if (!checkResult.circuitBreaker) {
    generateAlert(
      "warning",
      "Circuit breaker may not be functioning correctly",
    );
  }

  // Save metrics
  saveMetrics();

  // Display current stats
  const stats = calculateStats();
  console.log("\n📊 Current Statistics:");
  console.log(`   Uptime: ${stats.uptime} minutes`);
  console.log(`   Success Rate: ${stats.successRate}%`);
  console.log(`   Average Latency: ${stats.avgLatency}ms`);
  console.log(`   Total Connections: ${stats.totalConnections}`);
  console.log(`   Failures: ${stats.failures}`);
  console.log(`   Alerts: ${stats.alertCount}`);

  // Check if we should generate a periodic report
  if (metrics.checks.length % 60 === 0) {
    // Every hour
    generateHourlyReport();
  }

  return checkResult;
}

// Generate hourly report
function generateHourlyReport() {
  const stats = calculateStats();
  const report = {
    timestamp: new Date().toISOString(),
    period: "hourly",
    stats,
    recentAlerts: metrics.alerts.slice(-10),
    recentErrors: metrics.errors.slice(-10),
  };

  const reportPath = path.join(__dirname, `hourly-report-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log("\n📄 Hourly report generated:", reportPath);

  // Generate alert if success rate is low
  if (parseFloat(stats.successRate) < 95) {
    generateAlert(
      "warning",
      `Success rate below 95%: ${stats.successRate}%`,
      stats,
    );
  }
}

// Generate final report
function generateFinalReport() {
  const stats = calculateStats();
  const report = {
    timestamp: new Date().toISOString(),
    monitoringDuration: `${stats.uptime} minutes`,
    summary: stats,
    allAlerts: metrics.alerts,
    recommendation: getRecommendation(stats),
  };

  const reportPath = path.join(__dirname, "monitoring-final-report.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log("\n" + "=".repeat(60));
  console.log("📊 MONITORING FINAL REPORT");
  console.log("=".repeat(60));
  console.log(`\nMonitoring Duration: ${stats.uptime} minutes`);
  console.log(`Success Rate: ${stats.successRate}%`);
  console.log(`Total Connections: ${stats.totalConnections}`);
  console.log(`Failures: ${stats.failures}`);
  console.log(`Alerts Generated: ${stats.alertCount}`);
  console.log(`\nRecommendation: ${report.recommendation}`);
  console.log("\n📁 Full report saved to:", reportPath);
  console.log("=".repeat(60));
}

// Get deployment recommendation
function getRecommendation(stats) {
  const successRate = parseFloat(stats.successRate);

  if (successRate >= 99 && stats.failures === 0) {
    return "✅ READY FOR STAGING - System is highly stable";
  } else if (successRate >= 95) {
    return "✅ CONDITIONAL STAGING - System is stable but monitor closely";
  } else if (successRate >= 90) {
    return "⚠️ EXTEND MONITORING - System needs more observation";
  } else {
    return "❌ NOT READY - System has stability issues";
  }
}

// Graceful shutdown
function shutdown() {
  console.log("\n🛑 Stopping monitoring...");
  generateFinalReport();
  process.exit(0);
}

// Handle signals
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// Main monitoring runner
async function startMonitoring() {
  console.log("\n🚀 Starting Deployment Monitoring System");
  console.log("=".repeat(60));
  console.log("📊 Monitoring WebSocket terminals on ports 4001 and 4002");
  console.log("⏱️ Check interval: 1 minute");
  console.log("📁 Metrics file:", MONITOR_CONFIG.metricsFile);
  console.log("🔔 Alerts file:", MONITOR_CONFIG.alertsFile);
  console.log("\nPress Ctrl+C to stop monitoring and generate final report");
  console.log("=".repeat(60));

  // Load existing metrics
  loadMetrics();

  // Run initial check
  await runMonitoringCheck();

  // Set up periodic monitoring
  setInterval(runMonitoringCheck, MONITOR_CONFIG.checkInterval);

  // Keep process alive
  process.stdin.resume();
}

// Start monitoring
startMonitoring().catch((error) => {
  console.error("Fatal error:", error);
  generateAlert("critical", "Monitoring system crashed", {
    error: error.message,
  });
  process.exit(1);
});
