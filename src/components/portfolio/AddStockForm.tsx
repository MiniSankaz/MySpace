'use client';

import React, { useState } from 'react';
import { StockSelector, MarketSelector } from './StockSelector';
import { Market } from '@/types/portfolio';

interface StockSuggestion {
  symbol: string;
  name: string;
  market: Market;
  exchange: string;
  country: string;
  currency: string;
}

interface AddStockFormProps {
  onSubmit: (data: {
    stock: StockSuggestion;
    quantity: number;
    price: number;
    type: 'BUY' | 'SELL';
    notes?: string;
  }) => void;
  onCancel?: () => void;
}

export function AddStockForm({ onSubmit, onCancel }: AddStockFormProps) {
  const [selectedStock, setSelectedStock] = useState<StockSuggestion | null>(null);
  const [selectedMarket, setSelectedMarket] = useState<Market | undefined>();
  const [quantity, setQuantity] = useState<string>('');
  const [price, setPrice] = useState<string>('');
  const [type, setType] = useState<'BUY' | 'SELL'>('BUY');
  const [notes, setNotes] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Validation function
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!selectedStock) {
      newErrors.stock = 'Please select a stock';
    }

    if (!quantity || Number(quantity) <= 0) {
      newErrors.quantity = 'Please enter a valid quantity';
    } else if (Number(quantity) % 1 !== 0 && selectedStock?.market === Market.SET) {
      newErrors.quantity = 'Thai stocks require whole number quantities';
    }

    if (!price || Number(price) <= 0) {
      newErrors.price = 'Please enter a valid price';
    }

    // Market-specific validations
    if (selectedStock) {
      if (selectedStock.market === Market.SET || selectedStock.market === Market.MAI) {
        if (Number(quantity) % 100 !== 0) {
          newErrors.quantity = 'Thai stocks typically trade in lots of 100 shares';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !selectedStock) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      await onSubmit({
        stock: selectedStock,
        quantity: Number(quantity),
        price: Number(price),
        type,
        notes: notes.trim() || undefined
      });
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle market change
  const handleMarketChange = (market: Market) => {
    setSelectedMarket(market);
    setSelectedStock(null); // Reset stock selection when market changes
    setErrors({}); // Clear errors
  };

  // Calculate total value
  const totalValue = selectedStock && quantity && price 
    ? Number(quantity) * Number(price) 
    : 0;

  // Get market warning
  const getMarketWarning = () => {
    if (!selectedStock) return null;

    const warnings: string[] = [];
    
    if (selectedStock.market === Market.SET || selectedStock.market === Market.MAI) {
      if (Number(quantity) % 100 !== 0) {
        warnings.push('Thai stocks typically trade in lots of 100 shares');
      }
    }

    if (selectedStock.market === Market.HKSE) {
      if (Number(price) >= 10 && Number(quantity) % 100 !== 0) {
        warnings.push('Hong Kong stocks over $10 typically trade in lots of 100');
      }
    }

    return warnings.length > 0 ? warnings : null;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <h2 className="text-2xl font-bold text-gray-900">
          {type === 'BUY' ? '📈 Buy Stock' : '📉 Sell Stock'}
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          {type === 'BUY' 
            ? 'Add a new stock position to your portfolio'
            : 'Sell shares from your existing position'
          }
        </p>
      </div>

      {/* Transaction Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Transaction Type
        </label>
        <div className="flex space-x-4">
          {(['BUY', 'SELL'] as const).map((t) => (
            <label key={t} className="flex items-center">
              <input
                type="radio"
                name="type"
                value={t}
                checked={type === t}
                onChange={(e) => setType(e.target.value as 'BUY' | 'SELL')}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <span className={`ml-2 text-sm font-medium ${
                t === 'BUY' ? 'text-green-600' : 'text-red-600'
              }`}>
                {t === 'BUY' ? '📈 Buy' : '📉 Sell'}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Market Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Market (Optional Filter)
        </label>
        <MarketSelector
          value={selectedMarket}
          onChange={handleMarketChange}
          className="w-full"
        />
        <p className="mt-1 text-xs text-gray-500">
          Select a specific market to filter stock search, or leave empty to search all markets
        </p>
      </div>

      {/* Stock Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Stock Symbol *
        </label>
        <StockSelector
          value={selectedStock}
          onSelect={setSelectedStock}
          market={selectedMarket}
          placeholder="Search for stocks (e.g., AAPL, CPALL, 0700)..."
          required
          error={errors.stock}
        />
        {selectedStock && (
          <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-blue-900">
                  {selectedStock.symbol} - {selectedStock.name}
                </p>
                <p className="text-sm text-blue-700">
                  {selectedStock.exchange} • {selectedStock.market} • {selectedStock.currency}
                </p>
              </div>
              <div className="text-2xl">
                {selectedStock.country === 'US' ? '🇺🇸' :
                 selectedStock.country === 'TH' ? '🇹🇭' :
                 selectedStock.country === 'HK' ? '🇭🇰' :
                 selectedStock.country === 'JP' ? '🇯🇵' : '🌍'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quantity and Price */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Quantity *
          </label>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="100"
            min="1"
            step="1"
            required
            className={`
              w-full px-4 py-3 border rounded-lg
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
              ${errors.quantity ? 'border-red-500' : 'border-gray-300'}
            `}
          />
          {errors.quantity && (
            <p className="mt-1 text-sm text-red-600">{errors.quantity}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Price per Share * {selectedStock && `(${selectedStock.currency})`}
          </label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0.00"
            min="0.01"
            step="0.01"
            required
            className={`
              w-full px-4 py-3 border rounded-lg
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
              ${errors.price ? 'border-red-500' : 'border-gray-300'}
            `}
          />
          {errors.price && (
            <p className="mt-1 text-sm text-red-600">{errors.price}</p>
          )}
        </div>
      </div>

      {/* Market Warnings */}
      {getMarketWarning() && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start">
            <div className="text-yellow-600 mt-0.5">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-2 flex-1">
              <h4 className="text-sm font-medium text-yellow-800">Market Guidelines</h4>
              <ul className="mt-1 text-sm text-yellow-700">
                {getMarketWarning()?.map((warning, index) => (
                  <li key={index}>• {warning}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Total Value */}
      {totalValue > 0 && selectedStock && (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Total Value:</span>
            <span className="text-lg font-bold text-gray-900">
              {selectedStock.currency} {totalValue.toLocaleString()}
            </span>
          </div>
        </div>
      )}

      {/* Advanced Options */}
      <div>
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center text-sm text-blue-600 hover:text-blue-700"
        >
          <svg 
            className={`w-4 h-4 mr-1 transform transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          Advanced Options
        </button>

        {showAdvanced && (
          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about this transaction..."
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        )}
      </div>

      {/* Submit Buttons */}
      <div className="flex space-x-3 pt-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className={`
            flex-1 py-3 px-4 rounded-lg font-medium text-white
            focus:outline-none focus:ring-2 focus:ring-offset-2
            ${type === 'BUY' 
              ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500' 
              : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
            }
            ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </>
          ) : (
            `${type === 'BUY' ? '📈 Buy' : '📉 Sell'} ${selectedStock?.symbol || 'Stock'}`
          )}
        </button>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Form Footer */}
      <div className="text-xs text-gray-500 space-y-1">
        <p>* Required fields</p>
        <p>💡 Stock data is filtered by the selected market for better search results</p>
        <p>⚠️ Please verify stock information and prices before submitting</p>
      </div>
    </form>
  );
}