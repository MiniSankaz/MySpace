import simpleGit, {
  SimpleGit,
  StatusResult,
  LogResult,
  BranchSummary,
  DiffResult,
} from "simple-git";
import path from "path";
import fs from "fs-extra";
import { logger, createTimer, logError } from "../utils/logger";
import { GitConfig, GitRemote, GitCommit } from "@shared/types";

export interface GitCloneOptions {
  branch?: string;
  depth?: number;
  recursive?: boolean;
  bare?: boolean;
}

export interface GitCommitOptions {
  author?: string;
  email?: string;
  message: string;
  files?: string[];
  amend?: boolean;
}

export interface GitBranchOptions {
  checkout?: boolean;
  force?: boolean;
  track?: boolean;
}

export interface GitMergeOptions {
  noFf?: boolean;
  squash?: boolean;
  strategy?: string;
}

export class GitService {
  private workspaceRoot: string;
  private defaultAuthor: { name: string; email: string };

  constructor() {
    this.workspaceRoot =
      process.env.WORKSPACE_ROOT || path.join(process.cwd(), "workspace");
    this.defaultAuthor = {
      name: process.env.GIT_DEFAULT_AUTHOR_NAME || "Workspace User",
      email: process.env.GIT_DEFAULT_AUTHOR_EMAIL || "workspace@example.com",
    };
  }

  private validatePath(repoPath: string): string {
    const normalizedPath = path.normalize(repoPath);

    if (normalizedPath.includes("..") || normalizedPath.startsWith("/")) {
      throw new Error("Invalid repository path: Path traversal detected");
    }

    const absolutePath = path.resolve(this.workspaceRoot, normalizedPath);

    if (!absolutePath.startsWith(this.workspaceRoot)) {
      throw new Error("Repository path outside workspace root not allowed");
    }

    return absolutePath;
  }

  private getGit(repoPath: string): SimpleGit {
    const absolutePath = this.validatePath(repoPath);
    return simpleGit(absolutePath);
  }

  /**
   * Initialize a new Git repository
   */
  async initRepository(repoPath: string, bare: boolean = false): Promise<void> {
    const timer = createTimer("git-init");

    try {
      const absolutePath = this.validatePath(repoPath);

      // Ensure directory exists
      await fs.ensureDir(absolutePath);

      const git = this.getGit(repoPath);
      await git.init(bare);

      // Set default author if not already configured
      try {
        await git.addConfig(
          "user.name",
          this.defaultAuthor.name,
          false,
          "local",
        );
        await git.addConfig(
          "user.email",
          this.defaultAuthor.email,
          false,
          "local",
        );
      } catch (error) {
        logger.debug("Git config already set or failed to set default author");
      }

      timer.end();
      logger.info(`Git repository initialized: ${repoPath}`);
    } catch (error: any) {
      timer.end();
      logError(error, { repoPath });
      throw new Error(`Failed to initialize Git repository: ${error.message}`);
    }
  }

  /**
   * Clone a remote repository
   */
  async cloneRepository(
    url: string,
    repoPath: string,
    options: GitCloneOptions = {},
  ): Promise<void> {
    const timer = createTimer("git-clone");

    try {
      const absolutePath = this.validatePath(repoPath);

      // Ensure parent directory exists
      await fs.ensureDir(path.dirname(absolutePath));

      const git = simpleGit(path.dirname(absolutePath));

      const cloneOptions: string[] = [];
      if (options.branch) {
        cloneOptions.push("--branch", options.branch);
      }
      if (options.depth) {
        cloneOptions.push("--depth", options.depth.toString());
      }
      if (options.recursive) {
        cloneOptions.push("--recursive");
      }
      if (options.bare) {
        cloneOptions.push("--bare");
      }

      await git.clone(url, path.basename(absolutePath), cloneOptions);

      timer.end();
      logger.info(`Repository cloned: ${url} -> ${repoPath}`);
    } catch (error: any) {
      timer.end();
      logError(error, { url, repoPath, options });
      throw new Error(`Failed to clone repository: ${error.message}`);
    }
  }

  /**
   * Get repository status
   */
  async getStatus(repoPath: string): Promise<StatusResult> {
    const timer = createTimer("git-status");

    try {
      const git = this.getGit(repoPath);
      const status = await git.status();

      timer.end();
      logger.debug(`Got git status for: ${repoPath}`);

      return status;
    } catch (error: any) {
      timer.end();
      logError(error, { repoPath });
      throw new Error(`Failed to get git status: ${error.message}`);
    }
  }

