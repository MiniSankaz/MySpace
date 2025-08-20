'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Play,
  Pause,
  Stop,
  Trash2,
  Plus,
  Terminal,
  Code,
  FileText,
  TestTube,
  Shield,
  GitBranch,
  Zap,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react';

interface Agent {
  id: string;
  type: string;
  status: string;
  task?: {
    id: string;
    description: string;
    progress?: number;
  };
  startTime: Date;
  endTime?: Date;
  output: string[];
  errors: string[];
  metadata: Record<string, any>;
}

interface AgentDashboardProps {
  apiKey?: string;
  wsUrl?: string;
}

const agentTypeIcons: Record<string, React.ReactNode> = {
  'business-analyst': <FileText className="h-4 w-4" />,
  'development-planner': <Code className="h-4 w-4" />,
  'technical-architect': <GitBranch className="h-4 w-4" />,
  'system-analyst': <Terminal className="h-4 w-4" />,
  'code-reviewer': <Shield className="h-4 w-4" />,
  'test-runner': <TestTube className="h-4 w-4" />,
  'general-purpose': <Zap className="h-4 w-4" />
};

const agentStatusColors: Record<string, string> = {
  'idle': 'secondary',
  'initializing': 'outline',
  'working': 'default',
  'waiting_approval': 'warning',
  'completed': 'success',
  'failed': 'destructive',
  'terminated': 'secondary'
};

