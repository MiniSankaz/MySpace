'use client';

import React from 'react';
import { 
  FileText, 
  FilePlus, 
  FileX, 
  GitMerge, 
  AlertTriangle, 
  Clock,
  CheckCircle,
  Loader2,
  Upload,
  Download
} from 'lucide-react';
import { GitStatus } from '@/types/git';

interface VisualStatusIndicatorsProps {
  status: GitStatus | null;
  loading?: boolean;
}

const VisualStatusIndicators: React.FC<VisualStatusIndicatorsProps> = ({ 
  status,
  loading = false 
}) => {
  if (loading) {
    return (
      <div className="flex items-center space-x-2">
        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
        <span className="text-sm text-gray-400">Updating...</span>
      </div>
    );
  }
  
  if (!status) {
    return null;
  }
  
  const hasChanges = status.modified.length > 0 || 
                     status.staged.length > 0 || 
                     status.untracked.length > 0;
  
  const getStatusColor = () => {
    if (status.conflicts.length > 0) return 'text-red-400';
    if (status.staged.length > 0) return 'text-green-400';
    if (status.modified.length > 0) return 'text-yellow-400';
    return 'text-gray-400';
  };
  
  const getStatusText = () => {
    if (status.conflicts.length > 0) return 'Conflicts';
    if (status.staged.length > 0) return 'Ready to commit';
    if (status.modified.length > 0) return 'Changes';
    if (status.untracked.length > 0) return 'Untracked files';
    return 'Clean';
  };
  
  return (
    <div className="flex items-center space-x-4">
      {/* Main status indicator */}
      <div className={`flex items-center space-x-2 ${getStatusColor()}`}>
        {status.conflicts.length > 0 ? (
          <AlertTriangle className="w-4 h-4" />
        ) : hasChanges ? (
          <GitMerge className="w-4 h-4" />
        ) : (
          <CheckCircle className="w-4 h-4" />
        )}
        <span className="text-sm font-medium">{getStatusText()}</span>
      </div>
      
      {/* File counts */}
      <div className="flex items-center space-x-3 text-xs">
        {status.modified.length > 0 && (
          <div className="flex items-center space-x-1 text-yellow-400">
            <FileText className="w-3 h-3" />
            <span>{status.modified.length}</span>
          </div>
        )}
        
        {status.staged.length > 0 && (
          <div className="flex items-center space-x-1 text-green-400">
            <FilePlus className="w-3 h-3" />
            <span>{status.staged.length}</span>
          </div>
        )}
        
        {status.untracked.length > 0 && (
          <div className="flex items-center space-x-1 text-gray-400">
            <FileX className="w-3 h-3" />
            <span>{status.untracked.length}</span>
          </div>
        )}
        
        {status.conflicts.length > 0 && (
          <div className="flex items-center space-x-1 text-red-400">
            <AlertTriangle className="w-3 h-3" />
            <span>{status.conflicts.length}</span>
          </div>
        )}
      </div>
      
      {/* Sync status */}
      {(status.ahead > 0 || status.behind > 0) && (
        <div className="flex items-center space-x-2 text-xs">
          {status.ahead > 0 && (
            <div className="flex items-center space-x-1 text-green-400">
              <Upload className="w-3 h-3" />
              <span>{status.ahead}</span>
            </div>
          )}
          
          {status.behind > 0 && (
            <div className="flex items-center space-x-1 text-blue-400">
              <Download className="w-3 h-3" />
              <span>{status.behind}</span>
            </div>
          )}
        </div>
      )}
      
      {/* Last fetch time */}
      {status.lastFetch && (
        <div className="flex items-center space-x-1 text-xs text-gray-500">
          <Clock className="w-3 h-3" />
          <span>{formatTimeSince(status.lastFetch)}</span>
        </div>
      )}
    </div>
  );
};

function formatTimeSince(date: Date | string): string {
  const now = new Date();
  const then = new Date(date);
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default VisualStatusIndicators;