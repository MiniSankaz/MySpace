import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// Security headers
const securityHeaders = {
  'X-DNS-Prefetch-Control': 'on',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-XSS-Protection': '1; mode=block',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

// Public routes that don't require authentication
const publicRoutes = [
  '/login',
  '/register', 
  '/api/ums/auth/login',
  '/api/ums/auth/register',
  '/api/health',
  '/api/terminal', // Allow all terminal API routes for now (development)
  '/favicon.ico',
  '/api/dashboard/stats', // Allow dashboard stats endpoint to handle auth internally
  '/api/settings/user', // Allow settings API to handle auth internally
  // Temporarily allow workspace API for testing
  '/api/workspace/files',
];

// Admin-only routes
const adminRoutes = [
  '/admin',
  // Note: /terminal and /api/terminal are for authenticated users, not just admins
];

// Rate limiting store (in production, use Redis)
const requestCounts = new Map<string, { count: number; resetTime: number }>();

function getRateLimitKey(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : 'unknown';
  return `${ip}-${request.nextUrl.pathname}`;
}

function checkRateLimit(request: NextRequest): boolean {
  const key = getRateLimitKey(request);
  const now = Date.now();
  const limit = 60; // requests per minute
  const window = 60000; // 1 minute
  
  const record = requestCounts.get(key);
  
  if (!record || record.resetTime < now) {
    requestCounts.set(key, { count: 1, resetTime: now + window });
    return true;
  }
  
  if (record.count >= limit) {
    return false;
  }
  
  record.count++;
  return true;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // In development, redirect localhost to 127.0.0.1 to fix WebSocket issues
  if (process.env.NODE_ENV === 'development') {
    const host = request.headers.get('host');
    if (host && host.startsWith('localhost:')) {
      const url = request.nextUrl.clone();
      url.hostname = '127.0.0.1';
      return NextResponse.redirect(url);
    }
  }
  
  // Check if route is public or static resource
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route)) ||
                       pathname.startsWith('/_next') ||
                       pathname.includes('.') ||
                       pathname === '/';
  
  // Apply security headers for response
  let response = NextResponse.next();
  
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  // CORS for API routes
  if (request.nextUrl.pathname.startsWith('/api')) {
    const origin = request.headers.get('origin');
    const allowedOrigins = [
      process.env.NEXT_PUBLIC_APP_URL || 'http://127.0.0.1:4000',
      'http://localhost:3000',
      'http://127.0.0.1:4000',
    ];
    
    if (origin && allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      response.headers.set('Access-Control-Allow-Credentials', 'true');
    }
    
    // Rate limiting for API routes
    if (!checkRateLimit(request)) {
      return new NextResponse('Too Many Requests', {
        status: 429,
        headers: {
          'Retry-After': '60',
          'X-RateLimit-Limit': '60',
          'X-RateLimit-Remaining': '0',
        },
      });
    }
  }
  
  // Authentication check for protected routes
  if (!isPublicRoute) {
    // Get token from cookie or Authorization header
    const token = request.cookies.get('accessToken')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      // Redirect to login for web pages
      if (!pathname.startsWith('/api/')) {
        return NextResponse.redirect(new URL('/login', request.url));
      }
      // Return 401 for API routes
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    try {
      // Verify token
      const secret = new TextEncoder().encode(
        process.env.JWT_SECRET || 'your-secret-key'
      );
      
      // Debug token format
      if (pathname.startsWith('/api/terminal/')) {
        console.log('[Middleware] Terminal route, token length:', token?.length);
      }
      
      const { payload } = await jwtVerify(token, secret);
      
      // Check admin routes
      const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route));
      if (isAdminRoute) {
        const roles = (payload.roles as string[]) || [];
        if (!roles.includes('admin')) {
          if (!pathname.startsWith('/api/')) {
            return NextResponse.redirect(new URL('/dashboard', request.url));
          }
          return NextResponse.json(
            { error: 'Admin access required' },
            { status: 403 }
          );
        }
      }

      // Add user info to headers for downstream use
      response.headers.set('x-user-id', payload.userId as string || '');
      response.headers.set('x-user-email', payload.email as string || '');
      response.headers.set('x-user-roles', JSON.stringify(payload.roles || []));
    } catch (error) {
      console.error('Token verification failed:', error);
      
      // Clear invalid token and redirect
      response = !pathname.startsWith('/api/')
        ? NextResponse.redirect(new URL('/login', request.url))
        : NextResponse.json({ error: 'Invalid token' }, { status: 401 });
      
      response.cookies.delete('accessToken');
      return response;
    }
  }
  
  // Clean up old rate limit records periodically
  if (Math.random() < 0.01) { // 1% chance on each request
    const now = Date.now();
    requestCounts.forEach((value, key) => {
      if (value.resetTime < now) {
        requestCounts.delete(key);
      }
    });
  }
  
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};