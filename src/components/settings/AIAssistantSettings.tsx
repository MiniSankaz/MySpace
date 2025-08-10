'use client';

import { useState, useEffect } from 'react';
import { 
  CpuChipIcon,
  ClockIcon,
  ChatBubbleLeftRightIcon,
  Cog6ToothIcon,
  LanguageIcon,
  BookmarkIcon,
  BugAntIcon,
  FireIcon
} from '@heroicons/react/24/outline';
import { authClient } from '@/core/auth/auth-client';

interface AIAssistantSettingsProps {
  user: any;
  tabId: string;
  onSave: (data: any) => Promise<void>;
  saving: boolean;
}

interface AISettings {
  responseTimeout: number;
  maxContextMessages: number;
  modelSelection: string;
  temperature: number;
  maxTokens: number;
  languagePreference: string;
  autoSaveConversations: boolean;
  debugMode: boolean;
}

const defaultSettings: AISettings = {
  responseTimeout: 60,
  maxContextMessages: 10,
  modelSelection: 'claude-3-sonnet',
  temperature: 0.7,
  maxTokens: 4096,
  languagePreference: 'en',
  autoSaveConversations: true,
  debugMode: false
};

const modelOptions = [
  { value: 'claude-3-sonnet', label: 'Claude 3 Sonnet (Balanced)' },
  { value: 'claude-3-opus', label: 'Claude 3 Opus (Most Capable)' },
  { value: 'claude-3-haiku', label: 'Claude 3 Haiku (Fast)' }
];

const languageOptions = [
  { value: 'en', label: 'English' },
  { value: 'th', label: 'ไทย (Thai)' },
  { value: 'es', label: 'Español (Spanish)' },
  { value: 'fr', label: 'Français (French)' },
  { value: 'de', label: 'Deutsch (German)' },
  { value: 'ja', label: '日本語 (Japanese)' },
  { value: 'zh', label: '中文 (Chinese)' }
];

