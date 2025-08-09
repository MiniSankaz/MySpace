'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';

interface ClaudeXTermViewProps {
  sessionId: string;
  projectPath: string;
  projectId: string;
  type: 'claude';
}

const ClaudeXTermView: React.FC<ClaudeXTermViewProps> = ({
  sessionId,
  projectPath,
  projectId,
  type
}) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const [terminal, setTerminal] = useState<Terminal | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isClaudeReady, setIsClaudeReady] = useState(false);
  const fitAddonRef = useRef<FitAddon | null>(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    // Use stable session ID for Claude terminal based on provided sessionId and projectId
    const uniqueSessionId = `${sessionId}_${projectId}`;

    // Create xterm.js instance with Claude theme
    const term = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#1a0033',  // Dark purple background
        foreground: '#e0d0ff',  // Light purple text
        cursor: '#ff00ff',      // Magenta cursor
        black: '#000000',
        red: '#ff3366',
        green: '#00ff88',
        yellow: '#ffff00',
        blue: '#3366ff',
        magenta: '#ff00ff',
        cyan: '#00ffff',
        white: '#ffffff',
        brightBlack: '#666666',
        brightRed: '#ff6699',
        brightGreen: '#66ffaa',
        brightYellow: '#ffff66',
        brightBlue: '#6699ff',
        brightMagenta: '#ff66ff',
        brightCyan: '#66ffff',
        brightWhite: '#ffffff'
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
    
    // Initial fit and delayed fit to ensure proper sizing
    setTimeout(() => {
      fitAddon.fit();
      term.scrollToBottom();
    }, 100);

    // Connect to Claude WebSocket on port 4002
    const token = localStorage.getItem('accessToken');
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = '127.0.0.1:4002';  // Claude Terminal port
    
    const params = new URLSearchParams({
      projectId,
      token: token || '',
      sessionId: uniqueSessionId,
      path: projectPath,
    });

    const wsUrl = `${protocol}//${wsHost}/?${params.toString()}`;
    console.log('Connecting to Claude terminal WebSocket:', wsUrl);
    
    const websocket = new WebSocket(wsUrl);
    
    websocket.onopen = () => {
      console.log('Claude Terminal WebSocket connected');
      setIsConnected(true);
      term.write('\r\n\x1b[35m● Claude Terminal Connected\x1b[0m\r\n');
      term.write('\x1b[33mInitializing Claude Code CLI...\x1b[0m\r\n');
    };

    websocket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        switch (message.type) {
          case 'connected':
            console.log('Claude terminal session started:', message.sessionId);
            term.write(`Working directory: ${message.workingDir}\r\n`);
            break;
            
          case 'stream':
            // Stream output directly to terminal
            term.write(message.data);
            
            // Check if Claude CLI is ready
            if (message.data.includes('Claude>') || message.data.includes('claude>')) {
              if (!isClaudeReady) {
                setIsClaudeReady(true);
                term.write('\r\n\x1b[32m✓ Claude Code CLI is ready!\x1b[0m\r\n');
              }
            }
            break;
            
          case 'exit':
            term.write(`\r\n\x1b[33m[Process exited with code ${message.code}]\x1b[0m\r\n`);
            setIsClaudeReady(false);
            break;
            
          case 'error':
            term.write(`\r\n\x1b[31mError: ${message.message}\x1b[0m\r\n`);
            break;
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    websocket.onerror = (error) => {
      console.error('Claude WebSocket error:', error);
      term.write('\r\n\x1b[31mWebSocket connection error\x1b[0m\r\n');
    };

    websocket.onclose = () => {
      console.log('Claude WebSocket closed');
      setIsConnected(false);
      setIsClaudeReady(false);
      term.write('\r\n\x1b[31m○ Disconnected from Claude Terminal\x1b[0m\r\n');
    };

    // Handle terminal input
    term.onData((data: string) => {
      if (websocket.readyState === WebSocket.OPEN) {
        // Send raw input to WebSocket
        websocket.send(JSON.stringify({
          type: 'input',
          data: data
        }));
      }
    });

    // Handle terminal resize
    term.onResize((size: { cols: number; rows: number }) => {
      if (websocket.readyState === WebSocket.OPEN) {
        websocket.send(JSON.stringify({
          type: 'resize',
          cols: size.cols,
          rows: size.rows
        }));
      }
    });

    // Handle window resize
    const handleResize = () => {
      if (fitAddonRef.current && terminal) {
        setTimeout(() => {
          fitAddonRef.current?.fit();
          terminal.scrollToBottom();
        }, 50);
      }
    };

    window.addEventListener('resize', handleResize);

    setTerminal(term);
    setWs(websocket);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      websocket.close();
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
    if (ws) {
      ws.close();
      // Reload the component
      window.location.reload();
    }
  };

  return (
    <div className="h-full flex flex-col bg-purple-950 overflow-hidden">
      {/* Connection Status */}
      <div className={`px-4 py-1 text-xs flex-shrink-0 ${
        isClaudeReady ? 'bg-purple-800' : isConnected ? 'bg-purple-900' : 'bg-red-900'
      } text-white`}>
        {isClaudeReady 
          ? '🤖 Claude Code CLI Ready' 
          : isConnected 
            ? '⏳ Initializing Claude...' 
            : '○ Disconnected'}
        <span className="ml-2 text-gray-300">
          Session: {sessionId.substring(0, 8)}...
        </span>
      </div>

      {/* Terminal Container */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <div ref={terminalRef} className="h-full p-2" />
      </div>

      {/* Terminal Actions */}
      <div className="flex items-center justify-between px-2 py-1 border-t border-purple-800 bg-purple-900 flex-shrink-0">
        <div className="text-xs text-purple-300">
          Claude Code Terminal
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleClear}
            className="px-2 py-1 text-xs bg-purple-800 hover:bg-purple-700 rounded text-white transition-colors"
            title="Clear"
          >
            Clear
          </button>
          <button
            onClick={handleCopy}
            className="px-2 py-1 text-xs bg-purple-800 hover:bg-purple-700 rounded text-white transition-colors"
            title="Copy selection"
          >
            Copy
          </button>
          <button
            onClick={handleRestart}
            className="px-2 py-1 text-xs bg-purple-800 hover:bg-purple-700 rounded text-white transition-colors"
            title="Restart Claude Terminal"
          >
            Restart
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClaudeXTermView;