import { prisma } from '@/core/database/prisma';

interface ConfigValue {
  id?: string;
  key: string;
  value: any;
  category: string;
  description?: string;
  type?: string;
  isActive?: boolean;
}

export class SettingsService {
  /**
   * System Configuration (Global)
   */
  async getSystemConfig(key?: string, category?: string) {
    if (key) {
      const config = await prisma.systemConfig.findUnique({
        where: { key }
      });
      return config ? config.value : null;
    }

    const where = category ? { category } : {};
    return await prisma.systemConfig.findMany({
      where,
      orderBy: [{ category: 'asc' }, { key: 'asc' }]
    });
  }

  async setSystemConfig(key: string, value: any, category: string, description?: string) {
    return await prisma.systemConfig.upsert({
      where: { key },
      create: {
        id: `sysconfig_${key}_${Date.now()}`,
        key,
        value,
        type: typeof value,
        category,
        description,
        isPublic: false,
        isEditable: true,
        updatedAt: new Date()
      },
      update: {
        value,
        type: typeof value,
        category,
        description
      }
    });
  }

  async deleteSystemConfig(key: string) {
    return await prisma.systemConfig.delete({
      where: { key }
    });
  }

  /**
   * User Configuration (Per User)
   */
  async getUserConfig(userId: string, key?: string, category?: string) {
    if (key) {
      const config = await prisma.userConfig.findUnique({
        where: { userId_key: { userId, key } }
      });
      return config ? config.value : null;
    }

    const where: any = { userId };
    if (category) where.category = category;

    return await prisma.userConfig.findMany({
      where,
      orderBy: [{ category: 'asc' }, { key: 'asc' }]
    });
  }

  async setUserConfig(userId: string, key: string, value: any, category: string) {
    return await prisma.userConfig.upsert({
      where: { userId_key: { userId, key } },
      create: {
        userId,
        key,
        value,
        category
      },
      update: {
        value,
        category
      }
    });
  }

  async deleteUserConfig(userId: string, key: string) {
    return await prisma.userConfig.delete({
      where: { userId_key: { userId, key } }
    });
  }

  async deleteAllUserConfigs(userId: string, category?: string) {
    const where: any = { userId };
    if (category) where.category = category;

    return await prisma.userConfig.deleteMany({ where });
  }

  /**
   * API Configuration (Per User API Settings)
   */
  async getApiConfig(userId: string, key?: string, category?: string) {
    if (key) {
      const config = await prisma.apiConfig.findUnique({
        where: { userId_key: { userId, key } }
      });
      return config ? config.value : null;
    }

    const where: any = { userId, isActive: true };
    if (category) where.category = category;

    return await prisma.apiConfig.findMany({
      where,
      orderBy: [{ category: 'asc' }, { key: 'asc' }]
    });
  }

  async setApiConfig(userId: string, key: string, value: any, category: string, description?: string) {
    return await prisma.apiConfig.upsert({
      where: { userId_key: { userId, key } },
      create: {
        userId,
        key,
        value,
        category,
        description,
        isActive: true
      },
      update: {
        value,
        category,
        description
      }
    });
  }

  async toggleApiConfig(userId: string, key: string, isActive: boolean) {
    return await prisma.apiConfig.update({
      where: { userId_key: { userId, key } },
      data: { isActive }
    });
  }

  async deleteApiConfig(userId: string, key: string) {
    return await prisma.apiConfig.delete({
      where: { userId_key: { userId, key } }
    });
  }

  /**
   * Bulk operations
   */
  async setUserConfigs(userId: string, configs: ConfigValue[]) {
    const operations = configs.map(config => 
      prisma.userConfig.upsert({
        where: { userId_key: { userId, key: config.key } },
        create: {
          userId,
          key: config.key,
          value: config.value,
          category: config.category
        },
        update: {
          value: config.value,
          category: config.category
        }
      })
    );

    return await prisma.$transaction(operations);
  }

  async setApiConfigs(userId: string, configs: ConfigValue[]) {
    const operations = configs.map(config => 
      prisma.apiConfig.upsert({
        where: { userId_key: { userId, key: config.key } },
        create: {
          userId,
          key: config.key,
          value: config.value,
          category: config.category,
          description: config.description,
          isActive: config.isActive !== false
        },
        update: {
          value: config.value,
          category: config.category,
          description: config.description,
          isActive: config.isActive !== false
        }
      })
    );

    return await prisma.$transaction(operations);
  }

  /**
   * Default configurations
   */
  getDefaultUserSettings() {
    return {
      preferences: {
        theme: 'light',
        language: 'en',
        timezone: 'UTC',
        dateFormat: 'MM/DD/YYYY',
        timeFormat: '12h',
        firstDayOfWeek: 'sunday'
      },
      notifications: {
        email: true,
        push: false,
        sms: false,
        desktop: true,
        sound: true,
        vibration: true
      },
      privacy: {
        profileVisibility: 'public',
        showEmail: false,
        showPhone: false,
        showLocation: false,
        allowMessages: true,
        allowInvites: true
      },
      display: {
        density: 'comfortable',
        fontSize: 'medium',
        animations: true,
        reducedMotion: false,
        highContrast: false,
        colorBlindMode: 'none'
      }
    };
  }

  getDefaultApiSettings() {
    return {
      limits: {
        maxRequestsPerHour: 1000,
        maxRequestsPerDay: 10000,
        maxTokensPerRequest: 4000,
        maxConcurrentRequests: 10,
        requestTimeout: 30000
      },
      webhooks: {
        enabled: false,
        retryAttempts: 3,
        retryDelay: 1000,
        timeout: 5000,
        verifySSL: true
      },
      integrations: {
        github: { enabled: false },
        gitlab: { enabled: false },
        slack: { enabled: false },
        discord: { enabled: false },
        webhook: { enabled: false }
      },
      security: {
        ipWhitelist: [],
        ipBlacklist: [],
        requireHTTPS: true,
        enableCORS: false,
        allowedOrigins: [],
        enableRateLimiting: true
      }
    };
  }

  getDefaultSystemSettings() {
    return {
      api: {
        defaultRateLimit: 1000,
        maxRateLimit: 10000,
        defaultTokenExpiry: '30d',
        maxTokenExpiry: '1y',
        enablePublicAPI: true,
        requireEmailVerification: false
      },
      user: {
        allowRegistration: true,
        requireEmailVerification: false,
        passwordMinLength: 8,
        passwordRequireUppercase: true,
        passwordRequireLowercase: true,
        passwordRequireNumbers: true,
        passwordRequireSpecial: false,
        sessionTimeout: '24h',
        maxLoginAttempts: 5,
        lockoutDuration: '30m'
      },
      system: {
        maintenanceMode: false,
        debugMode: false,
        logLevel: 'info',
        maxUploadSize: '10MB',
        allowedFileTypes: ['jpg', 'png', 'pdf', 'doc', 'docx'],
        dataRetentionDays: 90
      },
      email: {
        provider: 'smtp',
        from: 'noreply@example.com',
        smtpHost: 'smtp.gmail.com',
        smtpPort: 587,
        smtpSecure: false,
        smtpUser: '',
        smtpPass: ''
      },
      storage: {
        provider: 'local',
        localPath: './uploads',
        s3Bucket: '',
        s3Region: '',
        s3AccessKey: '',
        s3SecretKey: '',
        maxFileSize: '10MB'
      },
      security: {
        enableTwoFactor: false,
        enableCaptcha: false,
        captchaProvider: 'recaptcha',
        captchaSiteKey: '',
        captchaSecretKey: '',
        enableCSRF: true,
        enableXSS: true
      }
    };
  }
}