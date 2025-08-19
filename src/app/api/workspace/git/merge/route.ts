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
    const { projectId, sourceBranch, targetBranch } = body;

    if (!projectId || !sourceBranch) {
      return NextResponse.json(
        { error: "Project ID and source branch required" },
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

    // If target branch specified, switch to it first
    if (targetBranch) {
      await gitService.switchBranch(targetBranch);
    }

    await gitService.mergeBranch(sourceBranch);

    return NextResponse.json({
      success: true,
      message: `Merged ${sourceBranch} into ${targetBranch || "current branch"}`,
      sourceBranch,
      targetBranch,
    });
  } catch (error) {
    console.error("Failed to merge branch:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to merge branch",
      },
      { status: 500 },
    );
  }
}
