'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { terminalConfig, getWebSocketUrl } from '@/config/terminal.config';

interface TerminalWebSocketOptions {
  projectId: string;
  sessionId?: string;
  path?: string;
  onOutput?: (data: string) => void;
  onExit?: (code: number) => void;
  onError?: (error: Error) => void;
}

export const useTerminalWebSocket = ({
  projectId,
  sessionId,
  path,
  onOutput,
  onExit,
  onError,
}: TerminalWebSocketOptions) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN || isConnecting) {
      return;
    }

    setIsConnecting(true);

    try {
      const token = localStorage.getItem('accessToken');
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      // Use separate WebSocket port
      const wsHost = '127.0.0.1:terminalConfig.websocket.port';
      
      const params = new URLSearchParams({
        projectId,
        token: token || '',
        ...(sessionId && { sessionId }),
        ...(path && { path }), // URLSearchParams will handle encoding
      });

      const wsUrl = `${protocol}//${wsHost}/?${params.toString()}`;
      console.log('Connecting to terminal WebSocket:', wsUrl);
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('Terminal WebSocket connected');
        setIsConnected(true);
        setIsConnecting(false);
        
        // Start ping interval to keep connection alive
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000); // Ping every 30 seconds
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          switch (message.type) {
            case 'connected':
              console.log('Terminal session started:', message.sessionId);
              break;
              
            case 'reconnected':
              console.log('Reconnected to session:', message.sessionId);
              break;
              
            case 'stream':
              // Streaming output - append immediately
              onOutput?.(message.data);
              break;
              
            case 'output':
              onOutput?.(message.data);
              break;
              
            case 'history':
              // Session history on reconnect
              onOutput?.(message.data);
              break;
              
            case 'clear':
              // Clear terminal output
              onOutput?.('\x1b[2J\x1b[H');
              break;
              
            case 'exit':
              onExit?.(message.code);
              break;
              
            case 'error':
              onError?.(new Error(message.message));
              break;
              
            case 'pong':
              // Keep-alive response
              break;
              
            default:
              console.warn('Unknown message type:', message.type);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        onError?.(new Error('WebSocket connection error'));
      };

      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        setIsConnected(false);
        setIsConnecting(false);
        wsRef.current = null;
        
        // Clear ping interval
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }
        
        // Don't auto-reconnect for now to avoid loops
        // Uncomment when PTY issues are fixed
        // if (event.code !== 1000 && event.code !== 1001) {
        //   reconnectTimeoutRef.current = setTimeout(() => {
        //     console.log('Attempting to reconnect...');
        //     connect();
        //   }, process.env.PORT || 3000);
        // }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      setIsConnecting(false);
      onError?.(error as Error);
    }
  }, [projectId, sessionId, path, onOutput, onExit, onError]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected');
      wsRef.current = null;
    }
    
    setIsConnected(false);
  }, []);

  const sendInput = useCallback((data: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'input',
        data,
      }));
    }
  }, []);

  const sendControl = useCallback((key: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'ctrl',
        key,
      }));
    }
  }, []);

  const setEnv = useCallback((key: string, value: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'env',
        key,
        value,
      }));
    }
  }, []);

  const resize = useCallback((cols: number, rows: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'resize',
        cols,
        rows,
      }));
    }
  }, []);

  // Enable connect button for manual testing
  const [shouldConnect, setShouldConnect] = useState(false);
  
  useEffect(() => {
    if (shouldConnect) {
      connect();
    }
    
    return () => {
      disconnect();
    };
  }, [shouldConnect, connect, disconnect]);

  return {
    isConnected,
    isConnecting,
    sendInput,
    sendControl,
    setEnv,
    resize,
    connect: () => setShouldConnect(true),
    disconnect: () => {
      setShouldConnect(false);
      disconnect();
    },
  };
};