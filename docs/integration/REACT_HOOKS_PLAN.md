# React Hooks Integration Plan

## Stock Portfolio Management System v3.0

### Document Information

- **Version**: 1.0
- **Date**: 2025-08-15
- **Agent**: System Analyst
- **Project**: Stock Portfolio Management System v3.0
- **Document Type**: React Hooks Architecture
- **Status**: Final
- **Dependencies**: State Management Plan, UI-API Integration Plan

---

## Executive Summary

This document defines the comprehensive React Hooks architecture for seamless integration between UI components and backend services. The hooks provide a consistent, type-safe, and performant interface for data fetching, real-time updates, and user interactions across all application modules.

### Key Hook Objectives

- **Unified Data Access**: Consistent patterns for API interactions
- **Real-time Integration**: WebSocket-based live updates
- **Type Safety**: Complete TypeScript support for all hooks
- **Performance Optimization**: Caching, deduplication, and selective updates
- **Error Handling**: Robust error management with user feedback
- **State Synchronization**: Seamless integration with Zustand stores

---

## Hook Architecture Overview

### Hook Categories

```typescript
// Hook Architecture Structure
┌─────────────────────────────────────────────────────────────┐
│                     CUSTOM HOOKS LAYER                      │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────┐ │
│  │    API      │ │  WebSocket  │ │    UI       │ │  Store  │ │
│  │   Hooks     │ │   Hooks     │ │  Hooks      │ │ Hooks   │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                  REACT QUERY + ZUSTAND                     │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────┐ │
│  │   useQuery  │ │useMutation  │ │useStore     │ │ Custom  │ │
│  │             │ │             │ │             │ │Selectors│ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                   SERVICE LAYER                            │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────┐ │
│  │   API       │ │  WebSocket  │ │   Zustand   │ │ React   │ │
│  │ Services    │ │ Managers    │ │   Stores    │ │ Query   │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## API Integration Hooks

### 1. Authentication Hooks

```typescript
// /src/hooks/api/useAuth.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth.store";
import { authService } from "@/services/api/auth.service";
import { queryKeys } from "@/lib/queryClient";

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  acceptTerms: boolean;
}

export function useAuth() {
  const queryClient = useQueryClient();
  const {
    user,
    isAuthenticated,
    isLoading,
    error,
    login: storeLogin,
    logout: storeLogout,
    setUser,
    clearError,
  } = useAuthStore();

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: ({ email, password, rememberMe }: LoginCredentials) =>
      authService.login({ email, password, rememberMe }),
    onSuccess: (data) => {
      setUser(data.user);
      queryClient.invalidateQueries(queryKeys.currentUser());
    },
    onError: (error: any) => {
      console.error("Login failed:", error);
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: () => authService.logout(),
    onSuccess: () => {
      storeLogout();
      queryClient.clear(); // Clear all cached data on logout
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: (data: RegisterData) => authService.register(data),
  });

  // Current user query
  const userQuery = useQuery({
    queryKey: queryKeys.currentUser(),
    queryFn: () => authService.getCurrentUser(),
    enabled: isAuthenticated && !user,
    onSuccess: (userData) => {
      setUser(userData);
    },
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: (updates: Partial<User>) => authService.updateProfile(updates),
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      queryClient.setQueryData(queryKeys.currentUser(), updatedUser);
    },
  });

  // Update preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: (preferences: Partial<UserPreferences>) =>
      authService.updatePreferences(preferences),
    onSuccess: (updatedPreferences) => {
      if (user) {
        const updatedUser = {
          ...user,
          preferences: { ...user.preferences, ...updatedPreferences },
        };
        setUser(updatedUser);
      }
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: ({
      currentPassword,
      newPassword,
    }: {
      currentPassword: string;
      newPassword: string;
    }) => authService.changePassword(currentPassword, newPassword),
  });

  return {
    // State
    user,
    isAuthenticated,
    isLoading: isLoading || userQuery.isLoading,
    error: error || userQuery.error || loginMutation.error,

    // Actions
    login: loginMutation.mutate,
    logout: logoutMutation.mutate,
    register: registerMutation.mutate,
    updateProfile: updateProfileMutation.mutate,
    updatePreferences: updatePreferencesMutation.mutate,
    changePassword: changePasswordMutation.mutate,
    clearError,

    // Mutation states
    isLoggingIn: loginMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
    isRegistering: registerMutation.isPending,
    isUpdatingProfile: updateProfileMutation.isPending,
    isUpdatingPreferences: updatePreferencesMutation.isPending,
    isChangingPassword: changePasswordMutation.isPending,

    // Utils
    hasRole: (role: string) => user?.roles.includes(role) ?? false,
    getFullName: () => (user ? `${user.firstName} ${user.lastName}` : ""),
  };
}

// Simplified auth check hook
export function useAuthGuard() {
  const { isAuthenticated, isLoading } = useAuth();

  return {
    isAuthenticated,
    isLoading,
    isReady: !isLoading,
    requireAuth: () => {
      if (!isLoading && !isAuthenticated) {
        throw new Error("Authentication required");
      }
    },
  };
}
```

### 2. Portfolio Hooks

```typescript
// /src/hooks/api/usePortfolio.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePortfolioStore } from "@/store/portfolio.store";
import { portfolioService } from "@/services/api/portfolio.service";
import { queryKeys } from "@/lib/queryClient";
import { useOptimisticMutation } from "@/hooks/useOptimisticMutation";

