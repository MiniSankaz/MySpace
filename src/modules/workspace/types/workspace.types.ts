export interface Project {
  id: string;
  name: string;
  description: string;
  path: string;
  structure: FileNode[];
  envVariables: Record<string, string>;
  scripts: Script[];
  settings?: ProjectSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface FileNode {
  name: string;
  type: 'file' | 'directory';
  path: string;
  children?: FileNode[];
  size?: number;
  extension?: string;
}

export interface Script {
  id: string;
  name: string;
  command: string;
  description?: string;
  category?: 'dev' | 'build' | 'test' | 'deploy' | 'custom';
  icon?: string;
}

export interface TerminalSession {
  id: string;
  projectId: string;
  type: 'system' | 'claude';
  tabName: string;
  active: boolean;
  output: string[];
  currentPath: string;
  pid?: number;
  createdAt: Date;
}

export interface ProjectSettings {
  theme?: 'dark' | 'light';
  fontSize?: number;
  fontFamily?: string;
  terminalHeight?: number;
  autoSave?: boolean;
  autoReconnect?: boolean;
}

export interface WorkspaceState {
  currentProject: Project | null;
  projects: Project[];
  terminals: {
    system: TerminalSession[];
    claude: TerminalSession[];
  };
  activeSystemTab: string | null;
  activeClaudeTab: string | null;
  sidebarCollapsed: boolean;
  loading: boolean;
  error: string | null;
}

export interface TerminalCommand {
  id: string;
  sessionId: string;
  command: string;
  output: string;
  timestamp: Date;
  exitCode?: number;
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  structure: FileNode[];
  scripts: Script[];
  envVariables: Record<string, string>;
}

export type TerminalType = 'system' | 'claude';

export interface CreateProjectDTO {
  name: string;
  description: string;
  path: string;
  templateId?: string;
}

export interface UpdateProjectDTO {
  name?: string;
  description?: string;
  path?: string;
  envVariables?: Record<string, string>;
  scripts?: Script[];
  settings?: ProjectSettings;
}

export interface TerminalMessage {
  type: 'command' | 'output' | 'error' | 'info' | 'clear';
  data: string;
  sessionId: string;
  timestamp: Date;
}