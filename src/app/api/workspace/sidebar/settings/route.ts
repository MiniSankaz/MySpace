import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/core/database/prisma';
import jwt from 'jsonwebtoken';

async function getUserFromToken(token: string) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any;
    return decoded.userId;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('accessToken');
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = await getUserFromToken(token.value);
    if (!userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    // Get user sidebar settings
    let settings = await prisma.userSidebarSettings.findUnique({
      where: { userId },
    });
    
    // Create default settings if not exists
    if (!settings) {
      settings = await prisma.userSidebarSettings.create({
        data: {
          userId,
          isCollapsed: false,
          width: 250,
          sortBy: 'lastAccessed',
          viewMode: 'icons',
          showStatusIndicators: true,
        },
      });
    }
    
    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Failed to get sidebar settings:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get settings' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('accessToken');
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = await getUserFromToken(token.value);
    if (!userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    const body = await request.json();
    
    // Update or create sidebar settings
    const settings = await prisma.userSidebarSettings.upsert({
      where: { userId },
      update: {
        ...body,
        updatedAt: new Date(),
      },
      create: {
        userId,
        ...body,
      },
    });
    
    return NextResponse.json({ 
      success: true,
      settings,
    });
  } catch (error) {
    console.error('Failed to update sidebar settings:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update settings' },
      { status: 500 }
    );
  }
}