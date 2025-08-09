import { prisma } from '@/core/database/prisma';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

interface CreateTokenParams {
  userId: string;
  name: string;
  scopes: string[];
  expiresAt?: Date;
  rateLimit?: number;
  metadata?: any;
}

interface ValidateTokenResult {
  valid: boolean;
  token?: any;
  user?: any;
  error?: string;
}

export class ApiTokenService {
  private readonly TOKEN_PREFIX = 'sk-live-';
  private readonly TOKEN_LENGTH = 48;

  /**
   * Generate a secure random API token
   */
  private generateToken(): string {
    const randomBytes = crypto.randomBytes(this.TOKEN_LENGTH);
    const token = randomBytes.toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    return `${this.TOKEN_PREFIX}${token}`;
  }

  /**
   * Create a new API token
   */
  async createToken(params: CreateTokenParams) {
    const { userId, name, scopes, expiresAt, rateLimit = 1000, metadata } = params;

    // Generate token
    const plainToken = this.generateToken();
    const hashedToken = await bcrypt.hash(plainToken, 10);
    const tokenPrefix = plainToken.substring(0, 16); // First 16 chars for identification

    // Create token in database
    const apiToken = await prisma.apiToken.create({
      data: {
        userId,
        name,
        token: hashedToken,
        tokenPrefix,
        scopes,
        expiresAt,
        rateLimit,
        metadata,
        isActive: true
      }
    });

    // Return plain token (only shown once)
    return {
      id: apiToken.id,
      token: plainToken,
      name: apiToken.name,
      scopes: apiToken.scopes,
      expiresAt: apiToken.expiresAt,
      createdAt: apiToken.createdAt
    };
  }

  /**
   * Validate an API token
   */
  async validateToken(plainToken: string): Promise<ValidateTokenResult> {
    try {
      // Extract prefix for faster lookup
      const tokenPrefix = plainToken.substring(0, 16);

      // Find tokens with matching prefix
      const tokens = await prisma.apiToken.findMany({
        where: {
          tokenPrefix,
          isActive: true,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ]
        },
        include: {
          User: {
            select: {
              id: true,
              email: true,
              username: true,
              displayName: true,
              isActive: true
            }
          }
        }
      });

      // Check each token
      for (const token of tokens) {
        const isValid = await bcrypt.compare(plainToken, token.token);
        if (isValid) {
          // Check if user is active
          if (!token.User.isActive) {
            return { valid: false, error: 'User account is inactive' };
          }

          // Update last used
          await prisma.apiToken.update({
            where: { id: token.id },
            data: {
              lastUsedAt: new Date(),
              usageCount: { increment: 1 }
            }
          });

          return {
            valid: true,
            token,
            user: token.User
          };
        }
      }

      return { valid: false, error: 'Invalid token' };
    } catch (error) {
      console.error('Token validation error:', error);
      return { valid: false, error: 'Token validation failed' };
    }
  }

  /**
   * Check rate limit for a token
   */
  async checkRateLimit(tokenId: string, limit: number): Promise<boolean> {
    const windowStart = new Date(Date.now() - 60 * 60 * 1000); // 1 hour window

    // Get or create rate limit record
    let rateLimit = await prisma.apiRateLimit.findUnique({
      where: { tokenId }
    });

    if (!rateLimit || rateLimit.windowStart < windowStart) {
      // Create new window
      rateLimit = await prisma.apiRateLimit.upsert({
        where: { tokenId },
        create: {
          tokenId,
          windowStart: new Date(),
          requestCount: 1
        },
        update: {
          windowStart: new Date(),
          requestCount: 1
        }
      });
      return true;
    }

    // Check if limit exceeded
    if (rateLimit.requestCount >= limit) {
      return false;
    }

    // Increment counter
    await prisma.apiRateLimit.update({
      where: { tokenId },
      data: { requestCount: { increment: 1 } }
    });

    return true;
  }

  /**
   * List user's API tokens
   */
  async listTokens(userId: string) {
    const tokens = await prisma.apiToken.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        tokenPrefix: true,
        scopes: true,
        expiresAt: true,
        lastUsedAt: true,
        usageCount: true,
        rateLimit: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            ApiUsageLog: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return tokens.map(token => ({
      ...token,
      totalRequests: token._count.ApiUsageLog
    }));
  }

  /**
   * Revoke an API token
   */
  async revokeToken(tokenId: string, userId: string, reason?: string) {
    const token = await prisma.apiToken.findFirst({
      where: { id: tokenId, userId }
    });

    if (!token) {
      throw new Error('Token not found');
    }

    return await prisma.apiToken.update({
      where: { id: tokenId },
      data: {
        isActive: false,
        revokedAt: new Date(),
        revokedReason: reason
      }
    });
  }

  /**
   * Delete an API token
   */
  async deleteToken(tokenId: string, userId: string) {
    const token = await prisma.apiToken.findFirst({
      where: { id: tokenId, userId }
    });

    if (!token) {
      throw new Error('Token not found');
    }

    return await prisma.apiToken.delete({
      where: { id: tokenId }
    });
  }

  /**
   * Get token statistics
   */
  async getTokenStats(tokenId: string, userId: string) {
    const token = await prisma.apiToken.findFirst({
      where: { id: tokenId, userId }
    });

    if (!token) {
      throw new Error('Token not found');
    }

    // Get usage stats
    const [totalRequests, successfulRequests, failedRequests, avgResponseTime] = await Promise.all([
      prisma.apiUsageLog.count({ where: { tokenId } }),
      prisma.apiUsageLog.count({ where: { tokenId, statusCode: { gte: 200, lt: 300 } } }),
      prisma.apiUsageLog.count({ where: { tokenId, statusCode: { gte: 400 } } }),
      prisma.apiUsageLog.aggregate({
        where: { tokenId },
        _avg: { responseTime: true }
      })
    ]);

    // Get endpoint usage
    const endpointUsage = await prisma.apiUsageLog.groupBy({
      by: ['endpoint', 'method'],
      where: { tokenId },
      _count: true,
      orderBy: { _count: { endpoint: 'desc' } },
      take: 10
    });

    // Get recent logs
    const recentLogs = await prisma.apiUsageLog.findMany({
      where: { tokenId },
      select: {
        id: true,
        endpoint: true,
        method: true,
        statusCode: true,
        responseTime: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    return {
      token: {
        id: token.id,
        name: token.name,
        scopes: token.scopes,
        createdAt: token.createdAt,
        lastUsedAt: token.lastUsedAt,
        expiresAt: token.expiresAt
      },
      stats: {
        totalRequests,
        successfulRequests,
        failedRequests,
        successRate: totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0,
        avgResponseTime: avgResponseTime._avg.responseTime || 0
      },
      endpointUsage,
      recentLogs
    };
  }

  /**
   * Update token scopes
   */
  async updateTokenScopes(tokenId: string, userId: string, scopes: string[]) {
    const token = await prisma.apiToken.findFirst({
      where: { id: tokenId, userId }
    });

    if (!token) {
      throw new Error('Token not found');
    }

    return await prisma.apiToken.update({
      where: { id: tokenId },
      data: { scopes }
    });
  }
}