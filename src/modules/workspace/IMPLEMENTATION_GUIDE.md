# Workspace Module Implementation Guide

## ✅ Completed Components

### 1. TypeScript Types (`types/workspace.types.ts`)

- ✅ Project interface
- ✅ FileNode interface
- ✅ Script interface
- ✅ TerminalSession interface
- ✅ ProjectSettings interface
- ✅ WorkspaceState interface
- ✅ DTOs for Create/Update operations

### 2. Database Schema (Added to `prisma/schema.prisma`)

- ✅ Project model
- ✅ TerminalSession model
- ✅ TerminalCommand model

### 3. Services

- ✅ `project.service.ts` - Project management
  - Create/Read/Update/Delete projects
  - Scan project structure
  - Import/Export projects
  - Manage scripts and env variables
- ✅ `terminal.service.ts` - Terminal management
  - Create terminal sessions
  - Execute commands
  - Handle output/input
  - Session management
  - WebSocket integration ready

- ✅ `filesystem.service.ts` - File system operations
  - Scan directories
  - Read/Write files
  - Search files
  - Git integration

## 🚧 Next Steps to Complete

### 1. Run Database Migration

```bash
npx prisma generate
npx prisma migrate dev --name add_workspace_module
```

### 2. Install Required Dependencies

```bash
npm install node-pty xterm xterm-addon-fit socket.io socket.io-client
npm install @types/node-pty --save-dev
```

### 3. Create UI Components

#### A. Sidebar Components (`components/Sidebar/`)

**ProjectSelector.tsx**

```tsx
import React, { useState, useEffect } from "react";
import { Project } from "../../types";
import { useWorkspace } from "../../hooks/useWorkspace";

export const ProjectSelector: React.FC = () => {
  const { projects, currentProject, selectProject, createProject } =
    useWorkspace();
  // Implementation here
};
```

**ConfigPanel.tsx**

```tsx
import React from "react";
import { Project } from "../../types";
import FileTree from "./FileTree";

interface ConfigPanelProps {
  project: Project;
  onUpdate: (project: Project) => void;
}

export const ConfigPanel: React.FC<ConfigPanelProps> = ({
  project,
  onUpdate,
}) => {
  // Implementation here
};
```

**FileTree.tsx**

```tsx
import React from "react";
import { FileNode } from "../../types";

interface FileTreeProps {
  nodes: FileNode[];
  onNodeClick?: (node: FileNode) => void;
}

export const FileTree: React.FC<FileTreeProps> = ({ nodes, onNodeClick }) => {
  // Implementation here
};
```

#### B. Terminal Components (`components/Terminal/`)

**SystemTerminal.tsx**

```tsx
import React, { useEffect, useRef } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import { useTerminal } from "../../hooks/useTerminal";
import "xterm/css/xterm.css";

interface SystemTerminalProps {
  sessionId: string;
  projectPath: string;
}

export const SystemTerminal: React.FC<SystemTerminalProps> = ({
  sessionId,
  projectPath,
}) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const { sendCommand, onData } = useTerminal(sessionId);

  useEffect(() => {
    if (!terminalRef.current) return;

    const terminal = new Terminal({
      theme: {
        background: "#1e1e1e",
        foreground: "#d4d4d4",
      },
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(terminalRef.current);
    fitAddon.fit();

    terminal.onData((data) => {
      sendCommand(data);
    });

    return () => terminal.dispose();
  }, [sessionId]);

  return <div ref={terminalRef} className="h-full w-full" />;
};
```

**ClaudeTerminal.tsx**

```tsx
// Similar to SystemTerminal but with Claude-specific features
// Auto-suggestions, command history, etc.
```

**TerminalTab.tsx**

```tsx
import React from "react";
import { TerminalSession } from "../../types";

interface TerminalTabProps {
  session: TerminalSession;
  active: boolean;
  onSelect: () => void;
  onClose: () => void;
}

export const TerminalTab: React.FC<TerminalTabProps> = ({
  session,
  active,
  onSelect,
  onClose,
}) => {
  // Implementation here
};
```

#### C. Layout Component (`components/Layout/WorkspaceLayout.tsx`)

```tsx
import React, { useState } from "react";
import { ProjectSelector } from "../Sidebar/ProjectSelector";
import { ConfigPanel } from "../Sidebar/ConfigPanel";
import { SystemTerminal } from "../Terminal/SystemTerminal";
import { ClaudeTerminal } from "../Terminal/ClaudeTerminal";
import { TerminalTab } from "../Terminal/TerminalTab";

export const WorkspaceLayout: React.FC = () => {
  const [sidebarWidth, setSidebarWidth] = useState(300);
  const [terminalHeight, setTerminalHeight] = useState(50); // percentage

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div style={{ width: sidebarWidth }} className="border-r">
        <ProjectSelector />
        <ConfigPanel />
      </div>

      {/* Terminal Zone */}
      <div className="flex-1 flex flex-col">
        {/* System Terminal */}
        <div style={{ height: `${100 - terminalHeight}%` }}>
          <SystemTerminal />
        </div>

        {/* Claude Terminal */}
        <div style={{ height: `${terminalHeight}%` }}>
          <ClaudeTerminal />
        </div>
      </div>
    </div>
  );
};
```

