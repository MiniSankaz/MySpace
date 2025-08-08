import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface QuickActionsProps {
  onClose: () => void;
  theme: 'dark' | 'light';
}

interface Action {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  shortcut?: string;
  category: 'project' | 'file' | 'terminal' | 'settings' | 'help';
  action: () => void;
}

const QuickActions: React.FC<QuickActionsProps> = ({ onClose, theme }) => {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const actions: Action[] = [
    {
      id: 'new-project',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>,
      title: 'New Project',
      description: 'Create a new project',
      shortcut: '⌘N',
      category: 'project',
      action: () => console.log('New project'),
    },
    {
      id: 'open-project',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>,
      title: 'Open Project',
      description: 'Open an existing project',
      shortcut: '⌘O',
      category: 'project',
      action: () => console.log('Open project'),
    },
    {
      id: 'new-terminal',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
      title: 'New Terminal',
      description: 'Open a new terminal tab',
      shortcut: '⌘T',
      category: 'terminal',
      action: () => console.log('New terminal'),
    },
    {
      id: 'claude-terminal',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
      title: 'Claude Terminal',
      description: 'Open Claude Code CLI',
      category: 'terminal',
      action: () => console.log('Claude terminal'),
    },
    {
      id: 'search-files',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>,
      title: 'Search Files',
      description: 'Search in project files',
      shortcut: '⌘P',
      category: 'file',
      action: () => console.log('Search files'),
    },
    {
      id: 'settings',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
      title: 'Settings',
      description: 'Open workspace settings',
      shortcut: '⌘,',
      category: 'settings',
      action: () => console.log('Settings'),
    },
    {
      id: 'keyboard-shortcuts',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>,
      title: 'Keyboard Shortcuts',
      description: 'View all keyboard shortcuts',
      shortcut: '⌘?',
      category: 'help',
      action: () => console.log('Keyboard shortcuts'),
    },
  ];

  const filteredActions = actions.filter(action =>
    action.title.toLowerCase().includes(search.toLowerCase()) ||
    action.description.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, filteredActions.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredActions[selectedIndex]) {
          filteredActions[selectedIndex].action();
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, filteredActions, onClose]);

  const getCategoryColor = (category: Action['category']) => {
    switch (category) {
      case 'project': return 'text-blue-500';
      case 'file': return 'text-green-500';
      case 'terminal': return 'text-purple-500';
      case 'settings': return 'text-orange-500';
      case 'help': return 'text-pink-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>

      {/* Modal */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className={`relative w-full max-w-2xl ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-2xl overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className={`p-4 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="relative">
            <svg className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setSelectedIndex(0);
              }}
              placeholder="Type a command or search..."
              className={`w-full pl-10 pr-4 py-3 ${theme === 'dark' ? 'bg-gray-700 text-white placeholder-gray-400' : 'bg-gray-100 text-gray-900 placeholder-gray-500'} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500`}
            />
          </div>
        </div>

        {/* Actions List */}
        <div className="max-h-96 overflow-y-auto">
          {filteredActions.length > 0 ? (
            <div className="py-2">
              {filteredActions.map((action, index) => (
                <button
                  key={action.id}
                  onClick={() => {
                    action.action();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full px-4 py-3 flex items-center justify-between ${
                    index === selectedIndex
                      ? theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'
                      : ''
                  } ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} transition-colors`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={getCategoryColor(action.category)}>
                      {action.icon}
                    </div>
                    <div className="text-left">
                      <div className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {action.title}
                      </div>
                      <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                        {action.description}
                      </div>
                    </div>
                  </div>
                  {action.shortcut && (
                    <div className="flex items-center space-x-1">
                      {action.shortcut.split('').map((key, i) => (
                        <kbd key={i} className={`px-2 py-1 text-xs ${theme === 'dark' ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-600'} rounded`}>
                          {key}
                        </kbd>
                      ))}
                    </div>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className={`p-8 text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              No commands found
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`p-3 border-t ${theme === 'dark' ? 'border-gray-700 bg-gray-900/50' : 'border-gray-200 bg-gray-50'} flex items-center justify-between text-xs`}>
          <div className="flex items-center space-x-4">
            <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              <kbd className={`px-1.5 py-0.5 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} rounded`}>↑↓</kbd> Navigate
            </span>
            <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              <kbd className={`px-1.5 py-0.5 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} rounded`}>↵</kbd> Select
            </span>
            <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              <kbd className={`px-1.5 py-0.5 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} rounded`}>ESC</kbd> Close
            </span>
          </div>
          <span className={`${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
            {filteredActions.length} commands
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default QuickActions;