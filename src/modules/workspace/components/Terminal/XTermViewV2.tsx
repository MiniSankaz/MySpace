'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { terminalConfig, getWebSocketUrl } from '@/config/terminal.config';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';

interface XTermViewV2Props {
  sessionId: string;
  projectId: string;
  projectPath?: string;
  type: 'system' | 'claude';
  isFocused: boolean;
  onData?: (data: string) => void;
  onResize?: (cols: number, rows: number) => void;
}

/**
 * XTermViewV2 - Simplified terminal view with focus-based rendering
 * 
 * Key improvements:
 * - No complex reconnection logic
 * - Simple WebSocket connection
 * - Focus-aware rendering
 * - Clean lifecycle management
 */
const XTermViewV2: React.FC<XTermViewV2Props> = ({
  sessionId,
  projectId,
  projectPath,
  type,
  isFocused,
  onData,
  onResize,
}) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 3;

  // Initialize terminal
  useEffect(() => {
    if (!terminalRef.current) return;
    
    // Prevent double initialization in React StrictMode
    if (xtermRef.current) {
      console.log(`[XTermView] Terminal already initialized for session ${sessionId}`);
      return;
    }

    // Create terminal instance
    const term = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#1a1a1a',
        foreground: '#d4d4d4',
        cursor: '#d4d4d4',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#e5e5e5',
      },
      allowTransparency: true,
      scrollback: 1000,
    });

    // Add addons
    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    
    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);
    
    // Open terminal in container with safety check
    try {
      term.open(terminalRef.current);
      
      // Delay fit to ensure container is ready
      setTimeout(() => {
        if (fitAddon && terminalRef.current) {
          try {
            fitAddon.fit();
          } catch (e) {
            console.warn('[XTermView] Initial fit failed, will retry:', e);
          }
        }
      }, 50);
    } catch (error) {
      console.error('[XTermView] Failed to open terminal:', error);
      return;
    }
    
    // Store refs
    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // Handle resize with safety checks
    const handleResize = () => {
      if (fitAddonRef.current && xtermRef.current && terminalRef.current) {
        try {
          fitAddonRef.current.fit();
          const dimensions = fitAddonRef.current?.proposeDimensions();
          if (dimensions && dimensions.cols > 0 && dimensions.rows > 0 && onResize) {
            onResize(dimensions.cols, dimensions.rows);
          }
        } catch (error) {
          console.warn('[XTerm] Resize failed, will retry:', error);
          // Retry after a short delay
          setTimeout(() => {
            if (fitAddonRef.current) {
              try {
                fitAddonRef.current.fit();
              } catch (e) {
                console.error('[XTerm] Resize retry failed:', e);
              }
            }
          }, 100);
        }
      }
    };

    window.addEventListener('resize', handleResize);

    // Handle terminal input
    const dataHandler = term.onData((data) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'input',
          data,
        }));
      }
      if (onData) {
        onData(data);
      }
    });

    // Connect WebSocket
    connectWebSocket();

    // Cleanup
    return () => {
      // Only cleanup if this is the actual unmount (not StrictMode re-render)
      if (!xtermRef.current) return;
      
      console.log(`[XTermView] Cleaning up terminal view for session: ${sessionId}`);
      window.removeEventListener('resize', handleResize);
      
      if (dataHandler) {
        dataHandler.dispose();
      }
      
      // Clear reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      // Close WebSocket with clean disconnect
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close(1000, 'Component unmounting');
        wsRef.current = null;
      }
      
      // Reset reconnection state
      reconnectAttemptsRef.current = 0;
      
      // Dispose terminal
      if (xtermRef.current) {
        xtermRef.current.dispose();
        xtermRef.current = null;
      }
      
      // Clear fit addon ref
      fitAddonRef.current = null;
    };
  }, [sessionId]);

  // Handle focus changes
  useEffect(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: isFocused ? 'focus' : 'blur',
        sessionId,
      }));
    }
  }, [isFocused, sessionId]);

  // Connect to WebSocket server
  const connectWebSocket = useCallback(() => {
    // Prevent multiple connections
    if (wsRef.current && wsRef.current.readyState === WebSocket.CONNECTING) {
      console.log(`[XTermView] WebSocket already connecting for session ${sessionId}`);
      return;
    }
    
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.log(`[XTermView] WebSocket already connected for session ${sessionId}`);
      return;
    }
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const port = type === 'system' ? 'terminalConfig.websocket.port' : 'terminalConfig.websocket.claudePort';
    
    // Build WebSocket URL with project path
    let wsUrl = `${protocol}//127.0.0.1:${port}/?projectId=${projectId}&sessionId=${sessionId}`;
    if (projectPath) {
      wsUrl += `&path=${encodeURIComponent(projectPath)}`;
    }
    
    console.log(`[XTermView] Connecting to WebSocket for session ${sessionId}...`);
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log(`Connected to ${type} terminal for session ${sessionId}`);
      
      // Reset reconnection attempts on successful connection
      reconnectAttemptsRef.current = 0;
      
      // Clear any pending reconnection timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      // Clear notification about reconnection (removed to avoid clutter)
      // The buffered data will be shown instead
      
      // Send resize dimensions with safety checks
      if (fitAddonRef.current && xtermRef.current) {
        try {
          const dimensions = fitAddonRef.current?.proposeDimensions();
          if (dimensions && dimensions.cols > 0 && dimensions.rows > 0) {
            ws.send(JSON.stringify({
              type: 'resize',
              cols: dimensions.cols,
              rows: dimensions.rows,
            }));
          }
        } catch (error) {
          console.warn('[XTerm] Initial resize failed:', error);
        }
      }
      
      // Send focus state
      ws.send(JSON.stringify({
        type: isFocused ? 'focus' : 'blur',
        sessionId,
      }));
    };
    
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        if (xtermRef.current) {
          switch (message.type) {
            case 'stream':
            case 'data':
              // Always write received data - the backend handles focus-based streaming
              xtermRef.current.write(message.data);
              break;
              
            case 'buffered':
              // Clear terminal before displaying buffered data to prevent duplication
              if (message.data) {
                xtermRef.current.clear();
                xtermRef.current.write(message.data);
              }
              break;
              
            case 'suspended':
              // Handle suspension notification
              console.log(`Terminal ${sessionId} suspended: ${message.message}`);
              xtermRef.current.write(`\r\n\x1b[33m[Session Suspended]\x1b[0m\r\n`);
              break;
              
            case 'resumed':
              // Handle resumption notification
              console.log(`Terminal ${sessionId} resumed: ${message.message}`);
              xtermRef.current.write(`\r\n\x1b[32m[Session Resumed]\x1b[0m\r\n`);
              break;
              
            case 'clear':
              xtermRef.current.clear();
              break;
              
            case 'exit':
              xtermRef.current.write(`\r\n[Process exited with code ${message.code}]\r\n`);
              break;
              
            case 'focusUpdate':
              // Handle focus state update from backend
              console.log(`Terminal ${sessionId} focus update: ${message.focused}`);
              break;
          }
        }
      } catch (err) {
        console.error('Failed to process WebSocket message:', err);
      }
    };
    
    ws.onerror = (error) => {
      console.error(`WebSocket error for session ${sessionId}:`, error);
      if (xtermRef.current) {
        xtermRef.current.write('\r\n\x1b[31m[Connection Error - Check if terminal is ready]\x1b[0m\r\n');
      }
    };
    
    ws.onclose = (event) => {
      console.log(`WebSocket closed:`, event.code, event.reason);
      
      // Don't reconnect if it was a clean close
      if (event.code === 1000) {
        return;
      }
      
      if (xtermRef.current) {
        xtermRef.current.write('\r\n\x1b[33m[Disconnected]\x1b[0m\r\n');
      }
      
      // Attempt reconnection with exponential backoff
      if (reconnectAttemptsRef.current < maxReconnectAttempts) {
        reconnectAttemptsRef.current++;
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current - 1), 5000);
        
        if (xtermRef.current) {
          xtermRef.current.write(`\r\n\x1b[33m[Reconnecting in ${delay}ms... (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})]\x1b[0m\r\n`);
        }
        
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log(`Attempting to reconnect (${reconnectAttemptsRef.current}/${maxReconnectAttempts})...`);
          connectWebSocket();
        }, delay);
      } else {
        if (xtermRef.current) {
          xtermRef.current.write('\r\n\x1b[31m[Connection failed. Please refresh the page.]\x1b[0m\r\n');
        }
      }
    };
    
    wsRef.current = ws;
  }, [sessionId, projectId, projectPath, type, isFocused]);

  return (
    <div 
      ref={terminalRef} 
      className="h-full w-full"
      style={{ opacity: isFocused ? 1 : 0.5 }}
    />
  );
};

export default XTermViewV2;