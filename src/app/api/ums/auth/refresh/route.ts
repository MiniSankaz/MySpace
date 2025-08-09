import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthService } from '@/modules/ums/services/auth.service';

const refreshSchema = z.object({
  refreshToken: z.string().min(1)
});

const authService = new AuthService();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { refreshToken } = refreshSchema.parse(body);

    const result = await authService.refreshTokens(refreshToken);

    // Set cookies for new tokens
    const response = NextResponse.json({
      success: true,
      tokens: {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresIn: result.expiresIn
      }
    });

    // Update refresh token cookie
    const maxAge = result.expiresIn === -1 ? 10 * 365 * 24 * 60 * 60 : 7 * 24 * 60 * 60;
    response.cookies.set('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge
    });

    return response;
  } catch (error: any) {
    console.error('Token refresh error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Token refresh failed' 
      },
      { status: 401 }
    );
  }
}