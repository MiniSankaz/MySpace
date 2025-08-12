import { 
  GitStatus, 
  GitBranch, 
  GitCommit, 
  GitStash, 
  GitRemote,
  GitConfig 
} from '@/types/git';

export class GitService {
  private terminalService: any; // Will be replaced with actual terminal service
  private projectPath: string;
  private projectId: string;
  private accessToken?: string;
  
  constructor(projectId: string, projectPath: string, accessToken?: string) {
    this.projectId = projectId;
    this.projectPath = projectPath;
    this.accessToken = accessToken;
  }
  
  /**
   * Execute a git command through the terminal service
   */
  private async executeCommand(command: string): Promise<string> {
    try {
      // For server-side execution, we can use child_process directly
      // instead of making an HTTP call to ourselves
      if (typeof window === 'undefined') {
        // We're on the server, execute directly
        console.log(`[GitService] Executing command directly: git ${command} in ${this.projectPath}`);
        const { exec } = await import('child_process');
        const { promisify } = await import('util');
        const execAsync = promisify(exec);
        
        try {
          const { stdout, stderr } = await execAsync(`git ${command}`, {
            cwd: this.projectPath,
            maxBuffer: 1024 * 1024, // 1MB buffer
          });
          
          console.log(`[GitService] Command successful: ${command.split(' ')[0]}`);
          return stdout || stderr || '';
        } catch (execError: any) {
          // Git commands often return non-zero exit codes for non-errors
          if (execError.stdout || execError.stderr) {
            console.log(`[GitService] Command returned non-zero but has output: ${command.split(' ')[0]}`);
            return execError.stdout || execError.stderr || '';
          }
          console.error(`[GitService] Command failed: ${command}`, execError.message);
          throw execError;
        }
      }
      
      // Client-side: use the API endpoint
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:4000';
      
      // Setup headers
      let headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      // If we have an access token, include it as a cookie header
      if (this.accessToken) {
        headers['Cookie'] = `accessToken=${this.accessToken}`;
      }
      
      const response = await fetch(`${baseUrl}/api/workspace/git/execute`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          projectId: this.projectId,
          command,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Command execution failed');
      }
      
      const result = await response.json();
      return result.output || '';
    } catch (error) {
      console.error(`Failed to execute git command: ${command}`, error);
      throw error;
    }
  }
  
