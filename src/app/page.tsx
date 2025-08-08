'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const mainFeatures = [
    {
      title: '🤖 Personal Assistant',
      description: 'AI-powered assistant with task management, reminders, and notes',
      href: '/assistant',
      color: 'bg-gradient-to-br from-purple-500 to-pink-500',
      features: ['Task Management', 'Smart Reminders', 'Note Taking', 'AI Chat']
    },
    {
      title: '📊 Dashboard',
      description: 'Analytics and monitoring dashboard',
      href: '/admin',
      color: 'bg-gradient-to-br from-blue-500 to-cyan-500',
      features: ['Real-time Analytics', 'User Management', 'System Health', 'Reports']
    },
    {
      title: '🔧 API Explorer',
      description: 'Test and explore available APIs',
      href: '/api/health',
      color: 'bg-gradient-to-br from-green-500 to-teal-500',
      features: ['REST APIs', 'WebSocket', 'Documentation', 'Testing Tools']
    },
    {
      title: '📚 Documentation',
      description: 'System documentation and guides',
      href: '#',
      onClick: () => setIsMenuOpen(true),
      color: 'bg-gradient-to-br from-orange-500 to-red-500',
      features: ['User Guides', 'API Docs', 'Developer Docs', 'Tutorials']
    }
  ];

  const quickLinks = [
    { name: 'Health Check', href: '/api/health', icon: '❤️' },
    { name: 'Assistant Chat', href: '/assistant', icon: '💬' },
    { name: 'Task Manager', href: '/assistant', icon: '📝' },
    { name: 'Settings', href: '#', icon: '⚙️' }
  ];

  const docLinks = [
    { name: 'Getting Started', path: '/docs/guides/getting-started.md' },
    { name: 'API Documentation', path: '/docs/api' },
    { name: 'Architecture', path: '/docs/architecture' },
    { name: 'SOP Guidelines', path: '/docs/sop' },
    { name: 'Hot Reload Guide', path: '/HOT_RELOAD_GUIDE.md' },
    { name: 'Start Guide', path: '/START_GUIDE.md' }
  ];

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Navigation Bar */}
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Personal Assistant System
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              {quickLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <span>{link.icon}</span>
                  <span className="hidden sm:inline">{link.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h2 className="text-4xl sm:text-5xl font-extrabold text-gray-900 dark:text-white">
              Welcome to Your{' '}
              <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Personal Assistant
              </span>
            </h2>
            <p className="mt-4 text-xl text-gray-600 dark:text-gray-400">
              AI-powered productivity tools, task management, and smart automation
            </p>
            <div className="mt-8 flex justify-center space-x-4">
              <button
                onClick={() => router.push('/assistant')}
                className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
              >
                Open Assistant
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="px-8 py-3 bg-gradient-to-r from-green-600 to-teal-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
              >
                User Dashboard
              </button>
              <button
                onClick={() => router.push('/login')}
                className="px-8 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all border border-gray-200 dark:border-gray-700"
              >
                Login / Register
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Features Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">Main Features</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {mainFeatures.map((feature, index) => (
            <div
              key={index}
              className="relative group cursor-pointer"
              onClick={feature.onClick || (() => router.push(feature.href))}
            >
              <div className={`absolute inset-0 ${feature.color} rounded-2xl opacity-90 group-hover:opacity-100 transition-opacity`} />
              <div className="relative p-6 h-full">
                <h4 className="text-2xl font-bold text-white mb-2">{feature.title}</h4>
                <p className="text-white/90 text-sm mb-4">{feature.description}</p>
                <ul className="space-y-1">
                  {feature.features.map((item, i) => (
                    <li key={i} className="text-white/80 text-xs flex items-center">
                      <span className="mr-2">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="absolute bottom-4 right-4 text-white/60 group-hover:text-white transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* System Status */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">System Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Server Status</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">Online</p>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Database</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">Connected</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                <span className="text-2xl">🗄️</span>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">WebSocket</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">Active</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                <span className="text-2xl">📡</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => router.push('/assistant')}
            className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow text-center"
          >
            <span className="text-3xl mb-2 block">💬</span>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Start Chat</span>
          </button>
          <button
            onClick={() => router.push('/assistant')}
            className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow text-center"
          >
            <span className="text-3xl mb-2 block">📝</span>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Add Task</span>
          </button>
          <button
            onClick={() => router.push('/assistant')}
            className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow text-center"
          >
            <span className="text-3xl mb-2 block">⏰</span>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Set Reminder</span>
          </button>
          <button
            onClick={() => router.push('/assistant')}
            className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow text-center"
          >
            <span className="text-3xl mb-2 block">📋</span>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">View Notes</span>
          </button>
        </div>
      </div>

      {/* Documentation Modal */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black opacity-50" onClick={() => setIsMenuOpen(false)} />
            <div className="relative bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Documentation</h3>
              <div className="space-y-2">
                {docLinks.map((doc) => (
                  <div
                    key={doc.name}
                    className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg cursor-pointer transition-colors"
                  >
                    <p className="font-medium text-gray-900 dark:text-white">{doc.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{doc.path}</p>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="mt-6 w-full py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-20 border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-600 dark:text-gray-400">
            <p>Personal Assistant System v1.0.0</p>
            <p className="mt-2 text-sm">Built with Next.js, TypeScript, and AI Integration</p>
          </div>
        </div>
      </footer>
    </main>
  );
}