  /**
   * Add files to staging area
   */
  async addFiles(repoPath: string, files: string[] = ["."]): Promise<void> {
    const timer = createTimer("git-add");

    try {
      const git = this.getGit(repoPath);
      await git.add(files);

      timer.end();
      logger.info(`Added files to git: ${repoPath} (${files.join(", ")})`);
    } catch (error: any) {
      timer.end();
      logError(error, { repoPath, files });
      throw new Error(`Failed to add files: ${error.message}`);
    }
  }

  /**
   * Remove files from staging area
   */
  async resetFiles(repoPath: string, files: string[] = []): Promise<void> {
    const timer = createTimer("git-reset");

    try {
      const git = this.getGit(repoPath);

      if (files.length === 0) {
        await git.reset(["HEAD"]);
      } else {
        await git.reset(["HEAD", "--", ...files]);
      }

      timer.end();
      logger.info(`Reset files in git: ${repoPath} (${files.join(", ")})`);
    } catch (error: any) {
      timer.end();
      logError(error, { repoPath, files });
      throw new Error(`Failed to reset files: ${error.message}`);
    }
  }

  /**
   * Commit changes
   */
  async commit(repoPath: string, options: GitCommitOptions): Promise<void> {
    const timer = createTimer("git-commit");

    try {
      const git = this.getGit(repoPath);

      // Add files if specified
      if (options.files && options.files.length > 0) {
        await git.add(options.files);
      }

      // Set author if provided
      if (options.author && options.email) {
        await git.addConfig("user.name", options.author, false, "local");
        await git.addConfig("user.email", options.email, false, "local");
      }

      const commitOptions: string[] = [];
      if (options.amend) {
        commitOptions.push("--amend");
      }

      if (options.amend) {
        await git.commit(options.message, undefined, { "--amend": null });
      } else {
        await git.commit(options.message);
      }

      timer.end();
      logger.info(`Committed changes: ${repoPath} - "${options.message}"`);
    } catch (error: any) {
      timer.end();
      logError(error, { repoPath, options });
      throw new Error(`Failed to commit: ${error.message}`);
    }
  }

  /**
   * Get commit history
   */
  async getLog(
    repoPath: string,
    options: {
      from?: string;
      to?: string;
      maxCount?: number;
      format?: any;
    } = {},
  ): Promise<LogResult> {
    const timer = createTimer("git-log");

    try {
      const git = this.getGit(repoPath);

      const logOptions: any = {};
      if (options.from) logOptions.from = options.from;
      if (options.to) logOptions.to = options.to;
      if (options.maxCount) logOptions.maxCount = options.maxCount;
      if (options.format) logOptions.format = options.format;

      const log = await git.log(logOptions);

      timer.end();
      logger.debug(`Got git log for: ${repoPath} (${log.total} commits)`);

      return log;
    } catch (error: any) {
      timer.end();
      logError(error, { repoPath, options });
      throw new Error(`Failed to get git log: ${error.message}`);
    }
  }

  /**
   * List branches
   */
  async getBranches(repoPath: string): Promise<BranchSummary> {
    const timer = createTimer("git-branches");

    try {
      const git = this.getGit(repoPath);
      const branches = await git.branchLocal();

      timer.end();
      logger.debug(
        `Got branches for: ${repoPath} (${branches.all.length} branches)`,
      );

      return branches;
    } catch (error: any) {
      timer.end();
      logError(error, { repoPath });
      throw new Error(`Failed to get branches: ${error.message}`);
    }
  }

  /**
   * Create a new branch
   */
  async createBranch(
    repoPath: string,
    branchName: string,
    options: GitBranchOptions = {},
  ): Promise<void> {
    const timer = createTimer("git-create-branch");

    try {
      const git = this.getGit(repoPath);

      const branchOptions: string[] = [];
      if (options.force) branchOptions.push("-f");
      if (options.track) branchOptions.push("--track");

      await git.checkoutBranch(branchName, "HEAD");

      if (options.checkout) {
        await git.checkout(branchName);
      }

      timer.end();
      logger.info(`Created branch: ${repoPath} - ${branchName}`);
    } catch (error: any) {
      timer.end();
      logError(error, { repoPath, branchName, options });
      throw new Error(`Failed to create branch: ${error.message}`);
    }
  }

