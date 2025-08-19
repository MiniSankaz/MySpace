/**
 * API Route: GET /api/terminal-v2/migration-status
 * ตรวจสอบสถานะการ migration
 */

import { NextRequest, NextResponse } from "next/server";
import { migrationService } from "@/services/terminal-v2/migration/migration-service";
import { getTerminalOrchestrator } from "@/services/terminal-v2/terminal-orchestrator";

export async function GET(request: NextRequest) {
  try {
    // ดึง migration status
    const migrationStatus = migrationService.getStatus();

    // ดึง orchestrator status
    const orchestrator = getTerminalOrchestrator();
    const orchestratorStatus = orchestrator.getStatus();

    // ดึง metrics ถ้า feature เปิดอยู่
    let metrics = null;
    if (migrationStatus.featureFlags.useNewMetrics) {
      metrics = orchestrator.getMetrics();
    }

    // สร้าง response
    const response = {
      migration: {
        mode: migrationStatus.mode,
        sessionsMigrated: migrationStatus.sessionsMigrated,
        sessionsLegacy: migrationStatus.sessionsLegacy,
        errors: migrationStatus.errors,
        startTime: migrationStatus.startTime,
        lastMigration: migrationStatus.lastMigration,
        featureFlags: migrationStatus.featureFlags,
      },
      orchestrator: {
        ready: orchestratorStatus.ready,
        statistics: orchestratorStatus.statistics,
        health: orchestratorStatus.health,
      },
      metrics: metrics
        ? {
            cpu: metrics.cpu,
            memory: {
              heapUsed: Math.round(metrics.memory.heapUsed / 1024 / 1024), // MB
              heapTotal: Math.round(metrics.memory.heapTotal / 1024 / 1024), // MB
              percentUsed: metrics.memory.percentUsed,
            },
            sessions: metrics.sessions,
            streams: metrics.streams,
            errors: {
              total: metrics.errors.total,
              rate: metrics.errors.rate,
            },
          }
        : null,
      recommendations: generateRecommendations(
        migrationStatus,
        orchestratorStatus,
      ),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[Terminal V2 API] Failed to get migration status:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to get status",
      },
      { status: 500 },
    );
  }
}

/**
 * สร้างคำแนะนำตามสถานะ
 */
function generateRecommendations(
  migrationStatus: any,
  orchestratorStatus: any,
): string[] {
  const recommendations: string[] = [];

  // ตรวจสอบ error rate
  if (migrationStatus.errors > 10) {
    recommendations.push("พบ error จำนวนมาก ควรตรวจสอบ logs");
  }

  // ตรวจสอบ migration progress
  if (migrationStatus.mode === "progressive") {
    const enabledCount = Object.values(migrationStatus.featureFlags).filter(
      (v) => v === true,
    ).length;
    const totalCount = Object.keys(migrationStatus.featureFlags).length;

    if (enabledCount === 0) {
      recommendations.push("ยังไม่มี feature ใดถูกเปิดใช้งาน");
    } else if (enabledCount < totalCount) {
      recommendations.push(
        `Migration progress: ${enabledCount}/${totalCount} features enabled`,
      );
    } else {
      recommendations.push("พร้อมเปลี่ยนไป mode: NEW ได้แล้ว");
    }
  }

  // ตรวจสอบ health
  if (!orchestratorStatus.health?.healthy) {
    recommendations.push("ระบบมีปัญหา health ควรตรวจสอบ");
  }

  // ตรวจสอบ session count
  if (orchestratorStatus.statistics?.sessions > 50) {
    recommendations.push("มี session จำนวนมาก อาจกระทบ performance");
  }

  return recommendations;
}
