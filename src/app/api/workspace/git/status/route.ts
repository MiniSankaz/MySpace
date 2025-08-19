import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getGitService } from "@/services/git.service";
import { prisma } from "@/core/database/prisma";
import { gitStatusRateLimiter } from "@/lib/rate-limiter";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    console.log(`[Git Status API] 📥 Request for project: ${projectId}`);

    const cookieStore = await cookies();
    // Fix: Use correct cookie name 'accessToken' instead of 'auth-token'
    const token = cookieStore.get("accessToken");

    if (!token) {
      console.log(
        `[Git Status API] 🚫 No accessToken cookie found for project: ${projectId}`,
      );
      // Also check Authorization header as fallback
      const authHeader = request.headers.get("authorization");
      if (!authHeader) {
        console.log(`[Git Status API] 🚫 No Authorization header either`);
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      // If we have auth header, continue with that token
      console.log(`[Git Status API] ✅ Using Authorization header instead`);
    }

    if (!projectId) {
      console.log("[Git Status API] ❌ No project ID provided");
      return NextResponse.json(
        { error: "Project ID required" },
        { status: 400 },
      );
    }

    // Check rate limit
    const rateLimitKey = `git-status-${projectId}`;
    const { allowed, remaining, resetTime } =
      gitStatusRateLimiter.check(rateLimitKey);
    console.log(
      `[Git Status API] 📊 Rate limit check - allowed: ${allowed}, remaining: ${remaining}`,
    );

    if (!allowed) {
      console.warn(
        `[Git Status API] 🛑 Rate limited for project: ${projectId}`,
      );
      return NextResponse.json(
        {
          error: "Too many requests",
          message:
            "Rate limit exceeded. Please wait before making more requests.",
          retryAfter: Math.ceil((resetTime - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": "20",
            "X-RateLimit-Remaining": remaining.toString(),
            "X-RateLimit-Reset": new Date(resetTime).toISOString(),
            "Retry-After": Math.ceil(
              (resetTime - Date.now()) / 1000,
            ).toString(),
          },
        },
      );
    }

    // Get project from database
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const gitService = getGitService(projectId, project.path, token?.value);
    const status = await gitService.getStatus();

    return NextResponse.json(status);
  } catch (error) {
    console.error("Failed to get git status:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to get status",
      },
      { status: 500 },
    );
  }
}