export default function AIAssistantSettings({ user, tabId, onSave, saving }: AIAssistantSettingsProps) {
  const [settings, setSettings] = useState<AISettings>(defaultSettings);
  const [hasChanges, setHasChanges] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, [user]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const response = await authClient.fetch(`/api/settings/user?category=ai_assistant`);
      if (response.ok) {
        const data = await response.json();
        const userSettings = data.reduce((acc: any, config: any) => {
          acc[config.key] = config.value;
          return acc;
        }, {});
        
        setSettings({ ...defaultSettings, ...userSettings });
      }
    } catch (error) {
      console.error('Failed to load AI Assistant settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (key: keyof AISettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      await onSave({
        category: 'ai_assistant',
        settings: settings
      });
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save AI Assistant settings:', error);
    }
  };

  const resetToDefaults = () => {
    setSettings(defaultSettings);
    setHasChanges(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading AI Assistant settings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">AI Assistant Configuration</h3>
            <p className="mt-1 text-sm text-gray-500">
              Configure how the AI Assistant behaves and responds to your requests
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={resetToDefaults}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Reset to Defaults
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Performance Settings */}
        <div className="space-y-6">
          <div>
            <h4 className="text-base font-medium text-gray-900 flex items-center mb-4">
              <CpuChipIcon className="h-5 w-5 text-gray-400 mr-2" />
              Performance Settings
            </h4>

            {/* Response Timeout */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <ClockIcon className="h-4 w-4 inline mr-1" />
                Response Timeout (seconds)
              </label>
              <input
                type="number"
                min="10"
                max="300"
                value={settings.responseTimeout}
                onChange={(e) => handleSettingChange('responseTimeout', parseInt(e.target.value))}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
              <p className="mt-1 text-xs text-gray-500">
                Maximum time to wait for AI response (10-300 seconds)
              </p>
            </div>

            {/* Max Context Messages */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <ChatBubbleLeftRightIcon className="h-4 w-4 inline mr-1" />
                Max Context Messages
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={settings.maxContextMessages}
                onChange={(e) => handleSettingChange('maxContextMessages', parseInt(e.target.value))}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
              <p className="mt-1 text-xs text-gray-500">
                Number of previous messages to include for context (1-50)
              </p>
            </div>

            {/* Max Tokens */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Tokens per Response
              </label>
              <input
                type="number"
                min="100"
                max="8192"
                step="100"
                value={settings.maxTokens}
                onChange={(e) => handleSettingChange('maxTokens', parseInt(e.target.value))}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
              <p className="mt-1 text-xs text-gray-500">
                Maximum length of AI responses (100-8192 tokens)
              </p>
            </div>
          </div>
        </div>

        {/* Model & Quality Settings */}
        <div className="space-y-6">
          <div>
            <h4 className="text-base font-medium text-gray-900 flex items-center mb-4">
              <Cog6ToothIcon className="h-5 w-5 text-gray-400 mr-2" />
              Model & Quality Settings
            </h4>

            {/* Model Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                AI Model
              </label>
              <select
                value={settings.modelSelection}
                onChange={(e) => handleSettingChange('modelSelection', e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                {modelOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Choose the AI model based on your needs for speed vs capability
              </p>
            </div>

            {/* Temperature */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <FireIcon className="h-4 w-4 inline mr-1" />
                Creativity Level (Temperature: {settings.temperature})
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={settings.temperature}
                onChange={(e) => handleSettingChange('temperature', parseFloat(e.target.value))}
                className="mt-1 block w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>More Focused (0.0)</span>
                <span>More Creative (1.0)</span>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Higher values make responses more creative but less predictable
              </p>
            </div>

            {/* Language Preference */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <LanguageIcon className="h-4 w-4 inline mr-1" />
                Preferred Language
              </label>
              <select
                value={settings.languagePreference}
                onChange={(e) => handleSettingChange('languagePreference', e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                {languageOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                AI will primarily respond in this language when possible
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Behavior Settings */}
      <div className="border-t border-gray-200 pt-6">
        <h4 className="text-base font-medium text-gray-900 flex items-center mb-4">
          <BookmarkIcon className="h-5 w-5 text-gray-400 mr-2" />
          Behavior Settings
        </h4>

        <div className="space-y-4">
          {/* Auto-save Conversations */}
          <div className="flex items-center justify-between">
            <div>
              <h5 className="text-sm font-medium text-gray-900">Auto-save Conversations</h5>
              <p className="text-sm text-gray-500">
                Automatically save conversation history for future reference
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleSettingChange('autoSaveConversations', !settings.autoSaveConversations)}
              className={`${
                settings.autoSaveConversations ? 'bg-indigo-600' : 'bg-gray-200'
              } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2`}
            >
              <span
                className={`${
                  settings.autoSaveConversations ? 'translate-x-5' : 'translate-x-0'
                } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
              />
            </button>
          </div>

          {/* Debug Mode */}
          <div className="flex items-center justify-between">
            <div>
              <h5 className="text-sm font-medium text-gray-900 flex items-center">
                <BugAntIcon className="h-4 w-4 mr-1" />
                Debug Mode
              </h5>
              <p className="text-sm text-gray-500">
                Show additional technical information and error details
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleSettingChange('debugMode', !settings.debugMode)}
              className={`${
                settings.debugMode ? 'bg-indigo-600' : 'bg-gray-200'
              } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2`}
            >
              <span
                className={`${
                  settings.debugMode ? 'translate-x-5' : 'translate-x-0'
                } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Current Configuration Summary */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h5 className="text-sm font-medium text-gray-900 mb-2">Current Configuration Summary</h5>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Timeout:</span>
            <span className="ml-1 font-medium">{settings.responseTimeout}s</span>
          </div>
          <div>
            <span className="text-gray-500">Context:</span>
            <span className="ml-1 font-medium">{settings.maxContextMessages} msgs</span>
          </div>
          <div>
            <span className="text-gray-500">Model:</span>
            <span className="ml-1 font-medium">{settings.modelSelection}</span>
          </div>
          <div>
            <span className="text-gray-500">Temperature:</span>
            <span className="ml-1 font-medium">{settings.temperature}</span>
          </div>
        </div>
      </div>
    </div>
  );
}