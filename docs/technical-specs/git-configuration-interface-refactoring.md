# Technical Specification: Git Configuration Interface Refactoring

## 1. Overview

### Business Context

The Git Configuration interface requires refactoring to provide developers with an intuitive, modern git management experience integrated into the Stock Portfolio Management System workspace. The interface must support all standard git operations while maintaining performance and reliability.

### Technical Scope

- Complete refactoring of existing git interface components
- Integration with workspace terminal system
- Real-time git status monitoring via WebSocket
- Modern React 19 component architecture
- TypeScript-first implementation with comprehensive type safety

### Dependencies

- Existing Terminal System V2 (WebSocket ports 4001-4002)
- Workspace file management system
- Next.js 15.4.5 App Router
- PostgreSQL database for settings persistence

## 2. System Architecture

### High-Level Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Git UI        │    │   Git Service    │    │   Git Terminal  │
│   Components    │◄──►│   Layer          │◄──►│   WebSocket     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   State Mgmt    │    │   Database       │    │   Native Git    │
│   (Zustand)     │    │   (PostgreSQL)   │    │   Commands      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Component Architecture

```
GitConfigurationInterface/
├── GitStatusPanel/
│   ├── QuickBranchSwitcher/
│   ├── VisualStatusIndicators/
│   └── RepositoryHealthMonitor/
├── GitActionsPanel/
│   ├── ContextualQuickActions/
│   ├── SmartCommitInterface/
│   └── BranchManagement/
├── GitHistoryPanel/
│   ├── CommitHistoryVisualization/
│   ├── BranchTreeView/
│   └── DiffViewer/
└── GitManagementPanel/
    ├── StashManagement/
    ├── RemoteManagement/
    └── GitSettingsManager/
```

### Data Flow Architecture

```
User Interaction → Component State → Service Layer → Git Commands
      ↓                ↓                ↓              ↓
   UI Update ← WebSocket Events ← Terminal WS ← Git Output
      │                │                │              │
      └────────────── State Sync ──────────────────────┘
```

## 3. Component Structure

### Core Components

#### GitConfigurationInterface

Main container component managing the entire git interface

```typescript
interface GitConfigurationInterfaceProps {
  projectId: string;
  workspacePath: string;
  initialBranch?: string;
  onStatusChange?: (status: GitStatus) => void;
}

interface GitStatus {
  currentBranch: string;
  staged: FileStatus[];
  unstaged: FileStatus[];
  untracked: string[];
  ahead: number;
  behind: number;
  conflicts: string[];
  stashes: GitStash[];
  health: RepositoryHealth;
}
```

#### QuickBranchSwitcher

Branch selection component with search and status indicators

```typescript
interface QuickBranchSwitcherProps {
  branches: Branch[];
  currentBranch: string;
  onBranchSwitch: (branch: string) => Promise<void>;
  isLoading: boolean;
  canSwitchBranch: boolean;
}

interface Branch {
  name: string;
  type: "local" | "remote" | "tracking";
  isActive: boolean;
  lastCommit: CommitInfo;
  ahead: number;
  behind: number;
  status: "clean" | "dirty" | "conflicted";
}
```

#### VisualStatusIndicators

Visual representation of repository state

```typescript
interface VisualStatusIndicatorsProps {
  status: GitStatus;
  health: RepositoryHealth;
}

interface RepositoryHealth {
  score: number; // 0-100
  issues: HealthIssue[];
  recommendations: string[];
}

interface HealthIssue {
  type: "warning" | "error" | "info";
  message: string;
  action?: string;
}
```

#### SmartCommitInterface

Intelligent commit interface with templates and validation

```typescript
interface SmartCommitInterfaceProps {
  stagedFiles: FileStatus[];
  unstagedFiles: FileStatus[];
  templates: CommitTemplate[];
  onCommit: (commit: CommitData) => Promise<void>;
}

interface CommitData {
  message: string;
  description?: string;
  template?: string;
  selectedFiles: string[];
  signOff: boolean;
  amend: boolean;
}

interface CommitTemplate {
  id: string;
  name: string;
  template: string;
  description: string;
  fields: TemplateField[];
}
```

### Supporting Components

#### BranchManagement

Complete branch operations interface

```typescript
interface BranchManagementProps {
  branches: Branch[];
  onCreateBranch: (name: string, from: string) => Promise<void>;
  onDeleteBranch: (name: string, force: boolean) => Promise<void>;
  onMergeBranch: (from: string, to: string) => Promise<void>;
  onRebaseBranch: (from: string, to: string) => Promise<void>;
}
```

#### StashManagement

Stash operations interface