  /**
   * Get current git status
   */
  async getStatus(): Promise<GitStatus> {
    const output = await this.executeCommand('status --porcelain=v1 --branch');
    const lines = output.split('\n').filter(Boolean);
    
    const status: GitStatus = {
      currentBranch: 'main',
      modified: [],
      staged: [],
      untracked: [],
      conflicts: [],
      ahead: 0,
      behind: 0,
      isClean: true,
    };
    
    for (const line of lines) {
      if (line.startsWith('##')) {
        // Parse branch info
        const branchMatch = line.match(/## (.+?)(?:\.\.\.(.+))?/);
        if (branchMatch) {
          status.currentBranch = branchMatch[1];
          
          // Parse ahead/behind
          const aheadMatch = line.match(/ahead (\d+)/);
          const behindMatch = line.match(/behind (\d+)/);
          
          if (aheadMatch) status.ahead = parseInt(aheadMatch[1]);
          if (behindMatch) status.behind = parseInt(behindMatch[1]);
        }
      } else {
        const statusCode = line.substring(0, 2);
        const filename = line.substring(3);
        
        status.isClean = false;
        
        // Parse file status
        if (statusCode === '??') {
          status.untracked.push(filename);
        } else if (statusCode === 'UU' || statusCode === 'AA' || statusCode === 'DD') {
          status.conflicts.push(filename);
        } else if (statusCode[0] !== ' ' && statusCode[0] !== '?') {
          status.staged.push(filename);
        } else if (statusCode[1] !== ' ' && statusCode[1] !== '?') {
          status.modified.push(filename);
        }
      }
    }
    
    // Get last fetch time
    try {
      const fetchHead = await this.executeCommand('log -1 --format=%cr FETCH_HEAD');
      if (fetchHead && !fetchHead.includes('cannot')) {
        status.lastFetch = new Date();
      }
    } catch (error) {
      // Ignore fetch head errors
    }
    
    return status;
  }
  
  /**
   * Get list of branches
   */
  async getBranches(): Promise<GitBranch[]> {
    const output = await this.executeCommand('branch -a -v');
    const lines = output.split('\n').filter(Boolean);
    
    const branches: GitBranch[] = [];
    const currentBranchOutput = await this.executeCommand('rev-parse --abbrev-ref HEAD');
    const currentBranch = currentBranchOutput.trim();
    
    for (const line of lines) {
      const isCurrent = line.startsWith('*');
      const cleanLine = line.replace(/^\*?\s+/, '');
      const parts = cleanLine.split(/\s+/);
      
      if (parts.length < 2) continue;
      
      const name = parts[0];
      const isRemote = name.startsWith('remotes/');
      
      // Skip HEAD references
      if (name.includes('HEAD')) continue;
      
      const branch: GitBranch = {
        name: isRemote ? name.replace('remotes/', '') : name,
        isRemote,
        isCurrent: name === currentBranch,
        ahead: 0,
        behind: 0,
      };
      
      // Get ahead/behind for local branches
      if (!isRemote) {
        try {
          const aheadBehind = await this.executeCommand(
            `rev-list --left-right --count ${name}...origin/${name} 2>/dev/null`
          );
          if (aheadBehind) {
            const [ahead, behind] = aheadBehind.trim().split(/\s+/).map(Number);
            branch.ahead = ahead || 0;
            branch.behind = behind || 0;
          }
        } catch (error) {
          // Branch might not have upstream
        }
      }
      
      branches.push(branch);
    }
    
    return branches;
  }
  
  /**
   * Switch to a different branch
   */
  async switchBranch(branch: string): Promise<void> {
    await this.executeCommand(`checkout ${branch}`);
  }
  
  /**
   * Create a new branch
   */
  async createBranch(branchName: string, baseBranch?: string, checkout: boolean = true): Promise<void> {
    if (baseBranch && baseBranch !== await this.getCurrentBranch()) {
      await this.executeCommand(`checkout ${baseBranch}`);
    }
    
    await this.executeCommand(`checkout -b ${branchName}`);
    
    if (!checkout) {
      // Switch back to original branch
      await this.executeCommand(`checkout -`);
    }
  }
  
  /**
   * Delete a branch
   */
  async deleteBranch(branchName: string, force: boolean = false): Promise<void> {
    const flag = force ? '-D' : '-d';
    await this.executeCommand(`branch ${flag} ${branchName}`);
  }
  
  /**
   * Merge a branch into the current branch
   */
  async mergeBranch(sourceBranch: string): Promise<void> {
    await this.executeCommand(`merge ${sourceBranch}`);
  }
  
  /**
   * Stage files
   */
  async stageFiles(files: string[]): Promise<void> {
    if (files.length === 0) return;
    
    const fileList = files.map(f => `"${f}"`).join(' ');
    await this.executeCommand(`add ${fileList}`);
  }
  
  /**
   * Unstage files
   */
  async unstageFiles(files: string[]): Promise<void> {
    if (files.length === 0) return;
    
    const fileList = files.map(f => `"${f}"`).join(' ');
    await this.executeCommand(`reset HEAD ${fileList}`);
  }
  
  /**
   * Commit staged changes
   */
  async commit(message: string): Promise<void> {
    // Escape the message for shell
    const escapedMessage = message.replace(/"/g, '\\"');
    await this.executeCommand(`commit -m "${escapedMessage}"`);
  }
  
  /**
   * Push to remote
   */
  async push(branch?: string, force: boolean = false): Promise<void> {
    const forceFlag = force ? '--force' : '';
    const branchArg = branch || '';
    await this.executeCommand(`push ${forceFlag} origin ${branchArg}`.trim());
  }
  
  /**
   * Pull from remote
   */
  async pull(branch?: string, rebase: boolean = false): Promise<void> {
    const rebaseFlag = rebase ? '--rebase' : '';
    const branchArg = branch || '';
    await this.executeCommand(`pull ${rebaseFlag} origin ${branchArg}`.trim());
  }
  
  /**
   * Fetch from remote
   */
  async fetch(all: boolean = false): Promise<void> {
    const allFlag = all ? '--all' : '';
    await this.executeCommand(`fetch ${allFlag}`.trim());
  }
  
  /**
   * Create a stash
   */
  async stash(message?: string, includeUntracked: boolean = true): Promise<void> {
    const untrackedFlag = includeUntracked ? '-u' : '';
    if (message) {
      await this.executeCommand(`stash push ${untrackedFlag} -m "${message}"`);
    } else {
      await this.executeCommand(`stash push ${untrackedFlag}`);
    }
  }
  
  /**
   * List stashes
   */
  async getStashes(): Promise<GitStash[]> {
    const output = await this.executeCommand('stash list');
    if (!output) return [];
    
    const lines = output.split('\n').filter(Boolean);
    const stashes: GitStash[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(/^(stash@\{(\d+)\}): (.+)$/);
      
      if (match) {
        const stash: GitStash = {
          id: match[1],
          index: parseInt(match[2]),
          message: match[3],
          branch: '',
          date: new Date(),
          files: [],
        };
        
        // Extract branch from message
        const branchMatch = match[3].match(/On (.+?):/);
        if (branchMatch) {
          stash.branch = branchMatch[1];
        }
        
        // Get files in stash
        try {
          const filesOutput = await this.executeCommand(`stash show --name-only ${stash.id}`);
          stash.files = filesOutput.split('\n').filter(Boolean);
        } catch (error) {
          // Ignore if can't get files
        }
        
        stashes.push(stash);
      }
    }
    
    return stashes;
  }
  
  /**
   * Apply a stash
   */
  async applyStash(stashId: string, pop: boolean = false): Promise<void> {
    const command = pop ? 'pop' : 'apply';
    await this.executeCommand(`stash ${command} ${stashId}`);
  }
  
  /**
   * Drop a stash
   */
  async dropStash(stashId: string): Promise<void> {
    await this.executeCommand(`stash drop ${stashId}`);
  }
  
  /**
   * Get commit history
   */
  async getCommits(limit: number = 50, branch?: string): Promise<GitCommit[]> {
    const branchArg = branch || 'HEAD';
    const format = '%H|%h|%s|%an|%ae|%ad|%cr';
    const output = await this.executeCommand(
      `log --format="${format}" --date=iso -n ${limit} ${branchArg}`
    );
    
    if (!output) return [];
    
    const lines = output.split('\n').filter(Boolean);
    const commits: GitCommit[] = [];
    
    for (const line of lines) {
      const parts = line.split('|');
      if (parts.length < 7) continue;
      
      const commit: GitCommit = {
        hash: parts[0],
        abbreviatedHash: parts[1],
        message: parts[2],
        author: {
          name: parts[3],
          email: parts[4],
        },
        date: parts[5],
        files: [],
        insertions: 0,
        deletions: 0,
      };
      
      commits.push(commit);
    }
    
    return commits;
  }
  
  /**
   * Get current branch name
   */
  async getCurrentBranch(): Promise<string> {
    const output = await this.executeCommand('rev-parse --abbrev-ref HEAD');
    return output.trim();
  }
  
  /**
   * Get remotes
   */
  async getRemotes(): Promise<GitRemote[]> {
    const output = await this.executeCommand('remote -v');
    if (!output) return [];
    
    const lines = output.split('\n').filter(Boolean);
    const remotes = new Map<string, GitRemote>();
    
    for (const line of lines) {
      const match = line.match(/^(\S+)\s+(\S+)\s+\((\w+)\)$/);
      if (match) {
        const [, name, url, type] = match;
        
        if (!remotes.has(name)) {
          remotes.set(name, {
            name,
            fetchUrl: '',
            pushUrl: '',
          });
        }
        
        const remote = remotes.get(name)!;
        if (type === 'fetch') {
          remote.fetchUrl = url;
        } else if (type === 'push') {
          remote.pushUrl = url;
        }
      }
    }
    
    return Array.from(remotes.values());
  }
  
  /**
   * Get git configuration
   */
  async getConfig(): Promise<GitConfig> {
    const config: GitConfig = {
      user: {},
      remote: {},
      core: {},
    };
    
    try {
      config.user.name = (await this.executeCommand('config user.name')).trim();
    } catch (error) { /* ignore */ }
    
    try {
      config.user.email = (await this.executeCommand('config user.email')).trim();
    } catch (error) { /* ignore */ }
    
    try {
      config.remote.origin = (await this.executeCommand('config remote.origin.url')).trim();
    } catch (error) { /* ignore */ }
    
    try {
      config.core.editor = (await this.executeCommand('config core.editor')).trim();
    } catch (error) { /* ignore */ }
    
    return config;
  }
  
  /**
   * Set git configuration
   */
  async setConfig(key: string, value: string, global: boolean = false): Promise<void> {
    const globalFlag = global ? '--global' : '';
    await this.executeCommand(`config ${globalFlag} ${key} "${value}"`);
  }
}

/**
 * Git WebSocket Connection Pool
 * Manages WebSocket connections to prevent multiple connections per project
 */

interface WebSocketConnection {
  ws: WebSocket;
  projectId: string;
  created: number;
  lastUsed: number;
  refCount: number;
}

export class GitWebSocketPool {
  private static instance: GitWebSocketPool;
  private connections: Map<string, WebSocketConnection> = new Map();
  private readonly maxConnections = 5;
  private readonly connectionTimeout = 30000; // 30 seconds
  private cleanupInterval: NodeJS.Timeout;

  private constructor() {
    // Cleanup stale connections every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleConnections();
    }, 60000);
  }

