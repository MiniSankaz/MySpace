import express from 'express';

console.log('🧪 Testing TypeScript Portfolio Service');

// Test basic TypeScript imports
try {
  const app = express();
  
  app.get('/test', (req, res) => {
    res.json({ message: 'TypeScript test OK' });
  });
  
  console.log('✅ Basic TypeScript + Express works');
  
  const server = app.listen(4161, () => {
    console.log('✅ Server started on port 4161');
    server.close();
    console.log('✅ Server closed');
    console.log('\n🎉 TypeScript works! The problem must be in specific imports.');
  });
  
} catch (error) {
  console.error('❌ TypeScript test failed:', error.message);
}