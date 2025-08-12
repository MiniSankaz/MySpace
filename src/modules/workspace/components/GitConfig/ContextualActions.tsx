'use client';

import React, { useState } from 'react';
import { 
  RefreshCw, 
  Download, 
  Upload, 
  GitCommit, 
  Archive,
  GitPullRequest,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { GitStatus } from '@/types/git';
import { useToast } from '@/components/ui/use-toast';

interface ContextualActionsProps {
  status: GitStatus | null;
  currentBranch: string;
  projectId: string;
  onRefresh: () => void;
  isRefreshing: boolean;
}

const ContextualActions: React.FC<ContextualActionsProps> = ({
  status,
  currentBranch,
  projectId,
  onRefresh,
  isRefreshing,
}) => {
  const [isExecuting, setIsExecuting] = useState<string | null>(null);
  const { toast } = useToast();
  
  const executeGitCommand = async (command: string, action: string) => {
    setIsExecuting(action);
    try {
      const response = await fetch('/api/workspace/git/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          projectId,
          command,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Failed to ${action}`);
      }
      
      const result = await response.json();
      
      toast({
        title: `${action} successful`,
        description: result.message || `Successfully executed ${action}`,
      });
      
      onRefresh();
    } catch (error) {
      console.error(`Failed to ${action}:`, error);
      toast({
        title: `Failed to ${action}`,
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsExecuting(null);
    }
  };
  
  const handlePull = () => executeGitCommand('pull', 'Pull');
  const handlePush = () => executeGitCommand('push', 'Push');
  const handleFetch = () => executeGitCommand('fetch', 'Fetch');
  
  const handleStash = async () => {
    if (!status || status.modified.length === 0) return;
    
    const message = prompt('Stash message (optional):');
    const command = message ? `stash save "${message}"` : 'stash';
    await executeGitCommand(command, 'Stash');
  };
  
  const handleCommitAll = async () => {
    if (!status || (status.modified.length === 0 && status.untracked.length === 0)) return;
    
    const message = prompt('Commit message:');
    if (!message) return;
    
    await executeGitCommand(`add -A && git commit -m "${message}"`, 'Commit all');
  };
  
  const canPull = status && status.behind > 0;
  const canPush = status && status.ahead > 0;
  const canStash = status && status.modified.length > 0;
  const canCommit = status && (status.staged.length > 0 || status.modified.length > 0);
  const hasConflicts = status && status.conflicts.length > 0;
  
  return (
    <div className="flex items-center space-x-2">
      {/* Warning for conflicts */}
      {hasConflicts && (
        <div className="flex items-center space-x-1 px-2 py-1 bg-red-500/20 text-red-400 rounded-lg text-xs">
          <AlertCircle className="w-3 h-3" />
          <span>Resolve conflicts</span>
        </div>
      )}
      
      {/* Pull button */}
      <button
        onClick={handlePull}
        disabled={!canPull || isExecuting !== null}
        className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
          canPull
            ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/30'
            : 'bg-gray-700/30 text-gray-500 cursor-not-allowed opacity-50'
        }`}
        title={canPull ? `Pull ${status.behind} commits` : 'Nothing to pull'}
      >
        {isExecuting === 'Pull' ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
        <span>Pull {canPull && `(${status.behind})`}</span>
      </button>
      
      {/* Push button */}
      <button
        onClick={handlePush}
        disabled={!canPush || isExecuting !== null}
        className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
          canPush
            ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30'
            : 'bg-gray-700/30 text-gray-500 cursor-not-allowed opacity-50'
        }`}
        title={canPush ? `Push ${status.ahead} commits` : 'Nothing to push'}
      >
        {isExecuting === 'Push' ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Upload className="w-4 h-4" />
        )}
        <span>Push {canPush && `(${status.ahead})`}</span>
      </button>
      
      {/* Commit button */}
      <button
        onClick={handleCommitAll}
        disabled={!canCommit || isExecuting !== null}
        className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
          canCommit
            ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 border border-yellow-500/30'
            : 'bg-gray-700/30 text-gray-500 cursor-not-allowed opacity-50'
        }`}
        title={canCommit ? 'Commit changes' : 'No changes to commit'}
      >
        {isExecuting === 'Commit all' ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <GitCommit className="w-4 h-4" />
        )}
        <span>Commit</span>
      </button>
      
      {/* Stash button */}
      <button
        onClick={handleStash}
        disabled={!canStash || isExecuting !== null}
        className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
          canStash
            ? 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 border border-purple-500/30'
            : 'bg-gray-700/30 text-gray-500 cursor-not-allowed opacity-50'
        }`}
        title={canStash ? 'Stash changes' : 'No changes to stash'}
      >
        {isExecuting === 'Stash' ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Archive className="w-4 h-4" />
        )}
        <span>Stash</span>
      </button>
      
      {/* Refresh button */}
      <button
        onClick={onRefresh}
        disabled={isRefreshing || isExecuting !== null}
        className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-gray-700/30 hover:bg-gray-700/50 text-gray-400 hover:text-gray-300 text-sm font-medium transition-all"
        title="Refresh status"
      >
        <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        <span>Refresh</span>
      </button>
      
      {/* Fetch button */}
      <button
        onClick={handleFetch}
        disabled={isExecuting !== null}
        className="p-1.5 rounded-lg bg-gray-700/30 hover:bg-gray-700/50 text-gray-400 hover:text-gray-300 transition-all"
        title="Fetch from remote"
      >
        {isExecuting === 'Fetch' ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <GitPullRequest className="w-4 h-4" />
        )}
      </button>
    </div>
  );
};

export default ContextualActions;