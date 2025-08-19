"use client";

import { useState, useEffect } from "react";
import {
  KeyIcon,
  PlusIcon,
  TrashIcon,
  ClipboardDocumentIcon,
  EyeIcon,
  EyeSlashIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import AppLayout from "@/components/layout/AppLayout";
import { authClient } from "@/core/auth/auth-client";

interface ApiToken {
  id: string;
  name: string;
  tokenPrefix: string;
  scopes: string[];
  expiresAt: string | null;
  lastUsedAt: string | null;
  usageCount: number;
  rateLimit: number;
  isActive: boolean;
  createdAt: string;
  totalRequests: number;
}

const AVAILABLE_SCOPES = [
  {
    value: "assistant:read",
    label: "Assistant Read",
    description: "Read assistant conversations",
  },
  {
    value: "assistant:write",
    label: "Assistant Write",
    description: "Send messages to assistant",
  },
  {
    value: "assistant:delete",
    label: "Assistant Delete",
    description: "Delete assistant sessions",
  },
  {
    value: "projects:read",
    label: "Projects Read",
    description: "View projects",
  },
  {
    value: "projects:write",
    label: "Projects Write",
    description: "Create and modify projects",
  },
  {
    value: "terminal:read",
    label: "Terminal Read",
    description: "View terminal logs",
  },
  {
    value: "terminal:execute",
    label: "Terminal Execute",
    description: "Execute terminal commands",
  },
  {
    value: "analytics:read",
    label: "Analytics Read",
    description: "View usage analytics",
  },
  { value: "*", label: "Full Access", description: "Complete API access" },
];

export default function ApiKeysPage() {
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [showToken, setShowToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    scopes: [] as string[],
    expiresAt: "",
    rateLimit: 1000,
  });

  useEffect(() => {
    loadTokens();
  }, []);

  const loadTokens = async () => {
    try {
      const response = await authClient.fetch("/api/tokens");
      const data = await response.json();

      if (data.success) {
        setTokens(data.tokens);
      }
    } catch (error) {
      console.error("Failed to load tokens:", error);
      setError("Failed to load API tokens");
    } finally {
      setLoading(false);
    }
  };

  const createToken = async () => {
    try {
      setError(null);
      const response = await authClient.fetch("/api/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        setNewToken(data.token);
        setShowToken(data.token);
        setSuccess("API token created successfully!");
        await loadTokens();

        // Reset form
        setFormData({
          name: "",
          scopes: [],
          expiresAt: "",
          rateLimit: 1000,
        });
      } else {
        setError(data.error || "Failed to create token");
      }
    } catch (error) {
      console.error("Failed to create token:", error);
      setError("Failed to create API token");
    }
  };

  const revokeToken = async (tokenId: string) => {
    if (
      !confirm(
        "Are you sure you want to revoke this token? This action cannot be undone.",
      )
    ) {
      return;
    }

    try {
      const response = await authClient.fetch(
        `/api/tokens?tokenId=${tokenId}`,
        {
          method: "DELETE",
        },
      );

      const data = await response.json();

      if (data.success) {
        setSuccess("Token revoked successfully");
        await loadTokens();
      } else {
        setError(data.error || "Failed to revoke token");
      }
    } catch (error) {
      console.error("Failed to revoke token:", error);
      setError("Failed to revoke token");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccess("Copied to clipboard!");
    setTimeout(() => setSuccess(null), 2000);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-gray-500">Loading API tokens...</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">API Keys</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage API tokens for programmatic access to your AI assistant
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <PlusIcon className="mr-2 h-5 w-5" />
            Create Token
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
            <XCircleIcon className="h-5 w-5 mr-2" />
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center">
            <CheckCircleIcon className="h-5 w-5 mr-2" />
            {success}
          </div>
        )}

        {/* New Token Display */}
        {newToken && showToken && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-yellow-800">
                  Save your API token
                </h3>
                <p className="mt-1 text-sm text-yellow-700">
                  Make sure to copy your API token now. You won't be able to see
                  it again!
                </p>
                <div className="mt-3 flex items-center space-x-2">
                  <code className="flex-1 p-2 bg-white border border-yellow-300 rounded text-sm font-mono">
                    {showToken === newToken ? newToken : "•".repeat(60)}
                  </code>
                  <button
                    onClick={() =>
                      setShowToken(
                        showToken === newToken ? "•".repeat(60) : newToken,
                      )
                    }
                    className="p-2 text-yellow-600 hover:text-yellow-700"
                  >
                    {showToken === newToken ? (
                      <EyeSlashIcon className="h-5 w-5" />
                    ) : (
                      <EyeIcon className="h-5 w-5" />
                    )}
                  </button>
                  <button
                    onClick={() => copyToClipboard(newToken)}
                    className="p-2 text-yellow-600 hover:text-yellow-700"
                  >
                    <ClipboardDocumentIcon className="h-5 w-5" />
                  </button>
                </div>
                <button
                  onClick={() => {
                    setNewToken(null);
                    setShowToken(null);
                  }}
                  className="mt-3 text-sm text-yellow-600 hover:text-yellow-700"
                >
                  I've saved my token
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tokens List */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Token
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Scopes
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Used
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tokens.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-sm text-gray-500"
                  >
                    No API tokens yet. Create your first token to get started.
                  </td>
                </tr>
              ) : (
                tokens.map((token) => (
                  <tr key={token.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {token.name}
                        </div>
                        <div className="text-sm text-gray-500 font-mono">
                          {token.tokenPrefix}...
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {token.scopes.map((scope, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                          >
                            {scope}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <ChartBarIcon className="h-4 w-4 mr-1" />
                        {token.totalRequests} requests
                      </div>
                      <div className="text-xs text-gray-500">
                        Rate limit: {token.rateLimit}/hour
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {token.lastUsedAt
                        ? new Date(token.lastUsedAt).toLocaleString()
                        : "Never"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {token.isActive ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                          Revoked
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {token.isActive && (
                        <button
                          onClick={() => revokeToken(token.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Create Token Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-lg w-full">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Create API Token
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Token Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                    placeholder="My API Token"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Scopes
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {AVAILABLE_SCOPES.map((scope) => (
                      <label key={scope.value} className="flex items-start">
                        <input
                          type="checkbox"
                          checked={formData.scopes.includes(scope.value)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                scopes: [...formData.scopes, scope.value],
                              });
                            } else {
                              setFormData({
                                ...formData,
                                scopes: formData.scopes.filter(
                                  (s) => s !== scope.value,
                                ),
                              });
                            }
                          }}
                          className="mt-1 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                        />
                        <div className="ml-2">
                          <div className="text-sm font-medium text-gray-900">
                            {scope.label}
                          </div>
                          <div className="text-xs text-gray-500">
                            {scope.description}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Expiration (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.expiresAt}
                    onChange={(e) =>
                      setFormData({ ...formData, expiresAt: e.target.value })
                    }
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Rate Limit (requests/hour)
                  </label>
                  <input
                    type="number"
                    value={formData.rateLimit}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        rateLimit: parseInt(e.target.value),
                      })
                    }
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                    min="1"
                    max="10000"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setFormData({
                      name: "",
                      scopes: [],
                      expiresAt: "",
                      rateLimit: 1000,
                    });
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    createToken();
                    setShowCreateModal(false);
                  }}
                  disabled={!formData.name || formData.scopes.length === 0}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Token
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
