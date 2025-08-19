// Main exports for workspace module
export * from "./types";
export * from "./services/project.service";
export * from "./services/filesystem.service";
export { default as WorkspaceLayout } from "./components/Layout/WorkspaceLayout";
export { useWorkspace, WorkspaceProvider } from "./contexts/WorkspaceContext";
export { useTerminal } from "./hooks/useTerminal";
