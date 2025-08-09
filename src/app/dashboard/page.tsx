'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ChatBubbleLeftRightIcon,
  FolderOpenIcon,
  CommandLineIcon,
  UserIcon,
  ChartBarIcon,
  ClockIcon,
  DocumentTextIcon,
  ServerIcon,
  SparklesIcon,
  BoltIcon,
  ArrowTrendingUpIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline';
import AppLayout from '@/components/layout/AppLayout';

interface User {
  id: string;
  email: string;
  username: string;
  displayName?: string;
  roles?: string[];
}

interface DashboardStats {
  totalConversations: number;
  totalMessages: number;
  activeProjects: number;
  terminalSessions: number;
  todayActivity: number;
  weeklyGrowth: number;
}

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalConversations: 0,
    totalMessages: 0,
    activeProjects: 0,
    terminalSessions: 0,
    todayActivity: 0,
    weeklyGrowth: 0
  });
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }

      // Load stats (using mock data for now, replace with actual API calls)
      setStats({
        totalConversations: 24,
        totalMessages: 342,
        activeProjects: 5,
        terminalSessions: 18,
        todayActivity: 47,
        weeklyGrowth: 12.5
      });

      // Load recent activity
      setRecentActivity([
        { id: 1, type: 'chat', message: 'AI Assistant conversation about React hooks', time: '2 hours ago', icon: ChatBubbleLeftRightIcon },
        { id: 2, type: 'terminal', message: 'Terminal session: npm install completed', time: '3 hours ago', icon: CommandLineIcon },
        { id: 3, type: 'project', message: 'New project created: E-commerce Platform', time: '5 hours ago', icon: FolderOpenIcon },
        { id: 4, type: 'chat', message: 'Code review with Claude AI', time: '1 day ago', icon: SparklesIcon },
      ]);
    } catch (error) {
      console.error('Load dashboard data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    {
      title: 'AI Assistant',
      description: 'Start a conversation with Claude',
      icon: ChatBubbleLeftRightIcon,
      color: 'bg-blue-500',
      href: '/assistant'
    },
    {
      title: 'Workspace',
      description: 'Manage your projects',
      icon: FolderOpenIcon,
      color: 'bg-green-500',
      href: '/workspace'
    },
    {
      title: 'Terminal',
      description: 'Access command line',
      icon: CommandLineIcon,
      color: 'bg-purple-500',
      href: '/terminal'
    },
    {
      title: 'Analytics',
      description: 'View your statistics',
      icon: ChartBarIcon,
      color: 'bg-orange-500',
      href: '/analytics'
    }
  ];

  const statsCards = [
    {
      name: 'Total Conversations',
      value: stats.totalConversations,
      icon: ChatBubbleLeftRightIcon,
      change: '+12%',
      changeType: 'positive'
    },
    {
      name: 'Active Projects',
      value: stats.activeProjects,
      icon: FolderOpenIcon,
      change: '+2',
      changeType: 'positive'
    },
    {
      name: 'Terminal Sessions',
      value: stats.terminalSessions,
      icon: CommandLineIcon,
      change: '+5',
      changeType: 'positive'
    },
    {
      name: "Today's Activity",
      value: stats.todayActivity,
      icon: BoltIcon,
      change: `+${stats.weeklyGrowth}%`,
      changeType: 'positive'
    }
  ];

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-gray-500">Loading dashboard...</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
          <h1 className="text-3xl font-bold">
            Welcome back, {user?.displayName || user?.username}!
          </h1>
          <p className="mt-2 text-indigo-100">
            Here's what's happening with your projects today.
          </p>
          <div className="mt-4 flex items-center space-x-2 text-sm">
            <CalendarDaysIcon className="h-5 w-5" />
            <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {statsCards.map((stat) => (
            <div key={stat.name} className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <stat.icon className="h-6 w-6 text-gray-400" aria-hidden="true" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">{stat.name}</dt>
                      <dd className="flex items-baseline">
                        <div className="text-2xl font-semibold text-gray-900">{stat.value}</div>
                        <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                          stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {stat.change}
                        </div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions and Recent Activity */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Quick Actions */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Quick Actions</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                {quickActions.map((action) => (
                  <button
                    key={action.title}
                    onClick={() => router.push(action.href)}
                    className="relative rounded-lg p-4 text-left hover:bg-gray-50 border border-gray-200 transition-colors"
                  >
                    <div className={`inline-flex p-3 rounded-lg ${action.color} text-white`}>
                      <action.icon className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">{action.title}</h3>
                    <p className="mt-1 text-xs text-gray-500">{action.description}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Recent Activity</h2>
            </div>
            <div className="p-6">
              <div className="flow-root">
                <ul role="list" className="-mb-8">
                  {recentActivity.map((activity, activityIdx) => (
                    <li key={activity.id}>
                      <div className="relative pb-8">
                        {activityIdx !== recentActivity.length - 1 ? (
                          <span
                            className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                            aria-hidden="true"
                          />
                        ) : null}
                        <div className="relative flex space-x-3">
                          <div>
                            <span className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                              <activity.icon className="h-5 w-5 text-gray-500" aria-hidden="true" />
                            </span>
                          </div>
                          <div className="flex min-w-0 flex-1 justify-between space-x-4">
                            <div>
                              <p className="text-sm text-gray-900">{activity.message}</p>
                            </div>
                            <div className="whitespace-nowrap text-right text-sm text-gray-500">
                              <time>{activity.time}</time>
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Project Overview */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">Active Projects</h2>
              <button
                onClick={() => router.push('/workspace')}
                className="text-sm text-indigo-600 hover:text-indigo-500"
              >
                View all
              </button>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <ServerIcon className="h-6 w-6 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">E-commerce Platform</p>
                    <p className="text-xs text-gray-500">Last updated 2 hours ago</p>
                  </div>
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Active
                </span>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <DocumentTextIcon className="h-6 w-6 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Blog Application</p>
                    <p className="text-xs text-gray-500">Last updated 1 day ago</p>
                  </div>
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  In Progress
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}