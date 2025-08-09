import { prisma } from '@/core/database/prisma';

interface LogUsageParams {
  tokenId: string;
  userId: string;
  endpoint: string;
  method: string;
  statusCode: number;
  requestBody?: any;
  responseBody?: any;
  responseTime: number;
  ipAddress: string;
  userAgent?: string;
  errorMessage?: string;
  metadata?: any;
}

interface UsageStats {
  daily: any[];
  hourly: any[];
  endpoints: any[];
  statusCodes: any[];
  totalRequests: number;
  successRate: number;
  avgResponseTime: number;
}

export class ApiUsageService {
  /**
   * Log API usage
   */
  async logUsage(params: LogUsageParams) {
    const {
      tokenId,
      userId,
      endpoint,
      method,
      statusCode,
      requestBody,
      responseBody,
      responseTime,
      ipAddress,
      userAgent,
      errorMessage,
      metadata
    } = params;

    // Sanitize request/response bodies
    const sanitizedRequestBody = this.sanitizeBody(requestBody);
    const sanitizedResponseBody = this.sanitizeBody(responseBody);

    // Update last used IP for token
    await prisma.apiToken.update({
      where: { id: tokenId },
      data: { lastUsedIp: ipAddress }
    });

    // Create usage log
    return await prisma.apiUsageLog.create({
      data: {
        tokenId,
        userId,
        endpoint,
        method,
        statusCode,
        requestBody: sanitizedRequestBody,
        responseBody: sanitizedResponseBody,
        responseTime,
        ipAddress,
        userAgent,
        errorMessage,
        metadata
      }
    });
  }

  /**
   * Sanitize request/response body
   */
  private sanitizeBody(body: any): any {
    if (!body) return null;

    try {
      const sanitized = JSON.parse(JSON.stringify(body));
      
      // Remove sensitive fields
      const sensitiveFields = [
        'password',
        'token',
        'secret',
        'apiKey',
        'apiSecret',
        'authorization',
        'creditCard',
        'ssn',
        'bankAccount'
      ];

      const removeSensitive = (obj: any) => {
        if (typeof obj !== 'object' || obj === null) return obj;

        for (const key in obj) {
          const lowerKey = key.toLowerCase();
          if (sensitiveFields.some(field => lowerKey.includes(field.toLowerCase()))) {
            obj[key] = '[REDACTED]';
          } else if (typeof obj[key] === 'object') {
            removeSensitive(obj[key]);
          }
        }
        return obj;
      };

      return removeSensitive(sanitized);
    } catch (error) {
      return null;
    }
  }

  /**
   * Get usage statistics
   */
  async getUsageStats(userId: string, tokenId?: string, days: number = 30): Promise<UsageStats> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    const where = {
      userId,
      ...(tokenId && { tokenId }),
      createdAt: { gte: startDate }
    };

    // Get total stats
    const [totalRequests, successfulRequests, avgResponseTime] = await Promise.all([
      prisma.apiUsageLog.count({ where }),
      prisma.apiUsageLog.count({ 
        where: { ...where, statusCode: { gte: 200, lt: 300 } } 
      }),
      prisma.apiUsageLog.aggregate({
        where,
        _avg: { responseTime: true }
      })
    ]);

    // Get daily usage
    const dailyUsage = await prisma.$queryRaw`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as requests,
        AVG(response_time) as avg_response_time,
        COUNT(CASE WHEN status_code >= 200 AND status_code < 300 THEN 1 END) as successful
      FROM "ApiUsageLog"
      WHERE user_id = ${userId}
        ${tokenId ? prisma.$queryRaw`AND token_id = ${tokenId}` : prisma.$queryRaw``}
        AND created_at >= ${startDate}
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `;

