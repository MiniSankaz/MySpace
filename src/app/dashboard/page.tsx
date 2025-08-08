'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  UserIcon, 
  ChatBubbleLeftRightIcon, 
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  HomeIcon,
  UsersIcon,
  ChartBarIcon,
  BellIcon,
  CommandLineIcon
} from '@heroicons/react/24/outline';

interface User {
  id: string;
  email: string;
  username: string;
  displayName?: string;
  roles?: any[];
  profile?: any;
}

interface DashboardStats {
  totalConversations: number;
  totalMessages: number;
  activeUsers: number;
  todayActivity: number;
}

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalConversations: 0,
    totalMessages: 0,
    activeUsers: 0,
    todayActivity: 0
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    checkAuth();
    loadDashboardData();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const storedUser = localStorage.getItem('user');
      
      if (!token || !storedUser) {
        router.push('/login');
        return;
      }

      setUser(JSON.parse(storedUser));
    } catch (error) {
      console.error('Auth check error:', error);
      router.push('/login');
    }
  };

  const loadDashboardData = async () => {
    try {
      // Load user profile
      const token = localStorage.getItem('accessToken');
      const userResponse = await fetch('/api/ums/users/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (userResponse.ok) {
        const userData = await userResponse.json();
        setUser(userData.user);
      }

      // Load stats (mock data for now)
      setStats({
        totalConversations: 12,
        totalMessages: 156,
        activeUsers: 3,
        todayActivity: 28
      });
    } catch (error) {
      console.error('Load dashboard data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      await fetch('/api/ums/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      router.push('/login');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button className="p-2 text-gray-400 hover:text-gray-500">
                <BellIcon className="h-6 w-6" />
              </button>
              <div className="flex items-center space-x-3">
                <div className="text-sm text-right">
                  <p className="text-gray-900 font-medium">
                    {user?.displayName || user?.username}
                  </p>
                  <p className="text-gray-500">{user?.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 text-gray-400 hover:text-gray-500"
                  title="Logout"
                >
                  <ArrowRightOnRectangleIcon className="h-6 w-6" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <nav className="space-y-1">
              <button
                onClick={() => setActiveTab('overview')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                  activeTab === 'overview'
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <HomeIcon className="mr-3 h-5 w-5" />
                Overview
              </button>
              <button
                onClick={() => setActiveTab('assistant')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                  activeTab === 'assistant'
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <ChatBubbleLeftRightIcon className="mr-3 h-5 w-5" />
                AI Assistant
              </button>
              <button
                onClick={() => setActiveTab('terminal')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                  activeTab === 'terminal'
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <CommandLineIcon className="mr-3 h-5 w-5" />
                Terminal
              </button>
              <button
                onClick={() => setActiveTab('profile')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                  activeTab === 'profile'
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <UserIcon className="mr-3 h-5 w-5" />
                Profile
              </button>
              {user?.roles?.includes('admin') && (
                <>
                  <button
                    onClick={() => setActiveTab('users')}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                      activeTab === 'users'
                        ? 'bg-gray-900 text-white'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <UsersIcon className="mr-3 h-5 w-5" />
                    Users
                  </button>
                  <button
                    onClick={() => setActiveTab('analytics')}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                      activeTab === 'analytics'
                        ? 'bg-gray-900 text-white'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <ChartBarIcon className="mr-3 h-5 w-5" />
                    Analytics
                  </button>
                </>
              )}
              <button
                onClick={() => setActiveTab('settings')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                  activeTab === 'settings'
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Cog6ToothIcon className="mr-3 h-5 w-5" />
                Settings
              </button>
            </nav>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {activeTab === 'overview' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Overview</h2>
                
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  <div className="bg-white p-6 rounded-lg shadow">
                    <p className="text-sm font-medium text-gray-600">Total Conversations</p>
                    <p className="mt-2 text-3xl font-semibold text-gray-900">
                      {stats.totalConversations}
                    </p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow">
                    <p className="text-sm font-medium text-gray-600">Total Messages</p>
                    <p className="mt-2 text-3xl font-semibold text-gray-900">
                      {stats.totalMessages}
                    </p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow">
                    <p className="text-sm font-medium text-gray-600">Active Users</p>
                    <p className="mt-2 text-3xl font-semibold text-gray-900">
                      {stats.activeUsers}
                    </p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow">
                    <p className="text-sm font-medium text-gray-600">Today's Activity</p>
                    <p className="mt-2 text-3xl font-semibold text-gray-900">
                      {stats.todayActivity}
                    </p>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => router.push('/assistant')}
                      className="p-4 text-left border rounded-lg hover:bg-gray-50"
                    >
                      <ChatBubbleLeftRightIcon className="h-6 w-6 text-indigo-600 mb-2" />
                      <p className="font-medium">Open AI Assistant</p>
                      <p className="text-sm text-gray-500">Start a conversation</p>
                    </button>
                    <button
                      onClick={() => setActiveTab('profile')}
                      className="p-4 text-left border rounded-lg hover:bg-gray-50"
                    >
                      <UserIcon className="h-6 w-6 text-indigo-600 mb-2" />
                      <p className="font-medium">Update Profile</p>
                      <p className="text-sm text-gray-500">Manage your information</p>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'assistant' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">AI Assistant</h2>
                <div className="bg-white rounded-lg shadow p-6">
                  <p className="text-gray-600 mb-4">
                    Access your personal AI assistant to help with various tasks.
                  </p>
                  <button
                    onClick={() => router.push('/assistant')}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    Open Assistant
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'profile' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Profile Settings</h2>
                <div className="bg-white rounded-lg shadow p-6">
                  <form className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Username
                      </label>
                      <input
                        type="text"
                        value={user?.username || ''}
                        readOnly
                        disabled
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm bg-gray-50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Email
                      </label>
                      <input
                        type="email"
                        value={user?.email || ''}
                        readOnly
                        disabled
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm bg-gray-50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Display Name
                      </label>
                      <input
                        type="text"
                        defaultValue={user?.displayName || ''}
                        onChange={(e) => setUser(prev => prev ? {...prev, displayName: e.target.value} : null)}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Roles
                      </label>
                      <div className="mt-1">
                        {user?.roles?.map((role, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 mr-2"
                          >
                            {typeof role === 'string' ? role : role?.name || role?.code || 'Unknown'}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <button
                        type="submit"
                        className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                      >
                        Save Changes
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {activeTab === 'terminal' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Web Terminal</h2>
                <div className="bg-white rounded-lg shadow p-6">
                  <p className="text-gray-600 mb-4">
                    Access a secure terminal session directly from your browser.
                  </p>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-yellow-800">
                      <strong>Warning:</strong> Terminal access provides direct command execution on the server. 
                      Use with caution.
                    </p>
                  </div>
                  <button
                    onClick={() => router.push('/terminal')}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gray-900 hover:bg-gray-800"
                  >
                    <CommandLineIcon className="mr-2 h-5 w-5" />
                    Open Terminal
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Settings</h2>
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Account Settings</h3>
                  <div className="space-y-4">
                    <button className="text-indigo-600 hover:text-indigo-500">
                      Change Password
                    </button>
                    <br />
                    <button className="text-indigo-600 hover:text-indigo-500">
                      Two-Factor Authentication
                    </button>
                    <br />
                    <button className="text-indigo-600 hover:text-indigo-500">
                      API Keys
                    </button>
                    <br />
                    <button className="text-red-600 hover:text-red-500">
                      Delete Account
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}