const express = require('express');

console.log('🧪 Testing Portfolio Service...');

const app = express();
const PORT = process.env.PORT || 4160;

// Basic middleware
app.use(express.json());

// Health endpoint
app.get('/health', (req, res) => {
  res.json({
    service: 'portfolio',
    status: 'OK',
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

// Info endpoint
app.get('/info', (req, res) => {
  res.json({
    service: 'portfolio',
    description: 'Portfolio Service Test',
    version: '3.0.0'
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`✅ Portfolio service test running on port ${PORT}`);
  console.log(`📱 Health: http://localhost:${PORT}/health`);
  console.log(`ℹ️  Info: http://localhost:${PORT}/info`);
  console.log('\n🎉 Test server started successfully! Press Ctrl+C to stop.');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🔄 Shutting down test server...');
  server.close(() => {
    console.log('✅ Test server stopped.');
    process.exit(0);
  });
});