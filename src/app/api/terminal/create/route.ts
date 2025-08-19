/**
 * API Route: POST /api/terminal/create
 * Create a new terminal session (with flexible storage)
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
// ใช้ Storage Service ใหม่แทน InMemoryTerminalService
import { terminalStorageService } from "@/services/storage/TerminalStorageService";
// ยังคงใช้ legacy service สำหรับ WebSocket readiness
import { inMemoryTerminalService } from "@/services/terminal-memory.service";

export async function POST(request: NextRequest) {
  try {
    // Simple auth check - just verify token exists
    const cookieStore = await cookies();
    const sessionToken =
      cookieStore.get("accessToken")?.value ||
      cookieStore.get("accessToken")?.value ||
      cookieStore.get("next-auth.session-token")?.value;

    let userId = "system";
    if (!sessionToken) {
      console.log("[Terminal API] No auth token found, using system user");
      // Allow request even without auth for development
    }

    // Get request body
    const body = await request.json();
    const { projectId, projectPath, mode = "normal" } = body;
    console.log(
      `[Terminal API] 📨 Create request - project: ${projectId}, mode: ${mode}, path: ${projectPath}`,
    );

    if (!projectId) {
      console.log("[Terminal API] ❌ Missing project ID in request");
      return NextResponse.json(
        { error: "Missing required parameter: projectId" },
        { status: 400 },
      );
    }

    // Validate and use project path
    let validatedPath = projectPath;
    if (!validatedPath || validatedPath === "") {
      validatedPath = process.cwd();
      console.log(
        `[Terminal API] ⚠️ No project path provided, using current directory: ${validatedPath}`,
      );
    } else {
      console.log(`[Terminal API] ✓ Using project path: ${validatedPath}`);
    }

    // สร้าง session ผ่าน Storage Service ใหม่
    console.log(
      `[Terminal API] 🏗️ Creating session via Storage Service for user: ${userId || "system"}`,
    );
    const session = await terminalStorageService.createSession(
      projectId,
      validatedPath,
      userId,
      mode,
    );

    console.log(
      `[Terminal API] ✅ Created session ${session.id} for project ${projectId}`,
    );

    // Don't wait for WebSocket readiness - let frontend connect immediately
    // The WebSocket server will handle session registration when connection arrives
    const wsReady = true; // Always return true to allow immediate connection

    // Give a small delay for session to propagate to memory service
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Get current focus state for the project
    const focusedSessions =
      (await terminalStorageService.storageProvider?.getFocusedSessions(
        projectId,
      )) || [];
    const focusState = {
      focused: focusedSessions,
      version: Date.now(), // Simple version using timestamp
      timestamp: Date.now(),
    };

    // Format response
    const formattedSession = {
      id: session.id,
      projectId: session.projectId,
      type: session.type,
      mode: session.mode,
      tabName: session.tabName,
      status: session.status,
      isFocused: session.isFocused || true, // New sessions start focused
      active: session.active,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    };

    // Log storage mode info
    const storageInfo = await terminalStorageService.getStorageInfo();
    console.log(
      `[Terminal API] 📊 Storage mode: ${storageInfo.storageMode}, Compatibility: ${storageInfo.compatibilityMode}`,
    );

    return NextResponse.json({
      success: true,
      session: formattedSession,
      websocketReady: true, // Always true to allow immediate connection
      retryDelay: undefined, // No retry needed
      focusState,
      storageMode: storageInfo.storageMode, // เพิ่มข้อมูล storage mode
    });
  } catch (error) {
    console.error("[Terminal API] Failed to create terminal session:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create terminal session",
      },
      { status: 500 },
    );
  }
}
