'use client';

import { useState, useEffect } from 'react';
import { authClient } from '@/core/auth/auth-client';
import { 
  ShieldCheckIcon,
  KeyIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

interface SecuritySettingsProps {
  user: any;
  tabId: string;
  onSave: (data: any) => void;
  saving: boolean;
}

interface ActiveSession {
  id: string;
  device: string;
  browser: string;
  ip: string;
  location: string;
  lastActive: string;
  current: boolean;
}

export default function SecuritySettings({ user, tabId, onSave, saving }: SecuritySettingsProps) {
  const [formData, setFormData] = useState({
    // Password Settings
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    
    // Two-Factor Authentication
    twoFactorEnabled: false,
    twoFactorMethod: 'app',
    twoFactorPhone: '',
    twoFactorEmail: '',
    
    // Session Security
    rememberDevice: true,
    sessionTimeout: 24,
    logoutAllDevices: false,
    
    // Security Preferences
    emailLoginAlerts: true,
    suspiciousActivityAlerts: true,
    monthlySecurityReport: false,
    requirePasswordChange: false,
    passwordChangeFrequency: 90,
    
    // Account Recovery
    recoveryEmail: '',
    recoveryPhone: '',
    securityQuestions: [],
    
    // Advanced Security
    ipRestriction: false,
    allowedIPs: [],
    blockTorAccess: false,
    blockVPNAccess: false,
    enableGeoBlocking: false,
    blockedCountries: []
  });

  const [showQRCode, setShowQRCode] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [passwordStrength, setPasswordStrength] = useState(0);

  useEffect(() => {
    loadSettings();
    loadActiveSessions();
  }, []);

  useEffect(() => {
    if (formData.newPassword) {
      calculatePasswordStrength(formData.newPassword);
    }
  }, [formData.newPassword]);

  const loadSettings = async () => {
    try {
      const response = await authClient.fetch('/api/settings/security');
      if (response.ok) {
        const data = await response.json();
        setFormData(prev => ({ ...prev, ...data.settings }));
      }
    } catch (error) {
      console.error('Failed to load security settings:', error);
    }
  };

  const loadActiveSessions = async () => {
    try {
      const response = await authClient.fetch('/api/settings/sessions');
      if (response.ok) {
        const data = await response.json();
        setActiveSessions(data.sessions || [
          {
            id: '1',
            device: 'MacBook Pro',
            browser: 'Chrome 120',
            ip: '192.168.1.1',
            location: 'Bangkok, Thailand',
            lastActive: '2 minutes ago',
            current: true
          },
          {
            id: '2',
            device: 'iPhone 14',
            browser: 'Safari',
            ip: '192.168.1.2',
            location: 'Bangkok, Thailand',
            lastActive: '1 hour ago',
            current: false
          }
        ]);
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  };

  const calculatePasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (password.length >= 12) strength += 25;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 25;
    if (/\d/.test(password)) strength += 12.5;
    if (/[^a-zA-Z\d]/.test(password)) strength += 12.5;
    setPasswordStrength(strength);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    
    onSave(formData);
  };

  const enableTwoFactor = async () => {
    try {
      const response = await authClient.fetch('/api/settings/2fa/enable', {
        method: 'POST'
      });
      
      if (response.ok) {
        const data = await response.json();
        setShowQRCode(true);
      }
    } catch (error) {
      console.error('Failed to enable 2FA:', error);
    }
  };

  const verifyTwoFactor = async () => {
    try {
      const response = await authClient.fetch('/api/settings/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: verificationCode })
      });
      
      if (response.ok) {
        setFormData({ ...formData, twoFactorEnabled: true });
        setShowQRCode(false);
        setVerificationCode('');
      }
    } catch (error) {
      console.error('Failed to verify 2FA:', error);
    }
  };

  const revokeSession = async (sessionId: string) => {
    try {
      const response = await authClient.fetch(`/api/settings/sessions/${sessionId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setActiveSessions(activeSessions.filter(s => s.id !== sessionId));
      }
    } catch (error) {
      console.error('Failed to revoke session:', error);
    }
  };

  const revokeAllSessions = async () => {
    if (!confirm('This will log you out of all devices except this one. Continue?')) {
      return;
    }
    
    try {
      const response = await authClient.fetch('/api/settings/sessions/revoke-all', {
        method: 'POST'
      });
      
      if (response.ok) {
        setActiveSessions(activeSessions.filter(s => s.current));
      }
    } catch (error) {
      console.error('Failed to revoke all sessions:', error);
    }
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength < 25) return 'bg-red-500';
    if (passwordStrength < 50) return 'bg-orange-500';
    if (passwordStrength < 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength < 25) return 'Weak';
    if (passwordStrength < 50) return 'Fair';
    if (passwordStrength < 75) return 'Good';
    return 'Strong';
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Change Password */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Change Password</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Current Password
            </label>
            <input
              type="password"
              value={formData.currentPassword}
              onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              New Password
            </label>
            <input
              type="password"
              value={formData.newPassword}
              onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
            {formData.newPassword && (
              <div className="mt-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Password strength:</span>
                  <span className={`font-medium ${
                    passwordStrength >= 75 ? 'text-green-600' : 
                    passwordStrength >= 50 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {getPasswordStrengthText()}
                  </span>
                </div>
                <div className="mt-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-300 ${getPasswordStrengthColor()}`}
                    style={{ width: `${passwordStrength}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Confirm New Password
            </label>
            <input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
            {formData.confirmPassword && formData.newPassword !== formData.confirmPassword && (
              <p className="mt-1 text-sm text-red-600">Passwords do not match</p>
            )}
          </div>
        </div>
      </div>

      {/* Two-Factor Authentication */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Two-Factor Authentication</h3>
        
        {!formData.twoFactorEnabled ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mr-2 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-medium text-yellow-800">Enhance your account security</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  Two-factor authentication adds an extra layer of security to your account.
                </p>
                <button
                  type="button"
                  onClick={enableTwoFactor}
                  className="mt-3 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700"
                >
                  <ShieldCheckIcon className="h-4 w-4 mr-2" />
                  Enable Two-Factor Authentication
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex">
              <CheckCircleIcon className="h-5 w-5 text-green-400 mr-2" />
              <div>
                <h4 className="text-sm font-medium text-green-800">Two-factor authentication is enabled</h4>
                <p className="text-sm text-green-700 mt-1">
                  Your account is protected with two-factor authentication.
                </p>
                <button
                  type="button"
                  className="mt-3 inline-flex items-center px-3 py-2 border border-red-300 text-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
                >
                  Disable Two-Factor Authentication
                </button>
              </div>
            </div>
          </div>
        )}

        {showQRCode && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-700 mb-4">
              Scan this QR code with your authenticator app:
            </p>
            <div className="bg-white p-4 inline-block rounded">
              <div className="w-48 h-48 bg-gray-200 flex items-center justify-center">
                [QR Code Placeholder]
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700">
                Enter verification code
              </label>
              <div className="mt-1 flex gap-2">
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  className="block w-40 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="000000"
                  maxLength={6}
                />
                <button
                  type="button"
                  onClick={verifyTwoFactor}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Verify
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Active Sessions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Active Sessions</h3>
          <button
            type="button"
            onClick={revokeAllSessions}
            className="text-sm text-red-600 hover:text-red-700"
          >
            Revoke all other sessions
          </button>
        </div>
        
        <div className="space-y-3">
          {activeSessions.map((session) => (
            <div key={session.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  {session.device.includes('Phone') ? (
                    <DevicePhoneMobileIcon className="h-8 w-8 text-gray-400" />
                  ) : (
                    <ComputerDesktopIcon className="h-8 w-8 text-gray-400" />
                  )}
                  <div>
                    <div className="flex items-center">
                      <p className="text-sm font-medium text-gray-900">{session.device}</p>
                      {session.current && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{session.browser}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {session.ip} • {session.location} • {session.lastActive}
                    </p>
                  </div>
                </div>
                {!session.current && (
                  <button
                    type="button"
                    onClick={() => revokeSession(session.id)}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    Revoke
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Security Alerts */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Security Alerts</h3>
        <div className="space-y-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.emailLoginAlerts}
              onChange={(e) => setFormData({ ...formData, emailLoginAlerts: e.target.checked })}
              className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <span className="ml-2 text-sm text-gray-700">
              Email me when a new device logs into my account
            </span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.suspiciousActivityAlerts}
              onChange={(e) => setFormData({ ...formData, suspiciousActivityAlerts: e.target.checked })}
              className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <span className="ml-2 text-sm text-gray-700">
              Alert me about suspicious activity on my account
            </span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.monthlySecurityReport}
              onChange={(e) => setFormData({ ...formData, monthlySecurityReport: e.target.checked })}
              className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <span className="ml-2 text-sm text-gray-700">
              Send me monthly security reports
            </span>
          </label>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save Security Settings'}
        </button>
      </div>
    </form>
  );
}