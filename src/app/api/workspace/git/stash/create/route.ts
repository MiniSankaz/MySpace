import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getGitService } from "@/services/git.service";
import { prisma } from "@/core/database/prisma";

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("accessToken");

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { projectId, message, includeUntracked = true } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: "Project ID required" },
        { status: 400 },
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
    await gitService.stash(message, includeUntracked);

    return NextResponse.json({
      success: true,
      message: message ? `Created stash: ${message}` : "Created stash",
    });
  } catch (error) {
    console.error("Failed to create stash:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create stash",
      },
      { status: 500 },
    );
  }
}
