# AI Usage Monitor Service - Technical Specification

## Executive Summary

The AI Usage Monitor Service is a comprehensive solution for tracking, monitoring, and managing Claude API usage across the AI Orchestration System. It provides real-time usage tracking, alerts, historical analytics, and cost estimation for the Max 20x plan (35h Opus, 280h Sonnet per week). The service integrates with the existing agent-spawner service and provides REST API endpoints for dashboard visualization.

## System Architecture Overview

### Service Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    AI Usage Monitor Service                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │  Usage Tracker   │  │  Alert Manager   │  │  Analytics    │  │
│  │   Component      │  │   Component      │  │   Engine      │  │
│  └──────────────────┘  └──────────────────┘  └──────────────┘  │
│           │                     │                     │          │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    Redis Cache Layer                       │ │
│  │  - Real-time counters                                      │ │
│  │  - Session tracking                                        │ │
│  │  - Rate limiting                                           │ │
│  └────────────────────────────────────────────────────────────┘ │
│           │                     │                     │          │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                 PostgreSQL Database Layer                  │ │
│  │  - Historical data                                         │ │
│  │  - Usage analytics                                         │ │
│  │  - Cost tracking                                           │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow Architecture

```
Agent Spawner → Usage Monitor → Redis (Real-time)
                              ↓
                         PostgreSQL (Historical)
                              ↓
                         API Endpoints → Dashboard
```

## Detailed Component Specifications

### 1. Core Service Implementation

#### File: `/services/ai-assistant/src/services/ai-orchestration/usage-monitor.service.ts`