```typescript
interface StashManagementProps {
  stashes: GitStash[];
  onStashCreate: (message: string, includeUntracked: boolean) => Promise<void>;
  onStashApply: (stashId: string, pop: boolean) => Promise<void>;
  onStashDrop: (stashId: string) => Promise<void>;
}

interface GitStash {
  id: string;
  message: string;
  branch: string;
  date: Date;
  author: string;
  files: FileStatus[];
}
```

## 4. API Specifications

### Git Status API

```typescript
// GET /api/workspace/git/status
interface GitStatusResponse {
  success: boolean;
  data: {
    currentBranch: string;
    branches: Branch[];
    status: {
      staged: FileStatus[];
      unstaged: FileStatus[];
      untracked: string[];
      conflicts: string[];
    };
    remoteStatus: {
      ahead: number;
      behind: number;
      upToDate: boolean;
    };
    health: RepositoryHealth;
  };
}
```

### Branch Operations API

```typescript
// POST /api/workspace/git/branches
interface CreateBranchRequest {
  name: string;
  from: string;
  checkout: boolean;
}

// PUT /api/workspace/git/branches/switch
interface SwitchBranchRequest {
  branch: string;
  createIfNotExists: boolean;
  stashChanges: boolean;
}

// DELETE /api/workspace/git/branches/:name
interface DeleteBranchRequest {
  force: boolean;
  remote: boolean;
}
```

### Commit Operations API

```typescript
// POST /api/workspace/git/commits
interface CreateCommitRequest {
  message: string;
  description?: string;
  files?: string[]; // If empty, commit all staged
  signOff: boolean;
  amend: boolean;
  template?: string;
}

// GET /api/workspace/git/commits
interface CommitHistoryResponse {
  success: boolean;
  data: {
    commits: CommitInfo[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      hasMore: boolean;
    };
  };
}
```

### Stash Operations API

```typescript
// POST /api/workspace/git/stash
interface CreateStashRequest {
  message: string;
  includeUntracked: boolean;
  includeIgnored: boolean;
  keepIndex: boolean;
}

// PUT /api/workspace/git/stash/:id/apply
interface ApplyStashRequest {
  pop: boolean; // Apply and drop
  index: boolean; // Restore index
}
```

### Git Settings API

```typescript
// GET /api/workspace/git/config
// PUT /api/workspace/git/config
interface GitConfigRequest {
  user: {
    name: string;
    email: string;
  };
  core: {
    editor: string;
    autocrlf: boolean;
    ignorecase: boolean;
  };
  push: {
    default: "simple" | "matching" | "current";
  };
  pull: {
    rebase: boolean;
  };
  aliases: Record<string, string>;
}
```

## 5. WebSocket Events for Real-Time Updates

### Event Types

```typescript
interface GitWebSocketEvents {
  // Outbound events (Client → Server)
  "git:subscribe": { projectId: string };
  "git:unsubscribe": { projectId: string };
  "git:status": { projectId: string };
  "git:branch:switch": { projectId: string; branch: string };

  // Inbound events (Server → Client)
  "git:status:update": GitStatusUpdate;
  "git:branch:changed": BranchChangeEvent;
  "git:operation:progress": OperationProgressEvent;
  "git:operation:complete": OperationCompleteEvent;
  "git:error": GitErrorEvent;
}

interface GitStatusUpdate {
  projectId: string;
  status: GitStatus;
  timestamp: number;
  changes: StatusChange[];
}

interface BranchChangeEvent {
  projectId: string;
  previousBranch: string;
  currentBranch: string;
  timestamp: number;
}

interface OperationProgressEvent {
  projectId: string;
  operation: string;
  progress: number; // 0-100
  message: string;
}
```

### WebSocket Message Protocol

```typescript
interface GitWebSocketMessage {
  type: keyof GitWebSocketEvents;
  payload: any;
  requestId?: string;
  timestamp: number;
}
```

### Real-Time Status Monitoring

```typescript
class GitWebSocketManager {
  private ws: WebSocket;
  private subscriptions: Set<string> = new Set();

  subscribe(projectId: string): void;
  unsubscribe(projectId: string): void;
  sendCommand(type: string, payload: any): Promise<any>;
  onStatusUpdate(callback: (status: GitStatusUpdate) => void): void;
}
```

## 6. Database Schema Changes

### Git User Preferences Table

```sql
CREATE TABLE git_user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_path TEXT NOT NULL,
  preferences JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(user_id, project_path)
);

CREATE INDEX idx_git_user_preferences_user_project ON git_user_preferences(user_id, project_path);
```

### Commit Templates Table

```sql
CREATE TABLE git_commit_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  template TEXT NOT NULL,
  description TEXT,
  is_global BOOLEAN DEFAULT false,
  fields JSONB DEFAULT '[]',
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_git_commit_templates_user ON git_commit_templates(user_id);
CREATE INDEX idx_git_commit_templates_global ON git_commit_templates(is_global) WHERE is_global = true;
```

