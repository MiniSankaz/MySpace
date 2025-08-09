import { NextRequest, NextResponse } from 'next/server';
import { SettingsService } from '@/services/settings.service';
import { prisma } from '@/core/database/prisma';
import { z } from 'zod';

const settingsService = new SettingsService();

const systemSettingsSchema = z.object({
  maintenanceMode: z.boolean().optional(),
  maintenanceMessage: z.string().optional(),
  debugMode: z.boolean().optional(),
  logLevel: z.string().optional(),
  maxUploadSize: z.string().optional(),
  dataRetentionDays: z.number().optional(),
  connectionPoolSize: z.number().optional(),
  queryTimeout: z.number().optional(),
  enableQueryLogging: z.boolean().optional(),
  backupSchedule: z.string().optional(),
  backupRetentionDays: z.number().optional(),
  cacheEnabled: z.boolean().optional(),
  cacheTTL: z.number().optional(),
  compressionEnabled: z.boolean().optional(),
  minifyAssets: z.boolean().optional(),
  cdnEnabled: z.boolean().optional(),
  cdnUrl: z.string().optional()
});

export async function GET(request: NextRequest) {
  try {
    // TODO: Add proper authentication
    const userId = 'test-user-id'; // Replace with actual user ID from session
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { roles: true }
    });

    if (!user?.roles?.includes('admin')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const settings = await settingsService.getSystemConfig();
    
    // Transform array of configs to object
    const settingsObject = settings.reduce((acc: any, config: any) => {
      acc[config.key] = config.value;
      return acc;
    }, settingsService.getDefaultSystemSettings());

    return NextResponse.json({ 
      success: true,
      settings: settingsObject 
    });
  } catch (error) {
    console.error('Failed to load system settings:', error);
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

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { roles: true }
    });

    if (!user?.roles?.includes('admin')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = systemSettingsSchema.parse(body);
    
    // Save each setting
    for (const [key, value] of Object.entries(validatedData)) {
      await settingsService.setSystemConfig(
        key,
        value,
        getSettingCategory(key),
        getSettingDescription(key)
      );
    }

    return NextResponse.json({ 
      success: true,
      message: 'System settings saved successfully' 
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid settings data', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Failed to save system settings:', error);
    return NextResponse.json(
      { error: 'Failed to save settings' },
      { status: 500 }
    );
  }
}

function getSettingCategory(key: string): string {
  const categories: Record<string, string[]> = {
    system: ['maintenanceMode', 'maintenanceMessage', 'debugMode', 'logLevel', 'maxUploadSize', 'dataRetentionDays'],
    database: ['connectionPoolSize', 'queryTimeout', 'enableQueryLogging', 'backupSchedule', 'backupRetentionDays'],
    performance: ['cacheEnabled', 'cacheTTL', 'compressionEnabled', 'minifyAssets', 'cdnEnabled', 'cdnUrl']
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
    maintenanceMode: 'Enable maintenance mode',
    maintenanceMessage: 'Message to display during maintenance',
    debugMode: 'Enable debug mode',
    logLevel: 'Logging level',
    maxUploadSize: 'Maximum file upload size',
    dataRetentionDays: 'Number of days to retain data',
    connectionPoolSize: 'Database connection pool size',
    queryTimeout: 'Database query timeout',
    enableQueryLogging: 'Enable database query logging',
    backupSchedule: 'Backup schedule frequency',
    backupRetentionDays: 'Number of days to retain backups',
    cacheEnabled: 'Enable caching',
    cacheTTL: 'Cache time-to-live in seconds',
    compressionEnabled: 'Enable response compression',
    minifyAssets: 'Minify CSS and JavaScript assets',
    cdnEnabled: 'Enable CDN for static assets',
    cdnUrl: 'CDN base URL'
  };

  return descriptions[key] || '';
}