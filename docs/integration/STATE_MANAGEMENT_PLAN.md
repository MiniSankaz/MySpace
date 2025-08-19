# State Management Plan

## Stock Portfolio Management System v3.0

### Document Information

- **Version**: 1.0
- **Date**: 2025-08-15
- **Agent**: System Analyst
- **Project**: Stock Portfolio Management System v3.0
- **Document Type**: State Management Architecture
- **Status**: Final
- **Dependencies**: UI-API Integration Plan, Microservices Architecture

---

## Executive Summary

This document outlines the comprehensive state management strategy for the React frontend, utilizing Zustand for global application state and React Query for server state management. The architecture ensures efficient data synchronization, real-time updates, and optimal performance across all application modules.

### Key State Management Objectives

- **Unified State Architecture**: Clear separation between client state and server state
- **Real-time Synchronization**: WebSocket integration with state updates
- **Optimistic Updates**: Immediate UI feedback with automatic rollback on errors
- **Cache Management**: Intelligent caching strategies with selective invalidation
- **Type Safety**: Complete TypeScript support for all state operations
- **Performance Optimization**: Minimal re-renders and efficient memory usage

---

## State Architecture Overview

### State Layer Separation

```typescript
// State Architecture Layers
┌─────────────────────────────────────────────────────────────┐
│                   PRESENTATION LAYER                        │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────┐ │
│  │  React      │ │   Next.js   │ │  Components │ │  Pages  │ │
│  │ Components  │ │    Pages    │ │   Library   │ │         │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                   STATE MANAGEMENT LAYER                    │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────┐ │
│  │   Zustand   │ │React Query  │ │  WebSocket  │ │  Local  │ │
│  │ (Client     │ │ (Server     │ │   State     │ │Storage  │ │
│  │  State)     │ │  State)     │ │ (Real-time) │ │         │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                     API LAYER                               │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────┐ │
│  │   Gateway   │ │  Service    │ │  WebSocket  │ │  Cache  │ │
│  │   Client    │ │  Clients    │ │  Managers   │ │Manager  │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Zustand Store Architecture

### 1. Authentication Store

```typescript
// /src/store/auth.store.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { authService } from "@/services/api/auth.service";

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  roles: string[];
  preferences: UserPreferences;
}

export interface UserPreferences {
  theme: "light" | "dark" | "system";
  language: string;
  timezone: string;
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  dashboard: {
    layout: string;
    widgets: string[];
  };
  trading: {
    defaultCurrency: string;
    riskTolerance: "low" | "medium" | "high";
  };
}

interface AuthState {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  updatePreferences: (preferences: Partial<UserPreferences>) => Promise<void>;
  clearError: () => void;
  setUser: (user: User) => void;

  // Computed
  hasRole: (role: string) => boolean;
  getFullName: () => string;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Actions
      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });

        try {
          const response = await authService.login({ email, password });

          set({
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.message || "Login failed",
            isAuthenticated: false,
            user: null,
          });
          throw error;
        }
      },

      logout: async () => {
        set({ isLoading: true });

        try {
          await authService.logout();
        } catch (error) {
          console.error("Logout error:", error);
        } finally {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        }
      },

      register: async (data: RegisterData) => {
        set({ isLoading: true, error: null });

        try {
          await authService.register(data);
          set({ isLoading: false });
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.message || "Registration failed",
          });
          throw error;
        }
      },

      updateProfile: async (updates: Partial<User>) => {
        const currentUser = get().user;
        if (!currentUser) throw new Error("No user logged in");

        set({ isLoading: true, error: null });

        try {
          const updatedUser = await authService.updateProfile(updates);
          set({
            user: updatedUser,
            isLoading: false,
          });
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.message || "Profile update failed",
          });
          throw error;
        }
      },

      updatePreferences: async (preferences: Partial<UserPreferences>) => {
        const currentUser = get().user;
        if (!currentUser) throw new Error("No user logged in");

        set({ isLoading: true, error: null });

        try {
          const updatedPreferences =
            await authService.updatePreferences(preferences);
          set({
            user: {
              ...currentUser,
              preferences: {
                ...currentUser.preferences,
                ...updatedPreferences,
              },
            },
            isLoading: false,
          });
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.message || "Preferences update failed",
          });
          throw error;
        }
      },

      clearError: () => set({ error: null }),

      setUser: (user: User) => set({ user, isAuthenticated: true }),

      // Computed
      hasRole: (role: string) => {
        const user = get().user;
        return user ? user.roles.includes(role) : false;
      },

      getFullName: () => {
        const user = get().user;
        return user ? `${user.firstName} ${user.lastName}` : "";
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
```

### 2. UI Store

```typescript
// /src/store/ui.store.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type Theme = "light" | "dark" | "system";
export type Language = "en" | "th";

interface UIState {
  // Theme
  theme: Theme;
  isDarkMode: boolean;

  // Layout
  sidebarCollapsed: boolean;
  sidebarWidth: number;

  // Language
  language: Language;

  // Modal state
  modals: {
    [key: string]: {
      isOpen: boolean;
      data?: any;
    };
  };

  // Toast notifications
  toasts: Array<{
    id: string;
    type: "success" | "error" | "warning" | "info";
    title: string;
    message?: string;
    duration?: number;
    action?: {
      label: string;
      onClick: () => void;
    };
  }>;

  // Loading states
  globalLoading: boolean;
  loadingStates: { [key: string]: boolean };

  // Actions
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSidebarWidth: (width: number) => void;
  setLanguage: (language: Language) => void;

  // Modal actions
  openModal: (modalId: string, data?: any) => void;
  closeModal: (modalId: string) => void;
  closeAllModals: () => void;

  // Toast actions
  addToast: (toast: Omit<UIState["toasts"][0], "id">) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;

  // Loading actions
  setGlobalLoading: (loading: boolean) => void;
  setLoading: (key: string, loading: boolean) => void;
  clearAllLoading: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      // Initial state
      theme: "system",
      isDarkMode: false,
      sidebarCollapsed: false,
      sidebarWidth: 280,
      language: "en",
      modals: {},
      toasts: [],
      globalLoading: false,
      loadingStates: {},

      // Theme actions
      setTheme: (theme: Theme) => {
        const isDarkMode =
          theme === "dark" ||
          (theme === "system" &&
            window.matchMedia("(prefers-color-scheme: dark)").matches);

        set({ theme, isDarkMode });

        // Apply theme to document
        document.documentElement.setAttribute(
          "data-theme",
          isDarkMode ? "dark" : "light",
        );
      },

      toggleTheme: () => {
        const currentTheme = get().theme;
        const newTheme = currentTheme === "light" ? "dark" : "light";
        get().setTheme(newTheme);
      },

      // Layout actions
      setSidebarCollapsed: (collapsed: boolean) =>
        set({ sidebarCollapsed: collapsed }),
      setSidebarWidth: (width: number) =>
        set({ sidebarWidth: Math.max(200, Math.min(400, width)) }),

      // Language actions
      setLanguage: (language: Language) => set({ language }),

      // Modal actions
      openModal: (modalId: string, data?: any) => {
        set((state) => ({
          modals: {
            ...state.modals,
            [modalId]: {
              isOpen: true,
              data,
            },
          },
        }));
      },

      closeModal: (modalId: string) => {
        set((state) => ({
          modals: {
            ...state.modals,
            [modalId]: {
              ...state.modals[modalId],
              isOpen: false,
            },
          },
        }));
      },

      closeAllModals: () => {
        set((state) => {
          const closedModals = Object.keys(state.modals).reduce(
            (acc, key) => {
              acc[key] = { ...state.modals[key], isOpen: false };
              return acc;
            },
            {} as typeof state.modals,
          );

          return { modals: closedModals };
        });
      },

      // Toast actions
      addToast: (toast) => {
        const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const newToast = { ...toast, id };

        set((state) => ({
          toasts: [...state.toasts, newToast],
        }));

        // Auto-remove toast after duration
        if (toast.duration !== 0) {
          setTimeout(() => {
            get().removeToast(id);
          }, toast.duration || 5000);
        }

        return id;
      },

      removeToast: (id: string) => {
        set((state) => ({
          toasts: state.toasts.filter((toast) => toast.id !== id),
        }));
      },

      clearToasts: () => set({ toasts: [] }),

      // Loading actions
      setGlobalLoading: (loading: boolean) => set({ globalLoading: loading }),

      setLoading: (key: string, loading: boolean) => {
        set((state) => ({
          loadingStates: {
            ...state.loadingStates,
            [key]: loading,
          },
        }));
      },

      clearAllLoading: () => set({ loadingStates: {}, globalLoading: false }),
    }),
    {
      name: "ui-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
        sidebarWidth: state.sidebarWidth,
        language: state.language,
      }),
    },
  ),
);