```typescript
/**
 * Enhanced Usage Monitor Service for AI Orchestration
 * Tracks Claude API usage for Max 20x plan
 */

import { EventEmitter } from 'events';
import * as Redis from 'redis';
import { prisma } from '../../lib/prisma';
import { logger } from '../../utils/logger';
import { AgentType } from './agent-spawner.service';

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
    opus: { hours: number; cost: number; tokens: number };
    sonnet: { hours: number; cost: number; tokens: number };
    haiku: { hours: number; cost: number; tokens: number };
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

export class EnhancedUsageMonitorService extends EventEmitter {
  private redis: Redis.RedisClientType;
  private isRedisConnected: boolean = false;
  private usageCache: Map<string, UsageMetrics[]> = new Map();
  private alertHistory: AlertRecord[] = [];
  private cleanupInterval?: NodeJS.Timeout;
  private aggregationInterval?: NodeJS.Timeout;

  constructor(redisUrl?: string) {
    super();
    this.initializeRedis(redisUrl);
    this.startBackgroundTasks();
  }

  /**
   * Initialize Redis connection
   */
  private async initializeRedis(redisUrl?: string): Promise<void> {
    try {
      this.redis = Redis.createClient({
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

      // Increment counters
      await this.redis.hIncrBy(dailyKey, 'totalTokens', metrics.inputTokens + metrics.outputTokens);
      await this.redis.hIncrByFloat(dailyKey, 'totalCost', metrics.cost);
      await this.redis.hIncrBy(dailyKey, `${metrics.model}:tokens`, metrics.inputTokens + metrics.outputTokens);
      await this.redis.hIncrByFloat(dailyKey, `${metrics.model}:cost`, metrics.cost);

      // Set TTL for daily key (7 days)
      await this.redis.expire(dailyKey, 604800);

      // Weekly aggregation
      await this.redis.hIncrBy(weeklyKey, 'totalTokens', metrics.inputTokens + metrics.outputTokens);
      await this.redis.hIncrByFloat(weeklyKey, 'totalCost', metrics.cost);
      
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
          ${JSON.stringify(metrics.metadata || {})},
          ${metrics.timestamp}
        )
      `;
    } catch (error) {
      logger.error('Error storing in database:', error);
      // Store in fallback file if database fails
      await this.storeFallback(metrics);
    }
  }

  /**
   * Check usage thresholds and emit alerts
   */
  private async checkThresholds(metrics: UsageMetrics): Promise<void> {
    const summary = await this.getUsageSummary('weekly', metrics.userId);
    
    // Check Opus hours
    const opusUsagePercent = (summary.modelUsage.opus.hours / PLAN_LIMITS.weeklyOpusHours) * 100;
    for (const threshold of PLAN_LIMITS.alertThresholds) {
      if (opusUsagePercent >= threshold && opusUsagePercent < threshold + 5) {
        await this.createAlert({
          type: 'threshold',
          level: threshold >= 90 ? 'critical' : threshold >= 70 ? 'warning' : 'info',
          threshold,
          currentUsage: summary.modelUsage.opus.hours,
          limit: PLAN_LIMITS.weeklyOpusHours,
          message: `Opus usage at ${opusUsagePercent.toFixed(1)}% of weekly limit`,
          userId: metrics.userId
        });
      }
    }

    // Check Sonnet hours
    const sonnetUsagePercent = (summary.modelUsage.sonnet.hours / PLAN_LIMITS.weeklySonnetHours) * 100;
    for (const threshold of PLAN_LIMITS.alertThresholds) {
      if (sonnetUsagePercent >= threshold && sonnetUsagePercent < threshold + 5) {
        await this.createAlert({
          type: 'threshold',
          level: threshold >= 90 ? 'critical' : threshold >= 70 ? 'warning' : 'info',
          threshold,
          currentUsage: summary.modelUsage.sonnet.hours,
          limit: PLAN_LIMITS.weeklySonnetHours,
          message: `Sonnet usage at ${sonnetUsagePercent.toFixed(1)}% of weekly limit`,
          userId: metrics.userId
        });
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

    // Store alert in database
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
    let endDate = now;

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

    try {
      // Get metrics from database
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

      // Process and aggregate data
      const summary: UsageSummary = {
        period,
        startDate,
        endDate,
        totalCost: 0,
        totalTokens: { input: 0, output: 0 },
        modelUsage: {
          opus: { hours: 0, cost: 0, tokens: 0 },
          sonnet: { hours: 0, cost: 0, tokens: 0 },
          haiku: { hours: 0, cost: 0, tokens: 0 }
        },
        agentBreakdown: {} as any,
        alerts: this.alertHistory.filter(
          a => a.timestamp >= startDate && a.timestamp <= endDate
        )
      };

      // Aggregate metrics
      for (const metric of metrics) {
        summary.totalCost += Number(metric.total_cost);
        summary.totalTokens.input += Number(metric.input_tokens);
        summary.totalTokens.output += Number(metric.output_tokens);

        // Model usage
        const modelKey = this.getModelKey(metric.model);
        if (modelKey && summary.modelUsage[modelKey]) {
          summary.modelUsage[modelKey].cost += Number(metric.total_cost);
          summary.modelUsage[modelKey].tokens += Number(metric.input_tokens) + Number(metric.output_tokens);
          summary.modelUsage[modelKey].hours += Number(metric.avg_duration) * Number(metric.call_count) / 3600000;
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

      return summary;

    } catch (error) {
      logger.error('Error getting usage summary:', error);
      throw error;
    }
  }

  /**
   * Get real-time usage from Redis
   */
  public async getRealTimeUsage(userId: string): Promise<any> {
    if (!this.isRedisConnected) {
      return this.getUsageSummary('daily', userId);
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
            cost: Number(dailyData['claude-3-opus-20240229:cost'] || 0)
          },
          sonnet: {
            tokens: Number(dailyData['claude-3-5-sonnet-20241022:tokens'] || 0),
            cost: Number(dailyData['claude-3-5-sonnet-20241022:cost'] || 0)
          }
        },
        weekly: {
          totalTokens: Number(weeklyData.totalTokens || 0),
          totalCost: Number(weeklyData.totalCost || 0)
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

    } catch (error) {
      logger.error('Error getting agent metrics:', error);
      return [];
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
    const fs = require('fs').promises;
    const path = require('path');
    
    const fallbackDir = path.join(process.cwd(), '.usage-fallback');
    const fallbackFile = path.join(fallbackDir, `${new Date().toISOString().split('T')[0]}.jsonl`);
    
    try {
      await fs.mkdir(fallbackDir, { recursive: true });
      await fs.appendFile(fallbackFile, JSON.stringify(metrics) + '\n');
    } catch (error) {
      logger.error('Error storing fallback:', error);
    }
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

      await prisma.$executeRaw`
        DELETE FROM ai_usage_metrics
        WHERE created_at < ${cutoffDate}
      `;

      logger.info('Cleaned up old usage data');
    } catch (error) {
      logger.error('Error cleaning up old data:', error);
    }
  }

  private async aggregateUsageData(): Promise<void> {
    try {
      // Aggregate hourly data
      await prisma.$executeRaw`
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
          jsonb_object_agg(model, model_stats) as model_breakdown,
          jsonb_object_agg(agent_type, agent_stats) as agent_breakdown
        FROM (
          SELECT 
            user_id,
            created_at,
            model,
            agent_type,
            input_tokens,
            output_tokens,
            cost,
            jsonb_build_object(
              'tokens', SUM(input_tokens + output_tokens),
              'cost', SUM(cost)
            ) as model_stats,
            jsonb_build_object(
              'calls', COUNT(*),
              'tokens', SUM(input_tokens + output_tokens),
              'cost', SUM(cost)
            ) as agent_stats
          FROM ai_usage_metrics
          WHERE created_at >= date_trunc('hour', NOW() - INTERVAL '1 hour')
            AND created_at < date_trunc('hour', NOW())
          GROUP BY user_id, created_at, model, agent_type, input_tokens, output_tokens, cost
        ) as hourly_data
        GROUP BY user_id, hour
        ON CONFLICT (user_id, hour) DO UPDATE
        SET 
          total_tokens = EXCLUDED.total_tokens,
          total_cost = EXCLUDED.total_cost,
          model_breakdown = EXCLUDED.model_breakdown,
          agent_breakdown = EXCLUDED.agent_breakdown
      `;

      logger.debug('Usage data aggregated');
    } catch (error) {
      logger.error('Error aggregating usage data:', error);
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
    if (this.redis) {
      await this.redis.quit();
    }
  }
}

// Export singleton instance
export const enhancedUsageMonitor = new EnhancedUsageMonitorService();
```

## Data Models and Schemas

### Database Schema (PostgreSQL)

```sql
-- AI Usage Metrics Table
CREATE TABLE ai_usage_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id VARCHAR(255) NOT NULL,
  agent_type VARCHAR(100) NOT NULL,
  model VARCHAR(100) NOT NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER NOT NULL,
  cost DECIMAL(10, 4) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  session_id VARCHAR(255) NOT NULL,
  task_id VARCHAR(255),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  INDEX idx_user_created (user_id, created_at),
  INDEX idx_agent_created (agent_id, created_at),
  INDEX idx_model_created (model, created_at)
);

-- AI Usage Alerts Table
CREATE TABLE ai_usage_alerts (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  level VARCHAR(20) NOT NULL,
  threshold INTEGER NOT NULL,
  current_usage DECIMAL(10, 2) NOT NULL,
  limit_value DECIMAL(10, 2) NOT NULL,
  message TEXT NOT NULL,
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  acknowledged_by VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  INDEX idx_user_alerts (user_id, created_at),
  INDEX idx_unack_alerts (acknowledged, level)
);

-- Hourly Aggregates Table (for performance)
CREATE TABLE ai_usage_hourly_aggregates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  hour TIMESTAMP WITH TIME ZONE NOT NULL,
  total_tokens BIGINT NOT NULL DEFAULT 0,
  total_cost DECIMAL(10, 4) NOT NULL DEFAULT 0,
  model_breakdown JSONB NOT NULL DEFAULT '{}',
  agent_breakdown JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, hour),
  INDEX idx_user_hour (user_id, hour)
);

