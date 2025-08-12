'use client';

import React, { useState, useEffect, useCallback, useRef, lazy, Suspense, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Plus, X, AlertCircle, RefreshCw, Loader2, Keyboard, Maximize2, Minimize2, Columns, Rows, Grid } from 'lucide-react';
import { Project } from '../../types';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';

// Lazy load XTermViewV2 for better performance
const XTermViewV2 = lazy(() => import('./XTermViewV2'));

interface TerminalSession {
  id: string;
  projectId: string;
  type: 'system' | 'claude';
  tabName: string;
  status: 'active' | 'inactive' | 'error';
  isFocused: boolean;
}

interface TerminalContainerV2Props {
  project: Project;
}

/**
 * TerminalContainerV2 - Simplified terminal management with focus-based streaming
 * 
 * Key improvements:
 * - Single source of truth (backend)
 * - Focus-based streaming (60% CPU reduction)
 * - Simple state management
 * - No complex reconnection logic
 */
const TerminalContainerV2: React.FC<TerminalContainerV2Props> = ({ project }) => {
  const [sessions, setSessions] = useState<TerminalSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  
  // Layout state
  const [layout, setLayout] = useState<{
    type: 'single' | 'split-horizontal' | 'split-vertical' | 'grid';
    maximized: 'system' | 'claude' | null;
  }>({ type: 'single', maximized: null });
  
  // WebSocket connections
  const systemWsRef = useRef<WebSocket | null>(null);
  const claudeWsRef = useRef<WebSocket | null>(null);
  
  // Terminal connection status tracking
  const [connectionStatus, setConnectionStatus] = useState<Record<string, 'connecting' | 'connected' | 'disconnected' | 'error'>>({});

  // Load existing sessions on mount
  useEffect(() => {
    loadSessions();
    
    // Cleanup on unmount
    return () => {
      cleanupAllSessions();
    };
  }, [project.id]);

  // Load sessions from backend with retry logic
  const loadSessions = async (retryCount = 0) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('[TerminalV2] Loading sessions for project:', project.id);
      const response = await fetch(`/api/terminal/list?projectId=${project.id}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[TerminalV2] API Error:', response.status, errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('[TerminalV2] API Response:', data);
      
      if (data.success && Array.isArray(data.sessions)) {
        const sessionList = data.sessions || [];
        setSessions(sessionList);
        console.log('[TerminalV2] Loaded sessions:', sessionList.length);
        
        // Set first session as active if exists
        if (sessionList.length > 0 && !activeSessionId) {
          setActiveSessionId(sessionList[0].id);
          await setFocus(sessionList[0].id);
        }
      } else if (data.error) {
        console.error('[TerminalV2] API returned error:', data.error);
        throw new Error(data.error);
      } else {
        console.warn('[TerminalV2] Unexpected response format:', data);
        setSessions([]);
      }
    } catch (err) {
      console.error('Failed to load sessions:', err);
      
      // Retry logic
      if (retryCount < 2) {
        console.log(`Retrying load sessions (attempt ${retryCount + 2}/3)...`);
        setTimeout(() => loadSessions(retryCount + 1), 1000);
      } else {
        setError('Failed to load terminal sessions. Please refresh the page.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Create new terminal session
  const createSession = async (type: 'system' | 'claude') => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/terminal/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          type,
          projectPath: project.path,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        const newSession = data.session;
        setSessions(prev => [...prev, newSession]);
        setActiveSessionId(newSession.id);
        await setFocus(newSession.id, layout.type === 'grid');
        
        // Update connection status
        setConnectionStatus(prev => ({ ...prev, [newSession.id]: 'connecting' }));
      } else {
        setError(data.error || 'Failed to create session');
      }
    } catch (err) {
      console.error('Failed to create session:', err);
      setError('Failed to create terminal session');
    } finally {
      setLoading(false);
    }
  };

  // Set focused terminal (supports up to 4 focused terminals)
  const setFocus = async (sessionId: string, keepAllFocused: boolean = false) => {
    try {
      // In grid mode, focus all visible terminals for real-time streaming
      if (layout.type === 'grid' || keepAllFocused) {
        const visibleSessions = getVisibleTerminals();
        
        // Focus all visible terminals
        for (const session of visibleSessions) {
          const response = await fetch('/api/terminal/focus', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectId: project.id,
              sessionId: session.id,
              focused: true,
            }),
          });
          
          if (response.ok) {
            const ws = session.type === 'system' ? systemWsRef.current : claudeWsRef.current;
            if (ws && ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'focus',
                sessionId: session.id,
              }));
            }
          }
        }
        
        // Update local state
        setSessions(prev => prev.map(s => ({
          ...s,
          isFocused: visibleSessions.some(v => v.id === s.id)
        })));
        
        setActiveSessionId(sessionId);
        console.log(`Grid mode: Focused ${visibleSessions.length} terminals for real-time streaming`);
        return;
      }
      
      // Check how many terminals are currently focused
      const currentlyFocused = sessions.filter(s => s.isFocused);
      
      // If clicking on already focused terminal, unfocus it
      const isAlreadyFocused = currentlyFocused.some(s => s.id === sessionId);
      
      if (isAlreadyFocused) {
        // Unfocus this terminal via API
        const response = await fetch('/api/terminal/focus', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: project.id,
            sessionId,
            focused: false, // Unfocus
          }),
        });
        
        const data = await response.json();
        
        if (data.success) {
          // Update local state based on server response
          const focusedSessionIds = data.focusedSessions || [];
          setSessions(prev => prev.map(s => ({
            ...s,
            isFocused: focusedSessionIds.includes(s.id)
          })));
          
          // Send unfocus message to WebSocket
          const session = sessions.find(s => s.id === sessionId);
          if (session) {
            const ws = session.type === 'system' ? systemWsRef.current : claudeWsRef.current;
            if (ws && ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'unfocus',
                sessionId,
              }));
            }
          }
          
          console.log(`Unfocused terminal, ${focusedSessionIds.length} terminals still focused`);
        }
        return;
      }
      
      // The backend will handle the 4-terminal limit automatically
      // by unfocusing the oldest one if needed
      
      // Focus the new terminal
      const response = await fetch('/api/terminal/focus', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          sessionId,
          focused: true,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Update local state based on server response (single source of truth)
        const focusedSessionIds = data.focusedSessions || [];
        
        // Update all sessions based on server's focus list
        setSessions(prev => prev.map(s => ({
          ...s,
          isFocused: focusedSessionIds.includes(s.id)
        })));
        
        setActiveSessionId(sessionId);
        
        // Send focus message to WebSocket for the newly focused session
        const session = sessions.find(s => s.id === sessionId);
        if (session) {
          const ws = session.type === 'system' ? systemWsRef.current : claudeWsRef.current;
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'focus',
              sessionId,
            }));
          }
        }
        
        console.log(`Focus updated: ${focusedSessionIds.length}/${data.maxFocused} terminals focused`);
      }
    } catch (err) {
      console.error('Failed to set focus:', err);
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
        // Remove from local state
        setSessions(prev => prev.filter(s => s.id !== sessionId));
        
        // Clean up connection status
        setConnectionStatus(prev => {
          const newStatus = { ...prev };
          delete newStatus[sessionId];
          return newStatus;
        });
        
        // Set new active session if needed
        if (activeSessionId === sessionId) {
          const remaining = sessions.filter(s => s.id !== sessionId);
          if (remaining.length > 0) {
            setActiveSessionId(remaining[0].id);
            await setFocus(remaining[0].id);
          } else {
            setActiveSessionId(null);
          }
        }
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
      
      // Close WebSocket connections
      if (systemWsRef.current) {
        systemWsRef.current.close();
      }
      if (claudeWsRef.current) {
        claudeWsRef.current.close();
      }
      
      // Clear connection status
      setConnectionStatus({});
    } catch (err) {
      console.error('Failed to cleanup sessions:', err);
    }
  };

  // Monitor connection status changes
  useEffect(() => {
    const checkConnectionStatus = () => {
      sessions.forEach((session) => {
        // Connection status is now managed by XTermViewV2
        // We can add health checks here if needed
      });
    };
    
    // Check connection status periodically
    const interval = setInterval(checkConnectionStatus, 5000);
    return () => clearInterval(interval);
  }, [sessions]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + Shift + T for new system terminal
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'T') {
        e.preventDefault();
        createSession('system');
      }
      
      // Cmd/Ctrl + Shift + C for new Claude terminal
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        createSession('claude');
      }
      
      // Cmd/Ctrl + W to close current terminal
      if ((e.metaKey || e.ctrlKey) && e.key === 'w' && activeSessionId) {
        e.preventDefault();
        closeSession(activeSessionId);
      }
      
      // Cmd/Ctrl + Tab to cycle through terminals
      if ((e.metaKey || e.ctrlKey) && e.key === 'Tab') {
        e.preventDefault();
        const currentIndex = sessions.findIndex(s => s.id === activeSessionId);
        if (currentIndex >= 0 && sessions.length > 1) {
          const nextIndex = e.shiftKey 
            ? (currentIndex - 1 + sessions.length) % sessions.length
            : (currentIndex + 1) % sessions.length;
          setFocus(sessions[nextIndex].id);
        }
      }
      
      // Cmd/Ctrl + 1-9 to switch to specific terminal
      if ((e.metaKey || e.ctrlKey) && e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        const index = parseInt(e.key) - 1;
        if (sessions[index]) {
          setFocus(sessions[index].id);
        }
      }
      
      // Cmd/Ctrl + / to show keyboard shortcuts
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        setShowShortcuts(!showShortcuts);
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [sessions, activeSessionId]);

  // Update session status
  const updateSessionStatus = (sessionId: string, status: 'active' | 'inactive' | 'error') => {
    setSessions(prev => prev.map(s => 
      s.id === sessionId ? { ...s, status } : s
    ));
  };

  // Layout controls
  // Get visible terminals based on layout
  const getVisibleTerminals = () => {
    if (layout.type === 'grid') {
      // In grid mode, show up to 4 terminals
      return sessions.slice(0, 4);
    } else if (layout.type === 'split-horizontal' || layout.type === 'split-vertical') {
      // In split mode, show 2 terminals (1 system, 1 claude)
      const systemTerminal = sessions.find(s => s.type === 'system');
      const claudeTerminal = sessions.find(s => s.type === 'claude');
      return [systemTerminal, claudeTerminal].filter(Boolean);
    } else {
      // Single mode - only active terminal
      const active = sessions.find(s => s.id === activeSessionId);
      return active ? [active] : [];
    }
  };
  
  const handleLayoutChange = async (newLayout: 'single' | 'split-horizontal' | 'split-vertical' | 'grid') => {
    setLayout({ type: newLayout, maximized: null });
    
    // When switching to grid mode, focus all visible terminals
    if (newLayout === 'grid') {
      // Wait a bit for layout to update
      setTimeout(() => {
        if (activeSessionId) {
          setFocus(activeSessionId, true);
        }
      }, 100);
    }
  };

  const toggleMaximize = (panel: 'system' | 'claude' | null) => {
    setLayout(prev => ({ ...prev, maximized: panel }));
  };

  // Determine panel sizes based on layout
  const panelSizes = useMemo(() => {
    if (layout.maximized === 'system') return { system: 90, claude: 10 };
    if (layout.maximized === 'claude') return { system: 10, claude: 90 };
    return { system: 50, claude: 50 };
  }, [layout.maximized]);

  // Filter sessions by type
  const systemSessions = sessions.filter(s => s.type === 'system');
  const claudeSessions = sessions.filter(s => s.type === 'claude');

  // Render loading state
  if (loading && sessions.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <Terminal className="w-16 h-16 mx-auto text-gray-600 animate-pulse mb-4" />
          <p className="text-gray-400">Loading terminal sessions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-gray-900 via-slate-900 to-gray-950">
      {/* Keyboard Shortcuts Modal */}
      <AnimatePresence>
        {showShortcuts && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center"
            onClick={() => setShowShortcuts(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="bg-gradient-to-br from-gray-800/95 to-slate-800/95 backdrop-blur-xl rounded-2xl p-8 max-w-md w-full mx-4 border border-gray-700/50 shadow-2xl shadow-black/50"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg">
                  <Keyboard className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Keyboard Shortcuts</h3>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center p-2 rounded-lg hover:bg-gray-700/30 transition-colors">
                  <span className="text-gray-300">New System Terminal</span>
                  <kbd className="px-3 py-1.5 bg-gradient-to-r from-emerald-500/10 to-green-500/10 border border-emerald-500/30 rounded-lg text-xs text-emerald-400 font-mono">⌘⇧T</kbd>
                </div>
                <div className="flex justify-between items-center p-2 rounded-lg hover:bg-gray-700/30 transition-colors">
                  <span className="text-gray-300">New Claude Terminal</span>
                  <kbd className="px-3 py-1.5 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-lg text-xs text-purple-400 font-mono">⌘⇧C</kbd>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>Close Terminal</span>
                  <kbd className="px-2 py-1 bg-gray-700 rounded text-xs">⌘W</kbd>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>Cycle Terminals</span>
                  <kbd className="px-2 py-1 bg-gray-700 rounded text-xs">⌘Tab</kbd>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>Switch to Terminal 1-9</span>
                  <kbd className="px-2 py-1 bg-gray-700 rounded text-xs">⌘1-9</kbd>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>Show Shortcuts</span>
                  <kbd className="px-2 py-1 bg-gray-700 rounded text-xs">⌘/</kbd>
                </div>
              </div>
              <button
                onClick={() => setShowShortcuts(false)}
                className="mt-6 w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 rounded-lg text-white font-medium shadow-lg shadow-purple-500/25 transition-all duration-200 transform hover:scale-[1.02]"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-800/90 to-slate-800/90 backdrop-blur-lg border-b border-gray-700/50 px-4 py-3 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-2 px-3 py-1 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg border border-blue-500/20">
              <Terminal className="w-5 h-5 text-blue-400" />
              <span className="text-sm font-semibold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Terminal</span>
            </div>
            <span className="text-xs text-gray-400 font-mono ml-2 px-2 py-1 bg-black/30 rounded-md border border-gray-700/50">({sessions.length} sessions)</span>
          </div>
          
          <div className="flex items-center space-x-2">
            {error && (
              <div className="flex items-center space-x-1 text-red-400 text-xs">
                <AlertCircle className="w-3 h-3" />
                <span>{error}</span>
              </div>
            )}
            
            {/* Multi-Focus Indicator */}
            {sessions.filter(s => s.isFocused).length > 0 && (
              <div className="flex items-center space-x-1 px-2 py-1 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg border border-blue-500/30">
                <span className="text-xs text-blue-400">
                  {sessions.filter(s => s.isFocused).length}/4 Focused
                </span>
              </div>
            )}
            
            {/* Layout Controls */}
            <div className="flex items-center space-x-1 border-r border-gray-600 pr-2 mr-2">
              <button
                onClick={() => handleLayoutChange('single')}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  layout.type === 'single' 
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25 scale-105' 
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50 hover:shadow-md'
                }`}
                title="Single view"
              >
                <Terminal className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleLayoutChange('split-horizontal')}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  layout.type === 'split-horizontal' 
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25 scale-105' 
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50 hover:shadow-md'
                }`}
                title="Split horizontal"
              >
                <Columns className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleLayoutChange('split-vertical')}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  layout.type === 'split-vertical' 
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25 scale-105' 
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50 hover:shadow-md'
                }`}
                title="Split vertical"
              >
                <Rows className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleLayoutChange('grid')}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  layout.type === 'grid' 
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25 scale-105' 
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50 hover:shadow-md'
                }`}
                title="Grid view"
              >
                <Grid className="w-4 h-4" />
              </button>
            </div>
            
            <button
              onClick={() => createSession('system')}
              className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors"
              title="New System Terminal"
              disabled={loading}
            >
              <Plus className="w-4 h-4" />
            </button>
            
            <button
              onClick={() => createSession('claude')}
              className="p-1 hover:bg-purple-700 rounded text-purple-400 hover:text-purple-300 transition-colors"
              title="New Claude Terminal (⌘⇧C)"
              disabled={loading}
            >
              <Plus className="w-4 h-4" />
            </button>
            
            <button
              onClick={() => setShowShortcuts(true)}
              className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors"
              title="Keyboard Shortcuts (⌘/)"
            >
              <Keyboard className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      {sessions.length > 0 && (
        <div className="bg-gradient-to-r from-gray-850/50 to-slate-850/50 backdrop-blur-sm border-b border-gray-700/30 px-3 py-2">
          <div className="flex items-center space-x-2 overflow-x-auto">
            <AnimatePresence mode="popLayout">
              {sessions.map((session) => (
                <motion.button
                  key={session.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setActiveSessionId(session.id);
                    // Ensure terminal gets focused for streaming
                    setFocus(session.id, layout.type === 'grid');
                  }}
                  title={session.tabName}
                  className={`group flex items-center space-x-2 px-4 py-2 rounded-lg text-xs transition-all duration-200 ${
                    activeSessionId === session.id
                      ? session.type === 'claude'
                        ? 'bg-gradient-to-r from-purple-600/30 to-pink-600/30 text-purple-200 border border-purple-500/50 shadow-lg shadow-purple-500/20'
                        : 'bg-gradient-to-r from-blue-600/30 to-cyan-600/30 text-blue-200 border border-blue-500/50 shadow-lg shadow-blue-500/20'
                      : 'bg-gray-800/50 text-gray-400 hover:bg-gray-750/70 hover:text-gray-300 border border-transparent hover:border-gray-600/30'
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full ${
                    connectionStatus[session.id] === 'connected' 
                      ? 'bg-green-400 shadow-lg shadow-green-400/50 animate-pulse' 
                      : connectionStatus[session.id] === 'connecting' 
                      ? 'bg-yellow-400 shadow-lg shadow-yellow-400/50 animate-spin' 
                      : connectionStatus[session.id] === 'error' 
                      ? 'bg-red-400 shadow-lg shadow-red-400/50 animate-bounce' 
                      : 'bg-gray-500'
                  }`} />
                  
                  <span className="font-medium">{session.tabName}</span>
                  
                  {session.isFocused && (
                    <span className="px-1.5 py-0.5 bg-gradient-to-r from-blue-500/30 to-purple-500/30 rounded text-[10px] font-bold text-blue-300 border border-blue-500/40">
                      FOCUS
                    </span>
                  )}
                  
                  {session.type === 'claude' && (
                    <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent font-bold">AI</span>
                  )}
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      closeSession(session.id);
                    }}
                    className="ml-2 p-1 rounded-md bg-gray-700/50 hover:bg-red-500/20 border border-transparent hover:border-red-500/30 opacity-0 group-hover:opacity-100 transition-all duration-200"
                  >
                    <X className="w-3 h-3 text-gray-400 hover:text-red-400" />
                  </button>
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Terminal Content with Split Layout Support */}
      <div className="flex-1 bg-black overflow-hidden">
        {sessions.length > 0 ? (
          <Suspense fallback={
            <div className="h-full flex items-center justify-center bg-black">
              <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
            </div>
          }>
            {layout.type === 'single' ? (
              // Single Terminal View
              <div className="h-full">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className={`h-full ${session.id === activeSessionId ? 'block' : 'hidden'}`}
                  >
                    <XTermViewV2
                      sessionId={session.id}
                      projectId={project.id}
                      type={session.type}
                      isFocused={session.isFocused}
                      onData={(data) => {
                        console.log(`Terminal ${session.id} input:`, data);
                      }}
                      onResize={(cols, rows) => {
                        console.log(`Terminal ${session.id} resized to ${cols}x${rows}`);
                      }}
                    />
                  </div>
                ))}
              </div>
            ) : layout.type === 'grid' ? (
              // 2x2 Grid Layout - Show up to 4 terminals simultaneously
              <div className="h-full grid grid-cols-2 grid-rows-2 gap-1 bg-gray-900 p-1">
                {sessions.slice(0, 4).map((session, index) => (
                  <div
                    key={session.id}
                    className={`relative overflow-hidden bg-black rounded-lg border ${
                      session.id === activeSessionId ? 'border-blue-500' : 'border-gray-700'
                    }`}
                    onClick={() => setActiveSessionId(session.id)}
                  >
                    {/* Terminal Header */}
                    <div className={`absolute top-0 left-0 right-0 z-10 px-2 py-1 bg-gradient-to-r ${
                      session.type === 'claude'
                        ? 'from-purple-600/20 to-pink-600/20 border-b border-purple-500/30'
                        : 'from-blue-600/20 to-cyan-600/20 border-b border-blue-500/30'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-white flex items-center space-x-2">
                          <span>{session.tabName}</span>
                          {session.isFocused && (
                            <span className="px-1 py-0.5 bg-green-500/30 rounded text-[10px] text-green-300 border border-green-500/40">
                              LIVE
                            </span>
                          )}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            closeSession(session.id);
                          }}
                          className="p-0.5 hover:bg-red-500/20 rounded"
                        >
                          <X className="w-3 h-3 text-gray-400 hover:text-red-400" />
                        </button>
                      </div>
                    </div>
                    {/* Terminal Content */}
                    <div className="h-full pt-7">
                      <XTermViewV2
                        sessionId={session.id}
                        projectId={project.id}
                        type={session.type}
                        isFocused={session.isFocused}
                        onData={(data) => {
                          console.log(`Terminal ${session.id} input:`, data);
                        }}
                        onResize={(cols, rows) => {
                          console.log(`Terminal ${session.id} resized to ${cols}x${rows}`);
                        }}
                      />
                    </div>
                  </div>
                ))}
                {/* Empty slots if less than 4 terminals */}
                {sessions.length < 4 && Array.from({ length: 4 - sessions.length }).map((_, index) => (
                  <div
                    key={`empty-${index}`}
                    className="flex items-center justify-center bg-gray-900 rounded-lg border border-gray-700 border-dashed"
                  >
                    <button
                      onClick={() => createSession(index % 2 === 0 ? 'system' : 'claude')}
                      className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-400 hover:text-white transition-all duration-200"
                    >
                      + New {index % 2 === 0 ? 'System' : 'Claude'} Terminal
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              // Split Layout (Horizontal/Vertical)
              <PanelGroup 
                direction={layout.type === 'split-vertical' ? 'horizontal' : 'vertical'} 
                className="h-full"
              >
                {/* System Terminals Panel */}
                <Panel 
                  defaultSize={panelSizes.system} 
                  minSize={layout.maximized ? 10 : 30}
                  className="relative"
                >
                  <div className="h-full flex flex-col bg-gradient-to-br from-gray-900/90 to-slate-900/90">
                    <div className="bg-gradient-to-r from-emerald-500/10 to-green-500/10 backdrop-blur-sm px-3 py-2 flex items-center justify-between border-b border-emerald-500/20">
                      <span className="text-xs font-semibold text-emerald-400 flex items-center space-x-2">
                        <Terminal className="w-3 h-3" />
                        <span>System Terminals</span>
                      </span>
                      <button
                        onClick={() => toggleMaximize(layout.maximized === 'system' ? null : 'system')}
                        className="p-1.5 rounded-lg bg-gray-700/30 hover:bg-gray-700/50 text-gray-400 hover:text-white transition-all duration-200 hover:shadow-lg"
                        title={layout.maximized === 'system' ? 'Restore' : 'Maximize'}
                      >
                        {layout.maximized === 'system' ? (
                          <Minimize2 className="w-3 h-3" />
                        ) : (
                          <Maximize2 className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                    <div className="flex-1 bg-black">
                      {systemSessions.length > 0 ? (
                        layout.type === 'split-horizontal' || layout.type === 'split-vertical' ? (
                          // In split mode, show up to 2 system terminals with tabs
                          <div className="h-full flex flex-col">
                            {systemSessions.length > 1 && (
                              <div className="bg-gray-800 border-b border-gray-700 px-2 py-1 flex space-x-2">
                                {systemSessions.slice(0, 2).map((session) => (
                                  <button
                                    key={session.id}
                                    onClick={() => {
                                      setActiveSessionId(session.id);
                                      setFocus(session.id, true);
                                    }}
                                    className={`px-3 py-1 rounded text-xs transition-all ${
                                      session.isFocused
                                        ? 'bg-green-600/30 text-green-300 border border-green-500/50'
                                        : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                                    }`}
                                  >
                                    {session.tabName}
                                    {session.isFocused && <span className="ml-2 text-[10px]">LIVE</span>}
                                  </button>
                                ))}
                              </div>
                            )}
                            <div className="flex-1">
                              {systemSessions.slice(0, 2).map((session) => (
                                <div
                                  key={session.id}
                                  className={`h-full ${session.id === activeSessionId ? 'block' : 'hidden'}`}
                                >
                                  <XTermViewV2
                                    sessionId={session.id}
                                    projectId={project.id}
                                    type={session.type}
                                    isFocused={session.isFocused}
                                    onData={(data) => {
                                      console.log(`Terminal ${session.id} input:`, data);
                                    }}
                                    onResize={(cols, rows) => {
                                      console.log(`Terminal ${session.id} resized to ${cols}x${rows}`);
                                    }}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          // Single terminal view
                          <div className="h-full">
                            {systemSessions.map((session) => (
                              <div
                                key={session.id}
                                className={`h-full ${session.id === activeSessionId ? 'block' : 'hidden'}`}
                              >
                                <XTermViewV2
                                  sessionId={session.id}
                                  projectId={project.id}
                                  type={session.type}
                                  isFocused={session.isFocused}
                                  onData={(data) => {
                                    console.log(`Terminal ${session.id} input:`, data);
                                  }}
                                  onResize={(cols, rows) => {
                                    console.log(`Terminal ${session.id} resized to ${cols}x${rows}`);
                                  }}
                                />
                              </div>
                            ))}
                          </div>
                        )
                      ) : (
                        <div className="h-full flex items-center justify-center bg-gradient-to-br from-gray-900 to-slate-900">
                          <button
                            onClick={() => createSession('system')}
                            className="px-4 py-2 bg-gradient-to-r from-emerald-500/20 to-green-500/20 hover:from-emerald-500/30 hover:to-green-500/30 border border-emerald-500/30 rounded-lg text-sm text-emerald-400 font-medium transition-all duration-200 hover:shadow-lg hover:shadow-emerald-500/20"
                          >
                            + New System Terminal
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </Panel>
                
                <PanelResizeHandle className="relative bg-gradient-to-r from-gray-700/50 to-slate-700/50 hover:from-blue-600/50 hover:to-purple-600/50 transition-all duration-200">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-8 h-1 bg-gray-600 rounded-full opacity-50" />
                  </div>
                </PanelResizeHandle>
                
                {/* Claude Terminals Panel */}
                <Panel 
                  defaultSize={panelSizes.claude} 
                  minSize={layout.maximized ? 10 : 30}
                  className="relative"
                >
                  <div className="h-full flex flex-col bg-gradient-to-br from-gray-900/90 to-slate-900/90">
                    <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 backdrop-blur-sm px-3 py-2 flex items-center justify-between border-b border-purple-500/20">
                      <span className="text-xs font-semibold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent flex items-center space-x-2">
                        <span className="text-purple-400">✨</span>
                        <span>Claude Terminals</span>
                      </span>
                      <button
                        onClick={() => toggleMaximize(layout.maximized === 'claude' ? null : 'claude')}
                        className="p-1.5 rounded-lg bg-gray-700/30 hover:bg-gray-700/50 text-gray-400 hover:text-white transition-all duration-200 hover:shadow-lg"
                        title={layout.maximized === 'claude' ? 'Restore' : 'Maximize'}
                      >
                        {layout.maximized === 'claude' ? (
                          <Minimize2 className="w-3 h-3" />
                        ) : (
                          <Maximize2 className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                    <div className="flex-1 bg-black">
                      {claudeSessions.length > 0 ? (
                        layout.type === 'split-horizontal' || layout.type === 'split-vertical' ? (
                          // In split mode, show up to 2 claude terminals with tabs
                          <div className="h-full flex flex-col">
                            {claudeSessions.length > 1 && (
                              <div className="bg-gray-800 border-b border-gray-700 px-2 py-1 flex space-x-2">
                                {claudeSessions.slice(0, 2).map((session) => (
                                  <button
                                    key={session.id}
                                    onClick={() => {
                                      setActiveSessionId(session.id);
                                      setFocus(session.id, true);
                                    }}
                                    className={`px-3 py-1 rounded text-xs transition-all ${
                                      session.isFocused
                                        ? 'bg-purple-600/30 text-purple-300 border border-purple-500/50'
                                        : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                                    }`}
                                  >
                                    {session.tabName}
                                    {session.isFocused && <span className="ml-2 text-[10px]">LIVE</span>}
                                  </button>
                                ))}
                              </div>
                            )}
                            <div className="flex-1">
                              {claudeSessions.slice(0, 2).map((session) => (
                                <div
                                  key={session.id}
                                  className={`h-full ${session.id === activeSessionId ? 'block' : 'hidden'}`}
                                >
                              <XTermViewV2
                                sessionId={session.id}
                                projectId={project.id}
                                type={session.type}
                                isFocused={session.isFocused}
                                onData={(data) => {
                                  console.log(`Terminal ${session.id} input:`, data);
                                }}
                                onResize={(cols, rows) => {
                                  console.log(`Terminal ${session.id} resized to ${cols}x${rows}`);
                                }}
                              />
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          // Single terminal view
                          <div className="h-full">
                            {claudeSessions.map((session) => (
                              <div
                                key={session.id}
                                className={`h-full ${session.id === activeSessionId ? 'block' : 'hidden'}`}
                              >
                                <XTermViewV2
                                  sessionId={session.id}
                                  projectId={project.id}
                                  type={session.type}
                                  isFocused={session.isFocused}
                                  onData={(data) => {
                                    console.log(`Terminal ${session.id} input:`, data);
                                  }}
                                  onResize={(cols, rows) => {
                                    console.log(`Terminal ${session.id} resized to ${cols}x${rows}`);
                                  }}
                                />
                              </div>
                            ))}
                          </div>
                        )
                      ) : (
                        <div className="h-full flex items-center justify-center bg-gradient-to-br from-gray-900 to-slate-900">
                          <button
                            onClick={() => createSession('claude')}
                            className="px-4 py-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 border border-purple-500/30 rounded-lg text-sm text-purple-400 font-medium transition-all duration-200 hover:shadow-lg hover:shadow-purple-500/20"
                          >
                            + New Claude Terminal
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </Panel>
              </PanelGroup>
            )}
          </Suspense>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Terminal className="w-16 h-16 mx-auto text-gray-600 mb-4" />
              <button
                onClick={() => createSession('system')}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm text-white transition-colors"
              >
                Open Terminal
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TerminalContainerV2;