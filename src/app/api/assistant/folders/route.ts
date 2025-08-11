import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyAuth } from '@/middleware/auth';
import { z } from 'zod';
import { cacheManager } from '@/core/database/cache-manager';

const prisma = new PrismaClient();

// Cache TTL constants
const FOLDERS_CACHE_TTL = 2 * 60 * 1000; // 2 minutes
const DB_TIMEOUT = 5000; // 5 seconds

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

    // Generate cache key for user folders
    const cacheKey = `folders:${user.id}`;
    
    try {
      // Use cache with timeout handling
      const folders = await cacheManager.withCacheAndTimeout(
        cacheKey,
        async () => {
          console.log(`[Folders] Loading folders for user ${user.id}`);
          return await prisma.assistantFolder.findMany({
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
        },
        {
          ttl: FOLDERS_CACHE_TTL,
          timeout: DB_TIMEOUT,
          fallbackValue: [] // Return empty folders if timeout
        }
      );

      return NextResponse.json({
        success: true,
        folders: folders.map(folder => ({
          id: folder.id,
          name: folder.name,
          color: folder.color,
          icon: folder.icon,
          conversationCount: folder._count.conversations,
          createdAt: folder.createdAt
        })),
        cached: folders.length > 0 && cacheManager.get(cacheKey) !== null // Indicate if from cache
      });
    } catch (cacheError) {
      console.error('[Folders] Cache operation failed:', cacheError);
      
      // Return empty folders with warning if cache fails
      return NextResponse.json({
        success: true,
        folders: [],
        warning: 'Database unavailable, showing cached or empty data'
      });
    }
  } catch (error) {
    console.error('Get folders error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get folders' },
      { status: 500 }
    );
  } finally {
    try {
      await prisma.$disconnect();
    } catch (disconnectError) {
      console.error('Prisma disconnect error:', disconnectError);
    }
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

    try {
      // Check if folder name already exists for this user with timeout
      const existingFolder = await cacheManager.withCacheAndTimeout(
        `folder:exists:${user.id}:${validation.data.name}`,
        async () => {
          return await prisma.assistantFolder.findFirst({
            where: {
              userId: user.id,
              name: validation.data.name
            }
          });
        },
        {
          ttl: 30000, // Short TTL for existence check
          timeout: DB_TIMEOUT,
          fallbackValue: null,
          skipCache: true // Always check fresh for creates
        }
      );

      if (existingFolder) {
        return NextResponse.json(
          { success: false, error: 'Folder with this name already exists' },
          { status: 400 }
        );
      }

      // Get the highest order value for the user's folders with timeout
      const maxOrderFolder = await cacheManager.withCacheAndTimeout(
        `folder:maxorder:${user.id}`,
        async () => {
          return await prisma.assistantFolder.findFirst({
            where: { userId: user.id },
            orderBy: { order: 'desc' }
          });
        },
        {
          ttl: 30000, // Short TTL for order check
          timeout: DB_TIMEOUT,
          fallbackValue: null,
          skipCache: true // Always check fresh for creates
        }
      );

      // Create folder with timeout
      const folder = await cacheManager.withCacheAndTimeout(
        `folder:create:${Date.now()}`,
        async () => {
          return await prisma.assistantFolder.create({
            data: {
              userId: user.id,
              name: validation.data.name,
              color: validation.data.color || '#3B82F6',
              icon: validation.data.icon || 'folder',
              order: maxOrderFolder ? maxOrderFolder.order + 1 : 0
            }
          });
        },
        {
          timeout: DB_TIMEOUT,
          skipCache: true // Don't cache creates
        }
      );

      // Clear folders cache after successful create
      cacheManager.clearByPattern(`folders:${user.id}`);
      
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
    } catch (dbError) {
      console.error('[Folders] Database operation failed:', dbError);
      return NextResponse.json(
        { success: false, error: 'Database unavailable, please try again later' },
        { status: 503 } // Service unavailable
      );
    }
  } catch (error) {
    console.error('Create folder error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create folder' },
      { status: 500 }
    );
  } finally {
    try {
      await prisma.$disconnect();
    } catch (disconnectError) {
      console.error('Prisma disconnect error:', disconnectError);
    }
  }
}