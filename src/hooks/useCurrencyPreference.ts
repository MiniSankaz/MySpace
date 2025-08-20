/**
 * Hook for managing user's currency preference (THB/USD)
 */

import { useState, useEffect, useCallback } from 'react';
import { Currency } from '@/utils/currency';

const STORAGE_KEY = 'portfolio_currency_preference';

interface CurrencyPreference {
  currency: Currency;
  autoDetect: boolean;
  lastUpdated: string;
}

export function useCurrencyPreference() {
  const [currency, setCurrency] = useState<Currency>('THB');
  const [autoDetect, setAutoDetect] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load preference from localStorage
  useEffect(() => {
    const loadPreference = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const preference: CurrencyPreference = JSON.parse(stored);
          setCurrency(preference.currency);
          setAutoDetect(preference.autoDetect);
        } else if (autoDetect) {
          // Auto-detect based on browser locale
          const locale = navigator.language;
          if (locale.startsWith('th')) {
            setCurrency('THB');
          } else {
            setCurrency('USD');
          }
        }
      } catch (error) {
        console.error('Error loading currency preference:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPreference();
  }, []);

  // Save preference to localStorage
  const savePreference = useCallback((newCurrency: Currency, newAutoDetect: boolean) => {
    const preference: CurrencyPreference = {
      currency: newCurrency,
      autoDetect: newAutoDetect,
      lastUpdated: new Date().toISOString(),
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preference));
    } catch (error) {
      console.error('Error saving currency preference:', error);
    }
  }, []);

  // Update currency
  const updateCurrency = useCallback((newCurrency: Currency) => {
    setCurrency(newCurrency);
    savePreference(newCurrency, autoDetect);
  }, [autoDetect, savePreference]);

  // Toggle auto-detect
  const toggleAutoDetect = useCallback(() => {
    const newAutoDetect = !autoDetect;
    setAutoDetect(newAutoDetect);
    
    if (newAutoDetect) {
      // Auto-detect currency based on locale
      const locale = navigator.language;
      const detectedCurrency = locale.startsWith('th') ? 'THB' : 'USD';
      setCurrency(detectedCurrency);
      savePreference(detectedCurrency, newAutoDetect);
    } else {
      savePreference(currency, newAutoDetect);
    }
  }, [autoDetect, currency, savePreference]);

  // Toggle between THB and USD
  const toggleCurrency = useCallback(() => {
    const newCurrency = currency === 'THB' ? 'USD' : 'THB';
    updateCurrency(newCurrency);
  }, [currency, updateCurrency]);

  return {
    currency,
    autoDetect,
    loading,
    updateCurrency,
    toggleCurrency,
    toggleAutoDetect,
  };
}

// Context provider for currency preference (optional, for global state)
import { createContext, useContext, ReactNode } from 'react';

interface CurrencyContextValue {
  currency: Currency;
  autoDetect: boolean;
  loading: boolean;
  updateCurrency: (currency: Currency) => void;
  toggleCurrency: () => void;
  toggleAutoDetect: () => void;
}

const CurrencyContext = createContext<CurrencyContextValue | undefined>(undefined);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const currencyPreference = useCurrencyPreference();

  return (
    <CurrencyContext.Provider value={currencyPreference}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}