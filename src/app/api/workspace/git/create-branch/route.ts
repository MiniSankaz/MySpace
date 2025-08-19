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
    const { projectId, branchName, baseBranch, checkout = true } = body;

    if (!projectId || !branchName) {
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
    await gitService.createBranch(branchName, baseBranch, checkout);

    return NextResponse.json({
      success: true,
      message: `Created branch ${branchName}`,
      branch: branchName,
      checkedOut: checkout,
    });
  } catch (error) {
    console.error("Failed to create branch:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create branch",
      },
      { status: 500 },
    );
  }
}
