const { getPortConfig, getServiceUrl, getFrontendPort, getGatewayPort } = require('@/shared/config/ports.cjs');
const portConfig = getPortConfig();

// Using built-in fetch in Node.js 18+

async function testLogin() {
  try {
    console.log('🧪 Testing login API...');
    
    const response = await fetch('http://${getFrontendPort()}/api/ums/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        emailOrUsername: 'admin@personalai.com',
        password: 'Admin@2025'
      })
    });

    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    
    const data = await response.text();
    console.log('Response:', data);

    if (response.ok) {
      const jsonData = JSON.parse(data);
      console.log('✅ Login successful!');
      console.log('User:', jsonData.user);
      console.log('Has tokens:', !!jsonData.tokens);
    } else {
      console.log('❌ Login failed');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testLogin();