'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Market, Currency } from '@/types/portfolio';

interface StockSuggestion {
  symbol: string;
  name: string;
  market: Market;
  exchange: string;
  country: string;
  currency: Currency;
}

interface StockSelectorProps {
  value?: StockSuggestion | null;
  onSelect: (stock: StockSuggestion | null) => void;
  market?: Market;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  required?: boolean;
  error?: string;
}

export function StockSelector({
  value,
  onSelect,
  market,
  placeholder = "Search for stocks...",
  disabled = false,
  className = "",
  required = false,
  error
}: StockSelectorProps) {
  const [query, setQuery] = useState(value?.symbol || '');
  const [suggestions, setSuggestions] = useState<StockSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  // Debounced search function
  const searchStocks = async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    
    try {
      const params = new URLSearchParams({
        q: searchQuery,
        limit: '10'
      });
      
      if (market) {
        params.append('market', market);
      }

      const response = await fetch(`/api/v1/stocks/suggestions?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setSuggestions(data.data || []);
        setIsOpen(true);
        setSelectedIndex(-1);
      } else {
        setSuggestions([]);
        setIsOpen(false);
      }
    } catch (error) {
      console.error('Error fetching stock suggestions:', error);
      setSuggestions([]);
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    
    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Set new timeout for debounced search
    timeoutRef.current = setTimeout(() => {
      searchStocks(newQuery);
    }, 300);
  };

  // Handle stock selection
  const handleSelectStock = (stock: StockSuggestion) => {
    setQuery(`${stock.symbol} - ${stock.name}`);
    onSelect(stock);
    setIsOpen(false);
    setSelectedIndex(-1);
    setSuggestions([]);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSelectStock(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update query when value changes from outside
  useEffect(() => {
    if (value) {
      setQuery(`${value.symbol} - ${value.name}`);
    } else {
      setQuery('');
    }
  }, [value]);

  // Clear button handler
  const handleClear = () => {
    setQuery('');
    onSelect(null);
    setIsOpen(false);
    setSuggestions([]);
    inputRef.current?.focus();
  };

  // Get market flag emoji
  const getMarketFlag = (country: string) => {
    const flags: Record<string, string> = {
      'US': '🇺🇸',
      'TH': '🇹🇭', 
      'HK': '🇭🇰',
      'JP': '🇯🇵',
      'GB': '🇬🇧',
      'SG': '🇸🇬',
      'AU': '🇦🇺'
    };
    return flags[country] || '🌍';
  };

  return (
    <div className={`relative ${className}`}>
      {/* Input Field */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) {
              setIsOpen(true);
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={`
            w-full px-4 py-3 pr-10 border rounded-lg
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
            disabled:bg-gray-50 disabled:cursor-not-allowed
            ${error ? 'border-red-500' : 'border-gray-300'}
            ${isLoading ? 'pr-16' : ''}
          `}
        />
        
        {/* Loading Spinner */}
        {isLoading && (
          <div className="absolute right-12 top-1/2 transform -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
        
        {/* Clear Button */}
        {query && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}

      {/* Suggestions Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {suggestions.map((stock, index) => (
            <div
              key={`${stock.symbol}-${stock.market}`}
              onClick={() => handleSelectStock(stock)}
              className={`
                px-4 py-3 cursor-pointer border-b border-gray-100 last:border-b-0
                hover:bg-blue-50 transition-colors duration-150
                ${index === selectedIndex ? 'bg-blue-50 border-blue-200' : ''}
              `}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{getMarketFlag(stock.country)}</span>
                    <span className="font-semibold text-gray-900">{stock.symbol}</span>
                    <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                      {stock.market}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-600 truncate">
                    {stock.name}
                  </p>
                  <div className="mt-1 flex items-center space-x-4 text-xs text-gray-500">
                    <span>{stock.exchange}</span>
                    <span>{stock.currency}</span>
                  </div>
                </div>
                <div className="ml-4 flex-shrink-0">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No Results Message */}
      {isOpen && suggestions.length === 0 && query.length >= 2 && !isLoading && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
          <div className="px-4 py-6 text-center text-gray-500">
            <svg className="mx-auto w-8 h-8 mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <p className="text-sm">No stocks found matching "{query}"</p>
            {market && (
              <p className="text-xs mt-1">Searching in {market} market</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Market Selector Component
interface MarketSelectorProps {
  value?: Market;
  onChange: (market: Market) => void;
  className?: string;
  disabled?: boolean;
}

export function MarketSelector({ value, onChange, className = "", disabled = false }: MarketSelectorProps) {
  const markets = [
    { code: Market.NYSE, name: 'NYSE', flag: '🇺🇸', desc: 'New York Stock Exchange' },
    { code: Market.NASDAQ, name: 'NASDAQ', flag: '🇺🇸', desc: 'NASDAQ Stock Market' },
    { code: Market.NYSE_ARCA, name: 'NYSE Arca', flag: '🇺🇸', desc: 'NYSE Arca (ETFs)' },
    { code: Market.SET, name: 'SET', flag: '🇹🇭', desc: 'Stock Exchange of Thailand' },
    { code: Market.MAI, name: 'MAI', flag: '🇹🇭', desc: 'Market for Alternative Investment' },
    { code: Market.HKSE, name: 'HKSE', flag: '🇭🇰', desc: 'Hong Kong Stock Exchange' },
    { code: Market.TSE, name: 'TSE', flag: '🇯🇵', desc: 'Tokyo Stock Exchange' },
    { code: Market.LSE, name: 'LSE', flag: '🇬🇧', desc: 'London Stock Exchange' },
    { code: Market.SGX, name: 'SGX', flag: '🇸🇬', desc: 'Singapore Exchange' },
    { code: Market.ASX, name: 'ASX', flag: '🇦🇺', desc: 'Australian Securities Exchange' }
  ];

  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value as Market)}
      disabled={disabled}
      className={`
        px-4 py-3 border border-gray-300 rounded-lg
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
        disabled:bg-gray-50 disabled:cursor-not-allowed
        ${className}
      `}
    >
      <option value="">Select Market</option>
      {markets.map(market => (
        <option key={market.code} value={market.code}>
          {market.flag} {market.name} - {market.desc}
        </option>
      ))}
    </select>
  );
}