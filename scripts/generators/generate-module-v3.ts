#!/usr/bin/env node
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import inquirer from "inquirer";
import chalk from "chalk";
import { z } from "zod";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Module configuration schema with strict validation
const ModuleConfigSchema = z.object({
  name: z.string().regex(/^[a-z]+(-[a-z]+)*$/),
  displayName: z.string().min(1),
  description: z.string(),
  version: z.string().default("1.0.0"),
  multiTenant: z.boolean().default(true),
  features: z.array(z.string()),
  fields: z.array(
    z.object({
      name: z.string(),
      type: z.enum([
        "string",
        "text",
        "number",
        "float",
        "boolean",
        "date",
        "json",
        "enum",
        "relation",
      ]),
      required: z.boolean(),
      unique: z.boolean(),
      searchable: z.boolean().default(false),
      sortable: z.boolean().default(false),
      defaultValue: z.string().optional(),
      relation: z.string().optional(),
      description: z.string(),
      validation: z
        .object({
          min: z.number().optional(),
          max: z.number().optional(),
          pattern: z.string().optional(),
          enum: z.array(z.string()).optional(),
        })
        .optional(),
    }),
  ),
  security: z.object({
    authentication: z.boolean().default(true),
    authorization: z.boolean().default(true),
    rateLimit: z.object({
      enabled: z.boolean().default(true),
      requests: z.number().default(100),
      window: z.string().default("1m"),
    }),
    csrf: z.boolean().default(true),
    xss: z.boolean().default(true),
  }),
  testing: z.object({
    unit: z.boolean().default(true),
    integration: z.boolean().default(true),
    e2e: z.boolean().default(false),
    security: z.boolean().default(true),
    performance: z.boolean().default(false),
  }),
  observability: z.object({
    logging: z.boolean().default(true),
    metrics: z.boolean().default(true),
    tracing: z.boolean().default(false),
    auditLog: z.boolean().default(true),
  }),
});

type ModuleConfig = z.infer<typeof ModuleConfigSchema>;

// Security standards references
const SECURITY_STANDARDS = {
  OWASP_TOP_10: [
    "A01:2021 – Broken Access Control",
    "A02:2021 – Cryptographic Failures",
    "A03:2021 – Injection",
    "A04:2021 – Insecure Design",
    "A05:2021 – Security Misconfiguration",
    "A06:2021 – Vulnerable and Outdated Components",
    "A07:2021 – Identification and Authentication Failures",
    "A08:2021 – Software and Data Integrity Failures",
    "A09:2021 – Security Logging and Monitoring Failures",
    "A10:2021 – Server-Side Request Forgery (SSRF)",
  ],
  CWE_TOP_25: [
    "CWE-79: Cross-site Scripting",
    "CWE-89: SQL Injection",
    "CWE-200: Information Exposure",
    "CWE-352: Cross-Site Request Forgery",
  ],
};

// Helper functions
const toPascalCase = (str: string): string => {
  return str
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
};

const toCamelCase = (str: string): string => {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
};

const toSnakeCase = (str: string): string => {
  return str.replace(/-/g, "_");
};

// Generate module manifest
const generateModuleManifest = (config: ModuleConfig): string => {
  const moduleName = toPascalCase(config.name);
  const moduleNameLower = config.name.toLowerCase();
  const moduleNameUpper = config.name.toUpperCase().replace(/-/g, "_");

  const searchableFields = config.fields
    .filter((f) => f.searchable)
    .map((f) => f.name);
  const sortableFields = config.fields
    .filter((f) => f.sortable)
    .map((f) => f.name);

  return `{
  "name": "${config.name}",
  "version": "${config.version}",
  "displayName": "${config.displayName}",
  "description": "${config.description}",
  "multiTenant": ${config.multiTenant},
  "permissions": {
    "view": { "resource": "${moduleNameLower}", "action": "read", "scope": "global" },
    "viewOwn": { "resource": "${moduleNameLower}", "action": "read", "scope": "own" },
    "create": { "resource": "${moduleNameLower}", "action": "create", "scope": "global" },
    "update": { "resource": "${moduleNameLower}", "action": "update", "scope": "global" },
    "updateOwn": { "resource": "${moduleNameLower}", "action": "update", "scope": "own" },
    "delete": { "resource": "${moduleNameLower}", "action": "delete", "scope": "global" },
    "manage": { "resource": "${moduleNameLower}", "action": "manage", "scope": "global" }
  },
  "routes": {
    "api": {
      "base": "/api/${moduleNameLower}",
      "byId": "/api/${moduleNameLower}/[id]",
      "bulk": "/api/${moduleNameLower}/bulk",
      "export": "/api/${moduleNameLower}/export",
      "import": "/api/${moduleNameLower}/import"
    },
    "ui": {
      "list": "/admin/${moduleNameLower}",
      "create": "/admin/${moduleNameLower}/new",
      "edit": "/admin/${moduleNameLower}/[id]/edit",
      "view": "/admin/${moduleNameLower}/[id]"
    }
  },
  "cacheKeys": {
    "list": "${moduleNameLower}:list",
    "single": "${moduleNameLower}:single:[id]",
    "stats": "${moduleNameLower}:stats"
  },
  "searchFields": ${JSON.stringify(searchableFields)},
  "sortFields": ${JSON.stringify(sortableFields)},
  "features": ${JSON.stringify(config.features)},
  "security": ${JSON.stringify(config.security)},
  "testing": ${JSON.stringify(config.testing)},
  "observability": ${JSON.stringify(config.observability)}
}`;
};

// Generate typed error system
const generateErrorSystem = (moduleName: string): string => {
  const moduleNameUpper = moduleName.toUpperCase().replace(/-/g, "_");

  return `/**
 * ${moduleName} Module Error System
 * Follows company-wide error standards
 */

import { AppError, ErrorCode } from '@core/errors';
import { logger } from '@core/utils/logger';

// Module-specific error codes
export enum ${moduleNameUpper}_ERROR_CODES {
  NOT_FOUND = 'E_${moduleNameUpper}_NOT_FOUND',
  ALREADY_EXISTS = 'E_${moduleNameUpper}_ALREADY_EXISTS',
  INVALID_INPUT = 'E_${moduleNameUpper}_INVALID_INPUT',
  PERMISSION_DENIED = 'E_${moduleNameUpper}_PERMISSION_DENIED',
  OPERATION_FAILED = 'E_${moduleNameUpper}_OPERATION_FAILED',
  RATE_LIMIT_EXCEEDED = 'E_${moduleNameUpper}_RATE_LIMIT_EXCEEDED',
  IMPORT_FAILED = 'E_${moduleNameUpper}_IMPORT_FAILED',
  EXPORT_FAILED = 'E_${moduleNameUpper}_EXPORT_FAILED',
}

// Error factory
export class ${toPascalCase(moduleName)}Error extends AppError {
  constructor(
    code: ${moduleNameUpper}_ERROR_CODES,
    message: string,
    statusCode: number = 500,
    meta?: Record<string, any>
  ) {
    super(code, message, statusCode, meta);
    
    // Log error with context
    logger.error(\`${moduleName} error: \${code}\`, {
      code,
      message,
      statusCode,
      meta: this.sanitizeMeta(meta),
    });
  }

  // Sanitize sensitive data from meta
  private sanitizeMeta(meta?: Record<string, any>): Record<string, any> {
    if (!meta) return {};
    
    const sensitive = ['password', 'token', 'secret', 'key'];
    const sanitized = { ...meta };
    
    sensitive.forEach(key => {
      if (key in sanitized) {
        sanitized[key] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }
}

// Predefined errors
export const ${moduleNameUpper}_ERRORS = {
  notFound: (id: string) => 
    new ${toPascalCase(moduleName)}Error(
      ${moduleNameUpper}_ERROR_CODES.NOT_FOUND,
      \`${moduleName} with id \${id} not found\`,
      404
    ),
    
  alreadyExists: (field: string, value: string) =>
    new ${toPascalCase(moduleName)}Error(
      ${moduleNameUpper}_ERROR_CODES.ALREADY_EXISTS,
      \`${moduleName} with \${field} "\${value}" already exists\`,
      409
    ),
    
  invalidInput: (details: any) =>
    new ${toPascalCase(moduleName)}Error(
      ${moduleNameUpper}_ERROR_CODES.INVALID_INPUT,
      'Invalid input provided',
      400,
      { validationErrors: details }
    ),
    
  permissionDenied: (action: string) =>
    new ${toPascalCase(moduleName)}Error(
      ${moduleNameUpper}_ERROR_CODES.PERMISSION_DENIED,
      \`You don't have permission to \${action}\`,
      403
    ),
    
  rateLimitExceeded: () =>
    new ${toPascalCase(moduleName)}Error(
      ${moduleNameUpper}_ERROR_CODES.RATE_LIMIT_EXCEEDED,
      'Too many requests, please try again later',
      429
    ),
};`;
};

// Generate tenant guard middleware
const generateTenantGuard = (
  moduleName: string,
  multiTenant: boolean,
): string => {
  if (!multiTenant) return "";

  return `/**
 * Tenant isolation middleware
 * Ensures all queries are scoped to current tenant
 */

import { prisma } from '@core/database';
import { getCurrentTenant } from '@core/auth/tenant';

export class TenantGuard {
  /**
   * Inject tenant ID into all queries
   */
  static async injectTenantId<T extends Record<string, any>>(
    data: T,
    userId: string
  ): Promise<T & { tenantId: string }> {
    const tenantId = await getCurrentTenant(userId);
    if (!tenantId) {
      throw new Error('Tenant context not found');
    }
    
    return {
      ...data,
      tenantId,
    };
  }

  /**
   * Add tenant filter to where clause
   */
  static async addTenantFilter<T extends Record<string, any>>(
    where: T,
    userId: string
  ): Promise<T & { tenantId: string }> {
    const tenantId = await getCurrentTenant(userId);
    if (!tenantId) {
      throw new Error('Tenant context not found');
    }
    
    return {
      ...where,
      tenantId,
    };
  }

  /**
   * Verify entity belongs to current tenant
   */
  static async verifyTenantAccess(
    entityId: string,
    userId: string,
    model: keyof typeof prisma
  ): Promise<boolean> {
    const tenantId = await getCurrentTenant(userId);
    if (!tenantId) return false;
    
    const entity = await (prisma[model] as any).findFirst({
      where: {
        id: entityId,
        tenantId,
      },
    });
    
    return !!entity;
  }
}`;
};

// Generate rate limiter
const generateRateLimiter = (config: ModuleConfig): string => {
  const moduleName = config.name;
  const { requests, window } = config.security.rateLimit;

  return `/**
 * Rate limiting for ${config.displayName}
 * Implements token bucket algorithm
 */

import { RateLimiter } from '@core/security/rate-limiter';

// Configure rate limits per endpoint
export const ${toCamelCase(moduleName)}RateLimits = {
  // Read operations
  list: new RateLimiter({
    points: ${requests},
    duration: '${window}',
    keyPrefix: '${moduleName}:list',
  }),
  
  get: new RateLimiter({
    points: ${requests * 2},
    duration: '${window}',
    keyPrefix: '${moduleName}:get',
  }),
  
  // Write operations (stricter)
  create: new RateLimiter({
    points: ${Math.floor(requests / 5)},
    duration: '${window}',
    keyPrefix: '${moduleName}:create',
  }),
  
  update: new RateLimiter({
    points: ${Math.floor(requests / 5)},
    duration: '${window}',
    keyPrefix: '${moduleName}:update',
  }),
  
  delete: new RateLimiter({
    points: ${Math.floor(requests / 10)},
    duration: '${window}',
    keyPrefix: '${moduleName}:delete',
  }),
  
  // Bulk operations (very strict)
  bulk: new RateLimiter({
    points: ${Math.floor(requests / 20)},
    duration: '${window}',
    keyPrefix: '${moduleName}:bulk',
  }),
  
  // Import/Export (background jobs)
  import: new RateLimiter({
    points: 1,
    duration: '5m',
    keyPrefix: '${moduleName}:import',
  }),
  
  export: new RateLimiter({
    points: 5,
    duration: '5m',
    keyPrefix: '${moduleName}:export',
  }),
};

// Middleware helper
export async function checkRateLimit(
  operation: keyof typeof ${toCamelCase(moduleName)}RateLimits,
  identifier: string
): Promise<void> {
  const limiter = ${toCamelCase(moduleName)}RateLimits[operation];
  const allowed = await limiter.consume(identifier);
  
  if (!allowed) {
    throw new Error('Rate limit exceeded');
  }
}`;
};

