import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/core/database/prisma';

export async function GET(request: NextRequest) {
  const checks = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0',
    checks: {
      server: { status: 'ok' },
      database: { status: 'checking' },
      memory: { status: 'checking' },
      assistant: { status: 'checking' },
    },
    uptime: process.uptime(),
  };

  // Check database connection
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.checks.database = { status: 'ok' };
  } catch (error) {
    checks.checks.database = { 
      status: 'error', 
      message: 'Database connection failed' 
    };
    checks.status = 'degraded';
  }

  // Check memory usage
  const memUsage = process.memoryUsage();
  const memoryUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
  
  checks.checks.memory = {
    status: memoryUsagePercent > 90 ? 'warning' : 'ok',
    heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
    heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
    percentage: `${memoryUsagePercent.toFixed(2)}%`,
  };

  // Check assistant service
  try {
    const testResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:process.env.PORT || 4000/api'}/assistant/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'ping', sessionId: 'health-check' }),
    });
    
    if (testResponse.ok) {
      checks.checks.assistant = { status: 'ok' };
    } else {
      checks.checks.assistant = { 
        status: 'error', 
        message: 'Assistant service not responding' 
      };
      checks.status = 'degraded';
    }
  } catch (error) {
    checks.checks.assistant = { 
      status: 'error', 
      message: 'Assistant service unreachable' 
    };
    checks.status = 'degraded';
  }

  // Determine HTTP status code
  const httpStatus = checks.status === 'ok' ? 200 : 503;

  return NextResponse.json(checks, { status: httpStatus });
}