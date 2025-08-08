import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyAuth } from '@/middleware/auth';
import { z } from 'zod';

const prisma = new PrismaClient();

const createFolderSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().optional(),
  icon: z.string().optional()
});

// GET all folders for the user
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const folders = await prisma.assistantFolder.findMany({
      where: { userId: user.id },
      include: {
        _count: {
          select: { conversations: true }
        }
      },
      orderBy: [
        { order: 'asc' },
        { name: 'asc' }
      ]
    });

    return NextResponse.json({
      success: true,
      folders: folders.map(folder => ({
        id: folder.id,
        name: folder.name,
        color: folder.color,
        icon: folder.icon,
        conversationCount: folder._count.conversations,
        createdAt: folder.createdAt
      }))
    });
  } catch (error) {
    console.error('Get folders error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get folders' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// POST create new folder
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = createFolderSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid folder data', details: validation.error.errors },
        { status: 400 }
      );
    }

    // Check if folder name already exists for this user
    const existingFolder = await prisma.assistantFolder.findFirst({
      where: {
        userId: user.id,
        name: validation.data.name
      }
    });

    if (existingFolder) {
      return NextResponse.json(
        { success: false, error: 'Folder with this name already exists' },
        { status: 400 }
      );
    }

    // Get the highest order value for the user's folders
    const maxOrderFolder = await prisma.assistantFolder.findFirst({
      where: { userId: user.id },
      orderBy: { order: 'desc' }
    });

    const folder = await prisma.assistantFolder.create({
      data: {
        userId: user.id,
        name: validation.data.name,
        color: validation.data.color || '#3B82F6',
        icon: validation.data.icon || 'folder',
        order: maxOrderFolder ? maxOrderFolder.order + 1 : 0
      }
    });

    return NextResponse.json({
      success: true,
      folder: {
        id: folder.id,
        name: folder.name,
        color: folder.color,
        icon: folder.icon,
        createdAt: folder.createdAt
      }
    });
  } catch (error) {
    console.error('Create folder error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create folder' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}