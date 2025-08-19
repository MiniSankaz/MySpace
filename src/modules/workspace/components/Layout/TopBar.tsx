import React from "react";
import { motion } from "framer-motion";

interface TopBarProps {
  theme: "dark" | "light";
  onThemeChange: (theme: "dark" | "light") => void;
  onQuickActions: () => void;
  fullscreen: boolean;
  onFullscreenToggle: () => void;
}

const TopBar: React.FC<TopBarProps> = ({
  theme,
  onThemeChange,
  onQuickActions,
  fullscreen,
  onFullscreenToggle,
}) => {
  return (
    <motion.div
      initial={{ y: -60 }}
      animate={{ y: 0 }}
      className={`h-14 ${theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"} border-b flex items-center justify-between px-4 flex-shrink-0`}
    >
      {/* Left Section */}
      <div className="flex items-center space-x-4">
        {/* Logo */}
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">W</span>
          </div>
          <span
            className={`font-bold text-lg ${theme === "dark" ? "text-white" : "text-gray-900"}`}
          >
            Workspace
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex items-center space-x-1">
          <button
            className={`px-3 py-1.5 rounded-lg ${theme === "dark" ? "hover:bg-gray-700 text-gray-300" : "hover:bg-gray-100 text-gray-700"} transition-colors text-sm font-medium`}
          >
            Projects
          </button>
          <button
            className={`px-3 py-1.5 rounded-lg ${theme === "dark" ? "hover:bg-gray-700 text-gray-300" : "hover:bg-gray-100 text-gray-700"} transition-colors text-sm font-medium`}
          >
            Files
          </button>
          <button
            className={`px-3 py-1.5 rounded-lg ${theme === "dark" ? "hover:bg-gray-700 text-gray-300" : "hover:bg-gray-100 text-gray-700"} transition-colors text-sm font-medium`}
          >
            Terminal
          </button>
        </nav>
      </div>

      {/* Center Section - Search */}
      <div className="flex-1 max-w-xl mx-4">
        <button
          onClick={onQuickActions}
          className={`w-full px-4 py-2 ${theme === "dark" ? "bg-gray-700 hover:bg-gray-600 text-gray-400" : "bg-gray-100 hover:bg-gray-200 text-gray-600"} rounded-lg transition-colors flex items-center justify-between group`}
        >
          <div className="flex items-center space-x-2">
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
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <span className="text-sm">Search or run commands...</span>
          </div>
          <div className="flex items-center space-x-1">
            <kbd
              className={`px-1.5 py-0.5 text-xs ${theme === "dark" ? "bg-gray-600" : "bg-gray-200"} rounded`}
            >
              ⌘
            </kbd>
            <kbd
              className={`px-1.5 py-0.5 text-xs ${theme === "dark" ? "bg-gray-600" : "bg-gray-200"} rounded`}
            >
              K
            </kbd>
          </div>
        </button>
      </div>

      {/* Right Section */}
      <div className="flex items-center space-x-2">
        {/* Fullscreen Toggle */}
        <button
          onClick={onFullscreenToggle}
          className={`p-2 rounded-lg ${theme === "dark" ? "hover:bg-gray-700 text-gray-400" : "hover:bg-gray-100 text-gray-600"} transition-colors`}
          title="Toggle fullscreen terminal (⌘⇧F)"
        >
          {fullscreen ? (
            <svg
              className="w-5 h-5"
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
          ) : (
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
              />
            </svg>
          )}
        </button>

        {/* Theme Toggle */}
        <button
          onClick={() => onThemeChange(theme === "dark" ? "light" : "dark")}
          className={`p-2 rounded-lg ${theme === "dark" ? "hover:bg-gray-700 text-gray-400" : "hover:bg-gray-100 text-gray-600"} transition-colors`}
          title="Toggle theme (⌘⇧D)"
        >
          {theme === "dark" ? (
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          ) : (
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
              />
            </svg>
          )}
        </button>

        {/* Settings */}
        <button
          className={`p-2 rounded-lg ${theme === "dark" ? "hover:bg-gray-700 text-gray-400" : "hover:bg-gray-100 text-gray-600"} transition-colors`}
          title="Settings"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </button>

        {/* User Menu */}
        <div className="ml-2 pl-2 border-l ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}">
          <button
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg ${theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-100"} transition-colors`}
          >
            <div className="w-7 h-7 bg-gradient-to-br from-green-400 to-blue-500 rounded-full"></div>
            <svg
              className="w-4 h-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default TopBar;
