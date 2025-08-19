"use client";

import { useState, useEffect } from "react";
import { authClient } from "@/core/auth/auth-client";
import {
  PlusIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

interface ApiSettingsProps {
  user: any;
  tabId: string;
  onSave: (data: any) => void;
  saving: boolean;
}

export default function ApiSettings({
  user,
  tabId,
  onSave,
  saving,
}: ApiSettingsProps) {
  const [formData, setFormData] = useState({
    // Rate Limits
    maxRequestsPerHour: 1000,
    maxRequestsPerDay: 10000,
    maxTokensPerRequest: process.env.PORT || 4000,
    maxConcurrentRequests: 10,
    requestTimeout: 30000,

    // Webhook Settings
    webhookEnabled: false,
    webhookUrl: "",
    webhookSecret: "",
    webhookRetryAttempts: 3,
    webhookRetryDelay: 1000,
    webhookTimeout: 5000,
    webhookVerifySSL: true,
    webhookEvents: [] as string[],

    // Integrations
    githubEnabled: false,
    githubToken: "",
    gitlabEnabled: false,
    gitlabToken: "",
    slackEnabled: false,
    slackWebhook: "",
    discordEnabled: false,
    discordWebhook: "",

    // Security
    ipWhitelist: [] as string[],
    ipBlacklist: [] as string[],
    requireHTTPS: true,
    enableCORS: false,
    allowedOrigins: [] as string[],
    enableRateLimiting: true,
  });

  const [newIP, setNewIP] = useState("");
  const [newOrigin, setNewOrigin] = useState("");

  const availableWebhookEvents = [
    "assistant.message",
    "assistant.session.created",
    "assistant.session.deleted",
    "api.token.created",
    "api.token.revoked",
    "api.limit.exceeded",
    "project.created",
    "project.updated",
    "terminal.command.executed",
  ];

  useEffect(() => {
    loadSettings();
  }, [tabId]);

  const loadSettings = async () => {
    try {
      const response = await authClient.fetch("/api/settings/api");
      if (response.ok) {
        const data = await response.json();
        setFormData((prev) => ({ ...prev, ...data.settings }));
      }
    } catch (error) {
      console.error("Failed to load API settings:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const addIPToWhitelist = () => {
    if (newIP && !formData.ipWhitelist.includes(newIP)) {
      setFormData({
        ...formData,
        ipWhitelist: [...formData.ipWhitelist, newIP],
      });
      setNewIP("");
    }
  };

  const removeIPFromWhitelist = (ip: string) => {
    setFormData({
      ...formData,
      ipWhitelist: formData.ipWhitelist.filter((i) => i !== ip),
    });
  };

  const addIPToBlacklist = () => {
    if (newIP && !formData.ipBlacklist.includes(newIP)) {
      setFormData({
        ...formData,
        ipBlacklist: [...formData.ipBlacklist, newIP],
      });
      setNewIP("");
    }
  };

  const removeIPFromBlacklist = (ip: string) => {
    setFormData({
      ...formData,
      ipBlacklist: formData.ipBlacklist.filter((i) => i !== ip),
    });
  };

  const addAllowedOrigin = () => {
    if (newOrigin && !formData.allowedOrigins.includes(newOrigin)) {
      setFormData({
        ...formData,
        allowedOrigins: [...formData.allowedOrigins, newOrigin],
      });
      setNewOrigin("");
    }
  };

  const removeAllowedOrigin = (origin: string) => {
    setFormData({
      ...formData,
      allowedOrigins: formData.allowedOrigins.filter((o) => o !== origin),
    });
  };

  // Render different content based on tab
  if (tabId === "api-limits") {
    return (
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mr-2" />
            <div>
              <h3 className="text-sm font-medium text-yellow-800">
                Rate Limiting
              </h3>
              <p className="text-sm text-yellow-700 mt-1">
                Configure API rate limits to protect your account from abuse and
                ensure fair usage.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Max Requests Per Hour
            </label>
            <input
              type="number"
              value={formData.maxRequestsPerHour}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  maxRequestsPerHour: parseInt(e.target.value),
                })
              }
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              min="1"
              max="100000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Max Requests Per Day
            </label>
            <input
              type="number"
              value={formData.maxRequestsPerDay}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  maxRequestsPerDay: parseInt(e.target.value),
                })
              }
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              min="1"
              max="1000000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Max Tokens Per Request
            </label>
            <input
              type="number"
              value={formData.maxTokensPerRequest}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  maxTokensPerRequest: parseInt(e.target.value),
                })
              }
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              min="100"
              max="100000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Max Concurrent Requests
            </label>
            <input
              type="number"
              value={formData.maxConcurrentRequests}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  maxConcurrentRequests: parseInt(e.target.value),
                })
              }
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              min="1"
              max="100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Request Timeout (ms)
            </label>
            <input
              type="number"
              value={formData.requestTimeout}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  requestTimeout: parseInt(e.target.value),
                })
              }
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              min="1000"
              max="300000"
            />
          </div>

          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.enableRateLimiting}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    enableRateLimiting: e.target.checked,
                  })
                }
                className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <span className="ml-2 text-sm text-gray-700">
                Enable Rate Limiting
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
            {saving ? "Saving..." : "Save Limits"}
          </button>
        </div>
      </form>
    );
  }

  if (tabId === "webhooks") {
    return (
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="flex items-center mb-4">
            <input
              type="checkbox"
              checked={formData.webhookEnabled}
              onChange={(e) =>
                setFormData({ ...formData, webhookEnabled: e.target.checked })
              }
              className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <span className="ml-2 text-sm font-medium text-gray-700">
              Enable Webhooks
            </span>
          </label>

          {formData.webhookEnabled && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Webhook URL
                </label>
                <input
                  type="url"
                  value={formData.webhookUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, webhookUrl: e.target.value })
                  }
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="https://your-domain.com/webhook"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Webhook Secret
                </label>
                <input
                  type="text"
                  value={formData.webhookSecret}
                  onChange={(e) =>
                    setFormData({ ...formData, webhookSecret: e.target.value })
                  }
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Your webhook secret for verification"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Events to Subscribe
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-md p-3">
                  {availableWebhookEvents.map((event) => (
                    <label key={event} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.webhookEvents.includes(event)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              webhookEvents: [...formData.webhookEvents, event],
                            });
                          } else {
                            setFormData({
                              ...formData,
                              webhookEvents: formData.webhookEvents.filter(
                                (e) => e !== event,
                              ),
                            });
                          }
                        }}
                        className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        {event}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Retry Attempts
                  </label>
                  <input
                    type="number"
                    value={formData.webhookRetryAttempts}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        webhookRetryAttempts: parseInt(e.target.value),
                      })
                    }
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    min="0"
                    max="10"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Timeout (ms)
                  </label>
                  <input
                    type="number"
                    value={formData.webhookTimeout}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        webhookTimeout: parseInt(e.target.value),
                      })
                    }
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    min="1000"
                    max="30000"
                  />
                </div>
              </div>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.webhookVerifySSL}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      webhookVerifySSL: e.target.checked,
                    })
                  }
                  className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Verify SSL Certificate
                </span>
              </label>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Save Webhook Settings"}
          </button>
        </div>
      </form>
    );
  }

  // Default: API Tokens view (redirect to API keys page)
  return (
    <div className="text-center py-8">
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        API Token Management
      </h3>
      <p className="text-sm text-gray-500 mb-4">
        Manage your API tokens and access keys from the dedicated API Keys page.
      </p>
      <a
        href="/api-keys"
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
      >
        Go to API Keys
      </a>
    </div>
  );
}
