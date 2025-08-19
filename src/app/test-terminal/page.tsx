"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  AlertCircle,
  CheckCircle,
  Info,
  RefreshCw,
  Terminal,
  Zap,
} from "lucide-react";

// Dynamic import to avoid SSR issues
const TerminalContainerV4 = dynamic(
  () => import("@/modules/workspace/components/Terminal/TerminalContainerV4"),
  { ssr: false },
);

interface MigrationStatus {
  migration: {
    mode: string;
    sessionsMigrated: number;
    sessionsLegacy: number;
    errors: number;
    featureFlags: Record<string, boolean>;
  };
  orchestrator: {
    ready: boolean;
    statistics: {
      sessions: number;
      streams: number;
      projects: number;
    };
  };
  metrics?: {
    cpu: any;
    memory: any;
    sessions: any;
    errors: any;
  };
  recommendations: string[];
}

export default function TestTerminalPage() {
  const [migrationStatus, setMigrationStatus] =
    useState<MigrationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState({
    id: "test-project-1",
    name: "Test Project 1",
    settings: {
      path: "/tmp/test-project-1",
    },
  });

  // Test projects
  const testProjects = [
    {
      id: "test-project-1",
      name: "Test Project 1",
      settings: { path: "/tmp/test-project-1" },
    },
    {
      id: "test-project-2",
      name: "Test Project 2",
      settings: { path: "/tmp/test-project-2" },
    },
    {
      id: "test-project-3",
      name: "Test Project 3",
      settings: { path: "/tmp/test-project-3" },
    },
  ];

  // Fetch migration status
  const fetchMigrationStatus = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/terminal-v2/migration-status");
      if (!response.ok) {
        throw new Error(`Failed to fetch status: ${response.statusText}`);
      }

      const data = await response.json();
      setMigrationStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch status");
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh status
  useEffect(() => {
    fetchMigrationStatus();
    const interval = setInterval(fetchMigrationStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Terminal className="w-6 h-6 text-cyan-400" />
              <h1 className="text-xl font-bold">Terminal Integration Test</h1>
              {migrationStatus && (
                <span
                  className={`px-2 py-1 text-xs rounded ${
                    migrationStatus.migration.mode === "new"
                      ? "bg-green-500/20 text-green-400"
                      : migrationStatus.migration.mode === "progressive"
                        ? "bg-blue-500/20 text-blue-400"
                        : "bg-yellow-500/20 text-yellow-400"
                  }`}
                >
                  {migrationStatus.migration.mode.toUpperCase()}
                </span>
              )}
            </div>

            <button
              onClick={fetchMigrationStatus}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              disabled={loading}
            >
              <RefreshCw
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Status Panel */}
          <div className="lg:col-span-1 space-y-4">
            {/* Migration Status */}
            <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
              <h2 className="text-sm font-semibold text-gray-400 mb-3">
                Migration Status
              </h2>

              {error && (
                <div className="flex items-center gap-2 p-2 bg-red-500/10 text-red-400 rounded text-sm mb-3">
                  <AlertCircle className="w-4 h-4" />
                  <span>{error}</span>
                </div>
              )}

              {migrationStatus ? (
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Mode:</span>
                    <span className="font-mono">
                      {migrationStatus.migration.mode}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Migrated:</span>
                    <span className="font-mono">
                      {migrationStatus.migration.sessionsMigrated}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Legacy:</span>
                    <span className="font-mono">
                      {migrationStatus.migration.sessionsLegacy}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Errors:</span>
                    <span
                      className={`font-mono ${migrationStatus.migration.errors > 0 ? "text-red-400" : ""}`}
                    >
                      {migrationStatus.migration.errors}
                    </span>
                  </div>

                  <hr className="border-gray-800" />

                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase">
                      Feature Flags
                    </h3>
                    {Object.entries(migrationStatus.migration.featureFlags).map(
                      ([key, value]) => (
                        <div
                          key={key}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="text-gray-500 text-xs">{key}:</span>
                          {value ? (
                            <CheckCircle className="w-3 h-3 text-green-400" />
                          ) : (
                            <div className="w-3 h-3 rounded-full bg-gray-700" />
                          )}
                        </div>
                      ),
                    )}
                  </div>
                </div>
              ) : (
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-gray-800 rounded" />
                  <div className="h-4 bg-gray-800 rounded w-3/4" />
                </div>
              )}
            </div>

            {/* System Status */}
            <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
              <h2 className="text-sm font-semibold text-gray-400 mb-3">
                System Status
              </h2>

              {migrationStatus?.orchestrator ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Ready:</span>
                    {migrationStatus.orchestrator.ready ? (
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-400" />
                    )}
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Sessions:</span>
                    <span className="font-mono">
                      {migrationStatus.orchestrator.statistics.sessions}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Streams:</span>
                    <span className="font-mono">
                      {migrationStatus.orchestrator.statistics.streams}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Projects:</span>
                    <span className="font-mono">
                      {migrationStatus.orchestrator.statistics.projects}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-gray-800 rounded" />
                  <div className="h-4 bg-gray-800 rounded w-3/4" />
                </div>
              )}
            </div>

            {/* Metrics */}
            {migrationStatus?.metrics && (
              <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
                <h2 className="text-sm font-semibold text-gray-400 mb-3">
                  Metrics
                </h2>

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">CPU:</span>
                    <span className="font-mono">
                      {migrationStatus.metrics.cpu.usage.toFixed(1)}%
                    </span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Memory:</span>
                    <span className="font-mono">
                      {migrationStatus.metrics.memory.heapUsed}MB /{" "}
                      {migrationStatus.metrics.memory.heapTotal}MB
                    </span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Error Rate:</span>
                    <span className="font-mono">
                      {migrationStatus.metrics.errors.rate}/min
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Recommendations */}
            {migrationStatus?.recommendations &&
              migrationStatus.recommendations.length > 0 && (
                <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
                  <h2 className="text-sm font-semibold text-gray-400 mb-3">
                    Recommendations
                  </h2>

                  <div className="space-y-2">
                    {migrationStatus.recommendations.map((rec, idx) => (
                      <div key={idx} className="flex gap-2 text-sm">
                        <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-300">{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* Project Selector */}
            <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
              <h2 className="text-sm font-semibold text-gray-400 mb-3">
                Test Projects
              </h2>

              <div className="space-y-2">
                {testProjects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => setSelectedProject(project)}
                    className={`w-full text-left p-2 rounded-lg transition-colors text-sm ${
                      selectedProject.id === project.id
                        ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                        : "hover:bg-gray-800 border border-transparent"
                    }`}
                  >
                    <div className="font-medium">{project.name}</div>
                    <div className="text-xs text-gray-500">
                      {project.settings.path}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Terminal Container */}
          <div className="lg:col-span-2">
            <div className="bg-gray-900 rounded-lg border border-gray-800 h-[600px] overflow-hidden">
              <TerminalContainerV4 project={selectedProject as any} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
