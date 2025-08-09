'use client';

import React, { useState } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { motion } from 'framer-motion';
import { Project, TerminalSession } from '../../types';
import TerminalTabs from './TerminalTabs';
import TerminalView from './TerminalView';
import XTermView from './XTermView';
import ClaudeXTermView from './ClaudeXTermView';

interface TerminalContainerProps {
  project: Project;
}

const TerminalContainer: React.FC<TerminalContainerProps> = ({ project }) => {
  // Use stable session IDs based on project ID to maintain persistence
  const systemSessionId = `system_${project.id}`;
  const claudeSessionId = `claude_${project.id}`;
  
  const [systemSessions, setSystemSessions] = useState<TerminalSession[]>([]);
  const [claudeSessions, setClaudeSessions] = useState<TerminalSession[]>([]);
  const [activeSystemTab, setActiveSystemTab] = useState<string | null>(null);
  const [activeClaudeTab, setActiveClaudeTab] = useState<string | null>(null);

  const handleCreateSystemSession = async (name: string) => {
    // Create new system terminal session with stable ID
    const sessionNum = systemSessions.length + 1;
    const newSession: TerminalSession = {
      id: `${systemSessionId}_tab${sessionNum}`,
      projectId: project.id,
      type: 'system',
      tabName: name,
      active: true,
      output: [],
      currentPath: project.path,
      createdAt: new Date(),
    };
    
    setSystemSessions([...systemSessions, newSession]);
    setActiveSystemTab(newSession.id);
  };

  const handleCreateClaudeSession = async (name: string) => {
    // Create new Claude terminal session with stable ID
    const sessionNum = claudeSessions.length + 1;
    const newSession: TerminalSession = {
      id: `${claudeSessionId}_tab${sessionNum}`,
      projectId: project.id,
      type: 'claude',
      tabName: name,
      active: true,
      output: [],
      currentPath: project.path,
      createdAt: new Date(),
    };
    
    setClaudeSessions([...claudeSessions, newSession]);
    setActiveClaudeTab(newSession.id);
  };

  const handleCloseSystemSession = (sessionId: string) => {
    setSystemSessions(systemSessions.filter(s => s.id !== sessionId));
    if (activeSystemTab === sessionId) {
      setActiveSystemTab(systemSessions[0]?.id || null);
    }
  };

  const handleCloseClaudeSession = (sessionId: string) => {
    setClaudeSessions(claudeSessions.filter(s => s.id !== sessionId));
    if (activeClaudeTab === sessionId) {
      setActiveClaudeTab(claudeSessions[0]?.id || null);
    }
  };

  return (
    <PanelGroup direction="vertical" className="h-full">
      {/* System Terminal */}
      <Panel defaultSize={50} minSize={15} maxSize={70} className="bg-gradient-to-b from-gray-900 to-gray-950 overflow-hidden">
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
                  sessions={systemSessions}
                  activeTab={activeSystemTab}
                  onTabSelect={setActiveSystemTab}
                  onTabClose={handleCloseSystemSession}
                  onNewTab={() => {
                    const name = `Terminal ${systemSessions.length + 1}`;
                    handleCreateSystemSession(name);
                  }}
                />
              </div>
              <div className="flex items-center space-x-2">
                <button className="p-1 hover:bg-gray-700 rounded transition-colors" title="Clear">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
                <button className="p-1 hover:bg-gray-700 rounded transition-colors" title="Settings">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-hidden min-h-0 relative">
            {activeSystemTab && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="h-full"
              >
                <XTermView
                  sessionId={activeSystemTab}
                  projectPath={project.path}
                  projectId={project.id}
                  type="system"
                />
              </motion.div>
            )}
            {!activeSystemTab && systemSessions.length === 0 && (
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
                    onClick={() => handleCreateSystemSession('Terminal 1')}
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
      <Panel defaultSize={50} minSize={15} maxSize={70} className="bg-gradient-to-b from-purple-950 to-purple-900 overflow-hidden">
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
                  sessions={claudeSessions}
                  activeTab={activeClaudeTab}
                  onTabSelect={setActiveClaudeTab}
                  onTabClose={handleCloseClaudeSession}
                  onNewTab={() => {
                    const name = `Claude ${claudeSessions.length + 1}`;
                    handleCreateClaudeSession(name);
                  }}
                />
              </div>
              <div className="flex items-center space-x-2">
                <button className="p-1 hover:bg-purple-700 rounded transition-colors" title="Clear">
                  <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
                <button className="p-1 hover:bg-purple-700 rounded transition-colors" title="Settings">
                  <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-hidden min-h-0 relative">
            {activeClaudeTab && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="h-full"
              >
                <ClaudeXTermView
                  sessionId={activeClaudeTab}
                  projectPath={project.path}
                  projectId={project.id}
                  type="claude"
                />
              </motion.div>
            )}
            {!activeClaudeTab && claudeSessions.length === 0 && (
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
                    onClick={() => handleCreateClaudeSession('Claude 1')}
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
  );
};

export default TerminalContainer;