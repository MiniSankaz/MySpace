import React, { useRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  Terminal,
  X,
  Maximize2,
  Minimize2,
  Plus,
  Copy,
  Trash2,
  Settings,
  Play,
  Pause,
  ChevronUp,
  ChevronDown,
  Loader2,
} from "lucide-react";

interface TerminalSession {
  id: string;
  name: string;
  output: string[];
  isActive: boolean;
}

interface TerminalWindowProps {
  sessionId: string;
  projectId?: string;
  initialCommand?: string;
  height?: number | string;
  theme?: "dark" | "light" | "matrix" | "retro";
  fontSize?: number;
  fontFamily?: string;
  showTabs?: boolean;
  allowMultipleSessions?: boolean;
  onCommand?: (command: string) => void;
  onClose?: () => void;
  className?: string;
  readOnly?: boolean;
  autoScroll?: boolean;
  loading?: boolean;
  connected?: boolean;
}

const TerminalWindow: React.FC<TerminalWindowProps> = ({
  sessionId,
  projectId,
  initialCommand,
  height = 400,
  theme = "dark",
  fontSize = 13,
  fontFamily = "Monaco, Consolas, monospace",
  showTabs = true,
  allowMultipleSessions = true,
  onCommand,
  onClose,
  className,
  readOnly = false,
  autoScroll = true,
  loading = false,
  connected = true,
}) => {
  const [sessions, setSessions] = useState<TerminalSession[]>([
    {
      id: sessionId,
      name: "Terminal 1",
      output: ["Welcome to Terminal v2.0", "$ "],
      isActive: true,
    },
  ]);
  const [currentCommand, setCurrentCommand] = useState("");
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeSession = sessions.find((s) => s.isActive) || sessions[0];

  useEffect(() => {
    if (initialCommand) {
      executeCommand(initialCommand);
    }
  }, [initialCommand]);

  useEffect(() => {
    if (autoScroll && terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [activeSession?.output, autoScroll]);

  const executeCommand = (command: string) => {
    if (!command.trim()) return;

    // Add command to history
    setCommandHistory((prev) => [...prev, command]);
    setHistoryIndex(-1);

    // Add command to output
    const newOutput = [...activeSession.output];
    newOutput[newOutput.length - 1] += command;
    newOutput.push(""); // Add empty line for response

    // Simulate command execution
    setTimeout(() => {
      const response = processCommand(command);
      setSessions((prev) =>
        prev.map((session) =>
          session.id === activeSession.id
            ? { ...session, output: [...newOutput, response, "$ "] }
            : session,
        ),
      );
    }, 100);

    setSessions((prev) =>
      prev.map((session) =>
        session.id === activeSession.id
          ? { ...session, output: newOutput }
          : session,
      ),
    );

    if (onCommand) {
      onCommand(command);
    }

    setCurrentCommand("");
  };

  const processCommand = (command: string): string => {
    // Simulate command processing
    const commands: Record<string, string> = {
      help: "Available commands: help, clear, ls, pwd, echo, date, whoami",
      clear: "CLEAR_TERMINAL",
      ls: "file1.txt  file2.js  folder/  package.json",
      pwd: `/home/user/projects/${projectId || "current"}`,
      date: new Date().toString(),
      whoami: "user",
    };

    if (command.startsWith("echo ")) {
      return command.substring(5);
    }

    if (command === "clear") {
      setSessions((prev) =>
        prev.map((session) =>
          session.id === activeSession.id
            ? { ...session, output: ["$ "] }
            : session,
        ),
      );
      return "";
    }

    return commands[command] || `Command not found: ${command}`;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      executeCommand(currentCommand);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (historyIndex < commandHistory.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setCurrentCommand(commandHistory[commandHistory.length - 1 - newIndex]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setCurrentCommand(commandHistory[commandHistory.length - 1 - newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCurrentCommand("");
      }
    } else if (e.key === "Tab") {
      e.preventDefault();
      // Implement tab completion
    } else if (e.ctrlKey && e.key === "c") {
      e.preventDefault();
      setCurrentCommand("");
    } else if (e.ctrlKey && e.key === "l") {
      e.preventDefault();
      setSessions((prev) =>
        prev.map((session) =>
          session.id === activeSession.id
            ? { ...session, output: ["$ "] }
            : session,
        ),
      );
    }
  };

  const createNewSession = () => {
    const newSession: TerminalSession = {
      id: `session-${Date.now()}`,
      name: `Terminal ${sessions.length + 1}`,
      output: ["Welcome to Terminal v2.0", "$ "],
      isActive: true,
    };

    setSessions((prev) => [
      ...prev.map((s) => ({ ...s, isActive: false })),
      newSession,
    ]);
  };

  const closeSession = (sessionIdToClose: string) => {
    if (sessions.length === 1) {
      if (onClose) onClose();
      return;
    }

    const newSessions = sessions.filter((s) => s.id !== sessionIdToClose);
    if (activeSession.id === sessionIdToClose && newSessions.length > 0) {
      newSessions[0].isActive = true;
    }
    setSessions(newSessions);
  };

  const switchSession = (sessionIdToSwitch: string) => {
    setSessions((prev) =>
      prev.map((s) => ({
        ...s,
        isActive: s.id === sessionIdToSwitch,
      })),
    );
  };

  const copyOutput = () => {
    const text = activeSession.output.join("\n");
    navigator.clipboard.writeText(text);
  };

  const getThemeStyles = () => {
    const themes = {
      dark: {
        bg: "bg-gray-900",
        text: "text-gray-100",
        border: "border-gray-700",
        prompt: "text-green-400",
      },
      light: {
        bg: "bg-white",
        text: "text-gray-900",
        border: "border-gray-300",
        prompt: "text-blue-600",
      },
      matrix: {
        bg: "bg-black",
        text: "text-green-400",
        border: "border-green-600",
        prompt: "text-green-300",
      },
      retro: {
        bg: "bg-amber-900",
        text: "text-amber-100",
        border: "border-amber-700",
        prompt: "text-amber-300",
      },
    };
    return themes[theme];
  };

  const themeStyles = getThemeStyles();

  if (loading) {
    return (
      <div
        className={cn(
          "rounded-lg border flex items-center justify-center",
          themeStyles.bg,
          themeStyles.border,
          className,
        )}
        style={{ height }}
      >
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mb-2 mx-auto" />
          <p className="text-sm">Connecting to terminal...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-lg border flex flex-col",
        themeStyles.bg,
        themeStyles.border,
        isFullscreen && "fixed inset-0 z-50 rounded-none",
        className,
      )}
      style={{ height: isFullscreen ? "100vh" : height }}
    >
      {/* Header */}
      <div
        className={cn(
          "flex items-center justify-between px-3 py-2 border-b",
          themeStyles.border,
        )}
      >
        <div className="flex items-center space-x-2">
          <Terminal className="h-4 w-4" />
          <span className="text-sm font-medium">Terminal</span>
          {!connected && (
            <span className="px-2 py-0.5 text-xs bg-red-600/20 text-red-400 rounded">
              Disconnected
            </span>
          )}
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={copyOutput}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
            title="Copy Output"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-700 rounded transition-colors"
              title="Close Terminal"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      {showTabs && sessions.length > 1 && (
        <div
          className={cn(
            "flex items-center px-2 py-1 border-b space-x-1 overflow-x-auto",
            themeStyles.border,
          )}
        >
          {sessions.map((session) => (
            <button
              key={session.id}
              onClick={() => switchSession(session.id)}
              className={cn(
                "flex items-center space-x-2 px-3 py-1 text-xs rounded transition-colors",
                session.isActive
                  ? "bg-gray-700 text-white"
                  : "hover:bg-gray-800 text-gray-400",
              )}
            >
              <span>{session.name}</span>
              {sessions.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeSession(session.id);
                  }}
                  className="hover:text-red-400"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </button>
          ))}
          {allowMultipleSessions && (
            <button
              onClick={createNewSession}
              className="p-1 hover:bg-gray-700 rounded transition-colors"
              title="New Terminal"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Terminal Output */}
      <div
        ref={terminalRef}
        className={cn("flex-1 overflow-y-auto p-3", themeStyles.text)}
        style={{ fontFamily, fontSize: `${fontSize}px` }}
        onClick={() => inputRef.current?.focus()}
      >
        {activeSession.output.map((line, index) => {
          const isPrompt = line.startsWith("$ ");
          const isLastLine = index === activeSession.output.length - 1;

          if (isLastLine && !readOnly) {
            return (
              <div key={index} className="flex">
                <span className={themeStyles.prompt}>$ </span>
                <input
                  ref={inputRef}
                  type="text"
                  value={currentCommand}
                  onChange={(e) => setCurrentCommand(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex-1 bg-transparent outline-none ml-1"
                  style={{ fontFamily, fontSize: `${fontSize}px` }}
                  autoFocus
                  disabled={!connected}
                />
              </div>
            );
          }

          return (
            <div key={index} className={cn(isPrompt && themeStyles.prompt)}>
              {line}
            </div>
          );
        })}
      </div>

      {/* Status Bar */}
      <div
        className={cn(
          "flex items-center justify-between px-3 py-1 text-xs border-t",
          themeStyles.border,
          "text-gray-500",
        )}
      >
        <span>Session: {activeSession.name}</span>
        <span>{projectId ? `Project: ${projectId}` : "No project"}</span>
      </div>
    </div>
  );
};

export default TerminalWindow;
