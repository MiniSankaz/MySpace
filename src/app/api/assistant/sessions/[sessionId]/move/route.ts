import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { verifyAuth } from "@/middleware/auth";
import { z } from "zod";

const prisma = new PrismaClient();

const moveSchema = z.object({
  folderId: z.string().nullable(), // null means move to root (no folder)
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    // Await params as required in Next.js 15
    const { sessionId } = await params;

    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const validation = moveSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request data",
          details: validation.error.errors,
        },
        { status: 400 },
      );
    }

    // Check if session exists and belongs to user
    const session = await prisma.assistantChatSession.findFirst({
      where: {
        id: sessionId,
        userId: user.id,
      },
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Session not found" },
        { status: 404 },
      );
    }

    // If moving to a folder, verify it exists and belongs to user
    if (validation.data.folderId) {
      const folder = await prisma.assistantFolder.findFirst({
        where: {
          id: validation.data.folderId,
          userId: user.id,
        },
      });

      if (!folder) {
        return NextResponse.json(
          { success: false, error: "Folder not found" },
          { status: 404 },
        );
      }
    }

    // Note: AssistantChatSession doesn't have folderId field yet
    // This functionality needs to be implemented by adding folderId to the schema
    return NextResponse.json(
      {
        success: false,
        error: "Folder functionality not yet implemented for new chat sessions",
      },
      { status: 501 },
    );
  } catch (error) {
    console.error("Move conversation error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to move conversation" },
      { status: 500 },
    );
  } finally {
    await prisma.$disconnect();
  }
}
