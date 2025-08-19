import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { TerminalSession, TerminalMessage } from "../types";

export interface TerminalLayout {
  type: "single" | "split-horizontal" | "split-vertical" | "grid";
  maximized?: "system" | "claude" | null;
}

export interface TerminalPreferences {
  fontSize: number;
  fontFamily: string;
  theme: "dark" | "light";
  cursorBlink: boolean;
  cursorStyle: "block" | "underline" | "bar";
  scrollback: number;
  bellSound: boolean;
  copyOnSelect: boolean;
}

export interface TerminalState {
  // Sessions by project
  projectSessions: Record<
    string,
    {
      system: TerminalSession[];
      claude: TerminalSession[];
    }
  >;

  // Active tabs by project
  activeTabs: Record<
    string,
    {
      system: string | null;
      claude: string | null;
    }
  >;

  // Terminal layout preferences
  layout: TerminalLayout;

  // Terminal preferences
  preferences: TerminalPreferences;

  // Connection status
  connectionStatus: Record<
    string,
    "connected" | "disconnected" | "reconnecting"
  >;

  // Command history
  commandHistory: Record<string, string[]>;

  // Session metadata
  sessionMetadata: Record<
    string,
    {
      lastActivity: Date;
      commandCount: number;
      errorCount: number;
      outputBuffer?: string[]; // Buffer for background session output
      hasNewOutput?: boolean; // Flag for new output in background
    }
  >;
}

export interface TerminalActions {
  // Session management
  addSession: (projectId: string, session: TerminalSession) => void;
  removeSession: (projectId: string, sessionId: string) => void;
  updateSession: (sessionId: string, updates: Partial<TerminalSession>) => void;
  setActiveTab: (
    projectId: string,
    type: "system" | "claude",
    sessionId: string | null,
  ) => void;

  // Layout management
  setLayout: (layout: TerminalLayout) => void;
  toggleMaximize: (type: "system" | "claude" | null) => void;

  // Preferences
  updatePreferences: (preferences: Partial<TerminalPreferences>) => void;

  // Connection management
  setConnectionStatus: (
    sessionId: string,
    status: "connected" | "disconnected" | "reconnecting",
  ) => void;

  // Command history
  addToHistory: (sessionId: string, command: string) => void;
  clearHistory: (sessionId: string) => void;

  // Session metadata
  updateMetadata: (
    sessionId: string,
    metadata: Partial<TerminalState["sessionMetadata"][string]>,
  ) => void;

  // Output buffer management
  addToOutputBuffer: (sessionId: string, data: string) => void;
  clearOutputBuffer: (sessionId: string) => void;
  markOutputAsRead: (sessionId: string) => void;

  // Bulk operations
  clearProjectSessions: (projectId: string) => void;
  loadProjectSessions: (projectId: string, sessions: TerminalSession[]) => void;
  reconcileProjectSessions: (
    projectId: string,
    sessions: TerminalSession[],
  ) => void; // Smart merge for project switching
  forceCloseAllSessions: () => void; // Force close all sessions across all projects

  // Reset
  reset: () => void;
}

const defaultPreferences: TerminalPreferences = {
  fontSize: 14,
  fontFamily: "JetBrains Mono, Menlo, Monaco, Consolas, monospace",
  theme: "dark",
  cursorBlink: true,
  cursorStyle: "block",
  scrollback: 1000,
  bellSound: false,
  copyOnSelect: true,
};

