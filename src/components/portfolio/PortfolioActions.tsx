"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Edit2, Trash2, Eye } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import toast from "react-hot-toast";

interface PortfolioActionsProps {
  portfolio?: any;
  onRefresh?: () => void;
}

export function PortfolioActions({ portfolio, onRefresh }: PortfolioActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    initialCapital: 10000,
  });

  const handleCreate = async () => {
    try {
      setLoading(true);
      await apiClient.createPortfolio(formData);
      toast.success("Portfolio created successfully!");
      setShowCreateModal(false);
      onRefresh?.();
    } catch (error) {
      toast.error("Failed to create portfolio");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this portfolio?")) return;
    
    try {
      setLoading(true);
      await apiClient.deletePortfolio(id);
      toast.success("Portfolio deleted successfully!");
      onRefresh?.();
    } catch (error) {
      toast.error("Failed to delete portfolio");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleView = (id: string) => {
    router.push(`/portfolio/${id}`);
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          disabled={loading}
        >
          <Plus className="h-5 w-5" />
          New Portfolio
        </button>

        {portfolio && (
          <>
            <button
              onClick={() => handleView(portfolio.id)}
              className="p-2 text-gray-400 hover:text-white transition-colors"
              title="View Details"
            >
              <Eye className="h-5 w-5" />
            </button>
            <button
              onClick={() => handleDelete(portfolio.id)}
              className="p-2 text-gray-400 hover:text-red-500 transition-colors"
              title="Delete Portfolio"
              disabled={loading}
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      {/* Create Portfolio Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-900 p-6 rounded-xl w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Create New Portfolio</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Portfolio Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none"
                  placeholder="e.g., Growth Portfolio"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none"
                  rows={3}
                  placeholder="Portfolio strategy and goals..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Initial Capital ($)
                </label>
                <input
                  type="number"
                  value={formData.initialCapital}
                  onChange={(e) => setFormData({ ...formData, initialCapital: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none"
                  min="0"
                  step="1000"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                disabled={loading || !formData.name}
              >
                {loading ? "Creating..." : "Create Portfolio"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}