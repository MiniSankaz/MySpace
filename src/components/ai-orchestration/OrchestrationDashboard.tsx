'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Activity,
  Users,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Play,
  Pause,
  Trash2,
  RefreshCw,
  Lock,
  Unlock
} from 'lucide-react';
import AgentDashboard from './AgentDashboard';
import TaskManager from './TaskManager';
import ResourceMonitor from './ResourceMonitor';
import UsageTracker from './UsageTracker';
import ApprovalCenter from './ApprovalCenter';

interface OrchestrationStats {
  activeAgents: number;
  queuedTasks: number;
  completedTasks: number;
  failedTasks: number;
  totalUsage: {
    opus: number;
    sonnet: number;
    haiku: number;
  };
  estimatedCost: number;
  resourceLocks: number;
}

interface OrchestrationDashboardProps {
  userId?: string;
  apiKey?: string;
  wsUrl?: string;
}

const OrchestrationDashboard: React.FC<OrchestrationDashboardProps> = ({
  userId,
  apiKey,
  wsUrl = 'ws://localhost:4111'
}) => {
  const [activeTab, setActiveTab] = useState('agents');
  const [stats, setStats] = useState<OrchestrationStats>({
    activeAgents: 0,
    queuedTasks: 0,
    completedTasks: 0,
    failedTasks: 0,
    totalUsage: { opus: 0, sonnet: 0, haiku: 0 },
    estimatedCost: 0,
    resourceLocks: 0
  });
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');
  const [alerts, setAlerts] = useState<Array<{ id: string; type: 'info' | 'warning' | 'error'; message: string }>>([]);

  // WebSocket connection
  useEffect(() => {
    const connectWebSocket = () => {
      const ws = new WebSocket(`${wsUrl}/orchestration`);

      ws.onopen = () => {
        setConnectionStatus('connected');
        console.log('Connected to orchestration service');
      };

      ws.onclose = () => {
        setConnectionStatus('disconnected');
        console.log('Disconnected from orchestration service');
        // Attempt reconnection after 3 seconds
        setTimeout(connectWebSocket, 3000);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('disconnected');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWebSocketMessage(data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      return ws;
    };

    const ws = connectWebSocket();
    return () => ws.close();
  }, [wsUrl]);

  const handleWebSocketMessage = (data: any) => {
    switch (data.type) {
      case 'stats.update':
        setStats(data.stats);
        break;
      case 'alert':
        addAlert(data.alert);
        break;
      default:
        // Handle other message types in child components
        break;
    }
  };

  const addAlert = (alert: { type: 'info' | 'warning' | 'error'; message: string }) => {
    const id = Date.now().toString();
    setAlerts(prev => [...prev, { id, ...alert }]);
    
    // Auto-remove alert after 5 seconds
    setTimeout(() => {
      setAlerts(prev => prev.filter(a => a.id !== id));
    }, 5000);
  };

  const dismissAlert = (id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  const getConnectionBadge = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Badge variant="success" className="flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          Connected
        </Badge>;
      case 'disconnected':
        return <Badge variant="destructive" className="flex items-center gap-1">
          <XCircle className="h-3 w-3" />
          Disconnected
        </Badge>;
      case 'connecting':
        return <Badge variant="secondary" className="flex items-center gap-1">
          <RefreshCw className="h-3 w-3 animate-spin" />
          Connecting
        </Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">AI Orchestration Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Manage and monitor AI agents, tasks, and resources
          </p>
        </div>
        <div className="flex items-center gap-4">
          {getConnectionBadge()}
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map(alert => (
            <Alert key={alert.id} variant={alert.type === 'error' ? 'destructive' : 'default'}>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex justify-between items-center">
                <span>{alert.message}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => dismissAlert(alert.id)}
                >
                  ×
                </Button>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeAgents}</div>
            <p className="text-xs text-muted-foreground">Currently running</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Queued Tasks</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.queuedTasks}</div>
            <p className="text-xs text-muted-foreground">Waiting to process</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.completedTasks + stats.failedTasks > 0
                ? Math.round((stats.completedTasks / (stats.completedTasks + stats.failedTasks)) * 100)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.completedTasks} completed, {stats.failedTasks} failed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Est. Cost</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.estimatedCost.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">This period</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="agents">Agents</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="usage">Usage</TabsTrigger>
          <TabsTrigger value="approvals">
            Approvals
            {stats.queuedTasks > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 rounded-full">
                {stats.queuedTasks}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="agents" className="space-y-4">
          <AgentDashboard 
            apiKey={apiKey}
            wsUrl={wsUrl}
          />
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <TaskManager 
            apiKey={apiKey}
            wsUrl={wsUrl}
          />
        </TabsContent>

        <TabsContent value="resources" className="space-y-4">
          <ResourceMonitor 
            apiKey={apiKey}
            wsUrl={wsUrl}
          />
        </TabsContent>

        <TabsContent value="usage" className="space-y-4">
          <UsageTracker 
            apiKey={apiKey}
            wsUrl={wsUrl}
          />
        </TabsContent>

        <TabsContent value="approvals" className="space-y-4">
          <ApprovalCenter 
            apiKey={apiKey}
            wsUrl={wsUrl}
            userId={userId}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OrchestrationDashboard;