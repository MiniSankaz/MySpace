async function testAllUsers() {
  const testUsers = [
    { email: 'admin@personalai.com', password: 'Admin@2025', role: 'admin' },
    { email: 'portfolio@user.com', password: 'Portfolio@2025', role: 'user' },
    { email: 'sankaz@example.com', password: 'Sankaz#3E25167B@2025', role: 'admin' },
    { email: 'test@personalai.com', password: 'Test@123', role: 'user' },
  ];

  console.log('🧪 Testing all user credentials...\n');

  for (const user of testUsers) {
    try {
      console.log(`Testing: ${user.email} (${user.role})`);
      
      const response = await fetch('http://127.0.0.1:3000/api/ums/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emailOrUsername: user.email,
          password: user.password
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        console.log('✅ LOGIN SUCCESS');
        console.log(`   User: ${data.user.displayName} (${data.user.roles.join(', ')})`);
        console.log(`   ID: ${data.user.id}`);
        console.log(`   Token expires: ${data.tokens.expiresIn === -1 ? 'Never' : data.tokens.expiresIn + 's'}`);
      } else {
        console.log('❌ LOGIN FAILED');
        console.log(`   Error: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.log('❌ REQUEST FAILED');
      console.log(`   Error: ${error.message}`);
    }
    console.log('');
  }

  // Test invalid credentials
  console.log('Testing invalid credentials...');
  try {
    const response = await fetch('http://127.0.0.1:3000/api/ums/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        emailOrUsername: 'admin@personalai.com',
        password: 'WrongPassword123'
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.log('✅ CORRECTLY REJECTED invalid credentials');
      console.log(`   Error: ${data.error}`);
    } else {
      console.log('❌ SECURITY ISSUE: Invalid credentials accepted!');
    }
  } catch (error) {
    console.log('❌ REQUEST FAILED');
    console.log(`   Error: ${error.message}`);
  }
}

testAllUsers();