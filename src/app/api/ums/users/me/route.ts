import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/modules/ums/services/user.service';
import { enhancedUserService } from '@/modules/ums/services/user.service.enhanced';
import { requireAuth } from '@/modules/ums/middleware/auth';
import { developmentConfig } from '@/core/config/development.config';
import { offlineStore } from '@/core/database/offline-store';
import { dbManager } from '@/core/database/connection-manager';

const userService = new UserService();

// GET /api/ums/users/me - Get current user with fallback support
export async function GET(request: NextRequest) {
  try {
    // Check if we're in offline mode first
    if (developmentConfig.enableOfflineMode || offlineStore.isOffline() || !dbManager.isAvailable()) {
      console.log('[API] Running in offline mode, using fallback user data');
      
      // Try to get user from authorization header or cookies
      const authHeader = request.headers.get('authorization');
      const token = authHeader?.replace('Bearer ', '');
      
      // Get mock/cached user
      let user = await offlineStore.getCurrentUser();
      
      if (!user && developmentConfig.enableMockData) {
        // Return mock admin user for development
        user = {
          id: 'admin_user',
          email: 'sankaz@admin.com',
          username: 'sankaz',
          firstName: 'Admin',
          lastName: 'User',
          displayName: 'Administrator',
          avatar: '/api/placeholder/150/150',
          roles: ['admin', 'user'],
          isActive: true,
          createdAt: new Date(),
          profile: {
            timezone: 'Asia/Bangkok',
            language: 'th',
            preferences: {
              theme: 'dark',
              notifications: true
            }
          },
          departments: [
            {
              id: 'dept_admin',
              name: 'Administration',
              code: 'ADMIN',
              position: 'Administrator',
              isPrimary: true
            }
          ],
          teams: [
            {
              id: 'team_platform',
              name: 'Platform Team',
              code: 'PLATFORM',
              role: 'admin'
            }
          ]
        };
      }
      
      if (user) {
        return NextResponse.json({
          success: true,
          user,
          offline: true // Indicate we're in offline mode
        });
      }
    }
    
    // Normal flow with authentication
    const authResult = await requireAuth(request);
    
    // If auth fails but we're in development, use fallback
    if (!authResult.authenticated && developmentConfig.enableMockData) {
      console.log('[API] Auth failed, using development fallback');
      
      const fallbackUser = await enhancedUserService.getCurrentUser();
      if (fallbackUser) {
        return NextResponse.json({
          success: true,
          user: fallbackUser,
          offline: true
        });
      }
    }
    
    if (!authResult.authenticated) {
      return NextResponse.json(
        { success: false, error: authResult.error || 'Not authenticated' },
        { status: 401 }
      );
    }

    // Try to get user with enhanced service (includes caching and fallback)
    let user;
    try {
      user = await enhancedUserService.getUser(authResult.userId!);
    } catch (error) {
      console.error('[API] Enhanced service failed, trying basic service:', error);
      
      // Fallback to basic service
      try {
        user = await userService.getUser(authResult.userId!);
      } catch (basicError) {
        console.error('[API] Basic service also failed:', basicError);
        
        // Last resort: use cached/mock data
        if (developmentConfig.enableDatabaseFallback) {
          user = await enhancedUserService.getCurrentUser();
        } else {
          throw basicError;
        }
      }
    }

    return NextResponse.json({
      success: true,
      user,
      offline: !dbManager.isAvailable() // Indicate database status
    });
  } catch (error: any) {
    console.error('[API] Get current user error:', error);
    
    // In development, always try to return something
    if (process.env.NODE_ENV === 'development') {
      try {
        const fallbackUser = await enhancedUserService.getCurrentUser();
        if (fallbackUser) {
          return NextResponse.json({
            success: true,
            user: fallbackUser,
            offline: true,
            error: 'Database unavailable, using fallback data'
          });
        }
      } catch (fallbackError) {
        console.error('[API] Fallback also failed:', fallbackError);
      }
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to get user',
        offline: !dbManager.isAvailable()
      },
      { status: 400 }
    );
  }
}