  /**
   * Switch to a branch
   */
  async checkoutBranch(
    repoPath: string,
    branchName: string,
    force: boolean = false,
  ): Promise<void> {
    const timer = createTimer("git-checkout");

    try {
      const git = this.getGit(repoPath);

      const checkoutOptions: string[] = [];
      if (force) checkoutOptions.push("-f");

      await git.checkout(branchName, checkoutOptions);

      timer.end();
      logger.info(`Checked out branch: ${repoPath} - ${branchName}`);
    } catch (error: any) {
      timer.end();
      logError(error, { repoPath, branchName });
      throw new Error(`Failed to checkout branch: ${error.message}`);
    }
  }

  /**
   * Delete a branch
   */
  async deleteBranch(
    repoPath: string,
    branchName: string,
    force: boolean = false,
  ): Promise<void> {
    const timer = createTimer("git-delete-branch");

    try {
      const git = this.getGit(repoPath);

      const deleteOptions: string[] = [];
      if (force) {
        deleteOptions.push("-D");
      } else {
        deleteOptions.push("-d");
      }

      await git.deleteLocalBranch(branchName, force);

      timer.end();
      logger.info(`Deleted branch: ${repoPath} - ${branchName}`);
    } catch (error: any) {
      timer.end();
      logError(error, { repoPath, branchName });
      throw new Error(`Failed to delete branch: ${error.message}`);
    }
  }

  /**
   * Merge branches
   */
  async mergeBranch(
    repoPath: string,
    branchName: string,
    options: GitMergeOptions = {},
  ): Promise<void> {
    const timer = createTimer("git-merge");

    try {
      const git = this.getGit(repoPath);

      const mergeOptions: string[] = [];
      if (options.noFf) mergeOptions.push("--no-ff");
      if (options.squash) mergeOptions.push("--squash");
      if (options.strategy) mergeOptions.push("--strategy", options.strategy);

      await git.merge([branchName, ...mergeOptions]);

      timer.end();
      logger.info(`Merged branch: ${repoPath} - ${branchName}`);
    } catch (error: any) {
      timer.end();
      logError(error, { repoPath, branchName, options });
      throw new Error(`Failed to merge branch: ${error.message}`);
    }
  }

  /**
   * Add remote repository
   */
  async addRemote(
    repoPath: string,
    remoteName: string,
    remoteUrl: string,
  ): Promise<void> {
    const timer = createTimer("git-add-remote");

    try {
      const git = this.getGit(repoPath);
      await git.addRemote(remoteName, remoteUrl);

      timer.end();
      logger.info(`Added remote: ${repoPath} - ${remoteName} (${remoteUrl})`);
    } catch (error: any) {
      timer.end();
      logError(error, { repoPath, remoteName, remoteUrl });
      throw new Error(`Failed to add remote: ${error.message}`);
    }
  }

  /**
   * Remove remote repository
   */
  async removeRemote(repoPath: string, remoteName: string): Promise<void> {
    const timer = createTimer("git-remove-remote");

    try {
      const git = this.getGit(repoPath);
      await git.removeRemote(remoteName);

      timer.end();
      logger.info(`Removed remote: ${repoPath} - ${remoteName}`);
    } catch (error: any) {
      timer.end();
      logError(error, { repoPath, remoteName });
      throw new Error(`Failed to remove remote: ${error.message}`);
    }
  }

  /**
   * Fetch from remote
   */
  async fetch(
    repoPath: string,
    remote: string = "origin",
    branch?: string,
  ): Promise<void> {
    const timer = createTimer("git-fetch");

    try {
      const git = this.getGit(repoPath);

      if (branch) {
        await git.fetch(remote, branch);
      } else {
        await git.fetch(remote);
      }

      timer.end();
      logger.info(
        `Fetched from remote: ${repoPath} - ${remote}${branch ? "/" + branch : ""}`,
      );
    } catch (error: any) {
      timer.end();
      logError(error, { repoPath, remote, branch });
      throw new Error(`Failed to fetch from remote: ${error.message}`);
    }
  }

  /**
   * Pull from remote
   */
  async pull(
    repoPath: string,
    remote: string = "origin",
    branch?: string,
  ): Promise<void> {
    const timer = createTimer("git-pull");

    try {
      const git = this.getGit(repoPath);

      if (branch) {
        await git.pull(remote, branch);
      } else {
        await git.pull();
      }

      timer.end();
      logger.info(
        `Pulled from remote: ${repoPath} - ${remote}${branch ? "/" + branch : ""}`,
      );
    } catch (error: any) {
      timer.end();
      logError(error, { repoPath, remote, branch });
      throw new Error(`Failed to pull from remote: ${error.message}`);
    }
  }

