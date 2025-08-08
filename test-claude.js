const { spawn } = require('child_process');

console.log('Testing Claude CLI...');

const claude = spawn('claude', [], {
  stdio: ['pipe', 'pipe', 'pipe'],
  shell: true
});

if (!claude.stdout || !claude.stdin) {
  console.error('Failed to create Claude process');
  process.exit(1);
}

let responseBuffer = '';
let timeout;

claude.stdout.on('data', (data) => {
  const output = data.toString();
  console.log('Claude says:', output);
  responseBuffer += output;
  
  // Reset timeout
  clearTimeout(timeout);
  timeout = setTimeout(() => {
    console.log('\n=== Full Response ===');
    console.log(responseBuffer);
    console.log('===================\n');
    
    // Send another message
    sendMessage('สวัสดี พูดภาษาไทยได้ไหม');
  }, 2000);
});

claude.stderr.on('data', (data) => {
  console.error('Error:', data.toString());
});

claude.on('error', (error) => {
  console.error('Process error:', error);
});

claude.on('exit', (code) => {
  console.log(`Claude exited with code ${code}`);
});

function sendMessage(msg) {
  console.log(`\nSending: "${msg}"`);
  responseBuffer = '';
  claude.stdin.write(msg + '\n');
}

// Send first message after a delay
setTimeout(() => {
  sendMessage('Hello Claude, please respond');
}, 1000);

// Keep process alive
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  claude.kill();
  process.exit();
});