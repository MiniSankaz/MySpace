import { NextRequest, NextResponse } from 'next/server';
import v8 from 'v8';

export async function GET(request: NextRequest) {
  const heapStats = v8.getHeapStatistics();
  const memUsage = process.memoryUsage();
  
  const toMB = (bytes: number) => Math.round(bytes / 1024 / 1024);
  const toGB = (bytes: number) => (bytes / 1024 / 1024 / 1024).toFixed(2);

  const memoryInfo = {
    configuration: {
      heap_size_limit_mb: toMB(heapStats.heap_size_limit),
      heap_size_limit_gb: toGB(heapStats.heap_size_limit),
      is_8gb_configured: toMB(heapStats.heap_size_limit) >= 8000,
      node_args: process.execArgv,
      node_version: process.version
    },
    current_usage: {
      heap_total_mb: toMB(memUsage.heapTotal),
      heap_used_mb: toMB(memUsage.heapUsed),
      rss_mb: toMB(memUsage.rss),
      external_mb: toMB(memUsage.external),
      array_buffers_mb: toMB(memUsage.arrayBuffers || 0)
    },
    v8_heap_stats: {
      total_heap_size_mb: toMB(heapStats.total_heap_size),
      total_heap_size_executable_mb: toMB(heapStats.total_heap_size_executable),
      total_physical_size_mb: toMB(heapStats.total_physical_size),
      total_available_size_mb: toMB(heapStats.total_available_size),
      used_heap_size_mb: toMB(heapStats.used_heap_size),
      heap_size_limit_mb: toMB(heapStats.heap_size_limit),
      malloced_memory: heapStats.malloced_memory,
      peak_malloced_memory: heapStats.peak_malloced_memory,
      does_zap_garbage: heapStats.does_zap_garbage
    },
    explanation: {
      heap_total: "Currently allocated heap memory (grows dynamically)",
      heap_used: "Memory actively used by JavaScript objects",
      heap_size_limit: "Maximum heap size configured via --max-old-space-size",
      rss: "Resident Set Size - total memory allocated to the process",
      issue: "The server logs show 'heapUsed / heapTotal' which is NOT the max limit",
      solution: "heapTotal starts small (~500MB) and grows as needed up to heap_size_limit (8GB)"
    }
  };

  return NextResponse.json(memoryInfo);
}