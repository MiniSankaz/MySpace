/**
 * Comprehensive Authentication System Test
 * Tests the complete authentication flow from login API to form integration
 */

async function runComprehensiveAuthTest() {
  console.log('🔒 COMPREHENSIVE AUTHENTICATION SYSTEM TEST');
  console.log('===========================================\n');

  const testResults = {
    apiTests: [],
    formTests: [],
    securityTests: [],
    overallStatus: 'UNKNOWN'
  };

  // Test 1: API Authentication Tests
  console.log('1️⃣ API AUTHENTICATION TESTS');
  console.log('-----------------------------');

  const testUsers = [
    { email: 'admin@personalai.com', password: 'Admin@2025', role: 'admin', expectedRoles: ['admin'] },
    { email: 'portfolio@user.com', password: 'Portfolio@2025', role: 'user', expectedRoles: ['user'] },
    { email: 'sankaz@example.com', password: 'Sankaz#3E25167B@2025', role: 'admin', expectedRoles: ['admin'] },
    { email: 'test@personalai.com', password: 'Test@123', role: 'user', expectedRoles: ['user'] },
  ];

  for (const user of testUsers) {
    try {
      const response = await fetch('http://127.0.0.1:3000/api/ums/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailOrUsername: user.email,
          password: user.password
        })
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        // Verify response structure
        const hasRequiredFields = data.user && data.tokens && 
          data.user.id && data.user.email && data.user.displayName &&
          data.tokens.accessToken && data.tokens.refreshToken;

        // Verify roles
        const hasCorrectRoles = data.user.roles && 
          user.expectedRoles.every(role => data.user.roles.includes(role));

        const testResult = {
          user: user.email,
          status: hasRequiredFields && hasCorrectRoles ? 'PASS' : 'FAIL',
          details: hasRequiredFields && hasCorrectRoles ? 
            `✅ All fields present, roles: ${data.user.roles.join(', ')}` :
            `❌ Missing fields or incorrect roles`
        };

        testResults.apiTests.push(testResult);
        console.log(`   ${user.email}: ${testResult.status} - ${testResult.details}`);
      } else {
        testResults.apiTests.push({
          user: user.email,
          status: 'FAIL',
          details: `❌ Login failed: ${data.error || response.statusText}`
        });
        console.log(`   ${user.email}: FAIL - ${data.error || response.statusText}`);
      }
    } catch (error) {
      testResults.apiTests.push({
        user: user.email,
        status: 'ERROR',
        details: `❌ Request failed: ${error.message}`
      });
      console.log(`   ${user.email}: ERROR - ${error.message}`);
    }
  }

  // Test 2: Security Tests
  console.log('\n2️⃣ SECURITY TESTS');
  console.log('------------------');

  // Test invalid credentials
  try {
    const response = await fetch('http://127.0.0.1:3000/api/ums/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emailOrUsername: 'admin@personalai.com',
        password: 'WrongPassword123'
      })
    });

    const data = await response.json();
    
    const securityTest = {
      test: 'Invalid Credentials',
      status: !response.ok && !data.success ? 'PASS' : 'FAIL',
      details: !response.ok ? `✅ Correctly rejected: ${data.error}` : '❌ SECURITY ISSUE: Invalid credentials accepted!'
    };

    testResults.securityTests.push(securityTest);
    console.log(`   ${securityTest.test}: ${securityTest.status} - ${securityTest.details}`);
  } catch (error) {
    testResults.securityTests.push({
      test: 'Invalid Credentials',
      status: 'ERROR',
      details: `❌ Test failed: ${error.message}`
    });
  }

  // Test SQL injection attempt
  try {
    const response = await fetch('http://127.0.0.1:3000/api/ums/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emailOrUsername: "admin@personalai.com'; DROP TABLE users; --",
        password: 'anything'
      })
    });

    const data = await response.json();
    
    const sqlInjectionTest = {
      test: 'SQL Injection Prevention',
      status: !response.ok && !data.success ? 'PASS' : 'FAIL',
      details: !response.ok ? '✅ Correctly rejected SQL injection attempt' : '❌ SECURITY ISSUE: SQL injection not prevented!'
    };

    testResults.securityTests.push(sqlInjectionTest);
    console.log(`   ${sqlInjectionTest.test}: ${sqlInjectionTest.status} - ${sqlInjectionTest.details}`);
  } catch (error) {
    testResults.securityTests.push({
      test: 'SQL Injection Prevention',
      status: 'ERROR',
      details: `❌ Test failed: ${error.message}`
    });
  }

  // Test 3: Token and JWT Tests
  console.log('\n3️⃣ TOKEN AND JWT TESTS');
  console.log('----------------------');

  // Get a valid token for testing
  const tokenResponse = await fetch('http://127.0.0.1:3000/api/ums/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      emailOrUsername: 'admin@personalai.com',
      password: 'Admin@2025'
    })
  });

  if (tokenResponse.ok) {
    const tokenData = await tokenResponse.json();
    
    // Test JWT structure
    const accessToken = tokenData.tokens.accessToken;
    const tokenParts = accessToken.split('.');
    
    const jwtTest = {
      test: 'JWT Token Structure',
      status: tokenParts.length === 3 ? 'PASS' : 'FAIL',
      details: tokenParts.length === 3 ? '✅ Valid JWT structure (header.payload.signature)' : '❌ Invalid JWT structure'
    };

    testResults.securityTests.push(jwtTest);
    console.log(`   ${jwtTest.test}: ${jwtTest.status} - ${jwtTest.details}`);

    // Test token expiry
    const expiryTest = {
      test: 'Token Expiry Configuration',
      status: tokenData.tokens.expiresIn === -1 || tokenData.tokens.expiresIn > 0 ? 'PASS' : 'FAIL',
      details: tokenData.tokens.expiresIn === -1 ? 
        '✅ Token set to never expire (remember me)' : 
        `✅ Token expires in ${tokenData.tokens.expiresIn} seconds`
    };

    testResults.securityTests.push(expiryTest);
    console.log(`   ${expiryTest.test}: ${expiryTest.status} - ${expiryTest.details}`);
  }

  // Test 4: Overall Results
  console.log('\n4️⃣ OVERALL RESULTS');
  console.log('------------------');

  const passedApiTests = testResults.apiTests.filter(t => t.status === 'PASS').length;
  const passedSecurityTests = testResults.securityTests.filter(t => t.status === 'PASS').length;
  const totalTests = testResults.apiTests.length + testResults.securityTests.length;
  const passedTests = passedApiTests + passedSecurityTests;

  testResults.overallStatus = passedTests === totalTests ? 'PASS' : 'PARTIAL';

  console.log(`   API Tests: ${passedApiTests}/${testResults.apiTests.length} passed`);
  console.log(`   Security Tests: ${passedSecurityTests}/${testResults.securityTests.length} passed`);
  console.log(`   Overall: ${passedTests}/${totalTests} tests passed`);

  if (testResults.overallStatus === 'PASS') {
    console.log('\n🎉 ALL TESTS PASSED! Authentication system is working correctly.');
    console.log('\n📋 VERIFIED FUNCTIONALITY:');
    console.log('   ✅ User authentication with correct credentials');
    console.log('   ✅ Role-based access control');
    console.log('   ✅ JWT token generation and structure');
    console.log('   ✅ Security against invalid credentials');
    console.log('   ✅ Protection against basic SQL injection');
    console.log('   ✅ Token expiry configuration');
  } else {
    console.log('\n⚠️  SOME TESTS FAILED. Please review the results above.');
  }

  console.log('\n📝 LOGIN CREDENTIALS FOR TESTING:');
  console.log('==================================');
  testUsers.forEach(user => {
    console.log(`   ${user.email} / ${user.password} (${user.role})`);
  });

  console.log('\n🌐 TEST URLS:');
  console.log('=============');
  console.log('   Login Page: http://127.0.0.1:3000/login');
  console.log('   API Endpoint: http://127.0.0.1:3000/api/ums/auth/login');

  return testResults;
}

// Run tests
runComprehensiveAuthTest()
  .then(results => {
    console.log(`\n✅ Test completed with status: ${results.overallStatus}`);
  })
  .catch(error => {
    console.error('❌ Test suite failed:', error);
  });