'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Project, WorkspaceState, CreateProjectDTO, UpdateProjectDTO } from '../types';
import { authClient } from '@/core/auth/auth-client';
import { useTerminalStore } from '../stores/terminal.store';

interface WorkspaceContextType extends WorkspaceState {
  selectProject: (projectId: string) => Promise<void>;
  createProject: (data: CreateProjectDTO) => Promise<Project>;
  updateProject: (projectId: string, data: UpdateProjectDTO) => Promise<Project>;
  deleteProject: (projectId: string) => Promise<void>;
  refreshProjectStructure: (projectId: string) => Promise<Project>;
  toggleSidebar: () => void;
  setActiveSystemTab: (tabId: string | null) => void;
  setActiveClaudeTab: (tabId: string | null) => void;
  fetchProjects: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within WorkspaceProvider');
  }
  return context;
};

interface WorkspaceProviderProps {
  children: ReactNode;
}

export const WorkspaceProvider: React.FC<WorkspaceProviderProps> = ({ children }) => {
  const [state, setState] = useState<WorkspaceState>({
    currentProject: null,
    projects: [],
    terminals: { system: [], claude: [] },
    activeSystemTab: null,
    activeClaudeTab: null,
    sidebarCollapsed: false,
    loading: false,
    error: null,
  });
  
  // Access terminal store for reconciliation
  const { reconcileProjectSessions } = useTerminalStore();
  
  // Add method to set current project directly
  const setCurrentProject = useCallback((project: Project | null) => {
    setState(prev => ({ ...prev, currentProject: project }));
  }, []);

  // Fetch all projects
  const fetchProjects = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      // Check if user is authenticated
      if (!authClient.isAuthenticated()) {
        console.log('User not authenticated, redirecting to login');
        setState(prev => ({ 
          ...prev, 
          loading: false, 
          projects: [],
          error: 'Please login to access workspace' 
        }));
        // Redirect to login
        window.location.href = '/login';
        return;
      }
      
      const response = await authClient.fetch('/api/workspace/projects');
      
      if (!response.ok) {
        // If 404, no projects exist yet - that's ok
        if (response.status === 404) {
          setState(prev => ({ ...prev, projects: [], loading: false }));
          return;
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch projects`);
      }
      
      const projects = await response.json();
      setState(prev => ({ ...prev, projects, loading: false }));
    } catch (error) {
      console.error('Error fetching projects:', error);
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        projects: [],
        error: error instanceof Error ? error.message : 'Unknown error' 
      }));
    }
  }, []);

  // Select a project
  const selectProject = useCallback(async (projectId: string) => {
    if (!projectId) {
      setState(prev => ({ ...prev, currentProject: null }));
      return;
    }

    const project = state.projects.find(p => p.id === projectId);
    if (!project) {
      console.error('Project not found:', projectId);
      return;
    }
    
    // CRITICAL FIX: Let TerminalContainer handle terminal loading
    // WorkspaceContext only updates the current project
    // This prevents duplicate API calls and state conflicts
    console.log(`[WorkspaceContext] Switching to project ${projectId}`);
    
    // Just update the current project - TerminalContainer will handle terminals
    setState(prev => ({
      ...prev,
      currentProject: project,
    }));
  }, [state.projects, reconcileProjectSessions]);

  // Create new project
  const createProject = useCallback(async (data: CreateProjectDTO) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const response = await authClient.fetch('/api/workspace/projects', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to create project');
      }
      
      const newProject = await response.json();
      setState(prev => ({
        ...prev,
        projects: [...prev.projects, newProject],
        currentProject: newProject,
        loading: false,
      }));
      
      return newProject;
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }));
      throw error;
    }
  }, []);

  // Update project
  const updateProject = useCallback(async (projectId: string, data: UpdateProjectDTO) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const response = await authClient.fetch(`/api/workspace/projects/${projectId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) throw new Error('Failed to update project');
      
      const updatedProject = await response.json();
      setState(prev => ({
        ...prev,
        projects: prev.projects.map(p => p.id === projectId ? updatedProject : p),
        currentProject: prev.currentProject?.id === projectId ? updatedProject : prev.currentProject,
        loading: false,
      }));
      
      return updatedProject;
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }));
      throw error;
    }
  }, []);

  // Delete project
  const deleteProject = useCallback(async (projectId: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const response = await authClient.fetch(`/api/workspace/projects/${projectId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Failed to delete project');
      
      setState(prev => ({
        ...prev,
        projects: prev.projects.filter(p => p.id !== projectId),
        currentProject: prev.currentProject?.id === projectId ? null : prev.currentProject,
        loading: false,
      }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }));
      throw error;
    }
  }, []);

  // Refresh project structure
  const refreshProjectStructure = useCallback(async (projectId: string) => {
    try {
      const response = await authClient.fetch(`/api/workspace/projects/${projectId}/structure`, {
        method: 'POST',
      });
      
      if (!response.ok) throw new Error('Failed to refresh structure');
      
      const updatedProject = await response.json();
      setState(prev => ({
        ...prev,
        projects: prev.projects.map(p => p.id === projectId ? updatedProject : p),
        currentProject: prev.currentProject?.id === projectId ? updatedProject : prev.currentProject,
      }));
      
      return updatedProject;
    } catch (error) {
      console.error('Failed to refresh structure:', error);
      throw error;
    }
  }, []);

  // Toggle sidebar
  const toggleSidebar = useCallback(() => {
    setState(prev => ({ ...prev, sidebarCollapsed: !prev.sidebarCollapsed }));
  }, []);

  // Set active terminal tab
  const setActiveSystemTab = useCallback((tabId: string | null) => {
    setState(prev => ({ ...prev, activeSystemTab: tabId }));
  }, []);

  const setActiveClaudeTab = useCallback((tabId: string | null) => {
    setState(prev => ({ ...prev, activeClaudeTab: tabId }));
  }, []);

  // Track if we're already creating a default project
  const [isCreatingDefault, setIsCreatingDefault] = useState(false);
  
  // Auto-create default project if none exist
  const initializeDefaultProject = useCallback(async () => {
    // Prevent duplicate creation
    if (state.projects.length === 0 && !state.loading && !state.error && !isCreatingDefault) {
      try {
        setIsCreatingDefault(true);
        console.log('No projects found, creating default project...');
        const defaultProject = await createProject({
          name: 'Current Workspace',
          description: 'Default project for current workspace',
          path: process.env.DEFAULT_PROJECT_PATH || process.cwd(),
        });
        await selectProject(defaultProject.id);
      } catch (error) {
        console.error('Failed to create default project:', error);
      } finally {
        setIsCreatingDefault(false);
      }
    }
  }, [state.projects.length, state.loading, state.error, isCreatingDefault, createProject, selectProject]);

  // Load projects on mount
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Initialize default project if needed (with delay to ensure fetchProjects completes)
  useEffect(() => {
    const timer = setTimeout(() => {
      initializeDefaultProject();
    }, 1000); // Small delay to ensure projects are loaded
    
    return () => {
      clearTimeout(timer);
      // Reset creating flag on unmount
      setIsCreatingDefault(false);
    };
  }, [initializeDefaultProject]);

  const value: WorkspaceContextType = {
    ...state,
    selectProject,
    createProject,
    updateProject,
    deleteProject,
    refreshProjectStructure,
    toggleSidebar,
    setActiveSystemTab,
    setActiveClaudeTab,
    fetchProjects,
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
};