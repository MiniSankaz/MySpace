import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyAuth } from '@/middleware/auth';

const prisma = new PrismaClient();

export async function DELETE(request: NextRequest) {
  try {
    // Verify authentication
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Authentication required' 
        },
        { status: 401 }
      );
    }

    // Delete all sessions for the authenticated user
    const result = await prisma.assistantConversation.deleteMany({
      where: {
        userId: user.id
      }
    });

    return NextResponse.json({
      success: true,
      message: `Deleted ${result.count} sessions`,
      deletedCount: result.count
    });
  } catch (error) {
    console.error('Clear all sessions error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to clear sessions' 
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}