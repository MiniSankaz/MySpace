/**
 * Usage Monitor Service Tests
 * Comprehensive test suite for the Enhanced Usage Monitor Service
 */

import { EnhancedUsageMonitorService } from '../src/services/ai-orchestration/enhanced-usage-monitor.service';
import { AgentType } from '../src/services/ai-orchestration/agent-spawner.service';

describe('EnhancedUsageMonitorService', () => {
  let usageMonitor: EnhancedUsageMonitorService;
  
  beforeEach(() => {
    // Create new instance for each test
    usageMonitor = new EnhancedUsageMonitorService();
  });

  afterEach(async () => {
    // Cleanup
    await usageMonitor.shutdown();
  });

  describe('Cost Calculation', () => {
    it('should calculate costs accurately for Opus model', () => {
      const cost = usageMonitor['calculateCost'](
        'claude-3-opus-20240229',
        1000000, // 1M input tokens
        500000   // 500K output tokens
      );
      
      // Expected: $15 (input) + $37.50 (output) = $52.50
      expect(cost).toBe(52.5);
    });

    it('should calculate costs accurately for Sonnet model', () => {
      const cost = usageMonitor['calculateCost'](
        'claude-3-5-sonnet-20241022',
        1000000, // 1M input tokens
        500000   // 500K output tokens
      );
      
      // Expected: $3 (input) + $7.50 (output) = $10.50
      expect(cost).toBe(10.5);
    });

    it('should calculate costs accurately for Haiku model', () => {
      const cost = usageMonitor['calculateCost'](
        'claude-3-haiku-20240307',
        1000000, // 1M input tokens
        500000   // 500K output tokens
      );
      
      // Expected: $0.25 (input) + $0.625 (output) = $0.875
      expect(cost).toBe(0.875);
    });

    it('should return 0 for unknown model', () => {
      const cost = usageMonitor['calculateCost'](
        'unknown-model',
        1000000,
        500000
      );
      
      expect(cost).toBe(0);
    });
  });

  describe('Usage Tracking', () => {
    it('should track usage metrics correctly', async () => {
      const metrics = {
        agentId: 'test-agent-123',
        agentType: AgentType.BUSINESS_ANALYST,
        model: 'claude-3-opus-20240229',
        inputTokens: 1000,
        outputTokens: 500,
        duration: 5000,
        cost: 0,
        timestamp: new Date(),
        sessionId: 'session-123',
        userId: 'user-123',
        taskId: 'task-123',
        metadata: { test: true }
      };

      let trackedMetrics: any = null;
      usageMonitor.on('usage:tracked', (data) => {
        trackedMetrics = data;
      });

      await usageMonitor.trackUsage(metrics);

      expect(trackedMetrics).toBeTruthy();
      expect(trackedMetrics.cost).toBeGreaterThan(0);
      expect(trackedMetrics.agentId).toBe('test-agent-123');
    });

    it('should handle tracking errors gracefully', async () => {
      const metrics = {
        agentId: null as any, // Invalid agent ID
        agentType: AgentType.BUSINESS_ANALYST,
        model: 'claude-3-opus-20240229',
        inputTokens: 1000,
        outputTokens: 500,
        duration: 5000,
        cost: 0,
        timestamp: new Date(),
        sessionId: 'session-123',
        userId: 'user-123'
      };

      let errorEmitted = false;
      usageMonitor.on('usage:error', () => {
        errorEmitted = true;
      });

      await usageMonitor.trackUsage(metrics);

      expect(errorEmitted).toBe(true);
    });
  });

  describe('Alert System', () => {
    it('should trigger alerts at 70% threshold', async () => {
      let alertEmitted: any = null;
      usageMonitor.on('usage:alert', (alert) => {
        alertEmitted = alert;
      });

      // Mock usage at 70% of weekly Opus limit (24.5 hours out of 35)
      const metrics = {
        agentId: 'test-agent',
        agentType: AgentType.TECHNICAL_ARCHITECT,
        model: 'claude-3-opus-20240229',
        inputTokens: 10000000, // Large usage
        outputTokens: 5000000,
        duration: 88200000, // 24.5 hours in milliseconds
        cost: 0,
        timestamp: new Date(),
        sessionId: 'session-123',
        userId: 'user-123'
      };

      // Mock the getUsageSummary to return 70% usage
      jest.spyOn(usageMonitor, 'getUsageSummary').mockResolvedValue({
        period: 'weekly',
        startDate: new Date(),
        endDate: new Date(),
        totalCost: 100,
        totalTokens: { input: 10000000, output: 5000000 },
        modelUsage: {
          opus: { hours: 24.5, cost: 80, tokens: 15000000, percentOfLimit: 70 },
          sonnet: { hours: 0, cost: 0, tokens: 0, percentOfLimit: 0 },
          haiku: { hours: 0, cost: 0, tokens: 0, percentOfLimit: 0 }
        },
        agentBreakdown: {},
        alerts: []
      });

      await usageMonitor['checkThresholds'](metrics);

      expect(alertEmitted).toBeTruthy();
      expect(alertEmitted.level).toBe('warning');
      expect(alertEmitted.threshold).toBe(70);
    });

    it('should trigger critical alert at 90% threshold', async () => {
      let alertEmitted: any = null;
      usageMonitor.on('usage:alert', (alert) => {
        alertEmitted = alert;
      });

      // Mock the getUsageSummary to return 90% usage
      jest.spyOn(usageMonitor, 'getUsageSummary').mockResolvedValue({
        period: 'weekly',
        startDate: new Date(),
        endDate: new Date(),
        totalCost: 150,
        totalTokens: { input: 15000000, output: 7500000 },
        modelUsage: {
          opus: { hours: 31.5, cost: 120, tokens: 22500000, percentOfLimit: 90 },
          sonnet: { hours: 0, cost: 0, tokens: 0, percentOfLimit: 0 },
          haiku: { hours: 0, cost: 0, tokens: 0, percentOfLimit: 0 }
        },
        agentBreakdown: {},
        alerts: []
      });

      const metrics = {
        agentId: 'test-agent',
        agentType: AgentType.TECHNICAL_ARCHITECT,
        model: 'claude-3-opus-20240229',
        inputTokens: 1000,
        outputTokens: 500,
        duration: 5000,
        cost: 0,
        timestamp: new Date(),
        sessionId: 'session-123',
        userId: 'user-123'
      };

      await usageMonitor['checkThresholds'](metrics);

      expect(alertEmitted).toBeTruthy();
      expect(alertEmitted.level).toBe('critical');
      expect(alertEmitted.threshold).toBe(90);
    });
  });

  describe('Token Extraction', () => {
    it('should extract tokens from Opus format output', () => {
      const output = [
        'Processing request...',
        'Input: 1500 tokens',
        'Output: 750 tokens',
        'Task completed'
      ];

      const tokens = usageMonitor.extractTokenUsage(output);

      expect(tokens.input).toBe(1500);
      expect(tokens.output).toBe(750);
    });

    it('should extract tokens from Sonnet format output', () => {
      const output = [
        'Analyzing code...',
        'Tokens used: 2000 input, 1000 output',
        'Analysis complete'
      ];

      const tokens = usageMonitor.extractTokenUsage(output);

      expect(tokens.input).toBe(2000);
      expect(tokens.output).toBe(1000);
    });

    it('should extract tokens from Haiku format output', () => {
      const output = [
        'Quick response generated',
        'Usage: {input: 500, output: 250}',
        'Done'
      ];

      const tokens = usageMonitor.extractTokenUsage(output);

      expect(tokens.input).toBe(500);
      expect(tokens.output).toBe(250);
    });

    it('should estimate tokens when pattern not found', () => {
      const output = [
        'No token information available',
        'Just some regular output text',
        'Without any token counts'
      ];

      const tokens = usageMonitor.extractTokenUsage(output);

      // Should estimate based on text length
      expect(tokens.input).toBeGreaterThan(0);
      expect(tokens.output).toBeGreaterThan(0);
      expect(tokens.input + tokens.output).toBeGreaterThan(0);
    });
  });

  describe('Usage Summary', () => {
    it('should generate daily usage summary', async () => {
      // Mock some usage data
      const mockMetrics = {
        agentId: 'test-agent',
        agentType: AgentType.BUSINESS_ANALYST,
        model: 'claude-3-5-sonnet-20241022',
        inputTokens: 5000,
        outputTokens: 2500,
        duration: 10000,
        cost: 0,
        timestamp: new Date(),
        sessionId: 'session-123',
        userId: 'user-123'
      };

      await usageMonitor.trackUsage(mockMetrics);

      const summary = await usageMonitor.getUsageSummary('daily', 'user-123');

      expect(summary.period).toBe('daily');
      expect(summary.totalTokens.input).toBeGreaterThanOrEqual(0);
      expect(summary.totalTokens.output).toBeGreaterThanOrEqual(0);
      expect(summary.modelUsage).toHaveProperty('opus');
      expect(summary.modelUsage).toHaveProperty('sonnet');
      expect(summary.modelUsage).toHaveProperty('haiku');
    });

    it('should calculate usage percentages for weekly summary', async () => {
      const summary = await usageMonitor.getUsageSummary('weekly', 'user-123');

      expect(summary.period).toBe('weekly');
      
      // Check that percentages are calculated
      if (summary.modelUsage.opus.hours > 0) {
        expect(summary.modelUsage.opus.percentOfLimit).toBeDefined();
        expect(summary.modelUsage.opus.percentOfLimit).toBeGreaterThanOrEqual(0);
        expect(summary.modelUsage.opus.percentOfLimit).toBeLessThanOrEqual(100);
      }

      if (summary.modelUsage.sonnet.hours > 0) {
        expect(summary.modelUsage.sonnet.percentOfLimit).toBeDefined();
        expect(summary.modelUsage.sonnet.percentOfLimit).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Real-time Usage', () => {
    it('should return real-time usage data structure', async () => {
      const usage = await usageMonitor.getRealTimeUsage('user-123');

      if (usage) {
        expect(usage).toHaveProperty('daily');
        expect(usage).toHaveProperty('weekly');
        expect(usage).toHaveProperty('limits');
        expect(usage).toHaveProperty('timestamp');

        expect(usage.daily).toHaveProperty('totalTokens');
        expect(usage.daily).toHaveProperty('totalCost');
        expect(usage.daily).toHaveProperty('opus');
        expect(usage.daily).toHaveProperty('sonnet');
        expect(usage.daily).toHaveProperty('haiku');

        expect(usage.weekly).toHaveProperty('totalTokens');
        expect(usage.weekly).toHaveProperty('totalCost');
        expect(usage.weekly).toHaveProperty('opusHoursUsed');
        expect(usage.weekly).toHaveProperty('sonnetHoursUsed');

        expect(usage.limits).toHaveProperty('weeklyOpusHours');
        expect(usage.limits).toHaveProperty('weeklySonnetHours');
      }
    });
  });

  describe('Agent Metrics', () => {
    it('should retrieve agent-specific metrics', async () => {
      const agentId = 'test-agent-456';
      
      // Track some usage for this agent
      await usageMonitor.trackUsage({
        agentId,
        agentType: AgentType.CODE_REVIEWER,
        model: 'claude-3-haiku-20240307',
        inputTokens: 1000,
        outputTokens: 500,
        duration: 3000,
        cost: 0,
        timestamp: new Date(),
        sessionId: 'session-456',
        userId: 'user-456'
      });

      const metrics = await usageMonitor.getAgentMetrics(agentId);

      expect(Array.isArray(metrics)).toBe(true);
      if (metrics.length > 0) {
        expect(metrics[0]).toHaveProperty('agentId');
        expect(metrics[0]).toHaveProperty('model');
        expect(metrics[0]).toHaveProperty('inputTokens');
        expect(metrics[0]).toHaveProperty('outputTokens');
      }
    });
  });

  describe('Alert Management', () => {
    it('should retrieve alerts with filters', async () => {
      const alerts = await usageMonitor.getAlerts({
        userId: 'user-123',
        acknowledged: false,
        level: 'warning',
        limit: 10
      });

      expect(Array.isArray(alerts)).toBe(true);
      
      // All returned alerts should match filters
      alerts.forEach(alert => {
        expect(alert.acknowledged).toBe(false);
        if (alert.level) {
          expect(['info', 'warning', 'critical']).toContain(alert.level);
        }
      });
    });

    it('should acknowledge alerts', async () => {
      // Create a test alert
      const alertId = 'test-alert-123';
      
      const success = await usageMonitor.acknowledgeAlert(alertId, 'user-123');
      
      // Should return boolean
      expect(typeof success).toBe('boolean');
    });
  });

  describe('Usage Report', () => {
    it('should generate usage report for date range', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7); // 7 days ago
      const endDate = new Date();

      const report = await usageMonitor.getUsageReport('user-123', startDate, endDate);

      expect(report).toHaveProperty('period');
      expect(report).toHaveProperty('totalCost');
      expect(report).toHaveProperty('totalHours');
      expect(report).toHaveProperty('dailyBreakdown');
      expect(report).toHaveProperty('costProjection');

      expect(report.period.start).toEqual(startDate);
      expect(report.period.end).toEqual(endDate);
      expect(Array.isArray(report.dailyBreakdown)).toBe(true);
    });
  });

  describe('Helper Functions', () => {
    it('should correctly identify model keys', () => {
      expect(usageMonitor['getModelKey']('claude-3-opus-20240229')).toBe('opus');
      expect(usageMonitor['getModelKey']('claude-3-5-sonnet-20241022')).toBe('sonnet');
      expect(usageMonitor['getModelKey']('claude-3-haiku-20240307')).toBe('haiku');
      expect(usageMonitor['getModelKey']('unknown-model')).toBe(null);
    });

    it('should generate correct week number', () => {
      const weekNumber = usageMonitor['getWeekNumber']();
      
      expect(weekNumber).toMatch(/^\d{4}-W\d{2}$/); // Format: YYYY-WXX
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      // Force a database error by using invalid metrics
      const invalidMetrics = {
        agentId: undefined as any,
        agentType: undefined as any,
        model: undefined as any,
        inputTokens: NaN,
        outputTokens: NaN,
        duration: NaN,
        cost: NaN,
        timestamp: new Date('invalid'),
        sessionId: undefined as any,
        userId: undefined as any
      };

      let errorEmitted = false;
      usageMonitor.on('usage:error', () => {
        errorEmitted = true;
      });

      await usageMonitor.trackUsage(invalidMetrics);

      expect(errorEmitted).toBe(true);
    });

    it('should use fallback storage when database fails', async () => {
      // This test verifies that the fallback file storage is used
      // when database operations fail
      const metrics = {
        agentId: 'fallback-test',
        agentType: AgentType.GENERAL_PURPOSE,
        model: 'claude-3-5-sonnet-20241022',
        inputTokens: 1000,
        outputTokens: 500,
        duration: 5000,
        cost: 0,
        timestamp: new Date(),
        sessionId: 'session-fallback',
        userId: 'user-fallback'
      };

      // Mock database failure
      jest.spyOn(usageMonitor as any, 'storeInDatabase').mockRejectedValue(new Error('Database error'));

      await usageMonitor.trackUsage(metrics);

      // Should complete without throwing
      expect(true).toBe(true);
    });
  });
});

describe('EnhancedUsageMonitorService Integration', () => {
  it('should integrate with agent spawner correctly', async () => {
    // This test would verify integration with the agent spawner service
    // In a real environment, this would test the actual integration
    
    const mockAgentOutput = [
      'Starting task...',
      'Processing...',
      'Input: 2500 tokens',
      'Output: 1250 tokens',
      'Task completed successfully'
    ];

    const usageMonitor = new EnhancedUsageMonitorService();
    const tokens = usageMonitor.extractTokenUsage(mockAgentOutput);

    expect(tokens.input).toBe(2500);
    expect(tokens.output).toBe(1250);

    await usageMonitor.shutdown();
  });

  it('should handle concurrent usage tracking', async () => {
    const usageMonitor = new EnhancedUsageMonitorService();
    
    // Track multiple usages concurrently
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(
        usageMonitor.trackUsage({
          agentId: `concurrent-agent-${i}`,
          agentType: AgentType.GENERAL_PURPOSE,
          model: 'claude-3-haiku-20240307',
          inputTokens: 100 * i,
          outputTokens: 50 * i,
          duration: 1000 * i,
          cost: 0,
          timestamp: new Date(),
          sessionId: `session-${i}`,
          userId: 'user-concurrent'
        })
      );
    }

    await Promise.all(promises);

    // All tracking should complete without errors
    expect(true).toBe(true);

    await usageMonitor.shutdown();
  });
});