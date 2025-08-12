'use client';

import React, { useState, useEffect, useRef } from 'react';
import { GitBranch, Check, Plus, Search, AlertCircle, Clock } from 'lucide-react';
import { GitBranch as GitBranchType } from '@/types/git';

interface QuickBranchSwitcherProps {
  currentBranch: string;
  branches: GitBranchType[];
  onBranchChange: (branch: string) => void;
  projectId: string;
  disabled?: boolean;
}

const QuickBranchSwitcher: React.FC<QuickBranchSwitcherProps> = ({
  currentBranch,
  branches,
  onBranchChange,
  projectId,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredBranches, setFilteredBranches] = useState<GitBranchType[]>([]);
  const [recentBranches, setRecentBranches] = useState<string[]>([]);
  const [showNewBranch, setShowNewBranch] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Load recent branches from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(`recent-branches-${projectId}`);
    if (stored) {
      setRecentBranches(JSON.parse(stored));
    }
  }, [projectId]);
  
  // Filter branches based on search
  useEffect(() => {
    if (searchQuery) {
      const filtered = branches.filter(branch =>
        branch.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredBranches(filtered);
    } else {
      setFilteredBranches(branches);
    }
  }, [searchQuery, branches]);
  
  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowNewBranch(false);
        setSearchQuery('');
        setNewBranchName('');
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Focus search when opened
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);
  
  const handleBranchSelect = (branchName: string) => {
    // Update recent branches
    const updated = [branchName, ...recentBranches.filter(b => b !== branchName)].slice(0, 5);
    setRecentBranches(updated);
    localStorage.setItem(`recent-branches-${projectId}`, JSON.stringify(updated));
    
    onBranchChange(branchName);
    setIsOpen(false);
    setSearchQuery('');
  };
  
  const handleCreateBranch = async () => {
    if (!newBranchName.trim()) return;
    
    try {
      const response = await fetch('/api/workspace/git/create-branch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          projectId,
          branchName: newBranchName.trim(),
          checkout: true,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create branch');
      }
      
      handleBranchSelect(newBranchName.trim());
      setNewBranchName('');
      setShowNewBranch(false);
    } catch (error) {
      console.error('Failed to create branch:', error);
    }
  };
  
  const getRecentBranchObjects = () => {
    return recentBranches
      .map(name => branches.find(b => b.name === name))
      .filter(Boolean) as GitBranchType[];
  };
  
  const renderBranchItem = (branch: GitBranchType) => {
    const isCurrent = branch.name === currentBranch;
    const isProtected = branch.name === 'main' || branch.name === 'master' || branch.name === 'develop';
    
    return (
      <button
        key={branch.name}
        onClick={() => !isCurrent && handleBranchSelect(branch.name)}
        disabled={isCurrent}
        className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-all ${
          isCurrent
            ? 'bg-blue-500/20 text-blue-400 cursor-default'
            : 'hover:bg-gray-700/50 text-gray-300 hover:text-white'
        }`}
      >
        <div className="flex items-center space-x-2">
          <GitBranch className="w-4 h-4" />
          <span className="font-medium">{branch.name}</span>
          {isProtected && (
            <AlertCircle className="w-3 h-3 text-yellow-500" title="Protected branch" />
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {branch.ahead > 0 && (
            <span className="text-xs text-green-400">↑{branch.ahead}</span>
          )}
          {branch.behind > 0 && (
            <span className="text-xs text-red-400">↓{branch.behind}</span>
          )}
          {isCurrent && <Check className="w-4 h-4 text-blue-400" />}
        </div>
      </button>
    );
  };
  
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={`flex items-center space-x-2 px-3 py-2 rounded-lg bg-gray-800/50 border border-gray-700/50 hover:bg-gray-700/50 transition-all ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        <GitBranch className="w-4 h-4 text-blue-400" />
        <span className="text-sm font-medium text-gray-200">{currentBranch}</span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden">
          {/* Search */}
          <div className="p-3 border-b border-gray-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search branches..."
                className="w-full pl-10 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {/* Recent branches */}
            {!searchQuery && recentBranches.length > 0 && (
              <div className="p-2">
                <div className="flex items-center space-x-2 px-3 py-1 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  <span>Recent</span>
                </div>
                {getRecentBranchObjects().map(renderBranchItem)}
              </div>
            )}
            
            {/* All branches */}
            <div className="p-2">
              {!searchQuery && recentBranches.length > 0 && (
                <div className="px-3 py-1 text-xs text-gray-500">All branches</div>
              )}
              {filteredBranches.length > 0 ? (
                filteredBranches.map(renderBranchItem)
              ) : (
                <div className="px-3 py-2 text-sm text-gray-500">No branches found</div>
              )}
            </div>
          </div>
          
          {/* Create new branch */}
          <div className="p-2 border-t border-gray-700">
            {showNewBranch ? (
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateBranch()}
                  placeholder="Branch name..."
                  className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  autoFocus
                />
                <button
                  onClick={handleCreateBranch}
                  className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Create
                </button>
                <button
                  onClick={() => {
                    setShowNewBranch(false);
                    setNewBranchName('');
                  }}
                  className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowNewBranch(true)}
                className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-700/50 rounded-lg transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Create new branch</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default QuickBranchSwitcher;