const initialState: TerminalState = {
  projectSessions: {},
  activeTabs: {},
  layout: { type: "single", maximized: null },
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
            const existingIndex = sessions.findIndex(
              (s) => s.id === session.id,
            );
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
            const systemSessions = projectSessions.system.map((s) =>
              s.id === sessionId ? { ...s, active: false } : s,
            );
            const claudeSessions = projectSessions.claude.map((s) =>
              s.id === sessionId ? { ...s, active: false } : s,
            );

            const newProjectSessions = {
              system: systemSessions.filter((s) => s.active), // Only show active sessions
              claude: claudeSessions.filter((s) => s.active),
            };

            const activeTabs = { ...state.activeTabs[projectId] };
            if (activeTabs.system === sessionId) {
              activeTabs.system = newProjectSessions.system[0]?.id || null;
            }
            if (activeTabs.claude === sessionId) {
              activeTabs.claude = newProjectSessions.claude[0]?.id || null;
            }

            // Clean up session data completely
            const { [sessionId]: _, ...connectionStatus } =
              state.connectionStatus;
            const { [sessionId]: __, ...commandHistory } = state.commandHistory;
            const { [sessionId]: ___, ...sessionMetadata } =
              state.sessionMetadata;

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
              commandHistory,
              sessionMetadata,
            };
          });
        },

        updateSession: (sessionId, updates) => {
          set((state) => {
            const newProjectSessions = { ...state.projectSessions };

            for (const projectId in newProjectSessions) {
              const project = newProjectSessions[projectId];

              const systemIndex = project.system.findIndex(
                (s) => s.id === sessionId,
              );
              if (systemIndex >= 0) {
                project.system[systemIndex] = {
                  ...project.system[systemIndex],
                  ...updates,
                };
                break;
              }

              const claudeIndex = project.claude.findIndex(
                (s) => s.id === sessionId,
              );
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
                  commandCount:
                    (state.sessionMetadata[sessionId]?.commandCount || 0) + 1,
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
                  data,
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
            const { [projectId]: _, ...projectSessions } =
              state.projectSessions;
            const { [projectId]: __, ...activeTabs } = state.activeTabs;

            // Also clean up related data
            const sessionIds = new Set<string>();
            const project = state.projectSessions[projectId];
            if (project) {
              project.system.forEach((s) => sessionIds.add(s.id));
              project.claude.forEach((s) => sessionIds.add(s.id));
            }

            const newConnectionStatus = { ...state.connectionStatus };
            const newCommandHistory = { ...state.commandHistory };
            const newSessionMetadata = { ...state.sessionMetadata };

            sessionIds.forEach((id) => {
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
            const incomingSystemSessions = sessions.filter(
              (s) => s.type === "system",
            );
            const incomingClaudeSessions = sessions.filter(
              (s) => s.type === "claude",
            );

            // Get existing sessions for this project
            const existingProject = state.projectSessions[projectId] || {
              system: [],
              claude: [],
            };

            // CRITICAL FIX: Merge sessions instead of overwriting
            // Only add sessions that don't already exist in UI
            const mergeUniqueSessions = (existing: any[], incoming: any[]) => {
              const existingIds = new Set(existing.map((s) => s.id));
              const newSessions = incoming.filter(
                (s) => !existingIds.has(s.id),
              );
              return [...existing, ...newSessions];
            };

            const mergedSystemSessions = mergeUniqueSessions(
              existingProject.system,
              incomingSystemSessions,
            );
            const mergedClaudeSessions = mergeUniqueSessions(
              existingProject.claude,
              incomingClaudeSessions,
            );

            const newSessionMetadata = { ...state.sessionMetadata };
            sessions.forEach((session) => {
              if (!newSessionMetadata[session.id]) {
                newSessionMetadata[session.id] = {
                  lastActivity: new Date(),
                  commandCount: 0,
                  errorCount: 0,
                };
              }
            });

            // Only update active tabs if none are currently set
            const currentActiveTabs = state.activeTabs[projectId];
            const shouldUpdateTabs =
              !currentActiveTabs ||
              (!currentActiveTabs.system && !currentActiveTabs.claude);

            return {
              projectSessions: {
                ...state.projectSessions,
                [projectId]: {
                  system: mergedSystemSessions,
                  claude: mergedClaudeSessions,
                },
              },
              activeTabs: {
                ...state.activeTabs,
                [projectId]: shouldUpdateTabs
                  ? {
                      system:
                        mergedSystemSessions[0]?.id ||
                        currentActiveTabs?.system ||
                        null,
                      claude:
                        mergedClaudeSessions[0]?.id ||
                        currentActiveTabs?.claude ||
                        null,
                    }
                  : currentActiveTabs,
              },
              sessionMetadata: newSessionMetadata,
            };
          });
        },

        reconcileProjectSessions: (projectId, sessions) => {
          set((state) => {
            // Validate inputs
            if (!projectId || !Array.isArray(sessions)) {
              console.error(
                "[TerminalStore] Invalid input to reconcileProjectSessions:",
                { projectId, sessions },
              );
              return state;
            }

            const incomingSystemSessions = sessions.filter(
              (s) => s?.type === "system",
            );
            const incomingClaudeSessions = sessions.filter(
              (s) => s?.type === "claude",
            );

            // Get existing sessions for this project
            const existingProject = state.projectSessions[projectId] || {
              system: [],
              claude: [],
            };

            // SMART RECONCILIATION: Update existing sessions, add new ones, preserve UI state
            const reconcileSessions = (existing: any[], incoming: any[]) => {
              const existingMap = new Map(existing.map((s) => [s.id, s]));
              const incomingMap = new Map(incoming.map((s) => [s.id, s]));

              const reconciled = [];

              // Update existing sessions with new data
              for (const [id, existingSession] of existingMap) {
                const incomingSession = incomingMap.get(id);
                if (incomingSession) {
                  // Merge existing UI state with backend data
                  reconciled.push({
                    ...incomingSession,
                    // Preserve UI-specific properties if they exist
                    uiState: existingSession.uiState,
                  });
                } else {
                  // Keep existing session if it's not in incoming (UI-only session)
                  reconciled.push(existingSession);
                }
              }

              // Add new sessions from backend
              for (const [id, incomingSession] of incomingMap) {
                if (!existingMap.has(id)) {
                  reconciled.push(incomingSession);
                }
              }

              return reconciled;
            };

            const reconciledSystemSessions = reconcileSessions(
              existingProject.system,
              incomingSystemSessions,
            );
            const reconciledClaudeSessions = reconcileSessions(
              existingProject.claude,
              incomingClaudeSessions,
            );

            // Update metadata for new sessions
            const newSessionMetadata = { ...state.sessionMetadata };
            sessions.forEach((session) => {
              if (!newSessionMetadata[session.id]) {
                newSessionMetadata[session.id] = {
                  lastActivity: new Date(),
                  commandCount: 0,
                  errorCount: 0,
                };
              }
            });

            // Preserve existing active tabs when possible
            const currentActiveTabs = state.activeTabs[projectId];
            const validSystemTab = reconciledSystemSessions.find(
              (s) => s.id === currentActiveTabs?.system,
            );
            const validClaudeTab = reconciledClaudeSessions.find(
              (s) => s.id === currentActiveTabs?.claude,
            );

            console.log(
              `[TerminalStore] Reconciled ${projectId}: ${reconciledSystemSessions.length} system, ${reconciledClaudeSessions.length} claude`,
            );

            return {
              projectSessions: {
                ...state.projectSessions,
                [projectId]: {
                  system: reconciledSystemSessions,
                  claude: reconciledClaudeSessions,
                },
              },
              activeTabs: {
                ...state.activeTabs,
                [projectId]: {
                  system: validSystemTab
                    ? currentActiveTabs.system
                    : reconciledSystemSessions[0]?.id || null,
                  claude: validClaudeTab
                    ? currentActiveTabs.claude
                    : reconciledClaudeSessions[0]?.id || null,
                },
              },
              sessionMetadata: newSessionMetadata,
            };
          });
        },

        forceCloseAllSessions: () => {
          console.log(
            "[TerminalStore] Force closing all terminal sessions across all projects",
          );

          set((state) => {
            // Count total sessions being closed
            let totalSessions = 0;
            Object.keys(state.projectSessions).forEach((projectId) => {
              const sessions = state.projectSessions[projectId];
              if (sessions) {
                totalSessions +=
                  sessions.system.length + sessions.claude.length;
              }
            });

            console.log(
              `[TerminalStore] Closing ${totalSessions} terminal sessions`,
            );

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
        name: "terminal-store",
        partialize: (state) => ({
          preferences: state.preferences,
          layout: state.layout,
          commandHistory: state.commandHistory,
        }),
      },
    ),
  ),
);
