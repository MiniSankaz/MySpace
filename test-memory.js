#!/usr/bin/env node

console.log('=== Node.js Memory Configuration Test ===\n');

// Get V8 memory statistics
const v8 = require('v8');
const heapStats = v8.getHeapStatistics();

// Current memory usage
const memUsage = process.memoryUsage();

// Convert bytes to MB
const toMB = (bytes) => Math.round(bytes / 1024 / 1024);

console.log('1. Current Process Memory Usage:');
console.log(`   - RSS (Resident Set Size): ${toMB(memUsage.rss)}MB`);
console.log(`   - Heap Total: ${toMB(memUsage.heapTotal)}MB`);
console.log(`   - Heap Used: ${toMB(memUsage.heapUsed)}MB`);
console.log(`   - External: ${toMB(memUsage.external)}MB`);
console.log(`   - Array Buffers: ${toMB(memUsage.arrayBuffers || 0)}MB\n`);

console.log('2. V8 Heap Statistics:');
console.log(`   - Total Heap Size: ${toMB(heapStats.total_heap_size)}MB`);
console.log(`   - Total Heap Size Executable: ${toMB(heapStats.total_heap_size_executable)}MB`);
console.log(`   - Total Physical Size: ${toMB(heapStats.total_physical_size)}MB`);
console.log(`   - Total Available Size: ${toMB(heapStats.total_available_size)}MB`);
console.log(`   - Used Heap Size: ${toMB(heapStats.used_heap_size)}MB`);
console.log(`   - Heap Size Limit: ${toMB(heapStats.heap_size_limit)}MB ⭐\n`);

console.log('3. Maximum Heap Configuration:');
const maxHeapMB = toMB(heapStats.heap_size_limit);
const maxHeapGB = (heapStats.heap_size_limit / 1024 / 1024 / 1024).toFixed(2);
console.log(`   ⭐ HEAP SIZE LIMIT: ${maxHeapMB}MB (${maxHeapGB}GB)`);

// Check if we have the expected 8GB limit
if (maxHeapMB < 7900) {
  console.log(`   ❌ WARNING: Heap limit is only ${maxHeapMB}MB, expected ~8192MB (8GB)`);
  console.log(`   ❌ Node.js is NOT running with --max-old-space-size=8192`);
} else {
  console.log(`   ✅ Node.js is correctly configured with ~8GB heap limit`);
}

console.log('\n4. Resource Limits:');
const os = require('os');
console.log(`   - System Total Memory: ${toMB(os.totalmem())}MB`);
console.log(`   - System Free Memory: ${toMB(os.freemem())}MB`);

console.log('\n5. Node.js Command Line:');
console.log(`   - Process Arguments: ${process.execArgv.join(' ') || '(none)'}`);
console.log(`   - Node Version: ${process.version}`);

console.log('\n6. Memory Allocation Explanation:');
console.log('   - heapTotal: Memory V8 has allocated for the heap');
console.log('   - heapUsed: Memory actually used by JS objects');
console.log('   - heap_size_limit: Maximum heap size configured (--max-old-space-size)');
console.log('   - The heap grows dynamically up to heap_size_limit');
console.log('   - heapTotal starts small and grows as needed');

console.log('\n=== End of Memory Test ===');