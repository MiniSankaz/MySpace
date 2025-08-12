'use client';

import React, { useState, useEffect } from 'react';
import { 
  Archive, 
  Clock, 
  FileText,
  Trash2,
  Plus,
  Eye,
  Loader2,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface StashEntry {
  id: string;
  message: string;
  date: Date;
  files: string[];
  branch: string;
}

interface StashManagementProps {
  projectId: string;
  onRefresh: () => void;
}

const StashManagement: React.FC<StashManagementProps> = ({
  projectId,
  onRefresh,
}) => {
  const [stashList, setStashList] = useState<StashEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedStash, setSelectedStash] = useState<string | null>(null);
  const [stashMessage, setStashMessage] = useState('');
  const [isStashing, setIsStashing] = useState(false);
  const { toast } = useToast();
  
  const loadStashList = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch(`/api/workspace/git/stash/list?projectId=${projectId}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to load stash list');
      }
      
      const data = await response.json();
      setStashList(data.stashes || []);
    } catch (error) {
      console.error('Failed to load stash list:', error);
      toast({
        title: 'Failed to load stash list',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsRefreshing(false);
    }
  };
  
  useEffect(() => {
    loadStashList();
  }, [projectId]);
  
  const handleCreateStash = async () => {
    setIsStashing(true);
    try {
      const response = await fetch('/api/workspace/git/stash/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          projectId,
          message: stashMessage.trim() || undefined,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create stash');
      }
      
      toast({
        title: 'Changes stashed',
        description: stashMessage || 'Created new stash',
      });
      
      setStashMessage('');
      loadStashList();
      onRefresh();
    } catch (error) {
      console.error('Failed to create stash:', error);
      toast({
        title: 'Failed to create stash',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsStashing(false);
    }
  };
  
  const handleApplyStash = async (stashId: string, pop: boolean = false) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/workspace/git/stash/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          projectId,
          stashId,
          pop,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to apply stash');
      }
      
      toast({
        title: pop ? 'Stash popped' : 'Stash applied',
        description: 'Changes have been applied to your working directory',
      });
      
      if (pop) {
        loadStashList();
      }
      onRefresh();
    } catch (error) {
      console.error('Failed to apply stash:', error);
      toast({
        title: 'Failed to apply stash',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDropStash = async (stashId: string) => {
    if (!confirm('Are you sure you want to delete this stash?')) {
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/workspace/git/stash/drop', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          projectId,
          stashId,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to drop stash');
      }
      
      toast({
        title: 'Stash deleted',
        description: 'The stash has been permanently removed',
      });
      
      loadStashList();
    } catch (error) {
      console.error('Failed to drop stash:', error);
      toast({
        title: 'Failed to drop stash',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleShowStash = async (stashId: string) => {
    setSelectedStash(stashId);
    // In a real implementation, this would show the diff
    toast({
      title: 'Stash Details',
      description: 'Stash diff viewer coming soon',
    });
  };
  
  return (
    <div className="space-y-6">
      {/* Create new stash */}
      <div className="bg-gray-800/30 rounded-xl p-4">
        <h3 className="text-sm font-medium text-gray-300 mb-4">Create New Stash</h3>
        
        <div className="space-y-3">
          <input
            type="text"
            value={stashMessage}
            onChange={(e) => setStashMessage(e.target.value)}
            placeholder="Stash message (optional)"
            className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
          
          <button
            onClick={handleCreateStash}
            disabled={isStashing}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {isStashing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Stashing...</span>
              </>
            ) : (
              <>
                <Archive className="w-4 h-4" />
                <span>Stash Changes</span>
              </>
            )}
          </button>
        </div>
      </div>
      
      {/* Stash list */}
      <div className="bg-gray-800/30 rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-300">Stash List</h3>
          <button
            onClick={loadStashList}
            disabled={isRefreshing}
            className="p-1 rounded-lg hover:bg-gray-700/50 text-gray-400 hover:text-gray-300 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
        
        {stashList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-500">
            <Archive className="w-8 h-8 mb-2" />
            <span className="text-sm">No stashes found</span>
            <span className="text-xs mt-1">Stash your changes to save them for later</span>
          </div>
        ) : (
          <div className="space-y-2">
            {stashList.map((stash, index) => (
              <div
                key={stash.id}
                className="px-3 py-3 rounded-lg bg-gray-900/30 hover:bg-gray-900/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500">stash@{index}</span>
                      {stash.branch && (
                        <span className="text-xs text-blue-400">on {stash.branch}</span>
                      )}
                    </div>
                    <div className="mt-1">
                      <span className="text-sm font-medium text-gray-200">
                        {stash.message || 'WIP on branch'}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{formatDate(stash.date)}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <FileText className="w-3 h-3" />
                        <span>{stash.files.length} files</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-1 ml-4">
                    <button
                      onClick={() => handleShowStash(stash.id)}
                      className="p-1.5 rounded-lg hover:bg-gray-700/50 text-gray-400 hover:text-gray-300 transition-colors"
                      title="View stash"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    
                    <button
                      onClick={() => handleApplyStash(stash.id, false)}
                      disabled={isLoading}
                      className="p-1.5 rounded-lg hover:bg-gray-700/50 text-gray-400 hover:text-gray-300 transition-colors"
                      title="Apply stash"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    
                    <button
                      onClick={() => handleApplyStash(stash.id, true)}
                      disabled={isLoading}
                      className="p-1.5 rounded-lg hover:bg-gray-700/50 text-gray-400 hover:text-gray-300 transition-colors"
                      title="Pop stash"
                    >
                      <Archive className="w-4 h-4" />
                    </button>
                    
                    <button
                      onClick={() => handleDropStash(stash.id)}
                      disabled={isLoading}
                      className="p-1.5 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"
                      title="Delete stash"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

function formatDate(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const seconds = Math.floor(diff / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  
  return d.toLocaleDateString();
}

export default StashManagement;