'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

interface Agent {
  id: string;
  type: string;
  status: 'working' | 'completed' | 'failed' | 'initializing';
  task: {
    description: string;
    prompt: string;
  };
  startTime: string;
  endTime?: string;
  output: string[];
  errors: string[];
}

interface OrchestrationStats {
  status: string;
  uptime: number;
  agents: {
    total: number;
    active: number;
    completed: number;
    failed: number;
    queued: number;
  };
  sessions: number;
}

const ORCHESTRATION_URL = 'http://localhost:4191';
const GATEWAY_URL = 'http://localhost:4110';

export default function OrchestrationDashboard() {
  const [stats, setStats] = useState<OrchestrationStats | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activityLog, setActivityLog] = useState<string[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  // Add log entry
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    setActivityLog(prev => [...prev.slice(-49), logEntry]); // Keep last 50 entries
  };

  // Test connection to orchestration service
  const testConnection = async () => {
    addLog('🔍 Testing orchestration connection...');
    try {
      const response = await fetch(ORCHESTRATION_URL + '/health');
      const data = await response.json();
      
      if (response.ok) {
        setStats(data);
        setIsConnected(true);
        addLog(`✅ Connected! Uptime: ${Math.floor(data.uptime)}s`);
      } else {
        throw new Error('Health check failed');
      }
    } catch (error: any) {
      setIsConnected(false);
      addLog(`❌ Connection failed: ${error.message}`);
    }
  };

  // Load agents from API
  const loadAgents = async () => {
    addLog('🔄 Loading agents...');
    try {
      // Try gateway first, then direct
      let response;
      try {
        response = await fetch(GATEWAY_URL + '/api/agents');
      } catch {
        response = await fetch(ORCHESTRATION_URL + '/api/agents');
      }
      
      if (response.ok) {
        const agentsData = await response.json();
        setAgents(agentsData);
        addLog(`📊 Loaded ${agentsData.length} agents`);
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error: any) {
      addLog(`❌ Failed to load agents: ${error.message}`);
    }
  };

  // Spawn single agent
  const spawnAgent = async () => {
    addLog('🚀 Spawning business analyst agent...');
    
    const agentData = {
      type: 'business-analyst',
      task: {
        description: 'Next.js Dashboard Test',
        prompt: `You are being spawned from a Next.js dashboard. Current time: ${new Date().toISOString()}. Respond with: NEXTJS_DASHBOARD_SUCCESS`,
        priority: 100
      }
    };

    try {
      const response = await fetch(ORCHESTRATION_URL + '/api/spawn-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(agentData)
      });

      if (response.ok) {
        const result = await response.json();
        addLog(`✅ Agent spawned: ${result.agentId}`);
        
        // Refresh after 3 seconds
        setTimeout(() => {
          loadAgents();
          testConnection();
        }, 3000);
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error: any) {
      addLog(`❌ Spawn failed: ${error.message}`);
    }
  };

  // Spawn parallel agents
  const spawnParallelAgents = async () => {
    addLog('🚀 Spawning 3 parallel agents...');
    
    const agentConfigs = [
      {
        type: 'business-analyst',
        task: {
          description: 'Parallel Analysis 1',
          prompt: 'Respond with: PARALLEL_NEXTJS_1_SUCCESS',
          priority: 90
        }
      },
      {
        type: 'code-reviewer',
        task: {
          description: 'Parallel Review 2',
          prompt: 'Respond with: PARALLEL_NEXTJS_2_SUCCESS',
          priority: 90
        }
      },
      {
        type: 'test-runner',
        task: {
          description: 'Parallel Test 3',
          prompt: 'Respond with: PARALLEL_NEXTJS_3_SUCCESS',
          priority: 90
        }
      }
    ];

    try {
      const promises = agentConfigs.map(config =>
        fetch(ORCHESTRATION_URL + '/api/spawn-agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config)
        })
      );

      const responses = await Promise.all(promises);
      const results = await Promise.all(responses.map(r => r.json()));
      
      addLog(`✅ Spawned ${results.length} parallel agents`);
      results.forEach((result, i) => {
        if (result.agentId) {
          addLog(`   → Agent ${i+1}: ${result.agentId}`);
        }
      });

      // Refresh after 4 seconds
      setTimeout(() => {
        loadAgents();
        testConnection();
      }, 4000);

    } catch (error: any) {
      addLog(`❌ Parallel spawn failed: ${error.message}`);
    }
  };

  // Auto-scroll log
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [activityLog]);

  // Toggle dark mode
  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    if (!isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('darkMode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('darkMode', 'false');
    }
  };

  // Initialize and setup auto-refresh
  useEffect(() => {
    // Check for saved dark mode preference
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setIsDarkMode(savedDarkMode);
    if (savedDarkMode) {
      document.documentElement.classList.add('dark');
    }
    
    addLog('🚀 Dashboard initializing...');
    testConnection();
    loadAgents();
    setIsLoading(false);

    // Auto-refresh every 15 seconds
    const interval = setInterval(() => {
      if (isConnected) {
        testConnection();
        loadAgents();
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [isConnected]);


  const formatDuration = (startTime: string, endTime?: string) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const duration = Math.round((end.getTime() - start.getTime()) / 1000);
    return `${duration}s`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading Dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">🤖 AI Orchestration Dashboard</h1>
        <div className="flex items-center space-x-4">
          <Button onClick={toggleDarkMode} variant="ghost" size="small">
            {isDarkMode ? '☀️' : '🌙'}
          </Button>
          <Badge variant={isConnected ? "primary" : "danger"}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </Badge>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {new Date().toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="p-4 text-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {stats?.agents.total || 0}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Total</div>
        </Card>
        <Card className="p-4 text-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
            {stats?.agents.active || 0}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Active</div>
        </Card>
        <Card className="p-4 text-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {stats?.agents.completed || 0}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Completed</div>
        </Card>
        <Card className="p-4 text-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">
            {stats?.agents.failed || 0}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Failed</div>
        </Card>
        <Card className="p-4 text-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {stats ? Math.floor(stats.uptime) : 0}s
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Uptime</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Agents List */}
        <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <div className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">📊 Live Agents</h3>
              <Button onClick={loadAgents} variant="outline" size="small">
                Refresh
              </Button>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {agents.length === 0 ? (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                  No agents found
                </div>
              ) : (
                agents.map((agent) => (
                  <div key={agent.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-3 bg-gray-50 dark:bg-gray-700">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-mono text-sm text-gray-900 dark:text-gray-100">{agent.id}</div>
                      <Badge variant="outline">
                        {agent.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                      Type: {agent.type}
                    </div>
                    <div className="text-sm mb-2 text-gray-800 dark:text-gray-200">
                      {agent.task.description}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Started: {new Date(agent.startTime).toLocaleTimeString()}
                      {agent.endTime && (
                        <> | Duration: {formatDuration(agent.startTime, agent.endTime)}</>
                      )}
                    </div>
                    {agent.output.length > 0 && (
                      <details className="mt-2">
                        <summary className="text-xs text-blue-600 cursor-pointer">
                          Output ({agent.output.length} lines)
                        </summary>
                        <pre className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 p-2 rounded mt-1 overflow-auto max-h-20">
                          {agent.output.join('\n').substring(0, 300)}
                          {agent.output.join('\n').length > 300 ? '...' : ''}
                        </pre>
                      </details>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </Card>

        {/* Control Panel */}
        <div className="space-y-4">
          {/* Connection Tests */}
          <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <div className="p-4">
              <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">🔧 Connection Tests</h3>
              <div className="space-y-2">
              <Button 
                onClick={testConnection} 
                variant="outline" 
                fullWidth
              >
                Test Orchestration
              </Button>
              <Button 
                onClick={loadAgents} 
                variant="outline" 
                fullWidth
              >
                Test Gateway
              </Button>
              </div>
            </div>
          </Card>

          {/* Agent Controls */}
          <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <div className="p-4">
              <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">🚀 Agent Controls</h3>
              <div className="space-y-2">
              <Button 
                onClick={spawnAgent} 
                fullWidth
                disabled={!isConnected}
              >
                Spawn Single Agent
              </Button>
              <Button 
                onClick={spawnParallelAgents} 
                variant="secondary" 
                fullWidth
                disabled={!isConnected}
              >
                Spawn 3 Parallel Agents
              </Button>
              </div>
            </div>
          </Card>

          {/* Activity Log */}
          <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <div className="p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">📝 Activity Log</h3>
                <Button 
                  onClick={() => setActivityLog([])} 
                  variant="outline" 
                  size="small"
                >
                  Clear
                </Button>
              </div>
              <div 
                ref={logRef}
                className="bg-gray-900 dark:bg-black text-green-400 dark:text-green-300 p-3 rounded font-mono text-xs max-h-64 overflow-y-auto border border-gray-700 dark:border-gray-600"
              >
                {activityLog.length === 0 ? (
                  <div className="text-gray-500 dark:text-gray-400">Activity log will appear here...</div>
                ) : (
                  activityLog.map((log, index) => (
                    <div key={index}>{log}</div>
                  ))
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Status Bar */}
      <Card className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
          <div>
            Orchestration: <span className="text-yellow-600 dark:text-yellow-400">localhost:4191</span>
          </div>
          <div>
            Gateway: <span className="text-blue-600 dark:text-blue-400">localhost:4110</span>
          </div>
          <div>
            Last Update: <span className="text-green-600 dark:text-green-400">
              {new Date().toLocaleTimeString()}
            </span>
          </div>
        </div>
      </Card>
    </div>
    </div>
  );
}