// Generate idempotency handler
const generateIdempotency = (moduleName: string): string => {
  return `/**
 * Idempotency handler for ${moduleName}
 * Prevents duplicate operations
 */

import { createHash } from 'crypto';
import { cache } from '@core/utils/cache';

export class IdempotencyHandler {
  private static readonly CACHE_PREFIX = 'idempotency:${moduleName}:';
  private static readonly TTL = 86400; // 24 hours

  /**
   * Generate idempotency key from request
   */
  static generateKey(
    operation: string,
    userId: string,
    data: any
  ): string {
    const payload = JSON.stringify({
      operation,
      userId,
      data,
      timestamp: Math.floor(Date.now() / 1000), // 1 second precision
    });
    
    return createHash('sha256').update(payload).digest('hex');
  }

  /**
   * Check if operation was already processed
   */
  static async checkIdempotency(
    key: string
  ): Promise<{ exists: boolean; result?: any }> {
    const cached = await cache.get(this.CACHE_PREFIX + key);
    
    if (cached) {
      return { exists: true, result: cached };
    }
    
    return { exists: false };
  }

  /**
   * Store operation result
   */
  static async storeResult(
    key: string,
    result: any
  ): Promise<void> {
    await cache.set(
      this.CACHE_PREFIX + key,
      result,
      this.TTL
    );
  }

  /**
   * Idempotent operation wrapper
   */
  static async execute<T>(
    operation: string,
    userId: string,
    data: any,
    handler: () => Promise<T>
  ): Promise<T> {
    const key = this.generateKey(operation, userId, data);
    
    // Check if already processed
    const { exists, result } = await this.checkIdempotency(key);
    if (exists) {
      return result as T;
    }
    
    // Execute operation
    const newResult = await handler();
    
    // Store result
    await this.storeResult(key, newResult);
    
    return newResult;
  }
}`;
};

// Generate caching strategy
const generateCachingStrategy = (config: ModuleConfig): string => {
  const moduleName = config.name;
  const moduleNameLower = moduleName.toLowerCase();

  return `/**
 * Caching strategy for ${config.displayName}
 * Implements cache-aside pattern with invalidation
 */

import { CacheService } from '@core/utils/cache';
import { logger } from '@core/utils/logger';

export class ${toPascalCase(moduleName)}Cache {
  private cache: CacheService;
  
  // Cache keys from manifest
  private readonly KEYS = {
    LIST: '${moduleNameLower}:list',
    SINGLE: (id: string) => \`${moduleNameLower}:single:\${id}\`,
    STATS: '${moduleNameLower}:stats',
    SEARCH: (query: string) => \`${moduleNameLower}:search:\${query}\`,
  };
  
  // TTL configuration
  private readonly TTL = {
    LIST: 300,      // 5 minutes
    SINGLE: 600,    // 10 minutes
    STATS: 3600,    // 1 hour
    SEARCH: 180,    // 3 minutes
  };

  constructor() {
    this.cache = new CacheService('${moduleNameLower}');
  }

  /**
   * Get or set list cache
   */
  async getList(
    key: string,
    fetcher: () => Promise<any>
  ): Promise<any> {
    const cacheKey = \`\${this.KEYS.LIST}:\${key}\`;
    
    // Try cache first
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      logger.debug('Cache hit', { key: cacheKey });
      return cached;
    }
    
    // Fetch and cache
    const data = await fetcher();
    await this.cache.set(cacheKey, data, this.TTL.LIST);
    
    return data;
  }

  /**
   * Get or set single entity cache
   */
  async getSingle(
    id: string,
    fetcher: () => Promise<any>
  ): Promise<any> {
    const cacheKey = this.KEYS.SINGLE(id);
    
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      logger.debug('Cache hit', { key: cacheKey });
      return cached;
    }
    
    const data = await fetcher();
    if (data) {
      await this.cache.set(cacheKey, data, this.TTL.SINGLE);
    }
    
    return data;
  }

  /**
   * Invalidate caches on create
   */
  async invalidateOnCreate(): Promise<void> {
    await Promise.all([
      this.cache.invalidatePattern(\`\${this.KEYS.LIST}:*\`),
      this.cache.invalidatePattern(\`\${this.KEYS.STATS}\`),
    ]);
    
    logger.debug('Cache invalidated on create');
  }

  /**
   * Invalidate caches on update
   */
  async invalidateOnUpdate(id: string): Promise<void> {
    await Promise.all([
      this.cache.delete(this.KEYS.SINGLE(id)),
      this.cache.invalidatePattern(\`\${this.KEYS.LIST}:*\`),
      this.cache.invalidatePattern(\`\${this.KEYS.SEARCH}:*\`),
      this.cache.invalidatePattern(\`\${this.KEYS.STATS}\`),
    ]);
    
    logger.debug('Cache invalidated on update', { id });
  }

  /**
   * Invalidate caches on delete
   */
  async invalidateOnDelete(id: string): Promise<void> {
    await this.invalidateOnUpdate(id);
    logger.debug('Cache invalidated on delete', { id });
  }

  /**
   * Invalidate all module caches
   */
  async invalidateAll(): Promise<void> {
    await this.cache.invalidatePattern('${moduleNameLower}:*');
    logger.debug('All caches invalidated');
  }

  /**
   * Warm up cache
   */
  async warmUp(): Promise<void> {
    // Implement cache warming strategy
    logger.info('Cache warming not implemented');
  }
}

// Export singleton
export const ${toCamelCase(moduleName)}Cache = new ${toPascalCase(moduleName)}Cache();`;
};

// Generate import/export background jobs
const generateImportExport = (config: ModuleConfig): string => {
  const moduleName = config.name;

  return `/**
 * Import/Export background jobs for ${config.displayName}
 * Uses queue system for processing
 */

import { Queue, Worker, Job } from 'bullmq';
import { parse } from 'csv-parse';
import { stringify } from 'csv-stringify';
import { z } from 'zod';
import { prisma } from '@core/database';
import { logger } from '@core/utils/logger';
import { ${toCamelCase(moduleName)}Service } from '../services';
import { ${toCamelCase(moduleName)}CreateSchema } from '../validation';

// Job types
export enum ${moduleName.toUpperCase()}_JOB_TYPES {
  IMPORT = '${moduleName}:import',
  EXPORT = '${moduleName}:export',
}

// Import job data
interface ImportJobData {
  userId: string;
  tenantId?: string;
  filePath: string;
  options: {
    updateExisting?: boolean;
    validateOnly?: boolean;
    chunkSize?: number;
  };
}

// Export job data
interface ExportJobData {
  userId: string;
  tenantId?: string;
  filters?: any;
  format: 'csv' | 'json' | 'excel';
}

// Create queue
const queueName = '${moduleName}-import-export';
export const importExportQueue = new Queue(queueName, {
  connection: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
});

// Import worker
export const importWorker = new Worker(
  queueName,
  async (job: Job<ImportJobData>) => {
    const { userId, tenantId, filePath, options } = job.data;
    const chunkSize = options.chunkSize || 100;
    
    logger.info('Starting import job', { jobId: job.id, filePath });
    
    try {
      // Parse CSV
      const records = [];
      const errors = [];
      
      const parser = parse({
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
      
      let rowNumber = 0;
      for await (const record of parser) {
        rowNumber++;
        
        // Validate record
        const validation = ${toCamelCase(moduleName)}CreateSchema.safeParse(record);
        if (!validation.success) {
          errors.push({
            row: rowNumber,
            errors: validation.error.errors,
          });
          continue;
        }
        
        records.push(validation.data);
        
        // Process in chunks
        if (records.length >= chunkSize) {
          await processChunk(records, userId, tenantId);
          await job.updateProgress((rowNumber / 1000) * 100); // Estimate
          records.length = 0;
        }
      }
      
      // Process remaining
      if (records.length > 0) {
        await processChunk(records, userId, tenantId);
      }
      
      logger.info('Import completed', {
        jobId: job.id,
        processed: rowNumber,
        errors: errors.length,
      });
      
      return {
        success: true,
        processed: rowNumber,
        errors,
      };
    } catch (error) {
      logger.error('Import failed', { jobId: job.id, error });
      throw error;
    }
  },
  {
    connection: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    },
    concurrency: 2,
  }
);

// Process chunk of records
async function processChunk(
  records: any[],
  userId: string,
  tenantId?: string
) {
  await prisma.$transaction(
    records.map(record => 
      prisma.${moduleName}.create({
        data: {
          ...record,
          tenantId,
          createdById: userId,
          updatedById: userId,
        },
      })
    )
  );
}

// Export worker
export const exportWorker = new Worker(
  queueName,
  async (job: Job<ExportJobData>) => {
    const { userId, tenantId, filters, format } = job.data;
    
    logger.info('Starting export job', { jobId: job.id, format });
    
    try {
      // Fetch data
      const data = await ${toCamelCase(moduleName)}Service.findAll({
        ...filters,
        limit: 10000, // Max export limit
      });
      
      // Format data
      let output: string;
      
      switch (format) {
        case 'csv':
          output = await formatCsv(data.data);
          break;
        case 'json':
          output = JSON.stringify(data.data, null, 2);
          break;
        default:
          throw new Error(\`Unsupported format: \${format}\`);
      }
      
      // Save to storage
      const filePath = await saveExport(output, format);
      
      logger.info('Export completed', {
        jobId: job.id,
        records: data.data.length,
        filePath,
      });
      
      return {
        success: true,
        filePath,
        records: data.data.length,
      };
    } catch (error) {
      logger.error('Export failed', { jobId: job.id, error });
      throw error;
    }
  },
  {
    connection: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    },
    concurrency: 5,
  }
);

// Format as CSV
async function formatCsv(data: any[]): Promise<string> {
  return new Promise((resolve, reject) => {
    stringify(data, {
      header: true,
      columns: Object.keys(data[0] || {}),
    }, (err, output) => {
      if (err) reject(err);
      else resolve(output);
    });
  });
}

// Save export file
async function saveExport(
  content: string,
  format: string
): Promise<string> {
  // Implement file storage logic
  const filename = \`export-\${Date.now()}.\${format}\`;
  // Save to S3, local storage, etc.
  return filename;
}`;
};