  public static getInstance(): GitWebSocketPool {
    if (!GitWebSocketPool.instance) {
      GitWebSocketPool.instance = new GitWebSocketPool();
    }
    return GitWebSocketPool.instance;
  }

  /**
   * Get or create WebSocket connection for project
   */
  public async getConnection(projectId: string): Promise<WebSocket | null> {
    const existing = this.connections.get(projectId);
    
    // Check if existing connection is still valid
    if (existing && existing.ws.readyState === WebSocket.OPEN) {
      existing.lastUsed = Date.now();
      existing.refCount++;
      console.log(`[GitPool] Reusing connection for project ${projectId} (refs: ${existing.refCount})`);
      return existing.ws;
    }

    // Remove invalid connection
    if (existing) {
      this.removeConnection(projectId);
    }

    // Check connection limit
    if (this.connections.size >= this.maxConnections) {
      this.evictOldestConnection();
    }

    // Create new connection
    return this.createConnection(projectId);
  }

  /**
   * Create new WebSocket connection
   */
  private createConnection(projectId: string): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      const wsUrl = `ws://localhost:4001/git/${projectId}`;
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        const connection: WebSocketConnection = {
          ws,
          projectId,
          created: Date.now(),
          lastUsed: Date.now(),
          refCount: 1
        };
        
