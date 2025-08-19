#!/usr/bin/env node

/**
 * Memory Monitor Script for Stock Portfolio System v3.0
 * Real-time memory monitoring with service-by-service breakdown
 *
 * Usage:
 *   node scripts/monitor-memory.js
 *   npm run memory:monitor
 */

const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

class MemoryMonitor {
  constructor() {
    this.services = {
      frontend: { port: 3000, pattern: "server.js", target: 1024 },
      gateway: { port: 4000, pattern: "services/gateway", target: 256 },
      terminal: { port: 4300, pattern: "services/terminal", target: 256 },
      portfolio: { port: 4500, pattern: "services/portfolio", target: 256 },
      "ai-assistant": {
        port: 4200,
        pattern: "services/ai-assistant",
        target: 256,
      },
      "user-management": {
        port: 4100,
        pattern: "services/user-management",
        target: 256,
      },
    };

    this.alertThreshold = 2048; // 2GB total system limit
    this.logFile = path.join(__dirname, "../logs/memory-monitor.log");
    this.ensureLogDirectory();
  }

  ensureLogDirectory() {
    const logDir = path.dirname(this.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  async getServiceProcesses(serviceName) {
    const service = this.services[serviceName];
    if (!service) return [];

    return new Promise((resolve, reject) => {
      const command = `ps aux | grep "${service.pattern}" | grep -v grep`;
      exec(command, (error, stdout, stderr) => {
        if (error && !stdout) {
          resolve([]); // Service not running
          return;
        }

        const processes = stdout
          .split("\n")
          .filter((line) => line.trim())
          .map((line) => {
            const parts = line.trim().split(/\s+/);
            return {
              pid: parts[1],
              cpu: parseFloat(parts[2]),
              memory: Math.round(parseFloat(parts[5]) / 1024), // Convert KB to MB
              command: parts.slice(10).join(" "),
            };
          })
          .filter((proc) => proc.memory > 0);

        resolve(processes);
      });
    });
  }

  async getNodeJSProcessesTotalMemory() {
    return new Promise((resolve, reject) => {
      const command = `ps aux | grep -E "(node|npm)" | grep -v grep | awk '{sum += $6} END {print sum/1024}'`;
      exec(command, (error, stdout, stderr) => {
        if (error) {
          resolve(0);
          return;
        }
        resolve(Math.round(parseFloat(stdout.trim()) || 0));
      });
    });
  }

  async getSystemMemoryInfo() {
    return new Promise((resolve, reject) => {
      const command = `vm_stat | grep -E "(free|wired|active|inactive)" | awk '{print $3}' | sed 's/\\.//' | head -4`;
      exec(command, (error, stdout, stderr) => {
        if (error) {
          resolve({ total: 0, used: 0, free: 0 });
          return;
        }

        const values = stdout
          .split("\n")
          .filter((v) => v.trim())
          .map((v) => (parseInt(v) * 4096) / (1024 * 1024)); // Convert pages to MB
        resolve({
          free: Math.round(values[0] || 0),
          wired: Math.round(values[1] || 0),
          active: Math.round(values[2] || 0),
          inactive: Math.round(values[3] || 0),
          total: Math.round(
            (values[1] || 0) + (values[2] || 0) + (values[3] || 0),
          ),
        });
      });
    });
  }

  formatMemory(mb) {
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(2)}GB`;
    }
    return `${mb}MB`;
  }

  getMemoryStatus(current, target) {
    const percentage = (current / target) * 100;
    if (percentage <= 80) return "🟢";
    if (percentage <= 100) return "🟡";
    return "🔴";
  }

  async monitorAllServices() {
    const results = {
      timestamp: new Date().toISOString(),
      services: {},
      totals: {},
      system: {},
      alerts: [],
    };

    let totalServiceMemory = 0;
    let totalProcesses = 0;

    // Monitor each service
    for (const [serviceName, config] of Object.entries(this.services)) {
      const processes = await this.getServiceProcesses(serviceName);
      const serviceMemory = processes.reduce(
        (sum, proc) => sum + proc.memory,
        0,
      );
      const status = this.getMemoryStatus(serviceMemory, config.target);

      results.services[serviceName] = {
        memory: serviceMemory,
        target: config.target,
        processes: processes.length,
        status,
        details: processes,
      };

      totalServiceMemory += serviceMemory;
      totalProcesses += processes.length;

      // Check for service-level alerts
      if (serviceMemory > config.target) {
        results.alerts.push(
          `${serviceName}: ${this.formatMemory(serviceMemory)} exceeds target ${this.formatMemory(config.target)}`,
        );
      }
    }

    // Get system totals
    const totalNodeMemory = await this.getNodeJSProcessesTotalMemory();
    const systemMemory = await this.getSystemMemoryInfo();

    results.totals = {
      services: totalServiceMemory,
      nodeJS: totalNodeMemory,
      processes: totalProcesses,
      target: 2048,
      status: this.getMemoryStatus(totalServiceMemory, 2048),
    };

    results.system = systemMemory;

    // Check system-level alerts
    if (totalServiceMemory > this.alertThreshold) {
      results.alerts.push(
        `System total: ${this.formatMemory(totalServiceMemory)} exceeds ${this.formatMemory(this.alertThreshold)}`,
      );
    }

    return results;
  }

  displayResults(results) {
    console.clear();
    console.log("🧠 Stock Portfolio System - Memory Monitor");
    console.log("=".repeat(60));
    console.log(`⏰ ${new Date(results.timestamp).toLocaleString()}`);
    console.log("");

    // Service breakdown
    console.log("📊 Service Memory Usage:");
    console.log("-".repeat(60));

    for (const [serviceName, data] of Object.entries(results.services)) {
      const memoryStr = this.formatMemory(data.memory).padEnd(8);
      const targetStr = this.formatMemory(data.target).padEnd(8);
      const serviceStr = serviceName.padEnd(15);
      const processStr = `${data.processes}p`.padEnd(4);

      console.log(
        `${data.status} ${serviceStr} ${memoryStr} / ${targetStr} (${processStr})`,
      );
    }

    console.log("-".repeat(60));

    // Totals
    const totalStatus = results.totals.status;
    const totalMem = this.formatMemory(results.totals.services);
    const targetMem = this.formatMemory(results.totals.target);
    const nodeMem = this.formatMemory(results.totals.nodeJS);

    console.log(`${totalStatus} TOTAL SERVICES   ${totalMem} / ${targetMem}`);
    console.log(`🟦 ALL NODE.JS     ${nodeMem}`);
    console.log(
      `💻 SYSTEM MEMORY   ${this.formatMemory(results.system.total)} used`,
    );

    // Alerts
    if (results.alerts.length > 0) {
      console.log("");
      console.log("🚨 ALERTS:");
      results.alerts.forEach((alert) => console.log(`   ${alert}`));
    }

    // Memory efficiency tips
    if (results.totals.services > 1500) {
      console.log("");
      console.log("💡 OPTIMIZATION SUGGESTIONS:");
      if (results.services.frontend?.memory > 800) {
        console.log(
          "   • Reduce frontend heap size: --max-old-space-size=1024",
        );
      }
      if (results.totals.processes > 15) {
        console.log(
          "   • Too many processes - consider using PM2 or consolidated startup",
        );
      }
      console.log("   • Run: npm run memory:cleanup");
    }

    console.log("");
  }

  logResults(results) {
    const logEntry = {
      timestamp: results.timestamp,
      totalMemory: results.totals.services,
      nodeJSMemory: results.totals.nodeJS,
      systemMemory: results.system.total,
      alerts: results.alerts.length,
      services: Object.keys(results.services).length,
    };

    fs.appendFileSync(this.logFile, JSON.stringify(logEntry) + "\n");
  }

  async sendAlert(results) {
    // Could integrate with external alerting systems
    console.error(`🚨 MEMORY ALERT: ${results.alerts.join(", ")}`);

    // Write to alert log
    const alertFile = path.join(__dirname, "../logs/memory-alerts.log");
    const alertEntry = `${results.timestamp}: ${results.alerts.join(", ")}\n`;
    fs.appendFileSync(alertFile, alertEntry);
  }

  async runOnce() {
    try {
      const results = await this.monitorAllServices();
      this.displayResults(results);
      this.logResults(results);

      if (results.alerts.length > 0) {
        await this.sendAlert(results);
      }

      return results;
    } catch (error) {
      console.error("❌ Error monitoring memory:", error.message);
      return null;
    }
  }

  startMonitoring(intervalMs = 10000) {
    console.log(
      `🚀 Starting memory monitoring (${intervalMs / 1000}s interval)`,
    );
    console.log(`📊 Monitoring ${Object.keys(this.services).length} services`);
    console.log(`📁 Logs: ${this.logFile}`);
    console.log("");

    this.runOnce();

    const interval = setInterval(async () => {
      await this.runOnce();
    }, intervalMs);

    // Graceful shutdown
    process.on("SIGINT", () => {
      console.log("\n👋 Stopping memory monitor...");
      clearInterval(interval);
      process.exit(0);
    });

    return interval;
  }

  async generateReport() {
    const results = await this.monitorAllServices();
    const report = {
      summary: {
        timestamp: results.timestamp,
        totalMemory: `${this.formatMemory(results.totals.services)} / ${this.formatMemory(results.totals.target)}`,
        efficiency: `${Math.round((results.totals.services / results.totals.target) * 100)}%`,
        alerts: results.alerts.length,
        recommendation:
          results.totals.services > 2048
            ? "CRITICAL - Immediate optimization needed"
            : results.totals.services > 1500
              ? "WARNING - Consider optimization"
              : "GOOD - Within targets",
      },
      services: results.services,
      system: results.system,
    };

    console.log(JSON.stringify(report, null, 2));
    return report;
  }
}

// CLI Interface
const args = process.argv.slice(2);
const command = args[0] || "monitor";

const monitor = new MemoryMonitor();

switch (command) {
  case "once":
    monitor.runOnce();
    break;
  case "report":
    monitor.generateReport();
    break;
  case "monitor":
  default:
    const interval = parseInt(args[1]) || 10000;
    monitor.startMonitoring(interval);
    break;
}

module.exports = MemoryMonitor;
