import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyAuth } from '@/middleware/auth';
import { z } from 'zod';

const prisma = new PrismaClient();

const updateFolderSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z.string().optional(),
  icon: z.string().optional()
});

// GET specific folder with conversations
export async function GET(
  request: NextRequest,
  { params }: { params: { folderId: string } }
) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const folder = await prisma.assistantFolder.findFirst({
      where: {
        id: params.folderId,
        userId: user.id
      },
      include: {
        conversations: {
          include: {
            _count: {
              select: { messages: true }
            }
          },
          orderBy: { startedAt: 'desc' }
        }
      }
    });

    if (!folder) {
      return NextResponse.json(
        { success: false, error: 'Folder not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      folder: {
        id: folder.id,
        name: folder.name,
        color: folder.color,
        icon: folder.icon,
        conversations: folder.conversations.map(conv => ({
          sessionId: conv.sessionId,
          title: conv.title,
          messageCount: conv._count.messages,
          startedAt: conv.startedAt
        }))
      }
    });
  } catch (error) {
    console.error('Get folder error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get folder' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// PATCH update folder
export async function PATCH(
  request: NextRequest,
  { params }: { params: { folderId: string } }
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
    const validation = updateFolderSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid update data', details: validation.error.errors },
        { status: 400 }
      );
    }

    // Check if folder exists and belongs to user
    const folder = await prisma.assistantFolder.findFirst({
      where: {
        id: params.folderId,
        userId: user.id
      }
    });

    if (!folder) {
      return NextResponse.json(
        { success: false, error: 'Folder not found' },
        { status: 404 }
      );
    }

    // If renaming, check for duplicate name
    if (validation.data.name && validation.data.name !== folder.name) {
      const duplicate = await prisma.assistantFolder.findFirst({
        where: {
          userId: user.id,
          name: validation.data.name,
          id: { not: params.folderId }
        }
      });

      if (duplicate) {
        return NextResponse.json(
          { success: false, error: 'Folder with this name already exists' },
          { status: 400 }
        );
      }
    }

    const updatedFolder = await prisma.assistantFolder.update({
      where: { id: params.folderId },
      data: validation.data
    });

    return NextResponse.json({
      success: true,
      folder: {
        id: updatedFolder.id,
        name: updatedFolder.name,
        color: updatedFolder.color,
        icon: updatedFolder.icon
      }
    });
  } catch (error) {
    console.error('Update folder error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update folder' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// DELETE folder
export async function DELETE(
  request: NextRequest,
  { params }: { params: { folderId: string } }
) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if folder exists and belongs to user
    const folder = await prisma.assistantFolder.findFirst({
      where: {
        id: params.folderId,
        userId: user.id
      }
    });

    if (!folder) {
      return NextResponse.json(
        { success: false, error: 'Folder not found' },
        { status: 404 }
      );
    }

    // Delete folder (conversations will have folderId set to null due to onDelete: SetNull)
    await prisma.assistantFolder.delete({
      where: { id: params.folderId }
    });

    return NextResponse.json({
      success: true,
      message: 'Folder deleted successfully'
    });
  } catch (error) {
    console.error('Delete folder error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete folder' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}