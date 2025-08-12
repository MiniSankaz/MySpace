'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Settings,
  FolderOpen
} from 'lucide-react';
import ProjectList from './ProjectList';
import SearchFilter from './SearchFilter';
import SidebarControls from './SidebarControls';
import { useWorkspace } from '@/modules/workspace/contexts/WorkspaceContext';
import { Project } from '@/types/project';

interface ProjectSidebarContainerProps {
  onProjectChange?: (project: Project) => void;
}

const ProjectSidebarContainer: React.FC<ProjectSidebarContainerProps> = ({
  onProjectChange,
}) => {
  const { 
    currentProject, 
    projects, 
    selectProject,
    loading,
    fetchProjects
  } = useWorkspace();
  
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [sidebarSettings, setSidebarSettings] = useState({
    width: 250,
    showStatusIndicators: true
  });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'lastAccessed' | 'custom'>('lastAccessed');
  const [showSearch, setShowSearch] = useState(false);
  
  // Filter and sort projects
  const filteredProjects = useMemo(() => {
    let filtered = projects;
    
    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(project =>
        project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Sort projects
    filtered = [...filtered].sort((a, b) => {
      // Pinned projects always come first
      if (a.preferences?.isPinned && !b.preferences?.isPinned) return -1;
      if (!a.preferences?.isPinned && b.preferences?.isPinned) return 1;
      
      // Then sort by selected criteria
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'lastAccessed':
          const aTime = new Date(a.preferences?.lastAccessedAt || a.createdAt).getTime();
          const bTime = new Date(b.preferences?.lastAccessedAt || b.createdAt).getTime();
          return bTime - aTime;
        case 'custom':
          return (a.preferences?.sortOrder || 0) - (b.preferences?.sortOrder || 0);
        default:
          return 0;
      }
    });
    
    return filtered;
  }, [projects, searchQuery, sortBy]);
  
  // Get recent and pinned projects
  const recentProjects = useMemo(() => {
    return filteredProjects
      .filter(p => !p.preferences?.isPinned)
      .slice(0, 5);
  }, [filteredProjects]);
  
  const pinnedProjects = useMemo(() => {
    return filteredProjects.filter(p => p.preferences?.isPinned);
  }, [filteredProjects]);
  
  // Handle project selection
  const handleProjectSelect = useCallback(async (project: Project) => {
    await selectProject(project.id);
    onProjectChange?.(project);
  }, [selectProject, onProjectChange]);
  
  // Handle pin toggle
  const handlePinToggle = useCallback(async (project: Project) => {
    // TODO: Implement pin toggle with API
    console.log('Pin toggle for:', project.name);
  }, []);
  
  // Toggle sidebar
  const toggleSidebar = useCallback(() => {
    setIsCollapsed(prev => !prev);
  }, []);
  
  // Refresh projects
  const refreshProjects = fetchProjects;
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle sidebar with Cmd+B
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        toggleSidebar();
      }
      
      // Quick search with Cmd+P
      if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
        e.preventDefault();
        setShowSearch(true);
      }
      
      // Number shortcuts for first 9 projects
      if ((e.metaKey || e.ctrlKey) && e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        const index = parseInt(e.key) - 1;
        if (filteredProjects[index]) {
          handleProjectSelect(filteredProjects[index]);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSidebar, filteredProjects, handleProjectSelect]);
  
  return (
    <motion.div
      className={`relative h-full bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 border-r border-gray-700/50 flex flex-col transition-all duration-300`}
      animate={{
        width: isCollapsed ? 60 : sidebarSettings?.width || 250,
      }}
      initial={false}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-700/50 bg-black/20 backdrop-blur-sm">
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex items-center space-x-2"
          >
            <FolderOpen className="w-5 h-5 text-blue-400" />
            <span className="text-sm font-medium text-gray-200">Projects</span>
          </motion.div>
        )}
        
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg hover:bg-gray-700/50 text-gray-400 hover:text-gray-200 transition-colors"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
      
      {/* Search Bar */}
      <AnimatePresence>
        {!isCollapsed && (showSearch || searchQuery) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-gray-700/50"
          >
            <SearchFilter
              value={searchQuery}
              onChange={setSearchQuery}
              onClose={() => {
                setShowSearch(false);
                setSearchQuery('');
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Controls */}
      {!isCollapsed && (
        <SidebarControls
          viewMode={viewMode}
          sortBy={sortBy}
          onViewModeChange={setViewMode}
          onSortChange={setSortBy}
          onSearchClick={() => setShowSearch(!showSearch)}
          onRefresh={refreshProjects}
        />
      )}
      
      {/* Project List */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <ProjectList
          projects={filteredProjects}
          pinnedProjects={pinnedProjects}
          recentProjects={recentProjects}
          currentProject={currentProject}
          isCollapsed={isCollapsed}
          viewMode={viewMode}
          loading={loading}
          onProjectSelect={handleProjectSelect}
          onPinToggle={handlePinToggle}
        />
      </div>
      
      {/* Footer Actions */}
      {!isCollapsed && (
        <div className="border-t border-gray-700/50 p-3 bg-black/20 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <button
              className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 transition-colors text-sm"
              onClick={() => {/* Open new project modal */}}
            >
              <Plus className="w-4 h-4" />
              <span>New Project</span>
            </button>
            
            <button
              className="p-1.5 rounded-lg hover:bg-gray-700/50 text-gray-400 hover:text-gray-200 transition-colors"
              onClick={() => {/* Open settings */}}
              title="Sidebar settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      
      {/* Resize Handle */}
      {!isCollapsed && (
        <div
          className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500/50 transition-colors"
          onMouseDown={(e) => {
            const startX = e.clientX;
            const startWidth = sidebarSettings?.width || 250;
            
            const handleMouseMove = (e: MouseEvent) => {
              const newWidth = Math.max(200, Math.min(400, startWidth + e.clientX - startX));
              setSidebarSettings(prev => ({ ...prev, width: newWidth }));
            };
            
            const handleMouseUp = () => {
              document.removeEventListener('mousemove', handleMouseMove);
              document.removeEventListener('mouseup', handleMouseUp);
            };
            
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
          }}
        />
      )}
    </motion.div>
  );
};

export default ProjectSidebarContainer;