import { NextRequest } from 'next/server';
import { AuthService } from '../services/auth.service';

const authService = new AuthService();

export interface AuthResult {
  authenticated: boolean;
  userId?: string;
  email?: string;
  username?: string;
  roles?: string[];
  error?: string;
}

export async function verifyAuth(request: NextRequest): Promise<AuthResult> {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { authenticated: false, error: 'No token provided' };
    }

    const token = authHeader.substring(7);
    
    // Verify token
    const payload = await authService.verifyToken(token);
    
    return {
      authenticated: true,
      userId: payload.userId,
      email: payload.email,
      username: payload.username,
      roles: payload.roles
    };
  } catch (error: any) {
    return { 
      authenticated: false, 
      error: error.message || 'Invalid token' 
    };
  }
}

export async function requireAuth(request: NextRequest, requiredRoles?: string[]): Promise<AuthResult> {
  const authResult = await verifyAuth(request);
  
  if (!authResult.authenticated) {
    return authResult;
  }

  // Check required roles if specified
  if (requiredRoles && requiredRoles.length > 0) {
    const hasRequiredRole = requiredRoles.some(role => 
      authResult.roles?.includes(role)
    );
    
    if (!hasRequiredRole) {
      return {
        authenticated: false,
        error: 'Insufficient permissions'
      };
    }
  }

  return authResult;
}