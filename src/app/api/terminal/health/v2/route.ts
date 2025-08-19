/**
 * API Route: GET /api/terminal/health/v2
 * Advanced terminal system health check with orchestrator integration
 */

import { NextRequest, NextResponse } from "next/server";
import {
  checkApiAuth,
  checkRateLimit,
  sanitizeResponse,
} from "@/middleware/auth-check";

// Import orchestrator service
let terminalOrchestrator: any;
try {
  const orchestratorModule = require("@/services/terminal-orchestrator.service");
  terminalOrchestrator = orchestratorModule.terminalOrchestrator;
} catch (error) {
  console.error("[Terminal Health V2 API] Failed to load orchestrator:", error);
}

export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const authResult = await checkApiAuth(request, { requireAuth: true });
    if (!authResult.authorized) {
      return NextResponse.json(
        {
          status: "unauthorized",
          message: authResult.reason,
          timestamp: new Date().toISOString(),
        },
        { status: 401 },
      );
    }

    // Rate limiting
    const clientIp = request.headers.get("x-forwarded-for") || "unknown";
    if (!checkRateLimit(clientIp, 100, 60000)) {
      return NextResponse.json(
        {
          status: "rate_limited",
          message: "Too many requests",
          timestamp: new Date().toISOString(),
        },
        { status: 429 },
      );
    }
    // If orchestrator not available, fallback to basic health
    if (!terminalOrchestrator) {
      return NextResponse.json(
        {
          status: "degraded",
          message: "Orchestrator not available",
          timestamp: new Date().toISOString(),
        },
        { status: 503 },
      );
    }

    // Get orchestrator status
    const orchestratorStatus = terminalOrchestrator.getStatus();

    // Perform health check
    const healthCheck = await terminalOrchestrator.healthCheck();

    // Calculate detailed metrics
    const memoryUsage = process.memoryUsage();
    const memoryMetrics = {
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      rss: Math.round(memoryUsage.rss / 1024 / 1024),
      external: Math.round(memoryUsage.external / 1024 / 1024),
      percentUsed: (
        (memoryUsage.heapUsed / memoryUsage.heapTotal) *
        100
      ).toFixed(1),
    };

    // Get CPU metrics
    const cpuUsage = process.cpuUsage();
    const uptime = process.uptime();
    const cpuMetrics = {
      user: Math.round(cpuUsage.user / 1000),
      system: Math.round(cpuUsage.system / 1000),
      uptime: Math.round(uptime),
    };

    // Determine overall health status
    let overallStatus = "healthy";
    const issues = [];

    if (!healthCheck.healthy) {
      overallStatus = "degraded";

      if (!healthCheck.checks.memory) {
        issues.push("High memory usage");
      }
      if (!healthCheck.checks.database) {
        issues.push("Database unavailable");
      }
      if (!healthCheck.checks.circuits) {
        issues.push("Circuit breaker open");
      }
    }

    // Build comprehensive response
    const response = {
      status: overallStatus,
      checks: healthCheck.checks,
      issues,
      metrics: {
        memory: memoryMetrics,
        cpu: cpuMetrics,
        sessions: {
          total: orchestratorStatus.sessions,
          memory: orchestratorStatus.services.memory,
          lifecycle: orchestratorStatus.services.lifecycle.states,
          pool: orchestratorStatus.services.pool,
        },
      },
      configuration: {
        mode: orchestratorStatus.config.mode,
        databaseEnabled: orchestratorStatus.config.databaseEnabled,
      },
      services: {
        orchestrator: orchestratorStatus.initialized,
        memoryPool: {
          poolSize: orchestratorStatus.services.pool.poolSize,
          activeSessions: orchestratorStatus.services.pool.activeSessions,
          recycledAvailable: orchestratorStatus.services.pool.recycledAvailable,
        },
        circuits: orchestratorStatus.services.circuits,
        metrics: orchestratorStatus.services.metrics,
      },
      performance: {
        avgResponseTime:
          orchestratorStatus.services.metrics?.averages?.responseTime || 0,
        errorRate:
          orchestratorStatus.services.metrics?.averages?.errorRate || 0,
      },
      timestamp: new Date().toISOString(),
    };

    // Sanitize response to remove sensitive data
    const sanitizedResponse = sanitizeResponse(response);

    // Set appropriate status code
    const statusCode =
      overallStatus === "healthy"
        ? 200
        : overallStatus === "degraded"
          ? 206
          : 503;

    return NextResponse.json(sanitizedResponse, { status: statusCode });
  } catch (error) {
    console.error("[Terminal Health V2 API] Error:", error);
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Health check failed",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
