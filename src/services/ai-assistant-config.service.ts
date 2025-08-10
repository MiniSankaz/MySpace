import { SettingsService } from './settings.service';

export interface AIAssistantConfig {
  responseTimeout: number;
  maxContextMessages: number;
  modelSelection: string;
  temperature: number;
  maxTokens: number;
  languagePreference: string;
  autoSaveConversations: boolean;
  debugMode: boolean;
}

export class AIAssistantConfigService {
  private static instance: AIAssistantConfigService;
  private settingsService: SettingsService;
  private configCache: Map<string, AIAssistantConfig> = new Map();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes
  private lastCacheUpdate = 0;

  private constructor() {
    this.settingsService = new SettingsService();
  }

  static getInstance(): AIAssistantConfigService {
    if (!AIAssistantConfigService.instance) {
      AIAssistantConfigService.instance = new AIAssistantConfigService();
    }
    return AIAssistantConfigService.instance;
  }

  /**
   * Invalidate cached configuration for a user
   */
  invalidateUserCache(userId: string): void {
    const cacheKey = `user_${userId}`;
    this.configCache.delete(cacheKey);
  }

  /**
   * Get AI Assistant configuration for a user
   */
  async getUserConfig(userId: string): Promise<AIAssistantConfig> {
    // Check cache first
    const cacheKey = `user_${userId}`;
    const now = Date.now();
    
    if (this.configCache.has(cacheKey) && (now - this.lastCacheUpdate) < this.cacheTimeout) {
      return this.configCache.get(cacheKey)!;
    }

    try {
      // Load from database
      const userSettings = await this.settingsService.getUserConfig(userId, undefined, 'ai_assistant');
      
      // Convert array to config object
      const configObj: Partial<AIAssistantConfig> = {};
      if (Array.isArray(userSettings)) {
        userSettings.forEach(setting => {
          (configObj as any)[setting.key] = setting.value;
        });
      }

      // Merge with defaults
      const defaultConfig = this.settingsService.getDefaultAIAssistantSettings();
      const finalConfig = { ...defaultConfig, ...configObj } as AIAssistantConfig;

      // Cache the result
      this.configCache.set(cacheKey, finalConfig);
      this.lastCacheUpdate = now;

      return finalConfig;
    } catch (error) {
      console.error('Failed to load AI Assistant config for user:', userId, error);
      // Return defaults on error
      return this.settingsService.getDefaultAIAssistantSettings();
    }
  }

  /**
   * Get system-wide AI Assistant configuration
   */
  async getSystemConfig(): Promise<AIAssistantConfig> {
    const cacheKey = 'system_config';
    const now = Date.now();
    
    if (this.configCache.has(cacheKey) && (now - this.lastCacheUpdate) < this.cacheTimeout) {
      return this.configCache.get(cacheKey)!;
    }

    try {
      const systemSettings = await this.settingsService.getSystemConfig(undefined, 'ai_assistant');
      
      // Convert array to config object
      const configObj: Partial<AIAssistantConfig> = {};
      if (Array.isArray(systemSettings)) {
        systemSettings.forEach(setting => {
          (configObj as any)[setting.key] = setting.value;
        });
      }

      // Merge with defaults
      const defaultConfig = this.settingsService.getDefaultAIAssistantSettings();
      const finalConfig = { ...defaultConfig, ...configObj } as AIAssistantConfig;

      // Cache the result
      this.configCache.set(cacheKey, finalConfig);
      this.lastCacheUpdate = now;

      return finalConfig;
    } catch (error) {
      console.error('Failed to load system AI Assistant config:', error);
      // Return defaults on error
      return this.settingsService.getDefaultAIAssistantSettings();
    }
  }

  /**
   * Clear cache for a specific user or all cache
   */
  clearCache(userId?: string): void {
    if (userId) {
      this.configCache.delete(`user_${userId}`);
    } else {
      this.configCache.clear();
      this.lastCacheUpdate = 0;
    }
  }

  /**
   * Get configuration with fallback hierarchy: User -> System -> Defaults
   */
  async getEffectiveConfig(userId?: string): Promise<AIAssistantConfig> {
    try {
      if (userId) {
        // Try user config first
        const userConfig = await this.getUserConfig(userId);
        return userConfig;
      } else {
        // Fall back to system config
        return await this.getSystemConfig();
      }
    } catch (error) {
      console.error('Failed to get effective AI Assistant config:', error);
      return this.settingsService.getDefaultAIAssistantSettings();
    }
  }

  /**
   * Helper methods for specific configuration values
   */
  async getResponseTimeout(userId?: string): Promise<number> {
    const config = await this.getEffectiveConfig(userId);
    return config.responseTimeout * 1000; // Convert to milliseconds
  }

  async getMaxContextMessages(userId?: string): Promise<number> {
    const config = await this.getEffectiveConfig(userId);
    return config.maxContextMessages;
  }

  async getModelSelection(userId?: string): Promise<string> {
    const config = await this.getEffectiveConfig(userId);
    return config.modelSelection;
  }

  async getTemperature(userId?: string): Promise<number> {
    const config = await this.getEffectiveConfig(userId);
    return config.temperature;
  }

  async getMaxTokens(userId?: string): Promise<number> {
    const config = await this.getEffectiveConfig(userId);
    return config.maxTokens;
  }

  async getLanguagePreference(userId?: string): Promise<string> {
    const config = await this.getEffectiveConfig(userId);
    return config.languagePreference;
  }

  async shouldAutoSaveConversations(userId?: string): Promise<boolean> {
    const config = await this.getEffectiveConfig(userId);
    return config.autoSaveConversations;
  }

  async isDebugMode(userId?: string): Promise<boolean> {
    const config = await this.getEffectiveConfig(userId);
    return config.debugMode;
  }

  /**
   * Update user configuration
   */
  async updateUserConfig(userId: string, config: Partial<AIAssistantConfig>): Promise<void> {
    const configs = Object.entries(config).map(([key, value]) => ({
      key,
      value,
      category: 'ai_assistant'
    }));

    await this.settingsService.setUserConfigs(userId, configs);
    
    // Clear cache for this user
    this.clearCache(userId);
  }

  /**
   * Get configuration formatted for Claude services
   */
  async getClaudeConfig(userId?: string): Promise<{
    timeout: number;
    maxContextMessages: number;
    temperature: number;
    maxTokens: number;
    debugMode: boolean;
  }> {
    const config = await this.getEffectiveConfig(userId);
    
    return {
      timeout: config.responseTimeout * 1000, // Convert to milliseconds
      maxContextMessages: config.maxContextMessages,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      debugMode: config.debugMode
    };
  }
}