"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  lazy,
  Suspense,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Terminal,
  Plus,
  X,
  AlertCircle,
  Loader2,
  Grid,
  Columns,
  Rows,
  Square,
  Command,
} from "lucide-react";
import { Project } from "../../types";

// Lazy load XTermViewV3 for better performance
const XTermViewV3 = lazy(() => import("./XTermViewV3"));

// Configuration - ใช้ API version ไหน
const USE_NEW_API =
  process.env.NEXT_PUBLIC_USE_NEW_TERMINAL_API === "true" || true; // Default to new API
const API_BASE = USE_NEW_API ? "/api/terminal-v2" : "/api/terminal";

// Layout configurations
const LAYOUTS = {
  "1x1": { rows: 1, cols: 1, icon: Square, label: "1x1" },
  "1x2": { rows: 1, cols: 2, icon: Columns, label: "1x2" },
  "1x3": { rows: 1, cols: 3, icon: Columns, label: "1x3" },
  "2x1": { rows: 2, cols: 1, icon: Rows, label: "2x1" },
  "2x2": { rows: 2, cols: 2, icon: Grid, label: "2x2" },
  "2x3": { rows: 2, cols: 3, icon: Grid, label: "2x3" },
} as const;

type LayoutType = keyof typeof LAYOUTS;

interface TerminalSession {
  id: string;
  projectId: string;
  type: "terminal";
  mode: "normal" | "claude";
  tabName: string;
  status: "active" | "inactive" | "error";
  isFocused: boolean;
  gridPosition?: number;
}

interface MigrationInfo {
  mode: string;
  usingNewSystem: boolean;
  stats?: {
    migrated: number;
    legacy: number;
    errors: number;
  };
}

interface TerminalContainerV4Props {
  project: Project;
}

