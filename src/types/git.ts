export interface GitStatus {
  currentBranch: string;
  modified: string[];
  staged: string[];
  untracked: string[];
  conflicts: string[];
  ahead: number;
  behind: number;
  lastFetch?: Date | string;
  isClean: boolean;
}

export interface GitBranch {
  name: string;
  isRemote: boolean;
  isCurrent: boolean;
  ahead: number;
  behind: number;
  lastCommit?: {
    hash: string;
    message: string;
    author: string;
    date: Date | string;
  };
}

export interface GitCommit {
  hash: string;
  abbreviatedHash: string;
  message: string;
  author: {
    name: string;
    email: string;
  };
  date: Date | string;
  files: string[];
  insertions: number;
  deletions: number;
}

export interface GitStash {
  id: string;
  index: number;
  message: string;
  branch: string;
  date: Date | string;
  files: string[];
}

export interface GitRemote {
  name: string;
  fetchUrl: string;
  pushUrl: string;
}

export interface GitConfig {
  user: {
    name?: string;
    email?: string;
  };
  remote: {
    origin?: string;
  };
  core: {
    editor?: string;
    autocrlf?: boolean;
  };
}