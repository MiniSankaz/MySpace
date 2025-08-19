import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/middleware/auth";
import { workspaceTerminalLogger } from "@/services/workspace-terminal-logging.service";
import { z } from "zod";
import { mockTerminalLogs } from "../mock-data";

const querySchema = z.object({
  sessionId: z.string().optional(),
  projectId: z.string().optional(),
  active: z
    .string()
    .optional()
    .transform((val) => val === "true"),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val) : 100)),
});

export async function GET(request: NextRequest) {
  try {
    // Configuration - can be set via environment variable
    const useMockData = process.env.USE_MOCK_LOGS === "true" || false; // Use real data by default

    // Return mock data immediately if enabled (bypass auth for testing)
    if (useMockData) {
      console.log("[Logs API - Terminal] Using mock data (auth bypassed)");
      return NextResponse.json(mockTerminalLogs);
    }

    // Verify authentication for real data
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const params = {
      sessionId: searchParams.get("sessionId") || undefined,
      projectId: searchParams.get("projectId") || undefined,
      active: searchParams.get("active") || undefined,
      limit: searchParams.get("limit") || "100",
    };

    const validation = querySchema.safeParse(params);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: validation.error.errors },
        { status: 400 },
      );
    }

    const { sessionId, projectId, active, limit } = validation.data;

    // Get logs based on parameters
    if (sessionId) {
      // Get specific session logs
      const logs = await workspaceTerminalLogger.getSessionLogs(
        sessionId,
        limit,
      );
      return NextResponse.json({
        success: true,
        type: "session_logs",
        sessionId,
        logs,
      });
    } else if (projectId) {
      // Get project terminal data
      const sessions = await workspaceTerminalLogger.getProjectSessions(
        projectId,
        active,
      );
      const commands = await workspaceTerminalLogger.getProjectCommands(
        projectId,
        limit,
      );
      const stats = await workspaceTerminalLogger.getProjectStats(projectId);

      return NextResponse.json({
        success: true,
        type: "project_terminals",
        projectId,
        sessions,
        recentCommands: commands,
        stats,
      });
    } else {
      return NextResponse.json(
        { error: "Either sessionId or projectId is required" },
        { status: 400 },
      );
    }
  } catch (error) {
    console.error("Get terminal logs error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