// Initialize theme on store creation
if (typeof window !== "undefined") {
  const store = useUIStore.getState();
  store.setTheme(store.theme);

  // Listen for system theme changes
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  mediaQuery.addEventListener("change", () => {
    if (store.theme === "system") {
      store.setTheme("system");
    }
  });
}
```

### 3. Portfolio Store

```typescript
// /src/store/portfolio.store.ts
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { portfolioWs } from "@/services/websocket/portfolio.ws";

interface PortfolioState {
  // Active portfolio
  activePortfolioId: string | null;

  // Real-time data
  realtimePrices: { [symbol: string]: PriceData };
  portfolioUpdates: { [portfolioId: string]: any };

  // Trading state
  pendingTrades: Transaction[];
  tradeErrors: { [tradeId: string]: string };

  // Watchlist
  watchlistSymbols: string[];

  // UI state
  selectedSymbol: string | null;
  chartTimeframe: "1D" | "1W" | "1M" | "3M" | "6M" | "1Y" | "ALL";

  // Actions
  setActivePortfolio: (portfolioId: string | null) => void;
  updateRealtimePrice: (symbol: string, priceData: PriceData) => void;
  updatePortfolio: (portfolioId: string, updates: any) => void;
  addPendingTrade: (trade: Transaction) => void;
  removePendingTrade: (tradeId: string) => void;
  setTradeError: (tradeId: string, error: string) => void;
  clearTradeError: (tradeId: string) => void;
  addToWatchlist: (symbol: string) => void;
  removeFromWatchlist: (symbol: string) => void;
  setSelectedSymbol: (symbol: string | null) => void;
  setChartTimeframe: (timeframe: PortfolioState["chartTimeframe"]) => void;

  // WebSocket management
  connectWebSocket: () => void;
  disconnectWebSocket: () => void;
  subscribeToSymbol: (symbol: string) => void;
  unsubscribeFromSymbol: (symbol: string) => void;
  subscribeToPortfolio: (portfolioId: string) => void;
  unsubscribeFromPortfolio: (portfolioId: string) => void;
}

