"use client";

import React, { useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  PlayCircle,
  PauseCircle,
  StopCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  GitBranch,
  ArrowRight,
  Zap,
} from "lucide-react";

interface Task {
  id: string;
  name: string;
  description: string;
  status: "pending" | "executing" | "completed" | "failed";
  dependencies: string[];
  progress: number;
  estimatedDuration: number;
  actualDuration?: number;
}

interface TaskChain {
  id: string;
  name: string;
  goals: string[];
  tasks: Task[];
  executionOrder: string[][];
  status: "planning" | "executing" | "completed" | "failed" | "paused";
  progress: number;
  createdAt: Date;
  completedAt?: Date;
}

interface TaskChainVisualizerProps {
  chain: TaskChain;
  onPause?: () => void;
  onResume?: () => void;
  onStop?: () => void;
}

export function TaskChainVisualizer({
  chain,
  onPause,
  onResume,
  onStop,
}: TaskChainVisualizerProps) {
  const getTaskById = (taskId: string): Task | undefined => {
    return chain.tasks.find((t) => t.id === taskId);
  };

  const getStatusIcon = (status: Task["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case "executing":
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case "failed":
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: Task["status"]) => {
    switch (status) {
      case "completed":
        return "bg-green-500";
      case "executing":
        return "bg-blue-500";
      case "failed":
        return "bg-red-500";
      default:
        return "bg-gray-300";
    }
  };

  const overallProgress = useMemo(() => {
    if (chain.tasks.length === 0) return 0;
    const completed = chain.tasks.filter(
      (t) => t.status === "completed",
    ).length;
    return (completed / chain.tasks.length) * 100;
  }, [chain.tasks]);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="w-5 h-5" />
              {chain.name}
            </CardTitle>
            <CardDescription className="mt-1">
              {chain.goals.join(" → ")}
            </CardDescription>
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
            {chain.status === "executing" && (
              <>
                <Button variant="ghost" size="icon" onClick={onPause}>
                  <PauseCircle className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={onStop}>
                  <StopCircle className="w-5 h-5" />
                </Button>
              </>
            )}
            {chain.status === "paused" && (
              <Button variant="ghost" size="icon" onClick={onResume}>
                <PlayCircle className="w-5 h-5" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Progress */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className="text-sm text-muted-foreground">
              {overallProgress.toFixed(0)}%
            </span>
          </div>
          <Progress value={overallProgress} className="h-2" />
          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
            <span>
              {chain.tasks.filter((t) => t.status === "completed").length}{" "}
              completed
            </span>
            <span>{chain.tasks.length} total tasks</span>
          </div>
        </div>

        {/* Execution Flow Visualization */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold">Execution Flow</h4>
          <div className="relative">
            {chain.executionOrder.map((batch, batchIndex) => (
              <div key={batchIndex} className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="text-xs font-medium text-muted-foreground">
                    Stage {batchIndex + 1}
                  </div>
                  {batchIndex < chain.executionOrder.length - 1 && (
                    <ArrowRight className="w-3 h-3 text-muted-foreground" />
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {batch.map((taskId) => {
                    const task = getTaskById(taskId);
                    if (!task) return null;

                    return (
                      <div
                        key={task.id}
                        className={`
                          relative p-3 border rounded-lg transition-all
                          ${task.status === "executing" ? "border-blue-500 shadow-md" : ""}
                          ${task.status === "completed" ? "bg-green-50 border-green-200" : ""}
                          ${task.status === "failed" ? "bg-red-50 border-red-200" : ""}
                        `}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-start gap-2">
                            {getStatusIcon(task.status)}
                            <div className="flex-1">
                              <h5 className="font-medium text-sm">
                                {task.name}
                              </h5>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {task.description}
                              </p>
                            </div>
                          </div>
                        </div>

                        {task.status === "executing" && (
                          <Progress
                            value={task.progress}
                            className="h-1 mt-2"
                          />
                        )}

                        {task.dependencies.length > 0 && (
                          <div className="flex items-center gap-1 mt-2">
                            <GitBranch className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              Depends on {task.dependencies.length} task(s)
                            </span>
                          </div>
                        )}

                        <div className="flex items-center gap-2 mt-2">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {task.actualDuration
                              ? `${(task.actualDuration / 1000).toFixed(1)}s`
                              : `Est. ${(task.estimatedDuration / 1000).toFixed(0)}s`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Task Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-500">
              {chain.tasks.filter((t) => t.status === "completed").length}
            </div>
            <p className="text-xs text-muted-foreground">Completed</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-500">
              {chain.tasks.filter((t) => t.status === "executing").length}
            </div>
            <p className="text-xs text-muted-foreground">Running</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-500">
              {chain.tasks.filter((t) => t.status === "pending").length}
            </div>
            <p className="text-xs text-muted-foreground">Pending</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-500">
              {chain.tasks.filter((t) => t.status === "failed").length}
            </div>
            <p className="text-xs text-muted-foreground">Failed</p>
          </div>
        </div>

        {/* Optimization Suggestions */}
        {chain.status === "executing" && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 text-sm">
              <Zap className="w-4 h-4 text-blue-500" />
              <span className="font-medium">Optimization Tip:</span>
              <span className="text-muted-foreground">
                {chain.tasks.filter(
                  (t) => !t.dependencies.length && t.status === "pending",
                ).length > 1
                  ? "Multiple independent tasks detected. Consider parallel execution."
                  : "Task chain is optimally configured."}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
