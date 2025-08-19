"use client";

import React from "react";

// Force dynamic rendering to avoid prerendering issues
export const dynamic = 'force-dynamic';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AIDashboard } from "@/components/ai/AIDashboard";
import { TaskChainVisualizer } from "@/components/ai/TaskChainVisualizer";
import { MultiAgentMonitor } from "@/components/ai/MultiAgentMonitor";
import { Brain, GitBranch, Users } from "lucide-react";

// Mock data for demonstration
const mockChain = {
  id: "chain-1",
  name: "Portfolio Optimization Chain",
  goals: [
    "Analyze current portfolio",
    "Generate optimization suggestions",
    "Execute trades",
  ],
  tasks: [
    {
      id: "task-1",
      name: "Data Collection",
      description: "Gather portfolio and market data",
      status: "completed" as const,
      dependencies: [],
      progress: 100,
      estimatedDuration: 5000,
      actualDuration: 4800,
    },
    {
      id: "task-2",
      name: "Risk Analysis",
      description: "Analyze portfolio risk metrics",
      status: "completed" as const,
      dependencies: ["task-1"],
      progress: 100,
      estimatedDuration: 8000,
      actualDuration: 7500,
    },
    {
      id: "task-3",
      name: "Market Analysis",
      description: "Analyze market trends and opportunities",
      status: "executing" as const,
      dependencies: ["task-1"],
      progress: 65,
      estimatedDuration: 10000,
    },
    {
      id: "task-4",
      name: "Strategy Generation",
      description: "Generate optimization strategies",
      status: "pending" as const,
      dependencies: ["task-2", "task-3"],
      progress: 0,
      estimatedDuration: 12000,
    },
    {
      id: "task-5",
      name: "Backtesting",
      description: "Test strategies with historical data",
      status: "pending" as const,
      dependencies: ["task-4"],
      progress: 0,
      estimatedDuration: 15000,
    },
  ],
  executionOrder: [["task-1"], ["task-2", "task-3"], ["task-4"], ["task-5"]],
  status: "executing" as const,
  progress: 45,
  createdAt: new Date(Date.now() - 300000),
};

export default function AIPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="w-8 h-8" />
            AI Features
          </h1>
          <p className="text-muted-foreground mt-1">
            Advanced AI orchestration, multi-agent collaboration, and task
            automation
          </p>
        </div>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <Brain className="w-4 h-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="chains" className="flex items-center gap-2">
            <GitBranch className="w-4 h-4" />
            Task Chains
          </TabsTrigger>
          <TabsTrigger value="agents" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Multi-Agent
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <AIDashboard />
        </TabsContent>

        <TabsContent value="chains" className="space-y-6">
          <TaskChainVisualizer
            chain={mockChain}
            onPause={() => console.log("Pause chain")}
            onResume={() => console.log("Resume chain")}
            onStop={() => console.log("Stop chain")}
          />
        </TabsContent>

        <TabsContent value="agents">
          <MultiAgentMonitor />
        </TabsContent>
      </Tabs>
    </div>
  );
}