        this.connections.set(projectId, connection);
        console.log(`[GitPool] Created new connection for project ${projectId}`);
        resolve(ws);
      };

      ws.onerror = (error) => {
        console.error(`[GitPool] Failed to create connection for project ${projectId}:`, error);
        reject(error);
      };

      ws.onclose = () => {
        // Auto-cleanup when connection closes
        this.removeConnection(projectId);
      };

      // Timeout for connection creation
      setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          ws.close();
          reject(new Error('Connection timeout'));
        }
      }, 10000);
    });
  }

  /**
   * Release connection reference
   */
  public releaseConnection(projectId: string): void {
    const connection = this.connections.get(projectId);
    if (connection) {
      connection.refCount = Math.max(0, connection.refCount - 1);
      console.log(`[GitPool] Released connection for project ${projectId} (refs: ${connection.refCount})`);
      
      // If no more references and connection is old, close it
      if (connection.refCount === 0) {
        const age = Date.now() - connection.lastUsed;
        if (age > this.connectionTimeout) {
          this.removeConnection(projectId);
        }
      }
    }
  }

  /**
   * Remove connection from pool
   */
  private removeConnection(projectId: string): void {
    const connection = this.connections.get(projectId);
    if (connection) {
      if (connection.ws.readyState === WebSocket.OPEN) {
        connection.ws.close(1000, 'Pool cleanup');
      }
      this.connections.delete(projectId);
      console.log(`[GitPool] Removed connection for project ${projectId}`);
    }
  }

  /**
   * Evict oldest unused connection
   */
  private evictOldestConnection(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, connection] of this.connections) {
      if (connection.refCount === 0 && connection.lastUsed < oldestTime) {
        oldestTime = connection.lastUsed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      console.log(`[GitPool] Evicting oldest connection: ${oldestKey}`);
      this.removeConnection(oldestKey);
    }
  }

  /**
   * Cleanup stale connections
   */
  private cleanupStaleConnections(): void {
    const now = Date.now();
    const staleConnections: string[] = [];

    for (const [projectId, connection] of this.connections) {
      const age = now - connection.lastUsed;
      const isStale = age > this.connectionTimeout && connection.refCount === 0;
      const isClosed = connection.ws.readyState === WebSocket.CLOSED;
      
      if (isStale || isClosed) {
        staleConnections.push(projectId);
      }
    }

    staleConnections.forEach(projectId => {
      this.removeConnection(projectId);
    });

    if (staleConnections.length > 0) {
      console.log(`[GitPool] Cleaned up ${staleConnections.length} stale connections`);
    }
  }

  /**
   * Get pool statistics
   */
  public getStats(): {
    totalConnections: number;
    activeConnections: number;
    connectionsById: Record<string, { refCount: number; age: number; state: string }>;
  } {
    const now = Date.now();
    const stats = {
      totalConnections: this.connections.size,
      activeConnections: 0,
      connectionsById: {} as Record<string, { refCount: number; age: number; state: string }>
    };

    for (const [projectId, connection] of this.connections) {
      if (connection.ws.readyState === WebSocket.OPEN) {
        stats.activeConnections++;
      }

      stats.connectionsById[projectId] = {
        refCount: connection.refCount,
        age: now - connection.created,
        state: connection.ws.readyState === WebSocket.OPEN ? 'open' : 'closed'
      };
    }

    return stats;
  }

  /**
   * Cleanup all connections (for shutdown)
   */
  public cleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    for (const [projectId] of this.connections) {
      this.removeConnection(projectId);
    }

    console.log('[GitPool] All connections cleaned up');
  }
}

// Export singleton instances
export const gitWebSocketPool = GitWebSocketPool.getInstance();

// Singleton instance manager for GitService
const gitServiceInstances = new Map<string, GitService>();

export function getGitService(projectId: string, projectPath: string, accessToken?: string): GitService {
  const key = `${projectId}:${projectPath}`;
  
  if (!gitServiceInstances.has(key)) {
    gitServiceInstances.set(key, new GitService(projectId, projectPath, accessToken));
  } else if (accessToken) {
    // Update access token if provided
    const service = gitServiceInstances.get(key)!;
    (service as any).accessToken = accessToken;
  }
  
  return gitServiceInstances.get(key)!;
}