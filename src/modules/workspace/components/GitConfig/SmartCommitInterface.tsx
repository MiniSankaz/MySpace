'use client';

import React, { useState, useEffect } from 'react';
import { 
  GitCommit, 
  FileText, 
  Plus, 
  Minus, 
  Check,
  X,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { GitStatus } from '@/types/git';
import { useToast } from '@/components/ui/use-toast';

interface SmartCommitInterfaceProps {
  status: GitStatus | null;
  projectId: string;
  onCommit: () => void;
}

interface CommitTemplate {
  name: string;
  template: string;
  icon: string;
}

const COMMIT_TEMPLATES: CommitTemplate[] = [
  { name: 'Feature', template: 'feat: ', icon: '✨' },
  { name: 'Fix', template: 'fix: ', icon: '🐛' },
  { name: 'Docs', template: 'docs: ', icon: '📚' },
  { name: 'Style', template: 'style: ', icon: '💎' },
  { name: 'Refactor', template: 'refactor: ', icon: '♻️' },
  { name: 'Test', template: 'test: ', icon: '🧪' },
  { name: 'Chore', template: 'chore: ', icon: '🔧' },
];

const SmartCommitInterface: React.FC<SmartCommitInterfaceProps> = ({
  status,
  projectId,
  onCommit,
}) => {
  const [commitMessage, setCommitMessage] = useState('');
  const [commitDescription, setCommitDescription] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['staged', 'modified']));
  const [isCommitting, setIsCommitting] = useState(false);
  const { toast } = useToast();
  
  // Initialize selected files with staged files
  useEffect(() => {
    if (status) {
      setSelectedFiles(new Set(status.staged));
    }
  }, [status]);
  
  if (!status) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <AlertCircle className="w-6 h-6 mr-2" />
        <span>No git repository found</span>
      </div>
    );
  }
  
  const handleFileToggle = (file: string) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(file)) {
      newSelected.delete(file);
    } else {
      newSelected.add(file);
    }
    setSelectedFiles(newSelected);
  };
  
  const handleSelectAll = (files: string[]) => {
    const allSelected = files.every(f => selectedFiles.has(f));
    if (allSelected) {
      const newSelected = new Set(selectedFiles);
      files.forEach(f => newSelected.delete(f));
      setSelectedFiles(newSelected);
    } else {
      setSelectedFiles(new Set([...selectedFiles, ...files]));
    }
  };
  
  const handleCommit = async () => {
    if (!commitMessage.trim()) {
      toast({
        title: 'Commit message required',
        description: 'Please enter a commit message',
        variant: 'destructive',
      });
      return;
    }
    
    if (selectedFiles.size === 0) {
      toast({
        title: 'No files selected',
        description: 'Please select files to commit',
        variant: 'destructive',
      });
      return;
    }
    
    setIsCommitting(true);
    try {
      // Stage selected files
      const filesToStage = Array.from(selectedFiles);
      const stageResponse = await fetch('/api/workspace/git/stage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          projectId,
          files: filesToStage,
        }),
      });
      
      if (!stageResponse.ok) {
        throw new Error('Failed to stage files');
      }
      
      // Commit
      const fullMessage = commitDescription 
        ? `${commitMessage}\n\n${commitDescription}` 
        : commitMessage;
        
      const commitResponse = await fetch('/api/workspace/git/commit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          projectId,
          message: fullMessage,
        }),
      });
      
      if (!commitResponse.ok) {
        const error = await commitResponse.json();
        throw new Error(error.message || 'Failed to commit');
      }
      
      toast({
        title: 'Commit successful',
        description: `Committed ${selectedFiles.size} files`,
      });
      
      // Reset form
      setCommitMessage('');
      setCommitDescription('');
      setSelectedFiles(new Set());
      onCommit();
    } catch (error) {
      console.error('Commit failed:', error);
      toast({
        title: 'Commit failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsCommitting(false);
    }
  };
  
  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };
  
  const renderFileSection = (title: string, files: string[], sectionKey: string, color: string) => {
    if (files.length === 0) return null;
    
    const isExpanded = expandedSections.has(sectionKey);
    const allSelected = files.every(f => selectedFiles.has(f));
    const someSelected = files.some(f => selectedFiles.has(f));
    
    return (
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => toggleSection(sectionKey)}
            className="flex items-center space-x-2 text-sm font-medium text-gray-300 hover:text-white"
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <span>{title}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs ${color}`}>
              {files.length}
            </span>
          </button>
          
          <button
            onClick={() => handleSelectAll(files)}
            className="text-xs text-gray-400 hover:text-gray-300"
          >
            {allSelected ? 'Deselect all' : someSelected ? 'Select remaining' : 'Select all'}
          </button>
        </div>
        
        {isExpanded && (
          <div className="space-y-1">
            {files.map(file => (
              <label
                key={file}
                className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-gray-800/30 hover:bg-gray-800/50 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedFiles.has(file)}
                  onChange={() => handleFileToggle(file)}
                  className="w-4 h-4 rounded border-gray-600 text-blue-500 focus:ring-blue-500"
                />
                <FileText className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-300 flex-1">{file}</span>
                {sectionKey === 'staged' && (
                  <span className="text-xs text-green-400">staged</span>
                )}
                {sectionKey === 'modified' && (
                  <span className="text-xs text-yellow-400">modified</span>
                )}
                {sectionKey === 'untracked' && (
                  <span className="text-xs text-gray-500">untracked</span>
                )}
              </label>
            ))}
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div className="h-full flex flex-col">
      {/* Commit message form */}
      <div className="bg-gray-800/30 rounded-xl p-4 mb-4">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Commit Message
          </label>
          
          {/* Template buttons */}
          <div className="flex flex-wrap gap-2 mb-3">
            {COMMIT_TEMPLATES.map(template => (
              <button
                key={template.name}
                onClick={() => setCommitMessage(template.template + commitMessage.replace(/^[^:]+:\s*/, ''))}
                className="px-3 py-1 rounded-lg bg-gray-700/50 hover:bg-gray-700 text-xs text-gray-300 hover:text-white transition-colors"
                title={template.name}
              >
                <span className="mr-1">{template.icon}</span>
                {template.name}
              </button>
            ))}
          </div>
          
          <input
            type="text"
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            placeholder="Enter commit message..."
            className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Description (optional)
          </label>
          <textarea
            value={commitDescription}
            onChange={(e) => setCommitDescription(e.target.value)}
            placeholder="Add an optional extended description..."
            rows={3}
            className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
          />
        </div>
        
        <button
          onClick={handleCommit}
          disabled={isCommitting || selectedFiles.size === 0 || !commitMessage.trim()}
          className={`w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all ${
            selectedFiles.size > 0 && commitMessage.trim()
              ? 'bg-blue-500 hover:bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isCommitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Committing...</span>
            </>
          ) : (
            <>
              <GitCommit className="w-4 h-4" />
              <span>Commit {selectedFiles.size > 0 && `(${selectedFiles.size} files)`}</span>
            </>
          )}
        </button>
      </div>
      
      {/* File selection */}
      <div className="flex-1 overflow-auto">
        {renderFileSection('Staged Files', status.staged, 'staged', 'bg-green-500/20 text-green-400')}
        {renderFileSection('Modified Files', status.modified, 'modified', 'bg-yellow-500/20 text-yellow-400')}
        {renderFileSection('Untracked Files', status.untracked, 'untracked', 'bg-gray-600 text-gray-400')}
        
        {status.conflicts.length > 0 && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <div className="flex items-center space-x-2 text-red-400">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Conflicts must be resolved</span>
            </div>
            <div className="mt-2 space-y-1">
              {status.conflicts.map(file => (
                <div key={file} className="text-sm text-red-300">{file}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SmartCommitInterface;