### Git Operation History Table

```sql
CREATE TABLE git_operation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  project_path TEXT NOT NULL,
  operation_type VARCHAR(50) NOT NULL,
  operation_data JSONB NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  error_message TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE INDEX idx_git_operation_history_user_project ON git_operation_history(user_id, project_path);
CREATE INDEX idx_git_operation_history_created_at ON git_operation_history(created_at DESC);
```

### Migration Script

```sql
-- Migration: 20250812_git_interface_tables.sql
-- Up
BEGIN;

-- Create tables
[TABLE DEFINITIONS ABOVE]

-- Insert default commit templates
INSERT INTO git_commit_templates (id, user_id, name, template, description, is_global, fields) VALUES
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'Feature', 'feat: {summary}\n\n{description}', 'New feature implementation', true, '[{"name":"summary","required":true},{"name":"description","required":false}]'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'Bug Fix', 'fix: {summary}\n\n{description}', 'Bug fix', true, '[{"name":"summary","required":true},{"name":"description","required":false}]'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'Refactor', 'refactor: {summary}\n\n{description}', 'Code refactoring', true, '[{"name":"summary","required":true},{"name":"description","required":false}]');

COMMIT;

-- Down
BEGIN;
DROP TABLE IF EXISTS git_operation_history;
DROP TABLE IF EXISTS git_commit_templates;
DROP TABLE IF EXISTS git_user_preferences;
COMMIT;
```

## 7. State Management Architecture

### Zustand Store Structure

```typescript
interface GitStore {
  // State
  projects: Record<string, ProjectGitState>;
  currentProject: string | null;
  globalSettings: GitGlobalSettings;

  // Actions
  setCurrentProject: (projectId: string) => void;
  updateProjectStatus: (projectId: string, status: GitStatus) => void;
  updateBranches: (projectId: string, branches: Branch[]) => void;

  // Async Actions
  refreshStatus: (projectId: string) => Promise<void>;
  switchBranch: (projectId: string, branch: string) => Promise<void>;
  createBranch: (
    projectId: string,
    name: string,
    from: string,
  ) => Promise<void>;
  commit: (projectId: string, commitData: CommitData) => Promise<void>;
}

interface ProjectGitState {
  status: GitStatus;
  branches: Branch[];
  history: CommitInfo[];
  stashes: GitStash[];
  isLoading: boolean;
  lastUpdate: number;
  error: string | null;
}
```

### State Persistence

```typescript
const useGitStore = create<GitStore>()(
  persist(
    (set, get) => ({
      // Store implementation
    }),
    {
      name: "git-store",
      partialize: (state) => ({
        globalSettings: state.globalSettings,
        // Don't persist project states (too large)
      }),
    },
  ),
);
```

## 8. Service Layer Architecture

### Git Service Interface

```typescript
class GitService {
  constructor(private terminalService: TerminalService) {}

  // Status Operations
  async getStatus(projectPath: string): Promise<GitStatus>;
  async refreshStatus(projectPath: string): Promise<GitStatus>;

  // Branch Operations
  async getBranches(projectPath: string): Promise<Branch[]>;
  async switchBranch(projectPath: string, branch: string): Promise<void>;
  async createBranch(
    projectPath: string,
    name: string,
    from: string,
  ): Promise<void>;
  async deleteBranch(
    projectPath: string,
    name: string,
    force: boolean,
  ): Promise<void>;
  async mergeBranch(
    projectPath: string,
    from: string,
    to: string,
  ): Promise<void>;

  // Commit Operations
  async commit(projectPath: string, commitData: CommitData): Promise<void>;
  async getCommitHistory(
    projectPath: string,
    options: HistoryOptions,
  ): Promise<CommitInfo[]>;

  // Stash Operations
  async getStashes(projectPath: string): Promise<GitStash[]>;
  async createStash(
    projectPath: string,
    message: string,
    options: StashOptions,
  ): Promise<void>;
  async applyStash(
    projectPath: string,
    stashId: string,
    pop: boolean,
  ): Promise<void>;

  // File Operations
  async stageFiles(projectPath: string, files: string[]): Promise<void>;
  async unstageFiles(projectPath: string, files: string[]): Promise<void>;
  async discardChanges(projectPath: string, files: string[]): Promise<void>;

  // Configuration
  async getConfig(projectPath: string): Promise<GitConfig>;
  async setConfig(
    projectPath: string,
    config: Partial<GitConfig>,
  ): Promise<void>;
}
```

### Terminal Integration Service

