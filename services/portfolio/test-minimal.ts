#!/usr/bin/env npx tsx

console.log('🧪 Testing Portfolio Service startup...');

try {
  // Test basic Express setup
  console.log('1. Testing Express...');
  const express = require('express');
  const app = express();
  console.log('✅ Express OK');
  
  // Test logger
  console.log('2. Testing Logger...');
  const { logger } = await import('./src/utils/logger');
  logger.info('Test log message');
  console.log('✅ Logger OK');
  
  // Test shared config with fallback
  console.log('3. Testing Port Config...');
  let port = 4160; // Fallback port
  try {
    const { getServicePort } = await import('../../shared/config/ports.config');
    port = getServicePort('portfolio');
    console.log('✅ Port Config OK, using port:', port);
  } catch (error) {
    console.log('⚠️  Port Config failed, using fallback port:', port);
  }
  
  // Test basic route setup
  console.log('4. Testing Basic Routes...');
  app.get('/health', (req: any, res: any) => {
    res.json({ status: 'OK', service: 'portfolio', port });
  });
  console.log('✅ Routes OK');
  
  // Try to start server briefly
  console.log('5. Testing Server Startup...');
  const server = app.listen(port, () => {
    console.log(`✅ Server started successfully on port ${port}`);
    server.close();
    console.log('✅ Server closed cleanly');
    console.log('\n🎉 Portfolio Service test completed successfully!');
  });
  
} catch (error) {
  console.error('❌ Test failed:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}