export const usePortfolioStore = create<PortfolioState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    activePortfolioId: null,
    realtimePrices: {},
    portfolioUpdates: {},
    pendingTrades: [],
    tradeErrors: {},
    watchlistSymbols: [],
    selectedSymbol: null,
    chartTimeframe: "1D",

    // Basic actions
    setActivePortfolio: (portfolioId) => {
      const currentId = get().activePortfolioId;

      // Unsubscribe from current portfolio
      if (currentId) {
        get().unsubscribeFromPortfolio(currentId);
      }

      // Subscribe to new portfolio
      if (portfolioId) {
        get().subscribeToPortfolio(portfolioId);
      }

      set({ activePortfolioId: portfolioId });
    },

    updateRealtimePrice: (symbol, priceData) => {
      set((state) => ({
        realtimePrices: {
          ...state.realtimePrices,
          [symbol]: priceData,
        },
      }));
    },

    updatePortfolio: (portfolioId, updates) => {
      set((state) => ({
        portfolioUpdates: {
          ...state.portfolioUpdates,
          [portfolioId]: {
            ...state.portfolioUpdates[portfolioId],
            ...updates,
          },
        },
      }));
    },

    addPendingTrade: (trade) => {
      set((state) => ({
        pendingTrades: [...state.pendingTrades, trade],
      }));
    },

    removePendingTrade: (tradeId) => {
      set((state) => ({
        pendingTrades: state.pendingTrades.filter(
          (trade) => trade.id !== tradeId,
        ),
      }));
    },

    setTradeError: (tradeId, error) => {
      set((state) => ({
        tradeErrors: {
          ...state.tradeErrors,
          [tradeId]: error,
        },
      }));
    },

    clearTradeError: (tradeId) => {
      set((state) => {
        const { [tradeId]: _, ...rest } = state.tradeErrors;
        return { tradeErrors: rest };
      });
    },

    addToWatchlist: (symbol) => {
      set((state) => {
        if (!state.watchlistSymbols.includes(symbol)) {
          get().subscribeToSymbol(symbol);
          return {
            watchlistSymbols: [...state.watchlistSymbols, symbol],
          };
        }
        return state;
      });
    },

    removeFromWatchlist: (symbol) => {
      set((state) => {
        get().unsubscribeFromSymbol(symbol);
        return {
          watchlistSymbols: state.watchlistSymbols.filter((s) => s !== symbol),
        };
      });
    },

    setSelectedSymbol: (symbol) => set({ selectedSymbol: symbol }),
    setChartTimeframe: (timeframe) => set({ chartTimeframe: timeframe }),

    // WebSocket management
    connectWebSocket: async () => {
      try {
        await portfolioWs.connect();

        // Setup event handlers
        portfolioWs.onPriceUpdate((symbol, price, change) => {
          get().updateRealtimePrice(symbol, {
            price,
            change,
            timestamp: Date.now(),
          });
        });

        portfolioWs.onPortfolioUpdate((portfolioId, updates) => {
          get().updatePortfolio(portfolioId, updates);
        });

        portfolioWs.onTradeExecuted((portfolioId, trade) => {
          get().removePendingTrade(trade.id);
          // Portfolio will be updated via portfolio update event
        });

        portfolioWs.onAlert((alert) => {
          // Handle alerts via UI store
          useUIStore.getState().addToast({
            type: "info",
            title: "Portfolio Alert",
            message: alert.message,
            duration: 10000,
          });
        });

        // Subscribe to watchlist symbols
        const watchlistSymbols = get().watchlistSymbols;
        if (watchlistSymbols.length > 0) {
          portfolioWs.subscribeToMultipleSymbols(watchlistSymbols);
        }

        // Subscribe to active portfolio
        const activePortfolioId = get().activePortfolioId;
        if (activePortfolioId) {
          portfolioWs.subscribeToPortfolio(activePortfolioId);
        }
      } catch (error) {
        console.error("Failed to connect portfolio WebSocket:", error);
        useUIStore.getState().addToast({
          type: "error",
          title: "Connection Error",
          message: "Failed to connect to real-time updates",
          duration: 5000,
        });
      }
    },

    disconnectWebSocket: () => {
      portfolioWs.disconnect();
    },

    subscribeToSymbol: (symbol) => {
      portfolioWs.subscribeToSymbol(symbol);
    },

    unsubscribeFromSymbol: (symbol) => {
      portfolioWs.unsubscribeFromSymbol(symbol);
    },

    subscribeToPortfolio: (portfolioId) => {
      portfolioWs.subscribeToPortfolio(portfolioId);
    },

    unsubscribeFromPortfolio: (portfolioId) => {
      portfolioWs.unsubscribeFromPortfolio(portfolioId);
    },
  })),
);

