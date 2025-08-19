import { NextRequest, NextResponse } from "next/server";
import { terminalIntegration } from "@/modules/workspace/services/terminal-integration.service";
import { terminalSessionManager } from "@/modules/workspace/services/terminal-session-manager";
import { verifyAuth } from "@/middleware/auth";
import { prisma } from "@/core/database/prisma";

// GET /api/workspace/projects/[id]/terminals - Get all terminal sessions for a project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // Verify user is authenticated
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get sessions from manager (includes active sessions)
    const sessions = terminalSessionManager.getProjectSessions(id);

    // Also get any inactive sessions from database with error handling
    let dbSessions = [];
    try {
      dbSessions = await prisma.terminalSession.findMany({
        where: {
          projectId: id,
          active: false,
        },
        orderBy: { updatedAt: "desc" },
        take: 10, // Limit to recent 10 inactive sessions
      });
    } catch (error) {
      console.error("Failed to fetch inactive sessions from database:", error);
      // Continue with just the active sessions from memory
    }

    // Combine and deduplicate
    const allSessions = [...sessions];
    const sessionIds = new Set(sessions.map((s) => s.id));

    for (const dbSession of dbSessions) {
      if (!sessionIds.has(dbSession.id)) {
        allSessions.push({
          id: dbSession.id,
          projectId: dbSession.projectId,
          type: dbSession.type as "system" | "claude",
          tabName: dbSession.tabName,
          active: dbSession.active,
          output: dbSession.output as string[],
          currentPath: dbSession.currentPath,
          pid: dbSession.pid,
          createdAt: new Date(dbSession.createdAt),
        });
      }
    }

    return NextResponse.json(allSessions);
  } catch (error) {
    console.error("Failed to fetch terminal sessions:", error);
    return NextResponse.json(
      { error: "Failed to fetch terminal sessions" },
      { status: 500 },
    );
  }
}

// POST /api/workspace/projects/[id]/terminals - Create a new terminal session
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: projectId } = await params;

    // Verify user is authenticated
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user info from auth (already verified above)
    const userId = user.id;

    const body = await request.json();
    const { type, tabName, projectPath } = body;

    if (!type || !tabName || !projectPath) {
      return NextResponse.json(
        { error: "Missing required fields: type, tabName, projectPath" },
        { status: 400 },
      );
    }

    if (type !== "system" && type !== "claude") {
      return NextResponse.json(
        { error: 'Invalid type. Must be "system" or "claude"' },
        { status: 400 },
      );
    }

    // Create session using the integration service
    const session = await terminalIntegration.createSession(
      projectId,
      type,
      tabName,
      projectPath,
      userId,
    );

    return NextResponse.json(session);
  } catch (error) {
    console.error("Failed to create terminal session:", error);
    return NextResponse.json(
      { error: "Failed to create terminal session" },
      { status: 500 },
    );
  }
}

// DELETE /api/workspace/projects/[id]/terminals - Close all terminal sessions for a project
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: projectId } = await params;

    // Verify user is authenticated
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all sessions for the project
    const sessions = terminalSessionManager.getProjectSessions(projectId);

    // Close each session using integration service
    for (const session of sessions) {
      try {
        await terminalIntegration.closeSession(session.id);
      } catch (error) {
        console.error(`Failed to close session ${session.id}:`, error);
      }
    }

    return NextResponse.json({
      message: "All terminal sessions closed",
      closedCount: sessions.length,
    });
  } catch (error) {
    console.error("Failed to close terminal sessions:", error);
    return NextResponse.json(
      { error: "Failed to close terminal sessions" },
      { status: 500 },
    );
  }
}
