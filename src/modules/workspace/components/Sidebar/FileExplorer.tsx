import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  size?: number;
  modified?: Date;
  extension?: string;
}

interface FileExplorerProps {
  projectPath: string;
  theme?: 'dark' | 'light';
  onFileSelect?: (file: FileNode) => void;
}

const FileExplorer: React.FC<FileExplorerProps> = ({ 
  projectPath, 
  theme = 'dark',
  onFileSelect 
}) => {
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; node: FileNode } | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [newName, setNewName] = useState('');

  // Fetch file tree from API
  const fetchFileTree = useCallback(async () => {
    try {
      setLoading(true);
      // Use project path if provided
      const pathParam = projectPath ? `&path=${encodeURIComponent(projectPath)}` : '';
      const response = await fetch(`/api/workspace/files?depth=4${pathParam}`);
      const data = await response.json();
      
      if (data.success) {
        setFileTree(data.files || []);
      } else {
        console.error('Failed to fetch file tree:', data.error);
        toast.error('Failed to load files');
      }
    } catch (error) {
      console.error('Error fetching file tree:', error);
      toast.error('Failed to load files');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [projectPath]);

  useEffect(() => {
    fetchFileTree();
  }, [fetchFileTree]);

  // Refresh file tree
  const refreshFileTree = () => {
    setRefreshing(true);
    fetchFileTree();
  };

  const toggleExpand = (path: string) => {
    setExpandedPaths(prev => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  };

  const handleFileClick = async (node: FileNode) => {
    if (node.type === 'directory') {
      toggleExpand(node.path);
    } else {
      setSelectedFile(node.path);
      
      // Read file content
      try {
        const response = await fetch('/api/workspace/files', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            action: 'read',
            path: projectPath && node.path ? `${projectPath}${node.path.startsWith('/') ? '' : '/'}${node.path}` : node.path 
          })
        });
        
        const data = await response.json();
        if (data.success) {
          onFileSelect?.({
            ...node,
            content: data.content
          } as FileNode & { content: string });
        }
      } catch (error) {
        console.error('Error reading file:', error);
        toast.error('Failed to read file');
      }
    }
  };

  // Handle context menu
  const handleContextMenu = (e: React.MouseEvent, node: FileNode) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, node });
  };

  // Close context menu
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  // Handle file operations
  const handleDelete = async (node: FileNode) => {
    if (!confirm(`Are you sure you want to delete ${node.name}?`)) return;
    
    try {
      const response = await fetch('/api/workspace/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'delete',
          path: projectPath && node.path ? `${projectPath}${node.path.startsWith('/') ? '' : '/'}${node.path}` : node.path 
        })
      });
      
      const data = await response.json();
      if (data.success) {
        toast.success('Deleted successfully');
        fetchFileTree();
      } else {
        toast.error(data.error || 'Failed to delete');
      }
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error('Failed to delete');
    }
  };

  const handleRename = async (node: FileNode) => {
    if (!newName || newName === node.name) {
      setRenaming(null);
      return;
    }
    
    try {
      const newPath = node.path.replace(node.name, newName);
      const response = await fetch('/api/workspace/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'rename',
          path: projectPath && node.path ? `${projectPath}${node.path.startsWith('/') ? '' : '/'}${node.path}` : node.path,
          newPath: projectPath && newPath ? `${projectPath}${newPath.startsWith('/') ? '' : '/'}${newPath}` : newPath
        })
      });
      
      const data = await response.json();
      if (data.success) {
        toast.success('Renamed successfully');
        setRenaming(null);
        fetchFileTree();
      } else {
        toast.error(data.error || 'Failed to rename');
      }
    } catch (error) {
      console.error('Error renaming:', error);
      toast.error('Failed to rename');
    }
  };

  const handleNewFile = async (parentPath: string = '/') => {
    const fileName = prompt('Enter file name:');
    if (!fileName) return;
    
    try {
      const response = await fetch('/api/workspace/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'create',
          path: projectPath ? `${projectPath}${parentPath}/${fileName}` : `${parentPath}/${fileName}`,
          content: ''
        })
      });
      
      const data = await response.json();
      if (data.success) {
        toast.success('File created successfully');
        fetchFileTree();
      } else {
        toast.error(data.error || 'Failed to create file');
      }
    } catch (error) {
      console.error('Error creating file:', error);
      toast.error('Failed to create file');
    }
  };

  const handleNewFolder = async (parentPath: string = '/') => {
    const folderName = prompt('Enter folder name:');
    if (!folderName) return;
    
    try {
      const response = await fetch('/api/workspace/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'mkdir',
          path: projectPath ? `${projectPath}${parentPath}/${folderName}` : `${parentPath}/${folderName}`
        })
      });
      
      const data = await response.json();
      if (data.success) {
        toast.success('Folder created successfully');
        fetchFileTree();
      } else {
        toast.error(data.error || 'Failed to create folder');
      }
    } catch (error) {
      console.error('Error creating folder:', error);
      toast.error('Failed to create folder');
    }
  };

  const getFileIcon = (node: FileNode) => {
    if (node.type === 'directory') {
      return expandedPaths.has(node.path) ? '📂' : '📁';
    }
    
    // File icons based on extension
    const ext = node.extension?.toLowerCase();
    switch (ext) {
      case 'ts':
      case 'tsx':
        return '📘';
      case 'js':
      case 'jsx':
        return '📙';
      case 'css':
      case 'scss':
        return '🎨';
      case 'json':
        return '📋';
      case 'md':
        return '📝';
      case 'prisma':
        return '🗄️';
      case 'env':
        return '🔐';
      case 'svg':
      case 'png':
      case 'jpg':
        return '🖼️';
      default:
        return '📄';
    }
  };

  const renderFileNode = (node: FileNode, depth: number = 0) => {
    const isExpanded = expandedPaths.has(node.path);
    const isSelected = selectedFile === node.path;
    const isDirectory = node.type === 'directory';
    const isRenaming = renaming === node.path;
    
    // Filter by search query
    if (searchQuery && !node.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return null;
    }

    return (
      <div key={node.path}>
        <div
          onClick={() => !isRenaming && handleFileClick(node)}
          onContextMenu={(e) => handleContextMenu(e, node)}
          className={`
            flex items-center space-x-1 py-1 px-2 cursor-pointer rounded transition-colors
            ${isSelected ? (theme === 'dark' ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-600') : ''}
            ${theme === 'dark' ? 'hover:bg-gray-700/50' : 'hover:bg-gray-200/50'}
          `}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          {isDirectory && (
            <div className="flex-shrink-0 transition-transform duration-200" style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
              <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          )}
          <span className="flex-shrink-0 text-sm">{getFileIcon(node)}</span>
          {isRenaming ? (
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onBlur={() => handleRename(node)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename(node);
                if (e.key === 'Escape') setRenaming(null);
              }}
              onClick={(e) => e.stopPropagation()}
              className={`text-xs px-1 rounded ${theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}
              autoFocus
            />
          ) : (
            <span className={`text-xs truncate ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              {node.name}
            </span>
          )}
        </div>
        
        {isDirectory && isExpanded && node.children && (
          <div>
            {node.children.map(child => renderFileNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${theme === 'dark' ? 'border-blue-500' : 'border-blue-600'} mx-auto`}></div>
          <p className={`mt-2 text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>Loading files...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Search Bar */}
      <div className={`p-3 border-b flex-shrink-0 ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="relative">
          <svg 
            className={`absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search files..."
            className={`
              w-full pl-8 pr-3 py-1.5 text-xs rounded-lg
              ${theme === 'dark' 
                ? 'bg-gray-700 text-gray-300 placeholder-gray-500 focus:bg-gray-600' 
                : 'bg-gray-100 text-gray-700 placeholder-gray-400 focus:bg-white'
              }
              focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all
            `}
          />
        </div>
      </div>

      {/* File Tree */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="h-full overflow-y-auto overflow-x-hidden custom-scrollbar p-2">
          {fileTree.length > 0 ? (
            <div className="space-y-0.5">
              {fileTree.map(node => renderFileNode(node))}
            </div>
          ) : (
            <div className={`text-center py-8 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
              <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <p className="text-xs">No files found</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className={`p-3 border-t flex-shrink-0 ${theme === 'dark' ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'}`}>
        <div className="flex items-center justify-between">
          <div className="flex space-x-1">
            <button 
              className={`p-1.5 rounded ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-200'} transition-colors`}
              title="New File"
              onClick={() => handleNewFile()}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>
            <button 
              className={`p-1.5 rounded ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-200'} transition-colors`}
              title="New Folder"
              onClick={() => handleNewFolder()}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
            <button 
              className={`p-1.5 rounded ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-200'} transition-colors ${refreshing ? 'animate-spin' : ''}`}
              title="Refresh"
              onClick={refreshFileTree}
              disabled={refreshing}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
          <button 
            className={`p-1.5 rounded ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-200'} transition-colors`}
            title="Collapse All"
            onClick={() => setExpandedPaths(new Set())}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className={`fixed z-50 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg shadow-lg py-1`}
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            onClick={() => {
              setNewName(contextMenu.node.name);
              setRenaming(contextMenu.node.path);
              setContextMenu(null);
            }}
            className={`w-full text-left px-4 py-2 text-sm ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-700'}`}
          >
            Rename
          </button>
          <button
            onClick={() => {
              handleDelete(contextMenu.node);
              setContextMenu(null);
            }}
            className={`w-full text-left px-4 py-2 text-sm ${theme === 'dark' ? 'hover:bg-gray-700 text-red-400' : 'hover:bg-gray-100 text-red-600'}`}
          >
            Delete
          </button>
          {contextMenu.node.type === 'directory' && (
            <>
              <div className={`border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} my-1`}></div>
              <button
                onClick={() => {
                  handleNewFile(contextMenu.node.path);
                  setContextMenu(null);
                }}
                className={`w-full text-left px-4 py-2 text-sm ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-700'}`}
              >
                New File
              </button>
              <button
                onClick={() => {
                  handleNewFolder(contextMenu.node.path);
                  setContextMenu(null);
                }}
                className={`w-full text-left px-4 py-2 text-sm ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-700'}`}
              >
                New Folder
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default FileExplorer;