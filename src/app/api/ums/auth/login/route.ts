import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthService } from '@/modules/ums/services/auth.service';

const loginSchema = z.object({
  emailOrUsername: z.string().min(1),
  password: z.string().min(1)
});

const authService = new AuthService();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { emailOrUsername, password } = loginSchema.parse(body);

    // Get IP and user agent
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || undefined;

    const result = await authService.login({
      emailOrUsername,
      password,
      ipAddress,
      userAgent
    });

    // Set cookies for tokens
    const response = NextResponse.json({
      success: true,
      user: result.user,
      tokens: {
        accessToken: result.tokens.accessToken,
        expiresIn: result.tokens.expiresIn
      }
    });

    // Set refresh token as httpOnly cookie
    response.cookies.set('refreshToken', result.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 // 7 days
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