import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";

const execAsync = promisify(exec);

export interface GitRemote {
  name: string;
  url: string;
  type: "fetch" | "push";
}

export interface GitBranch {
  name: string;
  current: boolean;
  remote?: string;
  lastCommit?: {
    hash: string;
    message: string;
    author: string;
    date: Date;
  };
}

export interface GitConfig {
  // Repository Info
  repository: {
    path: string;
    name: string;
    isGitRepo: boolean;
    isBare: boolean;
    workingDirectory: string;
  };

  // Remote Configuration
  remotes: GitRemote[];

  // Branch Information
  branches: {
    current: string;
    all: GitBranch[];
    defaultBranch: string;
  };

  // User Configuration
  user: {
    name: string;
    email: string;
  };

  // Repository Status
  status: {
    clean: boolean;
    ahead: number;
    behind: number;
    staged: number;
    modified: number;
    untracked: number;
  };

  // Git Configuration
  config: {
    core: Record<string, string>;
    remote: Record<string, Record<string, string>>;
    branch: Record<string, Record<string, string>>;
    user: Record<string, string>;
  };

  // Metadata
  metadata: {
    lastFetch: Date | null;
    gitVersion: string;
    syncedAt: Date;
  };
}

export class GitConfigService {
  private projectPath: string;

  constructor(projectPath?: string) {
    this.projectPath = projectPath || process.cwd();
  }

  /**
   * Get complete Git configuration
   */
  async getGitConfig(): Promise<GitConfig> {
    const isGitRepo = await this.isGitRepository();

    if (!isGitRepo) {
      throw new Error("Not a git repository");
    }

    const [repository, remotes, branches, user, status, config, gitVersion] =
      await Promise.all([
        this.getRepositoryInfo(),
        this.getRemotes(),
        this.getBranches(),
        this.getUserConfig(),
        this.getStatus(),
        this.getFullConfig(),
        this.getGitVersion(),
      ]);

    return {
      repository,
      remotes,
      branches,
      user,
      status,
      config,
      metadata: {
        lastFetch: await this.getLastFetchTime(),
        gitVersion,
        syncedAt: new Date(),
      },
    };
  }