-- Daily Aggregates Table
CREATE TABLE ai_usage_daily_aggregates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  total_tokens BIGINT NOT NULL DEFAULT 0,
  total_cost DECIMAL(10, 4) NOT NULL DEFAULT 0,
  opus_hours DECIMAL(10, 2) DEFAULT 0,
  sonnet_hours DECIMAL(10, 2) DEFAULT 0,
  haiku_hours DECIMAL(10, 2) DEFAULT 0,
  model_breakdown JSONB NOT NULL DEFAULT '{}',
  agent_breakdown JSONB NOT NULL DEFAULT '{}',
  alert_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, date),
  INDEX idx_user_date (user_id, date)
);
```

### Redis Data Structure

```
# Real-time counters
usage:daily:{userId}:{date}
  - totalTokens: number
  - totalCost: number
  - {model}:tokens: number
  - {model}:cost: number
  - {model}:hours: number

usage:weekly:{userId}:{week}
  - totalTokens: number
  - totalCost: number
  - opusHours: number
  - sonnetHours: number

# Agent-specific data
usage:{userId}:{agentId}
  - model: string
  - inputTokens: number
  - outputTokens: number
  - cost: number
  - timestamp: ISO string

# Rate limiting
ratelimit:{userId}
  - requests: number
  - resetAt: timestamp

# Active sessions
sessions:active
  - SET of sessionIds
```

## API Specifications

### REST Endpoints

#### 1. Get Usage Summary
```
GET /api/v1/ai/usage/summary
Query Parameters:
  - period: 'daily' | 'weekly' | 'monthly'
  - userId?: string (defaults to authenticated user)

