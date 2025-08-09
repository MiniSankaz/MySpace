import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthService } from '@/modules/ums/services/auth.service';

const loginSchema = z.object({
  emailOrUsername: z.string().min(1),
  password: z.string().min(1),
  rememberMe: z.boolean().optional()
});

const authService = new AuthService();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { emailOrUsername, password, rememberMe } = loginSchema.parse(body);

    // Get IP and user agent
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || undefined;

    const result = await authService.login({
      emailOrUsername,
      password,
      ipAddress,
      userAgent,
      rememberMe
    });

    // Set cookies for tokens
    const response = NextResponse.json({
      success: true,
      user: result.user,
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
      expiresIn: result.tokens.expiresIn,
      tokens: {
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken,
        expiresIn: result.tokens.expiresIn
      }
    });

    // Set refresh token as httpOnly cookie
    // If expiresIn is -1 (never expire), set maxAge to 10 years
    const maxAge = result.tokens.expiresIn === -1 ? 10 * 365 * 24 * 60 * 60 : 7 * 24 * 60 * 60;
    response.cookies.set('refreshToken', result.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge
    });
    
    // Also set access token as cookie for SSR
    response.cookies.set('accessToken', result.tokens.accessToken, {
      httpOnly: false, // Allow client-side access
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: result.tokens.expiresIn === -1 ? 10 * 365 * 24 * 60 * 60 : result.tokens.expiresIn
    });

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Login failed' 
      },
      { status: 401 }
    );
  }
}