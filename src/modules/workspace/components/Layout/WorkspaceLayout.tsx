'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import ProjectSelector from '../Sidebar/ProjectSelector';
import ConfigPanel from '../Sidebar/ConfigPanel';
import FileExplorer from '../Sidebar/FileExplorer';
// Import TerminalContainer or TerminalContainerV2 based on feature flag
const USE_TERMINAL_V2 = process.env.NEXT_PUBLIC_USE_TERMINAL_V2 === 'true' || true; // Enable V2 by default
import TerminalContainer from '../Terminal/TerminalContainer';
import TerminalContainerV2 from '../Terminal/TerminalContainerV2';

// Select the appropriate terminal component
const TerminalComponent = USE_TERMINAL_V2 ? TerminalContainerV2 : TerminalContainer;
import TopBar from './TopBar';
import StatusBar from './StatusBar';
import QuickActions from './QuickActions';
import KeyboardShortcuts from './KeyboardShortcuts';
import FileEditorModal from '../FileEditor/FileEditorModal';
import { motion, AnimatePresence } from 'framer-motion';

export const WorkspaceLayout: React.FC = () => {
  const {
    projects,
    currentProject,
    sidebarCollapsed,
    toggleSidebar,
    loading,
    error,
  } = useWorkspace();

  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [sidebarSize, setSidebarSize] = useState(25);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [fullscreenTerminal, setFullscreenTerminal] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'config' | 'files'>('files');
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [isFileEditorOpen, setIsFileEditorOpen] = useState(false);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K for quick actions
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowQuickActions(!showQuickActions);
      }
      // Cmd/Ctrl + \ for sidebar toggle
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
        e.preventDefault();
        toggleSidebar();
      }
      // Cmd/Ctrl + Shift + F for fullscreen terminal
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        setFullscreenTerminal(!fullscreenTerminal);
      }
      // Cmd/Ctrl + Shift + D for theme toggle
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setTheme(theme === 'dark' ? 'light' : 'dark');
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [showQuickActions, fullscreenTerminal, theme, toggleSidebar]);

  // Apply theme
  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light-mode');
    } else {
      document.documentElement.classList.remove('light-mode');
    }
  }, [theme]);

  // Show loading state
  if (loading && !currentProject) {
    return (
      <div className="h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="relative">
            <div className="absolute inset-0 blur-xl bg-gradient-to-r from-blue-500 to-purple-500 rounded-full opacity-30 animate-pulse"></div>
            <div className="relative bg-gray-800 p-8 rounded-2xl shadow-2xl border border-gray-700">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-600 border-t-blue-500 mx-auto"></div>
              <p className="mt-6 text-gray-300 font-medium">Initializing Workspace...</p>
              <div className="mt-4 flex justify-center space-x-1">
                <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0 }} className="w-2 h-2 bg-blue-500 rounded-full"></motion.div>
                <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }} className="w-2 h-2 bg-blue-500 rounded-full"></motion.div>
                <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }} className="w-2 h-2 bg-blue-500 rounded-full"></motion.div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Show error state
  if (error && !currentProject) {
    return (
      <div className="h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl border border-red-900/50">
            <motion.div 
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-red-500 mb-4"
            >
              <svg className="w-20 h-20 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </motion.div>
            <h2 className="text-2xl font-bold text-white mb-3">Workspace Error</h2>
            <p className="text-gray-400 mb-6">{error}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg transition-all transform hover:scale-105 font-medium shadow-lg"
              >
                Retry
              </button>
              <button
                onClick={() => window.history.back()}
                className="px-6 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-all font-medium"
              >
                Go Back
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'} text-gray-100 overflow-hidden flex flex-col`}>
      {/* Top Bar */}
      <TopBar 
        theme={theme} 
        onThemeChange={setTheme}
        onQuickActions={() => setShowQuickActions(true)}
        fullscreen={fullscreenTerminal}
        onFullscreenToggle={() => setFullscreenTerminal(!fullscreenTerminal)}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence>
          {fullscreenTerminal ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full relative"
            >
              {/* Render all project terminals but only show the active one */}
              {projects.map(project => (
                <div
                  key={project.id}
                  className={`absolute inset-0 ${
                    currentProject && project.id === currentProject.id ? 'block' : 'hidden'
                  }`}
                >
                  <TerminalComponent project={project} />
                </div>
              ))}
            </motion.div>
          ) : (
            <PanelGroup direction="horizontal" className="h-full">
              {/* Sidebar Panel */}
              <Panel
                defaultSize={sidebarSize}
                minSize={sidebarCollapsed ? 4 : 15}
                maxSize={40}
                collapsible={true}
                onResize={setSidebarSize}
                className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} border-r ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} transition-all duration-300`}
              >
                <motion.div 
                  className="h-full flex flex-col overflow-hidden"
                  animate={{ opacity: sidebarCollapsed ? 0.5 : 1 }}
                >
                  {!sidebarCollapsed ? (
                    <>
                      {/* Project Selector */}
                      <motion.div 
                        initial={{ y: -20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className={`p-4 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} flex-shrink-0`}
                      >
                        <ProjectSelector />
                      </motion.div>

                      {/* Tabs for Config and Files */}
                      <div className="flex-1 flex flex-col overflow-hidden">
                        <div className={`flex border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'}`}>
                          <button
                            onClick={() => setSidebarTab('config')}
                            className={`px-4 py-2 text-sm font-medium transition-colors ${
                              sidebarTab === 'config'
                                ? theme === 'dark' 
                                  ? 'text-blue-400 border-b-2 border-blue-400' 
                                  : 'text-blue-600 border-b-2 border-blue-600'
                                : theme === 'dark'
                                  ? 'text-gray-400 hover:text-gray-300'
                                  : 'text-gray-600 hover:text-gray-800'
                            }`}
                          >
                            Config
                          </button>
                          <button
                            onClick={() => setSidebarTab('files')}
                            className={`px-4 py-2 text-sm font-medium transition-colors ${
                              sidebarTab === 'files'
                                ? theme === 'dark' 
                                  ? 'text-blue-400 border-b-2 border-blue-400' 
                                  : 'text-blue-600 border-b-2 border-blue-600'
                                : theme === 'dark'
                                  ? 'text-gray-400 hover:text-gray-300'
                                  : 'text-gray-600 hover:text-gray-800'
                            }`}
                          >
                            Explorer
                          </button>
                        </div>
                        
                        {/* Tab Content */}
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.1 }}
                          className="flex-1 overflow-hidden"
                        >
                          {sidebarTab === 'config' && currentProject && (
                            <div className="h-full overflow-y-auto custom-scrollbar">
                              <ConfigPanel project={currentProject} />
                            </div>
                          )}
                          {sidebarTab === 'files' && currentProject && (
                            <FileExplorer 
                              projectPath={currentProject.path} 
                              theme={theme}
                              onFileSelect={(file) => {
                                setSelectedFile(file);
                                setIsFileEditorOpen(true);
                                console.log('File selected:', file);
                              }}
                            />
                          )}
                        </motion.div>
                      </div>
                    </>
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <button
                        onClick={toggleSidebar}
                        className={`p-2 rounded-lg ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} transition-colors`}
                        title="Expand sidebar (⌘\)"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  )}
                </motion.div>
              </Panel>

              {/* Resize Handle */}
              <PanelResizeHandle className={`w-1 ${theme === 'dark' ? 'bg-gray-700 hover:bg-blue-500' : 'bg-gray-300 hover:bg-blue-400'} transition-colors cursor-col-resize group`}>
                <div className="h-full w-full relative">
                  <div className="absolute inset-y-0 left-1/2 transform -translate-x-1/2 flex items-center">
                    <div className={`w-0.5 h-8 ${theme === 'dark' ? 'bg-gray-600' : 'bg-gray-400'} rounded-full opacity-0 group-hover:opacity-100 transition-opacity`}></div>
                  </div>
                </div>
              </PanelResizeHandle>

              {/* Terminal Zone */}
              <Panel defaultSize={75} minSize={50} className={`${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'} overflow-hidden`}>
                {currentProject ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    className="h-full relative"
                  >
                    {/* Render all project terminals but only show the active one */}
                    {projects.map(project => (
                      <div
                        key={project.id}
                        className={`absolute inset-0 ${
                          project.id === currentProject.id ? 'block' : 'hidden'
                        }`}
                      >
                        <TerminalComponent project={project} />
                      </div>
                    ))}
                  </motion.div>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-center max-w-md"
                    >
                      <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} p-12 rounded-2xl shadow-2xl ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} border`}>
                        <motion.div
                          animate={{ rotate: [0, 10, -10, 0] }}
                          transition={{ duration: 4, repeat: Infinity }}
                        >
                          <svg
                            className={`mx-auto h-24 w-24 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                            />
                          </svg>
                        </motion.div>
                        <h3 className={`mt-6 text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          No Project Selected
                        </h3>
                        <p className={`mt-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          Select or create a project to get started
                        </p>
                        <button
                          onClick={() => setShowQuickActions(true)}
                          className="mt-6 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg transition-all transform hover:scale-105 font-medium shadow-lg"
                        >
                          Quick Actions (⌘K)
                        </button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </Panel>
            </PanelGroup>
          )}
        </AnimatePresence>
      </div>

      {/* Status Bar */}
      <StatusBar 
        project={currentProject}
        theme={theme}
      />

      {/* Quick Actions Modal */}
      <AnimatePresence>
        {showQuickActions && (
          <QuickActions 
            onClose={() => setShowQuickActions(false)}
            theme={theme}
          />
        )}
      </AnimatePresence>

      {/* Keyboard Shortcuts Helper */}
      <KeyboardShortcuts theme={theme} />

      {/* File Editor Modal */}
      <FileEditorModal
        file={selectedFile}
        isOpen={isFileEditorOpen}
        onClose={() => {
          setIsFileEditorOpen(false);
          setSelectedFile(null);
        }}
        theme={theme}
      />

      {/* Custom Styles */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: ${theme === 'dark' ? '#1f2937' : '#f3f4f6'};
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: ${theme === 'dark' ? '#4b5563' : '#d1d5db'};
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: ${theme === 'dark' ? '#6b7280' : '#9ca3af'};
        }
        
        .light-mode {
          color-scheme: light;
        }
      `}</style>
    </div>
  );
};

export default WorkspaceLayout;