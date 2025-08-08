'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface FileTab {
  id: string;
  name: string;
  path: string;
  hasChanges?: boolean;
}

interface FileTabsProps {
  tabs: FileTab[];
  activeTab: string | null;
  onTabSelect: (id: string) => void;
  onTabClose: (id: string) => void;
  theme?: 'dark' | 'light';
}

const FileTabs: React.FC<FileTabsProps> = ({
  tabs,
  activeTab,
  onTabSelect,
  onTabClose,
  theme = 'dark'
}) => {
  return (
    <div className={`flex items-center overflow-x-auto scrollbar-thin ${
      theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'
    }`}>
      {tabs.map((tab) => (
        <motion.div
          key={tab.id}
          initial={{ opacity: 0, width: 0 }}
          animate={{ opacity: 1, width: 'auto' }}
          exit={{ opacity: 0, width: 0 }}
          className={`
            flex items-center group cursor-pointer border-r
            ${activeTab === tab.id 
              ? theme === 'dark' 
                ? 'bg-gray-900 border-gray-700' 
                : 'bg-white border-gray-300'
              : theme === 'dark'
                ? 'bg-gray-800 hover:bg-gray-750 border-gray-700'
                : 'bg-gray-100 hover:bg-gray-200 border-gray-300'
            }
          `}
          onClick={() => onTabSelect(tab.id)}
        >
          <div className="flex items-center px-3 py-2 max-w-xs">
            <span className={`text-sm truncate ${
              activeTab === tab.id
                ? theme === 'dark' ? 'text-white' : 'text-gray-900'
                : theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>
              {tab.name}
            </span>
            {tab.hasChanges && (
              <span className="ml-2 w-2 h-2 bg-yellow-500 rounded-full"></span>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTabClose(tab.id);
              }}
              className={`ml-2 p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                theme === 'dark' 
                  ? 'hover:bg-gray-700' 
                  : 'hover:bg-gray-300'
              }`}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default FileTabs;