```typescript
class GitTerminalService {
  constructor(private terminalService: TerminalService) {}

  private async executeGitCommand(
    projectPath: string,
    command: string[],
    options?: ExecutionOptions,
  ): Promise<CommandResult> {
    const sessionId = await this.terminalService.createSession({
      projectId: this.getProjectId(projectPath),
      type: "system",
      autoClose: true,
    });

    try {
      const result = await this.terminalService.executeCommand(
        sessionId,
        ["git", ...command],
        {
          cwd: projectPath,
          timeout: options?.timeout || 30000,
          parseOutput: true,
        },
      );

      return result;
    } finally {
      await this.terminalService.closeSession(sessionId);
    }
  }

  async getStatus(projectPath: string): Promise<GitStatus> {
    const [statusResult, branchResult] = await Promise.all([
      this.executeGitCommand(projectPath, ["status", "--porcelain=v2"]),
      this.executeGitCommand(projectPath, ["branch", "-vv", "--no-color"]),
    ]);

    return this.parseGitStatus(statusResult.output, branchResult.output);
  }
}
```

## 9. Performance Optimization Strategies

### 1. Command Execution Optimization

```typescript
class GitCommandOptimizer {
  private commandCache = new Map<string, { result: any; timestamp: number }>();
  private readonly CACHE_TTL = 5000; // 5 seconds

  async executeWithCache<T>(
    key: string,
    command: () => Promise<T>,
    cacheable = true,
  ): Promise<T> {
    if (cacheable && this.commandCache.has(key)) {
      const cached = this.commandCache.get(key)!;
      if (Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.result;
      }
    }

    const result = await command();

    if (cacheable) {
      this.commandCache.set(key, {
        result,
        timestamp: Date.now(),
      });
    }

    return result;
  }

  clearCache(pattern?: string): void {
    if (pattern) {
      for (const key of this.commandCache.keys()) {
        if (key.includes(pattern)) {
          this.commandCache.delete(key);
        }
      }
    } else {
      this.commandCache.clear();
    }
  }
}
```

### 2. Incremental Status Updates

```typescript
class IncrementalStatusManager {
  private lastStatus = new Map<string, GitStatus>();

  async getStatusDiff(projectPath: string): Promise<GitStatusDiff> {
    const currentStatus = await this.gitService.getStatus(projectPath);
    const lastStatus = this.lastStatus.get(projectPath);

    if (!lastStatus) {
      this.lastStatus.set(projectPath, currentStatus);
      return { type: "full", status: currentStatus };
    }

    const diff = this.calculateDiff(lastStatus, currentStatus);
    this.lastStatus.set(projectPath, currentStatus);

    return { type: "incremental", diff, status: currentStatus };
  }

  private calculateDiff(old: GitStatus, current: GitStatus): StatusChanges {
    return {
      branchChanged: old.currentBranch !== current.currentBranch,
      stagedChanges: this.getFileDiff(old.staged, current.staged),
      unstagedChanges: this.getFileDiff(old.unstaged, current.unstaged),
      untrackedChanges: this.getArrayDiff(old.untracked, current.untracked),
    };
  }
}
```

### 3. Virtual Scrolling for History

```typescript
import { FixedSizeList as List } from 'react-window';

const CommitHistoryVirtualized: React.FC<{
  commits: CommitInfo[];
  onLoadMore: () => void;
}> = ({ commits, onLoadMore }) => {
  const renderCommit = ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style} key={commits[index].hash}>
      <CommitItem commit={commits[index]} />
    </div>
  );

  return (
    <List
      height={400}
      itemCount={commits.length}
      itemSize={80}
      onItemsRendered={({ visibleStopIndex }) => {
        if (visibleStopIndex >= commits.length - 5) {
          onLoadMore();
        }
      }}
    >
      {renderCommit}
    </List>
  );
};
```

### 4. Debounced File Watching

```typescript
class GitFileWatcher {
  private watchers = new Map<string, fs.FSWatcher>();
  private debounceTimers = new Map<string, NodeJS.Timeout>();

  watchProject(projectPath: string, callback: () => void): void {
    const gitDir = path.join(projectPath, ".git");
    const workingDir = projectPath;

    // Watch .git directory for ref changes
    const gitWatcher = fs.watch(
      gitDir,
      { recursive: true },
      (eventType, filename) => {
        if (
          filename?.includes("refs/") ||
          filename === "HEAD" ||
          filename === "index"
        ) {
          this.debouncedCallback(projectPath, callback);
        }
      },
    );

    // Watch working directory for file changes
    const workWatcher = fs.watch(
      workingDir,
      { recursive: true },
      (eventType, filename) => {
        if (
          !filename?.includes(".git/") &&
          !filename?.includes("node_modules/")
        ) {
          this.debouncedCallback(projectPath, callback);
        }
      },
    );

    this.watchers.set(projectPath, gitWatcher);
    this.watchers.set(`${projectPath}:work`, workWatcher);
  }

  private debouncedCallback(projectPath: string, callback: () => void): void {
    const existingTimer = this.debounceTimers.get(projectPath);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    this.debounceTimers.set(
      projectPath,
      setTimeout(() => {
        callback();
        this.debounceTimers.delete(projectPath);
      }, 300),
    );
  }
}
```

