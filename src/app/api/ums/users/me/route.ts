import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/modules/ums/services/user.service';
import { requireAuth } from '@/modules/ums/middleware/auth';

const userService = new UserService();

// GET /api/ums/users/me - Get current user
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await requireAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: 401 }
      );
    }

    const user = await userService.getUser(authResult.userId!);

    return NextResponse.json({
      success: true,
      user
    });
  } catch (error: any) {
    console.error('Get current user error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to get user' 
      },
      { status: 400 }
    );
  }
}