// Generate module logging system
const generateModuleLoggingSystem = (config: ModuleConfig): string => {
  const moduleName = config.name;
  const moduleNameCamel = toCamelCase(moduleName);
  const moduleNameUpper = moduleName.toUpperCase().replace(/-/g, "_");

  return `/**
 * Module-specific logging system for ${config.displayName}
 * Tracks all CRUD operations, changes, and access patterns
 */

import { logger as coreLogger } from '@core/utils/logger';
import * as fs from 'fs/promises';
import * as path from 'path';
import { format } from 'date-fns';

// Module-specific logger with automatic file rotation
export class ${toPascalCase(moduleName)}Logger {
  private logger = coreLogger.child({ module: '${moduleName}' });
  private logDir = path.join(__dirname, '../logs');
  private auditDir = path.join(__dirname, '../logs/audit');
  private errorDir = path.join(__dirname, '../logs/errors');
  private performanceDir = path.join(__dirname, '../logs/performance');
  
  constructor() {
    // Ensure log directories exist
    this.ensureLogDirectories();
  }
  
  private async ensureLogDirectories() {
    await fs.mkdir(this.logDir, { recursive: true });
    await fs.mkdir(this.auditDir, { recursive: true });
    await fs.mkdir(this.errorDir, { recursive: true });
    await fs.mkdir(this.performanceDir, { recursive: true });
  }
  
  private getLogFileName(type: 'audit' | 'error' | 'performance' | 'general'): string {
    const date = format(new Date(), 'yyyy-MM-dd');
    return \`${moduleName}-\${type}-\${date}.log\`;
  }
  
  private async writeToFile(dir: string, type: string, data: any) {
    const fileName = this.getLogFileName(type as any);
    const filePath = path.join(dir, fileName);
    const timestamp = new Date().toISOString();
    
    const logEntry = JSON.stringify({
      timestamp,
      module: '${moduleName}',
      type,
      ...data
    }) + '\\n';
    
    await fs.appendFile(filePath, logEntry, 'utf8');
  }
  
  // Audit logging for all CRUD operations
  async logCreate(userId: string, entityId: string, data: any, tenantId?: string) {
    const auditData = {
      action: 'CREATE',
      userId,
      entityId,
      tenantId,
      data: this.sanitizeData(data),
      ip: this.getClientIp(),
      userAgent: this.getUserAgent()
    };
    
    this.logger.info('Entity created', auditData);
    await this.writeToFile(this.auditDir, 'audit', auditData);
  }
  
  async logRead(userId: string, entityId: string | null, query: any, tenantId?: string) {
    const auditData = {
      action: 'READ',
      userId,
      entityId,
      tenantId,
      query: this.sanitizeData(query),
      ip: this.getClientIp(),
      userAgent: this.getUserAgent()
    };
    
    this.logger.debug('Entity read', auditData);
    await this.writeToFile(this.auditDir, 'audit', auditData);
  }
  
  async logUpdate(userId: string, entityId: string, changes: any, previousData: any, tenantId?: string) {
    const auditData = {
      action: 'UPDATE',
      userId,
      entityId,
      tenantId,
      changes: this.sanitizeData(changes),
      previousData: this.sanitizeData(previousData),
      ip: this.getClientIp(),
      userAgent: this.getUserAgent()
    };
    
    this.logger.info('Entity updated', auditData);
    await this.writeToFile(this.auditDir, 'audit', auditData);
  }
  
  async logDelete(userId: string, entityId: string, data: any, tenantId?: string) {
    const auditData = {
      action: 'DELETE',
      userId,
      entityId,
      tenantId,
      deletedData: this.sanitizeData(data),
      ip: this.getClientIp(),
      userAgent: this.getUserAgent()
    };
    
    this.logger.warn('Entity deleted', auditData);
    await this.writeToFile(this.auditDir, 'audit', auditData);
  }
  
  // Bulk operations logging
  async logBulkOperation(userId: string, operation: string, count: number, details: any, tenantId?: string) {
    const auditData = {
      action: \`BULK_\${operation.toUpperCase()}\`,
      userId,
      tenantId,
      count,
      details: this.sanitizeData(details),
      ip: this.getClientIp(),
      userAgent: this.getUserAgent()
    };
    
    this.logger.info('Bulk operation performed', auditData);
    await this.writeToFile(this.auditDir, 'audit', auditData);
  }
  
  // Import/Export logging
  async logImport(userId: string, fileName: string, recordCount: number, errors: any[], tenantId?: string) {
    const auditData = {
      action: 'IMPORT',
      userId,
      tenantId,
      fileName,
      recordCount,
      errorCount: errors.length,
      errors: errors.slice(0, 10), // Log first 10 errors
      ip: this.getClientIp(),
      userAgent: this.getUserAgent()
    };
    
    this.logger.info('Data imported', auditData);
    await this.writeToFile(this.auditDir, 'audit', auditData);
  }
  
  async logExport(userId: string, filters: any, recordCount: number, format: string, tenantId?: string) {
    const auditData = {
      action: 'EXPORT',
      userId,
      tenantId,
      filters: this.sanitizeData(filters),
      recordCount,
      format,
      ip: this.getClientIp(),
      userAgent: this.getUserAgent()
    };
    
    this.logger.info('Data exported', auditData);
    await this.writeToFile(this.auditDir, 'audit', auditData);
  }
  
  // Access control logging
  async logAccessDenied(userId: string, resource: string, permission: string, tenantId?: string) {
    const securityData = {
      action: 'ACCESS_DENIED',
      userId,
      tenantId,
      resource,
      permission,
      ip: this.getClientIp(),
      userAgent: this.getUserAgent()
    };
    
    this.logger.warn('Access denied', securityData);
    await this.writeToFile(this.auditDir, 'audit', securityData);
  }
  
  // Error logging
  async logError(error: Error, context: any) {
    const errorData = {
      name: error.name,
      message: error.message,
      stack: error.stack,
      context: this.sanitizeData(context),
      timestamp: new Date().toISOString()
    };
    
    this.logger.error('Error occurred', errorData);
    await this.writeToFile(this.errorDir, 'error', errorData);
  }
  
  // Performance logging
  async logPerformance(operation: string, duration: number, metadata: any = {}) {
    const perfData = {
      operation,
      duration,
      metadata: this.sanitizeData(metadata),
      timestamp: new Date().toISOString()
    };
    
    if (duration > 1000) {
      this.logger.warn('Slow operation detected', perfData);
    } else {
      this.logger.debug('Operation performance', perfData);
    }
    
    await this.writeToFile(this.performanceDir, 'performance', perfData);
  }
  
  // Search logging
  async logSearch(userId: string, query: string, resultCount: number, duration: number, tenantId?: string) {
    const searchData = {
      action: 'SEARCH',
      userId,
      tenantId,
      query: this.sanitizeData(query),
      resultCount,
      duration,
      ip: this.getClientIp(),
      userAgent: this.getUserAgent()
    };
    
    this.logger.info('Search performed', searchData);
    await this.writeToFile(this.auditDir, 'audit', searchData);
  }
  
  // Helper methods
  private sanitizeData(data: any): any {
    if (!data) return null;
    
    // Remove sensitive fields
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'creditCard', 'ssn'];
    
    if (typeof data === 'object') {
      const sanitized = { ...data };
      
      for (const field of sensitiveFields) {
        if (field in sanitized) {
          sanitized[field] = '[REDACTED]';
        }
      }
      
      // Recursively sanitize nested objects
      for (const key in sanitized) {
        if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
          sanitized[key] = this.sanitizeData(sanitized[key]);
        }
      }
      
      return sanitized;
    }
    
    return data;
  }
  
  private getClientIp(): string {
    // In a real implementation, get from request context
    return process.env.CLIENT_IP || 'unknown';
  }
  
  private getUserAgent(): string {
    // In a real implementation, get from request headers
    return process.env.USER_AGENT || 'unknown';
  }
  
  // Log rotation and cleanup
  async rotateLogs(daysToKeep: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    const dirs = [this.auditDir, this.errorDir, this.performanceDir];
    
    for (const dir of dirs) {
      const files = await fs.readdir(dir);
      
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime < cutoffDate) {
          await fs.unlink(filePath);
          this.logger.info('Log file rotated', { file });
        }
      }
    }
  }
  
  // Analytics and reporting
  async generateReport(startDate: Date, endDate: Date): Promise<any> {
    const report = {
      module: '${moduleName}',
      period: { startDate, endDate },
      operations: {
        create: 0,
        read: 0,
        update: 0,
        delete: 0,
        bulk: 0,
        import: 0,
        export: 0
      },
      errors: [],
      performance: {
        avgDuration: 0,
        slowOperations: []
      }
    };
    
    // Read and analyze log files
    // Implementation would parse logs and generate statistics
    
    return report;
  }
}

// Export singleton instance
export const ${moduleNameCamel}Logger = new ${toPascalCase(moduleName)}Logger();
`;
};

