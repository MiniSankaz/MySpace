#!/usr/bin/env tsx
/**
 * Test Script - ทดสอบการทำงานแบบ Parallel ของ AI Agents
 */

import axios from 'axios';
import { io, Socket } from 'socket.io-client';

const API_URL = 'http://localhost:4190';
const WS_URL = 'ws://localhost:4190';

// Colors for console
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

async function testParallelAgents() {
  console.log(`${colors.blue}${colors.bright}🚀 Testing Parallel AI Agents${colors.reset}`);
  console.log('=' .repeat(50));

  try {
    // 1. Check health
    console.log(`\n${colors.yellow}1. Checking orchestration server health...${colors.reset}`);
    const health = await axios.get(`${API_URL}/health`);
    console.log(`${colors.green}✓ Server is healthy${colors.reset}`);
    console.log(`  Active agents: ${health.data.agents.active}`);
    console.log(`  Uptime: ${Math.floor(health.data.uptime)}s`);

    // 2. Connect WebSocket for real-time updates
    console.log(`\n${colors.yellow}2. Connecting WebSocket for real-time updates...${colors.reset}`);
    const socket: Socket = io(WS_URL);
    
    socket.on('connect', () => {
      console.log(`${colors.green}✓ WebSocket connected${colors.reset}`);
    });

    socket.on('agent:output', (data) => {
      console.log(`${colors.cyan}[Agent ${data.agentId.substring(0, 8)}] Output: ${data.output.substring(0, 100)}...${colors.reset}`);
    });

    socket.on('agent:completed', (data) => {
      console.log(`${colors.green}✅ Agent ${data.id.substring(0, 8)} completed!${colors.reset}`);
    });

    socket.on('agent:error', (data) => {
      console.log(`${colors.red}❌ Agent ${data.agentId.substring(0, 8)} error: ${data.error}${colors.reset}`);
    });

    // 3. Spawn parallel agents
    console.log(`\n${colors.yellow}3. Spawning 3 agents in parallel...${colors.reset}`);
    
    const tasks = [
      {
        description: 'Analyze User Service Performance',
        prompt: `Analyze the User Management service at port 4120:
        1. Review the current implementation
        2. Identify performance bottlenecks
        3. Suggest optimization strategies
        4. Focus on database queries and caching`,
        context: { service: 'user-management', priority: 75 }
      },
      {
        description: 'Review Portfolio Service Security',
        prompt: `Review the Portfolio service at port 4160 for security:
        1. Check authentication and authorization
        2. Review data validation
        3. Identify potential vulnerabilities
        4. Suggest security improvements`,
        context: { service: 'portfolio', priority: 80 }
      },
      {
        description: 'Create Integration Tests',
        prompt: `Create integration tests for the API Gateway at port 4110:
        1. Test service routing
        2. Test health check aggregation
        3. Test WebSocket proxying
        4. Create test documentation`,
        context: { service: 'gateway', priority: 60 }
      }
    ];

    const response = await axios.post(`${API_URL}/api/spawn-parallel`, { tasks });
    
    console.log(`${colors.green}✓ Successfully spawned ${response.data.agents.length} agents${colors.reset}`);
    
    response.data.agents.forEach((agent: any) => {
      console.log(`  ${colors.magenta}→ Agent ${agent.agentId.substring(0, 8)}${colors.reset}`);
      console.log(`    Type: ${agent.type}`);
      console.log(`    Task: ${agent.task.description}`);
    });

    // 4. Monitor agents for 10 seconds
    console.log(`\n${colors.yellow}4. Monitoring agents for 10 seconds...${colors.reset}`);
    
    let checkCount = 0;
    const monitorInterval = setInterval(async () => {
      checkCount++;
      
      const agents = await axios.get(`${API_URL}/api/agents`);
      const activeAgents = agents.data.filter((a: any) => 
        a.status === 'WORKING' || a.status === 'INITIALIZING'
      );
      
      console.log(`${colors.blue}[${new Date().toLocaleTimeString()}] Active: ${activeAgents.length}, Completed: ${agents.data.filter((a: any) => a.status === 'COMPLETED').length}, Failed: ${agents.data.filter((a: any) => a.status === 'FAILED').length}${colors.reset}`);
      
      if (checkCount >= 10 || activeAgents.length === 0) {
        clearInterval(monitorInterval);
        
        // 5. Show final results
        console.log(`\n${colors.yellow}5. Final Results:${colors.reset}`);
        console.log('=' .repeat(50));
        
        agents.data.forEach((agent: any) => {
          const statusColor = agent.status === 'COMPLETED' ? colors.green : 
                            agent.status === 'FAILED' ? colors.red : colors.yellow;
          
          console.log(`\n${colors.bright}Agent ${agent.id.substring(0, 8)}${colors.reset}`);
          console.log(`  Status: ${statusColor}${agent.status}${colors.reset}`);
          console.log(`  Type: ${agent.type}`);
          console.log(`  Task: ${agent.task?.description}`);
          
          if (agent.endTime) {
            const duration = new Date(agent.endTime).getTime() - new Date(agent.startTime).getTime();
            console.log(`  Duration: ${(duration / 1000).toFixed(2)}s`);
          }
          
          if (agent.errors?.length > 0) {
            console.log(`  Errors: ${colors.red}${agent.errors[0]}${colors.reset}`);
          }
        });
        
        // Disconnect and exit
        socket.disconnect();
        console.log(`\n${colors.green}✓ Test completed!${colors.reset}`);
        process.exit(0);
      }
    }, 1000);

  } catch (error: any) {
    console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
    
    if (error.code === 'ECONNREFUSED') {
      console.log(`\n${colors.yellow}⚠️  Orchestration server is not running.${colors.reset}`);
      console.log(`${colors.yellow}Start it with: ./orchestrate-ai.sh start${colors.reset}`);
    }
    
    process.exit(1);
  }
}

// Run test
console.log(`${colors.cyan}Starting parallel agents test...${colors.reset}\n`);
testParallelAgents();