  /**
   * Check if directory is a Git repository
   */
  private async isGitRepository(): Promise<boolean> {
    try {
      await execAsync("git rev-parse --git-dir", { cwd: this.projectPath });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get repository information
   */
  private async getRepositoryInfo() {
    const { stdout: gitDir } = await execAsync("git rev-parse --git-dir", {
      cwd: this.projectPath,
    });

    const { stdout: topLevel } = await execAsync(
      "git rev-parse --show-toplevel",
      {
        cwd: this.projectPath,
      },
    );

    const { stdout: isBare } = await execAsync(
      "git rev-parse --is-bare-repository",
      {
        cwd: this.projectPath,
      },
    );

    const repoPath = topLevel.trim();
    const repoName = path.basename(repoPath);

    return {
      path: repoPath,
      name: repoName,
      isGitRepo: true,
      isBare: isBare.trim() === "true",
      workingDirectory: gitDir.trim(),
    };
  }

  /**
   * Get all remotes
   */
  private async getRemotes(): Promise<GitRemote[]> {
    try {
      const { stdout } = await execAsync("git remote -v", {
        cwd: this.projectPath,
      });

      const lines = stdout
        .trim()
        .split("\n")
        .filter((line) => line);
      const remotes: GitRemote[] = [];

      for (const line of lines) {
        const [name, url, type] = line.split(/\s+/);
        if (name && url) {
          remotes.push({
            name,
            url,
            type: type?.includes("push") ? "push" : "fetch",
          });
        }
      }

      return remotes;
    } catch {
      return [];
    }
  }

  /**
   * Get branch information
   */
  private async getBranches() {
    // Get current branch
    const { stdout: currentBranch } = await execAsync(
      "git branch --show-current",
      {
        cwd: this.projectPath,
      },
    );

    // Get all branches with their details
    const { stdout: branchList } = await execAsync(
      'git for-each-ref --format="%(refname:short)|%(upstream:short)|%(committerdate:iso)|%(subject)|%(authorname)" refs/heads/',
      { cwd: this.projectPath },
    );

    const branches: GitBranch[] = [];
    const lines = branchList
      .trim()
      .split("\n")
      .filter((line) => line);

    for (const line of lines) {
      const [name, remote, date, message, author] = line.split("|");

      // Get last commit for this branch
      let lastCommit;
      try {
        const { stdout: hash } = await execAsync(`git rev-parse ${name}`, {
          cwd: this.projectPath,
        });

        lastCommit = {
          hash: hash.trim().substring(0, 7),
          message: message || "",
          author: author || "",
          date: date ? new Date(date) : new Date(),
        };
      } catch {
        lastCommit = undefined;
      }

      branches.push({
        name,
        current: name === currentBranch.trim(),
        remote: remote || undefined,
        lastCommit,
      });
    }

    // Get default branch
    let defaultBranch = "main";
    try {
      const { stdout } = await execAsync(
        "git symbolic-ref refs/remotes/origin/HEAD",
        { cwd: this.projectPath },
      );
      defaultBranch = stdout.trim().replace("refs/remotes/origin/", "");
    } catch {
      // Try common defaults
      if (branches.find((b) => b.name === "main")) {
        defaultBranch = "main";
      } else if (branches.find((b) => b.name === "master")) {
        defaultBranch = "master";
      }
    }

    return {
      current: currentBranch.trim(),
      all: branches,
      defaultBranch,
    };
  }

  /**
   * Get user configuration
   */
  private async getUserConfig() {
    try {
      const { stdout: name } = await execAsync("git config user.name", {
        cwd: this.projectPath,
      });
      const { stdout: email } = await execAsync("git config user.email", {
        cwd: this.projectPath,
      });

      return {
        name: name.trim(),
        email: email.trim(),
      };
    } catch {
      return {
        name: "",
        email: "",
      };
    }
  }

  /**
   * Get repository status
   */
  private async getStatus() {
    try {
      const { stdout: statusOutput } = await execAsync(
        "git status --porcelain",
        {
          cwd: this.projectPath,
        },
      );

      const lines = statusOutput
        .trim()
        .split("\n")
        .filter((line) => line);

      let staged = 0;
      let modified = 0;
      let untracked = 0;

      for (const line of lines) {
        const status = line.substring(0, 2);
        if (status[0] !== " " && status[0] !== "?") staged++;
        if (status[1] !== " " && status[1] !== "?") modified++;
        if (status[0] === "?") untracked++;
      }

      // Get ahead/behind info
      let ahead = 0;
      let behind = 0;
      try {
        const { stdout: currentBranch } = await execAsync(
          "git branch --show-current",
          {
            cwd: this.projectPath,
          },
        );

        const { stdout: revList } = await execAsync(
          `git rev-list --left-right --count origin/${currentBranch.trim()}...HEAD`,
          { cwd: this.projectPath },
        );

        const [behindStr, aheadStr] = revList.trim().split("\t");
        behind = parseInt(behindStr) || 0;
        ahead = parseInt(aheadStr) || 0;
      } catch {
        // Branch might not have upstream
      }

      return {
        clean: lines.length === 0,
        ahead,
        behind,
        staged,
        modified,
        untracked,
      };
    } catch {
      return {
        clean: true,
        ahead: 0,
        behind: 0,
        staged: 0,
        modified: 0,
        untracked: 0,
      };
    }
  }

  /**
   * Get full Git configuration
   */
  private async getFullConfig() {
    try {
      const { stdout } = await execAsync("git config --list", {
        cwd: this.projectPath,
      });

      const config: GitConfig["config"] = {
        core: {},
        remote: {},
        branch: {},
        user: {},
      };

      const lines = stdout.trim().split("\n");
      for (const line of lines) {
        const [key, value] = line.split("=");
        if (!key || !value) continue;

        const parts = key.split(".");
        if (parts[0] === "core") {
          config.core[parts.slice(1).join(".")] = value;
        } else if (parts[0] === "remote") {
          const remoteName = parts[1];
          if (!config.remote[remoteName]) {
            config.remote[remoteName] = {};
          }
          config.remote[remoteName][parts.slice(2).join(".")] = value;
        } else if (parts[0] === "branch") {
          const branchName = parts[1];
          if (!config.branch[branchName]) {
            config.branch[branchName] = {};
          }
          config.branch[branchName][parts.slice(2).join(".")] = value;
        } else if (parts[0] === "user") {
          config.user[parts.slice(1).join(".")] = value;
        }
      }

      return config;
    } catch {
      return {
        core: {},
        remote: {},
        branch: {},
        user: {},
      };
    }
  }

  /**
   * Get last fetch time
   */
  private async getLastFetchTime(): Promise<Date | null> {
    try {
      const gitDir = path.join(this.projectPath, ".git");
      const fetchHead = path.join(gitDir, "FETCH_HEAD");

      const stats = await fs.stat(fetchHead);
      return stats.mtime;
    } catch {
      return null;
    }
  }

  /**
   * Get Git version
   */
  private async getGitVersion(): Promise<string> {
    try {
      const { stdout } = await execAsync("git --version");
      return stdout.trim().replace("git version ", "");
    } catch {
      return "unknown";
    }
  }

  /**
   * Execute Git commands
   */
  async executeCommand(
    command: string,
  ): Promise<{ success: boolean; output: string; error?: string }> {
    try {
      const { stdout, stderr } = await execAsync(`git ${command}`, {
        cwd: this.projectPath,
      });

      return {
        success: true,
        output: stdout || stderr,
      };
    } catch (error: any) {
      return {
        success: false,
        output: "",
        error: error.message || "Command failed",
      };
    }
  }

  /**
   * Fetch from remote
   */
  async fetch(remote: string = "origin"): Promise<boolean> {
    const result = await this.executeCommand(`fetch ${remote}`);
    return result.success;
  }

  /**
   * Pull from remote
   */
  async pull(branch?: string): Promise<boolean> {
    const command = branch ? `pull origin ${branch}` : "pull";
    const result = await this.executeCommand(command);
    return result.success;
  }

  /**
   * Checkout branch
   */
  async checkout(branch: string): Promise<boolean> {
    const result = await this.executeCommand(`checkout ${branch}`);
    return result.success;
  }
}
