/**
 * API Route: PUT /api/terminal/focus
 * Set focused terminal session (in-memory storage)
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
// Import the singleton terminal service directly
import {
  InMemoryTerminalService,
  terminalService,
} from "@/services/terminal-memory.service";

// Use singleton instance
const terminalService = InMemoryTerminalService.getInstance();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json(
        { error: "Missing projectId parameter" },
        { status: 400 },
      );
    }

    // Get all focused sessions for the project
    const focusedSessions = terminalService.getFocusedSessions(projectId);

    return NextResponse.json({
      success: true,
      projectId,
      focusedSessions,
      totalFocused: focusedSessions.length,
      maxFocused: 4,
    });
  } catch (error) {
    console.error("[Terminal API] Failed to get focus status:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to get focus status",
      },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Simple auth check - just verify token exists
    const cookieStore = await cookies();
    const sessionToken =
      cookieStore.get("accessToken")?.value ||
      cookieStore.get("accessToken")?.value ||
      cookieStore.get("next-auth.session-token")?.value;

    if (!sessionToken) {
      console.log("[Terminal API] No auth token found, allowing focus anyway");
      // Allow request even without auth for development
    }

    // Get request body
    const body = await request.json();
    const { sessionId, projectId, focused = true } = body;

    if (!sessionId || !projectId) {
      return NextResponse.json(
        { error: "Missing required parameters: sessionId, projectId" },
        { status: 400 },
      );
    }

    // Update focus in memory service (supports both focus and unfocus)
    terminalService.setSessionFocus(sessionId, focused);

    // Get updated session
    const session = terminalService.getSession(sessionId);

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Get all focused sessions for the project (multi-focus support)
    const allFocusedSessions = terminalService.getFocusedSessions(projectId);

    // Get details of all focused sessions
    const focusedSessionDetails = allFocusedSessions
      .map((sid) => {
        const s = terminalService.getSession(sid);
        return s
          ? {
              id: s.id,
              type: s.type,
              tabName: s.tabName,
              status: s.status,
              isFocused: true,
            }
          : null;
      })
      .filter(Boolean);

    console.log(
      `[Terminal API] Set focus to session ${sessionId}, total focused: ${allFocusedSessions.length}`,
    );

    return NextResponse.json({
      success: true,
      sessionId,
      projectId,
      message: "Focus set successfully",
      focusedSessions: allFocusedSessions,
      focusedSessionDetails,
      totalFocused: allFocusedSessions.length,
      maxFocused: 4,
    });
  } catch (error) {
    console.error("[Terminal API] Failed to set terminal focus:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to set terminal focus",
      },
      { status: 500 },
    );
  }
}
