import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/core/database/prisma";
import { z } from "zod";

const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  dueDate: z.string().datetime().optional(),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  status: z.enum(["pending", "in_progress", "completed"]).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  dueDate: z.string().datetime().optional(),
});

export async function GET(request: NextRequest) {
  try {
    // TODO: Get actual user ID from session
    const userId = "user-123";

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const where: any = { userId };
    if (status) {
      where.status = status;
    }

    const tasks = await prisma.assistantTask.findMany({
      where,
      orderBy: [
        { priority: "desc" },
        { dueDate: "asc" },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json({
      success: true,
      tasks,
    });
  } catch (error) {
    console.error("Get tasks error:", error);
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = createTaskSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid task data", details: validation.error.errors },
        { status: 400 },
      );
    }

    // TODO: Get actual user ID from session
    const userId = "user-123";

    const task = await prisma.assistantTask.create({
      data: {
        ...validation.data,
        userId,
        dueDate: validation.data.dueDate
          ? new Date(validation.data.dueDate)
          : undefined,
      },
    });

    return NextResponse.json({
      success: true,
      task,
    });
  } catch (error) {
    console.error("Create task error:", error);
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get("id");

    if (!taskId) {
      return NextResponse.json(
        { error: "Task ID is required" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const validation = updateTaskSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid update data", details: validation.error.errors },
        { status: 400 },
      );
    }

    // TODO: Get actual user ID from session
    const userId = "user-123";

    const task = await prisma.assistantTask.update({
      where: {
        id: taskId,
        userId,
      },
      data: {
        ...validation.data,
        dueDate: validation.data.dueDate
          ? new Date(validation.data.dueDate)
          : undefined,
        completedAt:
          validation.data.status === "completed" ? new Date() : undefined,
      },
    });

    return NextResponse.json({
      success: true,
      task,
    });
  } catch (error) {
    console.error("Update task error:", error);
    return NextResponse.json(
      { error: "Failed to update task" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get("id");

    if (!taskId) {
      return NextResponse.json(
        { error: "Task ID is required" },
        { status: 400 },
      );
    }

    // TODO: Get actual user ID from session
    const userId = "user-123";

    await prisma.assistantTask.delete({
      where: {
        id: taskId,
        userId,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Task deleted successfully",
    });
  } catch (error) {
    console.error("Delete task error:", error);
    return NextResponse.json(
      { error: "Failed to delete task" },
      { status: 500 },
    );
  }
}
