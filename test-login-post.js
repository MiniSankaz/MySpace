async function testLoginPost() {
  try {
    console.log('🧪 Testing POST login API...');
    
    const body = JSON.stringify({
      emailOrUsername: 'admin@personalai.com',
      password: 'Admin@2025'
    });
    
    console.log('Request body:', body);
    
    const response = await fetch('http://127.0.0.1:3000/api/ums/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: body,
      redirect: 'manual' // Don't follow redirects
    });

    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    
    if (response.status >= 300 && response.status < 400) {
      console.log('Redirect detected!');
      const location = response.headers.get('location');
      console.log('Redirect to:', location);
    }
    
    const data = await response.text();
    console.log('Response:', data);

    if (response.ok) {
      const jsonData = JSON.parse(data);
      console.log('✅ Login successful!');
      console.log('User:', jsonData.user);
      console.log('Has tokens:', !!jsonData.tokens);
    } else {
      console.log('❌ Login failed');
      try {
        const errorData = JSON.parse(data);
        console.log('Error details:', errorData);
      } catch (e) {
        console.log('Could not parse error response as JSON');
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testLoginPost();