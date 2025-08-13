'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import { TerminalWebSocketMultiplexer } from '../../services/terminal-websocket-multiplexer';
import { useTerminalStore } from '../../stores/terminal.store';
import { SessionValidator } from '../../types/terminal.types';
import { getWebSocketConfig } from '@/utils/websocket';
import { authClient } from '@/core/auth/auth-client';

interface XTermViewProps {
  sessionId: string;
  projectPath: string;
  projectId: string;
  type: 'system' | 'claude';
  multiplexer?: TerminalWebSocketMultiplexer | null;
  onConnectionChange?: (status: 'connected' | 'disconnected' | 'reconnecting') => void;
  isFocused?: boolean; // Focus-based streaming control
  activeTab?: string | null; // Active tab ID for focus detection
}

// Global multiplexer instance for all terminals (fallback if not provided)
let globalMultiplexer: TerminalWebSocketMultiplexer | null = null;

const XTermView: React.FC<XTermViewProps> = ({
  sessionId,
  projectPath,
  projectId,
  type,
  multiplexer: providedMultiplexer,
  onConnectionChange,
  isFocused,
  activeTab
}) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const [terminal, setTerminal] = useState<Terminal | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);
  const scrollPositionRef = useRef<number>(0);
  const multiplexerRef = useRef<TerminalWebSocketMultiplexer | null>(null);
  const [connectionMode, setConnectionMode] = useState<'active' | 'background'>('background');
  
  // Determine focus state - if isFocused prop is provided, use it; otherwise use activeTab logic
  const isComponentFocused = useMemo(() => {
    if (isFocused !== undefined) return isFocused;
    return activeTab === sessionId;
  }, [isFocused, activeTab, sessionId]);
  
  // Get store actions for buffer management
  const { sessionMetadata, addToOutputBuffer, clearOutputBuffer, markOutputAsRead, activeTabs } = useTerminalStore();

  // Initialize multiplexer (use provided or create global)
  const getMultiplexer = useCallback(() => {
    // Use provided multiplexer if available
    if (providedMultiplexer) {
      console.log('[XTermView] Using provided multiplexer');
      return providedMultiplexer;
    }
    
    // Otherwise use/create global multiplexer
    if (!globalMultiplexer) {
      console.log('[XTermView] Creating new global multiplexer');
      const token = authClient.getAccessToken?.() || localStorage.getItem('accessToken');
      const wsConfig = getWebSocketConfig();
      
      globalMultiplexer = new TerminalWebSocketMultiplexer({
        url: wsConfig.system.url,
        auth: { token },
        reconnectionAttempts: wsConfig.reconnect.maxAttempts,
        reconnectionDelay: wsConfig.reconnect.delay,
      });
      
      // Global multiplexer event handlers
      globalMultiplexer.on('primary:connected', () => {
        console.log('Terminal multiplexer primary connection established');
      });
      
      globalMultiplexer.on('primary:disconnected', (reason) => {
        console.log('Terminal multiplexer primary connection lost:', reason);
      });
    }
    return globalMultiplexer;
  }, [providedMultiplexer]);

  // Flush buffered output when component becomes focused
  useEffect(() => {
    if (isComponentFocused && terminal) {
      const metadata = sessionMetadata[sessionId];
      if (metadata?.outputBuffer && metadata.outputBuffer.length > 0) {
        // Flush buffered output to terminal
        metadata.outputBuffer.forEach(data => {
          terminal.write(data);
        });
        
        // Clear buffer and mark as read
        clearOutputBuffer(sessionId);
        markOutputAsRead(sessionId);
        
        // Scroll to bottom after flushing
        if (!isUserScrolledUp) {
          terminal.scrollToBottom();
        }
      }
    }
  }, [isComponentFocused, terminal, sessionMetadata, sessionId, clearOutputBuffer, markOutputAsRead, isUserScrolledUp]);

  // Update connection mode based on focus state
  useEffect(() => {
    const newMode = isComponentFocused ? 'active' : 'background';
    if (newMode !== connectionMode) {
      setConnectionMode(newMode);
      
      // Notify multiplexer about mode change
      if (multiplexerRef.current) {
        const standardSessionId = SessionValidator.isValidSessionId(sessionId) ? sessionId : SessionValidator.generateSessionId();
        multiplexerRef.current.setSessionMode?.(standardSessionId, newMode);
      }
    }
  }, [isComponentFocused, connectionMode, sessionId]);

  useEffect(() => {
    if (!terminalRef.current) return;

    // Validate and standardize session ID format
    // The session ID should be in format: session_{timestamp}_{random}
    // This prevents the session ID format mismatch that causes reconnection loops
    let standardSessionId = sessionId;
    if (!SessionValidator.isValidSessionId(sessionId)) {
      console.warn(`Non-standard session ID format detected: ${sessionId}`);
      standardSessionId = SessionValidator.generateSessionId();
      console.log(`Generated new standard session ID: ${standardSessionId}`);
    }
    
    // Get or create multiplexer
    const multiplexer = getMultiplexer();
    multiplexerRef.current = multiplexer;

    // Create xterm.js instance
    const term = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#000000',
        foreground: '#00ff00',
        cursor: '#00ff00',
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
        brightWhite: '#e5e5e5'
      },
      allowProposedApi: true,
      scrollback: 10000,
      rows: 30,
      cols: 80
    });

    // Add addons
    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    
    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);
    fitAddonRef.current = fitAddon;

    // Open terminal in DOM
    term.open(terminalRef.current);
    
    // Track user scroll behavior
    const handleScroll = () => {
      if (term.element) {
        const scrollTop = term.element.scrollTop;
        const scrollHeight = term.element.scrollHeight;
        const clientHeight = term.element.clientHeight;
        
        // Consider user scrolled up if they're more than 10px from bottom
        const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;
        setIsUserScrolledUp(!isAtBottom);
        
        // Store current position for potential restoration
        scrollPositionRef.current = scrollTop;
      }
    };
    
    // Add scroll listener
    if (term.element) {
      term.element.addEventListener('scroll', handleScroll);
    }
    
    // Alternative: use MutationObserver to detect when element is available
    const observer = new MutationObserver(() => {
      if (term.element && !term.element.hasAttribute('data-scroll-listener')) {
        term.element.addEventListener('scroll', handleScroll);
        term.element.setAttribute('data-scroll-listener', 'true');
        observer.disconnect();
      }
    });
    
    if (terminalRef.current) {
      observer.observe(terminalRef.current, { childList: true, subtree: true });
    }
    
    // Initial fit without forcing scroll position
    setTimeout(() => {
      fitAddon.fit();
      // Only scroll to bottom on initial load, not on resize
      if (!terminal) {
        term.scrollToBottom();
      }
    }, 100);

    // Setup multiplexer event handlers for this session
    const handleSessionConnected = ({ sessionId: connectedSessionId }: any) => {
      if (connectedSessionId === standardSessionId) {
        console.log('Terminal session connected:', connectedSessionId);
        setIsConnected(true);
        onConnectionChange?.('connected');
        term.write('\r\n\x1b[32m● Terminal Connected (Multiplexed)\x1b[0m\r\n');
      }
    };

    const handleSessionData = ({ sessionId: dataSessionId, data }: any) => {
      if (dataSessionId === standardSessionId) {
        // Use focus-based streaming logic
        if (isComponentFocused) {
          // Stream output directly to terminal for focused component
          term.write(data);
          
          // Auto-scroll to bottom only if user hasn't scrolled up
          if (!isUserScrolledUp) {
            term.scrollToBottom();
          }
        } else {
          // Buffer output for unfocused components
          addToOutputBuffer(sessionId, data);
        }
      }
    };

    const handleSessionError = ({ sessionId: errorSessionId, error }: any) => {
      if (errorSessionId === standardSessionId) {
        console.error('Terminal session error:', error);
        term.write(`\r\n\x1b[31mError: ${error.message || error}\x1b[0m\r\n`);
      }
    };

    const handleSessionDisconnected = ({ sessionId: disconnectedSessionId }: any) => {
      if (disconnectedSessionId === standardSessionId) {
        console.log('Terminal session disconnected:', disconnectedSessionId);
        setIsConnected(false);
        onConnectionChange?.('disconnected');
        term.write('\r\n\x1b[31m○ Disconnected\x1b[0m\r\n');
      }
    };

    const handleSessionClosed = ({ sessionId: closedSessionId }: any) => {
      if (closedSessionId === standardSessionId) {
        console.log('Terminal session closed:', closedSessionId);
        setIsConnected(false);
        onConnectionChange?.('disconnected');
        term.write('\r\n\x1b[33m[Session closed]\x1b[0m\r\n');
      }
    };

    // Add event listeners
    multiplexer.on('session:connected', handleSessionConnected);
    multiplexer.on('session:data', handleSessionData);
    multiplexer.on('session:error', handleSessionError);
    multiplexer.on('session:disconnected', handleSessionDisconnected);
    multiplexer.on('session:closed', handleSessionClosed);

    // Connect to session
    multiplexer.connectSession(standardSessionId, projectId, type)
      .then(() => {
        console.log(`Terminal session ${standardSessionId} connection initiated`);
      })
      .catch((error) => {
        console.error('Failed to connect terminal session:', error);
        term.write(`\r\n\x1b[31mFailed to connect: ${error.message}\x1b[0m\r\n`);
      });

    // Handle terminal input
    term.onData((data: string) => {
      if (multiplexer && isConnected) {
        // Send input through multiplexer
        multiplexer.sendInput(standardSessionId, data);
      }
    });

    // Handle terminal resize
    term.onResize((size: { cols: number; rows: number }) => {
      if (multiplexer && isConnected) {
        multiplexer.resizeSession(standardSessionId, size.cols, size.rows);
      }
    });

    // Handle window resize without changing scroll position
    const handleResize = () => {
      if (fitAddonRef.current && terminal) {
        // Save current scroll position
        const currentScrollTop = terminal.element?.scrollTop || 0;
        const currentScrollHeight = terminal.element?.scrollHeight || 0;
        const currentClientHeight = terminal.element?.clientHeight || 0;
        
        setTimeout(() => {
          fitAddonRef.current?.fit();
          
          // Restore scroll position or maintain bottom scroll if user was at bottom
          if (terminal.element) {
            const wasAtBottom = currentScrollTop + currentClientHeight >= currentScrollHeight - 10;
            if (wasAtBottom && !isUserScrolledUp) {
              terminal.scrollToBottom();
            }
          }
        }, 50);
      }
    };

    window.addEventListener('resize', handleResize);

    setTerminal(term);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (term.element) {
        term.element.removeEventListener('scroll', handleScroll);
      }
      observer.disconnect();
      
      // Remove event listeners
      if (multiplexer) {
        multiplexer.off('session:connected', handleSessionConnected);
        multiplexer.off('session:data', handleSessionData);
        multiplexer.off('session:error', handleSessionError);
        multiplexer.off('session:disconnected', handleSessionDisconnected);
        multiplexer.off('session:closed', handleSessionClosed);
        
        // Disconnect session (but keep process alive for background)
        multiplexer.disconnectSession(standardSessionId);
      }
      
      term.dispose();
    };
  }, [projectId, sessionId, projectPath]);

  const handleClear = () => {
    if (terminal) {
      terminal.clear();
    }
  };

  const handleCopy = () => {
    if (terminal && terminal.hasSelection()) {
      const selection = terminal.getSelection();
      navigator.clipboard.writeText(selection);
      terminal.clearSelection();
    }
  };

  const handleRestart = () => {
    if (multiplexerRef.current && sessionId) {
      const standardSessionId = SessionValidator.isValidSessionId(sessionId) ? sessionId : SessionValidator.generateSessionId();
      // Close and reconnect session
      multiplexerRef.current.closeSession(standardSessionId);
      setTimeout(() => {
        multiplexerRef.current?.connectSession(standardSessionId, projectId, type);
      }, 1000);
    }
  };

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Connection Status */}
      <div className={`px-4 py-1 text-xs flex-shrink-0 ${
        isConnected ? 'bg-green-900' : 'bg-red-900'
      } text-white`}>
        {isConnected ? '● Terminal Connected' : '○ Disconnected'}
        <span className="ml-2 text-gray-300">
          Session: {sessionId.substring(0, 8)}...
        </span>
      </div>

      {/* Terminal Container */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <div ref={terminalRef} className="h-full p-2" />
      </div>

      {/* Terminal Actions */}
      <div className="flex items-center justify-between px-2 py-1 border-t border-gray-800 bg-gray-900 flex-shrink-0">
        <div className="text-xs text-gray-500">
          {type === 'system' ? 'System Terminal' : 'Claude Terminal'}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleClear}
            className="px-2 py-1 text-xs bg-gray-800 hover:bg-gray-700 rounded text-white transition-colors"
            title="Clear"
          >
            Clear
          </button>
          <button
            onClick={handleCopy}
            className="px-2 py-1 text-xs bg-gray-800 hover:bg-gray-700 rounded text-white transition-colors"
            title="Copy selection"
          >
            Copy
          </button>
          <button
            onClick={handleRestart}
            className="px-2 py-1 text-xs bg-gray-800 hover:bg-gray-700 rounded text-white transition-colors"
            title="Restart terminal"
          >
            Restart
          </button>
        </div>
      </div>
    </div>
  );
};

export default XTermView;