// Auto-connect WebSocket when user is authenticated
usePortfolioStore.subscribe(
  (state) => state.activePortfolioId,
  (activePortfolioId) => {
    if (activePortfolioId && useAuthStore.getState().isAuthenticated) {
      const store = usePortfolioStore.getState();
      if (portfolioWs.getConnectionStatus() !== "open") {
        store.connectWebSocket();
      }
    }
  },
);
```

### 4. Workspace Store

```typescript
// /src/store/workspace.store.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface WorkspaceState {
  // Active project
  activeProjectId: string | null;

  // File explorer
  expandedFolders: Set<string>;
  selectedFiles: string[];
  recentFiles: Array<{
    path: string;
    projectId: string;
    lastOpened: string;
  }>;

  // Terminal sessions
  terminalSessions: { [sessionId: string]: TerminalSession };
  activeTerminalId: string | null;

  // Layout
  layoutConfig: {
    fileExplorerWidth: number;
    terminalHeight: number;
    rightPanelWidth: number;
    showFileExplorer: boolean;
    showTerminal: boolean;
    showRightPanel: boolean;
  };

  // Git state
  gitState: { [projectId: string]: GitStatus };

  // Search
  searchQuery: string;
  searchResults: SearchResult[];
  searchFilters: SearchFilters;

  // Actions
  setActiveProject: (projectId: string | null) => void;
  toggleFolder: (folderPath: string) => void;
  selectFile: (filePath: string, multiSelect?: boolean) => void;
  clearSelection: () => void;
  addRecentFile: (path: string, projectId: string) => void;

  // Terminal actions
  addTerminalSession: (session: TerminalSession) => void;
  removeTerminalSession: (sessionId: string) => void;
  setActiveTerminal: (sessionId: string | null) => void;
  updateTerminalSession: (
    sessionId: string,
    updates: Partial<TerminalSession>,
  ) => void;

  // Layout actions
  setFileExplorerWidth: (width: number) => void;
  setTerminalHeight: (height: number) => void;
  setRightPanelWidth: (width: number) => void;
  toggleFileExplorer: () => void;
  toggleTerminal: () => void;
  toggleRightPanel: () => void;

  // Git actions
  updateGitState: (projectId: string, gitState: GitStatus) => void;

  // Search actions
  setSearchQuery: (query: string) => void;
  setSearchResults: (results: SearchResult[]) => void;
  updateSearchFilters: (filters: Partial<SearchFilters>) => void;
  clearSearch: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      // Initial state
      activeProjectId: null,
      expandedFolders: new Set(),
      selectedFiles: [],
      recentFiles: [],
      terminalSessions: {},
      activeTerminalId: null,
      layoutConfig: {
        fileExplorerWidth: 280,
        terminalHeight: 300,
        rightPanelWidth: 300,
        showFileExplorer: true,
        showTerminal: true,
        showRightPanel: false,
      },
      gitState: {},
      searchQuery: "",
      searchResults: [],
      searchFilters: {},

      // Project actions
      setActiveProject: (projectId) => {
        set({ activeProjectId: projectId });

        // Clear project-specific state when switching projects
        if (projectId) {
          set({
            selectedFiles: [],
            searchQuery: "",
            searchResults: [],
          });
        }
      },

      // File explorer actions
      toggleFolder: (folderPath) => {
        set((state) => {
          const newExpanded = new Set(state.expandedFolders);
          if (newExpanded.has(folderPath)) {
            newExpanded.delete(folderPath);
          } else {
            newExpanded.add(folderPath);
          }
          return { expandedFolders: newExpanded };
        });
      },

      selectFile: (filePath, multiSelect = false) => {
        set((state) => {
          if (multiSelect) {
            const isSelected = state.selectedFiles.includes(filePath);
            return {
              selectedFiles: isSelected
                ? state.selectedFiles.filter((f) => f !== filePath)
                : [...state.selectedFiles, filePath],
            };
          } else {
            return { selectedFiles: [filePath] };
          }
        });
      },

      clearSelection: () => set({ selectedFiles: [] }),

      addRecentFile: (path, projectId) => {
        set((state) => {
          const recentFiles = state.recentFiles.filter(
            (file) => !(file.path === path && file.projectId === projectId),
          );

          return {
            recentFiles: [
              { path, projectId, lastOpened: new Date().toISOString() },
              ...recentFiles,
            ].slice(0, 20), // Keep only 20 recent files
          };
        });
      },

      // Terminal actions
      addTerminalSession: (session) => {
        set((state) => ({
          terminalSessions: {
            ...state.terminalSessions,
            [session.id]: session,
          },
          activeTerminalId: session.id,
        }));
      },

      removeTerminalSession: (sessionId) => {
        set((state) => {
          const { [sessionId]: _, ...remainingSessions } =
            state.terminalSessions;
          const activeTerminalId =
            state.activeTerminalId === sessionId
              ? Object.keys(remainingSessions)[0] || null
              : state.activeTerminalId;

          return {
            terminalSessions: remainingSessions,
            activeTerminalId,
          };
        });
      },

      setActiveTerminal: (sessionId) => set({ activeTerminalId: sessionId }),

      updateTerminalSession: (sessionId, updates) => {
        set((state) => ({
          terminalSessions: {
            ...state.terminalSessions,
            [sessionId]: {
              ...state.terminalSessions[sessionId],
              ...updates,
            },
          },
        }));
      },

      // Layout actions
      setFileExplorerWidth: (width) => {
        set((state) => ({
          layoutConfig: {
            ...state.layoutConfig,
            fileExplorerWidth: Math.max(200, Math.min(500, width)),
          },
        }));
      },

      setTerminalHeight: (height) => {
        set((state) => ({
          layoutConfig: {
            ...state.layoutConfig,
            terminalHeight: Math.max(150, Math.min(800, height)),
          },
        }));
      },

      setRightPanelWidth: (width) => {
        set((state) => ({
          layoutConfig: {
            ...state.layoutConfig,
            rightPanelWidth: Math.max(200, Math.min(500, width)),
          },
        }));
      },

      toggleFileExplorer: () => {
        set((state) => ({
          layoutConfig: {
            ...state.layoutConfig,
            showFileExplorer: !state.layoutConfig.showFileExplorer,
          },
        }));
      },

      toggleTerminal: () => {
        set((state) => ({
          layoutConfig: {
            ...state.layoutConfig,
            showTerminal: !state.layoutConfig.showTerminal,
          },
        }));
      },

      toggleRightPanel: () => {
        set((state) => ({
          layoutConfig: {
            ...state.layoutConfig,
            showRightPanel: !state.layoutConfig.showRightPanel,
          },
        }));
      },

      // Git actions
      updateGitState: (projectId, gitState) => {
        set((state) => ({
          gitState: {
            ...state.gitState,
            [projectId]: gitState,
          },
        }));
      },

      // Search actions
      setSearchQuery: (query) => set({ searchQuery: query }),
      setSearchResults: (results) => set({ searchResults: results }),
      updateSearchFilters: (filters) => {
        set((state) => ({
          searchFilters: {
            ...state.searchFilters,
            ...filters,
          },
        }));
      },
      clearSearch: () =>
        set({ searchQuery: "", searchResults: [], searchFilters: {} }),
    }),
    {
      name: "workspace-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        activeProjectId: state.activeProjectId,
        expandedFolders: Array.from(state.expandedFolders), // Convert Set to Array for serialization
        recentFiles: state.recentFiles,
        layoutConfig: state.layoutConfig,
      }),
      onRehydrateStorage: () => (state) => {
        // Convert Array back to Set after rehydration
        if (state && Array.isArray(state.expandedFolders)) {
          state.expandedFolders = new Set(state.expandedFolders as string[]);
        }
      },
    },
  ),
);
```

### 5. Terminal Store

```typescript
// /src/store/terminal.store.ts
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { terminalWs } from "@/services/websocket/terminal.ws";

interface TerminalState {
  // Session management
  sessions: { [sessionId: string]: TerminalSession };
  activeSessionId: string | null;

  // Connection state
  isConnected: boolean;
  connectionError: string | null;

  // Terminal output buffers
  outputBuffers: { [sessionId: string]: string[] };
  commandHistory: { [sessionId: string]: string[] };

  // UI state
  dimensions: { [sessionId: string]: { cols: number; rows: number } };
  focusedSessionId: string | null;

  // Actions
  createSession: (
    projectId: string,
    type: "system" | "claude",
    name?: string,
  ) => Promise<string>;
  closeSession: (sessionId: string) => void;
  setActiveSession: (sessionId: string) => void;
  sendInput: (sessionId: string, input: string) => void;
  resizeTerminal: (sessionId: string, cols: number, rows: number) => void;
  clearBuffer: (sessionId: string) => void;
  addToHistory: (sessionId: string, command: string) => void;
  setFocused: (sessionId: string | null) => void;

  // WebSocket management
  connectWebSocket: () => Promise<void>;
  disconnectWebSocket: () => void;

  // Output management
  appendOutput: (sessionId: string, output: string) => void;
  getSessionOutput: (sessionId: string) => string;
}

