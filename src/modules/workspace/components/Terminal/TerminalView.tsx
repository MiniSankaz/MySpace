'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useTerminalWebSocket } from '../../hooks/useTerminalWebSocket';
import { useClaudeWebSocket } from '../../hooks/useClaudeWebSocket';

interface TerminalViewProps {
  sessionId: string;
  projectPath: string;
  projectId: string;
  type: 'system' | 'claude';
}

const TerminalView: React.FC<TerminalViewProps> = ({ 
  sessionId, 
  projectPath, 
  projectId,
  type 
}) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [command, setCommand] = useState('');
  const [output, setOutput] = useState<string[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [currentLine, setCurrentLine] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Handle output from WebSocket
  const handleOutput = useCallback((data: string) => {
    // For streaming mode, append to last line or create new one
    setOutput(prev => {
      const newOutput = [...prev];
      
      // Split data by newlines
      const lines = data.split('\n');
      
      // If we have existing output and first line doesn't start with newline
      if (newOutput.length > 0 && !data.startsWith('\n')) {
        // Append first line to last output line
        newOutput[newOutput.length - 1] += lines[0];
        lines.shift();
      }
      
      // Add remaining lines
      lines.forEach(line => {
        if (line || lines.length === 1) { // Keep empty lines except trailing
          newOutput.push(line);
        }
      });
      
      // Limit output buffer to last 1000 lines
      if (newOutput.length > 1000) {
        return newOutput.slice(-1000);
      }
      
      return newOutput;
    });
  }, []);

  // Handle terminal exit
  const handleExit = useCallback((code: number) => {
    setOutput(prev => [...prev, '', `[Process exited with code ${code}]`]);
  }, []);

  // Handle errors
  const handleError = useCallback((error: Error) => {
    setOutput(prev => [...prev, `[Error: ${error.message}]`]);
  }, []);

  // Initialize WebSocket connections based on terminal type
  const systemWs = useTerminalWebSocket({
    projectId,
    sessionId,
    path: projectPath,
    onOutput: type === 'system' ? handleOutput : undefined,
    onExit: type === 'system' ? handleExit : undefined,
    onError: type === 'system' ? handleError : undefined,
  });

  const claudeWs = useClaudeWebSocket({
    projectId,
    sessionId: `claude-${sessionId}`,
    path: projectPath,
    onOutput: type === 'claude' ? handleOutput : undefined,
    onExit: type === 'claude' ? handleExit : undefined,
    onError: type === 'claude' ? handleError : undefined,
  });

  // Select appropriate WebSocket based on terminal type
  const isConnected = type === 'system' ? systemWs.isConnected : claudeWs.isConnected;
  const isConnecting = type === 'system' ? systemWs.isConnecting : claudeWs.isConnecting;
  const sendInput = type === 'system' ? systemWs.sendInput : claudeWs.sendInput;
  const sendControl = type === 'system' ? systemWs.sendControl : claudeWs.sendControl;
  const connect = type === 'system' ? systemWs.connect : claudeWs.connect;
  const disconnect = type === 'system' ? systemWs.disconnect : claudeWs.disconnect;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim() || isProcessing) return;

    if (type === 'system' && isConnected) {
      // Send to real terminal (streaming mode doesn't need to show command first)
      sendInput(command);
      
      // Add to history
      setHistory(prev => [...prev, command]);
      setHistoryIndex(-1);
      setCommand('');
    } else if (type === 'claude' && isConnected) {
      // Send to Claude through WebSocket for streaming
      setOutput(prev => [...prev, `🤖 ${command}`, '']);
      sendInput(command);
      
      // Add to history
      setHistory(prev => [...prev, command]);
      setHistoryIndex(-1);
      setCommand('');
    }
  };

  // Show Claude suggestions based on input
  useEffect(() => {
    if (type === 'claude' && command.length > 2) {
      // Provide local suggestions for common commands
      const commonSuggestions = [
        'create a React component',
        'explain this code',
        'fix the error',
        'refactor for performance',
        'write tests for',
        'document this function',
        'how to implement',
        'what is the best way to',
      ];
      
      const filtered = commonSuggestions
        .filter(s => s.toLowerCase().includes(command.toLowerCase()))
        .slice(0, 5);
      
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [command, type]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIndex < history.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setCommand(history[history.length - 1 - newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setCommand(history[history.length - 1 - newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCommand('');
      }
    } else if (e.ctrlKey && e.key === 'c') {
      // Send Ctrl+C to terminal
      e.preventDefault();
      if (isConnected) {
        sendControl('c');
      }
    } else if (e.ctrlKey && e.key === 'z') {
      // Send Ctrl+Z to terminal
      e.preventDefault();
      if (isConnected) {
        sendControl('z');
      }
    } else if (e.ctrlKey && e.key === 'd') {
      // Send Ctrl+D to terminal
      e.preventDefault();
      if (isConnected) {
        sendControl('d');
      }
    } else if (e.ctrlKey && e.key === 'l') {
      // Clear terminal
      e.preventDefault();
      setOutput([]);
      if (isConnected) {
        sendControl('l');
      }
    } else if (e.key === 'Tab' && type === 'claude' && showSuggestions) {
      // Auto-complete with first suggestion
      e.preventDefault();
      if (suggestions.length > 0) {
        setCommand(suggestions[0]);
        setShowSuggestions(false);
      }
    } else if (e.key === 'Escape') {
      // Hide suggestions
      setShowSuggestions(false);
    }
  };

  // Auto-scroll to bottom
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [output]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="h-full flex flex-col bg-black text-green-400 font-mono text-sm overflow-hidden">
      {/* Connection Status */}
      <div className={`px-4 py-1 text-xs ${
        isConnected 
          ? type === 'claude' ? 'bg-purple-900' : 'bg-green-900'
          : 'bg-red-900'
      }`}>
        {isConnected 
          ? type === 'claude' 
            ? '🤖 Claude Code Connected' 
            : '● Terminal Connected'
          : isConnecting
            ? '⏳ Connecting...'
            : '○ Disconnected'
        }
      </div>

      {/* Terminal Output */}
      <div
        ref={terminalRef}
        className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-0 min-h-0"
        onClick={() => inputRef.current?.focus()}
        style={{ scrollBehavior: 'smooth' }}
      >
        {output.length === 0 && (
          <div className="text-gray-500">
            {type === 'claude' 
              ? isConnected
                ? 'Claude Code CLI Ready. Type commands to interact with Claude.'
                : isConnecting
                  ? 'Connecting to Claude Code CLI...'
                  : (
                    <div className="text-center">
                      <p className="mb-4">Claude Code not connected</p>
                      <button
                        onClick={connect}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded text-white transition-colors"
                      >
                        Connect Claude Code
                      </button>
                    </div>
                  )
              : isConnected 
                ? 'Terminal connected. Type commands to execute.'
                : isConnecting
                  ? 'Connecting to terminal...'
                  : (
                    <div className="text-center">
                      <p className="mb-4">Terminal not connected</p>
                      <button
                        onClick={connect}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white transition-colors"
                      >
                        Connect Terminal
                      </button>
                    </div>
                  )}
          </div>
        )}
        {output.map((line, index) => (
          <div key={index} className="whitespace-pre-wrap break-words leading-relaxed">
            {line}
          </div>
        ))}
      </div>
      
      {/* Command Input */}
      <div className="relative">
        {/* Suggestions dropdown for Claude terminal */}
        {type === 'claude' && showSuggestions && suggestions.length > 0 && (
          <div className="absolute bottom-full left-0 right-0 bg-gray-900 border border-gray-700 rounded-t mb-1">
            <div className="p-2 text-xs text-gray-400">Suggestions (Tab to complete):</div>
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                className="w-full text-left px-3 py-2 hover:bg-gray-800 text-sm"
                onClick={() => {
                  setCommand(suggestion);
                  setShowSuggestions(false);
                  inputRef.current?.focus();
                }}
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="border-t border-gray-800 p-2">
          <div className="flex items-center">
            <span className="mr-2 text-blue-400">
              {type === 'claude' ? '🤖' : '$'}
            </span>
            <input
              ref={inputRef}
              type="text"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent outline-none text-white"
              placeholder={
                type === 'claude' 
                  ? isConnected
                    ? 'Ask Claude anything (e.g., "create a React component", "explain this error")...'
                    : 'Connecting to Claude Code CLI...' 
                  : isConnected 
                    ? 'Enter command...'
                    : 'Connecting...'
              }
              disabled={!isConnected}
              autoFocus
            />
            {type === 'claude' && isProcessing && (
              <div className="ml-2 text-yellow-400 animate-pulse">⏳</div>
            )}
          </div>
        </form>
      </div>

      {/* Terminal Actions */}
      <div className="flex items-center justify-between px-2 py-1 border-t border-gray-800">
        <div className="text-xs text-gray-500">
          {type === 'system' ? `Session: ${sessionId}` : 'Claude Code CLI'}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setOutput([])}
            className="px-2 py-1 text-xs bg-gray-800 hover:bg-gray-700 rounded transition-colors"
            title="Clear (Ctrl+L)"
          >
            Clear
          </button>
          <button
            className="px-2 py-1 text-xs bg-gray-800 hover:bg-gray-700 rounded transition-colors"
            title="Copy output"
            onClick={() => {
              const text = output.join('\n');
              navigator.clipboard.writeText(text);
            }}
          >
            Copy
          </button>
          {type === 'system' && (
            <button
              onClick={() => {
                disconnect();
                setOutput([]);
                // Reconnect will happen automatically
              }}
              className="px-2 py-1 text-xs bg-gray-800 hover:bg-gray-700 rounded transition-colors"
              title="Restart terminal"
            >
              Restart
            </button>
          )}
          {type === 'claude' && (
            <button
              onClick={() => {
                if (history.length > 0) {
                  setOutput(prev => [...prev, '', '--- Command History ---']);
                  history.slice(-10).forEach((cmd, index) => {
                    setOutput(prev => [...prev, `${index + 1}. ${cmd}`]);
                  });
                  setOutput(prev => [...prev, '---', '']);
                } else {
                  setOutput(prev => [...prev, '', 'No command history yet.', '']);
                }
              }}
              className="px-2 py-1 text-xs bg-gray-800 hover:bg-gray-700 rounded transition-colors"
              title="Show history"
            >
              History
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TerminalView;