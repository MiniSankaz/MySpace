import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Project } from '../../types';

interface StatusBarProps {
  project: Project | null;
  theme: 'dark' | 'light';
}

const StatusBar: React.FC<StatusBarProps> = ({ project, theme }) => {
  const [time, setTime] = useState(new Date());
  const [cpuUsage, setCpuUsage] = useState(0);
  const [memoryUsage, setMemoryUsage] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
      // Simulate CPU and memory usage
      setCpuUsage(Math.floor(Math.random() * 30) + 10);
      setMemoryUsage(Math.floor(Math.random() * 40) + 20);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <motion.div 
      initial={{ y: 30 }}
      animate={{ y: 0 }}
      className={`h-7 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-t flex items-center justify-between px-4 flex-shrink-0 text-xs`}
    >
      {/* Left Section */}
      <div className="flex items-center space-x-4">
        {/* Project Status */}
        {project ? (
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              {project.name}
            </span>
            <span className={`${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
              {project.path}
            </span>
          </div>
        ) : (
          <span className={`${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
            No project
          </span>
        )}

        {/* Git Branch */}
        {project && (
          <div className="flex items-center space-x-1">
            <svg className="w-3 h-3 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2H6zm1 2a1 1 0 000 2h6a1 1 0 100-2H7zm6 7a1 1 0 011 1v3a1 1 0 11-2 0v-3a1 1 0 011-1zm-3 3a1 1 0 100 2h.01a1 1 0 100-2H10zm-4 1a1 1 0 011-1h.01a1 1 0 110 2H7a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
            <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              main
            </span>
          </div>
        )}
      </div>

      {/* Center Section */}
      <div className="flex items-center space-x-6">
        {/* Terminal Count */}
        <div className="flex items-center space-x-1">
          <svg className="w-3 h-3 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            2 terminals
          </span>
        </div>

        {/* System Resources */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <span className={`${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>CPU:</span>
            <span className={`${cpuUsage > 50 ? 'text-orange-500' : theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
              {cpuUsage}%
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <span className={`${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>MEM:</span>
            <span className={`${memoryUsage > 60 ? 'text-orange-500' : theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>
              {memoryUsage}%
            </span>
          </div>
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center space-x-4">
        {/* Notifications */}
        <button className={`flex items-center space-x-1 ${theme === 'dark' ? 'hover:text-gray-300' : 'hover:text-gray-700'} transition-colors`}>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>0</span>
        </button>

        {/* Encoding */}
        <span className={`${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
          UTF-8
        </span>

        {/* Line Ending */}
        <span className={`${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
          LF
        </span>

        {/* Time */}
        <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} font-mono`}>
          {time.toLocaleTimeString()}
        </span>
      </div>
    </motion.div>
  );
};

export default StatusBar;