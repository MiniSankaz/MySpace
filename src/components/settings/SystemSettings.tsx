"use client";

import { useState, useEffect } from "react";
import { authClient } from "@/core/auth/auth-client";
import {
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

interface SystemSettingsProps {
  user: any;
  tabId: string;
  onSave: (data: any) => void;
  saving: boolean;
}

export default function SystemSettings({
  user,
  tabId,
  onSave,
  saving,
}: SystemSettingsProps) {
  const [formData, setFormData] = useState({
    // System Configuration
    maintenanceMode: false,
    maintenanceMessage: "",
    debugMode: false,
    logLevel: "info",
    maxUploadSize: "10",
    dataRetentionDays: 90,

    // Database Settings
    connectionPoolSize: 10,
    queryTimeout: 30000,
    enableQueryLogging: false,
    backupSchedule: "daily",
    backupRetentionDays: 30,

    // Performance Settings
    cacheEnabled: true,
    cacheTTL: 3600,
    compressionEnabled: true,
    minifyAssets: true,
    cdnEnabled: false,
    cdnUrl: "",

    // Security Settings
    enableCSRF: true,
    enableXSS: true,
    enableHTTPS: true,
    sessionTimeout: 86400,
    maxLoginAttempts: 5,
    lockoutDuration: 1800,

    // Email Configuration
    emailProvider: "smtp",
    smtpHost: "",
    smtpPort: 587,
    smtpUser: "",
    smtpPass: "",
    emailFrom: "noreply@example.com",

    // Storage Configuration
    storageProvider: "local",
    localStoragePath: "./uploads",
    s3Bucket: "",
    s3Region: "",
    s3AccessKey: "",
    s3SecretKey: "",
  });

  const [testEmailAddress, setTestEmailAddress] = useState("");
  const [testEmailSent, setTestEmailSent] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [tabId]);

  const loadSettings = async () => {
    try {
      const response = await authClient.fetch("/api/settings/system");
      if (response.ok) {
        const data = await response.json();
        setFormData((prev) => ({ ...prev, ...data.settings }));
      }
    } catch (error) {
      console.error("Failed to load system settings:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const testEmailConnection = async () => {
    if (!testEmailAddress) {
      alert("Please enter a test email address");
      return;
    }

    try {
      const response = await authClient.fetch("/api/settings/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: testEmailAddress,
          config: {
            provider: formData.emailProvider,
            host: formData.smtpHost,
            port: formData.smtpPort,
            user: formData.smtpUser,
            pass: formData.smtpPass,
            from: formData.emailFrom,
          },
        }),
      });

      if (response.ok) {
        setTestEmailSent(true);
        setTimeout(() => setTestEmailSent(false), process.env.PORT || 3000);
      }
    } catch (error) {
      console.error("Failed to send test email:", error);
    }
  };

  const clearCache = async () => {
    try {
      const response = await authClient.fetch("/api/settings/clear-cache", {
        method: "POST",
      });

      if (response.ok) {
        alert("Cache cleared successfully");
      }
    } catch (error) {
      console.error("Failed to clear cache:", error);
    }
  };

  // Render different content based on tab
  if (tabId === "database") {
    return (
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mr-2" />
            <div>
              <h3 className="text-sm font-medium text-yellow-800">
                Database Configuration
              </h3>
              <p className="text-sm text-yellow-700 mt-1">
                Changes to database settings may require a server restart.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Connection Pool Size
            </label>
            <input
              type="number"
              value={formData.connectionPoolSize}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  connectionPoolSize: parseInt(e.target.value),
                })
              }
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              min="1"
              max="100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Query Timeout (ms)
            </label>
            <input
              type="number"
              value={formData.queryTimeout}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  queryTimeout: parseInt(e.target.value),
                })
              }
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              min="1000"
              max="300000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Backup Schedule
            </label>
            <select
              value={formData.backupSchedule}
              onChange={(e) =>
                setFormData({ ...formData, backupSchedule: e.target.value })
              }
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="hourly">Hourly</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Backup Retention (days)
            </label>
            <input
              type="number"
              value={formData.backupRetentionDays}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  backupRetentionDays: parseInt(e.target.value),
                })
              }
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              min="1"
              max="365"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.enableQueryLogging}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    enableQueryLogging: e.target.checked,
                  })
                }
                className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <span className="ml-2 text-sm text-gray-700">
                Enable Query Logging (affects performance)
              </span>
            </label>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Save Database Settings"}
          </button>
        </div>
      </form>
    );
  }

  if (tabId === "logs") {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            System Logs
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            View and manage system logs. Logs are automatically rotated based on
            retention settings.
          </p>
        </div>

        <div className="bg-gray-900 rounded-lg p-4 h-96 overflow-auto">
          <pre className="text-green-400 text-xs font-mono">
            {`[2025-08-09 10:23:45] INFO: System started successfully
[2025-08-09 10:23:46] INFO: Database connection established
[2025-08-09 10:23:47] INFO: API server listening on port process.env.PORT || 3000
[2025-08-09 10:24:15] INFO: User authentication successful (user@example.com)
[2025-08-09 10:25:30] INFO: API request: GET /api/assistant/chat
[2025-08-09 10:25:31] INFO: Claude API response received (200ms)
[2025-08-09 10:26:45] WARNING: Rate limit approaching for user@example.com
[2025-08-09 10:28:00] INFO: Scheduled backup started
[2025-08-09 10:28:15] INFO: Backup completed successfully
[2025-08-09 10:30:00] INFO: Cache cleared automatically
[2025-08-09 10:35:12] INFO: WebSocket connection established
[2025-08-09 10:40:00] INFO: Health check passed`}
          </pre>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Log Level
            </label>
            <select
              value={formData.logLevel}
              onChange={(e) =>
                setFormData({ ...formData, logLevel: e.target.value })
              }
              className="block w-32 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="debug">Debug</option>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
            </select>
          </div>

          <div className="space-x-2">
            <button
              type="button"
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <ArrowPathIcon className="h-4 w-4 mr-2" />
              Refresh
            </button>
            <button
              type="button"
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Download Logs
            </button>
            <button
              type="button"
              className="inline-flex items-center px-3 py-2 border border-red-300 shadow-sm text-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
            >
              Clear Logs
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Default: System Configuration
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Maintenance Mode */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Maintenance Mode
        </h3>
        <label className="flex items-center mb-4">
          <input
            type="checkbox"
            checked={formData.maintenanceMode}
            onChange={(e) =>
              setFormData({ ...formData, maintenanceMode: e.target.checked })
            }
            className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
          />
          <span className="ml-2 text-sm font-medium text-gray-700">
            Enable Maintenance Mode
          </span>
        </label>

        {formData.maintenanceMode && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Maintenance Message
            </label>
            <textarea
              rows={3}
              value={formData.maintenanceMessage}
              onChange={(e) =>
                setFormData({ ...formData, maintenanceMessage: e.target.value })
              }
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="We're currently performing scheduled maintenance..."
            />
          </div>
        )}
      </div>

      {/* Performance Settings */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Performance</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.cacheEnabled}
              onChange={(e) =>
                setFormData({ ...formData, cacheEnabled: e.target.checked })
              }
              className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <span className="ml-2 text-sm text-gray-700">Enable Caching</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.compressionEnabled}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  compressionEnabled: e.target.checked,
                })
              }
              className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <span className="ml-2 text-sm text-gray-700">
              Enable Compression
            </span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.minifyAssets}
              onChange={(e) =>
                setFormData({ ...formData, minifyAssets: e.target.checked })
              }
              className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <span className="ml-2 text-sm text-gray-700">Minify Assets</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.debugMode}
              onChange={(e) =>
                setFormData({ ...formData, debugMode: e.target.checked })
              }
              className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <span className="ml-2 text-sm text-gray-700">Debug Mode</span>
          </label>
        </div>

        {formData.cacheEnabled && (
          <div className="mt-4 flex items-end gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cache TTL (seconds)
              </label>
              <input
                type="number"
                value={formData.cacheTTL}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    cacheTTL: parseInt(e.target.value),
                  })
                }
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                min="60"
                max="86400"
              />
            </div>
            <button
              type="button"
              onClick={clearCache}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Clear Cache
            </button>
          </div>
        )}
      </div>

      {/* Storage Settings */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Storage</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Upload Size (MB)
            </label>
            <input
              type="number"
              value={formData.maxUploadSize}
              onChange={(e) =>
                setFormData({ ...formData, maxUploadSize: e.target.value })
              }
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              min="1"
              max="100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data Retention (days)
            </label>
            <input
              type="number"
              value={formData.dataRetentionDays}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  dataRetentionDays: parseInt(e.target.value),
                })
              }
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              min="1"
              max="365"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Storage Provider
            </label>
            <select
              value={formData.storageProvider}
              onChange={(e) =>
                setFormData({ ...formData, storageProvider: e.target.value })
              }
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="local">Local Storage</option>
              <option value="s3">Amazon S3</option>
              <option value="gcs">Google Cloud Storage</option>
              <option value="azure">Azure Blob Storage</option>
            </select>
          </div>

          {formData.storageProvider === "local" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Local Storage Path
              </label>
              <input
                type="text"
                value={formData.localStoragePath}
                onChange={(e) =>
                  setFormData({ ...formData, localStoragePath: e.target.value })
                }
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
          )}

          {formData.storageProvider === "s3" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    S3 Bucket
                  </label>
                  <input
                    type="text"
                    value={formData.s3Bucket}
                    onChange={(e) =>
                      setFormData({ ...formData, s3Bucket: e.target.value })
                    }
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    S3 Region
                  </label>
                  <input
                    type="text"
                    value={formData.s3Region}
                    onChange={(e) =>
                      setFormData({ ...formData, s3Region: e.target.value })
                    }
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Access Key
                  </label>
                  <input
                    type="password"
                    value={formData.s3AccessKey}
                    onChange={(e) =>
                      setFormData({ ...formData, s3AccessKey: e.target.value })
                    }
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Secret Key
                  </label>
                  <input
                    type="password"
                    value={formData.s3SecretKey}
                    onChange={(e) =>
                      setFormData({ ...formData, s3SecretKey: e.target.value })
                    }
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? "Saving..." : "Save System Settings"}
        </button>
      </div>
    </form>
  );
}
