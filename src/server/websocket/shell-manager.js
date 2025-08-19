const pty = require("node-pty");
const fs = require("fs");
const os = require("os");
const { exec } = require("child_process");
const util = require("util");

const execAsync = util.promisify(exec);

/**
 * Reliable Shell Manager with verification and fallback
 */
class ShellManager {
  constructor() {
    this.availableShells = [];
    this.shellCapabilities = new Map();
    this.defaultShell = null;
    this.initialized = false;
  }

  /**
   * Initialize and detect available shells
   */
  async initialize() {
    if (this.initialized) return;

    console.log("[ShellManager] Initializing shell detection...");
    await this.detectAvailableShells();
    this.initialized = true;

    console.log("[ShellManager] Available shells:", this.availableShells);
    console.log("[ShellManager] Default shell:", this.defaultShell);
  }

  /**
   * Get platform-specific shell candidates
   */
  getPlatformShells() {
    const platform = os.platform();

    if (platform === "win32") {
      return [
        process.env.COMSPEC || "C:\\Windows\\System32\\cmd.exe",
        "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
        "powershell.exe",
        "cmd.exe",
      ];
    } else if (platform === "darwin") {
      return [
        process.env.SHELL || "/bin/zsh",
        "/bin/zsh",
        "/bin/bash",
        "/usr/bin/bash",
        "/bin/sh",
      ];
    } else {
      // Linux/Unix
      return [
        process.env.SHELL || "/bin/bash",
        "/bin/bash",
        "/usr/bin/bash",
        "/bin/sh",
        "/usr/bin/sh",
        "/bin/dash",
        "/bin/ash",
      ];
    }
  }

  /**
   * Detect available shells on the system
   */
  async detectAvailableShells() {
    const candidates = this.getPlatformShells();
    this.availableShells = [];

    for (const shell of candidates) {
      const result = await this.testShell(shell);
      if (result.available) {
        this.availableShells.push(shell);
        this.shellCapabilities.set(shell, result.capabilities);

        if (!this.defaultShell) {
          this.defaultShell = shell;
        }
      }
    }

    // If no shells found, try emergency fallback
    if (this.availableShells.length === 0) {
      console.error(
        "[ShellManager] No shells detected, trying emergency fallback...",
      );
      await this.tryEmergencyFallback();
    }
  }

  /**
   * Test if a shell is available and working
   */
  async testShell(shellPath) {
    const result = {
      available: false,
      capabilities: {
        interactive: false,
        color: false,
        unicode: false,
      },
    };

    // First check if file exists
    try {
      if (!fs.existsSync(shellPath)) {
        return result;
      }
    } catch (error) {
      return result;
    }

    // Try to execute a simple command
    try {
      const testCommand =
        os.platform() === "win32"
          ? `"${shellPath}" /c echo test`
          : `"${shellPath}" -c "echo test"`;

      const { stdout } = await execAsync(testCommand, {
        timeout: process.env.PORT || 3000,
        encoding: "utf8",
      });

      if (stdout.includes("test")) {
        result.available = true;

        // Test additional capabilities
        result.capabilities.interactive = true;
        result.capabilities.color = !os.platform().includes("win");
        result.capabilities.unicode = true;
      }
    } catch (error) {
      console.warn(
        `[ShellManager] Shell ${shellPath} test failed:`,
        error.message,
      );
    }

    return result;
  }

  /**
   * Try emergency fallback options
   */
  async tryEmergencyFallback() {
    // Try to find any executable shell using 'which' or 'where'
    const searchCommand = os.platform() === "win32" ? "where" : "which";
    const shellsToFind = ["sh", "bash", "zsh", "dash", "cmd"];

    for (const shellName of shellsToFind) {
      try {
        const { stdout } = await execAsync(`${searchCommand} ${shellName}`, {
          timeout: process.env.PORT || 3000,
          encoding: "utf8",
        });

        const shellPath = stdout.trim().split("\n")[0];
        if (shellPath) {
          const result = await this.testShell(shellPath);
          if (result.available) {
            this.availableShells.push(shellPath);
            this.shellCapabilities.set(shellPath, result.capabilities);

            if (!this.defaultShell) {
              this.defaultShell = shellPath;
            }

            console.log(
              `[ShellManager] Found emergency fallback: ${shellPath}`,
            );
            break;
          }
        }
      } catch (error) {
        // Continue searching
      }
    }
  }

