export interface Project {
  id: string;
  name: string;
  description?: string;
  path: string;
  structure?: any;
  envVariables?: any;
  scripts?: any[];
  settings?: any;
  createdAt: Date | string;
  updatedAt: Date | string;
  preferences?: ProjectPreferences;
  statusCache?: ProjectStatusCache;
}

export interface ProjectPreferences {
  isPinned: boolean;
  customIcon?: string;
  customColor?: string;
  sortOrder: number;
  lastAccessedAt: Date | string;
}

export interface ProjectStatusCache {
  gitStatus?: {
    isDirty: boolean;
    branch: string;
    ahead: number;
    behind: number;
  };
  terminalStatus?: {
    active: boolean;
    sessions: number;
  };
  buildStatus?: string;
  hasErrors: boolean;
  hasWarnings: boolean;
  lastUpdatedAt: Date | string;
}
