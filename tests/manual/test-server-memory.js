#!/usr/bin/env node

// This script will be loaded into the running server to check its memory configuration

const v8 = require("v8");
const heapStats = v8.getHeapStatistics();
const memUsage = process.memoryUsage();

const toMB = (bytes) => Math.round(bytes / 1024 / 1024);

console.log("\n===== SERVER MEMORY CONFIGURATION CHECK =====\n");

console.log("Node.js Heap Size Limit Configuration:");
console.log(
  `  ⭐ Max Heap Size (heap_size_limit): ${toMB(heapStats.heap_size_limit)}MB`,
);
console.log(
  `  ⭐ This is ${(heapStats.heap_size_limit / 1024 / 1024 / 1024).toFixed(2)}GB\n`,
);

console.log("Current Memory Usage:");
console.log(`  - Heap Total (allocated): ${toMB(memUsage.heapTotal)}MB`);
console.log(`  - Heap Used: ${toMB(memUsage.heapUsed)}MB`);
console.log(`  - RSS: ${toMB(memUsage.rss)}MB\n`);

console.log("Memory Status:");
if (toMB(heapStats.heap_size_limit) >= 8000) {
  console.log("  ✅ Server IS running with 8GB heap limit");
} else {
  console.log("  ❌ Server is NOT running with 8GB heap limit");
  console.log(
    `  ❌ Current limit is only ${toMB(heapStats.heap_size_limit)}MB`,
  );
}

console.log("\nProcess Arguments:", process.execArgv);

// Check the memory reporting in server.js
console.log("\n⚠️  IMPORTANT FINDING:");
console.log('The server.js logs show "Memory: XXXmb used / YYYmb total"');
console.log("This reports heapUsed / heapTotal, NOT the max heap limit!");
console.log("heapTotal is the CURRENTLY ALLOCATED heap, not the maximum.");
console.log("The heap grows dynamically as needed up to heap_size_limit.");

module.exports = { heapStats, memUsage };
