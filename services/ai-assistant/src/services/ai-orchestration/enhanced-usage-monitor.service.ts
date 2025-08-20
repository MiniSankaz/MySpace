/**
 * Enhanced Usage Monitor Service for AI Orchestration
 * Tracks Claude API usage for Max 20x plan (35h Opus, 280h Sonnet per week)
 * @AI-MARKER:SERVICE:ENHANCED_USAGE_MONITOR
 */

import { EventEmitter } from 'events';
import { createClient } from 'redis';
import { prisma } from '../../lib/prisma';
import { logger } from '../../utils/logger';
import { AgentType } from './agent-spawner.service';
import * as fs from 'fs/promises';
import * as path from 'path';

// Model pricing per 1M tokens
export const MODEL_PRICING = {
  'claude-3-opus-20240229': {
    input: 15.00,  // $15 per 1M input tokens
    output: 75.00, // $75 per 1M output tokens
    hourlyRate: 0.50 // Estimated $0.50 per hour
  },
  'claude-3-5-sonnet-20241022': {
    input: 3.00,   // $3 per 1M input tokens
    output: 15.00, // $15 per 1M output tokens
    hourlyRate: 0.10 // Estimated $0.10 per hour
  },
  'claude-3-haiku-20240307': {
    input: 0.25,   // $0.25 per 1M input tokens
    output: 1.25,  // $1.25 per 1M output tokens
    hourlyRate: 0.02 // Estimated $0.02 per hour
  }
};

// Plan limits for Max 20x
export const PLAN_LIMITS = {
  weeklyOpusHours: 35,
  weeklySonnetHours: 280,
  weeklyHaikuHours: Infinity, // Unlimited
  dailyOpusHours: 5,
  dailySonnetHours: 40,
  concurrentAgents: 5,
  alertThresholds: [70, 90, 100] // Percentage thresholds
};

export interface UsageMetrics {
  agentId: string;
  agentType: AgentType;
  model: string;
  inputTokens: number;
  outputTokens: number;
  duration: number; // milliseconds
  cost: number;
  timestamp: Date;
  sessionId: string;
  userId: string;
  taskId?: string;
  metadata?: Record<string, any>;
}

export interface UsageSummary {
  period: 'daily' | 'weekly' | 'monthly';
  startDate: Date;
  endDate: Date;
  totalCost: number;
  totalTokens: {
    input: number;
    output: number;
  };
  modelUsage: {
    opus: { hours: number; cost: number; tokens: number; percentOfLimit?: number };
    sonnet: { hours: number; cost: number; tokens: number; percentOfLimit?: number };
    haiku: { hours: number; cost: number; tokens: number; percentOfLimit?: number };
  };
  agentBreakdown: Record<AgentType, {
    calls: number;
    tokens: number;
    cost: number;
    avgDuration: number;
  }>;
  alerts: AlertRecord[];
}

export interface AlertRecord {
  id: string;
  type: 'threshold' | 'limit' | 'error';
  level: 'info' | 'warning' | 'critical';
  threshold: number;
  currentUsage: number;
  limit: number;
  message: string;
  timestamp: Date;
  acknowledged: boolean;
}

export interface RealTimeUsage {
  daily: {
    totalTokens: number;
    totalCost: number;
    opus: { tokens: number; cost: number; hours: number };
    sonnet: { tokens: number; cost: number; hours: number };
    haiku: { tokens: number; cost: number; hours: number };
  };
  weekly: {
    totalTokens: number;
    totalCost: number;
    opusHoursUsed: number;
    sonnetHoursUsed: number;
    haikuHoursUsed: number;
  };
  limits: typeof PLAN_LIMITS;
  timestamp: Date;
}

export class EnhancedUsageMonitorService extends EventEmitter {
  private redis: ReturnType<typeof createClient>;
  private isRedisConnected: boolean = false;
  private usageCache: Map<string, UsageMetrics[]> = new Map();
  private alertHistory: AlertRecord[] = [];
  private cleanupInterval?: NodeJS.Timeout;
  private aggregationInterval?: NodeJS.Timeout;

  constructor(redisUrl?: string) {
    super();
    this.initializeRedis(redisUrl);
    this.startBackgroundTasks();
    logger.info('Enhanced Usage Monitor Service initialized');
  }

