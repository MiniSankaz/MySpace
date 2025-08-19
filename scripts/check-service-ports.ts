#!/usr/bin/env node

/**
 * Service Port Checker
 * Verifies all services are running on correct ports after migration
 */

import { execSync } from 'child_process';
import http from 'http';

interface ServiceCheck {
  name: string;
  port: number;
  path: string;
  expected?: string;
}

const services: ServiceCheck[] = [
  { name: 'Frontend', port: 4100, path: '/', expected: 'html' },
  { name: 'Gateway', port: 4110, path: '/health', expected: 'status' },
  { name: 'User Management', port: 4120, path: '/health', expected: 'status' },
  { name: 'AI Assistant', port: 4130, path: '/health', expected: 'status' },
  { name: 'Terminal', port: 4140, path: '/health', expected: 'status' },
  { name: 'Workspace', port: 4150, path: '/health', expected: 'status' },
  { name: 'Portfolio', port: 4160, path: '/health', expected: 'status' },
  { name: 'Market Data', port: 4170, path: '/health', expected: 'status' }
];

function checkPort(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const options = {
      hostname: '127.0.0.1',
      port,
      path: '/',
      method: 'GET',
      timeout: 2000
    };

    const req = http.request(options, (res) => {
      resolve(true);
    });

    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });

    req.setTimeout(2000);
    req.end();
  });
}

async function checkService(service: ServiceCheck): Promise<{ success: boolean; message: string }> {
  try {
    const isPortOpen = await checkPort(service.port);
    
    if (!isPortOpen) {
      return {
        success: false,
        message: `❌ ${service.name} (${service.port}): Port not accessible`
      };
    }

    // Try to get health endpoint
    try {
      const options = {
        hostname: '127.0.0.1',
        port: service.port,
        path: service.path,
        method: 'GET',
        timeout: 3000
      };

      const response = await new Promise<string>((resolve, reject) => {
        const req = http.request(options, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => resolve(data));
        });

        req.on('error', reject);
        req.on('timeout', () => {
          req.destroy();
          reject(new Error('Timeout'));
        });

        req.setTimeout(3000);
        req.end();
      });

      const hasExpected = service.expected ? response.includes(service.expected) : true;
      
      return {
        success: true,
        message: `✅ ${service.name} (${service.port}): Running ${hasExpected ? '& healthy' : 'but no health check'}`
      };

    } catch (error) {
      return {
        success: true,
        message: `⚠️  ${service.name} (${service.port}): Port open but health check failed`
      };
    }

  } catch (error) {
    return {
      success: false,
      message: `❌ ${service.name} (${service.port}): ${error}`
    };
  }
}

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🔍 SERVICE PORT VERIFICATION');
  console.log('='.repeat(60));

  console.log('\n📋 Checking all services on migrated ports...\n');

  let allGood = true;
  let runningCount = 0;

  for (const service of services) {
    const result = await checkService(service);
    console.log('   ' + result.message);
    
    if (result.success) {
      runningCount++;
    } else {
      allGood = false;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  console.log(`Services running: ${runningCount}/${services.length}`);
  
  if (allGood) {
    console.log('🎉 All services verified on migrated ports!');
  } else {
    console.log('⚠️  Some services need attention');
    
    console.log('\n💡 Troubleshooting:');
    console.log('   1. Check if services are started: ./services/start-all-services.sh');
    console.log('   2. Check individual service logs in services/*/logs/');
    console.log('   3. Verify no port conflicts: lsof -i :41XX');
  }

  // Check for old port processes
  console.log('\n🔍 Checking for processes on old ports...');
  const oldPorts = [3000, 4000, 4200, 4300, 4400, 4500, 4600];
  let oldPortsInUse = [];

  for (const port of oldPorts) {
    try {
      const result = execSync(`lsof -i :${port} || echo "none"`, { encoding: 'utf-8' });
      if (!result.includes('none')) {
        oldPortsInUse.push(port);
        console.log(`   ⚠️  Old port ${port} still in use:`);
        console.log('      ' + result.trim().replace(/\n/g, '\n      '));
      }
    } catch (error) {
      // Port not in use, which is good
    }
  }

  if (oldPortsInUse.length === 0) {
    console.log('   ✅ No processes found on old ports');
  } else {
    console.log(`\n⚠️  Found ${oldPortsInUse.length} processes on old ports!`);
    console.log('   You may need to stop these manually or restart your system');
  }

  console.log('\n' + '='.repeat(60));
  
  process.exit(allGood ? 0 : 1);
}

if (require.main === module) {
  main().catch(console.error);
}