export const useTerminalStore = create<TerminalState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    sessions: {},
    activeSessionId: null,
    isConnected: false,
    connectionError: null,
    outputBuffers: {},
    commandHistory: {},
    dimensions: {},
    focusedSessionId: null,

    // Session management
    createSession: async (projectId, type, name) => {
      try {
        // Create session via API
        const session = await terminalService.createSession({
          projectId,
          type,
          name: name || `Terminal ${type}`,
        });

        // Add to local state
        set((state) => ({
          sessions: {
            ...state.sessions,
            [session.id]: session,
          },
          outputBuffers: {
            ...state.outputBuffers,
            [session.id]: [],
          },
          commandHistory: {
            ...state.commandHistory,
            [session.id]: [],
          },
          dimensions: {
            ...state.dimensions,
            [session.id]: { cols: 80, rows: 24 },
          },
          activeSessionId: session.id,
        }));

        // Join WebSocket room for this session
        if (get().isConnected) {
          terminalWs.joinSession(session.id, projectId);
        }

        return session.id;
      } catch (error: any) {
        console.error("Failed to create terminal session:", error);
        useUIStore.getState().addToast({
          type: "error",
          title: "Terminal Error",
          message: error.message || "Failed to create terminal session",
        });
        throw error;
      }
    },

    closeSession: (sessionId) => {
      const session = get().sessions[sessionId];
      if (!session) return;

      // Close session via API
      terminalService.closeSession(sessionId).catch((error) => {
        console.error("Failed to close terminal session:", error);
      });

      // Leave WebSocket room
      if (get().isConnected) {
        terminalWs.leaveSession(sessionId);
      }

      // Remove from local state
      set((state) => {
        const { [sessionId]: _, ...remainingSessions } = state.sessions;
        const { [sessionId]: __, ...remainingBuffers } = state.outputBuffers;
        const { [sessionId]: ___, ...remainingHistory } = state.commandHistory;
        const { [sessionId]: ____, ...remainingDimensions } = state.dimensions;

        const activeSessionId =
          state.activeSessionId === sessionId
            ? Object.keys(remainingSessions)[0] || null
            : state.activeSessionId;

        const focusedSessionId =
          state.focusedSessionId === sessionId
            ? activeSessionId
            : state.focusedSessionId;

        return {
          sessions: remainingSessions,
          outputBuffers: remainingBuffers,
          commandHistory: remainingHistory,
          dimensions: remainingDimensions,
          activeSessionId,
          focusedSessionId,
        };
      });
    },

    setActiveSession: (sessionId) => {
      const session = get().sessions[sessionId];
      if (session) {
        set({ activeSessionId: sessionId });

        // Update workspace store
        useWorkspaceStore.getState().setActiveTerminal(sessionId);
      }
    },

    sendInput: (sessionId, input) => {
      const session = get().sessions[sessionId];
      if (!session || !get().isConnected) return;

      // Send via WebSocket
      terminalWs.sendInput(sessionId, input);

      // Add to command history if it's a complete command (ends with \n)
      if (input.endsWith("\n")) {
        const command = input.slice(0, -1); // Remove newline
        if (command.trim()) {
          get().addToHistory(sessionId, command);
        }
      }
    },

    resizeTerminal: (sessionId, cols, rows) => {
      // Update local dimensions
      set((state) => ({
        dimensions: {
          ...state.dimensions,
          [sessionId]: { cols, rows },
        },
      }));

      // Send resize via WebSocket
      if (get().isConnected) {
        terminalWs.resizeTerminal(sessionId, cols, rows);
      }

      // Update via API
      terminalService.resizeSession(sessionId, cols, rows).catch((error) => {
        console.error("Failed to resize terminal:", error);
      });
    },

    clearBuffer: (sessionId) => {
      set((state) => ({
        outputBuffers: {
          ...state.outputBuffers,
          [sessionId]: [],
        },
      }));
    },

    addToHistory: (sessionId, command) => {
      set((state) => {
        const history = state.commandHistory[sessionId] || [];
        const newHistory = [
          command,
          ...history.filter((cmd) => cmd !== command),
        ].slice(0, 100);

        return {
          commandHistory: {
            ...state.commandHistory,
            [sessionId]: newHistory,
          },
        };
      });
    },

    setFocused: (sessionId) => set({ focusedSessionId: sessionId }),

    // WebSocket management
    connectWebSocket: async () => {
      try {
        await terminalWs.connect();

        set({ isConnected: true, connectionError: null });

        // Setup event handlers
        terminalWs.onOutput((sessionId, output) => {
          get().appendOutput(sessionId, output);
        });

        terminalWs.onSessionStatus((sessionId, status) => {
          set((state) => {
            const session = state.sessions[sessionId];
            if (session) {
              return {
                sessions: {
                  ...state.sessions,
                  [sessionId]: {
                    ...session,
                    status: status as TerminalSession["status"],
                  },
                },
              };
            }
            return state;
          });
        });

        terminalWs.onError((error) => {
          console.error("Terminal WebSocket error:", error);
          useUIStore.getState().addToast({
            type: "error",
            title: "Terminal Connection Error",
            message: "Lost connection to terminal service",
          });
        });

        // Rejoin existing sessions
        const sessionIds = Object.keys(get().sessions);
        for (const sessionId of sessionIds) {
          const session = get().sessions[sessionId];
          if (session) {
            terminalWs.joinSession(sessionId, session.projectId);
          }
        }
      } catch (error: any) {
        set({
          isConnected: false,
          connectionError:
            error.message || "Failed to connect to terminal service",
        });

        useUIStore.getState().addToast({
          type: "error",
          title: "Terminal Connection Failed",
          message: error.message || "Failed to connect to terminal service",
        });
      }
    },

    disconnectWebSocket: () => {
      terminalWs.disconnect();
      set({ isConnected: false, connectionError: null });
    },

    // Output management
    appendOutput: (sessionId, output) => {
      set((state) => {
        const buffer = state.outputBuffers[sessionId] || [];
        const newBuffer = [...buffer, output];

        // Keep buffer size manageable (max 1000 lines)
        const trimmedBuffer =
          newBuffer.length > 1000 ? newBuffer.slice(-1000) : newBuffer;

        return {
          outputBuffers: {
            ...state.outputBuffers,
            [sessionId]: trimmedBuffer,
          },
        };
      });
    },

    getSessionOutput: (sessionId) => {
      const buffer = get().outputBuffers[sessionId] || [];
      return buffer.join("");
    },
  })),
);

// Auto-connect WebSocket when user is authenticated
useAuthStore.subscribe(
  (state) => state.isAuthenticated,
  (isAuthenticated) => {
    if (isAuthenticated) {
      const terminalStore = useTerminalStore.getState();
      if (!terminalStore.isConnected) {
        terminalStore.connectWebSocket();
      }
    } else {
      useTerminalStore.getState().disconnectWebSocket();
    }
  },
);
```

### 6. Chat Store

```typescript
// /src/store/chat.store.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { chatWs } from "@/services/websocket/chat.ws";

interface ChatState {
  // Conversations
  conversations: { [conversationId: string]: Conversation };
  activeConversationId: string | null;

  // Folders
  folders: { [folderId: string]: Folder };

  // Real-time state
  isConnected: boolean;
  typingUsers: { [conversationId: string]: string[] };

