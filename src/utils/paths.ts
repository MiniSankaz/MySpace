import path from "path";
import os from "os";
import { config } from "@/config/app.config";

/**
 * Get storage paths for the application
 */
export const getStoragePaths = () => {
  const cfg = config();

  return {
    terminal: cfg.storage.basePath,
    temp: cfg.storage.tempPath,
    logs: cfg.storage.logsPath,
    cache: cfg.storage.cachePath,
  };
};

/**
 * Get system-specific shell paths based on platform
 */
export const getSystemPaths = () => {
  const platform = os.platform();

  if (platform === "win32") {
    return {
      shell: process.env.COMSPEC || "cmd.exe",
      powershell: process.env.POWERSHELL_PATH || "powershell.exe",
      git: process.env.GIT_PATH || "git.exe",
    };
  }

  return {
    shell: process.env.SHELL || "/bin/bash",
    zsh: "/bin/zsh",
    bash: "/bin/bash",
    git: "/usr/bin/git",
  };
};

/**
 * Generate a temporary file path with unique name
 */
export const getTempFile = (
  prefix: string = "temp",
  suffix: string = ".tmp",
): string => {
  const tempDir = config().storage.tempPath;
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  return path.join(tempDir, `${prefix}_${timestamp}_${random}${suffix}`);
};

/**
 * Get project-specific paths
 */
export const getProjectPaths = (projectId: string) => {
  const basePath = config().storage.basePath;

  return {
    root: path.join(basePath, "projects", projectId),
    sessions: path.join(basePath, "projects", projectId, "sessions"),
    logs: path.join(basePath, "projects", projectId, "logs"),
    config: path.join(basePath, "projects", projectId, "config"),
  };
};

/**
 * Normalize path for cross-platform compatibility
 */
export const normalizePath = (inputPath: string): string => {
  // Convert Windows backslashes to forward slashes
  let normalized = inputPath.replace(/\\/g, "/");

  // Remove duplicate slashes
  normalized = normalized.replace(/\/+/g, "/");

  // Resolve relative paths
  if (!path.isAbsolute(normalized)) {
    normalized = path.resolve(normalized);
  }

  return normalized;
};

/**
 * Check if a path is safe (not accessing system directories)
 */
export const isSafePath = (inputPath: string): boolean => {
  const normalized = normalizePath(inputPath);
  const resolved = path.resolve(normalized);

  // Dangerous system paths to block
  const dangerousPaths = [
    "/etc",
    "/sys",
    "/proc",
    "/dev",
    "/boot",
    "/root",
    "C:\\Windows",
    "C:\\Program Files",
    "C:\\Program Files (x86)",
  ];

  for (const dangerous of dangerousPaths) {
    if (resolved.startsWith(dangerous)) {
      return false;
    }
  }

  // Check if path contains traversal attempts
  if (resolved.includes("..")) {
    return false;
  }

  return true;
};

/**
 * Get user home directory
 */
export const getUserHome = (): string => {
  return os.homedir();
};

/**
 * Get application data directory
 */
export const getAppDataDir = (appName: string = "portfolio"): string => {
  const platform = os.platform();

  if (platform === "win32") {
    return path.join(process.env.APPDATA || getUserHome(), appName);
  } else if (platform === "darwin") {
    return path.join(getUserHome(), "Library", "Application Support", appName);
  } else {
    return path.join(getUserHome(), `.${appName}`);
  }
};
