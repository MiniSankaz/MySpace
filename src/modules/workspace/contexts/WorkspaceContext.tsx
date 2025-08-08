'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Project, WorkspaceState, CreateProjectDTO, UpdateProjectDTO } from '../types';

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

  // Fetch all projects
  const fetchProjects = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const token = localStorage.getItem('accessToken');
      
      // Check if user is logged in
      if (!token) {
        console.log('No access token found, user needs to login');
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
      
      const response = await fetch('/api/workspace/projects', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      // Handle different response codes
      if (response.status === 401) {
        console.log('Token expired or invalid');
        localStorage.removeItem('accessToken');
        window.location.href = '/login';
        return;
      }
      
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

    setState(prev => ({ ...prev, currentProject: project }));
    
    // Fetch terminal sessions for this project
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/workspace/projects/${projectId}/terminals`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const sessions = await response.json();
        setState(prev => ({
          ...prev,
          currentProject: project,
          terminals: {
            system: sessions.filter((t: any) => t.type === 'system'),
            claude: sessions.filter((t: any) => t.type === 'claude'),
          },
        }));
      }
    } catch (error) {
      console.error('Failed to fetch terminals:', error);
    }
  }, [state.projects]);

  // Create new project
  const createProject = useCallback(async (data: CreateProjectDTO) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/workspace/projects', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
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
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/workspace/projects/${projectId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
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
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/workspace/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
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
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/workspace/projects/${projectId}/structure`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
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

  // Load projects on mount
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

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