const TerminalContainerV4: React.FC<TerminalContainerV4Props> = ({
  project,
}) => {
  const [sessions, setSessions] = useState<TerminalSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [switchingProject, setSwitchingProject] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentLayout, setCurrentLayout] = useState<LayoutType>("1x1");
  const [migrationInfo, setMigrationInfo] = useState<MigrationInfo | null>(
    null,
  );
  const previousProjectIdRef = useRef<string | null>(null);

  // Load sessions
  const loadSessions = useCallback(async (projectId: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE}/list?projectId=${projectId}`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Failed to load sessions: ${response.statusText}`);
      }

      const data = await response.json();

      // Update migration info if available
      if (data.migrationInfo) {
        setMigrationInfo(data.migrationInfo);
        console.log(
          `[Terminal V4] Using ${data.migrationInfo.usingNewSystem ? "NEW" : "LEGACY"} system`,
        );
      }

      setSessions(data.sessions || []);
      console.log(
        `[Terminal V4] Loaded ${data.sessions?.length || 0} sessions`,
      );
    } catch (err) {
      console.error("[Terminal V4] Failed to load sessions:", err);
      setError(err instanceof Error ? err.message : "Failed to load sessions");
    } finally {
      setLoading(false);
    }
  }, []);

  // Create new session
  const createSession = useCallback(
    async (mode: "normal" | "claude" = "normal") => {
      try {
        setLoading(true);
        setError(null);

        console.log(
          `[Terminal V4] Creating ${mode} session for project: ${project.id}`,
        );

        const response = await fetch(`${API_BASE}/create`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: project.id,
            projectPath: project.settings?.path || process.cwd(),
            mode,
          }),
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error(`Failed to create session: ${response.statusText}`);
        }

        const data = await response.json();

        // Update migration info if available
        if (data.migrationInfo) {
          setMigrationInfo(data.migrationInfo);
        }

        if (data.session) {
          setSessions((prev) => [...prev, data.session]);
          console.log(`[Terminal V4] Created session ${data.session.id}`);
        }
      } catch (err) {
        console.error("[Terminal V4] Failed to create session:", err);
        setError(
          err instanceof Error ? err.message : "Failed to create session",
        );
      } finally {
        setLoading(false);
      }
    },
    [project.id, project.settings?.path],
  );

  // Close session
  const closeSession = useCallback(async (sessionId: string) => {
    try {
      const response = await fetch(`${API_BASE}/close/${sessionId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(`Failed to close session: ${response.statusText}`);
      }

      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      console.log(`[Terminal V4] Closed session ${sessionId}`);
    } catch (err) {
      console.error("[Terminal V4] Failed to close session:", err);
      setError(err instanceof Error ? err.message : "Failed to close session");
    }
  }, []);

  // Load sessions on mount and project change
  useEffect(() => {
    if (project.id !== previousProjectIdRef.current) {
      console.log(
        `[Terminal V4] Project changed: ${previousProjectIdRef.current} -> ${project.id}`,
      );
      previousProjectIdRef.current = project.id;
      setSwitchingProject(true);

      // Load sessions for new project
      loadSessions(project.id).finally(() => {
        setSwitchingProject(false);
      });
    }
  }, [project.id, loadSessions]);

  // Get grid positions for layout
  const getGridPosition = (index: number, layout: LayoutType) => {
    const { rows, cols } = LAYOUTS[layout];
    const row = Math.floor(index / cols);
    const col = index % cols;
    return { row, col };
  };

  // Change layout
  const changeLayout = (layout: LayoutType) => {
    setCurrentLayout(layout);
    const maxSessions = LAYOUTS[layout].rows * LAYOUTS[layout].cols;

    // Adjust sessions if needed
    if (sessions.length > maxSessions) {
      // Close extra sessions
      const toClose = sessions.slice(maxSessions);
      toClose.forEach((s) => closeSession(s.id));
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-950">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800/50 bg-gray-900/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Terminal className="w-5 h-5 text-cyan-400" />
          <h2 className="text-lg font-semibold text-gray-100">Terminal V4</h2>
          {migrationInfo && (
            <span
              className={`text-xs px-2 py-1 rounded ${
                migrationInfo.usingNewSystem
                  ? "bg-green-500/20 text-green-400"
                  : "bg-yellow-500/20 text-yellow-400"
              }`}
            >
              {migrationInfo.mode.toUpperCase()}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Layout selector */}
          <div className="flex items-center gap-1 p-1 bg-gray-800/50 rounded-lg">
            {Object.entries(LAYOUTS).map(([key, config]) => {
              const Icon = config.icon;
              return (
                <button
                  key={key}
                  onClick={() => changeLayout(key as LayoutType)}
                  className={`p-2 rounded transition-all ${
                    currentLayout === key
                      ? "bg-cyan-500/20 text-cyan-400"
                      : "text-gray-400 hover:text-gray-200 hover:bg-gray-700/50"
                  }`}
                  title={config.label}
                >
                  <Icon className="w-4 h-4" />
                </button>
              );
            })}
          </div>

          {/* Add buttons */}
          <button
            onClick={() => createSession("normal")}
            disabled={
              loading ||
              sessions.length >=
                LAYOUTS[currentLayout].rows * LAYOUTS[currentLayout].cols
            }
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-800/50 hover:bg-gray-700/50 
                     text-gray-300 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm">Terminal</span>
          </button>

          <button
            onClick={() => createSession("claude")}
            disabled={
              loading ||
              sessions.length >=
                LAYOUTS[currentLayout].rows * LAYOUTS[currentLayout].cols
            }
            className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 
                     text-purple-400 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Command className="w-4 h-4" />
            <span className="text-sm">Claude</span>
          </button>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border-b border-red-500/20">
          <AlertCircle className="w-4 h-4 text-red-400" />
          <span className="text-sm text-red-400">{error}</span>
        </div>
      )}

      {/* Terminal grid */}
      <div className="flex-1 relative">
        {switchingProject ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-950/80 backdrop-blur-sm z-50">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
              <span className="text-sm text-gray-400">กำลังสลับโปรเจค...</span>
            </div>
          </div>
        ) : null}

        <div
          className="h-full p-2 grid gap-2"
          style={{
            gridTemplateRows: `repeat(${LAYOUTS[currentLayout].rows}, 1fr)`,
            gridTemplateColumns: `repeat(${LAYOUTS[currentLayout].cols}, 1fr)`,
          }}
        >
          <AnimatePresence mode="popLayout">
            {sessions.map((session, index) => {
              const { row, col } = getGridPosition(index, currentLayout);
              return (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                  className={`relative bg-gray-900 rounded-lg overflow-hidden border ${
                    session.mode === "claude"
                      ? "border-purple-500/30"
                      : "border-gray-800"
                  }`}
                  style={{
                    gridRow: row + 1,
                    gridColumn: col + 1,
                  }}
                >
                  {/* Terminal header */}
                  <div className="flex items-center justify-between px-3 py-2 bg-gray-800/50 border-b border-gray-700/50">
                    <div className="flex items-center gap-2">
                      {session.mode === "claude" ? (
                        <Command className="w-3 h-3 text-purple-400" />
                      ) : (
                        <Terminal className="w-3 h-3 text-cyan-400" />
                      )}
                      <span className="text-xs text-gray-400">
                        {session.tabName}
                      </span>
                    </div>
                    <button
                      onClick={() => closeSession(session.id)}
                      className="p-1 hover:bg-gray-700/50 rounded transition-colors"
                    >
                      <X className="w-3 h-3 text-gray-400" />
                    </button>
                  </div>

                  {/* Terminal content */}
                  <Suspense
                    fallback={
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="w-6 h-6 text-gray-600 animate-spin" />
                      </div>
                    }
                  >
                    <XTermViewV3
                      sessionId={session.id}
                      mode={session.mode}
                      projectId={project.id}
                      projectPath={project.settings?.path}
                      isFocused={session.isFocused}
                    />
                  </Suspense>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Migration stats (debug) */}
      {migrationInfo?.stats && (
        <div className="px-4 py-2 bg-gray-900/50 border-t border-gray-800/50 text-xs text-gray-500">
          Migration Stats:
          {migrationInfo.stats.migrated} migrated,
          {migrationInfo.stats.legacy} legacy,
          {migrationInfo.stats.errors} errors
        </div>
      )}
    </div>
  );
};

export default TerminalContainerV4;
