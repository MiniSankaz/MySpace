// Test Claude Session directly in Node.js
const { spawn } = require('child_process');

async function testClaudeSession() {
  console.log('🧪 Testing Claude Background Session...\n');
  
  try {
    console.log('📌 Starting Claude in background mode...');
    
    // Remove API key to use logged-in session
    const env = { ...process.env };
    delete env.ANTHROPIC_API_KEY;
    
    const claudeProcess = spawn('claude', ['--continue'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env,
      shell: true
    });
    
    if (!claudeProcess.stdin || !claudeProcess.stdout) {
      throw new Error('Failed to create Claude process streams');
    }
    
    console.log('✅ Claude process started\n');
    
    // Handle output
    let responseBuffer = '';
    let responseReceived = false;
    
    claudeProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log('[Claude Output]:', output);
      responseBuffer += output;
      
      // Check if we got a complete response
      if (output.includes('Human:') || responseBuffer.length > 100) {
        responseReceived = true;
      }
    });
    
    claudeProcess.stderr.on('data', (data) => {
      console.error('[Claude Error]:', data.toString());
    });
    
    // Wait a bit for Claude to initialize
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('📌 Sending first message...');
    claudeProcess.stdin.write('สวัสดี คุณใช้ Claude session แบบ background ใช่ไหม?\n');
    
    // Wait for response
    await new Promise(resolve => {
      const checkInterval = setInterval(() => {
        if (responseReceived) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
      
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve();
      }, 5000);
    });
    
    console.log('\n📌 Sending second message (testing session persistence)...');
    responseBuffer = '';
    responseReceived = false;
    
    claudeProcess.stdin.write('คุณจำข้อความก่อนหน้าของฉันได้ไหม?\n');
    
    // Wait for second response
    await new Promise(resolve => {
      const checkInterval = setInterval(() => {
        if (responseReceived) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
      
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve();
      }, 5000);
    });
    
    console.log('\n📌 Cleaning up...');
    claudeProcess.kill('SIGTERM');
    
    console.log('✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
  
  process.exit(0);
}

testClaudeSession();