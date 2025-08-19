import { NextRequest, NextResponse } from "next/server";
import { projectService } from "@/modules/workspace/services/project.service";

export async function GET() {
  try {
    const projects = await projectService.getProjects();
    return NextResponse.json(projects);
  } catch (error) {
    console.error("Failed to fetch projects:", error);
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // Validate required fields
    if (!data.name || !data.path) {
      return NextResponse.json(
        { error: "Name and path are required" },
        { status: 400 },
      );
    }

    const project = await projectService.createProject(data);
    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error("Failed to create project:", error);
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 },
    );
  }
}
