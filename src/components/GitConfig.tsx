"use client";

import React, { useState, useEffect } from "react";
import {
  GitBranch,
  GitCommit,
  GitPullRequest,
  RefreshCw,
  Link2,
  User,
  Mail,
  Clock,
  Check,
  X,
  AlertCircle,
  Download,
  Upload,
  Terminal,
  Copy,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Loader2,
} from "lucide-react";

interface GitRemote {
  name: string;
  url: string;
  type: "fetch" | "push";
}

interface GitBranch {
  name: string;
  current: boolean;
  remote?: string;
  lastCommit?: {
    hash: string;
    message: string;
    author: string;
    date: string;
  };
}

interface GitStatus {
  clean: boolean;
  ahead: number;
  behind: number;
  staged: number;
  modified: number;
  untracked: number;
}

interface GitConfigData {
  repository: {
    path: string;
    name: string;
    isGitRepo: boolean;
    isBare: boolean;
    workingDirectory: string;
  };
  remotes: GitRemote[];
  branches: {
    current: string;
    all: GitBranch[];
    defaultBranch: string;
  };
  user: {
    name: string;
    email: string;
  };
  status: GitStatus;
  config: any;
  metadata: {
    lastFetch: string | null;
    gitVersion: string;
    syncedAt: string;
  };
}

interface GitConfigProps {
  projectPath?: string;
  projectId?: string;
}

