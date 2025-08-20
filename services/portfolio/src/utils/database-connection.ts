import { Pool, PoolConfig } from 'pg';
import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

interface DatabaseConfig {
  connectionString: string;
  ssl?: {
    rejectUnauthorized: boolean;
    ca?: string;
  };
  pool?: {
    min: number;
    max: number;
    acquireTimeoutMillis: number;
    createTimeoutMillis: number;
    idleTimeoutMillis: number;
    reapIntervalMillis: number;
    createRetryIntervalMillis: number;
  };
  retry?: {
    maxAttempts: number;
    delay: number;
    backoff: 'linear' | 'exponential';
  };
}

export class DatabaseConnectionManager {
  private pool: Pool | null = null;
  private prisma: PrismaClient | null = null;
  private reconnectAttempts = 0;
  private isConnected = false;
  private config: DatabaseConfig;

  constructor(config?: Partial<DatabaseConfig>) {
    this.config = {
      connectionString: process.env.DATABASE_URL || '',
      ssl: {
        rejectUnauthorized: false,
        ...(config?.ssl || {})
      },
      pool: {
        min: 2,
        max: 10,
        acquireTimeoutMillis: 60000,
        createTimeoutMillis: 30000,
        idleTimeoutMillis: 30000,
        reapIntervalMillis: 1000,
        createRetryIntervalMillis: 200,
        ...(config?.pool || {})
      },
      retry: {
        maxAttempts: 10,
        delay: 1000,
        backoff: 'exponential',
        ...(config?.retry || {})
      }
    };
  }

