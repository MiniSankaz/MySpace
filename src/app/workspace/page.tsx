'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { WorkspaceProvider } from '@/modules/workspace/contexts/WorkspaceContext';

// Dynamic import to avoid SSR issues with terminal components
const WorkspaceLayout = dynamic(
  () => import('@/modules/workspace/components/Layout/WorkspaceLayout'),
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

export default function WorkspacePage() {
  return (
    <WorkspaceProvider>
      <WorkspaceLayout />
    </WorkspaceProvider>
  );
}