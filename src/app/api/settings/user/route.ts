import { NextRequest, NextResponse } from 'next/server';
import { SettingsService } from '@/services/settings.service';
import { requireAuth } from '@/modules/ums/middleware/auth';
import { z } from 'zod';

const settingsService = new SettingsService();

const userSettingsSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  displayName: z.string().optional(),
  phone: z.string().optional(),
  bio: z.string().optional(),
  language: z.string().optional(),
  timezone: z.string().optional(),
  dateFormat: z.string().optional(),
  timeFormat: z.string().optional(),
  firstDayOfWeek: z.string().optional(),
  profileVisibility: z.string().optional(),
  showEmail: z.boolean().optional(),
  showPhone: z.boolean().optional(),
  showLocation: z.boolean().optional(),
  allowMessages: z.boolean().optional(),
  allowInvites: z.boolean().optional()
});

const aiAssistantSettingsSchema = z.object({
  responseTimeout: z.number().min(10).max(300),
  maxContextMessages: z.number().min(1).max(50),
  modelSelection: z.string(),
  temperature: z.number().min(0).max(1),
  maxTokens: z.number().min(100).max(8192),
  languagePreference: z.string(),
  autoSaveConversations: z.boolean(),
  debugMode: z.boolean()
});

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await requireAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const userId = authResult.userId!;
    const category = searchParams.get('category');

    const settings = await settingsService.getUserConfig(userId, undefined, category);
    
    // If it's an array, return the array for category-specific requests
    if (category) {
      return NextResponse.json(settings);
    }
    
    // Transform array of configs to object for general requests
    const settingsObject = Array.isArray(settings) ? settings.reduce((acc: any, config: any) => {
      acc[config.key] = config.value;
      return acc;
    }, {}) : settings;

    return NextResponse.json({ 
      success: true,
      settings: settingsObject 
    });
  } catch (error) {
    console.error('Failed to load user settings:', error);
    return NextResponse.json(
      { error: 'Failed to load settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await requireAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const userId = authResult.userId!;

    const body = await request.json();
    const { category, settings } = body;
    
    // Handle both ai-assistant and ai_assistant naming
    const normalizedCategory = category === 'ai-assistant' ? 'ai_assistant' : category;

    let validatedData;
    let settingCategory = normalizedCategory;

    // Validate based on category
    if (normalizedCategory === 'ai_assistant' || normalizedCategory === 'ai-assistant') {
      validatedData = aiAssistantSettingsSchema.parse(settings);
      settingCategory = 'ai_assistant';
    } else {
      // Handle regular user settings
      validatedData = userSettingsSchema.parse(settings || body);
    }
    
    // Save each setting
    const configs = Object.entries(validatedData).map(([key, value]) => ({
      key,
      value,
      category: settingCategory || getSettingCategory(key)
    }));

    await settingsService.setUserConfigs(userId, configs);

    return NextResponse.json({ 
      success: true,
      message: 'Settings saved successfully' 
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid settings data', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Failed to save user settings:', error);
    return NextResponse.json(
      { error: 'Failed to save settings' },
      { status: 500 }
    );
  }
}

function getSettingCategory(key: string): string {
  const categories: Record<string, string[]> = {
    profile: ['firstName', 'lastName', 'displayName', 'phone', 'bio'],
    preferences: ['language', 'timezone', 'dateFormat', 'timeFormat', 'firstDayOfWeek'],
    privacy: ['profileVisibility', 'showEmail', 'showPhone', 'showLocation', 'allowMessages', 'allowInvites']
  };

  for (const [category, keys] of Object.entries(categories)) {
    if (keys.includes(key)) {
      return category;
    }
  }
  
  return 'general';
}