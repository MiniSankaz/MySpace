'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TerminalSession } from '../../types';

interface TerminalTabsProps {
  sessions: TerminalSession[];
  activeTab: string | null;
  onTabSelect: (sessionId: string) => void;
  onTabClose: (sessionId: string) => void;
  onNewTab: () => void;
}

const TerminalTabs: React.FC<TerminalTabsProps> = ({
  sessions,
  activeTab,
  onTabSelect,
  onTabClose,
  onNewTab,
}) => {
  return (
    <div className="flex items-center space-x-1 flex-1 overflow-x-auto scrollbar-none">
      <AnimatePresence mode="popLayout">
        {sessions.map((session) => (
          <motion.div
            key={session.id}
            initial={{ opacity: 0, scale: 0.9, x: -20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.9, x: -20 }}
            transition={{ duration: 0.2 }}
            className={`flex items-center px-3 py-1 rounded-md text-xs cursor-pointer transition-all min-w-fit ${
              activeTab === session.id
                ? 'bg-gray-700 text-white shadow-md'
                : 'bg-gray-800/50 text-gray-400 hover:bg-gray-750 hover:text-gray-300'
            }`}
            onClick={() => onTabSelect(session.id)}
          >
            <div className="flex items-center space-x-2">
              {/* Session indicator */}
              <div className={`w-1.5 h-1.5 rounded-full ${
                activeTab === session.id ? 'bg-green-400 animate-pulse' : 'bg-gray-500'
              }`} />
              
              {/* Tab name */}
              <span className="whitespace-nowrap font-medium">{session.tabName}</span>
              
              {/* Close button */}
              {sessions.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onTabClose(session.id);
                  }}
                  className="ml-1 p-0.5 hover:bg-gray-600 rounded transition-colors opacity-60 hover:opacity-100"
                >
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
      
      {/* New tab button */}
      {sessions.length < 5 && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onNewTab}
          className="p-1.5 text-gray-400 hover:text-gray-300 hover:bg-gray-700 rounded-md transition-all"
          title="New tab (⌘T)"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
        </motion.button>
      )}

      {/* Tab overflow indicator */}
      {sessions.length >= 5 && (
        <div className="px-2 py-1 text-xs text-gray-500">
          {sessions.length} tabs
        </div>
      )}
    </div>
  );
};

export default TerminalTabs;