### 4. Create Hooks

**useWorkspace.ts**

```tsx
import { useState, useEffect } from "react";
import { Project, WorkspaceState } from "../types";

export const useWorkspace = () => {
  const [state, setState] = useState<WorkspaceState>({
    currentProject: null,
    projects: [],
    terminals: { system: [], claude: [] },
    activeSystemTab: null,
    activeClaudeTab: null,
    sidebarCollapsed: false,
    loading: false,
    error: null,
  });

  // Implementation
  return {
    ...state,
    selectProject,
    createProject,
    updateProject,
    deleteProject,
  };
};
```

**useTerminal.ts**

```tsx
import { useEffect, useRef } from "react";
import io, { Socket } from "socket.io-client";

export const useTerminal = (sessionId: string) => {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    socketRef.current = io("/terminal");

    socketRef.current.emit("join", { sessionId });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [sessionId]);

  const sendCommand = (command: string) => {
    socketRef.current?.emit("command", { sessionId, command });
  };

  return { sendCommand, socket: socketRef.current };
};
```

### 5. Create API Routes

**`src/app/api/workspace/projects/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { projectService } from "@/modules/workspace/services/project.service";

export async function GET() {
  const projects = await projectService.getProjects();
  return NextResponse.json(projects);
}

export async function POST(request: NextRequest) {
  const data = await request.json();
  const project = await projectService.createProject(data);
  return NextResponse.json(project);
}
```

**`src/app/api/workspace/projects/[id]/route.ts`**

```typescript
// GET, PUT, DELETE endpoints for specific project
```

**`src/app/api/workspace/terminal/route.ts`**

```typescript
// Terminal session management endpoints
```

### 6. Create WebSocket Handler

**`src/modules/workspace/handlers/terminal.socket.ts`**

```typescript
import { Server } from "socket.io";
import { terminalService } from "../services/terminal.service";

export function setupTerminalSocket(io: Server) {
  const terminalNamespace = io.of("/terminal");

  terminalNamespace.on("connection", (socket) => {
    socket.on("join", async ({ sessionId }) => {
      socket.join(sessionId);
      // Connect to terminal service
    });

    socket.on("command", async ({ sessionId, command }) => {
      await terminalService.executeCommand(sessionId, command);
    });

    socket.on("resize", async ({ sessionId, cols, rows }) => {
      await terminalService.resizeTerminal(sessionId, cols, rows);
    });
  });

  // Listen to terminal service events
  terminalService.on("output", (message) => {
    terminalNamespace.to(message.sessionId).emit("output", message);
  });
}
```

### 7. Create Main Workspace Page

**`src/app/workspace/page.tsx`**

```tsx
"use client";

import React from "react";
import { WorkspaceLayout } from "@/modules/workspace/components/Layout/WorkspaceLayout";

export default function WorkspacePage() {
  return <WorkspaceLayout />;
}
```

### 8. Add to Module Index

**`src/modules/workspace/index.ts`**

```typescript
export * from "./types";
export * from "./services/project.service";
export * from "./services/terminal.service";
export * from "./services/filesystem.service";
export { WorkspaceLayout } from "./components/Layout/WorkspaceLayout";
```

## 📋 Testing Checklist

- [ ] Database migration successful
- [ ] Can create new project
- [ ] File tree displays correctly
- [ ] Terminal sessions start properly
- [ ] Commands execute in terminals
- [ ] WebSocket connection works
- [ ] Can switch between projects
- [ ] Sessions persist on refresh
- [ ] Resizing works properly
- [ ] Multiple tabs work

## 🎨 Styling Recommendations

Use Tailwind CSS classes:

- Dark theme for terminals
- Resizable panels using react-resizable-panels
- Tab interface using headlessui
- Icons using heroicons

## 🔧 Configuration

Add to `.env.local`:

```env
WORKSPACE_MAX_TERMINALS=10
WORKSPACE_TERMINAL_TIMEOUT=3600000
WORKSPACE_AUTO_SAVE=true
```

## 📦 Additional Dependencies to Consider

```bash
npm install react-resizable-panels
npm install @headlessui/react @heroicons/react
npm install monaco-editor @monaco-editor/react  # For code viewing
npm install react-hotkeys-hook  # For keyboard shortcuts
```

## 🚀 Next Development Phase

1. Add file editor integration
2. Add git visualization
3. Add terminal themes
4. Add command palette
5. Add workspace templates
6. Add collaboration features
7. Add terminal recording/playback
8. Add AI command suggestions
