import { NextRequest, NextResponse } from 'next/server';
import { SettingsService } from '@/services/settings.service';
import { z } from 'zod';

const settingsService = new SettingsService();

const apiSettingsSchema = z.object({
  maxRequestsPerHour: z.number().optional(),
  maxRequestsPerDay: z.number().optional(),
  maxTokensPerRequest: z.number().optional(),
  maxConcurrentRequests: z.number().optional(),
  requestTimeout: z.number().optional(),
  enableRateLimiting: z.boolean().optional(),
  webhookEnabled: z.boolean().optional(),
  webhookUrl: z.string().optional(),
  webhookSecret: z.string().optional(),
  webhookRetryAttempts: z.number().optional(),
  webhookRetryDelay: z.number().optional(),
  webhookTimeout: z.number().optional(),
  webhookVerifySSL: z.boolean().optional(),
  webhookEvents: z.array(z.string()).optional(),
  ipWhitelist: z.array(z.string()).optional(),
  ipBlacklist: z.array(z.string()).optional(),
  requireHTTPS: z.boolean().optional(),
  enableCORS: z.boolean().optional(),
  allowedOrigins: z.array(z.string()).optional()
});

export async function GET(request: NextRequest) {
  try {
    // TODO: Add proper authentication
    const userId = 'test-user-id'; // Replace with actual user ID from session
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settings = await settingsService.getApiConfig(userId);
    
    // Transform array of configs to object
    const settingsObject = settings.reduce((acc: any, config: any) => {
      acc[config.key] = config.value;
      return acc;
    }, settingsService.getDefaultApiSettings());

    return NextResponse.json({ 
      success: true,
      settings: settingsObject 
    });
  } catch (error) {
    console.error('Failed to load API settings:', error);
    return NextResponse.json(
      { error: 'Failed to load settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // TODO: Add proper authentication
    const userId = 'test-user-id'; // Replace with actual user ID from session
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = apiSettingsSchema.parse(body);
    
    // Save each setting
    const configs = Object.entries(validatedData).map(([key, value]) => ({
      key,
      value,
      category: getSettingCategory(key),
      description: getSettingDescription(key)
    }));

    await settingsService.setApiConfigs(userId, configs);

    return NextResponse.json({ 
      success: true,
      message: 'API settings saved successfully' 
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid settings data', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Failed to save API settings:', error);
    return NextResponse.json(
      { error: 'Failed to save settings' },
      { status: 500 }
    );
  }
}

function getSettingCategory(key: string): string {
  const categories: Record<string, string[]> = {
    limits: ['maxRequestsPerHour', 'maxRequestsPerDay', 'maxTokensPerRequest', 'maxConcurrentRequests', 'requestTimeout', 'enableRateLimiting'],
    webhooks: ['webhookEnabled', 'webhookUrl', 'webhookSecret', 'webhookRetryAttempts', 'webhookRetryDelay', 'webhookTimeout', 'webhookVerifySSL', 'webhookEvents'],
    security: ['ipWhitelist', 'ipBlacklist', 'requireHTTPS', 'enableCORS', 'allowedOrigins']
  };

  for (const [category, keys] of Object.entries(categories)) {
    if (keys.includes(key)) {
      return category;
    }
  }
  
  return 'general';
}

function getSettingDescription(key: string): string {
  const descriptions: Record<string, string> = {
    maxRequestsPerHour: 'Maximum API requests allowed per hour',
    maxRequestsPerDay: 'Maximum API requests allowed per day',
    maxTokensPerRequest: 'Maximum tokens allowed per request',
    maxConcurrentRequests: 'Maximum concurrent requests allowed',
    requestTimeout: 'Request timeout in milliseconds',
    enableRateLimiting: 'Enable rate limiting for API requests',
    webhookEnabled: 'Enable webhook notifications',
    webhookUrl: 'Webhook endpoint URL',
    webhookSecret: 'Secret for webhook signature verification',
    webhookRetryAttempts: 'Number of retry attempts for failed webhooks',
    webhookRetryDelay: 'Delay between webhook retry attempts',
    webhookTimeout: 'Webhook request timeout',
    webhookVerifySSL: 'Verify SSL certificates for webhook requests',
    webhookEvents: 'Events to trigger webhooks',
    ipWhitelist: 'Allowed IP addresses',
    ipBlacklist: 'Blocked IP addresses',
    requireHTTPS: 'Require HTTPS for API requests',
    enableCORS: 'Enable CORS for API requests',
    allowedOrigins: 'Allowed origins for CORS'
  };

  return descriptions[key] || '';
}