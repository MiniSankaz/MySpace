'use client';

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';

interface XTermViewV3Props {
  sessionId: string;
  mode?: 'normal' | 'claude';
  projectId?: string;
  projectPath?: string;
  isFocused?: boolean;
}

/**
 * XTermViewV3 - Terminal view ที่รองรับ WebSocket V2
 * 
 * Features:
 * - รองรับทั้ง WebSocket เก่าและใหม่
 * - Auto-detect endpoint ที่ดีที่สุด
 * - Simple reconnection logic
 * - Focus-aware rendering
 */
const XTermViewV3: React.FC<XTermViewV3Props> = ({
  sessionId,
  mode = 'normal',
  projectId,
  projectPath,
  isFocused = true,
}) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [systemType, setSystemType] = useState<'legacy' | 'new' | null>(null);
  
  // กำหนด WebSocket endpoint
  const getWebSocketUrl = useCallback(() => {
    const useNewEndpoint = process.env.NEXT_PUBLIC_USE_NEW_TERMINAL_API === 'true' || true;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    
    // Port configuration
    const wsPort = mode === 'claude' ? 4002 : 4001;
    const path = useNewEndpoint ? '/ws/terminal-v2' : '/ws/terminal';
    
    const url = `${protocol}//${host}:${wsPort}${path}`;
    const params = new URLSearchParams({
      sessionId,
      projectId: projectId || 'default',
      mode,
      ...(projectPath && { path: projectPath })
    });
    
    return `${url}?${params}`;
  }, [sessionId, mode, projectId, projectPath]);
  
  // Initialize terminal
  useEffect(() => {
    if (!terminalRef.current) return;
    
    // Prevent double initialization
    if (xtermRef.current) {
      console.log(`[XTermViewV3] Terminal already initialized for ${sessionId}`);
      return;
    }
    
    console.log(`[XTermViewV3] Initializing terminal for session ${sessionId}`);
    
    // Create terminal
    const term = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: mode === 'claude' ? '#1e0933' : '#0a0a0a',
        foreground: '#e0e0e0',
        cursor: mode === 'claude' ? '#b794f6' : '#00ff00',
        black: '#000000',
        red: '#ff5555',
        green: '#50fa7b',
        yellow: '#f1fa8c',
        blue: '#6272a4',
        magenta: '#ff79c6',
        cyan: '#8be9fd',
        white: '#f8f8f2',
        brightBlack: '#6272a4',
        brightRed: '#ff6e6e',
        brightGreen: '#69ff94',
        brightYellow: '#ffffa5',
        brightBlue: '#d6acff',
        brightMagenta: '#ff92df',
        brightCyan: '#a4ffff',
        brightWhite: '#ffffff',
      },
      allowTransparency: true,
      scrollback: 5000,
    });
    
    // Add addons
    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    
    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);
    
    // Open terminal
    try {
      term.open(terminalRef.current);
      
      // Fit terminal after rendering
      setTimeout(() => {
        if (fitAddon && terminalRef.current) {
          try {
            fitAddon.fit();
          } catch (err) {
            console.error('[XTermViewV3] Failed to fit terminal:', err);
          }
        }
      }, 100);
      
      // Store refs
      xtermRef.current = term;
      fitAddonRef.current = fitAddon;
      
      // Show initial message
      term.writeln(`🚀 Terminal ${sessionId} (${mode} mode)`);
      term.writeln(`System: Waiting for connection...`);
      
    } catch (error) {
      console.error('[XTermViewV3] Failed to initialize terminal:', error);
    }
    
    // Cleanup
    return () => {
      console.log(`[XTermViewV3] Cleaning up terminal ${sessionId}`);
      if (xtermRef.current) {
        xtermRef.current.dispose();
        xtermRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [sessionId, mode]);
  
  // WebSocket connection
  useEffect(() => {
    if (!xtermRef.current) return;
    
    const connectWebSocket = () => {
      const url = getWebSocketUrl();
      console.log(`[XTermViewV3] Connecting to ${url}`);
      
      setConnectionStatus('connecting');
      
      const ws = new WebSocket(url);
      wsRef.current = ws;
      
      ws.onopen = () => {
        console.log(`[XTermViewV3] WebSocket connected for ${sessionId}`);
        setConnectionStatus('connected');
        
        if (xtermRef.current) {
          xtermRef.current.clear();
          xtermRef.current.writeln(`✅ Connected to terminal server`);
        }
      };
      
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          switch (message.type) {
            case 'connected':
              setSystemType(message.system || 'legacy');
              if (xtermRef.current) {
                xtermRef.current.writeln(`📡 System: ${message.system || 'legacy'} | Mode: ${message.migrationMode || 'unknown'}`);
              }
              break;
              
            case 'output':
              if (xtermRef.current && isFocused) {
                xtermRef.current.write(message.data);
              }
              break;
              
            case 'error':
              if (xtermRef.current) {
                xtermRef.current.writeln(`\r\n❌ Error: ${message.message}`);
              }
              break;
              
            case 'exit':
              if (xtermRef.current) {
                xtermRef.current.writeln(`\r\n🔚 Process exited with code ${message.code}`);
              }
              setConnectionStatus('disconnected');
              break;
              
            default:
              console.log(`[XTermViewV3] Unknown message type: ${message.type}`);
          }
        } catch (error) {
          // If not JSON, treat as raw output
          if (xtermRef.current && isFocused) {
            xtermRef.current.write(event.data);
          }
        }
      };
      
      ws.onerror = (error) => {
        console.error(`[XTermViewV3] WebSocket error:`, error);
        setConnectionStatus('disconnected');
      };
      
      ws.onclose = () => {
        console.log(`[XTermViewV3] WebSocket closed for ${sessionId}`);
        setConnectionStatus('disconnected');
        
        if (xtermRef.current) {
          xtermRef.current.writeln(`\r\n⚠️ Connection lost. Reconnecting...`);
        }
        
        // Reconnect after delay
        setTimeout(() => {
          if (wsRef.current === ws) {
            connectWebSocket();
          }
        }, 3000);
      };
    };
    
    // Connect WebSocket
    connectWebSocket();
    
    // Cleanup
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [sessionId, getWebSocketUrl, isFocused]);
  
  // Handle terminal input
  useEffect(() => {
    if (!xtermRef.current) return;
    
    const term = xtermRef.current;
    
    const handleData = (data: string) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        // Send as JSON command
        wsRef.current.send(JSON.stringify({
          type: 'input',
          data
        }));
      }
    };
    
    const disposable = term.onData(handleData);
    
    return () => {
      disposable.dispose();
    };
  }, []);
  
  // Handle resize
  useEffect(() => {
    if (!xtermRef.current || !fitAddonRef.current) return;
    
    const handleResize = () => {
      if (fitAddonRef.current && terminalRef.current) {
        try {
          fitAddonRef.current.fit();
          
          // Send resize command
          if (wsRef.current?.readyState === WebSocket.OPEN && xtermRef.current) {
            const { rows, cols } = xtermRef.current;
            wsRef.current.send(JSON.stringify({
              type: 'resize',
              data: { rows, cols }
            }));
          }
        } catch (err) {
          console.error('[XTermViewV3] Resize error:', err);
        }
      }
    };
    
    // Debounced resize
    let resizeTimeout: NodeJS.Timeout;
    const debouncedResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(handleResize, 100);
    };
    
    window.addEventListener('resize', debouncedResize);
    
    // Initial resize
    handleResize();
    
    return () => {
      window.removeEventListener('resize', debouncedResize);
      clearTimeout(resizeTimeout);
    };
  }, []);
  
  // Handle focus changes
  useEffect(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'focus',
        data: { focused: isFocused }
      }));
    }
  }, [isFocused]);
  
  return (
    <div className="relative h-full w-full bg-black">
      {/* Connection indicator */}
      <div className={`absolute top-2 right-2 z-10 flex items-center gap-2 px-2 py-1 rounded text-xs ${
        connectionStatus === 'connected' 
          ? 'bg-green-500/20 text-green-400' 
          : connectionStatus === 'connecting'
          ? 'bg-yellow-500/20 text-yellow-400'
          : 'bg-red-500/20 text-red-400'
      }`}>
        <div className={`w-2 h-2 rounded-full ${
          connectionStatus === 'connected' 
            ? 'bg-green-400' 
            : connectionStatus === 'connecting'
            ? 'bg-yellow-400 animate-pulse'
            : 'bg-red-400'
        }`} />
        <span>{connectionStatus}</span>
        {systemType && (
          <span className="opacity-75">({systemType})</span>
        )}
      </div>
      
      {/* Terminal container */}
      <div 
        ref={terminalRef} 
        className="h-full w-full p-2"
        style={{ 
          opacity: isFocused ? 1 : 0.7,
          filter: isFocused ? 'none' : 'grayscale(0.3)'
        }}
      />
    </div>
  );
};

export default XTermViewV3;