const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function testClaude() {
  const tests = [
    '1+1=?',
    'Hello Claude',
    'What is TypeScript?',
    'Write a Python hello world'
  ];

  console.log('=== Testing Claude CLI ===\n');

  for (const test of tests) {
    console.log(`Q: "${test}"`);
    try {
      const command = `echo "${test}" | claude 2>&1`;
      const { stdout } = await execAsync(command, {
        timeout: 10000
      });
      
      console.log(`A: ${stdout.trim().substring(0, 200)}...`);
      console.log('---\n');
    } catch (error) {
      console.error(`Error:`, error.message);
      console.log('---\n');
    }
  }
}

testClaude();