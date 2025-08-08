import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { UserService } from '@/modules/ums/services/user.service';
import { requireAuth } from '@/modules/ums/middleware/auth';

const userService = new UserService();

const updateUserSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  displayName: z.string().optional(),
  phone: z.string().optional(),
  bio: z.string().optional(),
  avatar: z.string().optional()
});

// GET /api/ums/users/[userId] - Get user details
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // Verify authentication
    const authResult = await requireAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: 401 }
      );
    }

    // Users can only get their own data unless they're admin
    if (params.userId !== authResult.userId && !authResult.roles?.includes('admin')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    const user = await userService.getUser(params.userId);

    return NextResponse.json({
      success: true,
      user
    });
  } catch (error: any) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to get user' 
      },
      { status: 400 }
    );
  }
}

// PUT /api/ums/users/[userId] - Update user
export async function PUT(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // Verify authentication
    const authResult = await requireAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: 401 }
      );
    }

    // Users can only update their own data unless they're admin
    if (params.userId !== authResult.userId && !authResult.roles?.includes('admin')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const data = updateUserSchema.parse(body);

    const user = await userService.updateUser(params.userId, data);

    return NextResponse.json({
      success: true,
      user
    });
  } catch (error: any) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to update user' 
      },
      { status: 400 }
    );
  }
}

// DELETE /api/ums/users/[userId] - Delete user
export async function DELETE(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // Verify authentication - only admins can delete users
    const authResult = await requireAuth(request, ['admin']);
    if (!authResult.authenticated) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: 401 }
      );
    }

    await userService.deleteUser(params.userId, authResult.userId);

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error: any) {
    console.error('Delete user error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to delete user' 
      },
      { status: 400 }
    );
  }
}