"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChartBarIcon,
  CommandLineIcon,
  LightBulbIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  TrendingUpIcon,
  DocumentTextIcon,
  CogIcon,
} from "@heroicons/react/24/outline";

interface TerminalAnalyticsPanelProps {
  userId?: string;
  projectId?: string;
}

interface Analytics {
  totalCommands: number;
  uniqueCommands: number;
  errorRate: number;
  avgSessionDuration: number;
  peakHours: number[];
  mostUsedCommands: Array<{
    command: string;
    frequency: number;
    successRate: number;
  }>;
  workflowPatterns: Array<{
    pattern: string[];
    frequency: number;
  }>;
}

interface Recommendations {
  shortcuts: Array<{
    alias: string;
    command: string;
    reason: string;
  }>;
  sops: Array<{
    title: string;
    workflow: string[];
    benefit: string;
  }>;
}

const TerminalAnalyticsPanel: React.FC<TerminalAnalyticsPanelProps> = ({
  userId,
  projectId,
}) => {
  const [activeTab, setActiveTab] = useState<
    "overview" | "commands" | "workflows" | "insights"
  >("overview");
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [recommendations, setRecommendations] =
    useState<Recommendations | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(30); // days

  useEffect(() => {
    fetchAnalytics();
  }, [userId, timeRange]);

  const fetchAnalytics = async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const response = await fetch(
        `/api/terminal/logs?userId=${userId}&days=${timeRange}`,
      );
      const data = await response.json();

      if (data.analytics && data.analytics.length > 0) {
        // Aggregate analytics data
        const aggregated = aggregateAnalytics(data.analytics);
        setAnalytics(aggregated);
      }

      // Fetch recommendations
      const patternsResponse = await fetch(
        `/api/terminal/patterns?userId=${userId}`,
      );
      const patternsData = await patternsResponse.json();

      // Generate recommendations from patterns
      const recs = generateRecommendations(patternsData.patterns);
      setRecommendations(recs);
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const aggregateAnalytics = (analyticsData: any[]): Analytics => {
    // Aggregate multiple days of analytics
    const aggregated: Analytics = {
      totalCommands: 0,
      uniqueCommands: new Set<string>(),
      errorRate: 0,
      avgSessionDuration: 0,
      peakHours: [],
      mostUsedCommands: [],
      workflowPatterns: [],
    };

    for (const day of analyticsData) {
      aggregated.totalCommands += day.commandCount;
      aggregated.errorRate += day.errorCount;
      aggregated.avgSessionDuration += day.totalDuration;

      // Merge unique commands
      if (day.uniqueCommands) {
        day.uniqueCommands.forEach((cmd: string) =>
          aggregated.uniqueCommands.add(cmd),
        );
      }
    }

    // Calculate averages
    if (analyticsData.length > 0) {
      aggregated.errorRate =
        (aggregated.errorRate / aggregated.totalCommands) * 100;
      aggregated.avgSessionDuration =
        aggregated.avgSessionDuration / analyticsData.length;
    }

    return {
      ...aggregated,
      uniqueCommands: aggregated.uniqueCommands.size,
    } as Analytics;
  };

  const generateRecommendations = (patterns: any[]): Recommendations => {
    const shortcuts: any[] = [];
    const sops: any[] = [];

    // Generate shortcuts from frequent patterns
    if (patterns && patterns.length > 0) {
      patterns.slice(0, 5).forEach((p) => {
        if (p.pattern && p.count > 5) {
          const commands = p.pattern.split(" -> ");
          if (commands.length === 1) {
            shortcuts.push({
              alias: commands[0].substring(0, 3),
              command: commands[0],
              reason: `Used ${p.count} times`,
            });
          } else {
            sops.push({
              title: `Workflow: ${commands[0]}`,
              workflow: commands,
              benefit: `Automate ${p.count} repetitions`,
            });
          }
        }
      });
    }

    return { shortcuts, sops };
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-900 text-gray-100">
      {/* Header */}
      <div className="border-b border-gray-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ChartBarIcon className="w-5 h-5 text-blue-400" />
            Terminal Analytics
          </h2>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(parseInt(e.target.value))}
            className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mt-4">
          {[
            { id: "overview", label: "Overview", icon: ChartBarIcon },
            { id: "commands", label: "Commands", icon: CommandLineIcon },
            { id: "workflows", label: "Workflows", icon: DocumentTextIcon },
            { id: "insights", label: "Insights", icon: LightBulbIcon },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded transition-colors ${
                activeTab === tab.id
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        <AnimatePresence mode="wait">
          {activeTab === "overview" && analytics && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="text-gray-400 text-sm">Total Commands</div>
                  <div className="text-2xl font-bold text-white mt-1">
                    {analytics.totalCommands.toLocaleString()}
                  </div>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="text-gray-400 text-sm">Unique Commands</div>
                  <div className="text-2xl font-bold text-white mt-1">
                    {analytics.uniqueCommands}
                  </div>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="text-gray-400 text-sm">Error Rate</div>
                  <div className="text-2xl font-bold text-white mt-1">
                    {analytics.errorRate.toFixed(1)}%
                  </div>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="text-gray-400 text-sm">Avg Session</div>
                  <div className="text-2xl font-bold text-white mt-1">
                    {formatDuration(analytics.avgSessionDuration)}
                  </div>
                </div>
              </div>

              {/* Most Used Commands */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-3">
                  Most Used Commands
                </h3>
                <div className="space-y-2">
                  {analytics.mostUsedCommands?.slice(0, 5).map((cmd, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between"
                    >
                      <span className="font-mono text-sm">{cmd.command}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-400">
                          {cmd.frequency} uses
                        </span>
                        <div className="w-20 bg-gray-700 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              cmd.successRate > 90
                                ? "bg-green-500"
                                : cmd.successRate > 70
                                  ? "bg-yellow-500"
                                  : "bg-red-500"
                            }`}
                            style={{ width: `${cmd.successRate}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "commands" && analytics && (
            <motion.div
              key="commands"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-3">Command Analysis</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left border-b border-gray-700">
                        <th className="pb-2 text-gray-400">Command</th>
                        <th className="pb-2 text-gray-400">Frequency</th>
                        <th className="pb-2 text-gray-400">Success Rate</th>
                        <th className="pb-2 text-gray-400">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.mostUsedCommands?.map((cmd, idx) => (
                        <tr key={idx} className="border-b border-gray-700/50">
                          <td className="py-2 font-mono text-sm">
                            {cmd.command}
                          </td>
                          <td className="py-2">{cmd.frequency}</td>
                          <td className="py-2">
                            <span
                              className={`px-2 py-1 rounded text-xs ${
                                cmd.successRate > 90
                                  ? "bg-green-900 text-green-300"
                                  : cmd.successRate > 70
                                    ? "bg-yellow-900 text-yellow-300"
                                    : "bg-red-900 text-red-300"
                              }`}
                            >
                              {cmd.successRate.toFixed(0)}%
                            </span>
                          </td>
                          <td className="py-2">
                            <button className="text-blue-400 hover:text-blue-300 text-sm">
                              Create Alias
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "workflows" && analytics && (
            <motion.div
              key="workflows"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-3">
                  Detected Workflows
                </h3>
                <div className="space-y-3">
                  {analytics.workflowPatterns?.map((workflow, idx) => (
                    <div
                      key={idx}
                      className="border border-gray-700 rounded-lg p-3"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-400">
                          Frequency: {workflow.frequency}
                        </span>
                        <button className="text-blue-400 hover:text-blue-300 text-sm">
                          Create SOP
                        </button>
                      </div>
                      <div className="space-y-1">
                        {workflow.pattern.map((cmd, cmdIdx) => (
                          <div key={cmdIdx} className="flex items-center gap-2">
                            <span className="text-gray-500">{cmdIdx + 1}.</span>
                            <code className="bg-gray-900 px-2 py-1 rounded text-sm">
                              {cmd}
                            </code>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "insights" && recommendations && (
            <motion.div
              key="insights"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* Suggested Shortcuts */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <CogIcon className="w-5 h-5 text-purple-400" />
                  Suggested Shortcuts
                </h3>
                <div className="space-y-2">
                  {recommendations.shortcuts.map((shortcut, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 bg-gray-900 rounded"
                    >
                      <div>
                        <code className="text-blue-400">{shortcut.alias}</code>
                        <span className="mx-2 text-gray-500">→</span>
                        <code className="text-gray-300">
                          {shortcut.command}
                        </code>
                      </div>
                      <span className="text-xs text-gray-500">
                        {shortcut.reason}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Suggested SOPs */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <DocumentTextIcon className="w-5 h-5 text-green-400" />
                  Suggested SOPs
                </h3>
                <div className="space-y-3">
                  {recommendations.sops.map((sop, idx) => (
                    <div
                      key={idx}
                      className="border border-gray-700 rounded-lg p-3"
                    >
                      <div className="font-semibold mb-1">{sop.title}</div>
                      <div className="text-xs text-gray-400 mb-2">
                        {sop.benefit}
                      </div>
                      <div className="space-y-1">
                        {sop.workflow.map((step, stepIdx) => (
                          <div key={stepIdx} className="text-sm">
                            <span className="text-gray-500">
                              {stepIdx + 1}.
                            </span>
                            <code className="ml-2 text-gray-300">{step}</code>
                          </div>
                        ))}
                      </div>
                      <button className="mt-2 text-sm text-blue-400 hover:text-blue-300">
                        Implement SOP
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default TerminalAnalyticsPanel;