  /**
   * Spawn a shell with proper verification
   */
  async spawnShell(options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (this.availableShells.length === 0) {
      throw new Error("No available shells found on system");
    }

    const {
      preferredShell = this.defaultShell,
      cols = 80,
      rows = 30,
      cwd = process.cwd(),
      env = process.env,
    } = options;

    // Try preferred shell first
    const shellsToTry = [preferredShell, ...this.availableShells];
    let lastError = null;

    for (const shell of shellsToTry) {
      if (!shell) continue;

      try {
        console.log(`[ShellManager] Attempting to spawn: ${shell}`);

        // Prepare shell arguments
        const shellArgs = this.getShellArgs(shell);

        // Spawn the shell
        const shellProcess = pty.spawn(shell, shellArgs, {
          name: "xterm-256color",
          cols,
          rows,
          cwd,
          env: this.prepareEnvironment(env, shell),
        });

        // Verify the shell is responsive
        const isHealthy = await this.verifyShellHealth(shellProcess);
        if (isHealthy) {
          console.log(`[ShellManager] Successfully spawned: ${shell}`);
          return {
            process: shellProcess,
            shell,
            capabilities: this.shellCapabilities.get(shell),
          };
        } else {
          shellProcess.kill();
          throw new Error("Shell not responsive");
        }
      } catch (error) {
        lastError = error;
        console.warn(`[ShellManager] Failed to spawn ${shell}:`, error.message);
        continue;
      }
    }

    // All shells failed
    throw new Error(
      `Failed to spawn any shell. Last error: ${lastError?.message}`,
    );
  }

  /**
   * Get appropriate shell arguments
   */
  getShellArgs(shell) {
    if (os.platform() === "win32") {
      return [];
    }

    // For Unix-like systems, use login shell
    if (shell.includes("bash") || shell.includes("zsh")) {
      return ["-l"];
    }

    return [];
  }

  /**
   * Prepare environment variables for shell
   */
  prepareEnvironment(baseEnv, shell) {
    const env = { ...baseEnv };

    // Ensure critical environment variables
    if (!env.PATH) {
      env.PATH = process.env.PATH || "/usr/local/bin:/usr/bin:/bin";
    }

    if (!env.TERM) {
      env.TERM = "xterm-256color";
    }

    if (!env.LANG) {
      env.LANG = "en_US.UTF-8";
    }

    // Shell-specific environment
    if (shell.includes("zsh")) {
      env.SHELL = shell;
      env.ZSH_DISABLE_COMPFIX = "true";
    } else if (shell.includes("bash")) {
      env.SHELL = shell;
    }

    return env;
  }

  /**
   * Verify shell is healthy and responsive
   */
  async verifyShellHealth(shellProcess) {
    return new Promise((resolve) => {
      let received = false;
      const timeout = setTimeout(() => {
        if (!received) {
          resolve(false);
        }
      }, 2000);

      // Listen for any output
      const handler = (data) => {
        received = true;
        clearTimeout(timeout);
        shellProcess.removeListener("data", handler);
        resolve(true);
      };

      shellProcess.on("data", handler);

      // Send a simple echo command
      shellProcess.write('echo "shell_ready"\r\n');
    });
  }

  /**
   * Get shell information
   */
  getShellInfo() {
    return {
      available: this.availableShells,
      default: this.defaultShell,
      capabilities: Object.fromEntries(this.shellCapabilities),
      platform: os.platform(),
    };
  }
}

// Singleton instance
let shellManagerInstance = null;

function getShellManager() {
  if (!shellManagerInstance) {
    shellManagerInstance = new ShellManager();
  }
  return shellManagerInstance;
}

module.exports = {
  ShellManager,
  getShellManager,
};
