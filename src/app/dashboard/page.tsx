'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ChatBubbleLeftRightIcon,
  CommandLineIcon,
  ChartBarIcon,
  ClockIcon,
  SparklesIcon,
  BoltIcon,
  CalendarDaysIcon,
  CpuChipIcon,
  CircleStackIcon,
  LanguageIcon
} from '@heroicons/react/24/outline';
import AppLayout from '@/components/layout/AppLayout';
import DashboardKPICard from '@/components/dashboard/DashboardKPICard';
import RealTimeActivityFeed from '@/components/dashboard/RealTimeActivityFeed';
import { useThaiLanguage } from '@/hooks/useThaiLanguage';

interface User {
  id: string;
  email: string;
  username: string;
  displayName?: string;
  roles?: string[];
}

interface DashboardData {
  user: {
    totalSessions: number;
    todayActivity: number;
    lastLogin: Date | null;
    activeProjects: number;
  };
  aiAssistant: {
    totalConversations: number;
    activeConversations: number;
    tokensUsed: number;
    totalCost: number;
    averageResponseTime: number;
    popularCommands: Array<{command: string; count: number}>;
  };
  terminal: {
    totalSessions: number;
    commandsExecuted: number;
    errorRate: number;
    averageExecutionTime: number;
  };
  system: {
    uptime: number;
    databaseHealth: 'healthy' | 'warning' | 'critical';
    memoryUsage: number;
    activeConnections: number;
    lastBackup: Date | null;
  };
  recentActivity: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: Date;
    status: string;
  }>;
}

