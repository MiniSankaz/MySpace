"use client";

import { useState, useEffect, useCallback } from "react";
import { PortfolioService, Portfolio, Holding, Transaction, TradeDto, PortfolioMetrics } from "@/services/microservices/portfolio-service";
import { useSession } from "next-auth/react";
import { toast } from "react-hot-toast";

export interface UsePortfolioReturn {
  // State
  portfolios: Portfolio[];
  selectedPortfolio: Portfolio | null;
  holdings: Holding[];
  transactions: Transaction[];
  metrics: PortfolioMetrics | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchPortfolios: () => Promise<void>;
  selectPortfolio: (portfolioId: string) => Promise<void>;
  createPortfolio: (name: string, description?: string) => Promise<Portfolio | null>;
  deletePortfolio: (portfolioId: string) => Promise<boolean>;
  executeTrade: (portfolioId: string, trade: TradeDto) => Promise<Transaction | null>;
  fetchTransactions: (portfolioId: string) => Promise<void>;
  fetchMetrics: (portfolioId: string) => Promise<void>;
  refreshData: () => Promise<void>;
}

export function usePortfolioService(): UsePortfolioReturn {
  const { data: session } = useSession();
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [selectedPortfolio, setSelectedPortfolio] = useState<Portfolio | null>(null);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [metrics, setMetrics] = useState<PortfolioMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const portfolioService = new PortfolioService();

  // Fetch all portfolios for current user
  const fetchPortfolios = useCallback(async () => {
    if (!session?.user?.id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await portfolioService.getUserPortfolios(session.user.id);
      if (response?.success && response?.data) {
        setPortfolios(response.data);
        
        // Auto-select first portfolio if none selected
        if (response.data.length > 0 && !selectedPortfolio) {
          await selectPortfolio(response.data[0].id);
        }
      } else {
        throw new Error(response.error || "Failed to fetch portfolios");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch portfolios";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id, selectedPortfolio]);

  // Select a portfolio and fetch its details
  const selectPortfolio = useCallback(async (portfolioId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await portfolioService.getPortfolio(portfolioId);
      if (response?.success && response?.data) {
        setSelectedPortfolio(response.data);
        setHoldings(response.data.holdings || []);
        
        // Fetch additional data
        await Promise.all([
          fetchTransactions(portfolioId),
          fetchMetrics(portfolioId)
        ]);
      } else {
        throw new Error(response.error || "Failed to fetch portfolio");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch portfolio";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Create new portfolio
  const createPortfolio = useCallback(async (name: string, description?: string): Promise<Portfolio | null> => {
    if (!session?.user?.id) return null;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await portfolioService.createPortfolio({
        name,
        description,
        initialCapital: 0
      });
      
      if (response?.success && response?.data) {
        toast.success("Portfolio created successfully!");
        await fetchPortfolios(); // Refresh portfolios list
        return response.data;
      } else {
        throw new Error(response.error || "Failed to create portfolio");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create portfolio";
      setError(errorMessage);
      toast.error(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id, fetchPortfolios]);

  // Delete portfolio
  const deletePortfolio = useCallback(async (portfolioId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await portfolioService.deletePortfolio(portfolioId);
      
      if (response.success) {
        toast.success("Portfolio deleted successfully!");
        
        // Clear selected if it was deleted
        if (selectedPortfolio?.id === portfolioId) {
          setSelectedPortfolio(null);
          setHoldings([]);
          setTransactions([]);
          setMetrics(null);
        }
        
        await fetchPortfolios(); // Refresh portfolios list
        return true;
      } else {
        throw new Error(response.error || "Failed to delete portfolio");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete portfolio";
      setError(errorMessage);
      toast.error(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [selectedPortfolio, fetchPortfolios]);

  // Execute trade (buy/sell)
  const executeTrade = useCallback(async (portfolioId: string, trade: TradeDto): Promise<Transaction | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await portfolioService.executeTrade(portfolioId, trade);
      
      if (response?.success && response?.data) {
        toast.success(`${trade.type} order executed successfully!`);
        
        // Refresh portfolio data
        if (selectedPortfolio?.id === portfolioId) {
          await selectPortfolio(portfolioId);
        }
        
        return response.data;
      } else {
        throw new Error(response.error || "Failed to execute trade");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to execute trade";
      setError(errorMessage);
      toast.error(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [selectedPortfolio, selectPortfolio]);

  // Fetch transactions
  const fetchTransactions = useCallback(async (portfolioId: string) => {
    try {
      const response = await portfolioService.getTransactions(portfolioId);
      if (response?.success && response?.data) {
        setTransactions(response.data);
      }
    } catch (err) {
      console.error("Failed to fetch transactions:", err);
    }
  }, []);

  // Fetch portfolio metrics
  const fetchMetrics = useCallback(async (portfolioId: string) => {
    try {
      const response = await portfolioService.getPortfolioMetrics(portfolioId);
      if (response?.success && response?.data) {
        setMetrics(response.data);
      }
    } catch (err) {
      console.error("Failed to fetch metrics:", err);
    }
  }, []);

  // Refresh all data
  const refreshData = useCallback(async () => {
    if (selectedPortfolio) {
      await selectPortfolio(selectedPortfolio.id);
    } else {
      await fetchPortfolios();
    }
  }, [selectedPortfolio, selectPortfolio, fetchPortfolios]);

  // Initial load
  useEffect(() => {
    if (session?.user?.id) {
      fetchPortfolios();
    }
  }, [session?.user?.id]);

  return {
    // State
    portfolios,
    selectedPortfolio,
    holdings,
    transactions,
    metrics,
    loading,
    error,
    
    // Actions
    fetchPortfolios,
    selectPortfolio,
    createPortfolio,
    deletePortfolio,
    executeTrade,
    fetchTransactions,
    fetchMetrics,
    refreshData,
  };
}