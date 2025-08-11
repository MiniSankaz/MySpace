import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { TerminalSession, TerminalMessage } from '../types';

export interface TerminalLayout {
  type: 'single' | 'split-horizontal' | 'split-vertical' | 'grid';
  maximized?: 'system' | 'claude' | null;
}

export interface TerminalPreferences {
  fontSize: number;
  fontFamily: string;
  theme: 'dark' | 'light';
  cursorBlink: boolean;
  cursorStyle: 'block' | 'underline' | 'bar';
  scrollback: number;
  bellSound: boolean;
  copyOnSelect: boolean;
}

export interface TerminalState {
  // Sessions by project
  projectSessions: Record<string, {
    system: TerminalSession[];
    claude: TerminalSession[];
  }>;
  
  // Active tabs by project
  activeTabs: Record<string, {
    system: string | null;
    claude: string | null;
  }>;
  
  // Terminal layout preferences
  layout: TerminalLayout;
  
  // Terminal preferences
  preferences: TerminalPreferences;
  
  // Connection status
  connectionStatus: Record<string, 'connected' | 'disconnected' | 'reconnecting'>;
  
  // Command history
  commandHistory: Record<string, string[]>;
  
  // Session metadata
  sessionMetadata: Record<string, {
    lastActivity: Date;
    commandCount: number;
    errorCount: number;
    outputBuffer?: string[]; // Buffer for background session output
    hasNewOutput?: boolean; // Flag for new output in background
  }>;
}

export interface TerminalActions {
  // Session management
  addSession: (projectId: string, session: TerminalSession) => void;
  removeSession: (projectId: string, sessionId: string) => void;
  updateSession: (sessionId: string, updates: Partial<TerminalSession>) => void;
  setActiveTab: (projectId: string, type: 'system' | 'claude', sessionId: string | null) => void;
  
  // Layout management
  setLayout: (layout: TerminalLayout) => void;
  toggleMaximize: (type: 'system' | 'claude' | null) => void;
  
  // Preferences
  updatePreferences: (preferences: Partial<TerminalPreferences>) => void;
  
  // Connection management
  setConnectionStatus: (sessionId: string, status: 'connected' | 'disconnected' | 'reconnecting') => void;
  
  // Command history
  addToHistory: (sessionId: string, command: string) => void;
  clearHistory: (sessionId: string) => void;
  
  // Session metadata
  updateMetadata: (sessionId: string, metadata: Partial<TerminalState['sessionMetadata'][string]>) => void;
  
  // Output buffer management
  addToOutputBuffer: (sessionId: string, data: string) => void;
  clearOutputBuffer: (sessionId: string) => void;
  markOutputAsRead: (sessionId: string) => void;
  
  // Bulk operations
  clearProjectSessions: (projectId: string) => void;
  loadProjectSessions: (projectId: string, sessions: TerminalSession[]) => void;
  forceCloseAllSessions: () => void; // Force close all sessions across all projects
  
  // Reset
  reset: () => void;
}

const defaultPreferences: TerminalPreferences = {
  fontSize: 14,
  fontFamily: 'JetBrains Mono, Menlo, Monaco, Consolas, monospace',
  theme: 'dark',
  cursorBlink: true,
  cursorStyle: 'block',
  scrollback: 1000,
  bellSound: false,
  copyOnSelect: true,
};

const initialState: TerminalState = {
  projectSessions: {},
  activeTabs: {},
  layout: { type: 'single', maximized: null },
  preferences: defaultPreferences,
  connectionStatus: {},
  commandHistory: {},
  sessionMetadata: {},
};