## 10. Security Considerations

### 1. Command Injection Prevention

```typescript
class GitCommandValidator {
  private static readonly ALLOWED_COMMANDS = new Set([
    "status",
    "branch",
    "checkout",
    "commit",
    "push",
    "pull",
    "merge",
    "rebase",
    "stash",
    "log",
    "diff",
    "add",
    "reset",
    "clean",
    "remote",
    "config",
    "tag",
  ]);

  private static readonly DANGEROUS_PATTERNS = [
    /[;&|`$()]/, // Shell metacharacters
    /\.\.\//, // Directory traversal
    /--exec/, // Dangerous git options
    /--upload-pack/,
    /--receive-pack/, // Remote execution
  ];

  static validateCommand(command: string[]): boolean {
    if (command.length === 0 || command[0] !== "git") {
      return false;
    }

    const gitCommand = command[1];
    if (!this.ALLOWED_COMMANDS.has(gitCommand)) {
      return false;
    }

    const fullCommand = command.join(" ");
    return !this.DANGEROUS_PATTERNS.some((pattern) =>
      pattern.test(fullCommand),
    );
  }

  static sanitizeFilePaths(paths: string[]): string[] {
    return paths
      .filter((path) => !path.includes(".."))
      .map((path) => path.replace(/[^\w\-_.\/]/g, ""))
      .filter((path) => path.length > 0);
  }
}
```

### 2. Path Traversal Protection

```typescript
class PathValidator {
  static isValidProjectPath(
    projectPath: string,
    allowedBasePaths: string[],
  ): boolean {
    const normalizedPath = path.normalize(path.resolve(projectPath));

    return allowedBasePaths.some((basePath) => {
      const normalizedBase = path.normalize(path.resolve(basePath));
      return normalizedPath.startsWith(normalizedBase);
    });
  }

