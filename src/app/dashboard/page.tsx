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
        <div className="bg-gradient-to-r from-indigo-600 to-purple-700 rounded-lg shadow-xl p-6 text-white border border-indigo-500/20">
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
            <div key={stat.name} className="bg-gray-800 overflow-hidden shadow-lg rounded-lg border border-gray-700">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <stat.icon className="h-6 w-6 text-indigo-400" aria-hidden="true" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-400 truncate">{stat.name}</dt>
                      <dd className="flex items-baseline">
                        <div className="text-2xl font-semibold text-white">{stat.value}</div>
                        <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                          stat.changeType === 'positive' ? 'text-green-400' : 'text-red-400'
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

        {/* Recent Activity */}
        <div className="bg-gray-800 shadow-lg rounded-lg border border-gray-700">
          <div className="px-6 py-4 border-b border-gray-700">
            <h2 className="text-lg font-medium text-white">Recent Activity</h2>
          </div>
          <div className="p-6">
            <div className="flow-root">
              <ul role="list" className="-mb-8">
                {recentActivity.map((activity, activityIdx) => (
                  <li key={activity.id}>
                    <div className="relative pb-8">
                      {activityIdx !== recentActivity.length - 1 ? (
                        <span
                          className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-700"
                          aria-hidden="true"
                        />
                      ) : null}
                      <div className="relative flex space-x-3">
                        <div>
                          <span className="h-8 w-8 rounded-full bg-gray-700 flex items-center justify-center">
                            <activity.icon className="h-5 w-5 text-indigo-400" aria-hidden="true" />
                          </span>
                        </div>
                        <div className="flex min-w-0 flex-1 justify-between space-x-4">
                          <div>
                            <p className="text-sm text-gray-200">{activity.message}</p>
                          </div>
                          <div className="whitespace-nowrap text-right text-sm text-gray-400">
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

        {/* Project Overview */}
        <div className="bg-gray-800 shadow-lg rounded-lg border border-gray-700">
          <div className="px-6 py-4 border-b border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-white">Active Projects</h2>
              <button
                onClick={() => router.push('/workspace')}
                className="text-sm text-indigo-400 hover:text-indigo-300"
              >
                View all
              </button>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg border border-gray-600">
                <div className="flex items-center space-x-3">
                  <ServerIcon className="h-6 w-6 text-indigo-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-200">E-commerce Platform</p>
                    <p className="text-xs text-gray-400">Last updated 2 hours ago</p>
                  </div>
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900/50 text-green-400 border border-green-600/50">
                  Active
                </span>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg border border-gray-600">
                <div className="flex items-center space-x-3">
                  <DocumentTextIcon className="h-6 w-6 text-indigo-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-200">Blog Application</p>
                    <p className="text-xs text-gray-400">Last updated 1 day ago</p>
                  </div>
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-900/50 text-yellow-400 border border-yellow-600/50">
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