'use client';

import React, { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Plus, X, AlertCircle, Loader2, Grid, Columns, Rows, Square, Command } from 'lucide-react';
import { Project } from '../../types';

// Lazy load XTermViewV2 for better performance
const XTermViewV2 = lazy(() => import('./XTermViewV2'));

// Layout configurations
const LAYOUTS = {
  '1x1': { rows: 1, cols: 1, icon: Square, label: '1x1' },
  '1x2': { rows: 1, cols: 2, icon: Columns, label: '1x2' },
  '1x3': { rows: 1, cols: 3, icon: Columns, label: '1x3' },
  '2x1': { rows: 2, cols: 1, icon: Rows, label: '2x1' },
  '2x2': { rows: 2, cols: 2, icon: Grid, label: '2x2' },
  '2x3': { rows: 2, cols: 3, icon: Grid, label: '2x3' },
} as const;

type LayoutType = keyof typeof LAYOUTS;

interface TerminalSession {
  id: string;
  projectId: string;
  type: 'terminal';
  mode: 'normal' | 'claude';
  tabName: string;
  status: 'active' | 'inactive' | 'error';
  isFocused: boolean;
  gridPosition?: number; // Position in grid (0-5 for 2x3)
}

interface TerminalContainerV3Props {
  project: Project;
}