  /**
   * Initialize Redis connection
   */
  private async initializeRedis(redisUrl?: string): Promise<void> {
    try {
      this.redis = createClient({
        url: redisUrl || process.env.REDIS_URL || 'redis://localhost:6379'
      });

      this.redis.on('error', (err) => {
        logger.error('Redis Client Error:', err);
        this.isRedisConnected = false;
      });

      this.redis.on('connect', () => {
        logger.info('Redis connected for usage monitoring');
        this.isRedisConnected = true;
      });

      await this.redis.connect();
    } catch (error) {
      logger.warn('Failed to connect to Redis, using in-memory cache:', error);
      this.isRedisConnected = false;
    }
  }

  /**
   * Track usage for an agent
   */
  public async trackUsage(metrics: UsageMetrics): Promise<void> {
    try {
      // Calculate cost
      metrics.cost = this.calculateCost(
        metrics.model,
        metrics.inputTokens,
        metrics.outputTokens
      );

      // Store in Redis for real-time tracking
      if (this.isRedisConnected) {
        await this.storeInRedis(metrics);
      }

      // Store in PostgreSQL for historical data
      await this.storeInDatabase(metrics);

      // Update in-memory cache
      this.updateCache(metrics);

      // Check thresholds and emit alerts
      await this.checkThresholds(metrics);

      // Emit usage event
      this.emit('usage:tracked', metrics);

      logger.debug('Usage tracked:', {
        agentId: metrics.agentId,
        model: metrics.model,
        cost: metrics.cost,
        tokens: metrics.inputTokens + metrics.outputTokens
      });

    } catch (error) {
      logger.error('Error tracking usage:', error);
      this.emit('usage:error', error);
    }
  }

  /**
   * Calculate cost based on model and tokens
   */
  private calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    const pricing = MODEL_PRICING[model as keyof typeof MODEL_PRICING];
    if (!pricing) {
      logger.warn(`Unknown model for pricing: ${model}`);
      return 0;
    }

    const inputCost = (inputTokens / 1_000_000) * pricing.input;
    const outputCost = (outputTokens / 1_000_000) * pricing.output;
    