Response:
{
  "success": true,
  "data": {
    "period": "weekly",
    "startDate": "2025-08-12T00:00:00Z",
    "endDate": "2025-08-19T23:59:59Z",
    "totalCost": 45.67,
    "totalTokens": {
      "input": 1500000,
      "output": 750000
    },
    "modelUsage": {
      "opus": {
        "hours": 12.5,
        "cost": 35.00,
        "tokens": 500000,
        "percentOfLimit": 35.7
      },
      "sonnet": {
        "hours": 95.3,
        "cost": 10.50,
        "tokens": 1500000,
        "percentOfLimit": 34.0
      }
    },
    "agentBreakdown": {
      "business-analyst": {
        "calls": 25,
        "tokens": 250000,
        "cost": 12.50,
        "avgDuration": 45000
      }
    },
    "alerts": []
  }
}
```

#### 2. Get Real-time Usage
```
GET /api/v1/ai/usage/realtime

Response:
{
  "success": true,
  "data": {
    "daily": {
      "totalTokens": 150000,
      "totalCost": 4.56,
      "opus": {
        "tokens": 50000,
        "cost": 3.50,
        "hours": 1.2
      }
    },
    "weekly": {
      "totalTokens": 2250000,
      "totalCost": 45.67,
      "opusHoursUsed": 12.5,
      "sonnetHoursUsed": 95.3
    },
    "limits": {
      "weeklyOpusHours": 35,
      "weeklySonnetHours": 280
    },
    "timestamp": "2025-08-19T10:30:00Z"
  }
}
```

#### 3. Get Agent Metrics
```
GET /api/v1/ai/usage/agents/{agentId}

Response:
{
  "success": true,
  "data": {
    "agentId": "agent-123",
    "metrics": [
      {
        "timestamp": "2025-08-19T10:00:00Z",
        "model": "claude-3-opus-20240229",
        "inputTokens": 5000,
        "outputTokens": 2500,
        "duration": 15000,
        "cost": 0.56
      }
    ]
  }
}
```

#### 4. Get Alerts
```
GET /api/v1/ai/usage/alerts
Query Parameters:
  - acknowledged?: boolean
  - level?: 'info' | 'warning' | 'critical'
  - limit?: number

Response:
{
  "success": true,
  "data": {
    "alerts": [
      {
        "id": "alert-123",
        "type": "threshold",
        "level": "warning",
        "threshold": 70,
        "currentUsage": 24.5,
        "limit": 35,
        "message": "Opus usage at 70% of weekly limit",
        "timestamp": "2025-08-19T09:00:00Z",
        "acknowledged": false
      }
    ]
  }
}
```

#### 5. Acknowledge Alert
```
POST /api/v1/ai/usage/alerts/{alertId}/acknowledge

Response:
{
  "success": true,
  "message": "Alert acknowledged"
}
```

#### 6. Get Usage Report
```
GET /api/v1/ai/usage/report
Query Parameters:
  - startDate: ISO date string
  - endDate: ISO date string
  - format?: 'json' | 'csv'

Response:
{
  "success": true,
  "data": {
    "report": {
      "period": {
        "start": "2025-08-01T00:00:00Z",
        "end": "2025-08-19T23:59:59Z"
      },
      "totalCost": 234.56,
      "totalHours": {
        "opus": 67.8,
        "sonnet": 456.7
      },
      "dailyBreakdown": [...],
      "topAgents": [...],
      "costProjection": {
        "monthly": 456.78,
        "weekly": 105.67
      }
    }
  }
}
```

## Integration Requirements

### 1. Agent Spawner Integration

```typescript
// In agent-spawner.service.ts
import { enhancedUsageMonitor } from './usage-monitor.service';

// After spawning agent
const startTime = Date.now();

// On agent completion
claudeProcess.on('exit', async (code) => {
  const duration = Date.now() - startTime;
  
  // Extract token usage from output
  const tokenUsage = this.extractTokenUsage(agent.output);
  
  // Track usage
  await enhancedUsageMonitor.trackUsage({
    agentId: agent.id,
    agentType: agent.type,
    model: this.getModelFromConfig(agentConfig),
    inputTokens: tokenUsage.input,
    outputTokens: tokenUsage.output,
    duration,
    cost: 0, // Will be calculated
    timestamp: new Date(),
    sessionId: task.context?.sessionId || 'unknown',
    userId: task.context?.userId || 'system',
    taskId: task.id,
    metadata: {
      exitCode: code,
      taskDescription: task.description
    }
  });
});
```

### 2. Controller Integration

```typescript
// In ai-orchestration.controller.ts
import { enhancedUsageMonitor } from '../services/ai-orchestration/usage-monitor.service';

// Add usage endpoints
router.get('/usage/summary', async (req, res) => {
  const { period = 'weekly', userId } = req.query;
  const summary = await enhancedUsageMonitor.getUsageSummary(
    period as any,
    userId || req.userId
  );
  res.json({ success: true, data: summary });
});

