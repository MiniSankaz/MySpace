import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyAuth } from '@/middleware/auth';
import { z } from 'zod';

const prisma = new PrismaClient();

const moveSchema = z.object({
  folderId: z.string().nullable() // null means move to root (no folder)
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = moveSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: validation.error.errors },
        { status: 400 }
      );
    }

    // Check if conversation exists and belongs to user
    const conversation = await prisma.assistantConversation.findFirst({
      where: {
        sessionId: params.sessionId,
        userId: user.id
      }
    });

    if (!conversation) {
      return NextResponse.json(
        { success: false, error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // If moving to a folder, verify it exists and belongs to user
    if (validation.data.folderId) {
      const folder = await prisma.assistantFolder.findFirst({
        where: {
          id: validation.data.folderId,
          userId: user.id
        }
      });

      if (!folder) {
        return NextResponse.json(
          { success: false, error: 'Folder not found' },
          { status: 404 }
        );
      }
    }

    // Update conversation's folder
    await prisma.assistantConversation.update({
      where: { id: conversation.id },
      data: { folderId: validation.data.folderId }
    });

    return NextResponse.json({
      success: true,
      message: validation.data.folderId 
        ? 'Conversation moved to folder' 
        : 'Conversation moved to root'
    });
  } catch (error) {
    console.error('Move conversation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to move conversation' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}