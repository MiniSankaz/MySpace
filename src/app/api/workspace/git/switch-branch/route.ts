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
    const { projectId, branch } = body;

    if (!projectId || !branch) {
      return NextResponse.json(
        { error: "Project ID and branch name required" },
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
    await gitService.switchBranch(branch);

    return NextResponse.json({
      success: true,
      message: `Switched to branch ${branch}`,
      branch,
    });
  } catch (error) {
    console.error("Failed to switch branch:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to switch branch",
      },
      { status: 500 },
    );
  }
}