  // Streaming state
  streamingMessages: {
    [conversationId: string]: {
      messageId: string;
      content: string;
      isComplete: boolean;
    };
  };

  // UI state
  selectedFolderId: string | null;
  searchQuery: string;
  searchResults: SearchResult[];

  // Actions
  setActiveConversation: (conversationId: string | null) => void;
  addConversation: (conversation: Conversation) => void;
  updateConversation: (
    conversationId: string,
    updates: Partial<Conversation>,
  ) => void;
  removeConversation: (conversationId: string) => void;

  // Message actions
  addMessage: (conversationId: string, message: Message) => void;
  updateMessage: (
    conversationId: string,
    messageId: string,
    updates: Partial<Message>,
  ) => void;

  // Folder actions
  addFolder: (folder: Folder) => void;
  updateFolder: (folderId: string, updates: Partial<Folder>) => void;
  removeFolder: (folderId: string) => void;
  setSelectedFolder: (folderId: string | null) => void;

  // Streaming actions
  startStreaming: (conversationId: string, messageId: string) => void;
  appendStreamContent: (conversationId: string, content: string) => void;
  completeStreaming: (conversationId: string) => void;

  // Search actions
  setSearchQuery: (query: string) => void;
  setSearchResults: (results: SearchResult[]) => void;
  clearSearch: () => void;

  // WebSocket management
  connectWebSocket: () => Promise<void>;
  disconnectWebSocket: () => void;
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;

  // Typing indicators
  startTyping: (conversationId: string) => void;
  stopTyping: (conversationId: string) => void;
  setTypingUsers: (conversationId: string, users: string[]) => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      // Initial state
      conversations: {},
      activeConversationId: null,
      folders: {},
      isConnected: false,
      typingUsers: {},
      streamingMessages: {},
      selectedFolderId: null,
      searchQuery: "",
      searchResults: [],

      // Conversation actions
      setActiveConversation: (conversationId) => {
        const currentId = get().activeConversationId;

        // Leave current conversation
        if (currentId && get().isConnected) {
          get().leaveConversation(currentId);
        }

        // Join new conversation
        if (conversationId && get().isConnected) {
          get().joinConversation(conversationId);
        }

        set({ activeConversationId: conversationId });
      },

      addConversation: (conversation) => {
        set((state) => ({
          conversations: {
            ...state.conversations,
            [conversation.id]: conversation,
          },
        }));
      },

      updateConversation: (conversationId, updates) => {
        set((state) => {
          const conversation = state.conversations[conversationId];
          if (conversation) {
            return {
              conversations: {
                ...state.conversations,
                [conversationId]: {
                  ...conversation,
                  ...updates,
                },
              },
            };
          }
          return state;
        });
      },

      removeConversation: (conversationId) => {
        set((state) => {
          const { [conversationId]: _, ...remainingConversations } =
            state.conversations;
          const activeConversationId =
            state.activeConversationId === conversationId
              ? null
              : state.activeConversationId;

          return {
            conversations: remainingConversations,
            activeConversationId,
          };
        });
      },

      // Message actions
      addMessage: (conversationId, message) => {
        set((state) => {
          const conversation = state.conversations[conversationId];
          if (conversation) {
            return {
              conversations: {
                ...state.conversations,
                [conversationId]: {
                  ...conversation,
                  messages: [...conversation.messages, message],
                  updatedAt: new Date().toISOString(),
                },
              },
            };
          }
          return state;
        });
      },

      updateMessage: (conversationId, messageId, updates) => {
        set((state) => {
          const conversation = state.conversations[conversationId];
          if (conversation) {
            const messageIndex = conversation.messages.findIndex(
              (m) => m.id === messageId,
            );
            if (messageIndex >= 0) {
              const updatedMessages = [...conversation.messages];
              updatedMessages[messageIndex] = {
                ...updatedMessages[messageIndex],
                ...updates,
              };

              return {
                conversations: {
                  ...state.conversations,
                  [conversationId]: {
                    ...conversation,
                    messages: updatedMessages,
                  },
                },
              };
            }
          }
          return state;
        });
      },

      // Folder actions
      addFolder: (folder) => {
        set((state) => ({
          folders: {
            ...state.folders,
            [folder.id]: folder,
          },
        }));
      },

      updateFolder: (folderId, updates) => {
        set((state) => {
          const folder = state.folders[folderId];
          if (folder) {
            return {
              folders: {
                ...state.folders,
                [folderId]: {
                  ...folder,
                  ...updates,
                },
              },
            };
          }
          return state;
        });
      },

      removeFolder: (folderId) => {
        set((state) => {
          const { [folderId]: _, ...remainingFolders } = state.folders;
          return { folders: remainingFolders };
        });
      },

      setSelectedFolder: (folderId) => set({ selectedFolderId: folderId }),

      // Streaming actions
      startStreaming: (conversationId, messageId) => {
        set((state) => ({
          streamingMessages: {
            ...state.streamingMessages,
            [conversationId]: {
              messageId,
              content: "",
              isComplete: false,
            },
          },
        }));
      },

      appendStreamContent: (conversationId, content) => {
        set((state) => {
          const streaming = state.streamingMessages[conversationId];
          if (streaming) {
            return {
              streamingMessages: {
                ...state.streamingMessages,
                [conversationId]: {
                  ...streaming,
                  content: streaming.content + content,
                },
              },
            };
          }
          return state;
        });
      },

      completeStreaming: (conversationId) => {
        set((state) => {
          const streaming = state.streamingMessages[conversationId];
          if (streaming) {
            // Update the message with final content
            get().updateMessage(conversationId, streaming.messageId, {
              content: streaming.content,
            });

            // Remove from streaming state
            const { [conversationId]: _, ...remainingStreaming } =
              state.streamingMessages;
            return { streamingMessages: remainingStreaming };
          }
          return state;
        });
      },

      // Search actions
      setSearchQuery: (query) => set({ searchQuery: query }),
      setSearchResults: (results) => set({ searchResults: results }),
      clearSearch: () => set({ searchQuery: "", searchResults: [] }),

