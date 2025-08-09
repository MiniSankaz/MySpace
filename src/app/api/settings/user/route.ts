import { NextRequest, NextResponse } from 'next/server';
import { SettingsService } from '@/services/settings.service';
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

export async function GET(request: NextRequest) {
  try {
    // TODO: Add proper authentication
    const userId = 'test-user-id'; // Replace with actual user ID from session
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settings = await settingsService.getUserConfig(userId);
    
    // Transform array of configs to object
    const settingsObject = settings.reduce((acc: any, config: any) => {
      acc[config.key] = config.value;
      return acc;
    }, {});

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
    // TODO: Add proper authentication
    const userId = 'test-user-id'; // Replace with actual user ID from session
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = userSettingsSchema.parse(body);
    
    // Save each setting
    const configs = Object.entries(validatedData).map(([key, value]) => ({
      key,
      value,
      category: getSettingCategory(key)
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