'use client';

import { useState, useEffect } from 'react';
import { 
  UserIcon,
  KeyIcon,
  Cog6ToothIcon,
  BellIcon,
  ShieldCheckIcon,
  GlobeAltIcon,
  PaintBrushIcon,
  LanguageIcon,
  MoonIcon,
  SunIcon,
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  EnvelopeIcon,
  LockClosedIcon,
  ServerIcon,
  CircleStackIcon,
  DocumentTextIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';
import AppLayout from '@/components/layout/AppLayout';
import UserSettings from '@/components/settings/UserSettings';
import ApiSettings from '@/components/settings/ApiSettings';
import SystemSettings from '@/components/settings/SystemSettings';
import SecuritySettings from '@/components/settings/SecuritySettings';
import NotificationSettings from '@/components/settings/NotificationSettings';
import AppearanceSettings from '@/components/settings/AppearanceSettings';
import AIAssistantSettings from '@/components/settings/AIAssistantSettings';

interface SettingsTab {
  id: string;
  name: string;
  icon: any;
  component: any;
  description: string;
  category: 'user' | 'api' | 'system' | 'ai';
  requiresAdmin?: boolean;
}

const settingsTabs: SettingsTab[] = [
  // User Settings
  {
    id: 'profile',
    name: 'Profile',
    icon: UserIcon,
    component: UserSettings,
    description: 'Manage your personal information and preferences',
    category: 'user'
  },
  {
    id: 'appearance',
    name: 'Appearance',
    icon: PaintBrushIcon,
    component: AppearanceSettings,
    description: 'Customize the look and feel of the application',
    category: 'user'
  },
  {
    id: 'notifications',
    name: 'Notifications',
    icon: BellIcon,
    component: NotificationSettings,
    description: 'Configure how you receive notifications',
    category: 'user'
  },
  {
    id: 'security',
    name: 'Security',
    icon: ShieldCheckIcon,
    component: SecuritySettings,
    description: 'Manage your security settings and two-factor authentication',
    category: 'user'
  },
  // AI Assistant Settings
  {
    id: 'ai-assistant',
    name: 'AI Assistant',
    icon: ChatBubbleLeftRightIcon,
    component: AIAssistantSettings,
    description: 'Configure AI Assistant behavior and response settings',
    category: 'ai'
  },
  // API Settings
  {
    id: 'api-tokens',
    name: 'API Tokens',
    icon: KeyIcon,
    component: ApiSettings,
    description: 'Manage API tokens and access keys',
    category: 'api'
  },
  {
    id: 'api-limits',
    name: 'API Limits',
    icon: ChartBarIcon,
    component: ApiSettings,
    description: 'Configure rate limits and usage quotas',
    category: 'api'
  },
  {
    id: 'webhooks',
    name: 'Webhooks',
    icon: GlobeAltIcon,
    component: ApiSettings,
    description: 'Set up webhook endpoints for events',
    category: 'api'
  },
  {
    id: 'integrations',
    name: 'Integrations',
    icon: ServerIcon,
    component: ApiSettings,
    description: 'Connect with external services',
    category: 'api'
  },
  // System Settings (Admin Only)
  {
    id: 'system',
    name: 'System',
    icon: Cog6ToothIcon,
    component: SystemSettings,
    description: 'System-wide configuration and settings',
    category: 'system',
    requiresAdmin: true
  },
  {
    id: 'database',
    name: 'Database',
    icon: CircleStackIcon,
    component: SystemSettings,
    description: 'Database configuration and maintenance',
    category: 'system',
    requiresAdmin: true
  },
  {
    id: 'logs',
    name: 'Logs',
    icon: DocumentTextIcon,
    component: SystemSettings,
    description: 'View and manage system logs',
    category: 'system',
    requiresAdmin: true
  }
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        setUser(userData);
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (data: any) => {
    setSaving(true);
    setSavedMessage(null);
    
    try {
      // Save settings based on active tab
      console.log('Saving settings:', activeTab, data);
      
      // Make actual API call to save settings
      // Convert ai-assistant to ai_assistant for backend consistency
      const categoryForBackend = activeTab === 'ai-assistant' ? 'ai_assistant' : activeTab;
      
      const response = await fetch('/api/settings/user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user?.id || 'default_user',
          category: categoryForBackend,
          settings: data
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save settings');
      }

      const result = await response.json();
      console.log('Settings saved:', result);
      
      // Show success message
      setSavedMessage('Settings saved successfully!');
      setTimeout(() => setSavedMessage(null), 3000);
      
      // Reload page to apply new settings
      if (activeTab === 'ai-assistant' || activeTab === 'ai_assistant') {
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      setSavedMessage(error instanceof Error ? error.message : 'Failed to save settings. Please try again.');
      setTimeout(() => setSavedMessage(null), 5000);
    } finally {
      setSaving(false);
    }
  };

  const activeTabData = settingsTabs.find(tab => tab.id === activeTab);
  const isAdmin = user?.roles?.includes('admin');

  // Filter tabs based on user role
  const visibleTabs = settingsTabs.filter(tab => 
    !tab.requiresAdmin || isAdmin
  );

  // Group tabs by category
  const userTabs = visibleTabs.filter(tab => tab.category === 'user');
  const aiTabs = visibleTabs.filter(tab => tab.category === 'ai');
  const apiTabs = visibleTabs.filter(tab => tab.category === 'api');
  const systemTabs = visibleTabs.filter(tab => tab.category === 'system');

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-gray-500">Loading settings...</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage your account settings and preferences
          </p>
        </div>

        <div className="flex gap-8">
          {/* Sidebar Navigation */}
          <div className="w-64 flex-shrink-0">
            <nav className="space-y-6">
              {/* User Settings */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  User Settings
                </h3>
                <ul className="space-y-1">
                  {userTabs.map((tab) => (
                    <li key={tab.id}>
                      <button
                        onClick={() => setActiveTab(tab.id)}
                        className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                          activeTab === tab.id
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <tab.icon className="mr-3 h-5 w-5" />
                        {tab.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {/* AI Assistant Settings */}
              {aiTabs.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                    AI Assistant
                  </h3>
                  <ul className="space-y-1">
                    {aiTabs.map((tab) => (
                      <li key={tab.id}>
                        <button
                          onClick={() => setActiveTab(tab.id)}
                          className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                            activeTab === tab.id
                              ? 'bg-indigo-100 text-indigo-700'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <tab.icon className="mr-3 h-5 w-5" />
                          {tab.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* API Settings */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  API Configuration
                </h3>
                <ul className="space-y-1">
                  {apiTabs.map((tab) => (
                    <li key={tab.id}>
                      <button
                        onClick={() => setActiveTab(tab.id)}
                        className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                          activeTab === tab.id
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <tab.icon className="mr-3 h-5 w-5" />
                        {tab.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {/* System Settings (Admin) */}
              {systemTabs.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                    System Administration
                  </h3>
                  <ul className="space-y-1">
                    {systemTabs.map((tab) => (
                      <li key={tab.id}>
                        <button
                          onClick={() => setActiveTab(tab.id)}
                          className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                            activeTab === tab.id
                              ? 'bg-indigo-100 text-indigo-700'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <tab.icon className="mr-3 h-5 w-5" />
                          {tab.name}
                          {tab.requiresAdmin && (
                            <LockClosedIcon className="ml-auto h-4 w-4 text-gray-400" />
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <div className="bg-white shadow rounded-lg">
              {/* Tab Header */}
              <div className="border-b border-gray-200 px-6 py-4">
                <div className="flex items-center">
                  {activeTabData && (
                    <>
                      <activeTabData.icon className="h-6 w-6 text-gray-400 mr-3" />
                      <div>
                        <h2 className="text-lg font-medium text-gray-900">
                          {activeTabData.name}
                        </h2>
                        <p className="text-sm text-gray-500">
                          {activeTabData.description}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {savedMessage && (
                  <div className={`mb-4 p-4 rounded-md ${
                    savedMessage.includes('success') 
                      ? 'bg-green-50 text-green-800' 
                      : 'bg-red-50 text-red-800'
                  }`}>
                    {savedMessage}
                  </div>
                )}

                {activeTabData && (
                  <activeTabData.component
                    user={user}
                    tabId={activeTab}
                    onSave={handleSave}
                    saving={saving}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}