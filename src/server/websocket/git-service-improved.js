const EventEmitter = require("events");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const util = require("util");

const execAsync = util.promisify(exec);

/**
 * Improved Git Service with better memory management and performance
 */
class ImprovedGitService extends EventEmitter {
  constructor() {
    super();

    // Set max listeners to prevent memory leaks
    this.setMaxListeners(10);

    // Project monitors with automatic cleanup
    this.projectMonitors = new Map();
    this.fileWatchers = new Map();

    // Cache with TTL
    this.statusCache = new Map();
    this.CACHE_TTL = 5000; // 5 seconds

    // Buffer management
    this.maxBufferSize = 1024 * 1024; // 1MB max buffer per command

    // Connection pool
    this.activeConnections = new Map();
    this.maxConnectionsPerProject = 5;

    // Cleanup interval
    this.startCleanupInterval();
  }

  /**
   * Start periodic cleanup to prevent memory leaks
   */
  startCleanupInterval() {
    setInterval(() => {
      this.cleanupStaleData();
    }, 60000); // Every minute
  }

  /**
   * Clean up stale data and connections
   */
  cleanupStaleData() {
    const now = Date.now();

    // Clean expired cache
    for (const [key, value] of this.statusCache.entries()) {
      if (now - value.timestamp > this.CACHE_TTL * 2) {
        this.statusCache.delete(key);
      }
    }

    // Clean inactive connections
    for (const [projectId, connections] of this.activeConnections.entries()) {
      const activeConns = Array.from(connections).filter(
        (ws) => ws.readyState === ws.OPEN || ws.readyState === ws.CONNECTING,
      );

      if (activeConns.length === 0) {
        this.activeConnections.delete(projectId);
        this.stopMonitoring(projectId);
      } else {
        this.activeConnections.set(projectId, new Set(activeConns));
      }
    }

    // Log cleanup stats
    console.log("[Git Service] Cleanup completed:", {
      cacheSize: this.statusCache.size,
      activeProjects: this.activeConnections.size,
      watchers: this.fileWatchers.size,
    });
  }

  /**
   * Register WebSocket connection with connection limit
   */
  registerConnection(projectId, ws) {
    if (!this.activeConnections.has(projectId)) {
      this.activeConnections.set(projectId, new Set());
    }

    const connections = this.activeConnections.get(projectId);

    // Enforce connection limit
    if (connections.size >= this.maxConnectionsPerProject) {
      const oldestConn = connections.values().next().value;
      if (oldestConn) {
        oldestConn.close(1000, "Connection limit exceeded");
        connections.delete(oldestConn);
      }
    }

    connections.add(ws);

    // Handle disconnect
    ws.on("close", () => {
      connections.delete(ws);
      if (connections.size === 0) {
        this.stopMonitoring(projectId);
      }
    });
  }

  /**
   * Start monitoring project with file system watcher (not polling)
   */
  startMonitoring(projectId, projectPath) {
    // Check if already monitoring
    if (this.fileWatchers.has(projectId)) {
      return;
    }

    const gitPath = path.join(projectPath, ".git");

    // Check if .git directory exists
    if (!fs.existsSync(gitPath)) {
      console.warn(`[Git Service] No .git directory found at ${projectPath}`);
      return;
    }

    try {
      // Watch specific git files for changes
      const filesToWatch = ["HEAD", "index", "refs/heads"];
      const watchers = [];

      for (const file of filesToWatch) {
        const filePath = path.join(gitPath, file);
        if (fs.existsSync(filePath)) {
          const watcher = fs.watch(
            filePath,
            { recursive: file === "refs/heads" },
            (eventType) => {
              if (eventType === "change") {
                this.handleGitChange(projectId, projectPath);
              }
            },
          );
          watchers.push(watcher);
        }
      }

      this.fileWatchers.set(projectId, watchers);
      console.log(`[Git Service] Started monitoring project ${projectId}`);

      // Get initial status
      this.getGitStatus(projectId, projectPath);
    } catch (error) {
      console.error(`[Git Service] Failed to start monitoring:`, error);
    }
  }