export default function Dashboard() {
  const router = useRouter();
  const { t, lang, switchLanguage, formatNumber, formatCurrency, formatDate } = useThaiLanguage();
  const [user, setUser] = useState<User | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUserData();
    fetchDashboardData();
    
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchUserData = async () => {
    try {
      const response = await fetch('/api/ums/users/me');
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/dashboard/stats');
      
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }
      
      const result = await response.json();
      
      if (result.success && result.data) {
        setDashboardData(result.data);
        setError(null);
      } else {
        throw new Error(result.error || 'Invalid response format');
      }
    } catch (error) {
      console.error('Dashboard data error:', error);
      setError(error instanceof Error ? error.message : 'Failed to load dashboard data');
      
      // Set default data on error
      setDashboardData({
        user: {
          totalSessions: 0,
          todayActivity: 0,
          lastLogin: null,
          activeProjects: 0
        },
        aiAssistant: {
          totalConversations: 0,
          activeConversations: 0,
          tokensUsed: 0,
          totalCost: 0,
          averageResponseTime: 0,
          popularCommands: []
        },
        terminal: {
          totalSessions: 0,
          commandsExecuted: 0,
          errorRate: 0,
          averageExecutionTime: 0
        },
        system: {
          uptime: 0,
          databaseHealth: 'healthy',
          memoryUsage: 0,
          activeConnections: 0,
          lastBackup: null
        },
        recentActivity: []
      });
    } finally {
      setLoading(false);
    }
  };

  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days} ${t('time.days')} ${hours} ${t('time.hours')}`;
    if (hours > 0) return `${hours} ${t('time.hours')} ${minutes} ${t('time.minutes')}`;
    return `${minutes} ${t('time.minutes')}`;
  };

  const getSystemHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'green';
      case 'warning': return 'orange';
      case 'critical': return 'red';
      default: return 'blue';
    }
  };

  const getHealthText = (health: string): string => {
    switch (health) {
      case 'healthy': return t('status.healthy');
      case 'warning': return t('status.warning');
      case 'critical': return t('status.critical');
      default: return 'Unknown';
    }
  };

  const getCurrentDate = (): string => {
    const now = new Date();
    const days = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
    const months = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 
                   'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
    
    return `วัน${days[now.getDay()]}ที่ ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear() + 543}`;
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="p-6 space-y-6">
          {/* Welcome Section */}
          <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 backdrop-blur-sm rounded-2xl p-8 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  {t('welcome.greeting')}, {user?.displayName || user?.username || 'ผู้ใช้'} 👋
                </h1>
                <p className="text-gray-300">
                  {t('welcome.description')}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <button
                  onClick={() => switchLanguage(lang === 'th' ? 'en' : 'th')}
                  className="flex items-center gap-2 px-3 py-1 bg-gray-700/50 hover:bg-gray-700 
                           rounded-lg text-gray-300 text-sm transition-colors"
                >
                  <LanguageIcon className="w-4 h-4" />
                  <span>{lang === 'th' ? 'EN' : 'TH'}</span>
                </button>
                <div className="flex items-center gap-2 text-gray-400">
                  <CalendarDaysIcon className="w-5 h-5" />
                  <span>{getCurrentDate()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400">
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* KPI Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <DashboardKPICard
              title={t('kpi.aiConversations')}
              value={dashboardData?.aiAssistant.totalConversations || 0}
              icon={<ChatBubbleLeftRightIcon className="w-6 h-6" />}
              color="blue"
              trend={dashboardData?.aiAssistant.activeConversations ? 'up' : 'neutral'}
              trendValue={`${formatNumber(dashboardData?.aiAssistant.activeConversations || 0)} ${t('status.active')}`}
              description={t('kpi.aiConversationsDesc')}
              loading={loading}
              onClick={() => router.push('/assistant')}
            />

            <DashboardKPICard
              title={t('kpi.tokensUsed')}
              value={formatNumber(dashboardData?.aiAssistant.tokensUsed || 0)}
              icon={<SparklesIcon className="w-6 h-6" />}
              color="purple"
              description={`${t('status.cost')}: ${formatCurrency(dashboardData?.aiAssistant.totalCost || 0)}`}
              loading={loading}
            />

            <DashboardKPICard
              title={t('kpi.terminalSessions')}
              value={dashboardData?.terminal.totalSessions || 0}
              icon={<CommandLineIcon className="w-6 h-6" />}
              color="green"
              trend={dashboardData?.terminal.errorRate > 5 ? 'down' : 'up'}
              trendValue={`${dashboardData?.terminal.errorRate?.toFixed(1) || 0}% ${t('status.errors')}`}
              description={`${formatNumber(dashboardData?.terminal.commandsExecuted || 0)} ${t('status.commands')}`}
              loading={loading}
            />

            <DashboardKPICard
              title={t('kpi.todayActivity')}
              value={dashboardData?.user.todayActivity || 0}
              icon={<BoltIcon className="w-6 h-6" />}
              color="orange"
              trend="up"
              description={t('kpi.todayActivityDesc')}
              loading={loading}
            />
          </div>

          {/* System Health Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <DashboardKPICard
              title={t('kpi.systemUptime')}
              value={formatUptime(dashboardData?.system.uptime || 0)}
              icon={<ClockIcon className="w-6 h-6" />}
              color="green"
              description={t('kpi.systemUptimeDesc')}
              loading={loading}
            />

            <DashboardKPICard
              title={t('kpi.databaseHealth')}
              value={getHealthText(dashboardData?.system.databaseHealth || 'healthy')}
              icon={<CircleStackIcon className="w-6 h-6" />}
              color={getSystemHealthColor(dashboardData?.system.databaseHealth || 'healthy')}
              description={`${formatNumber(dashboardData?.system.activeConnections || 0)} ${t('status.connections')}`}
              loading={loading}
            />

            <DashboardKPICard
              title={t('kpi.memoryUsage')}
              value={dashboardData?.system.memoryUsage || 0}
              icon={<CpuChipIcon className="w-6 h-6" />}
              color={dashboardData?.system.memoryUsage > 80 ? 'red' : 'blue'}
              format="percentage"
              description={t('kpi.memoryUsageDesc')}
              loading={loading}
            />
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Activity Feed - Takes 2 columns */}
            <div className="lg:col-span-2">
              <RealTimeActivityFeed
                initialActivities={dashboardData?.recentActivity || []}
                maxItems={15}
                autoRefresh={true}
                refreshInterval={30000}
              />
            </div>

            {/* AI Popular Commands */}
            <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-800 p-6">
              <div className="flex items-center gap-2 mb-4">
                <ChartBarIcon className="w-5 h-5 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-200">{t('commands.title')}</h3>
              </div>
              
              <div className="space-y-3">
                {dashboardData?.aiAssistant.popularCommands?.length ? (
                  dashboardData.aiAssistant.popularCommands.map((cmd, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-gray-400 font-mono">{cmd.command}</span>
                      <span className="text-xs bg-gray-800 px-2 py-1 rounded text-gray-300">
                        {formatNumber(cmd.count)} {t('commands.uses')}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm">{t('commands.noCommands')}</p>
                )}
              </div>

              {/* Quick Actions */}
              <div className="mt-6 pt-6 border-t border-gray-800">
                <h4 className="text-sm font-medium text-gray-400 mb-3">{t('quickActions.title')}</h4>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => router.push('/assistant')}
                    className="p-3 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 
                             rounded-lg text-blue-400 text-sm transition-colors"
                  >
                    {t('quickActions.newChat')}
                  </button>
                  <button
                    onClick={() => router.push('/terminal')}
                    className="p-3 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 
                             rounded-lg text-green-400 text-sm transition-colors"
                  >
                    {t('quickActions.terminal')}
                  </button>
                  <button
                    onClick={() => router.push('/settings')}
                    className="p-3 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 
                             rounded-lg text-purple-400 text-sm transition-colors"
                  >
                    {t('quickActions.settings')}
                  </button>
                  <button
                    onClick={() => fetchDashboardData()}
                    className="p-3 bg-gray-500/10 hover:bg-gray-500/20 border border-gray-500/20 
                             rounded-lg text-gray-400 text-sm transition-colors"
                  >
                    {t('quickActions.refresh')}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-900/30 rounded-lg p-4 border border-gray-800">
              <div className="text-2xl font-bold text-white">
                {formatNumber(dashboardData?.user.activeProjects || 0)}
              </div>
              <div className="text-sm text-gray-400">{t('kpi.activeProjects')}</div>
            </div>
            <div className="bg-gray-900/30 rounded-lg p-4 border border-gray-800">
              <div className="text-2xl font-bold text-white">
                {formatNumber(dashboardData?.aiAssistant.averageResponseTime || 0)} ms
              </div>
              <div className="text-sm text-gray-400">{t('kpi.avgResponseTime')}</div>
            </div>
            <div className="bg-gray-900/30 rounded-lg p-4 border border-gray-800">
              <div className="text-2xl font-bold text-white">
                {formatNumber(dashboardData?.terminal.averageExecutionTime || 0)} ms
              </div>
              <div className="text-sm text-gray-400">{t('kpi.avgExecutionTime')}</div>
            </div>
            <div className="bg-gray-900/30 rounded-lg p-4 border border-gray-800">
              <div className="text-2xl font-bold text-white">
                {formatCurrency(dashboardData?.aiAssistant.totalCost || 0)}
              </div>
              <div className="text-sm text-gray-400">{t('kpi.totalCost')}</div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}