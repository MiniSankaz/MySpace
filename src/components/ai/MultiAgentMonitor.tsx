"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  Bot,
  MessageSquare,
  Activity,
  Award,
  Cpu,
  Zap,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  BarChart3,
} from "lucide-react";

interface Agent {
  id: string;
  name: string;
  type: string;
  status: "idle" | "busy" | "thinking" | "communicating" | "error" | "offline";
  workload: number;
  performance: {
    tasksCompleted: number;
    successRate: number;
    averageResponseTime: number;
    reputation: number;
  };
  currentTask?: string;
  capabilities: string[];
}

interface CollaborationSession {
  id: string;
  goal: string;
  participants: string[];
  coordinator: string;
  status: "planning" | "executing" | "reviewing" | "completed";
  progress: number;
  consensus?: number;
  decisions: number;
}

interface Message {
  id: string;
  from: string;
  to: string;
  type: "request" | "response" | "notification" | "collaboration";
  content: string;
  timestamp: Date;
}

export function MultiAgentMonitor() {
  const [agents, setAgents] = useState<Agent[]>([
    {
      id: "agent-1",
      name: "CodeMaster",
      type: "Code Assistant",
      status: "busy",
      workload: 65,
      performance: {
        tasksCompleted: 142,
        successRate: 94.5,
        averageResponseTime: 1.2,
        reputation: 98,
      },
      currentTask: "Refactoring authentication module",
      capabilities: [
        "code-generation",
        "refactoring",
        "debugging",
        "optimization",
      ],
    },
    {
      id: "agent-2",
      name: "MarketSage",
      type: "Portfolio Analyst",
      status: "thinking",
      workload: 80,
      performance: {
        tasksCompleted: 89,
        successRate: 91.2,
        averageResponseTime: 2.1,
        reputation: 95,
      },
      currentTask: "Analyzing market trends",
      capabilities: [
        "market-analysis",
        "risk-assessment",
        "portfolio-optimization",
      ],
    },
    {
      id: "agent-3",
      name: "TaskOrganizer",
      type: "Project Manager",
      status: "communicating",
      workload: 45,
      performance: {
        tasksCompleted: 203,
        successRate: 97.8,
        averageResponseTime: 0.8,
        reputation: 99,
      },
      currentTask: "Coordinating multi-agent session",
      capabilities: [
        "planning",
        "scheduling",
        "resource-allocation",
        "progress-tracking",
      ],
    },
    {
      id: "agent-4",
      name: "DataWizard",
      type: "Data Analyst",
      status: "idle",
      workload: 20,
      performance: {
        tasksCompleted: 67,
        successRate: 89.5,
        averageResponseTime: 1.8,
        reputation: 92,
      },
      capabilities: ["data-processing", "pattern-recognition", "visualization"],
    },
    {
      id: "agent-5",
      name: "QualityGuard",
      type: "Test Engineer",
      status: "busy",
      workload: 55,
      performance: {
        tasksCompleted: 118,
        successRate: 96.3,
        averageResponseTime: 1.5,
        reputation: 97,
      },
      currentTask: "Running integration tests",
      capabilities: [
        "test-generation",
        "test-execution",
        "bug-detection",
        "coverage-analysis",
      ],
    },
  ]);

  const [activeSession, setActiveSession] = useState<CollaborationSession>({
    id: "session-1",
    goal: "Optimize portfolio performance with new trading algorithm",
    participants: ["agent-1", "agent-2", "agent-3"],
    coordinator: "agent-3",
    status: "executing",
    progress: 65,
    consensus: 85,
    decisions: 3,
  });

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "msg-1",
      from: "TaskOrganizer",
      to: "CodeMaster",
      type: "request",
      content:
        "Please implement the new trading algorithm based on the analysis",
      timestamp: new Date(Date.now() - 120000),
    },
    {
      id: "msg-2",
      from: "CodeMaster",
      to: "TaskOrganizer",
      type: "response",
      content: "Algorithm implementation in progress, ETA 5 minutes",
      timestamp: new Date(Date.now() - 60000),
    },
    {
      id: "msg-3",
      from: "MarketSage",
      to: "all",
      type: "notification",
      content: "Market volatility detected, adjusting risk parameters",
      timestamp: new Date(Date.now() - 30000),
    },
  ]);

  const getStatusColor = (status: Agent["status"]) => {
    switch (status) {
      case "busy":
        return "bg-blue-500";
      case "idle":
        return "bg-green-500";
      case "thinking":
        return "bg-yellow-500";
      case "communicating":
        return "bg-purple-500";
      case "error":
        return "bg-red-500";
      case "offline":
        return "bg-gray-500";
      default:
        return "bg-gray-300";
    }
  };

  const getAgentAvatar = (name: string) => {
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {agents.filter((a) => a.status !== "offline").length}/
              {agents.length}
            </div>
            <Progress
              value={
                (agents.filter((a) => a.status !== "offline").length /
                  agents.length) *
                100
              }
              className="mt-2 h-1"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Workload</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(
                agents.reduce((sum, a) => sum + a.workload, 0) / agents.length,
              )}
              %
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all agents
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(
                agents.reduce((sum, a) => sum + a.performance.successRate, 0) /
                agents.length
              ).toFixed(1)}
              %
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Average performance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {agents.reduce((sum, a) => sum + a.performance.tasksCompleted, 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Completed today
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="agents" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="agents">Agents</TabsTrigger>
          <TabsTrigger value="collaboration">Collaboration</TabsTrigger>
          <TabsTrigger value="communication">Communication</TabsTrigger>
        </TabsList>

        <TabsContent value="agents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Agent Status & Performance</CardTitle>
              <CardDescription>
                Real-time monitoring of all AI agents
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {agents.map((agent) => (
                  <div key={agent.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <Avatar>
                          <AvatarFallback
                            className={getStatusColor(agent.status)}
                          >
                            <Bot className="w-5 h-5 text-white" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold">{agent.name}</h4>
                            <Badge variant="outline" className="text-xs">
                              {agent.type}
                            </Badge>
                            <Badge
                              variant={
                                agent.status === "busy"
                                  ? "default"
                                  : agent.status === "idle"
                                    ? "secondary"
                                    : agent.status === "error"
                                      ? "destructive"
                                      : "outline"
                              }
                              className="text-xs"
                            >
                              {agent.status}
                            </Badge>
                          </div>
                          {agent.currentTask && (
                            <p className="text-sm text-muted-foreground mb-2">
                              {agent.currentTask}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-1 mb-2">
                            {agent.capabilities.slice(0, 3).map((cap) => (
                              <Badge
                                key={cap}
                                variant="outline"
                                className="text-xs"
                              >
                                {cap}
                              </Badge>
                            ))}
                            {agent.capabilities.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{agent.capabilities.length - 3}
                              </Badge>
                            )}
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">
                                Workload
                              </span>
                              <span>{agent.workload}%</span>
                            </div>
                            <Progress value={agent.workload} className="h-1" />
                          </div>
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <div className="flex items-center gap-1 justify-end">
                          <Award className="w-4 h-4 text-yellow-500" />
                          <span className="text-sm font-medium">
                            {agent.performance.reputation}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {agent.performance.tasksCompleted} tasks
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {agent.performance.successRate}% success
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {agent.performance.averageResponseTime}s avg
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="collaboration" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Collaboration Session</CardTitle>
              <CardDescription>
                Multi-agent coordination and consensus building
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-accent rounded-lg">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold mb-1">Goal</h4>
                    <p className="text-sm text-muted-foreground">
                      {activeSession.goal}
                    </p>
                  </div>
                  <Badge>{activeSession.status}</Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Coordinator
                    </p>
                    <div className="flex items-center gap-2">
                      <Avatar className="w-6 h-6">
                        <AvatarFallback className="text-xs">TO</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">
                        {
                          agents.find((a) => a.id === activeSession.coordinator)
                            ?.name
                        }
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Participants
                    </p>
                    <div className="flex -space-x-2">
                      {activeSession.participants.map((id) => {
                        const agent = agents.find((a) => a.id === id);
                        return (
                          <Avatar
                            key={id}
                            className="w-6 h-6 border-2 border-background"
                          >
                            <AvatarFallback className="text-xs">
                              {getAgentAvatar(agent?.name || "")}
                            </AvatarFallback>
                          </Avatar>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm">Session Progress</span>
                      <span className="text-sm text-muted-foreground">
                        {activeSession.progress}%
                      </span>
                    </div>
                    <Progress value={activeSession.progress} className="h-2" />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm">Consensus Level</span>
                      <span className="text-sm text-muted-foreground">
                        {activeSession.consensus}%
                      </span>
                    </div>
                    <Progress value={activeSession.consensus} className="h-2" />
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MessageSquare className="w-4 h-4" />
                    <span>{activeSession.decisions} decisions made</span>
                  </div>
                  <Button size="sm" variant="outline">
                    View Details
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="communication" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Agent Communication</CardTitle>
              <CardDescription>
                Inter-agent messages and coordination
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-3">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className="flex gap-3 p-3 hover:bg-accent rounded-lg"
                    >
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="text-xs">
                          {getAgentAvatar(message.from)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">
                            {message.from}
                          </span>
                          <ArrowRight className="w-3 h-3 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {message.to === "all" ? "All Agents" : message.to}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {message.type}
                          </Badge>
                        </div>
                        <p className="text-sm">{message.content}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ArrowRight({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      height="24"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width="24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <line x1="5" x2="19" y1="12" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}