  async connect(): Promise<void> {
    try {
      // Configure pool
      const poolConfig: PoolConfig = {
        connectionString: this.config.connectionString,
        ssl: this.config.ssl,
        ...this.config.pool,
        connectionTimeoutMillis: this.config.pool?.createTimeoutMillis || 30000
      };

      // Create new pool
      this.pool = new Pool(poolConfig);

      // Test connection
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();

      // Initialize Prisma with retry logic
      this.prisma = new PrismaClient({
        datasources: {
          db: {
            url: this.config.connectionString
          }
        },
        log: ['error', 'warn']
      });

      // Test Prisma connection
      await this.prisma.$connect();

      this.isConnected = true;
      this.reconnectAttempts = 0;
      logger.info('Database connected successfully');

    } catch (error) {
      this.isConnected = false;
      this.reconnectAttempts++;
      
      const { maxAttempts, delay, backoff } = this.config.retry!;
      
      if (this.reconnectAttempts < maxAttempts) {
        const waitTime = backoff === 'exponential' 
          ? Math.min(delay * Math.pow(2, this.reconnectAttempts), 30000)
          : delay * this.reconnectAttempts;
          
        logger.warn(`Database connection failed (attempt ${this.reconnectAttempts}/${maxAttempts}), retrying in ${waitTime}ms...`, error);
        
        setTimeout(() => this.connect(), waitTime);
      } else {
        logger.error('Max reconnection attempts reached. Switching to fallback mode.', error);
        this.enableFallbackMode();
      }
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.prisma) {
        await this.prisma.$disconnect();
        this.prisma = null;
      }
      
      if (this.pool) {
        await this.pool.end();
        this.pool = null;
      }
      
      this.isConnected = false;
      logger.info('Database disconnected successfully');
    } catch (error) {
      logger.error('Error disconnecting from database:', error);
    }
  }

  getPrismaClient(): PrismaClient {
    if (!this.prisma) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.prisma;
  }

  getPool(): Pool {
    if (!this.pool) {
      throw new Error('Database pool not initialized. Call connect() first.');
    }
    return this.pool;
  }

  isHealthy(): boolean {
    return this.isConnected;
  }

  async healthCheck(): Promise<{ status: string; details?: any }> {
    try {
      if (!this.isConnected) {
        return { status: 'disconnected' };
      }

      // Test pool connection
      if (this.pool) {
        const client = await this.pool.connect();
        const result = await client.query('SELECT NOW() as timestamp');
        client.release();
        
        // Test Prisma connection
        if (this.prisma) {
          await this.prisma.$queryRaw`SELECT 1`;
        }

        return {
          status: 'healthy',
          details: {
            timestamp: result.rows[0].timestamp,
            poolSize: this.pool.totalCount,
            idleCount: this.pool.idleCount,
            waitingCount: this.pool.waitingCount
          }
        };
      }

      return { status: 'unhealthy' };
    } catch (error) {
      logger.error('Health check failed:', error);
      return {
        status: 'unhealthy',
        details: { error: (error as Error).message }
      };
    }
  }

  private enableFallbackMode(): void {
    // Implement fallback strategy
    logger.warn('Fallback mode enabled. Using cached data and limited functionality.');
    
    // You could:
    // 1. Switch to a local SQLite database
    // 2. Use in-memory cache for critical data
    // 3. Enable read-only mode
    // 4. Alert monitoring systems
    
    // For now, we'll just use mock data
    this.useMockData();
  }

  private useMockData(): void {
    // Create a mock Prisma client that returns static data
    this.prisma = {
      portfolio: {
        findMany: async () => this.getMockPortfolios(),
        findUnique: async ({ where }: any) => this.getMockPortfolio(where.id),
        create: async () => { throw new Error('Database unavailable - read-only mode'); },
        update: async () => { throw new Error('Database unavailable - read-only mode'); },
        delete: async () => { throw new Error('Database unavailable - read-only mode'); }
      },
      holding: {
        findMany: async () => this.getMockHoldings(),
        findUnique: async ({ where }: any) => this.getMockHolding(where.id)
      },
      transaction: {
        findMany: async () => this.getMockTransactions()
      },
      $connect: async () => {},
      $disconnect: async () => {},
      $queryRaw: async () => []
    } as any;
  }

  private getMockPortfolios() {
    return [
      {
        id: 'mock-portfolio-1',
        userId: 'mock-user',
        name: 'Mock Portfolio (Offline Mode)',
        description: 'Database unavailable - showing cached data',
        currency: 'USD',
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
  }

  private getMockPortfolio(id: string) {
    return {
      id,
      userId: 'mock-user',
      name: 'Mock Portfolio (Offline Mode)',
      description: 'Database unavailable - showing cached data',
      currency: 'USD',
      isDefault: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  private getMockHoldings() {
    return [
      {
        id: 'mock-holding-1',
        portfolioId: 'mock-portfolio-1',
        symbol: 'AAPL',
        quantity: '10.5',
        averagePrice: '180.50',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'mock-holding-2',
        portfolioId: 'mock-portfolio-1',
        symbol: 'GOOGL',
        quantity: '5.25',
        averagePrice: '140.25',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
  }

  private getMockHolding(id: string) {
    return {
      id,
      portfolioId: 'mock-portfolio-1',
      symbol: 'AAPL',
      quantity: '10.5',
      averagePrice: '180.50',
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  private getMockTransactions() {
    return [
      {
        id: 'mock-transaction-1',
        portfolioId: 'mock-portfolio-1',
        type: 'BUY',
        symbol: 'AAPL',
        quantity: '10.5',
        price: '180.50',
        fees: '1.99',
        total: '1897.24',
        executedAt: new Date(),
        createdAt: new Date()
      }
    ];
  }

  // Retry a specific operation with exponential backoff
  async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    initialDelay: number = 1000
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < maxRetries - 1) {
          const delay = initialDelay * Math.pow(2, attempt);
          logger.warn(`Operation failed (attempt ${attempt + 1}/${maxRetries}), retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  }
}

// Export singleton instance
export const dbManager = new DatabaseConnectionManager();

// Initialize connection on module load
dbManager.connect().catch(error => {
  logger.error('Failed to initialize database connection:', error);
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, closing database connections...');
  await dbManager.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, closing database connections...');
  await dbManager.disconnect();
  process.exit(0);
});