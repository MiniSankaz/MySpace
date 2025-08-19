"use client";

import { useState, useEffect } from "react";
import { authClient } from "@/core/auth/auth-client";
import {
  BellIcon,
  EnvelopeIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  ChatBubbleLeftIcon,
  CalendarIcon,
  DocumentTextIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";

interface NotificationSettingsProps {
  user: any;
  tabId: string;
  onSave: (data: any) => void;
  saving: boolean;
}

interface NotificationChannel {
  email: boolean;
  push: boolean;
  sms: boolean;
  inApp: boolean;
}

interface NotificationType {
  id: string;
  name: string;
  description: string;
  icon: any;
  channels: NotificationChannel;
}

export default function NotificationSettings({
  user,
  tabId,
  onSave,
  saving,
}: NotificationSettingsProps) {
  const [notificationTypes, setNotificationTypes] = useState<
    NotificationType[]
  >([
    {
      id: "messages",
      name: "Messages",
      description: "Direct messages from other users",
      icon: ChatBubbleLeftIcon,
      channels: { email: true, push: true, sms: false, inApp: true },
    },
    {
      id: "mentions",
      name: "Mentions",
      description: "When someone mentions you in a comment or post",
      icon: UserGroupIcon,
      channels: { email: true, push: true, sms: false, inApp: true },
    },
    {
      id: "comments",
      name: "Comments",
      description: "Comments on your posts or projects",
      icon: ChatBubbleLeftIcon,
      channels: { email: false, push: true, sms: false, inApp: true },
    },
    {
      id: "updates",
      name: "Project Updates",
      description: "Updates on projects you follow or contribute to",
      icon: DocumentTextIcon,
      channels: { email: true, push: false, sms: false, inApp: true },
    },
    {
      id: "reminders",
      name: "Reminders",
      description: "Task reminders and deadline notifications",
      icon: CalendarIcon,
      channels: { email: true, push: true, sms: false, inApp: true },
    },
    {
      id: "billing",
      name: "Billing",
      description: "Payment confirmations and billing updates",
      icon: CurrencyDollarIcon,
      channels: { email: true, push: false, sms: true, inApp: true },
    },
    {
      id: "security",
      name: "Security",
      description: "Security alerts and login notifications",
      icon: ShieldCheckIcon,
      channels: { email: true, push: true, sms: true, inApp: true },
    },
    {
      id: "marketing",
      name: "Marketing",
      description: "Product updates, tips, and promotional offers",
      icon: EnvelopeIcon,
      channels: { email: true, push: false, sms: false, inApp: false },
    },
  ]);

  const [globalSettings, setGlobalSettings] = useState({
    emailEnabled: true,
    pushEnabled: true,
    smsEnabled: false,
    inAppEnabled: true,
    doNotDisturb: false,
    doNotDisturbStart: "22:00",
    doNotDisturbEnd: "08:00",
    weekendNotifications: true,
    emailDigest: "daily",
    soundEnabled: true,
    vibrationEnabled: true,
    notificationSound: "default",
    emailFrequency: "instant",
    batchNotifications: false,
    batchInterval: 30,
  });

  const [emailPreferences, setEmailPreferences] = useState({
    format: "html",
    unsubscribeLink: true,
    includeImages: true,
    replyToNotifications: false,
  });

  const [testNotificationSent, setTestNotificationSent] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await authClient.fetch("/api/settings/notifications");
      if (response.ok) {
        const data = await response.json();
        if (data.notificationTypes) {
          setNotificationTypes(data.notificationTypes);
        }
        if (data.globalSettings) {
          setGlobalSettings((prev) => ({ ...prev, ...data.globalSettings }));
        }
        if (data.emailPreferences) {
          setEmailPreferences((prev) => ({
            ...prev,
            ...data.emailPreferences,
          }));
        }
      }
    } catch (error) {
      console.error("Failed to load notification settings:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      notificationTypes,
      globalSettings,
      emailPreferences,
    });
  };

  const toggleChannel = (
    typeId: string,
    channel: keyof NotificationChannel,
  ) => {
    setNotificationTypes((prev) =>
      prev.map((type) =>
        type.id === typeId
          ? {
              ...type,
              channels: {
                ...type.channels,
                [channel]: !type.channels[channel],
              },
            }
          : type,
      ),
    );
  };

  const toggleAllForType = (typeId: string, enabled: boolean) => {
    setNotificationTypes((prev) =>
      prev.map((type) =>
        type.id === typeId
          ? {
              ...type,
              channels: {
                email: enabled && globalSettings.emailEnabled,
                push: enabled && globalSettings.pushEnabled,
                sms: enabled && globalSettings.smsEnabled,
                inApp: enabled && globalSettings.inAppEnabled,
              },
            }
          : type,
      ),
    );
  };

  const toggleAllChannels = (
    channel: keyof NotificationChannel,
    enabled: boolean,
  ) => {
    setNotificationTypes((prev) =>
      prev.map((type) => ({
        ...type,
        channels: { ...type.channels, [channel]: enabled },
      })),
    );
  };

  const sendTestNotification = async () => {
    try {
      const response = await authClient.fetch(
        "/api/settings/notifications/test",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            channels: ["email", "push", "inApp"],
          }),
        },
      );

      if (response.ok) {
        setTestNotificationSent(true);
        setTimeout(
          () => setTestNotificationSent(false),
          process.env.PORT || 3000,
        );
      }
    } catch (error) {
      console.error("Failed to send test notification:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Global Settings */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Notification Channels
        </h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={globalSettings.emailEnabled}
              onChange={(e) => {
                setGlobalSettings({
                  ...globalSettings,
                  emailEnabled: e.target.checked,
                });
                if (!e.target.checked) toggleAllChannels("email", false);
              }}
              className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <span className="ml-2 text-sm text-gray-700">Email</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={globalSettings.pushEnabled}
              onChange={(e) => {
                setGlobalSettings({
                  ...globalSettings,
                  pushEnabled: e.target.checked,
                });
                if (!e.target.checked) toggleAllChannels("push", false);
              }}
              className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <span className="ml-2 text-sm text-gray-700">Push</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={globalSettings.smsEnabled}
              onChange={(e) => {
                setGlobalSettings({
                  ...globalSettings,
                  smsEnabled: e.target.checked,
                });
                if (!e.target.checked) toggleAllChannels("sms", false);
              }}
              className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <span className="ml-2 text-sm text-gray-700">SMS</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={globalSettings.inAppEnabled}
              onChange={(e) => {
                setGlobalSettings({
                  ...globalSettings,
                  inAppEnabled: e.target.checked,
                });
                if (!e.target.checked) toggleAllChannels("inApp", false);
              }}
              className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <span className="ml-2 text-sm text-gray-700">In-App</span>
          </label>
        </div>
      </div>

      {/* Notification Types */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Notification Types
        </h3>
        <div className="space-y-4">
          {notificationTypes.map((type) => (
            <div
              key={type.id}
              className="bg-white border border-gray-200 rounded-lg p-4"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-start">
                  <type.icon className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">
                      {type.name}
                    </h4>
                    <p className="text-sm text-gray-500">{type.description}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const allEnabled = Object.values(type.channels).every(
                      (v) => v,
                    );
                    toggleAllForType(type.id, !allEnabled);
                  }}
                  className="text-xs text-indigo-600 hover:text-indigo-700"
                >
                  {Object.values(type.channels).every((v) => v)
                    ? "Disable all"
                    : "Enable all"}
                </button>
              </div>

              <div className="grid grid-cols-4 gap-3 mt-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={type.channels.email}
                    onChange={() => toggleChannel(type.id, "email")}
                    disabled={!globalSettings.emailEnabled}
                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 disabled:opacity-50"
                  />
                  <span className="ml-2 text-xs text-gray-600">Email</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={type.channels.push}
                    onChange={() => toggleChannel(type.id, "push")}
                    disabled={!globalSettings.pushEnabled}
                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 disabled:opacity-50"
                  />
                  <span className="ml-2 text-xs text-gray-600">Push</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={type.channels.sms}
                    onChange={() => toggleChannel(type.id, "sms")}
                    disabled={!globalSettings.smsEnabled}
                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 disabled:opacity-50"
                  />
                  <span className="ml-2 text-xs text-gray-600">SMS</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={type.channels.inApp}
                    onChange={() => toggleChannel(type.id, "inApp")}
                    disabled={!globalSettings.inAppEnabled}
                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 disabled:opacity-50"
                  />
                  <span className="ml-2 text-xs text-gray-600">In-App</span>
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Do Not Disturb */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Do Not Disturb
        </h3>
        <div className="space-y-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={globalSettings.doNotDisturb}
              onChange={(e) =>
                setGlobalSettings({
                  ...globalSettings,
                  doNotDisturb: e.target.checked,
                })
              }
              className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <span className="ml-2 text-sm text-gray-700">
              Enable Do Not Disturb mode
            </span>
          </label>

          {globalSettings.doNotDisturb && (
            <div className="ml-6 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Start time
                </label>
                <input
                  type="time"
                  value={globalSettings.doNotDisturbStart}
                  onChange={(e) =>
                    setGlobalSettings({
                      ...globalSettings,
                      doNotDisturbStart: e.target.value,
                    })
                  }
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  End time
                </label>
                <input
                  type="time"
                  value={globalSettings.doNotDisturbEnd}
                  onChange={(e) =>
                    setGlobalSettings({
                      ...globalSettings,
                      doNotDisturbEnd: e.target.value,
                    })
                  }
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
            </div>
          )}

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={globalSettings.weekendNotifications}
              onChange={(e) =>
                setGlobalSettings({
                  ...globalSettings,
                  weekendNotifications: e.target.checked,
                })
              }
              className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <span className="ml-2 text-sm text-gray-700">
              Receive notifications on weekends
            </span>
          </label>
        </div>
      </div>

      {/* Email Preferences */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Email Preferences
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Email digest
            </label>
            <select
              value={globalSettings.emailDigest}
              onChange={(e) =>
                setGlobalSettings({
                  ...globalSettings,
                  emailDigest: e.target.value,
                })
              }
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="instant">Instant</option>
              <option value="hourly">Hourly digest</option>
              <option value="daily">Daily digest</option>
              <option value="weekly">Weekly digest</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Email format
            </label>
            <select
              value={emailPreferences.format}
              onChange={(e) =>
                setEmailPreferences({
                  ...emailPreferences,
                  format: e.target.value,
                })
              }
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="html">HTML (with formatting)</option>
              <option value="text">Plain text</option>
            </select>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={emailPreferences.includeImages}
              onChange={(e) =>
                setEmailPreferences({
                  ...emailPreferences,
                  includeImages: e.target.checked,
                })
              }
              className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <span className="ml-2 text-sm text-gray-700">
              Include images in emails
            </span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={emailPreferences.replyToNotifications}
              onChange={(e) =>
                setEmailPreferences({
                  ...emailPreferences,
                  replyToNotifications: e.target.checked,
                })
              }
              className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <span className="ml-2 text-sm text-gray-700">
              Allow replying to notification emails
            </span>
          </label>
        </div>
      </div>

      {/* Push Notification Settings */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Push Notification Settings
        </h3>
        <div className="space-y-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={globalSettings.soundEnabled}
              onChange={(e) =>
                setGlobalSettings({
                  ...globalSettings,
                  soundEnabled: e.target.checked,
                })
              }
              className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <span className="ml-2 text-sm text-gray-700">Play sound</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={globalSettings.vibrationEnabled}
              onChange={(e) =>
                setGlobalSettings({
                  ...globalSettings,
                  vibrationEnabled: e.target.checked,
                })
              }
              className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <span className="ml-2 text-sm text-gray-700">Vibrate device</span>
          </label>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Notification sound
            </label>
            <select
              value={globalSettings.notificationSound}
              onChange={(e) =>
                setGlobalSettings({
                  ...globalSettings,
                  notificationSound: e.target.value,
                })
              }
              disabled={!globalSettings.soundEnabled}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:opacity-50"
            >
              <option value="default">Default</option>
              <option value="chime">Chime</option>
              <option value="bell">Bell</option>
              <option value="ping">Ping</option>
              <option value="none">None</option>
            </select>
          </div>
        </div>
      </div>

      {/* Test Notification */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-2">
          Test Notifications
        </h3>
        <p className="text-sm text-gray-500 mb-3">
          Send a test notification to verify your settings are working
          correctly.
        </p>
        <button
          type="button"
          onClick={sendTestNotification}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          <BellIcon className="h-4 w-4 mr-2" />
          Send Test Notification
        </button>
        {testNotificationSent && (
          <p className="mt-2 text-sm text-green-600">Test notification sent!</p>
        )}
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? "Saving..." : "Save Notification Settings"}
        </button>
      </div>
    </form>
  );
}