export default function GitConfig({ projectPath, projectId }: GitConfigProps) {
  const [config, setConfig] = useState<GitConfigData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [executing, setExecuting] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["repository", "remotes", "branches", "status"]),
  );
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [commandOutput, setCommandOutput] = useState<string>("");

  useEffect(() => {
    loadGitConfig();
  }, [projectPath, projectId]);

  const loadGitConfig = async (useCache = true) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (projectPath) params.append("path", projectPath);
      if (projectId) params.append("projectId", projectId);
      if (!useCache) params.append("cache", "false");

      const response = await fetch(`/api/git/config?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load Git configuration");
      }

      setConfig(data.data);
      if (data.data?.branches?.current) {
        setSelectedBranch(data.data.branches.current);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const executeCommand = async (command: string) => {
    setExecuting(true);
    setCommandOutput("");

    try {
      const response = await fetch("/api/git/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command,
          projectPath,
          projectId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Command failed");
      }

      setCommandOutput(`Command executed successfully: ${command}`);
      setConfig(data.config);
    } catch (err: any) {
      setCommandOutput(`Error: ${err.message}`);
    } finally {
      setExecuting(false);
    }
  };

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "Never";
    try {
      const date = new Date(dateStr);
      return date.toLocaleString();
    } catch {
      return "Never";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-600 rounded-lg p-4">
        <div className="flex items-center gap-2 text-red-400">
          <AlertCircle className="h-5 w-5" />
          <span>Error: {error}</span>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="text-gray-400 text-center py-8">
        No Git configuration available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Actions */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <GitBranch className="h-5 w-5 text-indigo-400" />
          Git Configuration
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => loadGitConfig(false)}
            disabled={loading}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-md flex items-center gap-2 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Repository Info Section */}
      <div className="bg-gray-800 rounded-lg border border-gray-700">
        <button
          onClick={() => toggleSection("repository")}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-700/50 transition-colors"
        >
          <span className="flex items-center gap-2 text-white font-medium">
            <GitCommit className="h-5 w-5 text-indigo-400" />
            Repository Information
          </span>
          {expandedSections.has("repository") ? (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-400" />
          )}
        </button>

        {expandedSections.has("repository") && (
          <div className="px-4 pb-4 space-y-2 border-t border-gray-700">
            <div className="grid grid-cols-2 gap-4 mt-3">
              <div>
                <span className="text-gray-400 text-sm">Name:</span>
                <p className="text-white font-medium">
                  {config.repository.name}
                </p>
              </div>
              <div>
                <span className="text-gray-400 text-sm">Type:</span>
                <p className="text-white">
                  {config.repository.isBare
                    ? "Bare Repository"
                    : "Working Repository"}
                </p>
              </div>
              <div className="col-span-2">
                <span className="text-gray-400 text-sm">Path:</span>
                <div className="flex items-center gap-2">
                  <code className="text-indigo-400 bg-gray-900 px-2 py-1 rounded text-sm flex-1">
                    {config.repository.path}
                  </code>
                  <button
                    onClick={() => copyToClipboard(config.repository.path)}
                    className="p-1 hover:bg-gray-700 rounded"
                  >
                    <Copy className="h-4 w-4 text-gray-400" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Remotes Section */}
      <div className="bg-gray-800 rounded-lg border border-gray-700">
        <button
          onClick={() => toggleSection("remotes")}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-700/50 transition-colors"
        >
          <span className="flex items-center gap-2 text-white font-medium">
            <Link2 className="h-5 w-5 text-indigo-400" />
            Remote Repositories ({config.remotes?.length || 0})
          </span>
          {expandedSections.has("remotes") ? (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-400" />
          )}
        </button>

        {expandedSections.has("remotes") && (
          <div className="px-4 pb-4 border-t border-gray-700">
            {config.remotes && config.remotes.length > 0 ? (
              <div className="space-y-2 mt-3">
                {config.remotes.map((remote, idx) => (
                  <div key={idx} className="bg-gray-900 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium">
                          {remote.name}
                        </span>
                        <span className="text-xs px-2 py-0.5 bg-indigo-900/50 text-indigo-400 rounded">
                          {remote.type}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={remote.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 hover:bg-gray-700 rounded"
                        >
                          <ExternalLink className="h-4 w-4 text-gray-400" />
                        </a>
                        <button
                          onClick={() => copyToClipboard(remote.url)}
                          className="p-1 hover:bg-gray-700 rounded"
                        >
                          <Copy className="h-4 w-4 text-gray-400" />
                        </button>
                      </div>
                    </div>
                    <code className="text-gray-400 text-xs mt-1 block truncate">
                      {remote.url}
                    </code>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-sm mt-3">
                No remote repositories configured
              </p>
            )}
          </div>
        )}
      </div>

      {/* Branches Section */}
      <div className="bg-gray-800 rounded-lg border border-gray-700">
        <button
          onClick={() => toggleSection("branches")}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-700/50 transition-colors"
        >
          <span className="flex items-center gap-2 text-white font-medium">
            <GitBranch className="h-5 w-5 text-indigo-400" />
            Branches ({config.branches?.all?.length || 0})
          </span>
          {expandedSections.has("branches") ? (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-400" />
          )}
        </button>

        {expandedSections.has("branches") && config.branches?.all && (
          <div className="px-4 pb-4 border-t border-gray-700">
            <div className="flex items-center gap-4 mt-3 mb-3">
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="flex-1 bg-gray-900 text-white border border-gray-600 rounded-md px-3 py-2"
              >
                {config.branches.all.map((branch) => (
                  <option key={branch.name} value={branch.name}>
                    {branch.name} {branch.current ? "(current)" : ""}
                  </option>
                ))}
              </select>
              <button
                onClick={() => executeCommand(`checkout ${selectedBranch}`)}
                disabled={
                  executing || selectedBranch === config.branches?.current
                }
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-md transition-colors"
              >
                Checkout
              </button>
            </div>

            <div className="space-y-2">
              {config.branches.all.map((branch) => (
                <div
                  key={branch.name}
                  className={`bg-gray-900 rounded-lg p-3 ${
                    branch.current ? "ring-2 ring-indigo-500" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">
                        {branch.name}
                      </span>
                      {branch.current && (
                        <span className="text-xs px-2 py-0.5 bg-green-900/50 text-green-400 rounded">
                          current
                        </span>
                      )}
                      {branch.name === config.branches?.defaultBranch && (
                        <span className="text-xs px-2 py-0.5 bg-blue-900/50 text-blue-400 rounded">
                          default
                        </span>
                      )}
                    </div>
                    {branch.remote && (
                      <span className="text-gray-400 text-sm">
                        {branch.remote}
                      </span>
                    )}
                  </div>
                  {branch.lastCommit && (
                    <div className="mt-2 text-xs text-gray-400">
                      <div className="flex items-center gap-2">
                        <span className="font-mono">
                          {branch.lastCommit.hash}
                        </span>
                        <span>•</span>
                        <span>{branch.lastCommit.author}</span>
                      </div>
                      <p className="mt-1 truncate">
                        {branch.lastCommit.message}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Status Section */}
      <div className="bg-gray-800 rounded-lg border border-gray-700">
        <button
          onClick={() => toggleSection("status")}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-700/50 transition-colors"
        >
          <span className="flex items-center gap-2 text-white font-medium">
            <GitPullRequest className="h-5 w-5 text-indigo-400" />
            Repository Status
          </span>
          {expandedSections.has("status") ? (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-400" />
          )}
        </button>

        {expandedSections.has("status") && (
          <div className="px-4 pb-4 border-t border-gray-700">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
              <div className="bg-gray-900 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Status</span>
                  {config.status?.clean ? (
                    <Check className="h-4 w-4 text-green-400" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-yellow-400" />
                  )}
                </div>
                <p className="text-white font-medium mt-1">
                  {config.status?.clean ? "Clean" : "Changes Detected"}
                </p>
              </div>

              <div className="bg-gray-900 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Ahead</span>
                  <Upload className="h-4 w-4 text-indigo-400" />
                </div>
                <p className="text-white font-medium mt-1">
                  {config.status?.ahead || 0} commits
                </p>
              </div>

              <div className="bg-gray-900 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Behind</span>
                  <Download className="h-4 w-4 text-indigo-400" />
                </div>
                <p className="text-white font-medium mt-1">
                  {config.status?.behind || 0} commits
                </p>
              </div>

              <div className="bg-gray-900 rounded-lg p-3">
                <span className="text-gray-400 text-sm">Staged</span>
                <p className="text-white font-medium mt-1">
                  {config.status?.staged || 0} files
                </p>
              </div>

              <div className="bg-gray-900 rounded-lg p-3">
                <span className="text-gray-400 text-sm">Modified</span>
                <p className="text-white font-medium mt-1">
                  {config.status?.modified || 0} files
                </p>
              </div>

              <div className="bg-gray-900 rounded-lg p-3">
                <span className="text-gray-400 text-sm">Untracked</span>
                <p className="text-white font-medium mt-1">
                  {config.status?.untracked || 0} files
                </p>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => executeCommand("fetch")}
                disabled={executing}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md flex items-center gap-2 transition-colors"
              >
                <Download className="h-4 w-4" />
                Fetch
              </button>
              <button
                onClick={() => executeCommand("pull")}
                disabled={executing || (config.status?.behind || 0) === 0}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 text-white rounded-md flex items-center gap-2 transition-colors"
              >
                <Download className="h-4 w-4" />
                Pull ({config.status?.behind || 0})
              </button>
            </div>
          </div>
        )}
      </div>

      {/* User Config Section */}
      <div className="bg-gray-800 rounded-lg border border-gray-700">
        <button
          onClick={() => toggleSection("user")}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-700/50 transition-colors"
        >
          <span className="flex items-center gap-2 text-white font-medium">
            <User className="h-5 w-5 text-indigo-400" />
            User Configuration
          </span>
          {expandedSections.has("user") ? (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-400" />
          )}
        </button>

        {expandedSections.has("user") && (
          <div className="px-4 pb-4 border-t border-gray-700">
            <div className="grid grid-cols-2 gap-4 mt-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-400" />
                <div>
                  <span className="text-gray-400 text-sm">Name:</span>
                  <p className="text-white">
                    {config.user?.name || "Not configured"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-gray-400" />
                <div>
                  <span className="text-gray-400 text-sm">Email:</span>
                  <p className="text-white">
                    {config.user?.email || "Not configured"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Metadata */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4 text-gray-400">
            <span>Git Version: {config.metadata?.gitVersion || "unknown"}</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Last Fetch: {formatDate(config.metadata?.lastFetch)}
            </span>
          </div>
          <span className="text-gray-500 text-xs">
            Synced: {formatDate(config.metadata?.syncedAt)}
          </span>
        </div>
      </div>

      {/* Command Output */}
      {commandOutput && (
        <div className="bg-gray-900 rounded-lg border border-gray-700 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Terminal className="h-4 w-4 text-indigo-400" />
            <span className="text-white text-sm font-medium">
              Command Output
            </span>
          </div>
          <pre className="text-gray-400 text-sm font-mono">{commandOutput}</pre>
        </div>
      )}
    </div>
  );
}
