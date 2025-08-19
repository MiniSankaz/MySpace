/**
 * Development Mode Configuration
 * Controls offline mode, mock data, and fallback behaviors
 */

export interface DevelopmentConfig {
  // Core Settings
  enableOfflineMode: boolean;
  enableMockData: boolean;
  enableDatabaseFallback: boolean;
  enableAutoRetry: boolean;

  // Database Settings
  databaseTimeout: number;
  databaseRetryAttempts: number;
  databaseRetryDelay: number;

  // Cache Settings
  enableCaching: boolean;
  cacheUserDataTTL: number;
  cacheSessionTTL: number;
  cacheApiResponseTTL: number;

  // Mock Data Settings
  mockResponseDelay: number;
  mockErrorRate: number;

  // Feature Flags
  features: {
    useLocalAuth: boolean;
    useLocalStorage: boolean;
    useMemoryCache: boolean;
    useMockApi: boolean;
    showOfflineIndicator: boolean;
    enableSyncOnReconnect: boolean;
  };
}

const isDevelopment = process.env.NODE_ENV === "development";
const isOfflineMode = process.env.OFFLINE_MODE === "true";
const forceOffline = process.env.FORCE_OFFLINE === "true";

export const developmentConfig: DevelopmentConfig = {
  // Enable offline mode in development or when explicitly set
  enableOfflineMode: isDevelopment || isOfflineMode || forceOffline,

  // Enable mock data when database is unavailable
  enableMockData: isDevelopment || isOfflineMode,

  // Enable automatic fallback when database fails
  enableDatabaseFallback: true,

  // Enable automatic retry for failed requests
  enableAutoRetry: true,

  // Database timeout in milliseconds (5 seconds for development)
  databaseTimeout: isDevelopment ? 5000 : 30000,

  // Number of retry attempts
  databaseRetryAttempts: 3,

  // Delay between retries in milliseconds
  databaseRetryDelay: 1000,

  // Enable caching for better offline experience
  enableCaching: true,

  // Cache TTL in milliseconds
  cacheUserDataTTL: 24 * 60 * 60 * 1000, // 24 hours
  cacheSessionTTL: 7 * 24 * 60 * 60 * 1000, // 7 days
  cacheApiResponseTTL: 5 * 60 * 1000, // 5 minutes

  // Mock response delay for realistic behavior
  mockResponseDelay: isDevelopment ? 100 : 0,

  // Mock error rate for testing (0-1)
  mockErrorRate: 0,

  // Feature flags
  features: {
    // Use local authentication without database
    useLocalAuth: isDevelopment || forceOffline,

    // Use localStorage for persistence
    useLocalStorage: true,

    // Use in-memory cache
    useMemoryCache: true,

    // Use mock API responses
    useMockApi: isDevelopment && (isOfflineMode || forceOffline),

    // Show offline indicator in UI
    showOfflineIndicator: true,

    // Enable automatic sync when connection restored
    enableSyncOnReconnect: true,
  },
};

/**
 * Check if offline mode is enabled
 */
export function isOfflineModeEnabled(): boolean {
  return developmentConfig.enableOfflineMode || forceOffline;
}

/**
 * Check if mock data should be used
 */
export function shouldUseMockData(): boolean {
  return developmentConfig.enableMockData || forceOffline;
}

/**
 * Check if caching is enabled
 */
export function isCachingEnabled(): boolean {
  return developmentConfig.enableCaching;
}

/**
 * Get feature flag value
 */
export function getFeatureFlag(
  flag: keyof DevelopmentConfig["features"],
): boolean {
  return developmentConfig.features[flag];
}

/**
 * Override configuration at runtime
 */
export function overrideConfig(overrides: Partial<DevelopmentConfig>): void {
  Object.assign(developmentConfig, overrides);
}

// Export default config
export default developmentConfig;