router.get('/usage/realtime', async (req, res) => {
  const usage = await enhancedUsageMonitor.getRealTimeUsage(req.userId);
  res.json({ success: true, data: usage });
});

router.get('/usage/agents/:agentId', async (req, res) => {
  const metrics = await enhancedUsageMonitor.getAgentMetrics(req.params.agentId);
  res.json({ success: true, data: { agentId: req.params.agentId, metrics } });
});
```

## Security Specifications

### Access Control
- All endpoints require authentication (JWT)
- User can only access their own usage data
- Admin role can access all users' data
- Service-to-service communication uses API keys

### Data Privacy
- No sensitive task content stored in usage metrics
- Metadata sanitized before storage
- PII excluded from logs
- Encrypted Redis connection required in production

### Rate Limiting
- Usage API endpoints: 100 requests per minute
- Real-time endpoint: 10 requests per minute
- Report generation: 5 requests per hour

## Performance Requirements

### Response Times
- Real-time usage: < 100ms
- Summary generation: < 500ms
- Report generation: < 2s
- Alert creation: < 50ms

### Scalability
- Support 1000+ concurrent agents
- Handle 10,000+ metrics per minute
- Store 90 days of historical data
- Process aggregations within 5 minutes

### Reliability
- 99.9% uptime for tracking
- Fallback to file storage if database fails
- Automatic recovery from Redis disconnection
- No data loss during service restart

## Implementation Guidelines

### Phase 1: Core Service (Days 1-2)
1. Implement EnhancedUsageMonitorService class
2. Set up Redis connection and data structures
3. Create database migrations
4. Implement basic tracking functionality

### Phase 2: Integration (Days 3-4)
1. Integrate with agent-spawner service
2. Add usage tracking to all agent operations
3. Implement token extraction logic
4. Test with multiple agent types

### Phase 3: API Endpoints (Days 5-6)
1. Create REST API endpoints
2. Implement authentication middleware
3. Add request validation
4. Create API documentation

### Phase 4: Alerts & Analytics (Days 7-8)
1. Implement threshold checking
2. Create alert system
3. Build aggregation jobs
4. Implement report generation

### Phase 5: Dashboard & Testing (Days 9-10)
1. Create dashboard API integration
2. Implement comprehensive tests
3. Performance optimization
4. Documentation and deployment

## Testing Requirements

### Unit Tests
```typescript
describe('EnhancedUsageMonitorService', () => {
  it('should track usage metrics correctly');
  it('should calculate costs accurately');
  it('should trigger alerts at thresholds');
  it('should handle Redis disconnection');
  it('should aggregate data correctly');
});
```

### Integration Tests
```typescript
describe('Usage Monitoring Integration', () => {
  it('should track agent spawning and completion');
  it('should store metrics in database');
  it('should update Redis counters');
  it('should generate accurate reports');
});
```

### Performance Tests
- Load test with 1000 concurrent metric submissions
- Verify sub-100ms response times
- Test memory usage under load
- Validate data consistency

## Deployment Considerations

### Environment Variables
```
REDIS_URL=redis://localhost:6379
DATABASE_URL=postgresql://...
USAGE_MONITOR_ENABLED=true
ALERT_WEBHOOK_URL=https://...
FALLBACK_STORAGE_PATH=/var/log/usage
```

### Monitoring
- Prometheus metrics for service health
- Grafana dashboards for usage visualization
- AlertManager for critical alerts
- ELK stack for log aggregation

### Backup Strategy
- Daily database backups
- Redis persistence enabled
- Fallback file storage
- Export to S3 for long-term storage

## Appendices

### A. Token Extraction Patterns
```typescript
// Claude CLI output patterns
const TOKEN_PATTERNS = {
  opus: /Input: (\d+) tokens.*Output: (\d+) tokens/,
  sonnet: /Tokens used: (\d+) input, (\d+) output/,
  haiku: /Usage: \{input: (\d+), output: (\d+)\}/
};
```

### B. Cost Calculation Formula
```
Cost = (InputTokens / 1,000,000) * InputPrice + (OutputTokens / 1,000,000) * OutputPrice
```

### C. Alert Webhook Payload
```json
{
  "alert": {
    "id": "alert-123",
    "type": "threshold",
    "level": "critical",
    "message": "Opus usage at 90% of weekly limit",
    "currentUsage": 31.5,
    "limit": 35,
    "timestamp": "2025-08-19T10:00:00Z"
  },
  "user": {
    "id": "user-123",
    "email": "user@example.com"
  }
}
```

---

**Document Version**: 1.0.0  
**Last Updated**: 2025-08-19  
**Author**: Technical Architect Agent  
**Status**: COMPLETE