/**
 * Usage Monitoring Service
 * Tracks and enforces Fair Use Policy limits
 */

import { prisma } from "../lib/prisma";
import { logger } from "../utils/logger";

export interface UsageStats {
  userId: string;
  requestsToday: number;
  requestsThisHour: number;
  requestsThisMinute: number;
  tokensToday: number;
  lastRequestTime: Date;
  isWithinLimits: boolean;
}

export interface UsageLimits {
  perMinute: number;
  perHour: number;
  perDay: number;
  tokensPerDay: number;
  concurrentSessions: number;
}

export class UsageMonitorService {
  private readonly limits: UsageLimits = {
    perMinute: 5,
    perHour: 50,
    perDay: 500,
    tokensPerDay: 100000,
    concurrentSessions: 10,
  };

  private userUsage: Map<string, UsageStats> = new Map();
  private activeSessions: Set<string> = new Set();

  constructor() {
    logger.info("Usage Monitor Service initialized");
    this.startUsageReset();
  }

  /**
   * Check if user is within usage limits
   */
  async checkUsageLimits(userId: string): Promise<{
    allowed: boolean;
    reason?: string;
    stats: UsageStats;
  }> {
    const stats = await this.getUserStats(userId);

    // Check per-minute limit
    if (stats.requestsThisMinute >= this.limits.perMinute) {
      return {
        allowed: false,
        reason: `Rate limit exceeded: ${this.limits.perMinute} requests per minute`,
        stats,
      };
    }

    // Check per-hour limit
    if (stats.requestsThisHour >= this.limits.perHour) {
      return {
        allowed: false,
        reason: `Rate limit exceeded: ${this.limits.perHour} requests per hour`,
        stats,
      };
    }

    // Check per-day limit
    if (stats.requestsToday >= this.limits.perDay) {
      return {
        allowed: false,
        reason: `Daily limit exceeded: ${this.limits.perDay} requests per day`,
        stats,
      };
    }

    // Check token limit
    if (stats.tokensToday >= this.limits.tokensPerDay) {
      return {
        allowed: false,
        reason: `Token limit exceeded: ${this.limits.tokensPerDay} tokens per day`,
        stats,
      };
    }

    // Check concurrent sessions
    if (this.activeSessions.size >= this.limits.concurrentSessions) {
      return {
        allowed: false,
        reason: `Concurrent session limit exceeded: ${this.limits.concurrentSessions} sessions`,
        stats,
      };
    }

    return {
      allowed: true,
      stats,
    };
  }

  /**
   * Record usage for a user
   */
  async recordUsage(
    userId: string,
    inputTokens: number,
    outputTokens: number,
    sessionId: string,
  ): Promise<void> {
    try {
      const now = new Date();
      const stats = await this.getUserStats(userId);

      // Update in-memory stats
      stats.requestsThisMinute++;
      stats.requestsThisHour++;
      stats.requestsToday++;
      stats.tokensToday += inputTokens + outputTokens;
      stats.lastRequestTime = now;

      this.userUsage.set(userId, stats);

      // Record in database for persistence
      await prisma.$executeRaw`
        INSERT INTO usage_tracking (
          user_id,
          session_id,
          input_tokens,
          output_tokens,
          timestamp
        ) VALUES (
          ${userId},
          ${sessionId},
          ${inputTokens},
          ${outputTokens},
          ${now}
        )
      `;

      // Add to active sessions
      this.activeSessions.add(sessionId);

      // Remove from active sessions after timeout
      setTimeout(() => {
        this.activeSessions.delete(sessionId);
      }, 30000); // 30 seconds

      logger.info("Usage recorded", {
        userId,
        sessionId,
        inputTokens,
        outputTokens,
        currentStats: stats,
      });
    } catch (error) {
      logger.error("Error recording usage:", error);
    }
  }

