const express = require('express');
const { execSync } = require('child_process');

console.log('🔍 Debug Portfolio Service Startup');
console.log('====================================');

const app = express();
const PORT = 4160;

// Test 1: Basic Express
console.log('✅ Step 1: Express imported successfully');

// Test 2: Basic middleware
app.use(express.json());
console.log('✅ Step 2: Basic middleware configured');

// Test 3: Health endpoint
app.get('/health', (req, res) => {
  res.json({ 
    service: 'portfolio-debug',
    status: 'OK',
    step: 'basic-server'
  });
});
console.log('✅ Step 3: Basic routes configured');

// Test 4: Try to start server
const server = app.listen(PORT, () => {
  console.log(`✅ Step 4: Server started on port ${PORT}`);
  
  // Test 5: Self-health check
  setTimeout(() => {
    try {
      const result = execSync(`curl -s http://localhost:${PORT}/health`);
      console.log('✅ Step 5: Health check passed');
      console.log('Response:', result.toString());
      
      server.close(() => {
        console.log('\n🎉 Basic Express setup works! Problem is in TypeScript/imports.');
        console.log('\n🔍 Recommendation: Check these imports in TypeScript files:');
        console.log('1. Route file imports (routes/*.ts)');
        console.log('2. Service imports (services/*.ts)');  
        console.log('3. Type imports (types/*.ts)');
        console.log('4. Prisma imports');
        process.exit(0);
      });
    } catch (error) {
      console.error('❌ Step 5 failed:', error.message);
      server.close();
      process.exit(1);
    }
  }, 1000);
});

server.on('error', (error) => {
  console.error('❌ Server startup failed:', error.message);
  process.exit(1);
});