const TerminalContainerV3: React.FC<TerminalContainerV3Props> = ({ project }) => {
  const [sessions, setSessions] = useState<TerminalSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentLayout, setCurrentLayout] = useState<LayoutType>('1x1');
  const previousProjectIdRef = useRef<string | null>(null);
  const [suspendedProjects, setSuspendedProjects] = useState<Set<string>>(new Set());
  
  // Calculate max terminals based on layout
  const maxTerminals = LAYOUTS[currentLayout].rows * LAYOUTS[currentLayout].cols;
  
  // Handle project switching with suspension/resumption
  useEffect(() => {
    const handleProjectSwitch = async () => {
      // Suspend previous project if switching
      if (previousProjectIdRef.current && previousProjectIdRef.current !== project.id) {
        await suspendProjectSessions(previousProjectIdRef.current);
        setSuspendedProjects(prev => new Set(prev).add(previousProjectIdRef.current!));
      }
      
      // Check if current project has suspended sessions
      if (suspendedProjects.has(project.id)) {
        await resumeProjectSessions(project.id);
        setSuspendedProjects(prev => {
          const next = new Set(prev);
          next.delete(project.id);
          return next;
        });
      } else {
        // Load fresh sessions
        loadSessions();
      }
      
      // Update previous project reference
      previousProjectIdRef.current = project.id;
    };
    
    handleProjectSwitch();
  }, [project.id]);
  
  // Track if component is truly unmounting (not React StrictMode)
  const isUnmountingRef = useRef(false);
  
  // Cleanup only when truly leaving workspace
  useEffect(() => {
    // Mark as mounted
    isUnmountingRef.current = false;
    
    return () => {
      // Mark as unmounting
      isUnmountingRef.current = true;
      
      // Don't cleanup sessions - they should persist
      console.log('[TerminalContainer] Component unmounting but keeping sessions alive');
    };
  }, []); // Empty dependency array - only runs on mount/unmount

  // Load sessions from backend
  const loadSessions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/terminal/list?projectId=${project.id}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && Array.isArray(data.sessions)) {
        const sessionList = data.sessions.map((s: any, index: number) => ({
          ...s,
          type: 'terminal',
          mode: s.mode || 'normal',
          gridPosition: index,
          isFocused: s.isFocused || false
        }));
        setSessions(sessionList);
        
        // Auto-focus first terminal if no sessions are focused
        const hasFocusedSession = sessionList.some(s => s.isFocused);
        if (sessionList.length > 0 && !hasFocusedSession) {
          console.log(`[TerminalContainer] Auto-focusing first session: ${sessionList[0].id}`);
          await setFocus(sessionList[0].id, true);
        }
      }
    } catch (err) {
      console.error('Failed to load sessions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  // No longer need to track retry attempts since terminals connect directly
  
  // Create new terminal session with retry limit
  const createSession = async (mode: 'normal' | 'claude' = 'normal') => {
    console.log(`[TerminalContainer] 🆕 createSession called - mode: ${mode}, current sessions: ${sessions.length}`);
    
    if (sessions.length >= maxTerminals) {
      console.log(`[TerminalContainer] ❌ Max terminals (${maxTerminals}) reached for ${currentLayout} layout`);
      setError(`Maximum ${maxTerminals} terminals for ${currentLayout} layout`);
      return;
    }
    
    // Prevent duplicate creation attempts
    if (loading) {
      console.log('[TerminalContainer] ⏳ Already creating session, skipping duplicate request...');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      console.log(`[TerminalContainer] 📮 Sending create request for project: ${project.id}`);
      const response = await fetch('/api/terminal/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          projectPath: project.path,
          mode,
        }),
      });
      
      const data = await response.json();
      console.log('[TerminalContainer] 📦 Create response:', data);
      
      if (data.success && data.session) {
        const sessionId = data.session.id;
        
        // Always add session immediately - XTermViewV2 will handle WebSocket connection
        console.log(`[TerminalContainer] ✅ Session created: ${sessionId}, adding to UI`);
        
        const newSession = {
          ...data.session,
          type: 'terminal' as const,
          mode,
          gridPosition: sessions.length,
          status: 'active' as const
        };
        
        setSessions(prev => {
          console.log(`[TerminalContainer] 📝 Adding session to state, new count: ${prev.length + 1}`);
          return [...prev, newSession];
        });
        
        // Auto-focus new terminal
        console.log(`[TerminalContainer] 🎯 Focusing new session: ${newSession.id}`);
        await setFocus(newSession.id, true);
        
        // Show Claude hint if in claude mode
        if (mode === 'claude') {
          console.log('[TerminalContainer] 💡 Terminal created in Claude mode. Type "claude" to start Claude CLI.');
        }
        
        // The XTermViewV2 component will connect to WebSocket when it mounts
        console.log(`[TerminalContainer] Terminal component will establish WebSocket connection`);
      }
    } catch (err) {
      console.error('Failed to create session:', err);
      setError(err instanceof Error ? err.message : 'Failed to create session');
    } finally {
      setLoading(false);
    }
  };

  // Set terminal focus
  const setFocus = async (sessionId: string, focused: boolean) => {
    try {
      const response = await fetch('/api/terminal/focus', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          sessionId,
          focused,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        const focusedSessionIds = data.focusedSessions || [];
        
        setSessions(prev => {
          const updated = prev.map(s => ({
            ...s,
            isFocused: focusedSessionIds.includes(s.id)
          }));
          
          console.log(`[TerminalContainer] Updated focus states:`, 
            updated.map(s => ({ id: s.id, focused: s.isFocused }))
          );
          
          return updated;
        });
      }
    } catch (err) {
      console.error('Failed to set focus:', err);
    }
  };

  // Suspend sessions for a project
  const suspendProjectSessions = async (projectId: string) => {
    try {
      const response = await fetch('/api/terminal/suspend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`[TerminalContainer] Suspended ${data.suspendedSessionCount} sessions for project ${projectId}`);
      }
    } catch (err) {
      console.error('Failed to suspend sessions:', err);
    }
  };
  
  // Resume sessions for a project
  const resumeProjectSessions = async (projectId: string) => {
    try {
      const response = await fetch('/api/terminal/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.resumed && data.sessions.length > 0) {
          // Format sessions for state
          const formattedSessions = data.sessions.map((s: any, index: number) => ({
            ...s,
            type: 'terminal' as const,
            mode: s.mode || 'normal',
            gridPosition: index,
            isFocused: s.isFocused || false
          }));
          
          setSessions(formattedSessions);
          
          // Restore UI state if available
          if (data.uiState?.currentLayout) {
            setCurrentLayout(data.uiState.currentLayout);
          }
          
          console.log(`[TerminalContainer] Resumed ${data.sessions.length} sessions for project ${projectId}`);
          
          // Show buffered output if any
          data.sessions.forEach((s: any) => {
            if (s.bufferedOutput && s.bufferedOutput.length > 0) {
              console.log(`[TerminalContainer] Session ${s.id} has ${s.bufferedOutput.length} buffered outputs`);
            }
          });
        }
      }
    } catch (err) {
      console.error('Failed to resume sessions:', err);
    }
  };
  
  // Close terminal session
  const closeSession = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/terminal/close/${sessionId}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSessions(prev => {
          const newSessions = prev.filter(s => s.id !== sessionId);
          // Reassign grid positions
          return newSessions.map((s, index) => ({
            ...s,
            gridPosition: index
          }));
        });
      }
    } catch (err) {
      console.error('Failed to close session:', err);
    }
  };

  // Cleanup all sessions on unmount
  const cleanupAllSessions = async () => {
    try {
      await fetch('/api/terminal/cleanup', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id }),
      });
    } catch (err) {
      console.error('Failed to cleanup sessions:', err);
    }
  };

  // Handle layout change
  const handleLayoutChange = (newLayout: LayoutType) => {
    setCurrentLayout(newLayout);
    
    // If we have more terminals than the new layout supports, unfocus extras
    const newMax = LAYOUTS[newLayout].rows * LAYOUTS[newLayout].cols;
    if (sessions.length > newMax) {
      sessions.slice(newMax).forEach(session => {
        setFocus(session.id, false);
      });
    }
  };

  // Toggle Claude mode for a terminal
  const toggleMode = (sessionId: string) => {
    setSessions(prev => prev.map(s => 
      s.id === sessionId 
        ? { ...s, mode: s.mode === 'normal' ? 'claude' : 'normal' }
        : s
    ));
  };

  // Render grid of terminals
  const renderGrid = () => {
    const { rows, cols } = LAYOUTS[currentLayout];
    const grid = [];
    
    for (let i = 0; i < rows * cols; i++) {
      const session = sessions.find(s => s.gridPosition === i);
      
      grid.push(
        <div
          key={`grid-${i}`}
          className="relative bg-black rounded-lg border border-gray-700 overflow-hidden"
        >
          {session ? (
            <>
              {/* Terminal Header */}
              <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-r from-gray-800/90 to-slate-800/90 backdrop-blur-sm px-2 py-1 flex items-center justify-between border-b border-gray-700/50">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-medium text-gray-300">
                    {session.tabName}
                  </span>
                  
                  {/* Status Indicator */}
                  {session.status === 'suspended' ? (
                    <span className="flex items-center px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 text-[10px] rounded">
                      <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse mr-1" />
                      Suspended
                    </span>
                  ) : session.status === 'active' ? (
                    <span className="flex items-center px-1.5 py-0.5 bg-green-500/20 text-green-400 text-[10px] rounded">
                      <span className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1" />
                      Active
                    </span>
                  ) : session.status === 'inactive' ? (
                    <span className="flex items-center px-1.5 py-0.5 bg-gray-500/20 text-gray-400 text-[10px] rounded">
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-1" />
                      Idle
                    </span>
                  ) : null}
                  
                  {session.mode === 'claude' && (
                    <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-400 text-[10px] rounded">
                      Claude
                    </span>
                  )}
                  
                  <button
                    onClick={() => setFocus(session.id, !session.isFocused)}
                    className={`px-2 py-0.5 rounded text-[10px] transition-all ${
                      session.isFocused
                        ? 'bg-green-600/30 text-green-300 border border-green-500/50'
                        : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                    }`}
                  >
                    {session.isFocused ? 'LIVE' : 'FOCUS'}
                  </button>
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => toggleMode(session.id)}
                    className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors"
                    title={`Switch to ${session.mode === 'normal' ? 'Claude' : 'Normal'} mode`}
                  >
                    <Command className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => closeSession(session.id)}
                    className="p-1 hover:bg-red-700 rounded text-gray-400 hover:text-red-400 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
              
              {/* Terminal Content */}
              <div className="h-full pt-8">
                <Suspense fallback={
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                  </div>
                }>
                  <XTermViewV2
                    sessionId={session.id}
                    projectId={project.id}
                    projectPath={project.path}
                    type="system"
                    isFocused={session.isFocused}
                  />
                </Suspense>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <button
                  onClick={() => createSession('normal')}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-400 hover:text-white transition-all duration-200"
                  disabled={loading}
                >
                  <Plus className="w-4 h-4 inline mr-2" />
                  New Terminal
                </button>
                <button
                  onClick={() => createSession('claude')}
                  className="ml-2 px-4 py-2 bg-purple-900/30 hover:bg-purple-800/40 rounded-lg text-sm text-purple-400 hover:text-purple-300 transition-all duration-200"
                  disabled={loading}
                >
                  <Plus className="w-4 h-4 inline mr-2" />
                  Claude Mode
                </button>
              </div>
            </div>
          )}
        </div>
      );
    }
    
    return (
      <div 
        className={`h-full grid gap-1 bg-gray-900 p-1`}
        style={{
          gridTemplateRows: `repeat(${rows}, 1fr)`,
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
        }}
      >
        {grid}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-gray-900 to-slate-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-800/90 to-slate-800/90 backdrop-blur-lg border-b border-gray-700/50 px-4 py-3 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-2 px-3 py-1 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg border border-blue-500/20">
              <Terminal className="w-5 h-5 text-blue-400" />
              <span className="text-sm font-semibold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Terminal
              </span>
            </div>
            <span className="text-xs text-gray-400 font-mono ml-2 px-2 py-1 bg-black/30 rounded-md border border-gray-700/50">
              {sessions.length}/{maxTerminals} terminals
            </span>
            
            {/* Suspended Projects Indicator */}
            {suspendedProjects.size > 0 && (
              <span className="flex items-center text-xs text-yellow-400 font-mono ml-2 px-2 py-1 bg-yellow-500/10 rounded-md border border-yellow-500/30">
                <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse mr-1.5" />
                {suspendedProjects.size} suspended {suspendedProjects.size === 1 ? 'project' : 'projects'}
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {error && (
              <div className="flex items-center space-x-1 text-red-400 text-xs">
                <AlertCircle className="w-3 h-3" />
                <span>{error}</span>
              </div>
            )}
            
            {/* Layout Controls */}
            <div className="flex items-center space-x-1 border-r border-gray-600 pr-2 mr-2">
              {Object.entries(LAYOUTS).map(([key, config]) => {
                const Icon = config.icon;
                return (
                  <button
                    key={key}
                    onClick={() => handleLayoutChange(key as LayoutType)}
                    className={`p-2 rounded-lg transition-all duration-200 ${
                      currentLayout === key
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25 scale-105'
                        : 'text-gray-400 hover:text-white hover:bg-gray-700/50 hover:shadow-md'
                    }`}
                    title={`${config.label} layout`}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                );
              })}
            </div>
            
            <button
              onClick={() => createSession('normal')}
              className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors"
              title="New Terminal"
              disabled={loading || sessions.length >= maxTerminals}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Terminal Grid */}
      <div className="flex-1 overflow-hidden">
        {loading && sessions.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
          </div>
        ) : (
          renderGrid()
        )}
      </div>
    </div>
  );
};

export default TerminalContainerV3;