const AgentDashboard: React.FC<AgentDashboardProps> = ({ apiKey, wsUrl }) => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [showSpawnDialog, setShowSpawnDialog] = useState(false);
  const [spawnForm, setSpawnForm] = useState({
    type: 'general-purpose',
    model: 'sonnet',
    taskDescription: '',
    taskPrompt: '',
    requiresApproval: false
  });

  useEffect(() => {
    // Fetch initial agents
    fetchAgents();

    // Set up polling for updates
    const interval = setInterval(fetchAgents, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchAgents = async () => {
    try {
      const response = await fetch('/api/v1/orchestration/agents', {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });
      const data = await response.json();
      setAgents(data);
    } catch (error) {
      console.error('Failed to fetch agents:', error);
    }
  };

  const spawnAgent = async () => {
    try {
      const response = await fetch('/api/v1/orchestration/agents/spawn', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          config: {
            type: spawnForm.type,
            model: spawnForm.model,
            requiresApproval: spawnForm.requiresApproval
          },
          task: spawnForm.taskDescription ? {
            description: spawnForm.taskDescription,
            prompt: spawnForm.taskPrompt
          } : undefined
        })
      });

      if (response.ok) {
        setShowSpawnDialog(false);
        setSpawnForm({
          type: 'general-purpose',
          model: 'sonnet',
          taskDescription: '',
          taskPrompt: '',
          requiresApproval: false
        });
        fetchAgents();
      }
    } catch (error) {
      console.error('Failed to spawn agent:', error);
    }
  };

  const terminateAgent = async (agentId: string) => {
    try {
      await fetch(`/api/v1/orchestration/agents/${agentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });
      fetchAgents();
    } catch (error) {
      console.error('Failed to terminate agent:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'idle':
        return <Clock className="h-4 w-4" />;
      case 'working':
        return <Play className="h-4 w-4 animate-pulse" />;
      case 'waiting_approval':
        return <AlertCircle className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'failed':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getAgentUptime = (agent: Agent) => {
    const start = new Date(agent.startTime).getTime();
    const end = agent.endTime ? new Date(agent.endTime).getTime() : Date.now();
    const duration = end - start;
    
    const hours = Math.floor(duration / 3600000);
    const minutes = Math.floor((duration % 3600000) / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold">Active Agents</h2>
          <p className="text-muted-foreground">
            {agents.length} agent{agents.length !== 1 ? 's' : ''} currently active
          </p>
        </div>
        <Dialog open={showSpawnDialog} onOpenChange={setShowSpawnDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Spawn Agent
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
              <DialogTitle>Spawn New Agent</DialogTitle>
              <DialogDescription>
                Configure and spawn a new AI agent for task execution
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="type" className="text-right">
                  Agent Type
                </Label>
                <Select
                  value={spawnForm.type}
                  onValueChange={(value) => setSpawnForm({ ...spawnForm, type: value })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general-purpose">General Purpose</SelectItem>
                    <SelectItem value="business-analyst">Business Analyst</SelectItem>
                    <SelectItem value="development-planner">Development Planner</SelectItem>
                    <SelectItem value="technical-architect">Technical Architect</SelectItem>
                    <SelectItem value="code-reviewer">Code Reviewer</SelectItem>
                    <SelectItem value="test-runner">Test Runner</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="model" className="text-right">
                  Model
                </Label>
                <Select
                  value={spawnForm.model}
                  onValueChange={(value) => setSpawnForm({ ...spawnForm, model: value })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="opus">Opus (Most Capable)</SelectItem>
                    <SelectItem value="sonnet">Sonnet (Balanced)</SelectItem>
                    <SelectItem value="haiku">Haiku (Fast)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="task" className="text-right">
                  Task
                </Label>
                <Input
                  id="task"
                  className="col-span-3"
                  placeholder="Brief task description"
                  value={spawnForm.taskDescription}
                  onChange={(e) => setSpawnForm({ ...spawnForm, taskDescription: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="prompt" className="text-right">
                  Prompt
                </Label>
                <Textarea
                  id="prompt"
                  className="col-span-3"
                  placeholder="Detailed instructions for the agent"
                  value={spawnForm.taskPrompt}
                  onChange={(e) => setSpawnForm({ ...spawnForm, taskPrompt: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="approval" className="text-right">
                  Approval
                </Label>
                <div className="col-span-3 flex items-center">
                  <input
                    type="checkbox"
                    id="approval"
                    checked={spawnForm.requiresApproval}
                    onChange={(e) => setSpawnForm({ ...spawnForm, requiresApproval: e.target.checked })}
                    className="mr-2"
                  />
                  <Label htmlFor="approval" className="font-normal">
                    Require approval for critical actions
                  </Label>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowSpawnDialog(false)}>
                Cancel
              </Button>
              <Button onClick={spawnAgent}>
                Spawn Agent
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Agent Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map((agent) => (
          <Card key={agent.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  {agentTypeIcons[agent.type] || <Zap className="h-4 w-4" />}
                  <CardTitle className="text-base">{agent.type}</CardTitle>
                </div>
                <Badge variant={agentStatusColors[agent.status] as any}>
                  <span className="flex items-center gap-1">
                    {getStatusIcon(agent.status)}
                    {agent.status}
                  </span>
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                ID: {agent.id.slice(0, 8)}...
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Task Info */}
              {agent.task && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Current Task:</p>
                  <p className="text-sm text-muted-foreground">
                    {agent.task.description}
                  </p>
                  {agent.task.progress !== undefined && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>Progress</span>
                        <span>{agent.task.progress}%</span>
                      </div>
                      <Progress value={agent.task.progress} className="h-2" />
                    </div>
                  )}
                </div>
              )}

              {/* Agent Stats */}
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Uptime</p>
                  <p className="font-medium">{getAgentUptime(agent)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Model</p>
                  <p className="font-medium">{agent.metadata.model || 'sonnet'}</p>
                </div>
              </div>

              {/* Error Count */}
              {agent.errors.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span>{agent.errors.length} error{agent.errors.length !== 1 ? 's' : ''}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setSelectedAgent(agent)}
                >
                  View Details
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => terminateAgent(agent.id)}
                  disabled={agent.status === 'terminated'}
                >
                  <Stop className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {agents.length === 0 && (
        <Card className="p-12">
          <div className="text-center space-y-3">
            <Zap className="h-12 w-12 text-muted-foreground mx-auto" />
            <h3 className="text-lg font-semibold">No Active Agents</h3>
            <p className="text-muted-foreground">
              Spawn an agent to start processing tasks
            </p>
            <Button onClick={() => setShowSpawnDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Spawn First Agent
            </Button>
          </div>
        </Card>
      )}

      {/* Agent Details Modal */}
      {selectedAgent && (
        <Dialog open={!!selectedAgent} onOpenChange={() => setSelectedAgent(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Agent Details</DialogTitle>
              <DialogDescription>
                {selectedAgent.type} - {selectedAgent.id}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* Output */}
              {selectedAgent.output.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Output</h4>
                  <div className="bg-muted p-3 rounded-md max-h-64 overflow-y-auto">
                    <pre className="text-sm font-mono whitespace-pre-wrap">
                      {selectedAgent.output.join('\n')}
                    </pre>
                  </div>
                </div>
              )}
              
              {/* Errors */}
              {selectedAgent.errors.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2 text-destructive">Errors</h4>
                  <div className="bg-destructive/10 p-3 rounded-md max-h-64 overflow-y-auto">
                    <pre className="text-sm font-mono whitespace-pre-wrap text-destructive">
                      {selectedAgent.errors.join('\n')}
                    </pre>
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div>
                <h4 className="font-medium mb-2">Metadata</h4>
                <div className="bg-muted p-3 rounded-md">
                  <pre className="text-sm font-mono">
                    {JSON.stringify(selectedAgent.metadata, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default AgentDashboard;