  /**
   * Get user statistics
   */
  private async getUserStats(userId: string): Promise<UsageStats> {
    // Check in-memory cache first
    if (this.userUsage.has(userId)) {
      const cached = this.userUsage.get(userId)!;

      // Check if cache is still valid (within current minute)
      const now = new Date();
      const lastMinute = new Date(cached.lastRequestTime);
      lastMinute.setMinutes(lastMinute.getMinutes() + 1);

      if (now < lastMinute) {
        return cached;
      }
    }

    // Fetch from database
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const startOfHour = new Date(now);
    startOfHour.setMinutes(0, 0, 0);

    const startOfMinute = new Date(now);
    startOfMinute.setSeconds(0, 0);

    try {
      // Get counts for different time windows
      const [dayStats, hourStats, minuteStats] = await Promise.all([
        // Daily stats
        prisma.$queryRaw<Array<{ count: bigint; total_tokens: bigint }>>`
          SELECT 
            COUNT(*) as count,
            COALESCE(SUM(input_tokens + output_tokens), 0) as total_tokens
          FROM usage_tracking
          WHERE user_id = ${userId}
          AND timestamp >= ${startOfDay}
        `,
        // Hourly stats
        prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(*) as count
          FROM usage_tracking
          WHERE user_id = ${userId}
          AND timestamp >= ${startOfHour}
        `,
        // Per-minute stats
        prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(*) as count
          FROM usage_tracking
          WHERE user_id = ${userId}
          AND timestamp >= ${startOfMinute}
        `,
      ]);

      const stats: UsageStats = {
        userId,
        requestsToday: Number(dayStats[0]?.count || 0),
        requestsThisHour: Number(hourStats[0]?.count || 0),
        requestsThisMinute: Number(minuteStats[0]?.count || 0),
        tokensToday: Number(dayStats[0]?.total_tokens || 0),
        lastRequestTime: now,
        isWithinLimits: true,
      };

      // Check if within limits
      stats.isWithinLimits =
        stats.requestsThisMinute < this.limits.perMinute &&
        stats.requestsThisHour < this.limits.perHour &&
        stats.requestsToday < this.limits.perDay &&
        stats.tokensToday < this.limits.tokensPerDay;

      // Cache the stats
      this.userUsage.set(userId, stats);

      return stats;
    } catch (error) {
      logger.error("Error fetching user stats:", error);

      // Return default stats on error
      return {
        userId,
        requestsToday: 0,
        requestsThisHour: 0,
        requestsThisMinute: 0,
        tokensToday: 0,
        lastRequestTime: now,
        isWithinLimits: true,
      };
    }
  }

  /**
   * Get global usage statistics
   */
  async getGlobalStats(): Promise<any> {
    try {
      const now = new Date();
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);

      const globalStats = await prisma.$queryRaw<
        Array<{
          total_requests: bigint;
          total_tokens: bigint;
          unique_users: bigint;
        }>
      >`
        SELECT 
          COUNT(*) as total_requests,
          COALESCE(SUM(input_tokens + output_tokens), 0) as total_tokens,
          COUNT(DISTINCT user_id) as unique_users
        FROM usage_tracking
        WHERE timestamp >= ${startOfDay}
      `;

      return {
        date: now.toISOString(),
        totalRequests: Number(globalStats[0]?.total_requests || 0),
        totalTokens: Number(globalStats[0]?.total_tokens || 0),
        uniqueUsers: Number(globalStats[0]?.unique_users || 0),
        activeSessions: this.activeSessions.size,
        limits: this.limits,
      };
    } catch (error) {
      logger.error("Error fetching global stats:", error);
      return {
        error: "Failed to fetch statistics",
      };
    }
  }

  /**
   * Reset usage counters periodically
   */
  private startUsageReset(): void {
    // Reset per-minute counters
    setInterval(() => {
      this.userUsage.forEach((stats) => {
        stats.requestsThisMinute = 0;
      });
    }, 60000); // Every minute

    // Reset per-hour counters
    setInterval(() => {
      this.userUsage.forEach((stats) => {
        stats.requestsThisHour = 0;
      });
    }, 3600000); // Every hour

    // Clear cache periodically
    setInterval(() => {
      const now = new Date();
      const expiredUsers: string[] = [];

      this.userUsage.forEach((stats, userId) => {
        const timeSinceLastRequest =
          now.getTime() - stats.lastRequestTime.getTime();
        if (timeSinceLastRequest > 3600000) {
          // 1 hour
          expiredUsers.push(userId);
        }
      });

      expiredUsers.forEach((userId) => this.userUsage.delete(userId));

      if (expiredUsers.length > 0) {
        logger.debug(
          `Cleared ${expiredUsers.length} expired user cache entries`,
        );
      }
    }, 300000); // Every 5 minutes
  }

  /**
   * Clean up old usage records
   */
  async cleanupOldRecords(daysToKeep: number = 30): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const result = await prisma.$executeRaw`
        DELETE FROM usage_tracking
        WHERE timestamp < ${cutoffDate}
      `;

      logger.info(`Cleaned up ${result} old usage records`);
    } catch (error) {
      logger.error("Error cleaning up old records:", error);
    }
  }
}

// Export singleton instance
export const usageMonitor = new UsageMonitorService();
