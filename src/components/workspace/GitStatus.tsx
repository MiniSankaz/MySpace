import React, { useState } from "react";
import { cn } from "@/lib/utils";
import {
  GitBranch,
  GitCommit,
  GitPullRequest,
  GitMerge,
  Check,
  X,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  FileText,
  FilePlus,
  FileX,
  FileEdit,
  Upload,
  Download,
  Loader2,
  MoreVertical,
} from "lucide-react";

interface GitFile {
  path: string;
  status: "modified" | "added" | "deleted" | "renamed" | "untracked";
  staged: boolean;
}

interface GitStatusProps {
  branch: string;
  remoteBranch?: string;
  ahead?: number;
  behind?: number;
  files: GitFile[];
  loading?: boolean;
  error?: string;
  onCommit?: (message: string, files: string[]) => void;
  onPush?: () => void;
  onPull?: () => void;
  onStage?: (files: string[]) => void;
  onUnstage?: (files: string[]) => void;
  onDiscard?: (files: string[]) => void;
  onBranchChange?: (branch: string) => void;
  onRefresh?: () => void;
  className?: string;
  compact?: boolean;
}

const GitStatus: React.FC<GitStatusProps> = ({
  branch,
  remoteBranch,
  ahead = 0,
  behind = 0,
  files,
  loading = false,
  error,
  onCommit,
  onPush,
  onPull,
  onStage,
  onUnstage,
  onDiscard,
  onBranchChange,
  onRefresh,
  className,
  compact = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [commitMessage, setCommitMessage] = useState("");
  const [showCommitDialog, setShowCommitDialog] = useState(false);
  const [showBranchSelector, setShowBranchSelector] = useState(false);

  const stagedFiles = files.filter((f) => f.staged);
  const unstagedFiles = files.filter((f) => !f.staged);
  const hasChanges = files.length > 0;
  const canPush = ahead > 0;
  const shouldPull = behind > 0;

  const getStatusIcon = (status: GitFile["status"]) => {
    const iconClass = "h-4 w-4";
    switch (status) {
      case "modified":
        return <FileEdit className={cn(iconClass, "text-yellow-500")} />;
      case "added":
        return <FilePlus className={cn(iconClass, "text-green-500")} />;
      case "deleted":
        return <FileX className={cn(iconClass, "text-red-500")} />;
      case "renamed":
        return <FileText className={cn(iconClass, "text-blue-500")} />;
      case "untracked":
        return <FileText className={cn(iconClass, "text-gray-500")} />;
    }
  };

  const getStatusLabel = (status: GitFile["status"]) => {
    const labels = {
      modified: "M",
      added: "A",
      deleted: "D",
      renamed: "R",
      untracked: "U",
    };
    return labels[status];
  };

  const getStatusColor = (status: GitFile["status"]) => {
    const colors = {
      modified: "text-yellow-600 dark:text-yellow-400",
      added: "text-green-600 dark:text-green-400",
      deleted: "text-red-600 dark:text-red-400",
      renamed: "text-blue-600 dark:text-blue-400",
      untracked: "text-gray-600 dark:text-gray-400",
    };
    return colors[status];
  };

  const toggleFileSelection = (path: string) => {
    setSelectedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const handleStageSelected = () => {
    if (onStage && selectedFiles.size > 0) {
      onStage(Array.from(selectedFiles));
      setSelectedFiles(new Set());
    }
  };

  const handleUnstageSelected = () => {
    if (onUnstage && selectedFiles.size > 0) {
      onUnstage(Array.from(selectedFiles));
      setSelectedFiles(new Set());
    }
  };

  const handleCommit = () => {
    if (onCommit && commitMessage.trim() && stagedFiles.length > 0) {
      onCommit(
        commitMessage,
        stagedFiles.map((f) => f.path),
      );
      setCommitMessage("");
      setShowCommitDialog(false);
    }
  };

  if (loading) {
    return (
      <div
        className={cn(
          "bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4",
          className,
        )}
      >
        <div className="flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          <span className="ml-2 text-sm text-gray-500">
            Loading git status...
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={cn(
          "bg-white dark:bg-gray-800 rounded-lg border border-red-200 dark:border-red-700 p-4",
          className,
        )}
      >
        <div className="flex items-center text-red-600 dark:text-red-400">
          <AlertCircle className="h-5 w-5 mr-2" />
          <span className="text-sm">{error}</span>
        </div>
      </div>
    );
  }

  if (compact && !isExpanded) {
    return (
      <div
        className={cn(
          "bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2",
          className,
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <GitBranch className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium">{branch}</span>
            {hasChanges && (
              <span className="px-2 py-0.5 text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded">
                {files.length} changes
              </span>
            )}
            {canPush && (
              <span className="px-2 py-0.5 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded">
                ↑{ahead}
              </span>
            )}
            {shouldPull && (
              <span className="px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">
                ↓{behind}
              </span>
            )}
          </div>
          <button
            onClick={() => setIsExpanded(true)}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700",
        className,
      )}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <GitBranch className="h-5 w-5 text-gray-500" />
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-medium">{branch}</span>
                {remoteBranch && (
                  <span className="text-sm text-gray-500">
                    → {remoteBranch}
                  </span>
                )}
              </div>
              {(ahead > 0 || behind > 0) && (
                <div className="flex items-center space-x-2 mt-1">
                  {ahead > 0 && (
                    <span className="text-xs text-green-600 dark:text-green-400">
                      ↑{ahead} ahead
                    </span>
                  )}
                  {behind > 0 && (
                    <span className="text-xs text-blue-600 dark:text-blue-400">
                      ↓{behind} behind
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {shouldPull && onPull && (
              <button
                onClick={onPull}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                <Download className="h-3.5 w-3.5 inline mr-1" />
                Pull
              </button>
            )}
            {canPush && onPush && (
              <button
                onClick={onPush}
                className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
              >
                <Upload className="h-3.5 w-3.5 inline mr-1" />
                Push
              </button>
            )}
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            )}
            {compact && (
              <button
                onClick={() => setIsExpanded(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* File Changes */}
      {hasChanges && (
        <div className="p-4">
          {/* Staged Files */}
          {stagedFiles.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Staged Changes ({stagedFiles.length})
              </h4>
              <div className="space-y-1">
                {stagedFiles.map((file) => (
                  <div
                    key={file.path}
                    className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded"
                  >
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={selectedFiles.has(file.path)}
                        onChange={() => toggleFileSelection(file.path)}
                        className="rounded"
                      />
                      {getStatusIcon(file.status)}
                      <span className="text-sm">{file.path}</span>
                      <span
                        className={cn(
                          "text-xs font-bold",
                          getStatusColor(file.status),
                        )}
                      >
                        {getStatusLabel(file.status)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              {onCommit && (
                <button
                  onClick={() => setShowCommitDialog(true)}
                  className="mt-2 px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                >
                  <GitCommit className="h-3.5 w-3.5 inline mr-1" />
                  Commit
                </button>
              )}
            </div>
          )}

          {/* Unstaged Files */}
          {unstagedFiles.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Changes ({unstagedFiles.length})
              </h4>
              <div className="space-y-1">
                {unstagedFiles.map((file) => (
                  <div
                    key={file.path}
                    className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded"
                  >
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={selectedFiles.has(file.path)}
                        onChange={() => toggleFileSelection(file.path)}
                        className="rounded"
                      />
                      {getStatusIcon(file.status)}
                      <span className="text-sm">{file.path}</span>
                      <span
                        className={cn(
                          "text-xs font-bold",
                          getStatusColor(file.status),
                        )}
                      >
                        {getStatusLabel(file.status)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              {selectedFiles.size > 0 && (
                <div className="mt-2 space-x-2">
                  {onStage && (
                    <button
                      onClick={handleStageSelected}
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                      Stage Selected
                    </button>
                  )}
                  {onDiscard && (
                    <button
                      onClick={() => onDiscard(Array.from(selectedFiles))}
                      className="px-3 py-1 text-sm border border-red-600 text-red-600 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      Discard Selected
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* No Changes */}
      {!hasChanges && (
        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
          <Check className="h-8 w-8 mx-auto mb-2 text-green-500" />
          <p className="text-sm">Working tree clean</p>
        </div>
      )}

      {/* Commit Dialog */}
      {showCommitDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Commit Changes</h3>
            <textarea
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              placeholder="Enter commit message..."
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none"
              rows={4}
              autoFocus
            />
            <div className="mt-4 flex justify-end space-x-2">
              <button
                onClick={() => setShowCommitDialog(false)}
                className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCommit}
                disabled={!commitMessage.trim()}
                className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                Commit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Mock data
export const mockGitStatus = {
  branch: "feature/new-components",
  remoteBranch: "origin/feature/new-components",
  ahead: 2,
  behind: 1,
  files: [
    {
      path: "src/components/Button.tsx",
      status: "modified" as const,
      staged: true,
    },
    { path: "src/components/Card.tsx", status: "added" as const, staged: true },
    { path: "src/App.tsx", status: "modified" as const, staged: false },
    { path: "README.md", status: "modified" as const, staged: false },
    {
      path: "src/components/Modal.tsx",
      status: "added" as const,
      staged: false,
    },
  ],
};

export default GitStatus;