      // WebSocket management
      connectWebSocket: async () => {
        try {
          await chatWs.connect();

          set({ isConnected: true });

          // Setup event handlers
          chatWs.onMessageChunk((conversationId, chunk) => {
            get().appendStreamContent(conversationId, chunk);
          });

          chatWs.onMessageComplete((conversationId, messageId) => {
            get().completeStreaming(conversationId);
          });

          chatWs.onTyping((conversationId, isTyping) => {
            // Handle typing indicators from other users
            // This is more relevant for multi-user conversations
          });

          // Rejoin active conversation
          const activeConversationId = get().activeConversationId;
          if (activeConversationId) {
            chatWs.joinConversation(activeConversationId);
          }
        } catch (error: any) {
          console.error("Failed to connect chat WebSocket:", error);
          useUIStore.getState().addToast({
            type: "error",
            title: "Chat Connection Failed",
            message: "Failed to connect to chat service",
          });
        }
      },

      disconnectWebSocket: () => {
        chatWs.disconnect();
        set({ isConnected: false });
      },

      joinConversation: (conversationId) => {
        if (get().isConnected) {
          chatWs.joinConversation(conversationId);
        }
      },

      leaveConversation: (conversationId) => {
        if (get().isConnected) {
          chatWs.leaveConversation(conversationId);
        }
      },

      // Typing indicators
      startTyping: (conversationId) => {
        if (get().isConnected) {
          chatWs.startTyping(conversationId);
        }
      },

      stopTyping: (conversationId) => {
        if (get().isConnected) {
          chatWs.stopTyping(conversationId);
        }
      },

      setTypingUsers: (conversationId, users) => {
        set((state) => ({
          typingUsers: {
            ...state.typingUsers,
            [conversationId]: users,
          },
        }));
      },
    }),
    {
      name: "chat-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        conversations: state.conversations,
        folders: state.folders,
        selectedFolderId: state.selectedFolderId,
      }),
    },
  ),
);

// Auto-connect WebSocket when user is authenticated
useAuthStore.subscribe(
  (state) => state.isAuthenticated,
  (isAuthenticated) => {
    if (isAuthenticated) {
      const chatStore = useChatStore.getState();
      if (!chatStore.isConnected) {
        chatStore.connectWebSocket();
      }
    } else {
      useChatStore.getState().disconnectWebSocket();
    }
  },
);
```

---

## React Query Configuration

### Query Client Setup

```typescript
// /src/lib/queryClient.ts
import { QueryClient, QueryCache, MutationCache } from "@tanstack/react-query";
import { useUIStore } from "@/store/ui.store";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: (failureCount, error: any) => {
        // Don't retry on auth errors
        if (error?.code === "UNAUTHORIZED") return false;

        // Retry up to 3 times for other errors
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
      onError: (error: any) => {
        // Global error handling for mutations
        useUIStore.getState().addToast({
          type: "error",
          title: "Operation Failed",
          message: error.message || "An unexpected error occurred",
        });
      },
    },
  },
  queryCache: new QueryCache({
    onError: (error: any, query) => {
      // Global error handling for queries
      if (error?.code !== "UNAUTHORIZED") {
        console.error("Query error:", error, query);

        useUIStore.getState().addToast({
          type: "error",
          title: "Data Loading Failed",
          message: error.message || "Failed to load data",
        });
      }
    },
  }),
  mutationCache: new MutationCache({
    onSuccess: (data: any, variables, context, mutation) => {
      // Global success handling for mutations
      if (mutation.options.meta?.successMessage) {
        useUIStore.getState().addToast({
          type: "success",
          title: "Success",
          message: mutation.options.meta.successMessage,
        });
      }
    },
  }),
});

// Query key factory
export const queryKeys = {
  // Auth
  currentUser: () => ["auth", "currentUser"] as const,
  userPreferences: () => ["auth", "preferences"] as const,

  // Portfolios
  portfolios: () => ["portfolios"] as const,
  portfolio: (portfolioId: string) => ["portfolios", portfolioId] as const,
  portfolioMetrics: (portfolioId: string) =>
    ["portfolios", portfolioId, "metrics"] as const,
  portfolioPerformance: (portfolioId: string, period: string) =>
    ["portfolios", portfolioId, "performance", period] as const,
  portfolioTransactions: (portfolioId: string, params?: any) =>
    ["portfolios", portfolioId, "transactions", params] as const,

  // Stocks
  stock: (symbol: string) => ["stocks", symbol] as const,
  stockSearch: (query: string) => ["stocks", "search", query] as const,
  multipleStocks: (symbols: string[]) => ["stocks", "batch", symbols] as const,

  // Workspace
  projects: () => ["workspace", "projects"] as const,
  project: (projectId: string) => ["workspace", "projects", projectId] as const,
  projectFiles: (projectId: string, path?: string) =>
    ["workspace", "projects", projectId, "files", path] as const,
  fileContent: (projectId: string, filePath: string) =>
    ["workspace", "projects", projectId, "files", "content", filePath] as const,
  gitStatus: (projectId: string) =>
    ["workspace", "projects", projectId, "git", "status"] as const,
  gitBranches: (projectId: string) =>
    ["workspace", "projects", projectId, "git", "branches"] as const,

  // Terminal
  terminalSessions: (projectId?: string) =>
    ["terminal", "sessions", projectId] as const,
  terminalSession: (sessionId: string) =>
    ["terminal", "sessions", sessionId] as const,
  terminalHistory: (sessionId: string, params?: any) =>
    ["terminal", "sessions", sessionId, "history", params] as const,
  terminalStats: () => ["terminal", "stats"] as const,

  // AI Chat
  conversations: (folderId?: string) =>
    ["chat", "conversations", folderId] as const,
  conversation: (conversationId: string) =>
    ["chat", "conversations", conversationId] as const,
  chatFolders: () => ["chat", "folders"] as const,
  chatSearch: (query: string, filters?: any) =>
    ["chat", "search", query, filters] as const,
} as const;

// Optimistic update helpers
export const optimisticUpdates = {
  updatePortfolio: (portfolioId: string, updates: any) => {
    queryClient.setQueryData(queryKeys.portfolio(portfolioId), (old: any) =>
      old ? { ...old, ...updates } : undefined,
    );
  },

  addTransaction: (portfolioId: string, transaction: any) => {
    queryClient.setQueryData(
      queryKeys.portfolioTransactions(portfolioId),
      (old: any) => (old ? [transaction, ...old] : [transaction]),
    );
  },

  updateFileContent: (projectId: string, filePath: string, content: string) => {
    queryClient.setQueryData(
      queryKeys.fileContent(projectId, filePath),
      content,
    );
  },

  addMessage: (conversationId: string, message: any) => {
    queryClient.setQueryData(
      queryKeys.conversation(conversationId),
      (old: any) =>
        old
          ? {
              ...old,
              messages: [...old.messages, message],
            }
          : undefined,
    );
  },
};

