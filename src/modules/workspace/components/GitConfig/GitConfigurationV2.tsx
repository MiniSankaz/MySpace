'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { GitBranch, RefreshCw, GitCommit, Loader2 } from 'lucide-react';
import QuickBranchSwitcher from './QuickBranchSwitcher';
import VisualStatusIndicators from './VisualStatusIndicators';
import ContextualActions from './ContextualActions';
import SmartCommitInterface from './SmartCommitInterface';
import BranchManagement from './BranchManagement';
import StashManagement from './StashManagement';
import { GitStatus, GitBranch as GitBranchType } from '@/types/git';
import { useToast } from '@/components/ui/use-toast';
import { CircuitBreaker } from '@/lib/circuit-breaker';
import { gitWebSocketPool } from '@/services/git.service';

// Environment variables for Git auto-refresh control
const GIT_AUTO_REFRESH_ENABLED = process.env.NEXT_PUBLIC_GIT_AUTO_REFRESH === 'true';
const GIT_AUTO_REFRESH_INTERVAL = parseInt(process.env.NEXT_PUBLIC_GIT_AUTO_REFRESH_INTERVAL || '60000'); // Default 60 seconds
const GIT_WEBSOCKET_ENABLED = process.env.NEXT_PUBLIC_GIT_WEBSOCKET === 'true'; // Default disabled

interface GitConfigurationV2Props {
  project: {
    id: string;
    name: string;
    path: string;
  };
  onBranchChange?: (branch: string) => void;
}

