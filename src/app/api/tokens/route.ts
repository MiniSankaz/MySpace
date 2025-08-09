import { NextRequest, NextResponse } from 'next/server';
import { ApiTokenService } from '@/services/api-token.service';
import { authMiddleware } from '@/core/auth/simple-auth';
import { z } from 'zod';

const apiTokenService = new ApiTokenService();

// Validation schemas
const createTokenSchema = z.object({
  name: z.string().min(1).max(100),
  scopes: z.array(z.string()),
  expiresAt: z.string().optional(),
  rateLimit: z.number().min(1).max(10000).optional()
});

/**
 * GET /api/tokens
 * List user's API tokens
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await authMiddleware(request);
    
    if (!authResult.authenticated) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const tokens = await apiTokenService.listTokens(authResult.user.id);

    return NextResponse.json({
      success: true,
      tokens: tokens.map(token => ({
        ...token,
        token: undefined // Never expose hashed token
      }))
    });

  } catch (error: any) {
    console.error('List tokens error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to list tokens' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tokens
 * Create a new API token
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await authMiddleware(request);
    
    if (!authResult.authenticated) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validated = createTokenSchema.parse(body);

    const token = await apiTokenService.createToken({
      userId: authResult.user.id,
      name: validated.name,
      scopes: validated.scopes,
      expiresAt: validated.expiresAt ? new Date(validated.expiresAt) : undefined,
      rateLimit: validated.rateLimit
    });

    return NextResponse.json({
      success: true,
      token: token.token, // Return plain token only on creation
      details: {
        id: token.id,
        name: token.name,
        scopes: token.scopes,
        expiresAt: token.expiresAt,
        createdAt: token.createdAt
      },
      message: 'Save this token securely. You won\'t be able to see it again.'
    });

  } catch (error: any) {
    console.error('Create token error:', error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { 
          error: 'Invalid request',
          details: error.errors 
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to create token' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tokens/[tokenId]
 * Revoke an API token
 */
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await authMiddleware(request);
    
    if (!authResult.authenticated) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const tokenId = searchParams.get('tokenId');
    const reason = searchParams.get('reason');

    if (!tokenId) {
      return NextResponse.json(
        { error: 'Token ID required' },
        { status: 400 }
      );
    }

    await apiTokenService.revokeToken(tokenId, authResult.user.id, reason || undefined);

    return NextResponse.json({
      success: true,
      message: 'Token revoked successfully'
    });

  } catch (error: any) {
    console.error('Revoke token error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to revoke token' },
      { status: 500 }
    );
  }
}