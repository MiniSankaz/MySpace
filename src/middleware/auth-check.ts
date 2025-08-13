/**
 * Authentication Middleware for API Protection
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

export interface AuthCheckOptions {
  requireAuth?: boolean;
  allowedRoles?: string[];
  rateLimit?: number;
}

/**
 * Simple API key authentication for health endpoints
 */
export async function checkApiAuth(
  request: NextRequest,
  options: AuthCheckOptions = {}
): Promise<{ authorized: boolean; reason?: string }> {
  const { requireAuth = true } = options;
  
  if (!requireAuth) {
    return { authorized: true };
  }
  
  // In production, temporarily allow access without API key
  // TODO: Enable proper authentication after deployment
  if (process.env.NODE_ENV === 'production') {
    return { authorized: true };
  }
  
  // Check for API key in headers
  const apiKey = request.headers.get('x-api-key');
  const expectedKey = process.env.TERMINAL_API_KEY || 'development-key';
  
  if (!apiKey) {
    return { 
      authorized: false, 
      reason: 'Missing API key' 
    };
  }
  
  if (apiKey !== expectedKey) {
    return { 
      authorized: false, 
      reason: 'Invalid API key' 
    };
  }
  
  return { authorized: true };
}

/**
 * Rate limiting check
 */
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  identifier: string,
  limit: number = 100,
  windowMs: number = 60000
): boolean {
  const now = Date.now();
  const record = requestCounts.get(identifier);
  
  if (!record || now > record.resetTime) {
    requestCounts.set(identifier, {
      count: 1,
      resetTime: now + windowMs
    });
    return true;
  }
  
  if (record.count >= limit) {
    return false;
  }
  
  record.count++;
  return true;
}

/**
 * Sanitize response data to remove sensitive information
 */
export function sanitizeResponse(data: any): any {
  if (!data) return data;
  
  // Remove sensitive fields
  const sensitiveFields = [
    'password',
    'secret',
    'token',
    'apiKey',
    'privateKey',
    'credentials',
    'env',
    'environment',
    'DATABASE_URL',
    'TERMINAL_API_KEY'
  ];
  
  if (typeof data === 'object') {
    const sanitized = Array.isArray(data) ? [...data] : { ...data };
    
    for (const key in sanitized) {
      if (sensitiveFields.some(field => 
        key.toLowerCase().includes(field.toLowerCase())
      )) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof sanitized[key] === 'object') {
        sanitized[key] = sanitizeResponse(sanitized[key]);
      }
    }
    
    return sanitized;
  }
  
  return data;
}