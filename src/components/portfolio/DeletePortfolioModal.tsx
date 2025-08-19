"use client";

import React, { useState } from "react";
import { X, AlertTriangle } from "lucide-react";

interface Portfolio {
  id: string;
  name: string;
}

interface DeletePortfolioModalProps {
  isOpen: boolean;
  portfolio: Portfolio | null;
  onClose: () => void;
  onDelete: (id: string) => Promise<void>;
}

export function DeletePortfolioModal({ 
  isOpen, 
  portfolio, 
  onClose, 
  onDelete 
}: DeletePortfolioModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");

  const handleDelete = async () => {
    if (!portfolio) return;
    
    if (confirmText !== portfolio.name) {
      setError("Please type the portfolio name to confirm");
      return;
    }

    try {
      setIsDeleting(true);
      setError(null);
      
      await onDelete(portfolio.id);
      
      // Reset and close
      setConfirmText("");
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to delete portfolio");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    if (!isDeleting) {
      setConfirmText("");
      setError(null);
      onClose();
    }
  };

  if (!isOpen || !portfolio) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Delete Portfolio
            </h2>
          </div>
          <button
            onClick={handleClose}
            disabled={isDeleting}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <div className="space-y-3">
            <p className="text-gray-600 dark:text-gray-300">
              Are you sure you want to delete the portfolio
              <span className="font-semibold text-gray-900 dark:text-white"> "{portfolio.name}"</span>?
            </p>
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Warning:</strong> This action cannot be undone. All holdings, transactions, 
                and data associated with this portfolio will be permanently deleted.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Type <span className="font-semibold">"{portfolio.name}"</span> to confirm
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => {
                setConfirmText(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Enter portfolio name"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
              disabled={isDeleting}
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isDeleting}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting || confirmText !== portfolio.name}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDeleting ? "Deleting..." : "Delete Portfolio"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}