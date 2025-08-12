'use client';

import React, { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { WorkspaceProvider } from '@/modules/workspace/contexts/WorkspaceContext';
import { useTerminalStore } from '@/modules/workspace/stores/terminal.store';

// Dynamic import to avoid SSR issues with terminal components
// Using V2 layout with Project Sidebar and Git Configuration
const WorkspaceLayout = dynamic(
  () => import('@/modules/workspace/components/Layout/WorkspaceLayoutV2'),
  { 
    ssr: false,
    loading: () => (
      <div className="h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading Workspace...</p>
        </div>
      </div>
    )
  }
);

function WorkspacePageContent() {
  const { projectSessions, forceCloseAllSessions } = useTerminalStore();

  useEffect(() => {
    // Cleanup handler for when user leaves the workspace
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // Get all projects with active terminals
      const projectsWithTerminals = Object.keys(projectSessions).filter(projectId => {
        const sessions = projectSessions[projectId];
        return sessions && (sessions.system.length > 0 || sessions.claude.length > 0);
      });

      if (projectsWithTerminals.length > 0) {
        // Show confirmation dialog
        event.preventDefault();
        event.returnValue = 'You have active terminal sessions. Leaving will close all terminals. Are you sure?';
        return 'You have active terminal sessions. Leaving will close all terminals. Are you sure?';
      }
    };

    // Cleanup handler for component unmount
    const handleUnmount = () => {
      console.log('[WorkspacePage] Performing workspace cleanup...');
      
      // Force close all terminal sessions in all projects
      const projectsWithTerminals = Object.keys(projectSessions);
      let totalTerminals = 0;
      
      projectsWithTerminals.forEach(projectId => {
        const sessions = projectSessions[projectId];
        if (sessions) {
          totalTerminals += sessions.system.length + sessions.claude.length;
        }
      });

      if (totalTerminals > 0) {
        console.log(`[WorkspacePage] Closing ${totalTerminals} terminal sessions across ${projectsWithTerminals.length} projects`);
        forceCloseAllSessions();
      }
    };

    // Add event listeners
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Return cleanup function
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      handleUnmount();
    };
  }, [projectSessions, forceCloseAllSessions]);

  return <WorkspaceLayout />;
}

export default function WorkspacePage() {
  return (
    <WorkspaceProvider>
      <WorkspacePageContent />
    </WorkspaceProvider>
  );
}