'use client';

import { useState, useEffect } from 'react';
import { authClient } from '@/core/auth/auth-client';
import { 
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon,
  PaintBrushIcon,
  SparklesIcon,
  AdjustmentsHorizontalIcon,
  SwatchIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';

interface AppearanceSettingsProps {
  user: any;
  tabId: string;
  onSave: (data: any) => void;
  saving: boolean;
}

export default function AppearanceSettings({ user, tabId, onSave, saving }: AppearanceSettingsProps) {
  const [formData, setFormData] = useState({
    // Theme Settings
    theme: 'system',
    darkModeSchedule: false,
    darkModeStart: '20:00',
    darkModeEnd: '07:00',
    
    // Color Scheme
    primaryColor: '#4F46E5',
    accentColor: '#10B981',
    backgroundColor: '#FFFFFF',
    textColor: '#111827',
    borderColor: '#E5E7EB',
    
    // Typography
    fontSize: 'medium',
    fontFamily: 'inter',
    lineHeight: 'normal',
    
    // Layout
    density: 'comfortable',
    sidebarPosition: 'left',
    sidebarCollapsed: false,
    headerStyle: 'fixed',
    footerVisible: true,
    
    // Visual Effects
    animations: true,
    reducedMotion: false,
    transparencyEffects: true,
    blurEffects: true,
    shadows: true,
    roundedCorners: 'medium',
    
    // Accessibility
    highContrast: false,
    colorBlindMode: 'none',
    focusIndicators: true,
    underlineLinks: false,
    
    // Components
    compactCards: false,
    showAvatars: true,
    showIcons: true,
    showTooltips: true,
    showBreadcrumbs: true,
    showProgress: true
  });

  const [previewMode, setPreviewMode] = useState(false);
  const [customThemes, setCustomThemes] = useState([]);

  const colorPresets = [
    { name: 'Indigo', primary: '#4F46E5', accent: '#10B981' },
    { name: 'Blue', primary: '#3B82F6', accent: '#F59E0B' },
    { name: 'Purple', primary: '#9333EA', accent: '#EC4899' },
    { name: 'Green', primary: '#10B981', accent: '#3B82F6' },
    { name: 'Red', primary: '#EF4444', accent: '#8B5CF6' },
    { name: 'Teal', primary: '#14B8A6', accent: '#F97316' }
  ];

  useEffect(() => {
    loadSettings();
    loadCustomThemes();
  }, []);

  useEffect(() => {
    if (previewMode) {
      applyTheme(formData);
    } else {
      resetTheme();
    }
  }, [formData, previewMode]);

  const loadSettings = async () => {
    try {
      const response = await authClient.fetch('/api/settings/appearance');
      if (response.ok) {
        const data = await response.json();
        setFormData(prev => ({ ...prev, ...data.settings }));
      }
    } catch (error) {
      console.error('Failed to load appearance settings:', error);
    }
  };

  const loadCustomThemes = async () => {
    try {
      const response = await authClient.fetch('/api/settings/themes');
      if (response.ok) {
        const data = await response.json();
        setCustomThemes(data.themes || []);
      }
    } catch (error) {
      console.error('Failed to load custom themes:', error);
    }
  };

  const applyTheme = (theme: any) => {
    // Apply theme to document root for preview
    const root = document.documentElement;
    root.style.setProperty('--primary-color', theme.primaryColor);
    root.style.setProperty('--accent-color', theme.accentColor);
    root.style.setProperty('--background-color', theme.backgroundColor);
    root.style.setProperty('--text-color', theme.textColor);
    root.style.setProperty('--border-color', theme.borderColor);
    
    // Apply other visual settings
    if (theme.theme === 'dark' || (theme.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    // Apply font size
    root.classList.remove('text-sm', 'text-base', 'text-lg');
    root.classList.add(theme.fontSize === 'small' ? 'text-sm' : theme.fontSize === 'large' ? 'text-lg' : 'text-base');
    
    // Apply density
    root.setAttribute('data-density', theme.density);
    
    // Apply reduced motion
    if (theme.reducedMotion) {
      root.classList.add('reduce-motion');
    } else {
      root.classList.remove('reduce-motion');
    }
  };

  const resetTheme = () => {
    // Reset to default theme
    const root = document.documentElement;
    root.style.removeProperty('--primary-color');
    root.style.removeProperty('--accent-color');
    root.style.removeProperty('--background-color');
    root.style.removeProperty('--text-color');
    root.style.removeProperty('--border-color');
    root.classList.remove('dark', 'reduce-motion', 'text-sm', 'text-lg');
    root.removeAttribute('data-density');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    setPreviewMode(false);
  };

  const applyPreset = (preset: typeof colorPresets[0]) => {
    setFormData({
      ...formData,
      primaryColor: preset.primary,
      accentColor: preset.accent
    });
  };

  const resetToDefaults = () => {
    setFormData({
      theme: 'system',
      darkModeSchedule: false,
      darkModeStart: '20:00',
      darkModeEnd: '07:00',
      primaryColor: '#4F46E5',
      accentColor: '#10B981',
      backgroundColor: '#FFFFFF',
      textColor: '#111827',
      borderColor: '#E5E7EB',
      fontSize: 'medium',
      fontFamily: 'inter',
      lineHeight: 'normal',
      density: 'comfortable',
      sidebarPosition: 'left',
      sidebarCollapsed: false,
      headerStyle: 'fixed',
      footerVisible: true,
      animations: true,
      reducedMotion: false,
      transparencyEffects: true,
      blurEffects: true,
      shadows: true,
      roundedCorners: 'medium',
      highContrast: false,
      colorBlindMode: 'none',
      focusIndicators: true,
      underlineLinks: false,
      compactCards: false,
      showAvatars: true,
      showIcons: true,
      showTooltips: true,
      showBreadcrumbs: true,
      showProgress: true
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Theme Selection */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Theme</h3>
        <div className="grid grid-cols-3 gap-4">
          <label className="relative flex cursor-pointer rounded-lg border bg-white p-4 shadow-sm focus:outline-none">
            <input
              type="radio"
              value="light"
              checked={formData.theme === 'light'}
              onChange={(e) => setFormData({ ...formData, theme: e.target.value })}
              className="sr-only"
            />
            <div className="flex flex-1 flex-col items-center">
              <SunIcon className="h-8 w-8 text-yellow-500 mb-2" />
              <span className="block text-sm font-medium text-gray-900">Light</span>
            </div>
            {formData.theme === 'light' && (
              <div className="absolute -inset-px rounded-lg border-2 border-indigo-500" />
            )}
          </label>

          <label className="relative flex cursor-pointer rounded-lg border bg-white p-4 shadow-sm focus:outline-none">
            <input
              type="radio"
              value="dark"
              checked={formData.theme === 'dark'}
              onChange={(e) => setFormData({ ...formData, theme: e.target.value })}
              className="sr-only"
            />
            <div className="flex flex-1 flex-col items-center">
              <MoonIcon className="h-8 w-8 text-gray-700 mb-2" />
              <span className="block text-sm font-medium text-gray-900">Dark</span>
            </div>
            {formData.theme === 'dark' && (
              <div className="absolute -inset-px rounded-lg border-2 border-indigo-500" />
            )}
          </label>

          <label className="relative flex cursor-pointer rounded-lg border bg-white p-4 shadow-sm focus:outline-none">
            <input
              type="radio"
              value="system"
              checked={formData.theme === 'system'}
              onChange={(e) => setFormData({ ...formData, theme: e.target.value })}
              className="sr-only"
            />
            <div className="flex flex-1 flex-col items-center">
              <ComputerDesktopIcon className="h-8 w-8 text-gray-500 mb-2" />
              <span className="block text-sm font-medium text-gray-900">System</span>
            </div>
            {formData.theme === 'system' && (
              <div className="absolute -inset-px rounded-lg border-2 border-indigo-500" />
            )}
          </label>
        </div>

        <div className="mt-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.darkModeSchedule}
              onChange={(e) => setFormData({ ...formData, darkModeSchedule: e.target.checked })}
              className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <span className="ml-2 text-sm text-gray-700">Schedule dark mode</span>
          </label>
          
          {formData.darkModeSchedule && (
            <div className="mt-3 ml-6 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Start time</label>
                <input
                  type="time"
                  value={formData.darkModeStart}
                  onChange={(e) => setFormData({ ...formData, darkModeStart: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">End time</label>
                <input
                  type="time"
                  value={formData.darkModeEnd}
                  onChange={(e) => setFormData({ ...formData, darkModeEnd: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Color Scheme */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Color Scheme</h3>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Quick Presets</label>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {colorPresets.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => applyPreset(preset)}
                className="p-2 border border-gray-200 rounded-lg hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <div className="flex space-x-1">
                  <div 
                    className="w-6 h-6 rounded"
                    style={{ backgroundColor: preset.primary }}
                  />
                  <div 
                    className="w-6 h-6 rounded"
                    style={{ backgroundColor: preset.accent }}
                  />
                </div>
                <span className="text-xs text-gray-600 mt-1 block">{preset.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">Primary Color</label>
            <div className="mt-1 flex items-center">
              <input
                type="color"
                value={formData.primaryColor}
                onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                className="h-10 w-10 border border-gray-300 rounded cursor-pointer"
              />
              <input
                type="text"
                value={formData.primaryColor}
                onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                className="ml-2 flex-1 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Accent Color</label>
            <div className="mt-1 flex items-center">
              <input
                type="color"
                value={formData.accentColor}
                onChange={(e) => setFormData({ ...formData, accentColor: e.target.value })}
                className="h-10 w-10 border border-gray-300 rounded cursor-pointer"
              />
              <input
                type="text"
                value={formData.accentColor}
                onChange={(e) => setFormData({ ...formData, accentColor: e.target.value })}
                className="ml-2 flex-1 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Border Color</label>
            <div className="mt-1 flex items-center">
              <input
                type="color"
                value={formData.borderColor}
                onChange={(e) => setFormData({ ...formData, borderColor: e.target.value })}
                className="h-10 w-10 border border-gray-300 rounded cursor-pointer"
              />
              <input
                type="text"
                value={formData.borderColor}
                onChange={(e) => setFormData({ ...formData, borderColor: e.target.value })}
                className="ml-2 flex-1 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Typography */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Typography</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">Font Size</label>
            <select
              value={formData.fontSize}
              onChange={(e) => setFormData({ ...formData, fontSize: e.target.value })}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
              <option value="xlarge">Extra Large</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Font Family</label>
            <select
              value={formData.fontFamily}
              onChange={(e) => setFormData({ ...formData, fontFamily: e.target.value })}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="inter">Inter</option>
              <option value="system">System Default</option>
              <option value="roboto">Roboto</option>
              <option value="opensans">Open Sans</option>
              <option value="montserrat">Montserrat</option>
              <option value="mono">Monospace</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Line Height</label>
            <select
              value={formData.lineHeight}
              onChange={(e) => setFormData({ ...formData, lineHeight: e.target.value })}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="tight">Tight</option>
              <option value="normal">Normal</option>
              <option value="relaxed">Relaxed</option>
              <option value="loose">Loose</option>
            </select>
          </div>
        </div>
      </div>

      {/* Layout */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Layout</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">Display Density</label>
            <select
              value={formData.density}
              onChange={(e) => setFormData({ ...formData, density: e.target.value })}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="compact">Compact</option>
              <option value="comfortable">Comfortable</option>
              <option value="spacious">Spacious</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Rounded Corners</label>
            <select
              value={formData.roundedCorners}
              onChange={(e) => setFormData({ ...formData, roundedCorners: e.target.value })}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="none">None</option>
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
              <option value="full">Full</option>
            </select>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.showBreadcrumbs}
              onChange={(e) => setFormData({ ...formData, showBreadcrumbs: e.target.checked })}
              className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <span className="ml-2 text-sm text-gray-700">Show breadcrumbs</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.footerVisible}
              onChange={(e) => setFormData({ ...formData, footerVisible: e.target.checked })}
              className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <span className="ml-2 text-sm text-gray-700">Show footer</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.compactCards}
              onChange={(e) => setFormData({ ...formData, compactCards: e.target.checked })}
              className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <span className="ml-2 text-sm text-gray-700">Compact cards</span>
          </label>
        </div>
      </div>

      {/* Visual Effects */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Visual Effects</h3>
        <div className="space-y-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.animations}
              onChange={(e) => setFormData({ ...formData, animations: e.target.checked })}
              className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <span className="ml-2 text-sm text-gray-700">Enable animations</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.transparencyEffects}
              onChange={(e) => setFormData({ ...formData, transparencyEffects: e.target.checked })}
              className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <span className="ml-2 text-sm text-gray-700">Transparency effects</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.blurEffects}
              onChange={(e) => setFormData({ ...formData, blurEffects: e.target.checked })}
              className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <span className="ml-2 text-sm text-gray-700">Blur effects</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.shadows}
              onChange={(e) => setFormData({ ...formData, shadows: e.target.checked })}
              className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <span className="ml-2 text-sm text-gray-700">Shadows</span>
          </label>
        </div>
      </div>

      {/* Accessibility */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Accessibility</h3>
        <div className="space-y-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.reducedMotion}
              onChange={(e) => setFormData({ ...formData, reducedMotion: e.target.checked })}
              className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <span className="ml-2 text-sm text-gray-700">Reduce motion</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.highContrast}
              onChange={(e) => setFormData({ ...formData, highContrast: e.target.checked })}
              className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <span className="ml-2 text-sm text-gray-700">High contrast mode</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.focusIndicators}
              onChange={(e) => setFormData({ ...formData, focusIndicators: e.target.checked })}
              className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <span className="ml-2 text-sm text-gray-700">Show focus indicators</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.underlineLinks}
              onChange={(e) => setFormData({ ...formData, underlineLinks: e.target.checked })}
              className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <span className="ml-2 text-sm text-gray-700">Underline links</span>
          </label>

          <div>
            <label className="block text-sm font-medium text-gray-700">Color Blind Mode</label>
            <select
              value={formData.colorBlindMode}
              onChange={(e) => setFormData({ ...formData, colorBlindMode: e.target.value })}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="none">None</option>
              <option value="protanopia">Protanopia (Red-blind)</option>
              <option value="deuteranopia">Deuteranopia (Green-blind)</option>
              <option value="tritanopia">Tritanopia (Blue-blind)</option>
              <option value="monochrome">Monochrome</option>
            </select>
          </div>
        </div>
      </div>

      {/* Preview and Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => setPreviewMode(!previewMode)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            {previewMode ? (
              <>
                <EyeSlashIcon className="h-4 w-4 mr-2" />
                Stop Preview
              </>
            ) : (
              <>
                <EyeIcon className="h-4 w-4 mr-2" />
                Preview
              </>
            )}
          </button>

          <button
            type="button"
            onClick={resetToDefaults}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            Reset to Defaults
          </button>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save Appearance Settings'}
        </button>
      </div>
    </form>
  );
}