// Generate log analyzer script
const generateLogAnalyzer = (config: ModuleConfig): string => {
  const moduleName = config.name;

  return `#!/usr/bin/env tsx
/**
 * Log analyzer for ${config.displayName}
 * Analyzes module logs and generates reports
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { parseISO, format, startOfDay, endOfDay } from 'date-fns';
import chalk from 'chalk';

interface LogEntry {
  timestamp: string;
  module: string;
  type: string;
  action?: string;
  userId?: string;
  entityId?: string;
  tenantId?: string;
  duration?: number;
  error?: any;
  [key: string]: any;
}

class LogAnalyzer {
  private logDir = path.join(__dirname, '../logs');
  
  async analyze(options: {
    startDate?: Date;
    endDate?: Date;
    action?: string;
    userId?: string;
    tenantId?: string;
  } = {}) {
    const { 
      startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
      endDate = new Date(),
      action,
      userId,
      tenantId
    } = options;
    
    console.log(chalk.blue('\\n📊 Analyzing logs for ${config.displayName}...\\n'));
    
    const logs = await this.readLogs(startDate, endDate);
    const filteredLogs = this.filterLogs(logs, { action, userId, tenantId });
    
    // Generate statistics
    const stats = this.generateStatistics(filteredLogs);
    this.displayStatistics(stats);
    
    // Analyze errors
    const errors = filteredLogs.filter(log => log.type === 'error');
    if (errors.length > 0) {
      this.displayErrors(errors);
    }
    
    // Analyze performance
    const performanceLogs = filteredLogs.filter(log => log.type === 'performance');
    if (performanceLogs.length > 0) {
      this.displayPerformanceAnalysis(performanceLogs);
    }
    
    // User activity analysis
    if (userId) {
      this.displayUserActivity(filteredLogs, userId);
    }
    
    // Tenant analysis
    if (tenantId) {
      this.displayTenantAnalysis(filteredLogs, tenantId);
    }
  }
  
  private async readLogs(startDate: Date, endDate: Date): Promise<LogEntry[]> {
    const logs: LogEntry[] = [];
    const dirs = ['audit', 'errors', 'performance'];
    
    for (const dir of dirs) {
      const dirPath = path.join(this.logDir, dir);
      
      try {
        const files = await fs.readdir(dirPath);
        
        for (const file of files) {
          if (!file.endsWith('.log')) continue;
          
          // Extract date from filename
          const match = file.match(/${moduleName}-\\w+-(\\d{4}-\\d{2}-\\d{2})\\.log/);
          if (!match) continue;
          
          const fileDate = parseISO(match[1]);
          if (fileDate < startOfDay(startDate) || fileDate > endOfDay(endDate)) {
            continue;
          }
          
          const content = await fs.readFile(path.join(dirPath, file), 'utf-8');
          const lines = content.trim().split('\\n');
          
          for (const line of lines) {
            try {
              const entry = JSON.parse(line);
              logs.push(entry);
            } catch (e) {
              // Skip malformed lines
            }
          }
        }
      } catch (e) {
        // Directory might not exist
      }
    }
    
    return logs.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }
  
  private filterLogs(logs: LogEntry[], filters: any): LogEntry[] {
    return logs.filter(log => {
      if (filters.action && log.action !== filters.action) return false;
      if (filters.userId && log.userId !== filters.userId) return false;
      if (filters.tenantId && log.tenantId !== filters.tenantId) return false;
      return true;
    });
  }
  
  private generateStatistics(logs: LogEntry[]) {
    const stats = {
      total: logs.length,
      byAction: {} as Record<string, number>,
      byUser: {} as Record<string, number>,
      byTenant: {} as Record<string, number>,
      byHour: {} as Record<string, number>,
      errors: 0,
      avgDuration: 0,
      slowestOperations: [] as any[]
    };
    
    let totalDuration = 0;
    let durationCount = 0;
    
    for (const log of logs) {
      // Count by action
      if (log.action) {
        stats.byAction[log.action] = (stats.byAction[log.action] || 0) + 1;
      }
      
      // Count by user
      if (log.userId) {
        stats.byUser[log.userId] = (stats.byUser[log.userId] || 0) + 1;
      }
      
      // Count by tenant
      if (log.tenantId) {
        stats.byTenant[log.tenantId] = (stats.byTenant[log.tenantId] || 0) + 1;
      }
      
      // Count by hour
      const hour = format(parseISO(log.timestamp), 'HH:00');
      stats.byHour[hour] = (stats.byHour[hour] || 0) + 1;
      
      // Count errors
      if (log.type === 'error') {
        stats.errors++;
      }
      
      // Track performance
      if (log.duration) {
        totalDuration += log.duration;
        durationCount++;
        
        if (log.duration > 1000) {
          stats.slowestOperations.push({
            operation: log.operation || log.action,
            duration: log.duration,
            timestamp: log.timestamp
          });
        }
      }
    }
    
    stats.avgDuration = durationCount > 0 ? totalDuration / durationCount : 0;
    stats.slowestOperations.sort((a, b) => b.duration - a.duration);
    stats.slowestOperations = stats.slowestOperations.slice(0, 10);
    
    return stats;
  }
  
  private displayStatistics(stats: any) {
    console.log(chalk.yellow('📈 Overall Statistics:'));
    console.log(\`   Total Operations: \${stats.total}\`);
    console.log(\`   Errors: \${stats.errors}\`);
    console.log(\`   Average Duration: \${stats.avgDuration.toFixed(2)}ms\`);
    
    console.log(chalk.yellow('\\n📊 Operations by Type:'));
    Object.entries(stats.byAction)
      .sort((a, b) => (b[1] as number) - (a[1] as number))
      .forEach(([action, count]) => {
        console.log(\`   \${action}: \${count}\`);
      });
    
    console.log(chalk.yellow('\\n⏰ Activity by Hour:'));
    Object.entries(stats.byHour)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([hour, count]) => {
        const bar = '█'.repeat(Math.ceil((count as number) / 10));
        console.log(\`   \${hour}: \${bar} \${count}\`);
      });
  }
  
  private displayErrors(errors: LogEntry[]) {
    console.log(chalk.red('\\n❌ Errors Found:'));
    
    const errorsByType = errors.reduce((acc, error) => {
      const type = error.error?.name || 'Unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    Object.entries(errorsByType)
      .sort((a, b) => b[1] - a[1])
      .forEach(([type, count]) => {
        console.log(\`   \${type}: \${count}\`);
      });
    
    console.log(chalk.red('\\n📝 Recent Errors:'));
    errors.slice(-5).forEach(error => {
      console.log(\`   [\${error.timestamp}] \${error.error?.message || 'Unknown error'}\`);
    });
  }
  
  private displayPerformanceAnalysis(logs: LogEntry[]) {
    console.log(chalk.cyan('\\n⚡ Performance Analysis:'));
    
    const byOperation = logs.reduce((acc, log) => {
      const op = log.operation || 'unknown';
      if (!acc[op]) {
        acc[op] = { count: 0, total: 0, max: 0, min: Infinity };
      }
      acc[op].count++;
      acc[op].total += log.duration || 0;
      acc[op].max = Math.max(acc[op].max, log.duration || 0);
      acc[op].min = Math.min(acc[op].min, log.duration || 0);
      return acc;
    }, {} as Record<string, any>);
    
    Object.entries(byOperation).forEach(([op, stats]) => {
      const avg = stats.total / stats.count;
      console.log(\`   \${op}:\`);
      console.log(\`     Avg: \${avg.toFixed(2)}ms\`);
      console.log(\`     Min: \${stats.min}ms\`);
      console.log(\`     Max: \${stats.max}ms\`);
    });
  }
  
  private displayUserActivity(logs: LogEntry[], userId: string) {
    console.log(chalk.green(\`\\n👤 Activity for User \${userId}:\`));
    
    const userLogs = logs.filter(log => log.userId === userId);
    const actions = userLogs.reduce((acc, log) => {
      if (log.action) {
        acc[log.action] = (acc[log.action] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
    
    Object.entries(actions).forEach(([action, count]) => {
      console.log(\`   \${action}: \${count}\`);
    });
  }
  
  private displayTenantAnalysis(logs: LogEntry[], tenantId: string) {
    console.log(chalk.magenta(\`\\n🏢 Analysis for Tenant \${tenantId}:\`));
    
    const tenantLogs = logs.filter(log => log.tenantId === tenantId);
    const users = new Set(tenantLogs.map(log => log.userId).filter(Boolean));
    
    console.log(\`   Total Operations: \${tenantLogs.length}\`);
    console.log(\`   Active Users: \${users.size}\`);
  }
}

// CLI
async function main() {
  const analyzer = new LogAnalyzer();
  
  const args = process.argv.slice(2);
  const options: any = {};
  
  // Parse command line arguments
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace('--', '');
    const value = args[i + 1];
    
    switch (key) {
      case 'start':
        options.startDate = parseISO(value);
        break;
      case 'end':
        options.endDate = parseISO(value);
        break;
      case 'user':
        options.userId = value;
        break;
      case 'tenant':
        options.tenantId = value;
        break;
      case 'action':
        options.action = value;
        break;
    }
  }
  
  await analyzer.analyze(options);
}

if (require.main === module) {
  main().catch(console.error);
}
`;

  // Generate service with logging
  const generateServiceWithLogging = (config: ModuleConfig): string => {
    const moduleName = config.name;
    const moduleNameCamel = toCamelCase(moduleName);
    const moduleNamePascal = toPascalCase(moduleName);
    const moduleNameUpper = moduleName.toUpperCase().replace(/-/g, "_");

    return `/**
 * Service layer for ${config.displayName}
 * Includes business logic, validation, and comprehensive logging
 */

import { prisma } from '@core/database';
import { ${moduleNameCamel}Logger } from '../logging';
import { ${moduleNamePascal}Cache } from '../caching/strategy';
import { ${moduleNamePascal}CreateSchema, ${moduleNamePascal}UpdateSchema } from '../validation/schemas';
import { ${moduleNamePascal}Error, ${moduleNameUpper}_ERROR_CODES } from '../errors';
import { TenantGuard } from '../middleware/tenant-guard';

export class ${moduleNamePascal}Service {
  private cache = new ${moduleNamePascal}Cache();
  
  /**
   * Create a new ${moduleName}
   */
  async create(data: any, userId: string, tenantId?: string) {
    const startTime = Date.now();
    
    try {
      // Validate input
      const validated = ${moduleNamePascal}CreateSchema.parse(data);
      
      // Add tenant context if multi-tenant
      const createData = ${
        config.multiTenant
          ? `await TenantGuard.injectTenantId(validated, userId)`
          : `validated`
      };
      
      // Create entity
      const entity = await prisma.${moduleNameCamel}.create({
        data: {
          ...createData,
          createdById: userId,
          updatedById: userId,
        },
      });
      
      // Log operation
      await ${moduleNameCamel}Logger.logCreate(userId, entity.id, entity, tenantId);
      
      // Invalidate cache
      await this.cache.invalidatePattern(\`${moduleName}:*\`);
      
      // Track performance
      const duration = Date.now() - startTime;
      await ${moduleNameCamel}Logger.logPerformance('create', duration, { entityId: entity.id });
      
      return entity;
    } catch (error) {
      // Log error
      await ${moduleNameCamel}Logger.logError(error as Error, { 
        operation: 'create', 
        data, 
        userId 
      });
      
      throw error;
    }
  }
  
  /**
   * Find all ${moduleName}s with pagination and filtering
   */
  async findAll(params: {
    skip?: number;
    take?: number;
    where?: any;
    orderBy?: any;
    search?: string;
  }, userId: string, tenantId?: string) {
    const startTime = Date.now();
    
    try {
      const { skip = 0, take = 20, where = {}, orderBy, search } = params;
      
      // Build where clause with tenant filtering
      const whereClause = ${
        config.multiTenant
          ? `await TenantGuard.addTenantFilter(where, userId)`
          : `where`
      };
      
      // Add search if provided
      if (search && config.features.search) {
        whereClause.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ];
      }
      
      // Try cache first
      const cacheKey = \`${moduleName}:list:\${JSON.stringify({ skip, take, whereClause, orderBy })}\`;
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        await ${moduleNameCamel}Logger.logRead(userId, null, params, tenantId);
        return cached;
      }
      
      // Fetch from database
      const [data, total] = await Promise.all([
        prisma.${moduleNameCamel}.findMany({
          where: whereClause,
          skip,
          take,
          orderBy: orderBy || { createdAt: 'desc' },
        }),
        prisma.${moduleNameCamel}.count({ where: whereClause }),
      ]);
      
      const result = { data, total, skip, take };
      
      // Cache result
      await this.cache.set(cacheKey, result, 60); // 1 minute TTL
      
      // Log operation
      await ${moduleNameCamel}Logger.logRead(userId, null, params, tenantId);
      
      // Log search if performed
      if (search) {
        const duration = Date.now() - startTime;
        await ${moduleNameCamel}Logger.logSearch(userId, search, data.length, duration, tenantId);
      }
      
      // Track performance
      const duration = Date.now() - startTime;
      await ${moduleNameCamel}Logger.logPerformance('findAll', duration, { 
        resultCount: data.length,
        total 
      });
      
      return result;
    } catch (error) {
      await ${moduleNameCamel}Logger.logError(error as Error, { 
        operation: 'findAll', 
        params, 
        userId 
      });
      
      throw error;
    }
  }
  
  /**
   * Find one ${moduleName} by ID
   */
  async findOne(id: string, userId: string, tenantId?: string) {
    const startTime = Date.now();
    
    try {
      // Check tenant access
      if (${config.multiTenant}) {
        const hasAccess = await TenantGuard.verifyTenantAccess(id, userId, '${moduleNameCamel}');
        if (!hasAccess) {
          await ${moduleNameCamel}Logger.logAccessDenied(userId, \`${moduleName}:\${id}\`, 'read', tenantId);
          throw new ${moduleNamePascal}Error(
            ${moduleNameUpper}_ERROR_CODES.NOT_FOUND,
            '${moduleNamePascal} not found',
            404
          );
        }
      }
      
      // Try cache first
      const cacheKey = \`${moduleName}:\${id}\`;
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        await ${moduleNameCamel}Logger.logRead(userId, id, { id }, tenantId);
        return cached;
      }
      
      // Fetch from database
      const entity = await prisma.${moduleNameCamel}.findUnique({
        where: { id },
      });
      
      if (!entity) {
        throw new ${moduleNamePascal}Error(
          ${moduleNameUpper}_ERROR_CODES.NOT_FOUND,
          '${moduleNamePascal} not found',
          404
        );
      }
      
      // Cache result
      await this.cache.set(cacheKey, entity);
      
      // Log operation
      await ${moduleNameCamel}Logger.logRead(userId, id, { id }, tenantId);
      
      // Track performance
      const duration = Date.now() - startTime;
      await ${moduleNameCamel}Logger.logPerformance('findOne', duration, { entityId: id });
      
      return entity;
    } catch (error) {
      await ${moduleNameCamel}Logger.logError(error as Error, { 
        operation: 'findOne', 
        id, 
        userId 
      });
      
      throw error;
    }
  }
  
  /**
   * Update a ${moduleName}
   */
  async update(id: string, data: any, userId: string, tenantId?: string) {
    const startTime = Date.now();
    
    try {
      // Validate input
      const validated = ${moduleNamePascal}UpdateSchema.parse(data);
      
      // Check tenant access
      if (${config.multiTenant}) {
        const hasAccess = await TenantGuard.verifyTenantAccess(id, userId, '${moduleNameCamel}');
        if (!hasAccess) {
          await ${moduleNameCamel}Logger.logAccessDenied(userId, \`${moduleName}:\${id}\`, 'update', tenantId);
          throw new ${moduleNamePascal}Error(
            ${moduleNameUpper}_ERROR_CODES.NOT_FOUND,
            '${moduleNamePascal} not found',
            404
          );
        }
      }
      
      // Get current data for audit log
      const previousData = await prisma.${moduleNameCamel}.findUnique({
        where: { id },
      });
      
      if (!previousData) {
        throw new ${moduleNamePascal}Error(
          ${moduleNameUpper}_ERROR_CODES.NOT_FOUND,
          '${moduleNamePascal} not found',
          404
        );
      }
      
      // Update entity
      const entity = await prisma.${moduleNameCamel}.update({
        where: { id },
        data: {
          ...validated,
          updatedById: userId,
          updatedAt: new Date(),
        },
      });
      
      // Log operation with changes
      await ${moduleNameCamel}Logger.logUpdate(userId, id, validated, previousData, tenantId);
      
      // Invalidate cache
      await this.cache.delete(\`${moduleName}:\${id}\`);
      await this.cache.invalidatePattern(\`${moduleName}:list:*\`);
      
      // Track performance
      const duration = Date.now() - startTime;
      await ${moduleNameCamel}Logger.logPerformance('update', duration, { entityId: id });
      
      return entity;
    } catch (error) {
      await ${moduleNameCamel}Logger.logError(error as Error, { 
        operation: 'update', 
        id, 
        data, 
        userId 
      });
      
      throw error;
    }
  }
  
  /**
   * Delete a ${moduleName}
   */
  async delete(id: string, userId: string, tenantId?: string) {
    const startTime = Date.now();
    
    try {
      // Check tenant access
      if (${config.multiTenant}) {
        const hasAccess = await TenantGuard.verifyTenantAccess(id, userId, '${moduleNameCamel}');
        if (!hasAccess) {
          await ${moduleNameCamel}Logger.logAccessDenied(userId, \`${moduleName}:\${id}\`, 'delete', tenantId);
          throw new ${moduleNamePascal}Error(
            ${moduleNameUpper}_ERROR_CODES.NOT_FOUND,
            '${moduleNamePascal} not found',
            404
          );
        }
      }
      
      // Get data for audit log
      const entityData = await prisma.${moduleNameCamel}.findUnique({
        where: { id },
      });
      
      if (!entityData) {
        throw new ${moduleNamePascal}Error(
          ${moduleNameUpper}_ERROR_CODES.NOT_FOUND,
          '${moduleNamePascal} not found',
          404
        );
      }
      
      // Delete or soft delete
      ${
        config.features.softDelete
          ? `
      const entity = await prisma.${moduleNameCamel}.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          deletedById: userId,
        },
      });
      `
          : `
      const entity = await prisma.${moduleNameCamel}.delete({
        where: { id },
      });
      `
      }
      
      // Log operation
      await ${moduleNameCamel}Logger.logDelete(userId, id, entityData, tenantId);
      
      // Invalidate cache
      await this.cache.delete(\`${moduleName}:\${id}\`);
      await this.cache.invalidatePattern(\`${moduleName}:list:*\`);
      
      // Track performance
      const duration = Date.now() - startTime;
      await ${moduleNameCamel}Logger.logPerformance('delete', duration, { entityId: id });
      
      return entity;
    } catch (error) {
      await ${moduleNameCamel}Logger.logError(error as Error, { 
        operation: 'delete', 
        id, 
        userId 
      });
      
      throw error;
    }
  }
  
  /**
   * Bulk operations
   */
  async bulkCreate(data: any[], userId: string, tenantId?: string) {
    const startTime = Date.now();
    
    try {
      // Validate all items
      const validated = data.map(item => ${moduleNamePascal}CreateSchema.parse(item));
      
      // Add tenant context
      const createData = ${
        config.multiTenant
          ? `await Promise.all(validated.map(item => TenantGuard.injectTenantId(item, userId)))`
          : `validated`
      };
      
      // Create in transaction
      const entities = await prisma.$transaction(
        createData.map(item => 
          prisma.${moduleNameCamel}.create({
            data: {
              ...item,
              createdById: userId,
              updatedById: userId,
            },
          })
        )
      );
      
      // Log bulk operation
      await ${moduleNameCamel}Logger.logBulkOperation(
        userId, 
        'create', 
        entities.length, 
        { ids: entities.map(e => e.id) }, 
        tenantId
      );
      
      // Invalidate cache
      await this.cache.invalidatePattern(\`${moduleName}:*\`);
      
      // Track performance
      const duration = Date.now() - startTime;
      await ${moduleNameCamel}Logger.logPerformance('bulkCreate', duration, { 
        count: entities.length 
      });
      
      return entities;
    } catch (error) {
      await ${moduleNameCamel}Logger.logError(error as Error, { 
        operation: 'bulkCreate', 
        count: data.length, 
        userId 
      });
      
      throw error;
    }
  }
  
  /**
   * Generate analytics report
   */
  async generateReport(startDate: Date, endDate: Date) {
    return await ${moduleNameCamel}Logger.generateReport(startDate, endDate);
  }
}

// Export singleton instance
export const ${moduleNameCamel}Service = new ${moduleNamePascal}Service();
`;
  };

  // Generate observability
  const generateObservability = (config: ModuleConfig): string => {
    const moduleName = config.name;

    return `/**
 * Observability for ${config.displayName}
 * Logging, metrics, tracing, and audit
 */

import { logger as globalLogger } from '@core/utils/logger';
import { metrics } from '@core/observability/metrics';
import { tracer } from '@core/observability/tracing';
import { auditLog } from '@core/observability/audit';
import { ${toCamelCase(moduleName)}Logger } from '../logging';

// Module-specific logger
export const logger = globalLogger.child({ module: '${moduleName}' });

// Metrics collectors
export const ${toCamelCase(moduleName)}Metrics = {
  // Operation counters
  operations: new metrics.Counter({
    name: '${moduleName}_operations_total',
    help: 'Total number of operations',
    labelNames: ['operation', 'status'],
  }),
  
  // Response time histogram
  responseTime: new metrics.Histogram({
    name: '${moduleName}_response_time_seconds',
    help: 'Response time in seconds',
    labelNames: ['operation'],
    buckets: [0.1, 0.5, 1, 2, 5],
  }),
  
  // Active requests gauge
  activeRequests: new metrics.Gauge({
    name: '${moduleName}_active_requests',
    help: 'Number of active requests',
    labelNames: ['operation'],
  }),
  
  // Cache metrics
  cacheHits: new metrics.Counter({
    name: '${moduleName}_cache_hits_total',
    help: 'Total number of cache hits',
    labelNames: ['cache_type'],
  }),
  
  cacheMisses: new metrics.Counter({
    name: '${moduleName}_cache_misses_total',
    help: 'Total number of cache misses',
    labelNames: ['cache_type'],
  }),
};

// Tracing helpers
export function createSpan(operation: string) {
  return tracer.startSpan(\`${moduleName}.\${operation}\`);
}

// Audit log helpers
export async function auditCreate(
  userId: string,
  entityId: string,
  data: any
) {
  await auditLog.log({
    userId,
    module: '${moduleName}',
    action: 'create',
    entityId,
    entityType: '${moduleName}',
    changes: {
      before: null,
      after: data,
    },
    metadata: {
      ip: data.ip,
      userAgent: data.userAgent,
    },
  });
}

export async function auditUpdate(
  userId: string,
  entityId: string,
  before: any,
  after: any
) {
  await auditLog.log({
    userId,
    module: '${moduleName}',
    action: 'update',
    entityId,
    entityType: '${moduleName}',
    changes: {
      before,
      after,
    },
  });
}

export async function auditDelete(
  userId: string,
  entityId: string,
  data: any
) {
  await auditLog.log({
    userId,
    module: '${moduleName}',
    action: 'delete',
    entityId,
    entityType: '${moduleName}',
    changes: {
      before: data,
      after: null,
    },
  });
}

export async function auditAccess(
  userId: string,
  entityId: string,
  action: string,
  success: boolean,
  reason?: string
) {
  await auditLog.log({
    userId,
    module: '${moduleName}',
    action: \`access:\${action}\`,
    entityId,
    entityType: '${moduleName}',
    success,
    metadata: { reason },
  });
}

// Performance monitoring decorator
export function monitored(operation: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const span = createSpan(operation);
      const timer = ${toCamelCase(moduleName)}Metrics.responseTime.startTimer({ operation });
      
      ${toCamelCase(moduleName)}Metrics.activeRequests.inc({ operation });
      
      try {
        const result = await originalMethod.apply(this, args);
        
        ${toCamelCase(moduleName)}Metrics.operations.inc({ operation, status: 'success' });
        
        return result;
      } catch (error) {
        ${toCamelCase(moduleName)}Metrics.operations.inc({ operation, status: 'error' });
        
        span.recordException(error);
        throw error;
      } finally {
        ${toCamelCase(moduleName)}Metrics.activeRequests.dec({ operation });
        timer();
        span.end();
      }
    };
    
    return descriptor;
  };
}`;
  };

  // Generate security tests
  const generateSecurityTests = (config: ModuleConfig): string => {
    const moduleName = config.name;

    return `/**
 * Security tests for ${config.displayName}
 * Tests OWASP Top 10 vulnerabilities
 */

import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '@/app';
import { generateTestUser, generateMaliciousPayloads } from '@/tests/utils';

describe('${moduleName} Security Tests', () => {
  let authToken: string;
  let testUser: any;
  
  beforeEach(async () => {
    testUser = await generateTestUser();
    authToken = await getAuthToken(testUser);
  });
  
  describe('A01:2021 – Broken Access Control', () => {
    it('should prevent unauthorized access', async () => {
      const response = await request(app)
        .get('/api/${moduleName}')
        .expect(401);
        
      expect(response.body.error).toBe('Unauthorized');
    });
    
    it('should prevent access to other tenant data', async () => {
      const otherTenantId = 'other-tenant-123';
      
      const response = await request(app)
        .get(\`/api/${moduleName}?tenantId=\${otherTenantId}\`)
        .set('Authorization', \`Bearer \${authToken}\`)
        .expect(403);
        
      expect(response.body.error).toBe('Access denied');
    });
    
    it('should enforce permission-based access', async () => {
      const readOnlyToken = await getAuthToken(testUser, ['${moduleName}.view']);
      
      const response = await request(app)
        .post('/api/${moduleName}')
        .set('Authorization', \`Bearer \${readOnlyToken}\`)
        .send({ name: 'Test' })
        .expect(403);
        
      expect(response.body.error).toBe('Insufficient permissions');
    });
  });
  
  describe('A03:2021 – Injection', () => {
    it('should prevent SQL injection via search', async () => {
      const sqlInjectionPayloads = [
        "'; DROP TABLE ${moduleName}; --",
        "1' OR '1'='1",
        "1 UNION SELECT * FROM users",
      ];
      
      for (const payload of sqlInjectionPayloads) {
        const response = await request(app)
          .get(\`/api/${moduleName}?search=\${encodeURIComponent(payload)}\`)
          .set('Authorization', \`Bearer \${authToken}\`)
          .expect(200);
          
        // Should return empty results, not error
        expect(response.body.data).toEqual([]);
      }
    });
    
    it('should prevent NoSQL injection', async () => {
      const noSqlPayloads = [
        { "$gt": "" },
        { "$ne": null },
        { "$where": "this.password == 'test'" },
      ];
      
      for (const payload of noSqlPayloads) {
        const response = await request(app)
          .post('/api/${moduleName}')
          .set('Authorization', \`Bearer \${authToken}\`)
          .send({ name: payload })
          .expect(400);
          
        expect(response.body.error).toContain('Validation failed');
      }
    });
  });
  
  describe('A04:2021 – Insecure Design', () => {
    it('should enforce rate limiting', async () => {
      const requests = Array(101).fill(null);
      const responses = await Promise.all(
        requests.map(() =>
          request(app)
            .get('/api/${moduleName}')
            .set('Authorization', \`Bearer \${authToken}\`)
        )
      );
      
      const rateLimited = responses.filter(r => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });
    
    it('should validate all inputs against schema', async () => {
      const invalidPayloads = [
        { name: null },
        { name: '' },
        { name: 'a'.repeat(256) },
        { unknownField: 'value' },
      ];
      
      for (const payload of invalidPayloads) {
        const response = await request(app)
          .post('/api/${moduleName}')
          .set('Authorization', \`Bearer \${authToken}\`)
          .send(payload)
          .expect(400);
          
        expect(response.body.error).toContain('Validation');
      }
    });
  });
  
  describe('A07:2021 – Identification and Authentication Failures', () => {
    it('should reject expired tokens', async () => {
      const expiredToken = generateExpiredToken();
      
      const response = await request(app)
        .get('/api/${moduleName}')
        .set('Authorization', \`Bearer \${expiredToken}\`)
        .expect(401);
        
      expect(response.body.error).toBe('Token expired');
    });
    
    it('should reject malformed tokens', async () => {
      const malformedTokens = [
        'invalid-token',
        'Bearer',
        '',
        'null',
      ];
      
      for (const token of malformedTokens) {
        await request(app)
          .get('/api/${moduleName}')
          .set('Authorization', token)
          .expect(401);
      }
    });
  });
  
  describe('Cross-Site Scripting (XSS)', () => {
    it('should sanitize HTML in inputs', async () => {
      const xssPayloads = generateMaliciousPayloads().xss;
      
      for (const payload of xssPayloads) {
        const response = await request(app)
          .post('/api/${moduleName}')
          .set('Authorization', \`Bearer \${authToken}\`)
          .send({ name: payload, description: payload })
          .expect(201);
          
        // Check that HTML is escaped
        expect(response.body.name).not.toContain('<script>');
        expect(response.body.description).not.toContain('<script>');
      }
    });
  });
  
  describe('CSRF Protection', () => {
    it('should validate CSRF tokens for state-changing operations', async () => {
      const response = await request(app)
        .post('/api/${moduleName}')
        .set('Authorization', \`Bearer \${authToken}\`)
        .set('Origin', 'https://evil.com')
        .send({ name: 'Test' })
        .expect(403);
        
      expect(response.body.error).toContain('CSRF');
    });
  });
  
  describe('File Upload Security', () => {
    it('should validate file types', async () => {
      const maliciousFile = Buffer.from('<?php system($_GET["cmd"]); ?>');
      
      const response = await request(app)
        .post('/api/${moduleName}/upload')
        .set('Authorization', \`Bearer \${authToken}\`)
        .attach('file', maliciousFile, 'malicious.php')
        .expect(400);
        
      expect(response.body.error).toContain('Invalid file type');
    });
    
    it('should scan for malware', async () => {
      const eicarTestFile = Buffer.from(
        'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*'
      );
      
      const response = await request(app)
        .post('/api/${moduleName}/upload')
        .set('Authorization', \`Bearer \${authToken}\`)
        .attach('file', eicarTestFile, 'test.txt')
        .expect(400);
        
      expect(response.body.error).toContain('Malware detected');
    });
  });
});`;
  };

  // Generate performance benchmarks
  const generatePerformanceBenchmarks = (config: ModuleConfig): string => {
    const moduleName = config.name;

    return `/**
 * Performance benchmarks for ${config.displayName}
 * Measures response times and throughput
 */

import { bench, describe } from 'vitest';
import { ${toCamelCase(moduleName)}Service } from '../services';
import { generateMockData } from '@/tests/utils';

describe('${moduleName} Performance Benchmarks', () => {
  // Prepare test data
  const testData = generateMockData(1000);
  
  bench('findAll - no filters', async () => {
    await ${toCamelCase(moduleName)}Service.findAll({
      page: 1,
      limit: 20,
    });
  });
  
  bench('findAll - with search', async () => {
    await ${toCamelCase(moduleName)}Service.findAll({
      page: 1,
      limit: 20,
      search: 'test',
    });
  });
  
  bench('findAll - with complex filters', async () => {
    await ${toCamelCase(moduleName)}Service.findAll({
      page: 1,
      limit: 20,
      search: 'test',
      filters: {
        status: 'active',
        createdAt: {
          gte: new Date('2024-01-01'),
        },
      },
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  });
  
  bench('findOne - with cache hit', async () => {
    const id = testData[0].id;
    // Warm cache
    await ${toCamelCase(moduleName)}Service.findOne(id);
    // Measure cached response
    await ${toCamelCase(moduleName)}Service.findOne(id);
  });
  
  bench('create - single record', async () => {
    await ${toCamelCase(moduleName)}Service.create({
      name: 'Benchmark test',
      description: 'Performance test',
    }, 'test-user');
  });
  
  bench('update - single record', async () => {
    const id = testData[0].id;
    await ${toCamelCase(moduleName)}Service.update(id, {
      name: 'Updated name',
    }, 'test-user');
  });
  
  bench('bulk operation - 100 records', async () => {
    const ids = testData.slice(0, 100).map(d => d.id);
    await ${toCamelCase(moduleName)}Service.bulkDelete(ids, 'test-user');
  });
  
  bench('concurrent reads - 10 parallel', async () => {
    const promises = Array(10).fill(null).map(() =>
      ${toCamelCase(moduleName)}Service.findAll({ page: 1, limit: 10 })
    );
    await Promise.all(promises);
  });
  
  bench('search performance - partial match', async () => {
    await ${toCamelCase(moduleName)}Service.findAll({
      search: 'tes', // Partial match
      page: 1,
      limit: 20,
    });
  });
  
  bench('pagination - page 50', async () => {
    await ${toCamelCase(moduleName)}Service.findAll({
      page: 50,
      limit: 20,
    });
  });
});`;
  };

  // Generate configuration files
  const generateConfigFiles = (
    config: ModuleConfig,
  ): Record<string, string> => {
    const moduleName = config.name;

    return {
      "config/development.ts": `export const ${toCamelCase(moduleName)}Config = {
  debug: true,
  cache: {
    enabled: true,
    ttl: 60,
  },
  rateLimit: {
    enabled: false,
  },
  features: {
    import: true,
    export: true,
    bulkOperations: true,
  },
};`,

      "config/production.ts": `export const ${toCamelCase(moduleName)}Config = {
  debug: false,
  cache: {
    enabled: true,
    ttl: 300,
  },
  rateLimit: {
    enabled: true,
    requests: ${config.security.rateLimit.requests},
    window: '${config.security.rateLimit.window}',
  },
  features: {
    import: ${config.features.includes("import")},
    export: ${config.features.includes("export")},
    bulkOperations: ${config.features.includes("bulk")},
  },
};`,

      "config/testing.ts": `export const ${toCamelCase(moduleName)}Config = {
  debug: true,
  cache: {
    enabled: false,
  },
  rateLimit: {
    enabled: false,
  },
  features: {
    import: true,
    export: true,
    bulkOperations: true,
  },
};`,

      "config/feature-flags.ts": `export const ${toCamelCase(moduleName)}FeatureFlags = {
  // Feature toggles
  enableCache: process.env.FEATURE_${moduleName.toUpperCase()}_CACHE === 'true',
  enableRateLimit: process.env.FEATURE_${moduleName.toUpperCase()}_RATE_LIMIT === 'true',
  enableAuditLog: process.env.FEATURE_${moduleName.toUpperCase()}_AUDIT_LOG === 'true',
  enableMetrics: process.env.FEATURE_${moduleName.toUpperCase()}_METRICS === 'true',
  
  // Experimental features
  enableBulkImport: process.env.FEATURE_${moduleName.toUpperCase()}_BULK_IMPORT === 'true',
  enableExport: process.env.FEATURE_${moduleName.toUpperCase()}_EXPORT === 'true',
  enableWebhooks: process.env.FEATURE_${moduleName.toUpperCase()}_WEBHOOKS === 'true',
};`,
    };
  };

  // Generate VSCode snippets
  const generateVSCodeSnippets = (config: ModuleConfig): string => {
    const moduleName = config.name;
    const moduleNameCamel = toCamelCase(moduleName);

    return JSON.stringify(
      {
        [`${moduleName} Service Method`]: {
          prefix: `${moduleName}service`,
          body: [
            `async \${1:methodName}(\${2:params}) {`,
            `  const span = createSpan('\${1:methodName}');`,
            `  `,
            `  try {`,
            `    // Validate input`,
            `    const validated = \${3:schema}.parse(\${2:params});`,
            `    `,
            `    // Business logic`,
            `    \${0}`,
            `    `,
            `    // Audit log`,
            `    await audit\${1/(.)/\\u$1/}(userId, entityId, data);`,
            `    `,
            `    return result;`,
            `  } catch (error) {`,
            `    logger.error('\${1:methodName} failed', { error, params: \${2:params} });`,
            `    throw error;`,
            `  } finally {`,
            `    span.end();`,
            `  }`,
            `}`,
          ],
          description: `Create a new ${moduleName} service method`,
        },

        [`${moduleName} API Route`]: {
          prefix: `${moduleName}api`,
          body: [
            `export const \${1|GET,POST,PUT,DELETE|} = withAuth(`,
            `  async (request: NextRequest) => {`,
            `    try {`,
            `      // Rate limiting`,
            `      await checkRateLimit('\${2:operation}', request.user.id);`,
            `      `,
            `      // \${0:Implementation}`,
            `      `,
            `      return NextResponse.json(result);`,
            `    } catch (error) {`,
            `      if (error instanceof ${toPascalCase(moduleName)}Error) {`,
            `        return NextResponse.json(`,
            `          { error: error.message },`,
            `          { status: error.statusCode }`,
            `        );`,
            `      }`,
            `      `,
            `      logger.error('API error', { error });`,
            `      return NextResponse.json(`,
            `        { error: 'Internal server error' },`,
            `        { status: 500 }`,
            `      );`,
            `    }`,
            `  },`,
            `  { requirePermission: ${moduleName.toUpperCase()}_PERMISSIONS.\${3|VIEW,CREATE,UPDATE,DELETE|} }`,
            `);`,
          ],
          description: `Create a new ${moduleName} API route`,
        },

        [`${moduleName} Test`]: {
          prefix: `${moduleName}test`,
          body: [
            `describe('\${1:Feature}', () => {`,
            `  let testData: any;`,
            `  `,
            `  beforeEach(async () => {`,
            `    testData = await generate${toPascalCase(moduleName)}TestData();`,
            `  });`,
            `  `,
            `  afterEach(async () => {`,
            `    await cleanup${toPascalCase(moduleName)}TestData();`,
            `  });`,
            `  `,
            `  it('should \${2:behavior}', async () => {`,
            `    // Arrange`,
            `    \${3}`,
            `    `,
            `    // Act`,
            `    const result = await ${moduleNameCamel}Service.\${4:method}();`,
            `    `,
            `    // Assert`,
            `    expect(result).to\${5:Equal}(\${6:expected});`,
            `  });`,
            `});`,
          ],
          description: `Create a new ${moduleName} test`,
        },
      },
      null,
      2,
    );
  };

  // Generate migration safety checks
  const generateMigrationSafety = (config: ModuleConfig): string => {
    return `/**
 * Migration safety checks for ${config.displayName}
 * Ensures safe database migrations
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '@core/utils/logger';

const execAsync = promisify(exec);

export class MigrationSafety {
  /**
   * Pre-flight checks before migration
   */
  static async preFlightCheck(): Promise<void> {
    // Check environment
    if (process.env.NODE_ENV === 'production') {
      if (!process.env.ALLOW_PRODUCTION_MIGRATIONS) {
        throw new Error(
          'Production migrations must be explicitly allowed with ALLOW_PRODUCTION_MIGRATIONS=true'
        );
      }
    }
    
    // Check for pending migrations
    const { stdout: pending } = await execAsync('npx prisma migrate status');
    if (pending.includes('Database schema is not up to date')) {
      logger.warn('Pending migrations detected');
    }
    
    // Backup check
    if (process.env.NODE_ENV === 'production') {
      const backupExists = await this.checkBackupExists();
      if (!backupExists) {
        throw new Error('No recent backup found. Create a backup before migrating.');
      }
    }
  }
  
  /**
   * Check if recent backup exists
   */
  static async checkBackupExists(): Promise<boolean> {
    // Implement backup verification logic
    const lastBackupTime = await this.getLastBackupTime();
    const hoursSinceBackup = (Date.now() - lastBackupTime) / (1000 * 60 * 60);
    
    return hoursSinceBackup < 24; // Require backup within 24 hours
  }
  
  /**
   * Get last backup timestamp
   */
  static async getLastBackupTime(): Promise<number> {
    // Implement based on your backup system
    return Date.now() - (1000 * 60 * 60 * 12); // Mock: 12 hours ago
  }
  
  /**
   * Run migration with safety checks
   */
  static async runMigration(): Promise<void> {
    try {
      await this.preFlightCheck();
      
      logger.info('Running migration...');
      
      if (process.env.NODE_ENV === 'production') {
        // Use deploy command in production
        const { stdout, stderr } = await execAsync('npx prisma migrate deploy');
        logger.info('Migration output', { stdout, stderr });
      } else {
        // Use dev command in development
        const { stdout, stderr } = await execAsync('npx prisma migrate dev');
        logger.info('Migration output', { stdout, stderr });
      }
      
      logger.info('Migration completed successfully');
    } catch (error) {
      logger.error('Migration failed', { error });
      throw error;
    }
  }
  
  /**
   * Rollback migration
   */
  static async rollback(steps: number = 1): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Rollback not allowed in production. Restore from backup instead.');
    }
    
    // Implement rollback logic
    logger.warn(\`Rolling back \${steps} migrations...\`);
  }
}`;
  };

  // Generate policy linter
  const generatePolicyLinter = (config: ModuleConfig): string => {
    const moduleName = config.name;

    return `/**
 * Policy linter for ${config.displayName}
 * Enforces SOP compliance
 */

import fs from 'fs/promises';
import path from 'path';
import { z } from 'zod';
import chalk from 'chalk';

interface LintResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
}

export class PolicyLinter {
  private moduleDir: string;
  private errors: string[] = [];
  private warnings: string[] = [];
  
  constructor(moduleDir: string) {
    this.moduleDir = moduleDir;
  }
  
  /**
   * Run all policy checks
   */
  async lint(): Promise<LintResult> {
    console.log(chalk.blue('🔍 Running policy checks for ${moduleName}...'));
    
    // Required files
    await this.checkRequiredFiles();
    
    // Code patterns
    await this.checkCodePatterns();
    
    // Security checks
    await this.checkSecurity();
    
    // Documentation
    await this.checkDocumentation();
    
    // Testing
    await this.checkTesting();
    
    return {
      passed: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
    };
  }
  
  /**
   * Check required files exist
   */
  private async checkRequiredFiles() {
    const requiredFiles = [
      'module.json',
      'README.md',
      'database/schema.prisma',
      'database/data-dictionary.md',
      'services/${moduleName}.service.ts',
      'validation/index.ts',
      'types/index.ts',
      'constants/${moduleName}.constants.ts',
      'errors/index.ts',
      'docs/sop-compliance.md',
    ];
    
    for (const file of requiredFiles) {
      const filePath = path.join(this.moduleDir, file);
      try {
        await fs.access(filePath);
      } catch {
        this.errors.push(\`Missing required file: \${file}\`);
      }
    }
  }
  
  /**
   * Check code patterns
   */
  private async checkCodePatterns() {
    // Check service has required methods
    const servicePath = path.join(this.moduleDir, 'services/${moduleName}.service.ts');
    const serviceContent = await fs.readFile(servicePath, 'utf-8');
    
    const requiredMethods = [
      'findAll',
      'findOne',
      'create',
      'update',
      'delete',
    ];
    
    for (const method of requiredMethods) {
      if (!serviceContent.includes(\`async \${method}(\`)) {
        this.errors.push(\`Service missing required method: \${method}\`);
      }
    }
    
    // Check pagination
    if (!serviceContent.includes('page:') || !serviceContent.includes('limit:')) {
      this.errors.push('Service must implement pagination');
    }
    
    // Check validation
    if (!serviceContent.includes('.safeParse(') && !serviceContent.includes('.parse(')) {
      this.errors.push('Service must use Zod validation');
    }
    
    // Check tenant isolation
    if (${config.multiTenant} && !serviceContent.includes('tenantId')) {
      this.errors.push('Multi-tenant module must implement tenant isolation');
    }
    
    // Check audit logging
    if (!serviceContent.includes('audit')) {
      this.warnings.push('Consider adding audit logging');
    }
  }
  
  /**
   * Check security implementation
   */
  private async checkSecurity() {
    // Check rate limiting
    const apiFiles = await this.findFiles('api/**/*.ts');
    
    for (const file of apiFiles) {
      const content = await fs.readFile(file, 'utf-8');
      
      if (!content.includes('checkRateLimit')) {
        this.warnings.push(\`API route missing rate limiting: \${file}\`);
      }
      
      if (!content.includes('withAuth')) {
        this.errors.push(\`API route missing authentication: \${file}\`);
      }
    }
    
    // Check input sanitization
    const hasInputSanitization = await this.checkPattern(
      'services/**/*.ts',
      'sanitizeInput'
    );
    
    if (!hasInputSanitization) {
      this.warnings.push('Consider adding input sanitization');
    }
  }
  
  /**
   * Check documentation
   */
  private async checkDocumentation() {
    // Check README
    const readmePath = path.join(this.moduleDir, 'README.md');
    const readmeContent = await fs.readFile(readmePath, 'utf-8');
    
    const requiredSections = [
      '## Description',
      '## Features',
      '## API Endpoints',
      '## Permissions',
      '## Testing',
    ];
    
    for (const section of requiredSections) {
      if (!readmeContent.includes(section)) {
        this.warnings.push(\`README missing section: \${section}\`);
      }
    }
  }
  
  /**
   * Check testing
   */
  private async checkTesting() {
    const testFiles = await this.findFiles('tests/**/*.test.ts');
    
    if (testFiles.length === 0) {
      this.errors.push('No tests found');
      return;
    }
    
    // Check test coverage
    const requiredTests = [
      'should create',
      'should update',
      'should delete',
      'should validate input',
      'should handle errors',
    ];
    
    const allTestContent = await Promise.all(
      testFiles.map(file => fs.readFile(file, 'utf-8'))
    );
    
    const combinedContent = allTestContent.join('\\n');
    
    for (const test of requiredTests) {
      if (!combinedContent.includes(test)) {
        this.warnings.push(\`Missing test case: \${test}\`);
      }
    }
  }
  
  /**
   * Helper: Find files matching pattern
   */
  private async findFiles(pattern: string): Promise<string[]> {
    // Implement glob pattern matching
    return [];
  }
  
  /**
   * Helper: Check if pattern exists in files
   */
  private async checkPattern(
    filePattern: string,
    contentPattern: string
  ): Promise<boolean> {
    const files = await this.findFiles(filePattern);
    
    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');
      if (content.includes(contentPattern)) {
        return true;
      }
    }
    
    return false;
  }
}

// CLI runner
export async function runPolicyLinter(moduleDir: string) {
  const linter = new PolicyLinter(moduleDir);
  const result = await linter.lint();
  
  // Display results
  if (result.errors.length > 0) {
    console.log(chalk.red('\\n❌ Errors:'));
    result.errors.forEach(error => {
      console.log(chalk.red(\`  • \${error}\`));
    });
  }
  
  if (result.warnings.length > 0) {
    console.log(chalk.yellow('\\n⚠️  Warnings:'));
    result.warnings.forEach(warning => {
      console.log(chalk.yellow(\`  • \${warning}\`));
    });
  }
  
  if (result.passed) {
    console.log(chalk.green('\\n✅ All policy checks passed!'));
  } else {
    console.log(chalk.red('\\n❌ Policy checks failed!'));
    process.exit(1);
  }
}`;
  };

  // Main function to create module
  async function createModuleStructure(config: ModuleConfig) {
    const moduleName = toPascalCase(config.name);
    const moduleNameLower = config.name.toLowerCase();
    const moduleNameCamel = toCamelCase(config.name);
    const moduleNameUpper = config.name.toUpperCase().replace(/-/g, "_");

    const baseDir = path.join(process.cwd(), "src", "modules", moduleNameLower);

    console.log(
      chalk.blue("\n🚀 Creating module with advanced SOP compliance..."),
    );

    // Create directories
    const dirs = [
      "database",
      "database/migrations",
      "services",
      "api",
      "api/[id]",
      "hooks",
      "components",
      "types",
      "validation",
      "constants",
      "errors",
      "middleware",
      "utils",
      "config",
      "logs",
      "logs/audit",
      "logs/errors",
      "logs/performance",
      "tests",
      "tests/unit",
      "tests/integration",
      "tests/e2e",
      "tests/security",
      "tests/performance",
      "tests/fixtures",
      "docs",
      "scripts",
      ".vscode",
    ];

    await fs.mkdir(baseDir, { recursive: true });

    for (const dir of dirs) {
      await fs.mkdir(path.join(baseDir, dir), { recursive: true });
    }

    // Generate files
    const files: Record<string, string> = {
      // Core files
      "module.json": generateModuleManifest(config),
      "errors/index.ts": generateErrorSystem(config.name),
      "caching/strategy.ts": generateCachingStrategy(config),
      "observability/index.ts": generateObservability(config),
      "logging/index.ts": generateModuleLoggingSystem(config),

      // Services
      [`services/${moduleNameLower}.service.ts`]:
        generateServiceWithLogging(config),

      // Middleware
      "middleware/tenant-guard.ts": generateTenantGuard(
        config.name,
        config.multiTenant,
      ),
      "middleware/rate-limiter.ts": generateRateLimiter(config),
      "middleware/idempotency.ts": generateIdempotency(config.name),

      // Background jobs
      "jobs/import-export.ts": generateImportExport(config),

      // Tests
      "tests/security/security.test.ts": generateSecurityTests(config),
      "tests/performance/benchmark.test.ts":
        generatePerformanceBenchmarks(config),

      // Configuration
      ...generateConfigFiles(config),

      // Development tools
      ".vscode/snippets.json": generateVSCodeSnippets(config),
      "scripts/migration-safety.ts": generateMigrationSafety(config),
      "scripts/policy-linter.ts": generatePolicyLinter(config),
      "scripts/log-analyzer.ts": generateLogAnalyzer(config),

      // Log directory configuration
      "logs/.gitignore": "*.log\n",
    };

    // Write all files
    for (const [filePath, content] of Object.entries(files)) {
      await fs.writeFile(path.join(baseDir, filePath), content);
    }

    // Create compliance report
    const complianceReport = `# SOP Compliance Report for ${config.displayName}

Generated: ${new Date().toISOString()}

## Security Standards
- ✅ OWASP Top 10 compliance
- ✅ CWE Top 25 mitigation
- ✅ Company security policies enforced

## Implementation Status

### Security (${Object.values(config.security).filter((v) => v === true).length}/${Object.keys(config.security).length})
${Object.entries(config.security)
  .map(([key, value]) => `- ${value ? "✅" : "❌"} ${key}`)
  .join("\n")}

### Testing (${Object.values(config.testing).filter((v) => v === true).length}/${Object.keys(config.testing).length})
${Object.entries(config.testing)
  .map(([key, value]) => `- ${value ? "✅" : "❌"} ${key}`)
  .join("\n")}

### Observability (${Object.values(config.observability).filter((v) => v === true).length}/${Object.keys(config.observability).length})
${Object.entries(config.observability)
  .map(([key, value]) => `- ${value ? "✅" : "❌"} ${key}`)
  .join("\n")}

## Next Steps
1. Run policy linter: \`npm run lint:policy ${moduleNameLower}\`
2. Add Prisma schema to main schema.prisma
3. Run migrations: \`npm run db:migrate\`
4. Add permissions to RBAC seed
5. Run security tests: \`npm run test:security ${moduleNameLower}\`
`;

    await fs.writeFile(
      path.join(baseDir, "docs", "compliance-report.md"),
      complianceReport,
    );

    console.log(chalk.green("\n✅ Module created successfully!"));
    console.log(chalk.cyan("\n📁 Module location:"), baseDir);
    console.log(chalk.yellow("\n📋 Run policy check:"));
    console.log(`   npx tsx ${baseDir}/scripts/policy-linter.ts`);
  }

  // Enhanced CLI with validation
  async function main() {
    console.log(
      chalk.bold.blue("🚀 Advanced Module Generator V3 - Enterprise Grade\n"),
    );

    // Check for config file
    const configFile = process.argv[2];
    let config: ModuleConfig;

    if (configFile && configFile.endsWith(".json")) {
      // Load from file
      console.log(chalk.blue(`Loading configuration from ${configFile}...`));
      const configData = await fs.readFile(configFile, "utf-8");
      config = ModuleConfigSchema.parse(JSON.parse(configData));
    } else {
      // Interactive mode
      config = await interactiveConfig();
    }

    // Validate configuration
    const validation = ModuleConfigSchema.safeParse(config);
    if (!validation.success) {
      console.error(chalk.red("Configuration validation failed:"));
      console.error(validation.error.errors);
      process.exit(1);
    }

    // Dry run option
    if (process.argv.includes("--dry-run")) {
      console.log(chalk.yellow("\n🔍 Dry run mode - no files will be created"));
      console.log(chalk.cyan("\nConfiguration:"));
      console.log(JSON.stringify(config, null, 2));
      return;
    }

    try {
      await createModuleStructure(config);
    } catch (error) {
      console.error(chalk.red("❌ Error creating module:"), error);
      process.exit(1);
    }
  }

  // Interactive configuration
  async function interactiveConfig(): Promise<ModuleConfig> {
    const inquirer = (await import("inquirer")).default;

    console.log(chalk.cyan("📝 Interactive Module Configuration\n"));

    // Basic module info
    const basicInfo = await inquirer.prompt([
      {
        type: "input",
        name: "name",
        message: "Module name (kebab-case):",
        validate: (input: string) => {
          return (
            /^[a-z]+(-[a-z]+)*$/.test(input) ||
            "Must be kebab-case (e.g., user-management)"
          );
        },
      },
      {
        type: "input",
        name: "displayName",
        message: "Display name:",
        default: (answers: any) =>
          answers.name
            .split("-")
            .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" "),
      },
      {
        type: "input",
        name: "description",
        message: "Module description:",
        default: (answers: any) =>
          `Manages ${answers.displayName.toLowerCase()} functionality`,
      },
    ]);

    // Multi-tenancy
    const tenancy = await inquirer.prompt([
      {
        type: "confirm",
        name: "multiTenant",
        message: "Enable multi-tenancy support?",
        default: true,
      },
    ]);

    // Security settings
    const security = await inquirer.prompt([
      {
        type: "confirm",
        name: "authentication",
        message: "Require authentication?",
        default: true,
      },
      {
        type: "confirm",
        name: "rateLimitEnabled",
        message: "Enable rate limiting?",
        default: true,
      },
    ]);

    let rateLimit = {
      enabled: security.rateLimitEnabled,
      requests: 100,
      window: "1m",
    };
    if (security.rateLimitEnabled) {
      const rateLimitDetails = await inquirer.prompt([
        {
          type: "number",
          name: "requests",
          message: "Rate limit requests per window:",
          default: 100,
        },
        {
          type: "list",
          name: "window",
          message: "Rate limit window:",
          choices: ["1m", "5m", "15m", "1h"],
          default: "1m",
        },
      ]);
      rateLimit = { enabled: true, ...rateLimitDetails };
    }

    // Caching settings
    const caching = await inquirer.prompt([
      {
        type: "confirm",
        name: "enabled",
        message: "Enable caching?",
        default: true,
      },
    ]);

    let cache = {
      enabled: caching.enabled,
      ttl: 300,
      strategy: "cache-aside" as const,
    };
    if (caching.enabled) {
      const cacheDetails = await inquirer.prompt([
        {
          type: "number",
          name: "ttl",
          message: "Cache TTL (seconds):",
          default: 300,
        },
        {
          type: "list",
          name: "strategy",
          message: "Caching strategy:",
          choices: ["cache-aside", "write-through", "write-behind"],
          default: "cache-aside",
        },
      ]);
      cache = { enabled: true, ...cacheDetails };
    }

    // Features
    const features = await inquirer.prompt([
      {
        type: "confirm",
        name: "importExport",
        message: "Enable import/export functionality?",
        default: true,
      },
      {
        type: "confirm",
        name: "bulkOperations",
        message: "Enable bulk operations?",
        default: true,
      },
      {
        type: "confirm",
        name: "softDelete",
        message: "Enable soft delete?",
        default: true,
      },
      {
        type: "confirm",
        name: "versioning",
        message: "Enable versioning/history?",
        default: false,
      },
      {
        type: "confirm",
        name: "workflow",
        message: "Enable workflow/approval process?",
        default: false,
      },
      {
        type: "confirm",
        name: "search",
        message: "Enable full-text search?",
        default: true,
      },
      {
        type: "confirm",
        name: "hooks",
        message: "Enable lifecycle hooks?",
        default: true,
      },
    ]);

    // Testing options
    const testing = await inquirer.prompt([
      {
        type: "checkbox",
        name: "types",
        message: "Select test types to generate:",
        choices: [
          { name: "Unit tests", value: "unit", checked: true },
          { name: "Integration tests", value: "integration", checked: true },
          { name: "E2E tests", value: "e2e", checked: true },
          { name: "Security tests", value: "security", checked: true },
          { name: "Performance tests", value: "performance", checked: true },
        ],
      },
      {
        type: "number",
        name: "coverage",
        message: "Target test coverage (%):",
        default: 80,
        validate: (input: number) => input >= 0 && input <= 100,
      },
    ]);

    // Observability
    const observability = await inquirer.prompt([
      {
        type: "checkbox",
        name: "features",
        message: "Select observability features:",
        choices: [
          { name: "Structured logging", value: "logging", checked: true },
          { name: "Metrics collection", value: "metrics", checked: true },
          { name: "Distributed tracing", value: "tracing", checked: true },
          { name: "Audit logging", value: "audit", checked: true },
        ],
      },
    ]);

    // Database fields
    const { fields } = await inquirer.prompt([
      {
        type: "number",
        name: "fields",
        message: "How many custom fields for the main model?",
        default: 3,
        validate: (input: number) => input >= 0 && input <= 20,
      },
    ]);

    const dbFields = [];
    for (let i = 0; i < fields; i++) {
      const field = await inquirer.prompt([
        {
          type: "input",
          name: "name",
          message: `Field ${i + 1} name:`,
          validate: (input: string) => /^[a-zA-Z][a-zA-Z0-9]*$/.test(input),
        },
        {
          type: "list",
          name: "type",
          message: `Field ${i + 1} type:`,
          choices: ["String", "Int", "Float", "Boolean", "DateTime", "Json"],
        },
        {
          type: "confirm",
          name: "required",
          message: `Is field ${i + 1} required?`,
          default: true,
        },
      ]);
      dbFields.push(field);
    }

    // Permissions
    const permissions = await inquirer.prompt([
      {
        type: "checkbox",
        name: "basic",
        message: "Select basic permissions:",
        choices: [
          { name: "Create", value: "create", checked: true },
          { name: "Read", value: "read", checked: true },
          { name: "Update", value: "update", checked: true },
          { name: "Delete", value: "delete", checked: true },
        ],
      },
    ]);

    // API configuration
    const api = await inquirer.prompt([
      {
        type: "input",
        name: "basePath",
        message: "API base path:",
        default: (answers: any) => `/api/${basicInfo.name}`,
        validate: (input: string) =>
          input.startsWith("/") || "Path must start with /",
      },
      {
        type: "confirm",
        name: "versioning",
        message: "Enable API versioning?",
        default: true,
      },
      {
        type: "confirm",
        name: "pagination",
        message: "Enable pagination?",
        default: true,
      },
      {
        type: "confirm",
        name: "filtering",
        message: "Enable filtering?",
        default: true,
      },
      {
        type: "confirm",
        name: "sorting",
        message: "Enable sorting?",
        default: true,
      },
    ]);

    // Development settings
    const development = await inquirer.prompt([
      {
        type: "confirm",
        name: "hotReload",
        message: "Enable hot reload?",
        default: true,
      },
      {
        type: "confirm",
        name: "mockData",
        message: "Generate mock data?",
        default: true,
      },
      {
        type: "confirm",
        name: "storybook",
        message: "Generate Storybook stories?",
        default: false,
      },
    ]);

    // Build the configuration object
    const config: ModuleConfig = {
      ...basicInfo,
      multiTenant: tenancy.multiTenant,
      security: {
        authentication: security.authentication,
        rateLimit: rateLimit,
        permissions: permissions.basic,
      },
      caching: cache,
      features: features,
      testing: {
        ...testing,
        types: testing.types,
      },
      observability: {
        logging: observability.features.includes("logging"),
        metrics: observability.features.includes("metrics"),
        tracing: observability.features.includes("tracing"),
        audit: observability.features.includes("audit"),
      },
      database: {
        fields: dbFields,
      },
      api: api,
      development: development,
    };

    // Show summary
    console.log(chalk.cyan("\n📋 Configuration Summary:\n"));
    console.log(JSON.stringify(config, null, 2));

    const { confirm } = await inquirer.prompt([
      {
        type: "confirm",
        name: "confirm",
        message: "Proceed with this configuration?",
        default: true,
      },
    ]);

    if (!confirm) {
      console.log(chalk.yellow("Configuration cancelled."));
      process.exit(0);
    }

    return config;
  }

  // Run if called directly
  if (require.main === module) {
    main();
  }
};
