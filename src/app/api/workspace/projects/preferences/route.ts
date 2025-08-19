import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/core/database/prisma";
import jwt from "jsonwebtoken";

async function getUserFromToken(token: string) {
  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "secret",
    ) as any;
    return decoded.userId;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("accessToken");

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = await getUserFromToken(token.value);
    if (!userId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Get all project preferences for the user
    const preferences = await prisma.projectPreferences.findMany({
      where: { userId },
      include: {
        Project: {
          select: {
            id: true,
            name: true,
            description: true,
            path: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
      orderBy: [{ isPinned: "desc" }, { lastAccessedAt: "desc" }],
    });

    // Get projects without preferences
    const projectIds = preferences.map((p) => p.projectId);
    const allProjects = await prisma.project.findMany({
      where: {
        id: {
          notIn: projectIds,
        },
      },
      select: {
        id: true,
        name: true,
        description: true,
        path: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Combine and format response
    const formattedPreferences = preferences.map((pref) => ({
      ...pref.Project,
      preferences: {
        isPinned: pref.isPinned,
        customIcon: pref.customIcon,
        customColor: pref.customColor,
        sortOrder: pref.sortOrder,
        lastAccessedAt: pref.lastAccessedAt,
      },
    }));

    const formattedProjects = allProjects.map((project) => ({
      ...project,
      preferences: {
        isPinned: false,
        customIcon: null,
        customColor: null,
        sortOrder: 0,
        lastAccessedAt: project.createdAt,
      },
    }));

    return NextResponse.json({
      projects: [...formattedPreferences, ...formattedProjects],
    });
  } catch (error) {
    console.error("Failed to get project preferences:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to get preferences",
      },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("accessToken");

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = await getUserFromToken(token.value);
    if (!userId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const body = await request.json();
    const { projectId, ...preferences } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: "Project ID required" },
        { status: 400 },
      );
    }

    // Upsert project preferences
    const updated = await prisma.projectPreferences.upsert({
      where: {
        userId_projectId: {
          userId,
          projectId,
        },
      },
      update: {
        ...preferences,
        updatedAt: new Date(),
      },
      create: {
        userId,
        projectId,
        ...preferences,
      },
    });

    return NextResponse.json({
      success: true,
      preferences: updated,
    });
  } catch (error) {
    console.error("Failed to update project preferences:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update preferences",
      },
      { status: 500 },
    );
  }
}
