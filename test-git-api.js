const fetch = require('node-fetch');

// Test Git API endpoints
async function testGitAPI() {
  const projectId = '982c41bb-58a1-48cb-9b5d-487ba8e76190'; // From the logs
  const baseUrl = 'http://localhost:4000';
  
  console.log('Testing Git API endpoints...\n');
  
  // Test 1: Git Status
  try {
    console.log('1. Testing /api/workspace/git/status...');
    const statusRes = await fetch(`${baseUrl}/api/workspace/git/status?projectId=${projectId}`, {
      credentials: 'include'
    });
    
    console.log(`   Status: ${statusRes.status} ${statusRes.statusText}`);
    
    if (statusRes.ok) {
      const data = await statusRes.json();
      console.log('   ✅ Git status:', JSON.stringify(data, null, 2));
    } else {
      console.log('   ❌ Failed:', await statusRes.text());
    }
  } catch (error) {
    console.error('   ❌ Error:', error.message);
  }
  
  console.log('\n');
  
  // Test 2: Git Branches
  try {
    console.log('2. Testing /api/workspace/git/branches...');
    const branchesRes = await fetch(`${baseUrl}/api/workspace/git/branches?projectId=${projectId}`, {
      credentials: 'include'
    });
    
    console.log(`   Status: ${branchesRes.status} ${branchesRes.statusText}`);
    
    if (branchesRes.ok) {
      const data = await branchesRes.json();
      console.log('   ✅ Git branches:', JSON.stringify(data, null, 2));
    } else {
      console.log('   ❌ Failed:', await branchesRes.text());
    }
  } catch (error) {
    console.error('   ❌ Error:', error.message);
  }
  
  console.log('\n');
  
  // Test 3: Check if Git API routes exist
  try {
    console.log('3. Checking if Git API routes are compiled...');
    const apiDir = require('fs').readdirSync('/Users/sem4pro/Stock/port/src/app/api/workspace/git');
    console.log('   Found files:', apiDir);
  } catch (error) {
    console.error('   ❌ Git API directory not found:', error.message);
  }
}

// Run tests
testGitAPI().catch(console.error);