  /**
   * Push to remote
   */
  async push(
    repoPath: string,
    remote: string = "origin",
    branch?: string,
    force: boolean = false,
  ): Promise<void> {
    const timer = createTimer("git-push");

    try {
      const git = this.getGit(repoPath);

      const pushOptions: any = {};
      if (force) pushOptions["--force"] = true;

      if (branch) {
        await git.push(remote, branch, pushOptions);
      } else {
        await git.push(pushOptions);
      }

      timer.end();
      logger.info(
        `Pushed to remote: ${repoPath} - ${remote}${branch ? "/" + branch : ""}`,
      );
    } catch (error: any) {
      timer.end();
      logError(error, { repoPath, remote, branch });
      throw new Error(`Failed to push to remote: ${error.message}`);
    }
  }

  /**
   * Get diff between commits/branches
   */
  async getDiff(repoPath: string, from?: string, to?: string): Promise<string> {
    const timer = createTimer("git-diff");

    try {
      const git = this.getGit(repoPath);

      let diff: string;
      if (from && to) {
        diff = await git.diff([from, to]);
      } else if (from) {
        diff = await git.diff([from]);
      } else {
        diff = await git.diff();
      }

      timer.end();
      logger.debug(`Got git diff for: ${repoPath}`);

      return diff;
    } catch (error: any) {
      timer.end();
      logError(error, { repoPath, from, to });
      throw new Error(`Failed to get diff: ${error.message}`);
    }
  }

  /**
   * Stash changes
   */
  async stash(repoPath: string, message?: string): Promise<void> {
    const timer = createTimer("git-stash");

    try {
      const git = this.getGit(repoPath);

      if (message) {
        await git.stash(["save", message]);
      } else {
        await git.stash();
      }

      timer.end();
      logger.info(
        `Stashed changes: ${repoPath}${message ? " - " + message : ""}`,
      );
    } catch (error: any) {
      timer.end();
      logError(error, { repoPath, message });
      throw new Error(`Failed to stash changes: ${error.message}`);
    }
  }

  /**
   * Apply stashed changes
   */
  async stashPop(repoPath: string): Promise<void> {
    const timer = createTimer("git-stash-pop");

    try {
      const git = this.getGit(repoPath);
      await git.stash(["pop"]);

      timer.end();
      logger.info(`Popped stash: ${repoPath}`);
    } catch (error: any) {
      timer.end();
      logError(error, { repoPath });
      throw new Error(`Failed to pop stash: ${error.message}`);
    }
  }

  /**
   * Get repository configuration
   */
  async getConfig(repoPath: string): Promise<GitConfig> {
    const timer = createTimer("git-config");

    try {
      const git = this.getGit(repoPath);

      // Get current branch
      const status = await git.status();
      const currentBranch = status.current || "main";

      // Get remotes
      const remoteList = await git.getRemotes(true);
      const remotes: GitRemote[] = remoteList.map((remote) => ({
        name: remote.name,
        url: remote.refs.fetch || remote.refs.push || "",
        type: "both" as const,
      }));

      // Get last commit
      let lastCommit: GitCommit | undefined;
      try {
        const log = await git.log({ maxCount: 1 });
        if (log.latest) {
          lastCommit = {
            hash: log.latest.hash,
            author: log.latest.author_name,
            email: log.latest.author_email,
            message: log.latest.message,
            timestamp: new Date(log.latest.date),
          };
        }
      } catch (error) {
        logger.debug("No commits found in repository");
      }

      const config: GitConfig = {
        repositoryUrl: remotes.find((r) => r.name === "origin")?.url,
        branch: currentBranch,
        remotes,
        lastCommit,
        isDirty: !status.isClean(),
      };

      timer.end();
      logger.debug(`Got git config for: ${repoPath}`);

      return config;
    } catch (error: any) {
      timer.end();
      logError(error, { repoPath });
      throw new Error(`Failed to get git config: ${error.message}`);
    }
  }

  /**
   * Check if path is a Git repository
   */
  async isRepository(repoPath: string): Promise<boolean> {
    try {
      const absolutePath = this.validatePath(repoPath);
      const gitDir = path.join(absolutePath, ".git");
      return await fs.pathExists(gitDir);
    } catch (error) {
      return false;
    }
  }

  /**
   * Get repository root directory
   */
  async getRepositoryRoot(repoPath: string): Promise<string | null> {
    try {
      const git = this.getGit(repoPath);
      const result = await git.revparse(["--show-toplevel"]);
      return result.trim();
    } catch (error) {
      return null;
    }
  }
}