// Helper function for debounce
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export const GitConfigurationV2: React.FC<GitConfigurationV2Props> = ({ 
  project,
  onBranchChange 
}) => {
  const [currentBranch, setCurrentBranch] = useState<string>('main');
  const [branches, setBranches] = useState<GitBranchType[]>([]);
  const [status, setStatus] = useState<GitStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeView, setActiveView] = useState<'commit' | 'branches' | 'stash'>('commit');
  const [wsState, setWsState] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(GIT_AUTO_REFRESH_ENABLED);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const autoRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const circuitBreakerRef = useRef<CircuitBreaker>(new CircuitBreaker());
  const { toast } = useToast();
  
  // Manual refresh function
  const loadStatus = useCallback(async () => {
    console.log('[GitConfig] 🔄 Manual refresh triggered for project:', project.id);
    setIsRefreshing(true);
    
    try {
      // Fetch git status
      const statusRes = await fetch(`/api/workspace/git/status?projectId=${project.id}`, {
        credentials: 'include',
      });
      
      // Handle unauthorized
      if (statusRes.status === 401) {
        console.warn('[GitConfig] 🚫 Unauthorized - user needs to login');
        toast({
          title: 'Authentication Required',
          description: 'Please login to access Git features',
          variant: 'destructive',
        });
        return;
      }
      
      // Handle rate limiting
      if (statusRes.status === 429) {
        console.warn('[GitConfig] ⏳ Rate limited on status API');
        const retryAfter = statusRes.headers.get('Retry-After');
        toast({
          title: 'Rate Limited',
          description: `Please wait ${retryAfter || '60'} seconds before refreshing`,
          variant: 'destructive',
        });
        return;
      }
      
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setStatus(statusData);
        setCurrentBranch(statusData.currentBranch || 'main');
        console.log('[GitConfig] ✅ Status updated:', statusData.currentBranch);
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Fetch branches
      const branchesRes = await fetch(`/api/workspace/git/branches?projectId=${project.id}`, {
        credentials: 'include',
      });
      
      if (branchesRes.ok) {
        const branchesData = await branchesRes.json();
        setBranches(branchesData.branches || []);
        console.log('[GitConfig] ✅ Branches updated:', branchesData.branches?.length || 0);
      }
      
      // Update last refresh time
      setLastRefreshTime(new Date());
      
    } catch (error) {
      console.error('[GitConfig] ❌ Failed to refresh:', error);
      toast({
        title: 'Refresh Failed',
        description: error instanceof Error ? error.message : 'Failed to load Git status',
        variant: 'destructive',
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [project.id, toast]);
  
  // Toggle auto-refresh
  const toggleAutoRefresh = useCallback(() => {
    setAutoRefreshEnabled(prev => {
      const newState = !prev;
      console.log(`[GitConfig] Auto-refresh ${newState ? 'enabled' : 'disabled'}`);
      
      if (newState) {
        toast({
          title: 'Auto-refresh Enabled',
          description: `Git status will refresh every ${GIT_AUTO_REFRESH_INTERVAL / 1000} seconds`,
        });
      } else {
        toast({
          title: 'Auto-refresh Disabled',
          description: 'Use the refresh button to update Git status',
        });
      }
      
      return newState;
    });
  }, [toast]);
  
  // WebSocket connection (only if enabled via ENV)
  const connectWebSocket = useCallback(async () => {
    // Only connect if WebSocket is enabled
    if (!GIT_WEBSOCKET_ENABLED) {
      console.log('[GitConfig] WebSocket disabled by environment variable');
      return;
    }
    
    // Check if already connected
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('[GitConfig] WebSocket already connected');
      return;
    }
    
    // Check circuit breaker WITHOUT scheduling retries
    const circuitBreaker = circuitBreakerRef.current;
    if (!circuitBreaker.canAttempt()) {
      const state = circuitBreaker.getState();
      console.warn('[GitConfig] Circuit breaker blocking connection:', state);
      setWsState('error');
      // DO NOT schedule automatic retry - let user manually refresh
      return;
    }
    
    // Record connection attempt
    circuitBreaker.recordAttempt();
    
    console.log('[GitConfig] Attempting WebSocket connection...');
    setWsState('connecting');
    
    try {
      const ws = await gitWebSocketPool.getConnection(project.id);
      if (!ws) {
        throw new Error('Failed to get connection from pool');
      }
      
      wsRef.current = ws;
      setWsState('connected');
      circuitBreaker.recordSuccess();
      
      // Send subscription
      ws.send(JSON.stringify({ 
        type: 'subscribe', 
        projectId: project.id,
        projectPath: project.path 
      }));
      
      // Setup handlers
      setupWebSocketHandlers(ws);
      
    } catch (error) {
      console.error('[GitConfig] WebSocket connection failed:', error);
      circuitBreaker.recordFailure();
      setWsState('error');
      // DO NOT schedule automatic retry
    }
  }, [project.id, project.path]);
  
  // Setup WebSocket handlers (simplified)
  const setupWebSocketHandlers = useCallback((ws: WebSocket) => {
    // Check if handlers already set
    if ((ws as any)._gitConfigHandlersSet) {
      return;
    }
    (ws as any)._gitConfigHandlersSet = true;
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch(data.type) {
          case 'status-update':
            setStatus(data.status);
            if (data.currentBranch) {
              setCurrentBranch(data.currentBranch);
            }
            break;
            
          case 'branches-update':
            setBranches(data.branches);
            break;
            
          case 'branch-changed':
            setCurrentBranch(data.branch);
            onBranchChange?.(data.branch);
            toast({
              title: 'Branch Changed',
              description: `Switched to ${data.branch}`,
            });
            break;
            
          case 'error':
            // Only show non-terminal errors
            if (data.message && !data.message.includes('posix_spawnp')) {
              console.error('[GitConfig] Git error:', data.message);
            }
            break;
        }
      } catch (error) {
        console.error('[GitConfig] WebSocket message error:', error);
      }
    };
    
    ws.onerror = (error) => {
      console.error('[GitConfig] WebSocket error:', error);
      circuitBreakerRef.current.recordFailure();
      setWsState('error');
    };
    
    ws.onclose = (event) => {
      console.log('[GitConfig] WebSocket closed:', event.code, event.reason);
      setWsState('disconnected');
      wsRef.current = null;
      
      // DO NOT automatically reconnect - let user manually refresh
      if (event.code !== 1000 && event.code !== 1001) {
        circuitBreakerRef.current.recordFailure();
      }
    };
  }, [onBranchChange, toast]);
  
  // Initial load on mount
  useEffect(() => {
    console.log('[GitConfig] Component mounted for project:', project.id);
    
    // Initial load
    loadStatus();
    
    // Connect WebSocket if enabled
    if (GIT_WEBSOCKET_ENABLED) {
      connectWebSocket();
    }
    
    // Cleanup
    return () => {
      console.log('[GitConfig] Component unmounting for project:', project.id);
      
      // Clean up WebSocket
      if (wsRef.current) {
        gitWebSocketPool.releaseConnection(project.id);
        wsRef.current = null;
      }
      
      // Reset circuit breaker
      circuitBreakerRef.current.reset();
      setWsState('disconnected');
    };
  }, [project.id]); // Only re-run when project changes
  
  // Auto-refresh interval (only when enabled and tab is visible)
  useEffect(() => {
    if (!autoRefreshEnabled) {
      // Clear any existing interval
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
        autoRefreshIntervalRef.current = null;
      }
      return;
    }
    
    console.log(`[GitConfig] Setting up auto-refresh interval (${GIT_AUTO_REFRESH_INTERVAL}ms)`);
    
    // Setup interval
    autoRefreshIntervalRef.current = setInterval(() => {
      // Only refresh if tab is visible
      if (document.visibilityState === 'visible') {
        console.log('[GitConfig] Auto-refresh triggered');
        loadStatus();
      } else {
        console.log('[GitConfig] Auto-refresh skipped (tab not visible)');
      }
    }, GIT_AUTO_REFRESH_INTERVAL);
    
    return () => {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
        autoRefreshIntervalRef.current = null;
      }
    };
  }, [autoRefreshEnabled, loadStatus]);
  
  // Branch operations
  const handleBranchSwitch = useCallback(async (branch: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/workspace/git/switch-branch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ projectId: project.id, branch }),
      });
      
      if (response.ok) {
        setCurrentBranch(branch);
        onBranchChange?.(branch);
        await loadStatus(); // Refresh after switch
        toast({
          title: 'Branch Switched',
          description: `Now on branch: ${branch}`,
        });
      } else {
        throw new Error('Failed to switch branch');
      }
    } catch (error) {
      console.error('Failed to switch branch:', error);
      toast({
        title: 'Switch Failed',
        description: error instanceof Error ? error.message : 'Failed to switch branch',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [project.id, onBranchChange, toast, loadStatus]);
  
  // Commit operation
  const handleCommit = useCallback(async (message: string, files: string[]) => {
    setLoading(true);
    try {
      // Stage files
      await fetch('/api/workspace/git/stage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ projectId: project.id, files }),
      });
      
      // Commit
      const response = await fetch('/api/workspace/git/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ projectId: project.id, message }),
      });
      
      if (response.ok) {
        await loadStatus(); // Refresh after commit
        toast({
          title: 'Commit Successful',
          description: 'Changes have been committed',
        });
      } else {
        throw new Error('Failed to commit');
      }
    } catch (error) {
      console.error('Failed to commit:', error);
      toast({
        title: 'Commit Failed',
        description: error instanceof Error ? error.message : 'Failed to commit changes',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [project.id, toast, loadStatus]);
  
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-3">
          <GitBranch className="w-5 h-5 text-muted-foreground" />
          <span className="font-semibold">{project.name}</span>
          {currentBranch && (
            <span className="text-sm text-muted-foreground">
              on <span className="font-mono text-primary">{currentBranch}</span>
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Auto-refresh toggle */}
          <button
            onClick={toggleAutoRefresh}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              autoRefreshEnabled 
                ? 'bg-green-500/20 text-green-600 dark:text-green-400' 
                : 'bg-gray-500/20 text-gray-600 dark:text-gray-400'
            }`}
            title={autoRefreshEnabled ? 'Auto-refresh enabled' : 'Auto-refresh disabled'}
          >
            {autoRefreshEnabled ? 'Auto' : 'Manual'}
          </button>
          
          {/* Manual refresh button */}
          <button
            onClick={loadStatus}
            disabled={isRefreshing}
            className="p-2 rounded-lg hover:bg-accent transition-colors"
            title="Refresh Git status"
          >
            {isRefreshing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </button>
          
          {/* Last refresh time */}
          {lastRefreshTime && (
            <span className="text-xs text-muted-foreground">
              {lastRefreshTime.toLocaleTimeString()}
            </span>
          )}
          
          {/* WebSocket status indicator (only if enabled) */}
          {GIT_WEBSOCKET_ENABLED && (
            <div className={`w-2 h-2 rounded-full ${
              wsState === 'connected' ? 'bg-green-500' :
              wsState === 'connecting' ? 'bg-yellow-500 animate-pulse' :
              wsState === 'error' ? 'bg-red-500' :
              'bg-gray-500'
            }`} title={`WebSocket: ${wsState}`} />
          )}
        </div>
      </div>
      
      {/* Quick Branch Switcher */}
      <QuickBranchSwitcher
        branches={branches}
        currentBranch={currentBranch}
        onSwitch={handleBranchSwitch}
        loading={loading}
      />
      
      {/* Visual Status Indicators */}
      {status && <VisualStatusIndicators status={status} />}
      
      {/* Tab Navigation */}
      <div className="flex gap-1 p-2 border-b">
        <button
          onClick={() => setActiveView('commit')}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            activeView === 'commit' 
              ? 'bg-primary text-primary-foreground' 
              : 'hover:bg-muted'
          }`}
        >
          <GitCommit className="w-4 h-4 inline-block mr-1" />
          Commit
        </button>
        <button
          onClick={() => setActiveView('branches')}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            activeView === 'branches' 
              ? 'bg-primary text-primary-foreground' 
              : 'hover:bg-muted'
          }`}
        >
          <GitBranch className="w-4 h-4 inline-block mr-1" />
          Branches
        </button>
        <button
          onClick={() => setActiveView('stash')}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            activeView === 'stash' 
              ? 'bg-primary text-primary-foreground' 
              : 'hover:bg-muted'
          }`}
        >
          Stash
        </button>
      </div>
      
      {/* Content Area */}
      <div className="flex-1 overflow-auto">
        {activeView === 'commit' && status && (
          <SmartCommitInterface
            status={status}
            onCommit={handleCommit}
            onRefresh={loadStatus}
          />
        )}
        
        {activeView === 'branches' && (
          <BranchManagement
            branches={branches}
            currentBranch={currentBranch}
            projectId={project.id}
            onBranchChange={handleBranchSwitch}
            onRefresh={loadStatus}
          />
        )}
        
        {activeView === 'stash' && (
          <StashManagement
            projectId={project.id}
            onRefresh={loadStatus}
          />
        )}
      </div>
      
      {/* Contextual Actions */}
      {status && (
        <ContextualActions
          status={status}
          projectId={project.id}
          onActionComplete={loadStatus}
        />
      )}
    </div>
  );
};

export default GitConfigurationV2;