  /**
   * Stop monitoring project
   */
  stopMonitoring(projectId) {
    const watchers = this.fileWatchers.get(projectId);
    if (watchers) {
      watchers.forEach((watcher) => watcher.close());
      this.fileWatchers.delete(projectId);
      console.log(`[Git Service] Stopped monitoring project ${projectId}`);
    }

    // Clear cache
    this.statusCache.delete(projectId);
  }

  /**
   * Handle git changes with debouncing
   */
  handleGitChange = this.debounce((projectId, projectPath) => {
    this.getGitStatus(projectId, projectPath);
  }, 1000);

  /**
   * Get git status with caching
   */
  async getGitStatus(projectId, projectPath) {
    // Check cache first
    const cached = this.statusCache.get(projectId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      this.broadcastStatus(projectId, cached.data);
      return cached.data;
    }

    try {
      // Execute git commands with limited buffer
      const [status, branches, currentBranch] = await Promise.all([
        this.execGitCommand("status --porcelain", projectPath),
        this.execGitCommand('branch --format="%(refname:short)"', projectPath),
        this.execGitCommand("rev-parse --abbrev-ref HEAD", projectPath),
      ]);

      const gitStatus = {
        modified: [],
        added: [],
        deleted: [],
        untracked: [],
        currentBranch: currentBranch.trim(),
        branches: branches.split("\n").filter((b) => b.trim()),
      };

      // Parse status
      const lines = status.split("\n").filter((line) => line.trim());
      for (const line of lines) {
        const statusCode = line.substring(0, 2);
        const file = line.substring(3);

        if (statusCode.includes("M")) gitStatus.modified.push(file);
        else if (statusCode.includes("A")) gitStatus.added.push(file);
        else if (statusCode.includes("D")) gitStatus.deleted.push(file);
        else if (statusCode.includes("?")) gitStatus.untracked.push(file);
      }

      // Update cache
      this.statusCache.set(projectId, {
        data: gitStatus,
        timestamp: Date.now(),
      });

      // Broadcast to connected clients
      this.broadcastStatus(projectId, gitStatus);

      return gitStatus;
    } catch (error) {
      console.error(`[Git Service] Failed to get status:`, error.message);
      return null;
    }
  }

  /**
   * Execute git command with timeout and buffer limit
   */
  async execGitCommand(command, cwd) {
    try {
      const { stdout, stderr } = await execAsync(`git ${command}`, {
        cwd,
        maxBuffer: this.maxBufferSize,
        timeout: 5000, // 5 second timeout
        encoding: "utf8",
      });

      if (stderr && !stderr.includes("warning")) {
        console.warn(`[Git Service] Git stderr: ${stderr}`);
      }

      return stdout;
    } catch (error) {
      throw new Error(`Git command failed: ${error.message}`);
    }
  }

  /**
   * Broadcast status to all connected clients for a project
   */
  broadcastStatus(projectId, status) {
    const connections = this.activeConnections.get(projectId);
    if (!connections || connections.size === 0) return;

    const message = JSON.stringify({
      type: "git-status",
      projectId,
      status,
      timestamp: Date.now(),
    });

    for (const ws of connections) {
      if (ws.readyState === ws.OPEN) {
        ws.send(message);
      }
    }
  }

  /**
   * Debounce helper
   */
  debounce(func, wait) {
    const timers = new Map();
    return function (...args) {
      const key = args[0]; // Use first argument as key
      clearTimeout(timers.get(key));
      timers.set(
        key,
        setTimeout(() => {
          func.apply(this, args);
          timers.delete(key);
        }, wait),
      );
    };
  }

  /**
   * Cleanup all resources
   */
  destroy() {
    // Stop all file watchers
    for (const watchers of this.fileWatchers.values()) {
      watchers.forEach((w) => w.close());
    }
    this.fileWatchers.clear();

    // Close all connections
    for (const connections of this.activeConnections.values()) {
      for (const ws of connections) {
        ws.close(1001, "Service shutting down");
      }
    }
    this.activeConnections.clear();

    // Clear cache
    this.statusCache.clear();

    // Remove all listeners
    this.removeAllListeners();

    console.log("[Git Service] Cleanup completed");
  }
}

module.exports = ImprovedGitService;
