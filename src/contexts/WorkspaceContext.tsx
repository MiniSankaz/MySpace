"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { Project } from "@/types/project";

interface WorkspaceContextType {
  currentProject: Project | null;
  setCurrentProject: (project: Project | null) => void;
  workspacePath: string;
  setWorkspacePath: (path: string) => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(
  undefined,
);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [workspacePath, setWorkspacePath] = useState("/");

  return (
    <WorkspaceContext.Provider
      value={{
        currentProject,
        setCurrentProject,
        workspacePath,
        setWorkspacePath,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspaceContext() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error(
      "useWorkspaceContext must be used within WorkspaceProvider",
    );
  }
  return context;
}
