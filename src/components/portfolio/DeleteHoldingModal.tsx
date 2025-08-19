"use client";

import React, { useState } from "react";
import { X, AlertTriangle } from "lucide-react";

interface Holding {
  id: string;
  symbol: string;
  quantity: number;
  averagePrice: number;
}

interface DeleteHoldingModalProps {
  isOpen: boolean;
  portfolioId: string | null;
  holding: Holding | null;
  onClose: () => void;
  onDelete: (portfolioId: string, holdingId: string) => Promise<void>;
}

export function DeleteHoldingModal({ 
  isOpen, 
  portfolioId,
  holding,
  onClose, 
  onDelete 
}: DeleteHoldingModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!portfolioId || !holding) return;

    try {
      setIsDeleting(true);
      setError(null);
      
      await onDelete(portfolioId, holding.id);
      
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to delete holding");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    if (!isDeleting) {
      setError(null);
      onClose();
    }
  };

  if (!isOpen || !portfolioId || !holding) return null;

  const totalValue = holding.quantity * holding.averagePrice;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Delete Holding
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
              Are you sure you want to delete this holding?
            </p>
            
            {/* Holding Details */}
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Symbol:</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {holding.symbol}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Quantity:</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {holding.quantity}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Avg Price:</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  ${holding.averagePrice.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-600">
                <span className="text-sm text-gray-500 dark:text-gray-400">Total Value:</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  ${totalValue.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Warning:</strong> This action cannot be undone. All transaction history 
                for this holding will be permanently deleted.
              </p>
            </div>
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
              disabled={isDeleting}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDeleting ? "Deleting..." : "Delete Holding"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}