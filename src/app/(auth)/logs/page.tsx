"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  Terminal,
  MessageSquare,
  Clock,
  DollarSign,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Filter,
  Download,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

interface LogSummary {
  projectId: string;
  summary: {
    assistant: {
      stats: any;
      activeSessions: number;
      lastActivity: string | null;
    };
    terminal: {
      stats: any;
      activeSessions: number;
      totalSessions: number;
      recentCommands: any[];
    };
    overall: {
      totalAiTokens: number;
      totalAiCost: number;
      totalTerminalCommands: number;
      errorRate: number;
    };
  };
}

interface AssistantLogs {
  type: string;
  sessions?: any[];
  messages?: any[];
  stats?: any;
}

interface TerminalLogs {
  type: string;
  sessions?: any[];
  recentCommands?: any[];
  stats?: any;
  logs?: any[];
}

export default function LogsMonitorPage() {
  const [selectedProject, setSelectedProject] = useState<string>("default");
  const [logSummary, setLogSummary] = useState<LogSummary | null>(null);
  const [assistantLogs, setAssistantLogs] = useState<AssistantLogs | null>(
    null,
  );
  const [terminalLogs, setTerminalLogs] = useState<TerminalLogs | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "overview" | "assistant" | "terminal"
  >("overview");
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(
    new Set(),
  );
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Fetch logs summary
  const fetchLogsSummary = async () => {
    try {
      const response = await fetch(
        `/api/logs/summary?projectId=${selectedProject}`,
      );
      if (response.ok) {
        const data = await response.json();
        setLogSummary(data);
      }
    } catch (error) {
      console.error("Failed to fetch logs summary:", error);
    }
  };

  // Fetch assistant logs
  const fetchAssistantLogs = async () => {
    try {
      const response = await fetch(
        `/api/logs/assistant?projectId=${selectedProject}`,
      );
      if (response.ok) {
        const data = await response.json();
        setAssistantLogs(data);
      }
    } catch (error) {
      console.error("Failed to fetch assistant logs:", error);
    }
  };

  // Fetch terminal logs
  const fetchTerminalLogs = async () => {
    try {
      const response = await fetch(
        `/api/logs/terminal?projectId=${selectedProject}`,
      );
      if (response.ok) {
        const data = await response.json();
        setTerminalLogs(data);
      }
    } catch (error) {
      console.error("Failed to fetch terminal logs:", error);
    }
  };

  // Fetch all data
  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchLogsSummary(),
      fetchAssistantLogs(),
      fetchTerminalLogs(),
    ]);
    setLoading(false);
  };

  useEffect(() => {
    fetchAllData();
  }, [selectedProject]);

  // Auto refresh
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchAllData, 5000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, selectedProject]);

  const toggleSession = (sessionId: string) => {
    const newExpanded = new Set(expandedSessions);
    if (newExpanded.has(sessionId)) {
      newExpanded.delete(sessionId);
    } else {
      newExpanded.add(sessionId);
    }
    setExpandedSessions(newExpanded);
  };

  const formatDate = (date: string | null) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleString("th-TH");
  };

  const formatCost = (cost: number) => {
    return `$${cost.toFixed(4)}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <Activity className="w-8 h-8 text-blue-500" />
            Logs Monitor
          </h1>
          <p className="text-gray-400">
            ติดตามการใช้งาน AI Assistant และ Terminal
          </p>
        </div>

        {/* Controls */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
            >
              <option value="default">Default Project</option>
              <option value="test-project-001">Test Project</option>
            </select>

            <button
              onClick={fetchAllData}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm">Auto Refresh (5s)</span>
            </label>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("overview")}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === "overview"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab("assistant")}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === "assistant"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              AI Assistant
            </button>
            <button
              onClick={() => setActiveTab("terminal")}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === "terminal"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              Terminal
            </button>
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && logSummary && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <MessageSquare className="w-8 h-8 text-blue-500" />
                <span className="text-2xl font-bold">
                  {logSummary.summary.overall.totalAiTokens.toLocaleString()}
                </span>
              </div>
              <h3 className="text-sm text-gray-400 mb-1">Total AI Tokens</h3>
              <p className="text-lg text-green-400">
                {formatCost(logSummary.summary.overall.totalAiCost)}
              </p>
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <Terminal className="w-8 h-8 text-green-500" />
                <span className="text-2xl font-bold">
                  {logSummary.summary.overall.totalTerminalCommands}
                </span>
              </div>
              <h3 className="text-sm text-gray-400 mb-1">Terminal Commands</h3>
              <p className="text-lg text-yellow-400">
                {logSummary.summary.overall.errorRate.toFixed(1)}% errors
              </p>
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <Activity className="w-8 h-8 text-purple-500" />
                <span className="text-2xl font-bold">
                  {logSummary.summary.assistant.activeSessions +
                    logSummary.summary.terminal.activeSessions}
                </span>
              </div>
              <h3 className="text-sm text-gray-400 mb-1">Active Sessions</h3>
              <p className="text-sm text-gray-500">
                AI: {logSummary.summary.assistant.activeSessions} | Terminal:{" "}
                {logSummary.summary.terminal.activeSessions}
              </p>
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <Clock className="w-8 h-8 text-orange-500" />
                <span className="text-sm text-gray-400">Last Activity</span>
              </div>
              <h3 className="text-sm text-gray-400 mb-1">AI Assistant</h3>
              <p className="text-xs text-gray-500">
                {formatDate(logSummary.summary.assistant.lastActivity)}
              </p>
            </div>
          </div>
        )}

        {/* AI Assistant Tab */}
        {activeTab === "assistant" && assistantLogs && (
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-500" />
                AI Assistant Sessions
              </h2>

              {assistantLogs.sessions && assistantLogs.sessions.length > 0 ? (
                <div className="space-y-4">
                  {assistantLogs.sessions.map((session: any) => (
                    <div
                      key={session.id}
                      className="bg-gray-700 rounded-lg p-4"
                    >
                      <div
                        className="flex items-center justify-between cursor-pointer"
                        onClick={() => toggleSession(session.id)}
                      >
                        <div className="flex items-center gap-3">
                          {expandedSessions.has(session.id) ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                          <div>
                            <h3 className="font-medium">
                              {session.sessionName || session.id}
                            </h3>
                            <p className="text-sm text-gray-400">
                              Messages: {session._count?.messages || 0} |
                              Commands: {session._count?.commands || 0} |
                              Tokens: {session.totalTokensUsed}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-green-400">
                            {formatCost(session.totalCost)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDate(session.lastActiveAt)}
                          </p>
                        </div>
                      </div>

                      {expandedSessions.has(session.id) && (
                        <div className="mt-4 pt-4 border-t border-gray-600">
                          <p className="text-sm text-gray-400">
                            Model: {session.model} | Temperature:{" "}
                            {session.temperature} | Max Tokens:{" "}
                            {session.maxTokens}
                          </p>
                          <p className="text-sm text-gray-400 mt-2">
                            Started: {formatDate(session.startedAt)}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">ไม่มี session ที่บันทึก</p>
              )}
            </div>
          </div>
        )}

        {/* Terminal Tab */}
        {activeTab === "terminal" && terminalLogs && (
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Terminal className="w-5 h-5 text-green-500" />
                Terminal Sessions
              </h2>

              {terminalLogs.sessions && terminalLogs.sessions.length > 0 ? (
                <div className="space-y-4">
                  {terminalLogs.sessions.map((session: any) => (
                    <div
                      key={session.id}
                      className="bg-gray-700 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium flex items-center gap-2">
                            {session.tabName}
                            {session.active && (
                              <span className="px-2 py-1 bg-green-600 text-xs rounded">
                                Active
                              </span>
                            )}
                          </h3>
                          <p className="text-sm text-gray-400">
                            Type: {session.type} | Commands:{" "}
                            {session._count?.commands || 0} | Logs:{" "}
                            {session._count?.logs || 0}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Path: {session.currentPath}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">
                            {formatDate(session.startedAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">
                  ไม่มี terminal session ที่บันทึก
                </p>
              )}
            </div>

            {/* Recent Commands */}
            {terminalLogs.recentCommands &&
              terminalLogs.recentCommands.length > 0 && (
                <div className="bg-gray-800 rounded-lg p-6">
                  <h2 className="text-xl font-semibold mb-4">
                    Recent Commands
                  </h2>
                  <div className="space-y-2">
                    {terminalLogs.recentCommands.map(
                      (cmd: any, index: number) => (
                        <div
                          key={index}
                          className="bg-gray-700 rounded p-3 font-mono text-sm"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {cmd.exitCode === 0 ? (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              ) : cmd.exitCode != null ? (
                                <XCircle className="w-4 h-4 text-red-500" />
                              ) : (
                                <Clock className="w-4 h-4 text-yellow-500" />
                              )}
                              <span className="text-blue-400">
                                {cmd.command}
                              </span>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-xs text-gray-500">
                                {cmd.duration ? `${cmd.duration}ms` : "N/A"}
                              </span>
                              <span className="text-xs text-gray-500">
                                {formatDate(cmd.timestamp)}
                              </span>
                            </div>
                          </div>
                          {cmd.workingDir && (
                            <p className="text-xs text-gray-500 mt-1 ml-6">
                              {cmd.workingDir}
                            </p>
                          )}
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}
          </div>
        )}
      </div>
    </div>
  );
}
