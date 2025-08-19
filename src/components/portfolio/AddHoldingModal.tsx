"use client";

import React, { useState } from "react";
import { X, Search } from "lucide-react";

interface AddHoldingModalProps {
  isOpen: boolean;
  portfolioId: string | null;
  onClose: () => void;
  onAdd: (portfolioId: string, data: {
    symbol: string;
    quantity: number;
    averagePrice: number;
    purchaseDate?: string;
  }) => Promise<void>;
}

export function AddHoldingModal({ 
  isOpen, 
  portfolioId,
  onClose, 
  onAdd 
}: AddHoldingModalProps) {
  const [formData, setFormData] = useState({
    symbol: "",
    quantity: "",
    averagePrice: "",
    purchaseDate: new Date().toISOString().split('T')[0],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!portfolioId) return;
    
    if (!formData.symbol.trim()) {
      setError("Stock symbol is required");
      return;
    }
    
    if (!formData.quantity || parseFloat(formData.quantity) <= 0) {
      setError("Quantity must be greater than 0");
      return;
    }
    
    if (!formData.averagePrice || parseFloat(formData.averagePrice) <= 0) {
      setError("Average price must be greater than 0");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      
      await onAdd(portfolioId, {
        symbol: formData.symbol.trim().toUpperCase(),
        quantity: parseFloat(formData.quantity),
        averagePrice: parseFloat(formData.averagePrice),
        purchaseDate: formData.purchaseDate,
      });
      
      // Reset form and close
      setFormData({
        symbol: "",
        quantity: "",
        averagePrice: "",
        purchaseDate: new Date().toISOString().split('T')[0],
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to add holding");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError(null);
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setFormData({
        symbol: "",
        quantity: "",
        averagePrice: "",
        purchaseDate: new Date().toISOString().split('T')[0],
      });
      setError(null);
      onClose();
    }
  };

  if (!isOpen || !portfolioId) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Add New Holding
          </h2>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Stock Symbol *
            </label>
            <div className="relative">
              <input
                type="text"
                name="symbol"
                value={formData.symbol}
                onChange={handleInputChange}
                placeholder="e.g., AAPL, MSFT"
                className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                disabled={isSubmitting}
                required
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Quantity *
              </label>
              <input
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleInputChange}
                placeholder="100"
                step="0.01"
                min="0.01"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isSubmitting}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Average Price ($) *
              </label>
              <input
                type="number"
                name="averagePrice"
                value={formData.averagePrice}
                onChange={handleInputChange}
                placeholder="150.00"
                step="0.01"
                min="0.01"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isSubmitting}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Purchase Date
            </label>
            <input
              type="date"
              name="purchaseDate"
              value={formData.purchaseDate}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSubmitting}
            />
          </div>

          {/* Total Value Display */}
          {formData.quantity && formData.averagePrice && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Total Value: <span className="font-semibold">
                  ${(parseFloat(formData.quantity) * parseFloat(formData.averagePrice)).toFixed(2)}
                </span>
              </p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formData.symbol.trim() || !formData.quantity || !formData.averagePrice}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Adding..." : "Add Holding"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}