    return Number((inputCost + outputCost).toFixed(4));
  }

  /**
   * Store metrics in Redis
   */
  private async storeInRedis(metrics: UsageMetrics): Promise<void> {
    if (!this.isRedisConnected) return;

    const key = `usage:${metrics.userId}:${metrics.agentId}`;
    const dailyKey = `usage:daily:${metrics.userId}:${new Date().toISOString().split('T')[0]}`;
    const weeklyKey = `usage:weekly:${metrics.userId}:${this.getWeekNumber()}`;

    try {
      // Store individual metric
      await this.redis.hSet(key, {
        model: metrics.model,
        inputTokens: metrics.inputTokens.toString(),
        outputTokens: metrics.outputTokens.toString(),
        cost: metrics.cost.toString(),
        timestamp: metrics.timestamp.toISOString()
      });

      // Increment daily counters
      await this.redis.hIncrBy(dailyKey, 'totalTokens', metrics.inputTokens + metrics.outputTokens);
      await this.redis.hIncrByFloat(dailyKey, 'totalCost', metrics.cost);
      await this.redis.hIncrBy(dailyKey, `${metrics.model}:tokens`, metrics.inputTokens + metrics.outputTokens);
      await this.redis.hIncrByFloat(dailyKey, `${metrics.model}:cost`, metrics.cost);
      await this.redis.hIncrByFloat(dailyKey, `${metrics.model}:hours`, metrics.duration / 3600000);

      // Set TTL for daily key (7 days)
      await this.redis.expire(dailyKey, 604800);

      // Weekly aggregation
      await this.redis.hIncrBy(weeklyKey, 'totalTokens', metrics.inputTokens + metrics.outputTokens);
      await this.redis.hIncrByFloat(weeklyKey, 'totalCost', metrics.cost);
      
      // Track hours by model
      const modelKey = this.getModelKey(metrics.model);
      if (modelKey) {
        await this.redis.hIncrByFloat(weeklyKey, `${modelKey}HoursUsed`, metrics.duration / 3600000);
      }
      
      // Set TTL for weekly key (30 days)
      await this.redis.expire(weeklyKey, 2592000);

    } catch (error) {
      logger.error('Error storing in Redis:', error);
    }
  }

  /**
   * Store metrics in database
   */
  private async storeInDatabase(metrics: UsageMetrics): Promise<void> {
    try {
      // First check if the table exists, if not use fallback
      const tableExists = await this.checkTableExists('ai_usage_metrics');
      
      if (!tableExists) {
        logger.warn('ai_usage_metrics table does not exist, using existing usage_tracking table');
        
        // Store in existing usage_tracking table with limited fields
        await prisma.$executeRaw`
          INSERT INTO usage_tracking (
            id,
            user_id,
            session_id,
            input_tokens,
            output_tokens,
            timestamp,
            metadata
          ) VALUES (
            gen_random_uuid(),
            ${metrics.userId},
            ${metrics.sessionId},
            ${metrics.inputTokens},
            ${metrics.outputTokens},
            ${metrics.timestamp},
            ${JSON.stringify({
              agentId: metrics.agentId,
              agentType: metrics.agentType,
              model: metrics.model,
              duration: metrics.duration,
              cost: metrics.cost,
              taskId: metrics.taskId,
              ...metrics.metadata
            })}::jsonb
          )
        `;
      } else {
        // Use the new ai_usage_metrics table
        await prisma.$executeRaw`
          INSERT INTO ai_usage_metrics (
            id,
            agent_id,
            agent_type,
            model,
            input_tokens,
            output_tokens,
            duration_ms,
            cost,
            user_id,
            session_id,
            task_id,
            metadata,
            created_at
          ) VALUES (
            gen_random_uuid(),
            ${metrics.agentId},
            ${metrics.agentType},
            ${metrics.model},
            ${metrics.inputTokens},
            ${metrics.outputTokens},
            ${metrics.duration},
            ${metrics.cost},
            ${metrics.userId},
            ${metrics.sessionId},
            ${metrics.taskId || null},
            ${JSON.stringify(metrics.metadata || {})}::jsonb,
            ${metrics.timestamp}
          )
        `;
      }
    } catch (error) {
      logger.error('Error storing in database:', error);
      // Store in fallback file if database fails
      await this.storeFallback(metrics);
    }
  }

  /**
   * Check if table exists in database
   */
  private async checkTableExists(tableName: string): Promise<boolean> {
    try {
      const result = await prisma.$queryRaw<any[]>`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = ${tableName}
        ) as exists
      `;
      return result[0]?.exists || false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check usage thresholds and emit alerts
   */
  private async checkThresholds(metrics: UsageMetrics): Promise<void> {
    const summary = await this.getUsageSummary('weekly', metrics.userId);
    
    // Check Opus hours
    if (PLAN_LIMITS.weeklyOpusHours !== Infinity) {
      const opusUsagePercent = (summary.modelUsage.opus.hours / PLAN_LIMITS.weeklyOpusHours) * 100;
      for (const threshold of PLAN_LIMITS.alertThresholds) {
        if (opusUsagePercent >= threshold && opusUsagePercent < threshold + 5) {
          await this.createAlert({
            type: 'threshold',
            level: threshold >= 90 ? 'critical' : threshold >= 70 ? 'warning' : 'info',
            threshold,
            currentUsage: summary.modelUsage.opus.hours,
            limit: PLAN_LIMITS.weeklyOpusHours,
            message: `Opus usage at ${opusUsagePercent.toFixed(1)}% of weekly limit (${summary.modelUsage.opus.hours.toFixed(1)}/${PLAN_LIMITS.weeklyOpusHours} hours)`,
            userId: metrics.userId
          });
        }
      }
    }

    // Check Sonnet hours
    if (PLAN_LIMITS.weeklySonnetHours !== Infinity) {
      const sonnetUsagePercent = (summary.modelUsage.sonnet.hours / PLAN_LIMITS.weeklySonnetHours) * 100;
      for (const threshold of PLAN_LIMITS.alertThresholds) {
        if (sonnetUsagePercent >= threshold && sonnetUsagePercent < threshold + 5) {
          await this.createAlert({
            type: 'threshold',
            level: threshold >= 90 ? 'critical' : threshold >= 70 ? 'warning' : 'info',
            threshold,
            currentUsage: summary.modelUsage.sonnet.hours,
            limit: PLAN_LIMITS.weeklySonnetHours,
            message: `Sonnet usage at ${sonnetUsagePercent.toFixed(1)}% of weekly limit (${summary.modelUsage.sonnet.hours.toFixed(1)}/${PLAN_LIMITS.weeklySonnetHours} hours)`,
            userId: metrics.userId
          });
        }
      }
    }
  }

  /**
   * Create and emit alert
   */
  private async createAlert(alert: Partial<AlertRecord> & { userId: string }): Promise<void> {
    const alertRecord: AlertRecord = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: alert.type || 'threshold',
      level: alert.level || 'info',
      threshold: alert.threshold || 0,
      currentUsage: alert.currentUsage || 0,
      limit: alert.limit || 0,
      message: alert.message || '',
      timestamp: new Date(),
      acknowledged: false
    };

    this.alertHistory.push(alertRecord);
    
    // Keep only last 100 alerts
    if (this.alertHistory.length > 100) {
      this.alertHistory = this.alertHistory.slice(-100);
    }

    // Store alert in database (check if table exists first)
    const alertTableExists = await this.checkTableExists('ai_usage_alerts');
    if (alertTableExists) {
      try {
        await prisma.$executeRaw`
          INSERT INTO ai_usage_alerts (
            id,
            user_id,
            type,
            level,
            threshold,
            current_usage,
            limit_value,
            message,
            acknowledged,
            created_at
          ) VALUES (
            ${alertRecord.id},
            ${alert.userId},
            ${alertRecord.type},
            ${alertRecord.level},
            ${alertRecord.threshold},
            ${alertRecord.currentUsage},
            ${alertRecord.limit},
            ${alertRecord.message},
            ${alertRecord.acknowledged},
            ${alertRecord.timestamp}
          )
        `;
      } catch (error) {
        logger.error('Error storing alert:', error);
      }
    }

    // Emit alert event
    this.emit('usage:alert', alertRecord);
    
    logger.warn('Usage alert created:', alertRecord);
  }

  /**
   * Get usage summary for a period
   */
  public async getUsageSummary(
    period: 'daily' | 'weekly' | 'monthly',
    userId: string
  ): Promise<UsageSummary> {
    const now = new Date();
    let startDate: Date;
    const endDate = now;

    switch (period) {
      case 'daily':
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'weekly':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case 'monthly':
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 1);
        break;
    }

    // Initialize summary
    const summary: UsageSummary = {
      period,
      startDate,
      endDate,
      totalCost: 0,
      totalTokens: { input: 0, output: 0 },
      modelUsage: {
        opus: { hours: 0, cost: 0, tokens: 0, percentOfLimit: 0 },
        sonnet: { hours: 0, cost: 0, tokens: 0, percentOfLimit: 0 },
        haiku: { hours: 0, cost: 0, tokens: 0, percentOfLimit: 0 }
      },
      agentBreakdown: {} as any,
      alerts: this.alertHistory.filter(
        a => a.timestamp >= startDate && a.timestamp <= endDate
      )
    };

    try {
      // Try to get from Redis first for real-time data
      if (this.isRedisConnected && period === 'daily') {
        const dailyKey = `usage:daily:${userId}:${new Date().toISOString().split('T')[0]}`;
        const dailyData = await this.redis.hGetAll(dailyKey);
        
        if (dailyData && Object.keys(dailyData).length > 0) {
          summary.totalTokens.input = Number(dailyData.totalTokens || 0) / 2; // Approximate
          summary.totalTokens.output = Number(dailyData.totalTokens || 0) / 2;
          summary.totalCost = Number(dailyData.totalCost || 0);
          
          // Process model data
          for (const model of Object.keys(MODEL_PRICING)) {
            const modelKey = this.getModelKey(model);
            if (modelKey) {
              summary.modelUsage[modelKey].tokens = Number(dailyData[`${model}:tokens`] || 0);
              summary.modelUsage[modelKey].cost = Number(dailyData[`${model}:cost`] || 0);
              summary.modelUsage[modelKey].hours = Number(dailyData[`${model}:hours`] || 0);
            }
          }
        }
      }

      // Get detailed metrics from database
      const tableExists = await this.checkTableExists('ai_usage_metrics');
      
      if (tableExists) {
        const metrics = await prisma.$queryRaw<any[]>`
          SELECT 
            model,
            agent_type,
            SUM(input_tokens) as input_tokens,
            SUM(output_tokens) as output_tokens,
            SUM(cost) as total_cost,
            AVG(duration_ms) as avg_duration,
            COUNT(*) as call_count
          FROM ai_usage_metrics
          WHERE user_id = ${userId}
            AND created_at >= ${startDate}
            AND created_at <= ${endDate}
          GROUP BY model, agent_type
        `;

        // Process metrics
        for (const metric of metrics) {
          summary.totalCost += Number(metric.total_cost);
          summary.totalTokens.input += Number(metric.input_tokens);
          summary.totalTokens.output += Number(metric.output_tokens);

          // Model usage
          const modelKey = this.getModelKey(metric.model);
          if (modelKey && summary.modelUsage[modelKey]) {
            summary.modelUsage[modelKey].cost += Number(metric.total_cost);
            summary.modelUsage[modelKey].tokens += Number(metric.input_tokens) + Number(metric.output_tokens);
            summary.modelUsage[modelKey].hours += (Number(metric.avg_duration) * Number(metric.call_count)) / 3600000;
          }

          // Agent breakdown
          if (!summary.agentBreakdown[metric.agent_type]) {
            summary.agentBreakdown[metric.agent_type] = {
              calls: 0,
              tokens: 0,
              cost: 0,
              avgDuration: 0
            };
          }
          summary.agentBreakdown[metric.agent_type].calls += Number(metric.call_count);
          summary.agentBreakdown[metric.agent_type].tokens += Number(metric.input_tokens) + Number(metric.output_tokens);
          summary.agentBreakdown[metric.agent_type].cost += Number(metric.total_cost);
          summary.agentBreakdown[metric.agent_type].avgDuration = Number(metric.avg_duration);
        }
      } else {
        // Fallback to usage_tracking table
        const metrics = await prisma.$queryRaw<any[]>`
          SELECT 
            metadata,
            input_tokens,
            output_tokens
          FROM usage_tracking
          WHERE user_id = ${userId}
            AND timestamp >= ${startDate}
            AND timestamp <= ${endDate}
        `;

        // Process limited metrics
        for (const metric of metrics) {
          const tokens = Number(metric.input_tokens) + Number(metric.output_tokens);
          summary.totalTokens.input += Number(metric.input_tokens);
          summary.totalTokens.output += Number(metric.output_tokens);
          
          if (metric.metadata) {
            const metadata = metric.metadata as any;
            if (metadata.cost) {
              summary.totalCost += Number(metadata.cost);
            }
            if (metadata.model) {
              const modelKey = this.getModelKey(metadata.model);
              if (modelKey) {
                summary.modelUsage[modelKey].tokens += tokens;
                if (metadata.cost) {
                  summary.modelUsage[modelKey].cost += Number(metadata.cost);
                }
                if (metadata.duration) {
                  summary.modelUsage[modelKey].hours += Number(metadata.duration) / 3600000;
                }
              }
            }
          }
        }
      }

      // Calculate percentages
      if (period === 'weekly') {
        summary.modelUsage.opus.percentOfLimit = (summary.modelUsage.opus.hours / PLAN_LIMITS.weeklyOpusHours) * 100;
        summary.modelUsage.sonnet.percentOfLimit = (summary.modelUsage.sonnet.hours / PLAN_LIMITS.weeklySonnetHours) * 100;
        summary.modelUsage.haiku.percentOfLimit = 0; // Unlimited
      }

      return summary;

    } catch (error) {
      logger.error('Error getting usage summary:', error);
      return summary;
    }
  }

  /**
   * Get real-time usage from Redis
   */
  public async getRealTimeUsage(userId: string): Promise<RealTimeUsage | null> {
    if (!this.isRedisConnected) {
      // Fallback to database summary
      const dailySummary = await this.getUsageSummary('daily', userId);
      const weeklySummary = await this.getUsageSummary('weekly', userId);
      
      return {
        daily: {
          totalTokens: dailySummary.totalTokens.input + dailySummary.totalTokens.output,
          totalCost: dailySummary.totalCost,
          opus: {
            tokens: dailySummary.modelUsage.opus.tokens,
            cost: dailySummary.modelUsage.opus.cost,
            hours: dailySummary.modelUsage.opus.hours
          },
          sonnet: {
            tokens: dailySummary.modelUsage.sonnet.tokens,
            cost: dailySummary.modelUsage.sonnet.cost,
            hours: dailySummary.modelUsage.sonnet.hours
          },
          haiku: {
            tokens: dailySummary.modelUsage.haiku.tokens,
            cost: dailySummary.modelUsage.haiku.cost,
            hours: dailySummary.modelUsage.haiku.hours
          }
        },
        weekly: {
          totalTokens: weeklySummary.totalTokens.input + weeklySummary.totalTokens.output,
          totalCost: weeklySummary.totalCost,
          opusHoursUsed: weeklySummary.modelUsage.opus.hours,
          sonnetHoursUsed: weeklySummary.modelUsage.sonnet.hours,
          haikuHoursUsed: weeklySummary.modelUsage.haiku.hours
        },
        limits: PLAN_LIMITS,
        timestamp: new Date()
      };
    }

    try {
      const dailyKey = `usage:daily:${userId}:${new Date().toISOString().split('T')[0]}`;
      const weeklyKey = `usage:weekly:${userId}:${this.getWeekNumber()}`;

      const [dailyData, weeklyData] = await Promise.all([
        this.redis.hGetAll(dailyKey),
        this.redis.hGetAll(weeklyKey)
      ]);

      return {
        daily: {
          totalTokens: Number(dailyData.totalTokens || 0),
          totalCost: Number(dailyData.totalCost || 0),
          opus: {
            tokens: Number(dailyData['claude-3-opus-20240229:tokens'] || 0),
            cost: Number(dailyData['claude-3-opus-20240229:cost'] || 0),
            hours: Number(dailyData['claude-3-opus-20240229:hours'] || 0)
          },
          sonnet: {
            tokens: Number(dailyData['claude-3-5-sonnet-20241022:tokens'] || 0),
            cost: Number(dailyData['claude-3-5-sonnet-20241022:cost'] || 0),
            hours: Number(dailyData['claude-3-5-sonnet-20241022:hours'] || 0)
          },
          haiku: {
            tokens: Number(dailyData['claude-3-haiku-20240307:tokens'] || 0),
            cost: Number(dailyData['claude-3-haiku-20240307:cost'] || 0),
            hours: Number(dailyData['claude-3-haiku-20240307:hours'] || 0)
          }
        },
        weekly: {
          totalTokens: Number(weeklyData.totalTokens || 0),
          totalCost: Number(weeklyData.totalCost || 0),
          opusHoursUsed: Number(weeklyData.opusHoursUsed || 0),
          sonnetHoursUsed: Number(weeklyData.sonnetHoursUsed || 0),
          haikuHoursUsed: Number(weeklyData.haikuHoursUsed || 0)
        },
        limits: PLAN_LIMITS,
        timestamp: new Date()
      };

    } catch (error) {
      logger.error('Error getting real-time usage:', error);
      return null;
    }
  }

  /**
   * Get agent-specific metrics
   */
  public async getAgentMetrics(agentId: string): Promise<UsageMetrics[]> {
    try {
      const tableExists = await this.checkTableExists('ai_usage_metrics');
      
      if (tableExists) {
        const metrics = await prisma.$queryRaw<UsageMetrics[]>`
          SELECT 
            agent_id as "agentId",
            agent_type as "agentType",
            model,
            input_tokens as "inputTokens",
            output_tokens as "outputTokens",
            duration_ms as duration,
            cost,
            user_id as "userId",
            session_id as "sessionId",
            task_id as "taskId",
            metadata,
            created_at as timestamp
          FROM ai_usage_metrics
          WHERE agent_id = ${agentId}
          ORDER BY created_at DESC
          LIMIT 100
        `;
        return metrics;
      } else {
        // Fallback to usage_tracking table
        const metrics = await prisma.$queryRaw<any[]>`
          SELECT 
            session_id as "sessionId",
            user_id as "userId",
            input_tokens as "inputTokens",
            output_tokens as "outputTokens",
            timestamp,
            metadata
          FROM usage_tracking
          WHERE metadata->>'agentId' = ${agentId}
          ORDER BY timestamp DESC
          LIMIT 100
        `;
        
        // Transform to UsageMetrics format
        return metrics.map(m => ({
          agentId: agentId,
          agentType: m.metadata?.agentType || 'unknown',
          model: m.metadata?.model || 'unknown',
          inputTokens: m.inputTokens,
          outputTokens: m.outputTokens,
          duration: m.metadata?.duration || 0,
          cost: m.metadata?.cost || 0,
          userId: m.userId,
          sessionId: m.sessionId,
          taskId: m.metadata?.taskId,
          metadata: m.metadata,
          timestamp: m.timestamp
        }));
      }
    } catch (error) {
      logger.error('Error getting agent metrics:', error);
      return [];
    }
  }

  /**
   * Get alerts
   */
  public async getAlerts(
    options: {
      userId?: string;
      acknowledged?: boolean;
      level?: 'info' | 'warning' | 'critical';
      limit?: number;
    } = {}
  ): Promise<AlertRecord[]> {
    const { userId, acknowledged, level, limit = 50 } = options;

    try {
      const tableExists = await this.checkTableExists('ai_usage_alerts');
      
      if (tableExists) {
        let query = `
          SELECT 
            id,
            type,
            level,
            threshold,
            current_usage as "currentUsage",
            limit_value as "limit",
            message,
            acknowledged,
            created_at as timestamp
          FROM ai_usage_alerts
          WHERE 1=1
        `;
        
        const params: any[] = [];
        
        if (userId) {
          query += ` AND user_id = $${params.length + 1}`;
          params.push(userId);
        }
        
        if (acknowledged !== undefined) {
          query += ` AND acknowledged = $${params.length + 1}`;
          params.push(acknowledged);
        }
        
        if (level) {
          query += ` AND level = $${params.length + 1}`;
          params.push(level);
        }
        
        query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
        params.push(limit);
        
        const alerts = await prisma.$queryRawUnsafe<AlertRecord[]>(query, ...params);
        return alerts;
      } else {
        // Return from in-memory cache
        let alerts = [...this.alertHistory];
        
        if (acknowledged !== undefined) {
          alerts = alerts.filter(a => a.acknowledged === acknowledged);
        }
        
        if (level) {
          alerts = alerts.filter(a => a.level === level);
        }
        
        return alerts.slice(-limit);
      }
    } catch (error) {
      logger.error('Error getting alerts:', error);
      return [];
    }
  }

  /**
   * Acknowledge an alert
   */
  public async acknowledgeAlert(alertId: string, userId: string): Promise<boolean> {
    try {
      const tableExists = await this.checkTableExists('ai_usage_alerts');
      
      if (tableExists) {
        await prisma.$executeRaw`
          UPDATE ai_usage_alerts
          SET 
            acknowledged = true,
            acknowledged_at = NOW(),
            acknowledged_by = ${userId}
          WHERE id = ${alertId}
        `;
      }
      
      // Update in-memory cache
      const alert = this.alertHistory.find(a => a.id === alertId);
      if (alert) {
        alert.acknowledged = true;
      }
      
      return true;
    } catch (error) {
      logger.error('Error acknowledging alert:', error);
      return false;
    }
  }

  /**
   * Helper functions
   */
  private getWeekNumber(): string {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const diff = now.getTime() - start.getTime();
    const oneWeek = 1000 * 60 * 60 * 24 * 7;
    const weekNum = Math.floor(diff / oneWeek);
    return `${now.getFullYear()}-W${weekNum.toString().padStart(2, '0')}`;
  }

  private getModelKey(model: string): 'opus' | 'sonnet' | 'haiku' | null {
    if (model.includes('opus')) return 'opus';
    if (model.includes('sonnet')) return 'sonnet';
    if (model.includes('haiku')) return 'haiku';
    return null;
  }

  private updateCache(metrics: UsageMetrics): void {
    const key = `${metrics.userId}:${metrics.agentId}`;
    if (!this.usageCache.has(key)) {
      this.usageCache.set(key, []);
    }
    
    const cache = this.usageCache.get(key)!;
    cache.push(metrics);
    
    // Keep only last 100 entries per key
    if (cache.length > 100) {
      this.usageCache.set(key, cache.slice(-100));
    }
  }

  private async storeFallback(metrics: UsageMetrics): Promise<void> {
    // Store in local file as fallback
    const fallbackDir = path.join(process.cwd(), '.usage-fallback');
    const fallbackFile = path.join(fallbackDir, `${new Date().toISOString().split('T')[0]}.jsonl`);
    
    try {
      await fs.mkdir(fallbackDir, { recursive: true });
      await fs.appendFile(fallbackFile, JSON.stringify(metrics) + '\n');
      logger.debug('Stored usage metrics in fallback file');
    } catch (error) {
      logger.error('Error storing fallback:', error);
    }
  }

  /**
   * Extract token usage from Claude CLI output
   */
  public extractTokenUsage(output: string[]): { input: number; output: number } {
    const fullOutput = output.join('\n');
    
    // Token extraction patterns for different Claude models
    const patterns = [
      /Input:\s*(\d+)\s*tokens.*Output:\s*(\d+)\s*tokens/i,
      /Tokens used:\s*(\d+)\s*input,\s*(\d+)\s*output/i,
      /Usage:\s*\{input:\s*(\d+),\s*output:\s*(\d+)\}/i,
      /(\d+)\s*input tokens.*(\d+)\s*output tokens/i
    ];
    
    for (const pattern of patterns) {
      const match = fullOutput.match(pattern);
      if (match) {
        return {
          input: parseInt(match[1], 10),
          output: parseInt(match[2], 10)
        };
      }
    }
    
    // Fallback: estimate based on output length
    const estimatedTokens = Math.ceil(fullOutput.length / 4);
    return {
      input: Math.ceil(estimatedTokens * 0.3),
      output: Math.ceil(estimatedTokens * 0.7)
    };
  }

  /**
   * Background tasks
   */
  private startBackgroundTasks(): void {
    // Cleanup old data every hour
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldData();
    }, 3600000);

    // Aggregate data every 5 minutes
    this.aggregationInterval = setInterval(() => {
      this.aggregateUsageData();
    }, 300000);
  }

  private async cleanupOldData(): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 90); // Keep 90 days

      const tableExists = await this.checkTableExists('ai_usage_metrics');
      if (tableExists) {
        await prisma.$executeRaw`
          DELETE FROM ai_usage_metrics
          WHERE created_at < ${cutoffDate}
        `;
        logger.info('Cleaned up old usage data');
      }
    } catch (error) {
      logger.error('Error cleaning up old data:', error);
    }
  }

  private async aggregateUsageData(): Promise<void> {
    try {
      const tableExists = await this.checkTableExists('ai_usage_hourly_aggregates');
      if (!tableExists) {
        logger.debug('Aggregation tables not yet created, skipping aggregation');
        return;
      }

      // Aggregate hourly data
      await prisma.$executeRawUnsafe(`
        INSERT INTO ai_usage_hourly_aggregates (
          user_id,
          hour,
          total_tokens,
          total_cost,
          model_breakdown,
          agent_breakdown
        )
        SELECT 
          user_id,
          date_trunc('hour', created_at) as hour,
          SUM(input_tokens + output_tokens) as total_tokens,
          SUM(cost) as total_cost,
          jsonb_object_agg(DISTINCT model, model_stats) as model_breakdown,
          jsonb_object_agg(DISTINCT agent_type, agent_stats) as agent_breakdown
        FROM (
          SELECT 
            user_id,
            created_at,
            model,
            agent_type,
            SUM(input_tokens + output_tokens) as tokens,
            SUM(cost) as cost,
            jsonb_build_object(
              'tokens', SUM(input_tokens + output_tokens),
              'cost', SUM(cost)
            ) as model_stats,
            jsonb_build_object(
              'calls', COUNT(*),
              'tokens', SUM(input_tokens + output_tokens),
              'cost', SUM(cost)
            ) as agent_stats,
            input_tokens,
            output_tokens
          FROM ai_usage_metrics
          WHERE created_at >= date_trunc('hour', NOW() - INTERVAL '1 hour')
            AND created_at < date_trunc('hour', NOW())
          GROUP BY user_id, created_at, model, agent_type, input_tokens, output_tokens
        ) as hourly_data
        GROUP BY user_id, hour
        ON CONFLICT (user_id, hour) DO UPDATE
        SET 
          total_tokens = EXCLUDED.total_tokens,
          total_cost = EXCLUDED.total_cost,
          model_breakdown = EXCLUDED.model_breakdown,
          agent_breakdown = EXCLUDED.agent_breakdown
      `);

      logger.debug('Usage data aggregated');
    } catch (error) {
      logger.error('Error aggregating usage data:', error);
    }
  }

  /**
   * Get usage report
   */
  public async getUsageReport(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<any> {
    try {
      const dailyData = [];
      const current = new Date(startDate);
      
      while (current <= endDate) {
        const dayStart = new Date(current);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(current);
        dayEnd.setHours(23, 59, 59, 999);
        
        const summary = await this.getUsageSummary('daily', userId);
        dailyData.push({
          date: current.toISOString().split('T')[0],
          ...summary
        });
        
        current.setDate(current.getDate() + 1);
      }
      
      // Calculate projections
      const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const avgDailyCost = dailyData.reduce((sum, d) => sum + d.totalCost, 0) / totalDays;
      
      return {
        period: {
          start: startDate,
          end: endDate
        },
        totalCost: dailyData.reduce((sum, d) => sum + d.totalCost, 0),
        totalHours: {
          opus: dailyData.reduce((sum, d) => sum + d.modelUsage.opus.hours, 0),
          sonnet: dailyData.reduce((sum, d) => sum + d.modelUsage.sonnet.hours, 0),
          haiku: dailyData.reduce((sum, d) => sum + d.modelUsage.haiku.hours, 0)
        },
        dailyBreakdown: dailyData,
        costProjection: {
          monthly: avgDailyCost * 30,
          weekly: avgDailyCost * 7
        }
      };
    } catch (error) {
      logger.error('Error generating usage report:', error);
      throw error;
    }
  }

  /**
   * Cleanup on shutdown
   */
  public async shutdown(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    if (this.aggregationInterval) {
      clearInterval(this.aggregationInterval);
    }
    if (this.redis && this.isRedisConnected) {
      await this.redis.quit();
    }
    logger.info('Enhanced Usage Monitor Service shut down');
  }
}

// Export singleton instance
export const enhancedUsageMonitor = new EnhancedUsageMonitorService();