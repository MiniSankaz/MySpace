"use client";

import React, { useState } from "react";
import {
  GitBranch,
  GitMerge,
  Trash2,
  Plus,
  AlertCircle,
  Check,
  X,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { GitBranch as GitBranchType } from "@/types/git";
import { useToast } from "@/components/ui/use-toast";

interface BranchManagementProps {
  branches: GitBranchType[];
  currentBranch: string;
  projectId: string;
  onBranchChange: (branch: string) => void;
  onRefresh: () => void;
}

const BranchManagement: React.FC<BranchManagementProps> = ({
  branches,
  currentBranch,
  projectId,
  onBranchChange,
  onRefresh,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newBranchName, setNewBranchName] = useState("");
  const [baseBranch, setBaseBranch] = useState(currentBranch);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isMerging, setIsMerging] = useState<string | null>(null);
  const { toast } = useToast();

  const protectedBranches = ["main", "master", "develop", "production"];

  const handleCreateBranch = async () => {
    if (!newBranchName.trim()) {
      toast({
        title: "Branch name required",
        description: "Please enter a branch name",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch("/api/workspace/git/create-branch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          projectId,
          branchName: newBranchName.trim(),
          baseBranch,
          checkout: true,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create branch");
      }

      toast({
        title: "Branch created",
        description: `Created and switched to ${newBranchName}`,
      });

      setNewBranchName("");
      onBranchChange(newBranchName);
      onRefresh();
    } catch (error) {
      console.error("Failed to create branch:", error);
      toast({
        title: "Failed to create branch",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteBranch = async (branchName: string) => {
    if (protectedBranches.includes(branchName)) {
      toast({
        title: "Cannot delete protected branch",
        description: `${branchName} is a protected branch`,
        variant: "destructive",
      });
      return;
    }

    if (!confirm(`Are you sure you want to delete branch "${branchName}"?`)) {
      return;
    }

    setIsDeleting(branchName);
    try {
      const response = await fetch("/api/workspace/git/delete-branch", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          projectId,
          branchName,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete branch");
      }

      toast({
        title: "Branch deleted",
        description: `Deleted branch ${branchName}`,
      });

      onRefresh();
    } catch (error) {
      console.error("Failed to delete branch:", error);
      toast({
        title: "Failed to delete branch",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(null);
    }
  };

  const handleMergeBranch = async (sourceBranch: string) => {
    if (!confirm(`Merge "${sourceBranch}" into "${currentBranch}"?`)) {
      return;
    }

    setIsMerging(sourceBranch);
    try {
      const response = await fetch("/api/workspace/git/merge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          projectId,
          sourceBranch,
          targetBranch: currentBranch,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to merge branch");
      }

      toast({
        title: "Branch merged",
        description: `Merged ${sourceBranch} into ${currentBranch}`,
      });

      onRefresh();
    } catch (error) {
      console.error("Failed to merge branch:", error);
      toast({
        title: "Failed to merge branch",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsMerging(null);
    }
  };

  const localBranches = branches.filter((b) => !b.isRemote);
  const remoteBranches = branches.filter((b) => b.isRemote);

  return (
    <div className="space-y-6">
      {/* Create new branch */}
      <div className="bg-gray-800/30 rounded-xl p-4">
        <h3 className="text-sm font-medium text-gray-300 mb-4">
          Create New Branch
        </h3>

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">
              Branch Name
            </label>
            <input
              type="text"
              value={newBranchName}
              onChange={(e) => setNewBranchName(e.target.value)}
              placeholder="feature/new-feature"
              className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">
              Base Branch
            </label>
            <select
              value={baseBranch}
              onChange={(e) => setBaseBranch(e.target.value)}
              className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-blue-500"
            >
              {localBranches.map((branch) => (
                <option key={branch.name} value={branch.name}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleCreateBranch}
            disabled={isCreating || !newBranchName.trim()}
            className={`w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              newBranchName.trim()
                ? "bg-blue-500 hover:bg-blue-600 text-white"
                : "bg-gray-700 text-gray-500 cursor-not-allowed"
            }`}
          >
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Creating...</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Create Branch</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Local branches */}
      <div className="bg-gray-800/30 rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-300">Local Branches</h3>
          <button
            onClick={onRefresh}
            className="p-1 rounded-lg hover:bg-gray-700/50 text-gray-400 hover:text-gray-300 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2">
          {localBranches.map((branch) => {
            const isCurrent = branch.name === currentBranch;
            const isProtected = protectedBranches.includes(branch.name);

            return (
              <div
                key={branch.name}
                className={`flex items-center justify-between px-3 py-2 rounded-lg ${
                  isCurrent
                    ? "bg-blue-500/20 border border-blue-500/30"
                    : "bg-gray-900/30 hover:bg-gray-900/50"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <GitBranch className="w-4 h-4 text-gray-400" />
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-200">
                        {branch.name}
                      </span>
                      {isCurrent && (
                        <span className="px-2 py-0.5 bg-blue-500/30 text-blue-400 text-xs rounded">
                          current
                        </span>
                      )}
                      {isProtected && (
                        <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded">
                          protected
                        </span>
                      )}
                    </div>
                    {(branch.ahead > 0 || branch.behind > 0) && (
                      <div className="flex items-center space-x-2 mt-1 text-xs">
                        {branch.ahead > 0 && (
                          <span className="text-green-400">
                            ↑ {branch.ahead} ahead
                          </span>
                        )}
                        {branch.behind > 0 && (
                          <span className="text-red-400">
                            ↓ {branch.behind} behind
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {!isCurrent && (
                    <>
                      <button
                        onClick={() => onBranchChange(branch.name)}
                        className="p-1.5 rounded-lg hover:bg-gray-700/50 text-gray-400 hover:text-gray-300 transition-colors"
                        title="Switch to branch"
                      >
                        <Check className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleMergeBranch(branch.name)}
                        disabled={isMerging === branch.name}
                        className="p-1.5 rounded-lg hover:bg-gray-700/50 text-gray-400 hover:text-gray-300 transition-colors"
                        title={`Merge into ${currentBranch}`}
                      >
                        {isMerging === branch.name ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <GitMerge className="w-4 h-4" />
                        )}
                      </button>
                    </>
                  )}

                  {!isCurrent && !isProtected && (
                    <button
                      onClick={() => handleDeleteBranch(branch.name)}
                      disabled={isDeleting === branch.name}
                      className="p-1.5 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"
                      title="Delete branch"
                    >
                      {isDeleting === branch.name ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Remote branches */}
      {remoteBranches.length > 0 && (
        <div className="bg-gray-800/30 rounded-xl p-4">
          <h3 className="text-sm font-medium text-gray-300 mb-4">
            Remote Branches
          </h3>

          <div className="space-y-2">
            {remoteBranches.map((branch) => (
              <div
                key={branch.name}
                className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-900/30"
              >
                <div className="flex items-center space-x-3">
                  <GitBranch className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-400">{branch.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BranchManagement;