  static sanitizeGitPath(gitPath: string): string {
    return path
      .normalize(gitPath)
      .replace(/\.\.+/g, "") // Remove parent directory references
      .replace(/[<>:"|?*]/g, "") // Remove invalid filename characters
      .trim();
  }
}
```

### 3. Authentication & Authorization

```typescript
class GitSecurityManager {
  async validateGitOperation(
    userId: string,
    projectPath: string,
    operation: string,
  ): Promise<boolean> {
    // Verify user has access to project
    const hasAccess = await this.userService.hasProjectAccess(
      userId,
      projectPath,
    );
    if (!hasAccess) {
      throw new Error("Insufficient permissions for git operation");
    }

    // Check operation-specific permissions
    const permissions = await this.getGitPermissions(userId, projectPath);
    return this.checkOperationPermission(operation, permissions);
  }

  private async getGitPermissions(
    userId: string,
    projectPath: string,
  ): Promise<GitPermissions> {
    // Implementation depends on your authorization system
    return {
      canRead: true,
      canWrite: true,
      canPush: true,
      canForceDelete: false,
    };
  }
}
```

### 4. Credential Management

```typescript
class GitCredentialManager {
  private credentialStore = new Map<string, GitCredentials>();

  async getCredentials(remoteUrl: string): Promise<GitCredentials | null> {
    // Check if credentials are cached (encrypted)
    const cached = this.credentialStore.get(remoteUrl);
    if (cached && !this.isExpired(cached)) {
      return cached;
    }

    // Retrieve from secure storage
    const stored = await this.secureStorage.getCredentials(remoteUrl);
    if (stored) {
      this.credentialStore.set(remoteUrl, stored);
      return stored;
    }

    return null;
  }

  async setCredentials(
    remoteUrl: string,
    credentials: GitCredentials,
  ): Promise<void> {
    // Encrypt and store credentials
    await this.secureStorage.setCredentials(remoteUrl, credentials);
    this.credentialStore.set(remoteUrl, credentials);
  }

  clearCredentials(remoteUrl?: string): void {
    if (remoteUrl) {
      this.credentialStore.delete(remoteUrl);
    } else {
      this.credentialStore.clear();
    }
  }
}
```

## 11. Testing Strategy

### 1. Unit Tests

```typescript
// Example test for GitService
describe("GitService", () => {
  let gitService: GitService;
  let mockTerminalService: jest.Mocked<TerminalService>;

  beforeEach(() => {
    mockTerminalService = createMockTerminalService();
    gitService = new GitService(mockTerminalService);
  });

  describe("getStatus", () => {
    it("should parse git status correctly", async () => {
      mockTerminalService.executeCommand.mockResolvedValue({
        stdout: "1 M. N... 100644 100644 100644 abc123... def456... file.txt\n",
        stderr: "",
        exitCode: 0,
      });

      const status = await gitService.getStatus("/test/project");

      expect(status.staged).toHaveLength(0);
      expect(status.unstaged).toHaveLength(1);
      expect(status.unstaged[0].path).toBe("file.txt");
      expect(status.unstaged[0].status).toBe("modified");
    });

    it("should handle git command errors", async () => {
      mockTerminalService.executeCommand.mockRejectedValue(
        new Error("Not a git repository"),
      );

      await expect(gitService.getStatus("/test/project")).rejects.toThrow(
        "Not a git repository",
      );
    });
  });
});
```

### 2. Integration Tests

```typescript
describe("Git Integration Tests", () => {
  let testRepo: string;
  let gitService: GitService;

  beforeEach(async () => {
    testRepo = await createTestGitRepository();
    gitService = new GitService(new TerminalService());
  });

  afterEach(async () => {
    await cleanupTestRepository(testRepo);
  });

  it("should create and switch to new branch", async () => {
    await gitService.createBranch(testRepo, "feature/test", "main");
    await gitService.switchBranch(testRepo, "feature/test");

    const status = await gitService.getStatus(testRepo);
    expect(status.currentBranch).toBe("feature/test");
  });

  it("should commit staged changes", async () => {
    await fs.writeFile(path.join(testRepo, "test.txt"), "content");
    await gitService.stageFiles(testRepo, ["test.txt"]);

    await gitService.commit(testRepo, {
      message: "Test commit",
      selectedFiles: ["test.txt"],
      signOff: false,
      amend: false,
    });

    const history = await gitService.getCommitHistory(testRepo, { limit: 1 });
    expect(history[0].message).toBe("Test commit");
  });
});
```

### 3. Component Tests

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QuickBranchSwitcher } from '../QuickBranchSwitcher';

describe('QuickBranchSwitcher', () => {
  const mockBranches: Branch[] = [
    {
      name: 'main',
      type: 'local',
      isActive: true,
      lastCommit: { hash: 'abc123', message: 'Initial commit' },
      ahead: 0,
      behind: 0,
      status: 'clean'
    },
    {
      name: 'feature/test',
      type: 'local',
      isActive: false,
      lastCommit: { hash: 'def456', message: 'Add feature' },
      ahead: 2,
      behind: 0,
      status: 'dirty'
    }
  ];

  it('should display all branches', () => {
    render(
      <QuickBranchSwitcher
        branches={mockBranches}
        currentBranch="main"
        onBranchSwitch={jest.fn()}
        isLoading={false}
        canSwitchBranch={true}
      />
    );

    expect(screen.getByText('main')).toBeInTheDocument();
    expect(screen.getByText('feature/test')).toBeInTheDocument();
  });

  it('should call onBranchSwitch when branch is selected', async () => {
    const mockOnBranchSwitch = jest.fn().mockResolvedValue(undefined);

    render(
      <QuickBranchSwitcher
        branches={mockBranches}
        currentBranch="main"
        onBranchSwitch={mockOnBranchSwitch}
        isLoading={false}
        canSwitchBranch={true}
      />
    );

    fireEvent.click(screen.getByText('feature/test'));

    await waitFor(() => {
      expect(mockOnBranchSwitch).toHaveBeenCalledWith('feature/test');
    });
  });
});
```

### 4. End-to-End Tests

```typescript
import { test, expect } from "@playwright/test";

test.describe("Git Interface E2E", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/workspace");
    await page.waitForSelector('[data-testid="git-interface"]');
  });

  test("should switch branches using quick switcher", async ({ page }) => {
    // Open branch switcher
    await page.click('[data-testid="branch-switcher-trigger"]');
    await expect(page.locator('[data-testid="branch-list"]')).toBeVisible();

    // Select feature branch
    await page.click('[data-testid="branch-item-feature/test"]');

    // Verify branch switched
    await expect(page.locator('[data-testid="current-branch"]')).toHaveText(
      "feature/test",
    );
  });

  test("should commit changes with template", async ({ page }) => {
    // Stage files
    await page.click('[data-testid="stage-all-button"]');

    // Open commit interface
    await page.click('[data-testid="commit-button"]');

    // Select template
    await page.selectOption('[data-testid="commit-template"]', "Feature");

    // Fill commit message
    await page.fill('[data-testid="commit-summary"]', "Add new feature");
    await page.fill(
      '[data-testid="commit-description"]',
      "Detailed description",
    );

    // Submit commit
    await page.click('[data-testid="submit-commit"]');

    // Verify success
    await expect(page.locator('[data-testid="commit-success"]')).toBeVisible();
  });
});
```

## 12. Implementation Phases

### Phase 1: Core Foundation (Week 1-2)

**Priority**: P0 Critical
**Duration**: 10 days
**Team**: 2 Frontend, 1 Backend

#### Tasks:

1. **Database Schema Implementation**
   - Create git user preferences table
   - Create commit templates table
   - Create operation history table
   - Run migration scripts

2. **Core Service Layer**
   - Implement GitService class
   - Implement GitTerminalService integration
   - Add command validation and security
   - Create basic WebSocket events

3. **Base Components**
   - GitConfigurationInterface container
   - Basic GitStatusPanel
   - QuickBranchSwitcher component
   - Visual status indicators

#### Acceptance Criteria:

- [ ] Database tables created and migrated
- [ ] GitService can execute basic git commands
- [ ] Branch switching works reliably
- [ ] Git status updates in real-time
- [ ] Security validation prevents command injection

### Phase 2: Advanced Features (Week 3-4)

**Priority**: P1 High
**Duration**: 10 days
**Team**: 2 Frontend, 1 Backend

#### Tasks:

1. **Commit Interface**
   - SmartCommitInterface with templates
   - File staging/unstaging interface
   - Commit message validation
   - Template management system

2. **Branch Management**
   - Branch creation/deletion UI
   - Merge conflict resolution
   - Remote branch handling
   - Branch history visualization

3. **Performance Optimization**
   - Command caching system
   - Incremental status updates
   - Virtual scrolling for history
   - File watching optimization

#### Acceptance Criteria:

- [ ] Smart commit interface with templates works
- [ ] Branch operations (create/delete/merge) function
- [ ] Performance benchmarks meet targets
- [ ] Real-time updates are optimized

### Phase 3: Advanced Management (Week 5-6)

**Priority**: P2 Medium
**Duration**: 10 days
**Team**: 2 Frontend, 1 Backend

#### Tasks:

1. **History & Visualization**
   - Commit history with virtual scrolling
   - Branch tree visualization
   - Diff viewer component
   - Interactive git graph

2. **Stash Management**
   - Stash creation/application interface
   - Stash browsing and comparison
   - Stash conflict resolution
   - Auto-stash on branch switch

3. **Configuration Management**
   - Git settings interface
   - User preference management
   - Template customization
   - Keyboard shortcuts

#### Acceptance Criteria:

- [ ] Commit history displays efficiently
- [ ] Stash operations work correctly
- [ ] Settings are persisted and applied
- [ ] UI is responsive and intuitive

### Phase 4: Polish & Testing (Week 7-8)

**Priority**: P3 Low
**Duration**: 10 days
**Team**: 2 Frontend, 1 QA, 1 Backend

#### Tasks:

1. **Comprehensive Testing**
   - Unit test coverage > 90%
   - Integration test suite
   - E2E test automation
   - Performance testing

2. **UI/UX Polish**
   - Animation refinements
   - Error handling improvements
   - Loading state optimizations
   - Accessibility improvements

3. **Documentation & Training**
   - User documentation
   - Developer guides
   - Video tutorials
   - Migration guides

#### Acceptance Criteria:

- [ ] Test coverage meets requirements
- [ ] UI passes accessibility audit
- [ ] Performance benchmarks achieved
- [ ] Documentation is complete

## 13. Risk Assessment & Mitigation

### Technical Risks

#### 1. Git Command Performance (HIGH)

**Risk**: Complex git operations causing UI freezing
**Impact**: Poor user experience, system unresponsiveness
**Mitigation**:

- All git commands run in background processes
- Implement command timeouts (30 seconds max)
- Show progress indicators for long operations
- Cache frequently accessed data

#### 2. File System Watching Scale (MEDIUM)

**Risk**: File watching in large repositories causing performance issues
**Impact**: High CPU usage, memory consumption
**Mitigation**:

- Implement smart file watching with exclusion patterns
- Use debounced event handling
- Limit watching to git-relevant files only
- Provide option to disable auto-refresh

#### 3. WebSocket Connection Stability (MEDIUM)

**Risk**: WebSocket disconnections causing state desync
**Impact**: Stale git status, missed updates
**Mitigation**:

- Implement auto-reconnection with exponential backoff
- Add heartbeat monitoring
- Fallback to polling when WebSocket fails
- Store connection state in persistent store

#### 4. Concurrent Git Operations (HIGH)

**Risk**: Multiple git operations conflicting with each other
**Impact**: Repository corruption, operation failures
**Mitigation**:

- Implement operation queue with single-operation execution
- Add operation locking per repository
- Show operation status and queue state
- Provide operation cancellation mechanism

### Security Risks

#### 1. Command Injection (CRITICAL)

**Risk**: Malicious input executing arbitrary system commands
**Impact**: System compromise, data theft
**Mitigation**:

- Strict command validation with allowlist
- Input sanitization for all parameters
- No direct shell execution, use git CLI only
- Audit logging for all git operations

#### 2. Path Traversal (HIGH)

**Risk**: Access to files outside project directory
**Impact**: Unauthorized file access, data leakage
**Mitigation**:

- Path validation against allowed base directories
- Normalize and resolve all paths before use
- Sandbox git operations to project directory
- File system permission checks

### Business Risks

#### 1. User Adoption (MEDIUM)

**Risk**: Users preferring external git tools
**Impact**: Low feature utilization, wasted development
**Mitigation**:

- Conduct user research and feedback sessions
- Provide migration path from external tools
- Ensure feature parity with popular git clients
- Implement user onboarding and tutorials

#### 2. Maintenance Complexity (MEDIUM)

**Risk**: Complex codebase difficult to maintain
**Impact**: High maintenance cost, slow feature development
**Mitigation**:

- Modular architecture with clear boundaries
- Comprehensive test coverage and documentation
- Code review process and quality gates
- Regular refactoring and technical debt management

## 14. Success Metrics & KPIs

### Performance Metrics

- **Git Command Response Time**: < 2 seconds for common operations
- **UI Responsiveness**: < 100ms interaction feedback
- **Memory Usage**: < 50MB additional RAM consumption
- **CPU Usage**: < 10% during idle, < 30% during operations

### User Experience Metrics

- **Feature Adoption Rate**: > 70% of users use git interface within 30 days
- **Operation Success Rate**: > 98% of git operations complete successfully
- **User Satisfaction Score**: > 4.0/5.0 in user feedback
- **Support Ticket Reduction**: 50% fewer git-related support requests

### Technical Metrics

- **Test Coverage**: > 90% code coverage
- **Bug Report Rate**: < 1 bug per 1000 operations
- **System Uptime**: > 99.5% availability
- **WebSocket Connection Stability**: > 95% successful connections

### Business Metrics

- **Development Efficiency**: 25% reduction in time spent on git operations
- **User Retention**: Maintain current retention with new features
- **Feature Usage**: > 60% monthly active users use git features
- **Cost Savings**: Reduce external tool licensing needs

## 15. Monitoring & Observability

### Application Metrics

```typescript
interface GitMetrics {
  operations: {
    total: number;
    successful: number;
    failed: number;
    averageExecutionTime: number;
  };
  connections: {
    activeWebSockets: number;
    reconnections: number;
    failedConnections: number;
  };
  performance: {
    memoryUsage: number;
    cpuUsage: number;
    cacheHitRate: number;
  };
}

class GitMetricsCollector {
  async collectMetrics(): Promise<GitMetrics> {
    return {
      operations: await this.getOperationMetrics(),
      connections: await this.getConnectionMetrics(),
      performance: await this.getPerformanceMetrics(),
    };
  }
}
```

### Error Tracking

```typescript
class GitErrorTracker {
  reportError(error: GitError, context: GitOperationContext): void {
    const errorData = {
      message: error.message,
      operation: context.operation,
      projectPath: context.projectPath,
      userId: context.userId,
      timestamp: new Date(),
      stackTrace: error.stack,
      gitVersion: context.gitVersion,
      systemInfo: this.getSystemInfo(),
    };

    // Send to monitoring service
    this.monitoringService.reportError(errorData);
  }
}
```

### Health Checks

```typescript
// GET /api/health/git
class GitHealthChecker {
  async checkHealth(): Promise<HealthStatus> {
    const checks = await Promise.allSettled([
      this.checkGitAvailability(),
      this.checkWebSocketConnection(),
      this.checkDatabaseConnection(),
      this.checkFileSystemAccess(),
    ]);

    return {
      status: checks.every((c) => c.status === "fulfilled")
        ? "healthy"
        : "degraded",
      checks: checks.map((check, index) => ({
        name: this.CHECK_NAMES[index],
        status: check.status === "fulfilled" ? "pass" : "fail",
        message: check.status === "rejected" ? check.reason.message : "OK",
      })),
      timestamp: new Date(),
    };
  }
}
```

This comprehensive technical specification provides a complete roadmap for implementing the Git Configuration interface refactoring. The modular design ensures maintainability, the security measures protect against common vulnerabilities, and the performance optimizations ensure a smooth user experience.

The implementation can begin immediately with Phase 1, as all dependencies and requirements have been clearly defined. Each phase builds upon the previous one, allowing for iterative development and testing.
