'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

// Dynamic import to avoid SSR issues with xterm
const WebTerminal = dynamic(
  () => import('@/modules/terminal/components/WebTerminal').then(mod => mod.WebTerminal),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-white">Loading terminal...</div>
      </div>
    )
  }
);

export default function TerminalPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }
    
    setIsAuthenticated(true);
    setLoading(false);
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-white">Checking authentication...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold text-white">Web Terminal</h1>
            <span className="text-sm text-gray-400">
              Execute commands on the server
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors"
            >
              Dashboard
            </button>
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors"
            >
              Home
            </button>
          </div>
        </div>
      </div>

      {/* Terminal */}
      <div className="flex-1 overflow-hidden">
        <WebTerminal className="h-full" />
      </div>

      {/* Footer */}
      <div className="bg-gray-800 border-t border-gray-700 px-6 py-2">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center space-x-4">
            <span>Use Ctrl+C to interrupt</span>
            <span>•</span>
            <span>Ctrl+D to exit</span>
            <span>•</span>
            <span>Ctrl+L to clear</span>
          </div>
          <div>
            <span>Powered by xterm.js & node-pty</span>
          </div>
        </div>
      </div>
    </div>
  );
}