export function usePortfolios() {
  const activePortfolioId = usePortfolioStore(
    (state) => state.activePortfolioId,
  );
  const setActivePortfolio = usePortfolioStore(
    (state) => state.setActivePortfolio,
  );

  const portfoliosQuery = useQuery({
    queryKey: queryKeys.portfolios(),
    queryFn: () => portfolioService.getPortfolios(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const createPortfolioMutation = useMutation({
    mutationFn: (data: CreatePortfolioRequest) =>
      portfolioService.createPortfolio(data),
    onSuccess: (newPortfolio) => {
      queryClient.setQueryData(
        queryKeys.portfolios(),
        (old: Portfolio[] | undefined) =>
          old ? [...old, newPortfolio] : [newPortfolio],
      );
      setActivePortfolio(newPortfolio.id);
    },
  });

  const deletePortfolioMutation = useMutation({
    mutationFn: (portfolioId: string) =>
      portfolioService.deletePortfolio(portfolioId),
    onSuccess: (_, portfolioId) => {
      queryClient.setQueryData(
        queryKeys.portfolios(),
        (old: Portfolio[] | undefined) =>
          old ? old.filter((p) => p.id !== portfolioId) : [],
      );

      if (activePortfolioId === portfolioId) {
        setActivePortfolio(null);
      }
    },
  });

  return {
    portfolios: portfoliosQuery.data || [],
    isLoading: portfoliosQuery.isLoading,
    error: portfoliosQuery.error,
    activePortfolioId,

    // Actions
    createPortfolio: createPortfolioMutation.mutate,
    deletePortfolio: deletePortfolioMutation.mutate,
    setActivePortfolio,

    // Mutation states
    isCreating: createPortfolioMutation.isPending,
    isDeleting: deletePortfolioMutation.isPending,

    // Utils
    refetch: portfoliosQuery.refetch,
    getPortfolioById: (id: string) =>
      portfoliosQuery.data?.find((p) => p.id === id),
  };
}

export function usePortfolio(portfolioId: string | null) {
  const queryClient = useQueryClient();
  const portfolioStore = usePortfolioStore();

  const portfolioQuery = useQuery({
    queryKey: queryKeys.portfolio(portfolioId!),
    queryFn: () => portfolioService.getPortfolio(portfolioId!),
    enabled: !!portfolioId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const metricsQuery = useQuery({
    queryKey: queryKeys.portfolioMetrics(portfolioId!),
    queryFn: () => portfolioService.getPortfolioMetrics(portfolioId!),
    enabled: !!portfolioId,
    staleTime: 1 * 60 * 1000, // 1 minute
  });

  const updatePortfolioMutation = useOptimisticMutation({
    mutationFn: (updates: Partial<CreatePortfolioRequest>) =>
      portfolioService.updatePortfolio(portfolioId!, updates),
    onOptimisticUpdate: (updates) => {
      if (portfolioId) {
        queryClient.setQueryData(
          queryKeys.portfolio(portfolioId),
          (old: Portfolio | undefined) =>
            old ? { ...old, ...updates } : undefined,
        );
      }
    },
    invalidateQueries: [
      queryKeys.portfolio(portfolioId!),
      queryKeys.portfolios(),
    ],
    successMessage: "Portfolio updated successfully",
  });

  const tradeExecutionMutation = useOptimisticMutation({
    mutationFn: (trade: TradeRequest) =>
      portfolioService.executeTrade(portfolioId!, trade),
    onOptimisticUpdate: (trade) => {
      // Add to pending trades
      portfolioStore.addPendingTrade({
        id: `pending_${Date.now()}`,
        portfolioId: portfolioId!,
        ...trade,
        timestamp: new Date().toISOString(),
        commission: 0,
        total: trade.quantity * (trade.price || 0),
      } as Transaction);
    },
    onSuccess: (transaction) => {
      // Remove from pending trades
      portfolioStore.removePendingTrade(`pending_${transaction.id}`);
    },
    invalidateQueries: [
      queryKeys.portfolio(portfolioId!),
      queryKeys.portfolioMetrics(portfolioId!),
      queryKeys.portfolioTransactions(portfolioId!),
    ],
    successMessage: "Trade executed successfully",
  });

  return {
    portfolio: portfolioQuery.data,
    metrics: metricsQuery.data,
    isLoading: portfolioQuery.isLoading || metricsQuery.isLoading,
    error: portfolioQuery.error || metricsQuery.error,

    // Real-time data from store
    realtimeUpdates: portfolioStore.portfolioUpdates[portfolioId!],
    pendingTrades: portfolioStore.pendingTrades.filter(
      (t) => t.portfolioId === portfolioId,
    ),

    // Actions
    updatePortfolio: updatePortfolioMutation.mutate,
    executeTrade: tradeExecutionMutation.mutate,

    // Mutation states
    isUpdating: updatePortfolioMutation.isPending,
    isExecutingTrade: tradeExecutionMutation.isPending,

    // Utils
    refetch: () => {
      portfolioQuery.refetch();
      metricsQuery.refetch();
    },
    getTotalValue: () => {
      const portfolio = portfolioQuery.data;
      const updates = portfolioStore.portfolioUpdates[portfolioId!];
      return updates?.totalValue ?? portfolio?.totalValue ?? 0;
    },
  };
}

export function usePortfolioTransactions(
  portfolioId: string | null,
  options?: {
    limit?: number;
    offset?: number;
  },
) {
  const transactionsQuery = useQuery({
    queryKey: queryKeys.portfolioTransactions(portfolioId!, options),
    queryFn: () =>
      portfolioService.getTransactions(
        portfolioId!,
        options?.limit,
        options?.offset,
      ),
    enabled: !!portfolioId,
    staleTime: 5 * 60 * 1000,
  });

  return {
    transactions: transactionsQuery.data || [],
    isLoading: transactionsQuery.isLoading,
    error: transactionsQuery.error,
    refetch: transactionsQuery.refetch,

    // Utils
    getTransactionsByType: (type: "BUY" | "SELL") =>
      transactionsQuery.data?.filter((t) => t.type === type) || [],
    getTotalCommissions: () =>
      transactionsQuery.data?.reduce((sum, t) => sum + t.commission, 0) || 0,
  };
}

export function usePortfolioPerformance(
  portfolioId: string | null,
  period: PerformancePeriod = "1M",
) {
  const performanceQuery = useQuery({
    queryKey: queryKeys.portfolioPerformance(portfolioId!, period),
    queryFn: () =>
      portfolioService.getPortfolioPerformance(portfolioId!, period),
    enabled: !!portfolioId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  return {
    performance: performanceQuery.data || [],
    isLoading: performanceQuery.isLoading,
    error: performanceQuery.error,
    refetch: performanceQuery.refetch,

    // Utils
    getLatestValue: () => {
      const data = performanceQuery.data;
      return data && data.length > 0 ? data[data.length - 1].value : 0;
    },
    getTotalReturn: () => {
      const data = performanceQuery.data;
      if (!data || data.length < 2) return 0;
      const initial = data[0].value;
      const final = data[data.length - 1].value;
      return ((final - initial) / initial) * 100;
    },
  };
}
```

### 3. Stock Market Hooks

```typescript
// /src/hooks/api/useStocks.ts
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePortfolioStore } from "@/store/portfolio.store";
import { portfolioService } from "@/services/api/portfolio.service";
import { queryKeys } from "@/lib/queryClient";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

export function useStock(symbol: string | null) {
  const portfolioStore = usePortfolioStore();

  const stockQuery = useQuery({
    queryKey: queryKeys.stock(symbol!),
    queryFn: () => portfolioService.getStock(symbol!),
    enabled: !!symbol,
    staleTime: 1 * 60 * 1000, // 1 minute
  });

  // Get real-time price from store
  const realtimePrice = symbol ? portfolioStore.realtimePrices[symbol] : null;

  return {
    stock: stockQuery.data,
    isLoading: stockQuery.isLoading,
    error: stockQuery.error,

    // Real-time data
    realtimePrice,
    currentPrice: realtimePrice?.price ?? stockQuery.data?.currentPrice ?? 0,
    priceChange: realtimePrice?.change ?? stockQuery.data?.change ?? 0,
    priceChangePercent:
      realtimePrice?.changePercent ?? stockQuery.data?.changePercent ?? 0,

    // Utils
    refetch: stockQuery.refetch,
    isStale: !realtimePrice && stockQuery.isStale,
    lastUpdated: realtimePrice?.timestamp ?? stockQuery.dataUpdatedAt,
  };
}

export function useStockSearch(query: string) {
  const debouncedQuery = useDebouncedValue(query, 300);

  const searchQuery = useQuery({
    queryKey: queryKeys.stockSearch(debouncedQuery),
    queryFn: () => portfolioService.searchStocks(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
    staleTime: 5 * 60 * 1000,
  });

  return {
    results: searchQuery.data || [],
    isLoading: searchQuery.isLoading,
    error: searchQuery.error,
    isSearching: debouncedQuery !== query || searchQuery.isFetching,

    // Utils
    hasResults: (searchQuery.data?.length ?? 0) > 0,
    isEmpty: searchQuery.data?.length === 0 && !searchQuery.isLoading,
  };
}

export function useMultipleStocks(symbols: string[]) {
  const portfolioStore = usePortfolioStore();

  const stocksQuery = useQuery({
    queryKey: queryKeys.multipleStocks(symbols),
    queryFn: () => portfolioService.getMultipleStocks(symbols),
    enabled: symbols.length > 0,
    staleTime: 1 * 60 * 1000,
  });

  // Merge with real-time data
  const enrichedStocks =
    stocksQuery.data?.map((stock) => {
      const realtimePrice = portfolioStore.realtimePrices[stock.symbol];
      return {
        ...stock,
        currentPrice: realtimePrice?.price ?? stock.currentPrice,
        change: realtimePrice?.change ?? stock.change,
        changePercent: realtimePrice?.changePercent ?? stock.changePercent,
        lastUpdated: realtimePrice?.timestamp ?? stock.lastUpdated,
      };
    }) ?? [];

  return {
    stocks: enrichedStocks,
    isLoading: stocksQuery.isLoading,
    error: stocksQuery.error,

    // Utils
    getStockBySymbol: (symbol: string) =>
      enrichedStocks.find((s) => s.symbol === symbol),
    refetch: stocksQuery.refetch,
  };
}

export function useWatchlist() {
  const portfolioStore = usePortfolioStore();
  const { watchlistSymbols, addToWatchlist, removeFromWatchlist } =
    portfolioStore;

  const watchlistStocks = useMultipleStocks(watchlistSymbols);

  return {
    ...watchlistStocks,
    symbols: watchlistSymbols,

    // Actions
    addSymbol: (symbol: string) => {
      addToWatchlist(symbol);
    },
    removeSymbol: (symbol: string) => {
      removeFromWatchlist(symbol);
    },
    isInWatchlist: (symbol: string) => watchlistSymbols.includes(symbol),

    // Utils
    isEmpty: watchlistSymbols.length === 0,
    count: watchlistSymbols.length,
  };
}
```

### 4. Workspace Hooks

```typescript
// /src/hooks/api/useWorkspace.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspaceStore } from "@/store/workspace.store";
import { workspaceService } from "@/services/api/workspace.service";
import { queryKeys } from "@/lib/queryClient";
import { useOptimisticMutation } from "@/hooks/useOptimisticMutation";

export function useProjects() {
  const { activeProjectId, setActiveProject } = useWorkspaceStore();

  const projectsQuery = useQuery({
    queryKey: queryKeys.projects(),
    queryFn: () => workspaceService.getProjects(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  const createProjectMutation = useMutation({
    mutationFn: (data: CreateProjectRequest) =>
      workspaceService.createProject(data),
    onSuccess: (newProject) => {
      queryClient.setQueryData(
        queryKeys.projects(),
        (old: Project[] | undefined) =>
          old ? [...old, newProject] : [newProject],
      );
      setActiveProject(newProject.id);
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: (projectId: string) =>
      workspaceService.deleteProject(projectId),
    onSuccess: (_, projectId) => {
      queryClient.setQueryData(
        queryKeys.projects(),
        (old: Project[] | undefined) =>
          old ? old.filter((p) => p.id !== projectId) : [],
      );

      if (activeProjectId === projectId) {
        setActiveProject(null);
      }
    },
  });

  return {
    projects: projectsQuery.data || [],
    isLoading: projectsQuery.isLoading,
    error: projectsQuery.error,
    activeProjectId,

    // Actions
    createProject: createProjectMutation.mutate,
    deleteProject: deleteProjectMutation.mutate,
    setActiveProject,

    // Mutation states
    isCreating: createProjectMutation.isPending,
    isDeleting: deleteProjectMutation.isPending,

    // Utils
    refetch: projectsQuery.refetch,
    getProjectById: (id: string) =>
      projectsQuery.data?.find((p) => p.id === id),
    getActiveProject: () =>
      activeProjectId
        ? projectsQuery.data?.find((p) => p.id === activeProjectId)
        : null,
  };
}

export function useProject(projectId: string | null) {
  const queryClient = useQueryClient();

  const projectQuery = useQuery({
    queryKey: queryKeys.project(projectId!),
    queryFn: () => workspaceService.getProject(projectId!),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });

  const updateProjectMutation = useOptimisticMutation({
    mutationFn: (updates: Partial<Project>) =>
      workspaceService.updateProject(projectId!, updates),
    onOptimisticUpdate: (updates) => {
      if (projectId) {
        queryClient.setQueryData(
          queryKeys.project(projectId),
          (old: Project | undefined) =>
            old ? { ...old, ...updates } : undefined,
        );
      }
    },
    invalidateQueries: [queryKeys.project(projectId!), queryKeys.projects()],
    successMessage: "Project updated successfully",
  });

  return {
    project: projectQuery.data,
    isLoading: projectQuery.isLoading,
    error: projectQuery.error,

    // Actions
    updateProject: updateProjectMutation.mutate,

    // Mutation states
    isUpdating: updateProjectMutation.isPending,

    // Utils
    refetch: projectQuery.refetch,
  };
}

export function useProjectFiles(projectId: string | null, path: string = "/") {
  const queryClient = useQueryClient();
  const workspaceStore = useWorkspaceStore();

  const filesQuery = useQuery({
    queryKey: queryKeys.projectFiles(projectId!, path),
    queryFn: () => workspaceService.getFiles(projectId!, path),
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000,
  });

  const createFileMutation = useOptimisticMutation({
    mutationFn: ({
      filePath,
      content = "",
    }: {
      filePath: string;
      content?: string;
    }) => workspaceService.createFile(projectId!, filePath, content),
    onOptimisticUpdate: ({ filePath }) => {
      const fileName = filePath.split("/").pop() || "";
      const newFile: FileNode = {
        id: `temp_${Date.now()}`,
        name: fileName,
        type: "file",
        path: filePath,
        modifiedAt: new Date().toISOString(),
      };

      queryClient.setQueryData(
        queryKeys.projectFiles(projectId!, path),
        (old: FileNode[] | undefined) => (old ? [...old, newFile] : [newFile]),
      );
    },
    invalidateQueries: [queryKeys.projectFiles(projectId!, path)],
    successMessage: "File created successfully",
  });

  const createDirectoryMutation = useOptimisticMutation({
    mutationFn: (dirPath: string) =>
      workspaceService.createDirectory(projectId!, dirPath),
    onOptimisticUpdate: (dirPath) => {
      const dirName = dirPath.split("/").pop() || "";
      const newDir: FileNode = {
        id: `temp_${Date.now()}`,
        name: dirName,
        type: "directory",
        path: dirPath,
        modifiedAt: new Date().toISOString(),
        children: [],
      };

      queryClient.setQueryData(
        queryKeys.projectFiles(projectId!, path),
        (old: FileNode[] | undefined) => (old ? [...old, newDir] : [newDir]),
      );
    },
    invalidateQueries: [queryKeys.projectFiles(projectId!, path)],
    successMessage: "Directory created successfully",
  });

  const deleteFileMutation = useOptimisticMutation({
    mutationFn: (filePath: string) =>
      workspaceService.deleteFile(projectId!, filePath),
    onOptimisticUpdate: (filePath) => {
      queryClient.setQueryData(
        queryKeys.projectFiles(projectId!, path),
        (old: FileNode[] | undefined) =>
          old ? old.filter((file) => file.path !== filePath) : [],
      );
    },
    invalidateQueries: [queryKeys.projectFiles(projectId!, path)],
    successMessage: "File deleted successfully",
  });

  return {
    files: filesQuery.data || [],
    isLoading: filesQuery.isLoading,
    error: filesQuery.error,

    // Store integration
    expandedFolders: workspaceStore.expandedFolders,
    selectedFiles: workspaceStore.selectedFiles,

    // Actions
    createFile: createFileMutation.mutate,
    createDirectory: createDirectoryMutation.mutate,
    deleteFile: deleteFileMutation.mutate,
    toggleFolder: workspaceStore.toggleFolder,
    selectFile: workspaceStore.selectFile,
    clearSelection: workspaceStore.clearSelection,

    // Mutation states
    isCreatingFile: createFileMutation.isPending,
    isCreatingDirectory: createDirectoryMutation.isPending,
    isDeleting: deleteFileMutation.isPending,

    // Utils
    refetch: filesQuery.refetch,
    getFileByPath: (filePath: string) =>
      filesQuery.data?.find((f) => f.path === filePath),
    getDirectories: () =>
      filesQuery.data?.filter((f) => f.type === "directory") || [],
    getFiles: () => filesQuery.data?.filter((f) => f.type === "file") || [],
  };
}

export function useFileContent(
  projectId: string | null,
  filePath: string | null,
) {
  const queryClient = useQueryClient();

  const fileContentQuery = useQuery({
    queryKey: queryKeys.fileContent(projectId!, filePath!),
    queryFn: () => workspaceService.getFileContent(projectId!, filePath!),
    enabled: !!projectId && !!filePath,
    staleTime: 30 * 1000, // 30 seconds
  });

  const updateFileContentMutation = useOptimisticMutation({
    mutationFn: (content: string) =>
      workspaceService.updateFileContent(projectId!, filePath!, content),
    onOptimisticUpdate: (content) => {
      if (projectId && filePath) {
        queryClient.setQueryData(
          queryKeys.fileContent(projectId, filePath),
          content,
        );
      }
    },
    invalidateQueries: [
      queryKeys.fileContent(projectId!, filePath!),
      queryKeys.projectFiles(projectId!),
    ],
    successMessage: "File saved successfully",
  });

  return {
    content: fileContentQuery.data || "",
    isLoading: fileContentQuery.isLoading,
    error: fileContentQuery.error,

    // Actions
    updateContent: updateFileContentMutation.mutate,

    // Mutation states
    isSaving: updateFileContentMutation.isPending,

    // Utils
    refetch: fileContentQuery.refetch,
    isDirty: false, // This would be managed by the editor component
  };
}

export function useGitOperations(projectId: string | null) {
  const queryClient = useQueryClient();
  const workspaceStore = useWorkspaceStore();

  const gitStatusQuery = useQuery({
    queryKey: queryKeys.gitStatus(projectId!),
    queryFn: () => workspaceService.getGitStatus(projectId!),
    enabled: !!projectId,
    staleTime: 30 * 1000,
    onSuccess: (gitStatus) => {
      workspaceStore.updateGitState(projectId!, gitStatus);
    },
  });

  const branchesQuery = useQuery({
    queryKey: queryKeys.gitBranches(projectId!),
    queryFn: () => workspaceService.getBranches(projectId!),
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000,
  });

  const gitAddMutation = useMutation({
    mutationFn: (files: string[]) => workspaceService.gitAdd(projectId!, files),
    onSuccess: () => {
      queryClient.invalidateQueries(queryKeys.gitStatus(projectId!));
    },
  });

  const gitCommitMutation = useMutation({
    mutationFn: (message: string) =>
      workspaceService.gitCommit(projectId!, message),
    onSuccess: () => {
      queryClient.invalidateQueries(queryKeys.gitStatus(projectId!));
      queryClient.invalidateQueries(queryKeys.gitBranches(projectId!));
    },
  });

  const createBranchMutation = useMutation({
    mutationFn: ({
      branchName,
      fromBranch,
    }: {
      branchName: string;
      fromBranch?: string;
    }) => workspaceService.createBranch(projectId!, branchName, fromBranch),
    onSuccess: () => {
      queryClient.invalidateQueries(queryKeys.gitBranches(projectId!));
    },
  });

  const switchBranchMutation = useMutation({
    mutationFn: (branchName: string) =>
      workspaceService.switchBranch(projectId!, branchName),
    onSuccess: () => {
      queryClient.invalidateQueries(queryKeys.gitStatus(projectId!));
      queryClient.invalidateQueries(queryKeys.gitBranches(projectId!));
    },
  });

  return {
    gitStatus: gitStatusQuery.data,
    branches: branchesQuery.data || [],
    isLoading: gitStatusQuery.isLoading || branchesQuery.isLoading,
    error: gitStatusQuery.error || branchesQuery.error,

    // Actions
    gitAdd: gitAddMutation.mutate,
    gitCommit: gitCommitMutation.mutate,
    createBranch: createBranchMutation.mutate,
    switchBranch: switchBranchMutation.mutate,

    // Mutation states
    isStaging: gitAddMutation.isPending,
    isCommitting: gitCommitMutation.isPending,
    isCreatingBranch: createBranchMutation.isPending,
    isSwitchingBranch: switchBranchMutation.isPending,

    // Utils
    refetch: () => {
      gitStatusQuery.refetch();
      branchesQuery.refetch();
    },
    getCurrentBranch: () => branchesQuery.data?.find((b) => b.isCurrent),
    getModifiedFiles: () => gitStatusQuery.data?.modifiedFiles || [],
    getStagedFiles: () => gitStatusQuery.data?.stagedFiles || [],
    getUntrackedFiles: () => gitStatusQuery.data?.untrackedFiles || [],
  };
}
```

### 5. Terminal Hooks

```typescript
// /src/hooks/api/useTerminal.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTerminalStore } from "@/store/terminal.store";
import { terminalService } from "@/services/api/terminal.service";
import { queryKeys } from "@/lib/queryClient";

export function useTerminalSessions(projectId?: string) {
  const terminalStore = useTerminalStore();

  const sessionsQuery = useQuery({
    queryKey: queryKeys.terminalSessions(projectId),
    queryFn: () => terminalService.getSessions(projectId),
    staleTime: 30 * 1000,
  });

  const createSessionMutation = useMutation({
    mutationFn: (request: CreateTerminalRequest) =>
      terminalStore.createSession(
        request.projectId,
        request.type,
        request.name,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries(queryKeys.terminalSessions(projectId));
    },
  });

  return {
    sessions: Object.values(terminalStore.sessions),
    isLoading: sessionsQuery.isLoading,
    error: sessionsQuery.error,

    // Connection state
    isConnected: terminalStore.isConnected,
    connectionError: terminalStore.connectionError,

    // Actions
    createSession: createSessionMutation.mutate,
    closeSession: terminalStore.closeSession,
    setActiveSession: terminalStore.setActiveSession,

    // Mutation states
    isCreating: createSessionMutation.isPending,

    // Utils
    getSessionsByProject: (projId: string) =>
      Object.values(terminalStore.sessions).filter(
        (s) => s.projectId === projId,
      ),
    getActiveSession: () =>
      terminalStore.activeSessionId
        ? terminalStore.sessions[terminalStore.activeSessionId]
        : null,
  };
}

export function useTerminalSession(sessionId: string | null) {
  const terminalStore = useTerminalStore();
  const queryClient = useQueryClient();

  const sessionQuery = useQuery({
    queryKey: queryKeys.terminalSession(sessionId!),
    queryFn: () => terminalService.getSession(sessionId!),
    enabled: !!sessionId,
    staleTime: 60 * 1000,
  });

  const historyQuery = useQuery({
    queryKey: queryKeys.terminalHistory(sessionId!),
    queryFn: () => terminalService.getCommandHistory(sessionId!),
    enabled: !!sessionId,
    staleTime: 30 * 1000,
  });

  const session = sessionId ? terminalStore.sessions[sessionId] : null;
  const outputBuffer = sessionId
    ? terminalStore.outputBuffers[sessionId] || []
    : [];
  const commandHistory = sessionId
    ? terminalStore.commandHistory[sessionId] || []
    : [];
  const dimensions = sessionId ? terminalStore.dimensions[sessionId] : null;

  return {
    session: session || sessionQuery.data,
    isLoading: sessionQuery.isLoading,
    error: sessionQuery.error,

    // Terminal data
    outputBuffer,
    commandHistory:
      commandHistory.length > 0 ? commandHistory : historyQuery.data || [],
    dimensions,

    // State
    isActive: terminalStore.activeSessionId === sessionId,
    isFocused: terminalStore.focusedSessionId === sessionId,

    // Actions
    sendInput: (input: string) => {
      if (sessionId) {
        terminalStore.sendInput(sessionId, input);
      }
    },
    resizeTerminal: (cols: number, rows: number) => {
      if (sessionId) {
        terminalStore.resizeTerminal(sessionId, cols, rows);
      }
    },
    clearBuffer: () => {
      if (sessionId) {
        terminalStore.clearBuffer(sessionId);
      }
    },
    setFocused: () => {
      terminalStore.setFocused(sessionId);
    },

    // Utils
    getOutput: () => terminalStore.getSessionOutput(sessionId!),
    hasOutput: () => outputBuffer.length > 0,
    getLastCommand: () => commandHistory[0] || "",
    refetch: () => {
      sessionQuery.refetch();
      historyQuery.refetch();
    },
  };
}

export function useTerminalConnection() {
  const terminalStore = useTerminalStore();

  return {
    isConnected: terminalStore.isConnected,
    connectionError: terminalStore.connectionError,

    // Actions
    connect: terminalStore.connectWebSocket,
    disconnect: terminalStore.disconnectWebSocket,

    // Utils
    canCreateSession: () => terminalStore.isConnected,
    getConnectionStatus: () => {
      if (terminalStore.connectionError) return "error";
      if (terminalStore.isConnected) return "connected";
      return "disconnected";
    },
  };
}
```

### 6. AI Chat Hooks

```typescript
// /src/hooks/api/useAIChat.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useChatStore } from "@/store/chat.store";
import { aiService } from "@/services/api/ai.service";
import { queryKeys } from "@/lib/queryClient";
import { useCallback, useState } from "react";

export function useConversations(folderId?: string) {
  const chatStore = useChatStore();

  const conversationsQuery = useQuery({
    queryKey: queryKeys.conversations(folderId),
    queryFn: () => aiService.getConversations(folderId),
    staleTime: 2 * 60 * 1000,
    onSuccess: (conversations) => {
      // Update store with fresh data
      conversations.forEach((conversation) => {
        chatStore.addConversation(conversation);
      });
    },
  });

  const createConversationMutation = useMutation({
    mutationFn: ({ title, folderId }: { title: string; folderId?: string }) =>
      aiService.createConversation(title, folderId),
    onSuccess: (newConversation) => {
      chatStore.addConversation(newConversation);
      chatStore.setActiveConversation(newConversation.id);

      queryClient.setQueryData(
        queryKeys.conversations(folderId),
        (old: Conversation[] | undefined) =>
          old ? [...old, newConversation] : [newConversation],
      );
    },
  });

  const deleteConversationMutation = useMutation({
    mutationFn: (conversationId: string) =>
      aiService.deleteConversation(conversationId),
    onSuccess: (_, conversationId) => {
      chatStore.removeConversation(conversationId);

      queryClient.setQueryData(
        queryKeys.conversations(folderId),
        (old: Conversation[] | undefined) =>
          old ? old.filter((c) => c.id !== conversationId) : [],
      );
    },
  });

  return {
    conversations: conversationsQuery.data || [],
    isLoading: conversationsQuery.isLoading,
    error: conversationsQuery.error,

    // Store state
    activeConversationId: chatStore.activeConversationId,

    // Actions
    createConversation: createConversationMutation.mutate,
    deleteConversation: deleteConversationMutation.mutate,
    setActiveConversation: chatStore.setActiveConversation,

    // Mutation states
    isCreating: createConversationMutation.isPending,
    isDeleting: deleteConversationMutation.isPending,

    // Utils
    refetch: conversationsQuery.refetch,
    getConversationById: (id: string) =>
      conversationsQuery.data?.find((c) => c.id === id),
  };
}

export function useConversation(conversationId: string | null) {
  const chatStore = useChatStore();
  const queryClient = useQueryClient();

  const conversationQuery = useQuery({
    queryKey: queryKeys.conversation(conversationId!),
    queryFn: () => aiService.getConversation(conversationId!),
    enabled: !!conversationId,
    staleTime: 30 * 1000,
    onSuccess: (conversation) => {
      chatStore.addConversation(conversation);
    },
  });

  // Get conversation from store (includes real-time updates)
  const storeConversation = conversationId
    ? chatStore.conversations[conversationId]
    : null;
  const conversation = storeConversation || conversationQuery.data;

  const sendMessageMutation = useMutation({
    mutationFn: (request: SendMessageRequest) =>
      aiService.sendMessage(conversationId!, request),
    onSuccess: (message) => {
      chatStore.addMessage(conversationId!, message);
    },
  });

  return {
    conversation,
    isLoading: conversationQuery.isLoading,
    error: conversationQuery.error,

    // Real-time state
    isConnected: chatStore.isConnected,
    streamingMessage: conversationId
      ? chatStore.streamingMessages[conversationId]
      : null,
    typingUsers: conversationId
      ? chatStore.typingUsers[conversationId] || []
      : [],

    // Actions
    sendMessage: sendMessageMutation.mutate,
    joinConversation: () =>
      conversationId && chatStore.joinConversation(conversationId),
    leaveConversation: () =>
      conversationId && chatStore.leaveConversation(conversationId),
    startTyping: () => conversationId && chatStore.startTyping(conversationId),
    stopTyping: () => conversationId && chatStore.stopTyping(conversationId),

    // Mutation states
    isSending: sendMessageMutation.isPending,

    // Utils
    refetch: conversationQuery.refetch,
    getMessages: () => conversation?.messages || [],
    getLastMessage: () => {
      const messages = conversation?.messages || [];
      return messages[messages.length - 1];
    },
    getMessageCount: () => conversation?.messages.length || 0,
  };
}

export function useStreamingMessage(conversationId: string | null) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedContent, setStreamedContent] = useState("");
  const chatStore = useChatStore();

  const sendStreamingMessage = useCallback(
    async (request: SendMessageRequest) => {
      if (!conversationId) return;

      setIsStreaming(true);
      setStreamedContent("");

      try {
        const messageId = `streaming_${Date.now()}`;
        chatStore.startStreaming(conversationId, messageId);

        const generator = aiService.streamMessage(conversationId, request);

        for await (const chunk of generator) {
          setStreamedContent((prev) => prev + chunk);
          chatStore.appendStreamContent(conversationId, chunk);
        }

        chatStore.completeStreaming(conversationId);
      } catch (error) {
        console.error("Streaming failed:", error);
      } finally {
        setIsStreaming(false);
        setStreamedContent("");
      }
    },
    [conversationId, chatStore],
  );

  return {
    sendStreamingMessage,
    isStreaming,
    streamedContent,

    // Store streaming state
    storeStreamingMessage: conversationId
      ? chatStore.streamingMessages[conversationId]
      : null,
  };
}

export function useChatFolders() {
  const chatStore = useChatStore();

  const foldersQuery = useQuery({
    queryKey: queryKeys.chatFolders(),
    queryFn: () => aiService.getFolders(),
    staleTime: 5 * 60 * 1000,
    onSuccess: (folders) => {
      folders.forEach((folder) => {
        chatStore.addFolder(folder);
      });
    },
  });

  const createFolderMutation = useMutation({
    mutationFn: ({ name, parentId }: { name: string; parentId?: string }) =>
      aiService.createFolder(name, parentId),
    onSuccess: (newFolder) => {
      chatStore.addFolder(newFolder);

      queryClient.setQueryData(
        queryKeys.chatFolders(),
        (old: Folder[] | undefined) =>
          old ? [...old, newFolder] : [newFolder],
      );
    },
  });

  const deleteFolderMutation = useMutation({
    mutationFn: (folderId: string) => aiService.deleteFolder(folderId),
    onSuccess: (_, folderId) => {
      chatStore.removeFolder(folderId);

      queryClient.setQueryData(
        queryKeys.chatFolders(),
        (old: Folder[] | undefined) =>
          old ? old.filter((f) => f.id !== folderId) : [],
      );
    },
  });

  return {
    folders: foldersQuery.data || [],
    isLoading: foldersQuery.isLoading,
    error: foldersQuery.error,

    // Store state
    selectedFolderId: chatStore.selectedFolderId,

    // Actions
    createFolder: createFolderMutation.mutate,
    deleteFolder: deleteFolderMutation.mutate,
    setSelectedFolder: chatStore.setSelectedFolder,

    // Mutation states
    isCreating: createFolderMutation.isPending,
    isDeleting: deleteFolderMutation.isPending,

    // Utils
    refetch: foldersQuery.refetch,
    getFolderById: (id: string) => foldersQuery.data?.find((f) => f.id === id),
    getRootFolders: () => foldersQuery.data?.filter((f) => !f.parentId) || [],
    getChildFolders: (parentId: string) =>
      foldersQuery.data?.filter((f) => f.parentId === parentId) || [],
  };
}

export function useChatSearch() {
  const chatStore = useChatStore();
  const [isSearching, setIsSearching] = useState(false);

  const searchConversations = useCallback(
    async (query: string, filters?: SearchFilters) => {
      if (!query.trim()) {
        chatStore.clearSearch();
        return;
      }

      setIsSearching(true);
      chatStore.setSearchQuery(query);

      try {
        const results = await aiService.searchConversations(query, filters);
        chatStore.setSearchResults(results);
      } catch (error) {
        console.error("Search failed:", error);
        chatStore.setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    [chatStore],
  );

  const clearSearch = useCallback(() => {
    chatStore.clearSearch();
    setIsSearching(false);
  }, [chatStore]);

  return {
    searchQuery: chatStore.searchQuery,
    searchResults: chatStore.searchResults,
    isSearching,

    // Actions
    search: searchConversations,
    clearSearch,
    setQuery: chatStore.setSearchQuery,

    // Utils
    hasResults: chatStore.searchResults.length > 0,
    isEmpty:
      !isSearching &&
      chatStore.searchQuery.length > 0 &&
      chatStore.searchResults.length === 0,
  };
}
```

---

## WebSocket Integration Hooks

### Real-time Data Hooks

```typescript
// /src/hooks/websocket/useRealtimeData.ts
import { useEffect, useCallback } from "react";
import { usePortfolioStore } from "@/store/portfolio.store";
import { portfolioWs } from "@/services/websocket/portfolio.ws";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys, websocketInvalidations } from "@/lib/queryClient";

export function useRealtimePrices(symbols: string[]) {
  const portfolioStore = usePortfolioStore();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (symbols.length === 0) return;

    // Subscribe to symbols
    symbols.forEach((symbol) => {
      portfolioStore.subscribeToSymbol(symbol);
    });

    // Cleanup: unsubscribe from symbols
    return () => {
      symbols.forEach((symbol) => {
        portfolioStore.unsubscribeFromSymbol(symbol);
      });
    };
  }, [symbols.join(",")]); // Only re-run when symbols array changes

  // Get real-time prices from store
  const realtimePrices = symbols.reduce(
    (acc, symbol) => {
      const priceData = portfolioStore.realtimePrices[symbol];
      if (priceData) {
        acc[symbol] = priceData;
      }
      return acc;
    },
    {} as Record<string, PriceData>,
  );

  const getPrice = useCallback(
    (symbol: string) => {
      return portfolioStore.realtimePrices[symbol];
    },
    [portfolioStore.realtimePrices],
  );

  const isPriceStale = useCallback(
    (symbol: string, maxAge: number = 60000) => {
      const priceData = portfolioStore.realtimePrices[symbol];
      if (!priceData) return true;
      return Date.now() - priceData.timestamp > maxAge;
    },
    [portfolioStore.realtimePrices],
  );

  return {
    realtimePrices,
    getPrice,
    isPriceStale,
    isConnected: portfolioWs.getConnectionStatus() === "open",
    subscribedSymbols: portfolioWs.getSubscribedSymbols(),
  };
}

export function useRealtimePortfolio(portfolioId: string | null) {
  const portfolioStore = usePortfolioStore();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!portfolioId) return;

    // Subscribe to portfolio updates
    portfolioStore.subscribeToPortfolio(portfolioId);

    // Setup invalidation on updates
    const unsubscribe = portfolioStore.subscribe(
      (state) => state.portfolioUpdates[portfolioId],
      (updates) => {
        if (updates) {
          websocketInvalidations.onPortfolioUpdate(portfolioId);
        }
      },
    );

    return () => {
      portfolioStore.unsubscribeFromPortfolio(portfolioId);
      unsubscribe();
    };
  }, [portfolioId]);

  const portfolioUpdates = portfolioId
    ? portfolioStore.portfolioUpdates[portfolioId]
    : null;

  return {
    portfolioUpdates,
    hasUpdates: !!portfolioUpdates,
    isConnected: portfolioWs.getConnectionStatus() === "open",
    getUpdateValue: (key: string) => portfolioUpdates?.[key],
  };
}
```

### WebSocket Connection Hook

```typescript
// /src/hooks/websocket/useWebSocketConnection.ts
import { useEffect, useState } from "react";
import { wsManager } from "@/services/websocket/ws.client";
import { useAuthStore } from "@/store/auth.store";

export interface WebSocketService {
  id: string;
  name: string;
  url: string;
  status: "connecting" | "open" | "closed" | "unknown";
  lastConnected?: number;
  reconnectAttempts?: number;
}

export function useWebSocketConnection() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [services, setServices] = useState<WebSocketService[]>([
    {
      id: "terminal",
      name: "Terminal Service",
      url: `${process.env.NEXT_PUBLIC_API_GATEWAY_URL?.replace("http", "ws")}/ws/terminal`,
      status: "unknown",
    },
    {
      id: "chat",
      name: "AI Chat Service",
      url: `${process.env.NEXT_PUBLIC_API_GATEWAY_URL?.replace("http", "ws")}/ws/chat`,
      status: "unknown",
    },
    {
      id: "portfolio",
      name: "Portfolio Service",
      url: `${process.env.NEXT_PUBLIC_API_GATEWAY_URL?.replace("http", "ws")}/ws/portfolio`,
      status: "unknown",
    },
  ]);

  const [overallStatus, setOverallStatus] = useState<
    "connected" | "connecting" | "disconnected" | "error"
  >("disconnected");

  useEffect(() => {
    if (!isAuthenticated) {
      setOverallStatus("disconnected");
      setServices((services) =>
        services.map((service) => ({ ...service, status: "closed" as const })),
      );
      return;
    }

    // Monitor connection status
    const interval = setInterval(() => {
      setServices((currentServices) =>
        currentServices.map((service) => ({
          ...service,
          status: wsManager.getConnectionStatus(service.id),
        })),
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  useEffect(() => {
    const connectedServices = services.filter(
      (s) => s.status === "open",
    ).length;
    const connectingServices = services.filter(
      (s) => s.status === "connecting",
    ).length;
    const totalServices = services.length;

    if (connectedServices === totalServices) {
      setOverallStatus("connected");
    } else if (connectingServices > 0) {
      setOverallStatus("connecting");
    } else if (connectedServices > 0) {
      setOverallStatus("connected"); // Partial connection
    } else {
      setOverallStatus("disconnected");
    }
  }, [services]);

  const getServiceStatus = (serviceId: string) => {
    return services.find((s) => s.id === serviceId)?.status || "unknown";
  };

  const isServiceConnected = (serviceId: string) => {
    return getServiceStatus(serviceId) === "open";
  };

  const getConnectedServicesCount = () => {
    return services.filter((s) => s.status === "open").length;
  };

  const getTotalServicesCount = () => {
    return services.length;
  };

  const disconnectAll = () => {
    wsManager.disconnectAll();
  };

  return {
    services,
    overallStatus,
    isAuthenticated,

    // Utils
    getServiceStatus,
    isServiceConnected,
    getConnectedServicesCount,
    getTotalServicesCount,

    // Actions
    disconnectAll,

    // Status checks
    isFullyConnected:
      overallStatus === "connected" &&
      getConnectedServicesCount() === getTotalServicesCount(),
    isPartiallyConnected:
      getConnectedServicesCount() > 0 &&
      getConnectedServicesCount() < getTotalServicesCount(),
    isDisconnected: getConnectedServicesCount() === 0,
  };
}
```

---

## UI Helper Hooks

### Theme and Layout Hooks

```typescript
// /src/hooks/ui/useTheme.ts
import { useUIStore } from "@/store/ui.store";
import { useEffect } from "react";

export function useTheme() {
  const { theme, isDarkMode, setTheme, toggleTheme } = useUIStore();

  // Apply theme class to body
  useEffect(() => {
    document.body.className = isDarkMode ? "dark" : "light";
    document.documentElement.setAttribute(
      "data-theme",
      isDarkMode ? "dark" : "light",
    );
  }, [isDarkMode]);

  return {
    theme,
    isDarkMode,
    setTheme,
    toggleTheme,

    // Theme helpers
    getThemeClass: (lightClass: string, darkClass: string) =>
      isDarkMode ? darkClass : lightClass,
    getThemeValue: <T>(lightValue: T, darkValue: T) =>
      isDarkMode ? darkValue : lightValue,
  };
}

// /src/hooks/ui/useModal.ts
import { useUIStore } from "@/store/ui.store";
import { useCallback } from "react";

export function useModal(modalId: string) {
  const { modals, openModal, closeModal } = useUIStore();

  const modal = modals[modalId] || { isOpen: false };

  const open = useCallback(
    (data?: any) => {
      openModal(modalId, data);
    },
    [modalId, openModal],
  );

  const close = useCallback(() => {
    closeModal(modalId);
  }, [modalId, closeModal]);

  const toggle = useCallback(
    (data?: any) => {
      if (modal.isOpen) {
        close();
      } else {
        open(data);
      }
    },
    [modal.isOpen, open, close],
  );

  return {
    isOpen: modal.isOpen,
    data: modal.data,
    open,
    close,
    toggle,
  };
}

// /src/hooks/ui/useToast.ts
import { useUIStore } from "@/store/ui.store";
import { useCallback } from "react";

export function useToast() {
  const { toasts, addToast, removeToast, clearToasts } = useUIStore();

  const toast = useCallback(
    (options: {
      type: "success" | "error" | "warning" | "info";
      title: string;
      message?: string;
      duration?: number;
      action?: {
        label: string;
        onClick: () => void;
      };
    }) => {
      return addToast(options);
    },
    [addToast],
  );

  const success = useCallback(
    (title: string, message?: string) => {
      return toast({ type: "success", title, message });
    },
    [toast],
  );

  const error = useCallback(
    (title: string, message?: string) => {
      return toast({ type: "error", title, message });
    },
    [toast],
  );

  const warning = useCallback(
    (title: string, message?: string) => {
      return toast({ type: "warning", title, message });
    },
    [toast],
  );

  const info = useCallback(
    (title: string, message?: string) => {
      return toast({ type: "info", title, message });
    },
    [toast],
  );

  return {
    toasts,
    toast,
    success,
    error,
    warning,
    info,
    remove: removeToast,
    clear: clearToasts,
  };
}
```

### Utility Hooks

```typescript
// /src/hooks/utils/useDebouncedValue.ts
import { useState, useEffect } from "react";

export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// /src/hooks/utils/useLocalStorage.ts
import { useState, useEffect } from "react";

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);

      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  const removeValue = () => {
    try {
      setStoredValue(initialValue);
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(key);
      }
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue, removeValue] as const;
}

// /src/hooks/utils/useOnClickOutside.ts
import { useEffect, useRef } from "react";

export function useOnClickOutside<T extends HTMLElement = HTMLElement>(
  handler: () => void,
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return;
      }
      handler();
    };

    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);

    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [handler]);

  return ref;
}

// /src/hooks/utils/useKeyboardShortcut.ts
import { useEffect } from "react";

export function useKeyboardShortcut(
  keys: string[],
  callback: () => void,
  options: {
    preventDefault?: boolean;
    enabled?: boolean;
  } = {},
) {
  const { preventDefault = true, enabled = true } = options;

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const pressedKeys = [];

      if (event.ctrlKey) pressedKeys.push("ctrl");
      if (event.shiftKey) pressedKeys.push("shift");
      if (event.altKey) pressedKeys.push("alt");
      if (event.metaKey) pressedKeys.push("meta");

      pressedKeys.push(event.key.toLowerCase());

      const isMatch =
        keys.every((key) => pressedKeys.includes(key.toLowerCase())) &&
        keys.length === pressedKeys.length;

      if (isMatch) {
        if (preventDefault) {
          event.preventDefault();
        }
        callback();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [keys, callback, preventDefault, enabled]);
}
```

---

## Hook Usage Examples

### Component Integration Examples

```typescript
// Example: Portfolio Dashboard Component
export function PortfolioDashboard() {
  const { portfolios, activePortfolioId, setActivePortfolio } = usePortfolios();
  const { portfolio, metrics, executeTrade, isExecutingTrade } = usePortfolio(activePortfolioId);
  const { realtimePrices } = useRealtimePrices(portfolio?.positions.map(p => p.symbol) || []);
  const { success, error } = useToast();

  const handleTrade = async (trade: TradeRequest) => {
    try {
      await executeTrade(trade);
      success('Trade Executed', `Successfully ${trade.type.toLowerCase()}ed ${trade.quantity} shares of ${trade.symbol}`);
    } catch (err) {
      error('Trade Failed', 'Failed to execute trade. Please try again.');
    }
  };

  return (
    <div className="portfolio-dashboard">
      {/* Portfolio content */}
    </div>
  );
}

// Example: Terminal Component
export function TerminalComponent({ projectId }: { projectId: string }) {
  const { createSession, isCreating } = useTerminalSessions(projectId);
  const { session, sendInput, outputBuffer } = useTerminalSession(activeSessionId);
  const { isConnected } = useTerminalConnection();

  const handleCreateSession = async () => {
    try {
      const sessionId = await createSession({
        projectId,
        type: 'system',
        name: 'Main Terminal',
      });
      console.log('Created session:', sessionId);
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };

  return (
    <div className="terminal-component">
      {/* Terminal UI */}
    </div>
  );
}

// Example: Chat Interface Component
export function ChatInterface() {
  const { conversations, createConversation } = useConversations();
  const { conversation, sendMessage, isSending } = useConversation(activeConversationId);
  const { sendStreamingMessage, isStreaming, streamedContent } = useStreamingMessage(activeConversationId);

  const handleSendMessage = async (content: string) => {
    try {
      await sendStreamingMessage({ content });
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  return (
    <div className="chat-interface">
      {/* Chat UI */}
    </div>
  );
}
```

---

This comprehensive React Hooks plan provides a robust, type-safe, and performant interface for all API interactions and real-time features. The hooks are designed to work seamlessly with the Zustand stores and React Query, providing optimal performance and developer experience.