// WebSocket invalidation helpers
export const websocketInvalidations = {
  onPriceUpdate: (symbol: string) => {
    queryClient.invalidateQueries(queryKeys.stock(symbol));
    queryClient.invalidateQueries(queryKeys.portfolios());
  },

  onPortfolioUpdate: (portfolioId: string) => {
    queryClient.invalidateQueries(queryKeys.portfolio(portfolioId));
    queryClient.invalidateQueries(queryKeys.portfolioMetrics(portfolioId));
  },

  onTradeExecuted: (portfolioId: string) => {
    queryClient.invalidateQueries(queryKeys.portfolio(portfolioId));
    queryClient.invalidateQueries(queryKeys.portfolioTransactions(portfolioId));
    queryClient.invalidateQueries(queryKeys.portfolioMetrics(portfolioId));
  },

  onFileChanged: (projectId: string, filePath: string) => {
    queryClient.invalidateQueries(queryKeys.projectFiles(projectId));
    queryClient.invalidateQueries(queryKeys.fileContent(projectId, filePath));
    queryClient.invalidateQueries(queryKeys.gitStatus(projectId));
  },

  onGitStatusChanged: (projectId: string) => {
    queryClient.invalidateQueries(queryKeys.gitStatus(projectId));
    queryClient.invalidateQueries(queryKeys.gitBranches(projectId));
  },
};
```

### Query Provider Setup

```typescript
// /src/providers/QueryProvider.tsx
'use client';

import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from '@/lib/queryClient';

interface QueryProviderProps {
  children: React.ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools
          initialIsOpen={false}
          position="bottom-right"
          buttonPosition="bottom-right"
        />
      )}
    </QueryClientProvider>
  );
}
```

---

## State Synchronization Patterns

### WebSocket State Integration

```typescript
// /src/hooks/useRealtimeSync.ts
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { usePortfolioStore } from "@/store/portfolio.store";
import { useChatStore } from "@/store/chat.store";
import { useTerminalStore } from "@/store/terminal.store";
import { useAuthStore } from "@/store/auth.store";
import { websocketInvalidations } from "@/lib/queryClient";

export function useRealtimeSync() {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const portfolioStore = usePortfolioStore();
  const chatStore = useChatStore();
  const terminalStore = useTerminalStore();

  useEffect(() => {
    if (!isAuthenticated) return;

    // Connect all WebSocket services
    const connectServices = async () => {
      try {
        await Promise.all([
          portfolioStore.connectWebSocket(),
          chatStore.connectWebSocket(),
          terminalStore.connectWebSocket(),
        ]);
      } catch (error) {
        console.error("Failed to connect WebSocket services:", error);
      }
    };

    connectServices();

    // Cleanup on unmount or logout
    return () => {
      portfolioStore.disconnectWebSocket();
      chatStore.disconnectWebSocket();
      terminalStore.disconnectWebSocket();
    };
  }, [isAuthenticated]);

  // Setup WebSocket invalidations
  useEffect(() => {
    // Portfolio WebSocket invalidations
    const unsubscribePriceUpdate = portfolioStore.subscribeToRealtimePrices(
      (symbol, priceData) => {
        websocketInvalidations.onPriceUpdate(symbol);
      },
    );

    const unsubscribePortfolioUpdate =
      portfolioStore.subscribeToPortfolioUpdates((portfolioId, updates) => {
        websocketInvalidations.onPortfolioUpdate(portfolioId);
      });

    const unsubscribeTradeExecuted = portfolioStore.subscribeToTradeExecuted(
      (portfolioId, trade) => {
        websocketInvalidations.onTradeExecuted(portfolioId);
      },
    );

    return () => {
      unsubscribePriceUpdate();
      unsubscribePortfolioUpdate();
      unsubscribeTradeExecuted();
    };
  }, []);
}
```

### Optimistic Updates Pattern

```typescript
// /src/hooks/useOptimisticMutation.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useUIStore } from "@/store/ui.store";

interface OptimisticMutationOptions<TData, TVariables> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  onOptimisticUpdate?: (variables: TVariables) => void;
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: any, variables: TVariables) => void;
  invalidateQueries?: string[][];
  successMessage?: string;
  errorMessage?: string;
}

export function useOptimisticMutation<TData, TVariables>({
  mutationFn,
  onOptimisticUpdate,
  onSuccess,
  onError,
  invalidateQueries = [],
  successMessage,
  errorMessage,
}: OptimisticMutationOptions<TData, TVariables>) {
  const queryClient = useQueryClient();
  const addToast = useUIStore((state) => state.addToast);

  return useMutation({
    mutationFn,
    onMutate: async (variables) => {
      // Apply optimistic update
      if (onOptimisticUpdate) {
        onOptimisticUpdate(variables);
      }

      // Cancel outgoing refetches
      const cancelPromises = invalidateQueries.map((queryKey) =>
        queryClient.cancelQueries(queryKey),
      );
      await Promise.all(cancelPromises);

      // Snapshot previous values for rollback
      const previousData = invalidateQueries.map((queryKey) => ({
        queryKey,
        data: queryClient.getQueryData(queryKey),
      }));

      return { previousData };
    },
    onSuccess: (data, variables, context) => {
      // Invalidate and refetch
      invalidateQueries.forEach((queryKey) => {
        queryClient.invalidateQueries(queryKey);
      });

      if (onSuccess) {
        onSuccess(data, variables);
      }

      if (successMessage) {
        addToast({
          type: "success",
          title: "Success",
          message: successMessage,
        });
      }
    },
    onError: (error: any, variables, context) => {
      // Rollback optimistic updates
      if (context?.previousData) {
        context.previousData.forEach(({ queryKey, data }) => {
          queryClient.setQueryData(queryKey, data);
        });
      }

      if (onError) {
        onError(error, variables);
      }

      addToast({
        type: "error",
        title: "Error",
        message: errorMessage || error.message || "Operation failed",
      });
    },
    onSettled: () => {
      // Always refetch after error or success
      invalidateQueries.forEach((queryKey) => {
        queryClient.invalidateQueries(queryKey);
      });
    },
  });
}
```

---

This comprehensive state management plan provides a robust foundation for managing both client-side state with Zustand and server state with React Query, while integrating real-time updates via WebSocket connections. The architecture ensures type safety, performance optimization, and seamless data synchronization across all application modules.
