'use client';

import React from 'react';
import { 
  Folder, 
  GitBranch, 
  Terminal, 
  AlertCircle, 
  CheckCircle,
  Activity
} from 'lucide-react';
import { Project } from '@/types/project';

interface ProjectIconProps {
  project: Project;
  size?: number;
  showStatus?: boolean;
}

const ProjectIcon: React.FC<ProjectIconProps> = ({
  project,
  size = 32,
  showStatus = true,
}) => {
  const customColor = project.preferences?.customColor || '#3B82F6';
  const customIcon = project.preferences?.customIcon;
  
  // Get status from cache
  const status = project.statusCache;
  const hasErrors = status?.hasErrors;
  const hasWarnings = status?.hasWarnings;
  const isActive = status?.terminalStatus?.active;
  const isDirty = status?.gitStatus?.isDirty;
  
  // Select icon based on custom icon or default
  const IconComponent = customIcon ? 
    (customIcon === 'folder' ? Folder : 
     customIcon === 'git' ? GitBranch :
     customIcon === 'terminal' ? Terminal : Folder) 
    : Folder;
  
  return (
    <div className="relative">
      <div
        className="flex items-center justify-center rounded-lg p-2"
        style={{
          backgroundColor: `${customColor}20`,
          borderColor: `${customColor}50`,
        }}
      >
        <IconComponent 
          className="text-current"
          size={size}
          style={{ color: customColor }}
        />
      </div>
      
      {showStatus && (
        <>
          {/* Error indicator */}
          {hasErrors && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center">
              <AlertCircle className="w-2 h-2 text-white" />
            </div>
          )}
          
          {/* Warning indicator */}
          {!hasErrors && hasWarnings && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full flex items-center justify-center">
              <AlertCircle className="w-2 h-2 text-white" />
            </div>
          )}
          
          {/* Active terminal indicator */}
          {isActive && (
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full flex items-center justify-center">
              <Activity className="w-2 h-2 text-white animate-pulse" />
            </div>
          )}
          
          {/* Git dirty indicator */}
          {isDirty && (
            <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-orange-500 rounded-full flex items-center justify-center">
              <GitBranch className="w-2 h-2 text-white" />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ProjectIcon;