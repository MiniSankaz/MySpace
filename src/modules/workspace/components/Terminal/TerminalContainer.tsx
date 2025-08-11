'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { motion, AnimatePresence } from 'framer-motion';
import { Project, TerminalSession } from '../../types';
import TerminalTabs from './TerminalTabs';
import TerminalView from './TerminalView';
import XTermView from './XTermView';
import ClaudeXTermView from './ClaudeXTermView';
import { useTerminalStore } from '../../stores/terminal.store';
import { authClient } from '@/core/auth/auth-client';
import { Maximize2, Minimize2, Columns, Rows, Grid, Terminal } from 'lucide-react';

interface TerminalContainerProps {
  project: Project;
}

const TerminalContainer: React.FC<TerminalContainerProps> = ({ project }) => {
  // Use terminal store for state management
  const {
    projectSessions,
    activeTabs,
    layout,
    preferences,
    connectionStatus,
    sessionMetadata,
    addSession,
    removeSession,
    setActiveTab,
    setLayout,
    toggleMaximize,
    loadProjectSessions,
    setConnectionStatus,
  } = useTerminalStore();

  // Get sessions for current project
  const sessions = projectSessions[project.id] || { system: [], claude: [] };
  const activeTab = activeTabs[project.id] || { system: null, claude: null };
  
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [renameSessionId, setRenameSessionId] = useState<string | null>(null);
  const [newSessionName, setNewSessionName] = useState('');
  const [backgroundActivity, setBackgroundActivity] = useState<Record<string, boolean>>({});

  // Load existing sessions on mount
  useEffect(() => {
    const loadSessions = async () => {
      try {
        setIsLoadingSessions(true);
        const response = await authClient.fetch(`/api/workspace/projects/${project.id}/terminals`);
        if (response.ok) {
          const existingSessions = await response.json();
          loadProjectSessions(project.id, existingSessions);
        }
      } catch (error) {
        console.error('Failed to load terminal sessions:', error);
      } finally {
        setIsLoadingSessions(false);
      }
    };

    loadSessions();
  }, [project.id, loadProjectSessions]);

  // Track background activity for inactive terminals
  useEffect(() => {
    const checkBackgroundActivity = () => {
      const allSessions = [...sessions.system, ...sessions.claude];
      const activityMap: Record<string, boolean> = {};
      
      allSessions.forEach(session => {
        // Session has background activity if it's active but not the current active tab
        const isSystemActive = session.type === 'system' && activeTab.system === session.id;
        const isClaudeActive = session.type === 'claude' && activeTab.claude === session.id;
        const isCurrentlyActive = isSystemActive || isClaudeActive;
        
        activityMap[session.id] = session.active && !isCurrentlyActive;
      });
      
      setBackgroundActivity(activityMap);
    };

    checkBackgroundActivity();
    
    // Check every 500ms for more responsive background activity detection
    const interval = setInterval(checkBackgroundActivity, 500);
    return () => clearInterval(interval);
  }, [sessions, activeTab]);

  const handleCreateSystemSession = async (name?: string) => {
    try {
      const sessionName = name || `Terminal ${sessions.system.length + 1}`;
      const response = await authClient.fetch(`/api/workspace/projects/${project.id}/terminals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'system',
          tabName: sessionName,
          projectPath: project.path,
        }),
      });

      if (response.ok) {
        const newSession = await response.json();
        addSession(project.id, newSession);
        setActiveTab(project.id, 'system', newSession.id);
      }
    } catch (error) {
      console.error('Failed to create system session:', error);
    }
  };

  const handleCreateClaudeSession = async (name?: string) => {
    try {
      const sessionName = name || `Claude ${sessions.claude.length + 1}`;
      const response = await authClient.fetch(`/api/workspace/projects/${project.id}/terminals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'claude',
          tabName: sessionName,
          projectPath: project.path,
        }),
      });

      if (response.ok) {
        const newSession = await response.json();
        addSession(project.id, newSession);
        setActiveTab(project.id, 'claude', newSession.id);
      }
    } catch (error) {
      console.error('Failed to create Claude session:', error);
    }
  };

  const handleCloseSession = async (sessionId: string, type: 'system' | 'claude') => {
    try {
      // Call API to close session
      await authClient.fetch(`/api/workspace/terminals/${sessionId}`, {
        method: 'DELETE',
      });
      
      // Remove from store
      removeSession(project.id, sessionId);
    } catch (error) {
      console.error('Failed to close session:', error);
    }
  };

  const handleRenameSession = async (sessionId: string) => {
    if (!newSessionName.trim()) return;
    
    try {
      const response = await authClient.fetch(`/api/workspace/terminals/${sessionId}/rename`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newSessionName }),
      });

      if (response.ok) {
        const updatedSession = await response.json();
        addSession(project.id, updatedSession);
        setRenameSessionId(null);
        setNewSessionName('');
      }
    } catch (error) {
      console.error('Failed to rename session:', error);
    }
  };

  // Layout controls
  const handleLayoutChange = (newLayout: 'single' | 'split-horizontal' | 'split-vertical' | 'grid') => {
    setLayout({ type: newLayout, maximized: null });
  };

  // Determine panel sizes based on layout
  const getPanelSizes = useMemo(() => {
    if (layout.maximized === 'system') return { system: 90, claude: 10 };
    if (layout.maximized === 'claude') return { system: 10, claude: 90 };
    return { system: 50, claude: 50 };
  }, [layout.maximized]);

  // Show loading state
  if (isLoadingSessions) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-b from-gray-900 to-gray-950">
        <div className="text-center">
          <Terminal className="w-16 h-16 mx-auto text-gray-600 animate-pulse mb-4" />
          <p className="text-gray-400">Loading terminal sessions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-gray-900 to-gray-950">
      {/* Layout Controls Bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleLayoutChange('single')}
            className={`p-1.5 rounded transition-colors ${
              layout.type === 'single' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
            title="Single view"
          >
            <Terminal className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleLayoutChange('split-horizontal')}
            className={`p-1.5 rounded transition-colors ${
              layout.type === 'split-horizontal' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
            title="Split horizontal"
          >
            <Columns className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleLayoutChange('split-vertical')}
            className={`p-1.5 rounded transition-colors ${
              layout.type === 'split-vertical' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
            title="Split vertical"
          >
            <Rows className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleLayoutChange('grid')}
            className={`p-1.5 rounded transition-colors ${
              layout.type === 'grid' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
            title="Grid view"
          >
            <Grid className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center space-x-2 text-xs text-gray-400">
          <span>Project: {project.name}</span>
          <span>•</span>
          <span>{sessions.system.length + sessions.claude.length} sessions</span>
        </div>
      </div>

      {/* Terminal Panels */}
      <PanelGroup direction={layout.type === 'split-vertical' ? 'horizontal' : 'vertical'} className="flex-1">
        {/* System Terminal */}
        <Panel defaultSize={getPanelSizes.system} minSize={15} maxSize={85} className="bg-gradient-to-b from-gray-900 to-gray-950 overflow-hidden">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="h-full flex flex-col overflow-hidden"
        >
          <div className="bg-gradient-to-r from-gray-800 to-gray-850 border-b border-gray-700 px-3 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-semibold text-gray-300">System Terminal</span>
                </div>
                <TerminalTabs
                  sessions={sessions.system}
                  activeTab={activeTab.system}
                  onTabSelect={(id) => setActiveTab(project.id, 'system', id)}
                  onTabClose={(id) => handleCloseSession(id, 'system')}
                  onNewTab={() => handleCreateSystemSession()}
                  onRenameTab={(id) => {
                    const session = sessions.system.find(s => s.id === id);
                    if (session) {
                      setRenameSessionId(id);
                      setNewSessionName(session.tabName);
                    }
                  }}
                  connectionStatus={connectionStatus}
                  backgroundActivity={backgroundActivity}
                  hasNewOutput={Object.fromEntries(
                    sessions.system.map(s => [s.id, sessionMetadata[s.id]?.hasNewOutput || false])
                  )}
                />
              </div>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => toggleMaximize(layout.maximized === 'system' ? null : 'system')}
                  className="p-1 hover:bg-gray-700 rounded transition-colors" 
                  title={layout.maximized === 'system' ? 'Restore' : 'Maximize'}
                >
                  {layout.maximized === 'system' ? (
                    <Minimize2 className="w-4 h-4 text-gray-400" />
                  ) : (
                    <Maximize2 className="w-4 h-4 text-gray-400" />
                  )}
                </button>
                <div className={`w-2 h-2 rounded-full ${
                  connectionStatus[activeTab.system || ''] === 'connected' ? 'bg-green-500' : 
                  connectionStatus[activeTab.system || ''] === 'reconnecting' ? 'bg-yellow-500 animate-pulse' : 
                  'bg-red-500'
                }`} title={connectionStatus[activeTab.system || ''] || 'disconnected'} />
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-hidden min-h-0 relative">
            <AnimatePresence mode="wait">
              {activeTab.system && (
                <motion.div
                  key={activeTab.system}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="h-full"
                >
                  <XTermView
                    sessionId={activeTab.system}
                    projectPath={project.path}
                    projectId={project.id}
                    type="system"
                    onConnectionChange={(status) => setConnectionStatus(activeTab.system!, status)}
                  />
                </motion.div>
              )}
            </AnimatePresence>
            {!activeTab.system && sessions.system.length === 0 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full flex items-center justify-center"
              >
                <div className="text-center">
                  <div className="mb-4">
                    <svg className="w-16 h-16 mx-auto text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <button
                    onClick={() => handleCreateSystemSession()}
                    className="px-6 py-2.5 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 rounded-lg text-sm font-medium transition-all transform hover:scale-105 shadow-lg"
                  >
                    Open Terminal
                  </button>
                  <p className="mt-3 text-xs text-gray-500">Press ⌘T for new tab</p>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </Panel>

      {/* Resize Handle */}
      <PanelResizeHandle className="h-1.5 bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700 hover:from-blue-600 hover:via-blue-500 hover:to-blue-600 transition-all cursor-row-resize group">
        <div className="h-full w-full relative flex items-center justify-center">
          <div className="w-12 h-0.5 bg-gray-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
        </div>
      </PanelResizeHandle>

      {/* Claude Terminal */}
      <Panel defaultSize={getPanelSizes.claude} minSize={15} maxSize={85} className="bg-gradient-to-b from-purple-950 to-purple-900 overflow-hidden">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="h-full flex flex-col overflow-hidden"
        >
          <div className="bg-gradient-to-r from-purple-800 to-purple-850 border-b border-purple-700 px-3 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                  <span className="text-sm font-semibold text-purple-200">Claude Terminal</span>
                  <span className="px-2 py-0.5 bg-purple-700/50 text-purple-300 text-xs rounded-full">AI-Powered</span>
                </div>
                <TerminalTabs
                  sessions={sessions.claude}
                  activeTab={activeTab.claude}
                  onTabSelect={(id) => setActiveTab(project.id, 'claude', id)}
                  onTabClose={(id) => handleCloseSession(id, 'claude')}
                  onNewTab={() => handleCreateClaudeSession()}
                  onRenameTab={(id) => {
                    const session = sessions.claude.find(s => s.id === id);
                    if (session) {
                      setRenameSessionId(id);
                      setNewSessionName(session.tabName);
                    }
                  }}
                  connectionStatus={connectionStatus}
                  backgroundActivity={backgroundActivity}
                />
              </div>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => toggleMaximize(layout.maximized === 'claude' ? null : 'claude')}
                  className="p-1 hover:bg-purple-700 rounded transition-colors" 
                  title={layout.maximized === 'claude' ? 'Restore' : 'Maximize'}
                >
                  {layout.maximized === 'claude' ? (
                    <Minimize2 className="w-4 h-4 text-purple-400" />
                  ) : (
                    <Maximize2 className="w-4 h-4 text-purple-400" />
                  )}
                </button>
                <div className={`w-2 h-2 rounded-full ${
                  connectionStatus[activeTab.claude || ''] === 'connected' ? 'bg-green-500' : 
                  connectionStatus[activeTab.claude || ''] === 'reconnecting' ? 'bg-yellow-500 animate-pulse' : 
                  'bg-red-500'
                }`} title={connectionStatus[activeTab.claude || ''] || 'disconnected'} />
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-hidden min-h-0 relative">
            <AnimatePresence mode="wait">
              {activeTab.claude && (
                <motion.div
                  key={activeTab.claude}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="h-full"
                >
                  <ClaudeXTermView
                    sessionId={activeTab.claude}
                    projectPath={project.path}
                    projectId={project.id}
                    type="claude"
                    onConnectionChange={(status) => setConnectionStatus(activeTab.claude!, status)}
                  />
                </motion.div>
              )}
            </AnimatePresence>
            {!activeTab.claude && sessions.claude.length === 0 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full flex items-center justify-center"
              >
                <div className="text-center">
                  <div className="mb-4">
                    <svg className="w-16 h-16 mx-auto text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <button
                    onClick={() => handleCreateClaudeSession()}
                    className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 rounded-lg text-sm font-medium transition-all transform hover:scale-105 shadow-lg text-white"
                  >
                    Open Claude Terminal
                  </button>
                  <p className="mt-3 text-xs text-purple-300">Press ⌘⇧T for Claude terminal</p>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </Panel>
      </PanelGroup>

      {/* Rename Session Dialog */}
      {renameSessionId && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => {
            setRenameSessionId(null);
            setNewSessionName('');
          }}
        >
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            className="bg-gray-800 rounded-lg p-6 w-96"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-white mb-4">Rename Terminal Session</h3>
            <input
              type="text"
              value={newSessionName}
              onChange={(e) => setNewSessionName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleRenameSession(renameSessionId);
                } else if (e.key === 'Escape') {
                  setRenameSessionId(null);
                  setNewSessionName('');
                }
              }}
              className="w-full px-3 py-2 bg-gray-900 text-white rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
              autoFocus
            />
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => {
                  setRenameSessionId(null);
                  setNewSessionName('');
                }}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRenameSession(renameSessionId)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
              >
                Rename
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default TerminalContainer;