    // Get hourly usage for last 24 hours
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const hourlyUsage = await prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('hour', created_at) as hour,
        COUNT(*) as requests,
        AVG(response_time) as avg_response_time
      FROM "ApiUsageLog"
      WHERE user_id = ${userId}
        ${tokenId ? prisma.$queryRaw`AND token_id = ${tokenId}` : prisma.$queryRaw``}
        AND created_at >= ${last24Hours}
      GROUP BY DATE_TRUNC('hour', created_at)
      ORDER BY hour DESC
    `;

    // Get endpoint usage
    const endpointUsage = await prisma.apiUsageLog.groupBy({
      by: ['endpoint', 'method'],
      where,
      _count: true,
      _avg: { responseTime: true },
      orderBy: { _count: { endpoint: 'desc' } },
      take: 20
    });

    // Get status code distribution
    const statusCodeDist = await prisma.apiUsageLog.groupBy({
      by: ['statusCode'],
      where,
      _count: true,
      orderBy: { statusCode: 'asc' }
    });

    return {
      daily: dailyUsage as any[],
      hourly: hourlyUsage as any[],
      endpoints: endpointUsage.map(e => ({
        endpoint: e.endpoint,
        method: e.method,
        count: e._count,
        avgResponseTime: e._avg.responseTime
      })),
      statusCodes: statusCodeDist.map(s => ({
        statusCode: s.statusCode,
        count: s._count
      })),
      totalRequests,
      successRate: totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0,
      avgResponseTime: avgResponseTime._avg.responseTime || 0
    };
  }

  /**
   * Get recent API logs
   */
  async getRecentLogs(userId: string, tokenId?: string, limit: number = 100) {
    return await prisma.apiUsageLog.findMany({
      where: {
        userId,
        ...(tokenId && { tokenId })
      },
      select: {
        id: true,
        endpoint: true,
        method: true,
        statusCode: true,
        responseTime: true,
        ipAddress: true,
        userAgent: true,
        errorMessage: true,
        createdAt: true,
        ApiToken: {
          select: {
            name: true,
            tokenPrefix: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  }

  /**
   * Get detailed log
   */
  async getLogDetails(logId: string, userId: string) {
    return await prisma.apiUsageLog.findFirst({
      where: {
        id: logId,
        userId
      },
      include: {
        ApiToken: {
          select: {
            name: true,
            tokenPrefix: true,
            scopes: true
          }
        }
      }
    });
  }

  /**
   * Clean old logs
   */
  async cleanOldLogs(daysToKeep: number = 90) {
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
    
    const result = await prisma.apiUsageLog.deleteMany({
      where: {
        createdAt: { lt: cutoffDate }
      }
    });

    return result.count;
  }

  /**
   * Get usage by IP address
   */
  async getUsageByIP(userId: string, days: number = 7) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const ipUsage = await prisma.apiUsageLog.groupBy({
      by: ['ipAddress'],
      where: {
        userId,
        createdAt: { gte: startDate }
      },
      _count: true,
      orderBy: { _count: { ipAddress: 'desc' } },
      take: 20
    });

    return ipUsage.map(ip => ({
      ipAddress: ip.ipAddress,
      requests: ip._count
    }));
  }

  /**
   * Detect suspicious activity
   */
  async detectSuspiciousActivity(userId: string) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    // Check for high error rates
    const [totalRequests, failedRequests] = await Promise.all([
      prisma.apiUsageLog.count({
        where: {
          userId,
          createdAt: { gte: oneHourAgo }
        }
      }),
      prisma.apiUsageLog.count({
        where: {
          userId,
          createdAt: { gte: oneHourAgo },
          statusCode: { gte: 400 }
        }
      })
    ]);

    const errorRate = totalRequests > 0 ? (failedRequests / totalRequests) * 100 : 0;

    // Check for unusual IP activity
    const ipActivity = await prisma.apiUsageLog.groupBy({
      by: ['ipAddress'],
      where: {
        userId,
        createdAt: { gte: oneHourAgo }
      },
      _count: true
    });

    const suspiciousIPs = ipActivity.filter(ip => ip._count > 100);

    return {
      highErrorRate: errorRate > 50,
      errorRate,
      suspiciousIPs,
      totalRequests,
      failedRequests
    };
  }
}