"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Brain,
  Zap,
  Users,
  Activity,
  Target,
  CheckCircle,
  AlertCircle,
  Clock,
  TrendingUp,
  Layers,
} from "lucide-react";
import { useAIOrchestration } from "@/hooks/useAIOrchestration";

interface AIStats {
  totalTasks: number;
  completedTasks: number;
  activeChains: number;
  activeAgents: number;
  successRate: number;
  avgResponseTime: number;
}

export function AIDashboard() {
  const { chains, createChain, getChainStatus } = useAIOrchestration();
  const [stats, setStats] = useState<AIStats>({
    totalTasks: 0,
    completedTasks: 0,
    activeChains: 0,
    activeAgents: 0,
    successRate: 0,
    avgResponseTime: 0,
  });

  const [selectedChain, setSelectedChain] = useState<string | null>(null);

  useEffect(() => {
    // Calculate stats from chains
    const activeChains = chains.filter((c) => c.status === "executing").length;
    const totalTasks = chains.reduce(
      (sum, c) => sum + (c.tasks?.length || 0),
      0,
    );
    const completedTasks = chains.reduce(
      (sum, c) =>
        sum +
        (c.tasks?.filter((t: any) => t.status === "completed").length || 0),
      0,
    );

    setStats({
      totalTasks,
      completedTasks,
      activeChains,
      activeAgents: 5, // From multi-agent coordinator
      successRate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
      avgResponseTime: 1.2, // Mock for now
    });
  }, [chains]);

  const handleCreateChain = async () => {
    const goals = [
      "Analyze portfolio performance",
      "Generate optimization suggestions",
    ];
    await createChain(goals);
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="w-8 h-8 text-primary" />
            AI Control Center
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage AI orchestration, agents, and task chains
          </p>
        </div>
        <Button onClick={handleCreateChain} size="lg">
          <Zap className="w-4 h-4 mr-2" />
          New Task Chain
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Chains</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeChains}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalTasks} total tasks
            </p>
            <Progress
              value={
                (stats.completedTasks / Math.max(stats.totalTasks, 1)) * 100
              }
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeAgents}</div>
            <div className="flex gap-1 mt-2">
              <Badge variant="outline" className="text-xs">
                CodeMaster
              </Badge>
              <Badge variant="outline" className="text-xs">
                MarketSage
              </Badge>
              <Badge variant="outline" className="text-xs">
                +3
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.successRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.completedTasks} completed tasks
            </p>
            <div className="flex gap-1 mt-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-xs">{stats.completedTasks}</span>
              <AlertCircle className="w-4 h-4 text-yellow-500 ml-2" />
              <span className="text-xs">
                {stats.totalTasks - stats.completedTasks}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgResponseTime}s</div>
            <p className="text-xs text-muted-foreground">Per task execution</p>
            <div className="flex items-center gap-1 mt-2">
              <Clock className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                Real-time processing
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="chains" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="chains">Task Chains</TabsTrigger>
          <TabsTrigger value="agents">Agents</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="chains" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Task Chains</CardTitle>
              <CardDescription>
                Monitor and manage running task orchestrations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                {chains.length > 0 ? (
                  <div className="space-y-4">
                    {chains.map((chain) => (
                      <div
                        key={chain.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent cursor-pointer"
                        onClick={() => setSelectedChain(chain.id)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <Target className="w-8 h-8 text-primary" />
                            {chain.status === "executing" && (
                              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                            )}
                          </div>
                          <div>
                            <h3 className="font-semibold">{chain.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {chain.goals?.join(", ").substring(0, 50)}...
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              chain.status === "completed"
                                ? "default"
                                : chain.status === "executing"
                                  ? "secondary"
                                  : chain.status === "failed"
                                    ? "destructive"
                                    : "outline"
                            }
                          >
                            {chain.status}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {chain.tasks?.length || 0} tasks
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Brain className="w-12 h-12 text-muted-foreground mb-4" />
                    <h3 className="font-semibold mb-2">No Active Chains</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Create a new task chain to start AI orchestration
                    </p>
                    <Button onClick={handleCreateChain}>
                      Create First Chain
                    </Button>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI Agents</CardTitle>
              <CardDescription>
                Monitor agent status and performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {
                    name: "CodeMaster",
                    type: "Code Assistant",
                    status: "idle",
                    tasks: 12,
                  },
                  {
                    name: "MarketSage",
                    type: "Portfolio Analyst",
                    status: "busy",
                    tasks: 8,
                  },
                  {
                    name: "TaskOrganizer",
                    type: "Project Manager",
                    status: "idle",
                    tasks: 15,
                  },
                  {
                    name: "DataWizard",
                    type: "Data Analyst",
                    status: "idle",
                    tasks: 6,
                  },
                  {
                    name: "QualityGuard",
                    type: "Test Engineer",
                    status: "busy",
                    tasks: 10,
                  },
                ].map((agent) => (
                  <div key={agent.name} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">{agent.name}</h4>
                      <Badge
                        variant={
                          agent.status === "busy" ? "default" : "outline"
                        }
                      >
                        {agent.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {agent.type}
                    </p>
                    <div className="flex items-center justify-between text-sm">
                      <span>Tasks completed</span>
                      <span className="font-medium">{agent.tasks}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Real-time AI system activity log
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-2">
                  {[
                    {
                      time: "2 min ago",
                      event: "Task chain completed",
                      type: "success",
                    },
                    {
                      time: "5 min ago",
                      event: "Agent CodeMaster assigned to task",
                      type: "info",
                    },
                    {
                      time: "8 min ago",
                      event: "New goal analysis started",
                      type: "info",
                    },
                    {
                      time: "12 min ago",
                      event: "Multi-agent collaboration initiated",
                      type: "warning",
                    },
                    {
                      time: "15 min ago",
                      event: "Task retry after error",
                      type: "error",
                    },
                  ].map((activity, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 p-3 hover:bg-accent rounded"
                    >
                      <div
                        className={`w-2 h-2 rounded-full mt-1.5 ${
                          activity.type === "success"
                            ? "bg-green-500"
                            : activity.type === "error"
                              ? "bg-red-500"
                              : activity.type === "warning"
                                ? "bg-yellow-500"
                                : "bg-blue-500"
                        }`}
                      />
                      <div className="flex-1">
                        <p className="text-sm">{activity.event}</p>
                        <p className="text-xs text-muted-foreground">
                          {activity.time}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI Insights</CardTitle>
              <CardDescription>
                Performance analytics and recommendations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-accent rounded-lg">
                  <h4 className="font-semibold mb-2">
                    🎯 Optimization Opportunity
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Task chains with portfolio analysis are taking 30% longer
                    than average. Consider breaking down complex analyses into
                    smaller parallel tasks.
                  </p>
                </div>
                <div className="p-4 bg-accent rounded-lg">
                  <h4 className="font-semibold mb-2">📈 Performance Trend</h4>
                  <p className="text-sm text-muted-foreground">
                    Success rate improved by 15% over the last 24 hours. Agent
                    collaboration is showing positive results.
                  </p>
                </div>
                <div className="p-4 bg-accent rounded-lg">
                  <h4 className="font-semibold mb-2">💡 Recommendation</h4>
                  <p className="text-sm text-muted-foreground">
                    Enable caching for frequently requested analyses to reduce
                    response time by up to 50%.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
