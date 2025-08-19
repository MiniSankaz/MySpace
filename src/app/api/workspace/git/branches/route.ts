import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getGitService } from "@/services/git.service";
import { prisma } from "@/core/database/prisma";
import { gitBranchesRateLimiter } from "@/lib/rate-limiter";

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    // Fix: Use correct cookie name 'accessToken' instead of 'auth-token'
    const token = cookieStore.get("accessToken");

    if (!token) {
      // Also check Authorization header as fallback
      const authHeader = request.headers.get("authorization");
      if (!authHeader) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json(
        { error: "Project ID required" },
        { status: 400 },
      );
    }

    // Check rate limit
    const rateLimitKey = `git-branches-${projectId}`;
    const { allowed, remaining, resetTime } =
      gitBranchesRateLimiter.check(rateLimitKey);

    if (!allowed) {
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
    const branches = await gitService.getBranches();

    return NextResponse.json({ branches });
  } catch (error) {
    console.error("Failed to get branches:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to get branches",
      },
      { status: 500 },
    );
  }
}
