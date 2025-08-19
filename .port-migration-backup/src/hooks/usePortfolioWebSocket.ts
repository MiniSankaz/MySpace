"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSession } from "next-auth/react";

export interface PriceUpdate {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: string;
}

export interface PortfolioUpdate {
  portfolioId: string;
  totalValue: number;
  dayChange: number;
  dayChangePercent: number;
  holdings: Array<{
    symbol: string;
    currentPrice: number;
    totalValue: number;
    profitLoss: number;
  }>;
}

export interface WebSocketMessage {
  type: "PRICE_UPDATE" | "PORTFOLIO_UPDATE" | "TRADE_EXECUTED" | "ALERT_TRIGGERED";
  data: any;
}

interface UsePortfolioWebSocketProps {
  portfolioId?: string;
  symbols?: string[];
  onPriceUpdate?: (update: PriceUpdate) => void;
  onPortfolioUpdate?: (update: PortfolioUpdate) => void;
  onTradeExecuted?: (trade: any) => void;
  onAlertTriggered?: (alert: any) => void;
}

export function usePortfolioWebSocket({
  portfolioId,
  symbols = [],
  onPriceUpdate,
  onPortfolioUpdate,
  onTradeExecuted,
  onAlertTriggered,
}: UsePortfolioWebSocketProps) {
  const { data: session } = useSession();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(() => {
    if (!session?.user?.id) return;

    try {
      // Connect to WebSocket through API Gateway
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:4000";
      const ws = new WebSocket(`${wsUrl}/ws/portfolio`);
      
      ws.onopen = () => {
        console.log("Portfolio WebSocket connected");
        setIsConnected(true);
        setError(null);
        
        // Authenticate
        ws.send(JSON.stringify({
          type: "AUTH",
          token: session.accessToken,
        }));
        
        // Subscribe to portfolio updates
        if (portfolioId) {
          ws.send(JSON.stringify({
            type: "SUBSCRIBE_PORTFOLIO",
            portfolioId,
          }));
        }
        
        // Subscribe to symbol price updates
        if (symbols.length > 0) {
          ws.send(JSON.stringify({
            type: "SUBSCRIBE_SYMBOLS",
            symbols,
          }));
        }
      };
      
      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setLastUpdate(new Date());
          
          switch (message.type) {
            case "PRICE_UPDATE":
              onPriceUpdate?.(message.data as PriceUpdate);
              break;
            case "PORTFOLIO_UPDATE":
              onPortfolioUpdate?.(message.data as PortfolioUpdate);
              break;
            case "TRADE_EXECUTED":
              onTradeExecuted?.(message.data);
              break;
            case "ALERT_TRIGGERED":
              onAlertTriggered?.(message.data);
              break;
          }
        } catch (err) {
          console.error("Error parsing WebSocket message:", err);
        }
      };
      
      ws.onerror = (event) => {
        console.error("WebSocket error:", event);
        setError("Connection error occurred");
      };
      
      ws.onclose = () => {
        console.log("Portfolio WebSocket disconnected");
        setIsConnected(false);
        wsRef.current = null;
        
        // Attempt to reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log("Attempting to reconnect WebSocket...");
          connect();
        }, 3000);
      };
      
      wsRef.current = ws;
    } catch (err) {
      console.error("Failed to connect WebSocket:", err);
      setError("Failed to connect to real-time updates");
    }
  }, [session, portfolioId, symbols, onPriceUpdate, onPortfolioUpdate, onTradeExecuted, onAlertTriggered]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setIsConnected(false);
  }, []);

  const subscribeToSymbols = useCallback((newSymbols: string[]) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "SUBSCRIBE_SYMBOLS",
        symbols: newSymbols,
      }));
    }
  }, []);

  const unsubscribeFromSymbols = useCallback((symbolsToRemove: string[]) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "UNSUBSCRIBE_SYMBOLS",
        symbols: symbolsToRemove,
      }));
    }
  }, []);

  // Connect on mount and when dependencies change
  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Update subscriptions when symbols change
  useEffect(() => {
    if (isConnected && symbols.length > 0) {
      subscribeToSymbols(symbols);
    }
  }, [symbols, isConnected, subscribeToSymbols]);

  return {
    isConnected,
    lastUpdate,
    error,
    subscribeToSymbols,
    unsubscribeFromSymbols,
    reconnect: connect,
    disconnect,
  };
}