"use client";

import React, { useState } from "react";
import {
  Bell,
  BellOff,
  Plus,
  Trash2,
  Edit2,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  DollarSign,
  Percent,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface Alert {
  id: string;
  portfolioId: string;
  symbol: string;
  type: "PRICE_ABOVE" | "PRICE_BELOW" | "PERCENT_CHANGE" | "VOLUME" | "NEWS";
  condition: "ABOVE" | "BELOW" | "EQUALS" | "CHANGE";
  value: number;
  currentValue?: number;
  message?: string;
  isActive: boolean;
  triggered: boolean;
  triggeredAt?: string;
  createdAt: string;
}

interface AlertsManagerProps {
  portfolioId: string;
  alerts?: Alert[];
  onCreateAlert?: (alert: Partial<Alert>) => void;
  onUpdateAlert?: (id: string, alert: Partial<Alert>) => void;
  onDeleteAlert?: (id: string) => void;
  loading?: boolean;
}

export default function AlertsManager({
  portfolioId,
  alerts = [],
  onCreateAlert,
  onUpdateAlert,
  onDeleteAlert,
  loading = false,
}: AlertsManagerProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingAlert, setEditingAlert] = useState<Alert | null>(null);
  const [filterType, setFilterType] = useState<string>("ALL");
  
  // Form state
  const [symbol, setSymbol] = useState("");
  const [alertType, setAlertType] = useState<Alert["type"]>("PRICE_ABOVE");
  const [value, setValue] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const alertData: Partial<Alert> = {
      portfolioId,
      symbol: symbol.toUpperCase(),
      type: alertType,
      condition: alertType.includes("ABOVE") ? "ABOVE" : "BELOW",
      value: parseFloat(value),
      message,
      isActive: true,
      triggered: false,
      createdAt: new Date().toISOString(),
    };

    if (editingAlert) {
      onUpdateAlert?.(editingAlert.id, alertData);
      setEditingAlert(null);
    } else {
      onCreateAlert?.(alertData);
    }

    // Reset form
    setShowCreateForm(false);
    setSymbol("");
    setValue("");
    setMessage("");
  };

  const handleEdit = (alert: Alert) => {
    setEditingAlert(alert);
    setSymbol(alert.symbol);
    setAlertType(alert.type);
    setValue(alert.value.toString());
    setMessage(alert.message || "");
    setShowCreateForm(true);
  };

  const handleToggleActive = (alert: Alert) => {
    onUpdateAlert?.(alert.id, { isActive: !alert.isActive });
  };

  const filteredAlerts = alerts.filter(alert => {
    if (filterType === "ALL") return true;
    if (filterType === "ACTIVE") return alert.isActive && !alert.triggered;
    if (filterType === "TRIGGERED") return alert.triggered;
    return alert.type === filterType;
  });

  const getAlertIcon = (type: Alert["type"], triggered: boolean) => {
    if (triggered) return <CheckCircle className="w-4 h-4 text-green-500" />;
    
    switch (type) {
      case "PRICE_ABOVE":
        return <TrendingUp className="w-4 h-4 text-blue-500" />;
      case "PRICE_BELOW":
        return <TrendingDown className="w-4 h-4 text-orange-500" />;
      case "PERCENT_CHANGE":
        return <Percent className="w-4 h-4 text-purple-500" />;
      case "VOLUME":
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default:
        return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  const getAlertDescription = (alert: Alert) => {
    switch (alert.type) {
      case "PRICE_ABOVE":
        return `Alert when ${alert.symbol} goes above $${alert.value}`;
      case "PRICE_BELOW":
        return `Alert when ${alert.symbol} goes below $${alert.value}`;
      case "PERCENT_CHANGE":
        return `Alert when ${alert.symbol} changes by ${alert.value}%`;
      case "VOLUME":
        return `Alert when ${alert.symbol} volume exceeds ${alert.value.toLocaleString()}`;
      default:
        return alert.message || "Custom alert";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Price Alerts
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Get notified when prices reach your targets
            </p>
          </div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Alert
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {alerts.filter(a => a.isActive).length}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Active</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {alerts.filter(a => a.triggered).length}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Triggered</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {alerts.length}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
          </div>
        </div>
      </div>

      {/* Create/Edit Form */}
      {showCreateForm && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4">
            {editingAlert ? "Edit Alert" : "Create New Alert"}
          </h4>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Symbol
                </label>
                <input
                  type="text"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  placeholder="e.g., AAPL"
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Alert Type
                </label>
                <select
                  value={alertType}
                  onChange={(e) => setAlertType(e.target.value as Alert["type"])}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="PRICE_ABOVE">Price Above</option>
                  <option value="PRICE_BELOW">Price Below</option>
                  <option value="PERCENT_CHANGE">Percent Change</option>
                  <option value="VOLUME">Volume Alert</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {alertType === "PERCENT_CHANGE" ? "Percent (%)" : 
                 alertType === "VOLUME" ? "Volume" : "Price ($)"}
              </label>
              <input
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Enter value"
                required
                min="0"
                step={alertType === "PERCENT_CHANGE" ? "0.1" : "0.01"}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Note (Optional)
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Add a note for this alert..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {editingAlert ? "Update Alert" : "Create Alert"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setEditingAlert(null);
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Alerts List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-gray-900 dark:text-white">
              Your Alerts
            </h4>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="ALL">All Alerts</option>
              <option value="ACTIVE">Active</option>
              <option value="TRIGGERED">Triggered</option>
              <option value="PRICE_ABOVE">Price Above</option>
              <option value="PRICE_BELOW">Price Below</option>
            </select>
          </div>
        </div>

        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {loading ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              Loading alerts...
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              No alerts found
            </div>
          ) : (
            filteredAlerts.map((alert) => (
              <div key={alert.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      {getAlertIcon(alert.type, alert.triggered)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {alert.symbol}
                        </span>
                        {alert.triggered && (
                          <span className="px-2 py-0.5 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
                            Triggered
                          </span>
                        )}
                        {!alert.isActive && !alert.triggered && (
                          <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
                            Inactive
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {getAlertDescription(alert)}
                      </p>
                      {alert.currentValue && (
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          Current: ${alert.currentValue.toFixed(2)}
                        </p>
                      )}
                      {alert.message && (
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 italic">
                          "{alert.message}"
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleActive(alert)}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
                      title={alert.isActive ? "Deactivate" : "Activate"}
                    >
                      {alert.isActive ? (
                        <Bell className="w-4 h-4 text-blue-500" />
                      ) : (
                        <BellOff className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                    <button
                      onClick={() => handleEdit(alert)}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
                    >
                      <Edit2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    </button>
                    <button
                      onClick={() => onDeleteAlert?.(alert.id)}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}