export const useTerminalStore = create<TerminalState & TerminalActions>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        addSession: (projectId, session) => {
          set((state) => {
            const projectSessions = state.projectSessions[projectId] || {
              system: [],
              claude: [],
            };
            
            const type = session.type;
            const sessions = [...projectSessions[type]];
            
            // Check if session already exists
            const existingIndex = sessions.findIndex(s => s.id === session.id);
            if (existingIndex >= 0) {
              sessions[existingIndex] = session;
            } else {
              sessions.push(session);
            }
            
            return {
              projectSessions: {
                ...state.projectSessions,
                [projectId]: {
                  ...projectSessions,
                  [type]: sessions,
                },
              },
              sessionMetadata: {
                ...state.sessionMetadata,
                [session.id]: {
                  lastActivity: new Date(),
                  commandCount: 0,
                  errorCount: 0,
                },
              },
            };
          });
        },

        removeSession: (projectId, sessionId) => {
          set((state) => {
            const projectSessions = state.projectSessions[projectId];
            if (!projectSessions) return state;
            
            // Mark session as inactive instead of removing completely
            const systemSessions = projectSessions.system.map(s => 
              s.id === sessionId ? { ...s, active: false } : s
            );
            const claudeSessions = projectSessions.claude.map(s => 
              s.id === sessionId ? { ...s, active: false } : s
            );
            
            const newProjectSessions = {
              system: systemSessions.filter(s => s.active), // Only show active sessions
              claude: claudeSessions.filter(s => s.active),
            };
            
            const activeTabs = { ...state.activeTabs[projectId] };
            if (activeTabs.system === sessionId) {
              activeTabs.system = newProjectSessions.system[0]?.id || null;
            }
            if (activeTabs.claude === sessionId) {
              activeTabs.claude = newProjectSessions.claude[0]?.id || null;
            }
            
            // Keep connection status and metadata for potential reconnection
            // Only remove if session is truly being deleted
            const { [sessionId]: _, ...connectionStatus } = state.connectionStatus;
            
            return {
              projectSessions: {
                ...state.projectSessions,
                [projectId]: newProjectSessions,
              },
              activeTabs: {
                ...state.activeTabs,
                [projectId]: activeTabs,
              },
              connectionStatus,
              commandHistory: state.commandHistory,
              sessionMetadata: state.sessionMetadata,
            };
          });
        },

        updateSession: (sessionId, updates) => {
          set((state) => {
            const newProjectSessions = { ...state.projectSessions };
            
            for (const projectId in newProjectSessions) {
              const project = newProjectSessions[projectId];
              
              const systemIndex = project.system.findIndex(s => s.id === sessionId);
              if (systemIndex >= 0) {
                project.system[systemIndex] = {
                  ...project.system[systemIndex],
                  ...updates,
                };
                break;
              }
              
              const claudeIndex = project.claude.findIndex(s => s.id === sessionId);
              if (claudeIndex >= 0) {
                project.claude[claudeIndex] = {
                  ...project.claude[claudeIndex],
                  ...updates,
                };
                break;
              }
            }
            
            return { projectSessions: newProjectSessions };
          });
        },

        setActiveTab: (projectId, type, sessionId) => {
          set((state) => ({
            activeTabs: {
              ...state.activeTabs,
              [projectId]: {
                ...state.activeTabs[projectId],
                [type]: sessionId,
              },
            },
          }));
        },

        setLayout: (layout) => {
          set({ layout });
        },

        toggleMaximize: (type) => {
          set((state) => ({
            layout: {
              ...state.layout,
              maximized: state.layout.maximized === type ? null : type,
            },
          }));
        },

        updatePreferences: (preferences) => {
          set((state) => ({
            preferences: {
              ...state.preferences,
              ...preferences,
            },
          }));
        },

        setConnectionStatus: (sessionId, status) => {
          set((state) => ({
            connectionStatus: {
              ...state.connectionStatus,
              [sessionId]: status,
            },
          }));
        },

        addToHistory: (sessionId, command) => {
          set((state) => {
            const history = state.commandHistory[sessionId] || [];
            const newHistory = [...history, command];
            
            // Limit history to 100 items
            if (newHistory.length > 100) {
              newHistory.splice(0, newHistory.length - 100);
            }
            
            return {
              commandHistory: {
                ...state.commandHistory,
                [sessionId]: newHistory,
              },
              sessionMetadata: {
                ...state.sessionMetadata,
                [sessionId]: {
                  ...state.sessionMetadata[sessionId],
                  lastActivity: new Date(),
                  commandCount: (state.sessionMetadata[sessionId]?.commandCount || 0) + 1,
                },
              },
            };
          });
        },

        clearHistory: (sessionId) => {
          set((state) => {
            const { [sessionId]: _, ...commandHistory } = state.commandHistory;
            return { commandHistory };
          });
        },

        updateMetadata: (sessionId, metadata) => {
          set((state) => ({
            sessionMetadata: {
              ...state.sessionMetadata,
              [sessionId]: {
                ...state.sessionMetadata[sessionId],
                ...metadata,
              },
            },
          }));
        },

        addToOutputBuffer: (sessionId, data) => {
          set((state) => ({
            sessionMetadata: {
              ...state.sessionMetadata,
              [sessionId]: {
                ...state.sessionMetadata[sessionId],
                outputBuffer: [
                  ...(state.sessionMetadata[sessionId]?.outputBuffer || []),
                  data
                ].slice(-500), // Keep last 500 entries
                hasNewOutput: true,
                lastActivity: new Date(),
              },
            },
          }));
        },

        clearOutputBuffer: (sessionId) => {
          set((state) => ({
            sessionMetadata: {
              ...state.sessionMetadata,
              [sessionId]: {
                ...state.sessionMetadata[sessionId],
                outputBuffer: [],
                hasNewOutput: false,
              },
            },
          }));
        },

        markOutputAsRead: (sessionId) => {
          set((state) => ({
            sessionMetadata: {
              ...state.sessionMetadata,
              [sessionId]: {
                ...state.sessionMetadata[sessionId],
                hasNewOutput: false,
              },
            },
          }));
        },

        clearProjectSessions: (projectId) => {
          set((state) => {
            const { [projectId]: _, ...projectSessions } = state.projectSessions;
            const { [projectId]: __, ...activeTabs } = state.activeTabs;
            
            // Also clean up related data
            const sessionIds = new Set<string>();
            const project = state.projectSessions[projectId];
            if (project) {
              project.system.forEach(s => sessionIds.add(s.id));
              project.claude.forEach(s => sessionIds.add(s.id));
            }
            
            const newConnectionStatus = { ...state.connectionStatus };
            const newCommandHistory = { ...state.commandHistory };
            const newSessionMetadata = { ...state.sessionMetadata };
            
            sessionIds.forEach(id => {
              delete newConnectionStatus[id];
              delete newCommandHistory[id];
              delete newSessionMetadata[id];
            });
            
            return {
              projectSessions,
              activeTabs,
              connectionStatus: newConnectionStatus,
              commandHistory: newCommandHistory,
              sessionMetadata: newSessionMetadata,
            };
          });
        },

        loadProjectSessions: (projectId, sessions) => {
          set((state) => {
            const systemSessions = sessions.filter(s => s.type === 'system');
            const claudeSessions = sessions.filter(s => s.type === 'claude');
            
            const newSessionMetadata = { ...state.sessionMetadata };
            sessions.forEach(session => {
              if (!newSessionMetadata[session.id]) {
                newSessionMetadata[session.id] = {
                  lastActivity: new Date(),
                  commandCount: 0,
                  errorCount: 0,
                };
              }
            });
            
            return {
              projectSessions: {
                ...state.projectSessions,
                [projectId]: {
                  system: systemSessions,
                  claude: claudeSessions,
                },
              },
              activeTabs: {
                ...state.activeTabs,
                [projectId]: {
                  system: systemSessions[0]?.id || null,
                  claude: claudeSessions[0]?.id || null,
                },
              },
              sessionMetadata: newSessionMetadata,
            };
          });
        },

        forceCloseAllSessions: () => {
          console.log('[TerminalStore] Force closing all terminal sessions across all projects');
          
          set((state) => {
            // Count total sessions being closed
            let totalSessions = 0;
            Object.keys(state.projectSessions).forEach(projectId => {
              const sessions = state.projectSessions[projectId];
              if (sessions) {
                totalSessions += sessions.system.length + sessions.claude.length;
              }
            });
            
            console.log(`[TerminalStore] Closing ${totalSessions} terminal sessions`);
            
            // Clear all project sessions and related data
            return {
              projectSessions: {},
              activeTabs: {},
              connectionStatus: {},
              commandHistory: state.commandHistory, // Keep command history for next session
              sessionMetadata: {},
            };
          });
        },

        reset: () => {
          set(initialState);
        },
      }),
      {
        name: 'terminal-store',
        partialize: (state) => ({
          preferences: state.preferences,
          layout: state.layout,
          commandHistory: state.commandHistory,
        }),
      }
    )
  )
);