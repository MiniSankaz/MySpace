import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';

interface Portfolio {
  id: string;
  name: string;
  description?: string;
  currency: string;
  isDefault: boolean;
  holdings: any[];
  transactions: any[];
  snapshots: any[];
  createdAt: string;
  updatedAt: string;
}

interface UsePortfolioReturn {
  portfolios: Portfolio[];
  selectedPortfolio: Portfolio | null;
  loading: boolean;
  error: string | null;
  createPortfolio: (data: { name: string; description?: string; currency?: string }) => Promise<void>;
  updatePortfolio: (id: string, data: Partial<Portfolio>) => Promise<void>;
  deletePortfolio: (id: string) => Promise<void>;
  selectPortfolio: (portfolio: Portfolio) => void;
  refetch: () => Promise<void>;
  // Holdings functions
  addHolding: (portfolioId: string, data: any) => Promise<void>;
  updateHolding: (portfolioId: string, holdingId: string, data: any) => Promise<void>;
  deleteHolding: (portfolioId: string, holdingId: string) => Promise<void>;
}

export function usePortfolio(): UsePortfolioReturn {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [selectedPortfolio, setSelectedPortfolio] = useState<Portfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPortfolios = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getPortfolios();
      
      // Fetch holdings for each portfolio
      const portfoliosWithHoldings = await Promise.all(
        data.map(async (portfolio: Portfolio) => {
          try {
            const holdings = await apiClient.getHoldings(portfolio.id);
            return { ...portfolio, holdings };
          } catch (err) {
            console.warn(`Failed to fetch holdings for portfolio ${portfolio.id}:`, err);
            return { ...portfolio, holdings: [] };
          }
        })
      );
      
      setPortfolios(portfoliosWithHoldings);
      
      // Select first portfolio by default or the default portfolio
      if (portfoliosWithHoldings.length > 0) {
        const defaultPortfolio = portfoliosWithHoldings.find(p => p.isDefault) || portfoliosWithHoldings[0];
        setSelectedPortfolio(defaultPortfolio);
      } else {
        setSelectedPortfolio(null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch portfolios');
      console.error('Error fetching portfolios:', err);
    } finally {
      setLoading(false);
    }
  };

  const createPortfolio = async (data: { name: string; description?: string; currency?: string }) => {
    try {
      setError(null);
      const newPortfolio = await apiClient.createPortfolio(data);
      await fetchPortfolios(); // Refetch to get updated list
    } catch (err: any) {
      setError(err.message || 'Failed to create portfolio');
      throw err;
    }
  };

  const updatePortfolio = async (id: string, data: Partial<Portfolio>) => {
    try {
      setError(null);
      await apiClient.updatePortfolio(id, data);
      await fetchPortfolios(); // Refetch to get updated list
    } catch (err: any) {
      setError(err.message || 'Failed to update portfolio');
      throw err;
    }
  };

  const deletePortfolio = async (id: string) => {
    try {
      setError(null);
      await apiClient.deletePortfolio(id);
      await fetchPortfolios(); // Refetch to get updated list
    } catch (err: any) {
      setError(err.message || 'Failed to delete portfolio');
      throw err;
    }
  };

  const selectPortfolio = (portfolio: Portfolio) => {
    setSelectedPortfolio(portfolio);
  };

  const refetch = fetchPortfolios;

  // Holdings functions
  const addHolding = async (portfolioId: string, data: any) => {
    try {
      setError(null);
      await apiClient.addHolding(portfolioId, data);
      await fetchPortfolios(); // Refetch to get updated holdings
    } catch (err: any) {
      setError(err.message || 'Failed to add holding');
      throw err;
    }
  };

  const updateHolding = async (portfolioId: string, holdingId: string, data: any) => {
    try {
      setError(null);
      await apiClient.updateHolding(portfolioId, holdingId, data);
      await fetchPortfolios(); // Refetch to get updated holdings
    } catch (err: any) {
      setError(err.message || 'Failed to update holding');
      throw err;
    }
  };

  const deleteHolding = async (portfolioId: string, holdingId: string) => {
    try {
      setError(null);
      await apiClient.deleteHolding(portfolioId, holdingId);
      await fetchPortfolios(); // Refetch to get updated holdings
    } catch (err: any) {
      setError(err.message || 'Failed to delete holding');
      throw err;
    }
  };

  useEffect(() => {
    fetchPortfolios();
  }, []);

  return {
    portfolios,
    selectedPortfolio,
    loading,
    error,
    createPortfolio,
    updatePortfolio,
    deletePortfolio,
    selectPortfolio,
    refetch,
    addHolding,
    updateHolding,
    deleteHolding,
  };
}