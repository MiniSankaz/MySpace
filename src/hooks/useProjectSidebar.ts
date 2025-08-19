import { useState, useEffect, useCallback } from "react";
import { terminalConfig, getWebSocketUrl } from "@/config/terminal.config";
import { Project } from "@/types/project";

interface SidebarSettings {
  isCollapsed: boolean;
  width: number;
  sortBy: string;
  viewMode: string;
  showStatusIndicators: boolean;
  groupBy?: string;
}

interface ProjectPreferences {
  isPinned: boolean;
  customIcon?: string;
  customColor?: string;
  sortOrder: number;
  lastAccessedAt: Date;
}

export function useProjectSidebar() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [sidebarSettings, setSidebarSettings] =
    useState<SidebarSettings | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load projects and preferences
  const loadProjects = useCallback(async () => {
    try {
      const response = await fetch("/api/workspace/projects/preferences", {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects);
      }
    } catch (error) {
      console.error("Failed to load projects:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load sidebar settings
  const loadSettings = useCallback(async () => {
    try {
      const response = await fetch("/api/workspace/sidebar/settings", {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setSidebarSettings(data.settings);
        setIsCollapsed(data.settings.isCollapsed);
      }
    } catch (error) {
      console.error("Failed to load sidebar settings:", error);
    }
  }, []);

  // Update sidebar settings
  const updateSettings = useCallback(
    async (updates: Partial<SidebarSettings>) => {
      try {
        const response = await fetch("/api/workspace/sidebar/settings", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(updates),
        });

        if (response.ok) {
          const data = await response.json();
          setSidebarSettings(data.settings);
          if (updates.isCollapsed !== undefined) {
            setIsCollapsed(updates.isCollapsed);
          }
        }
      } catch (error) {
        console.error("Failed to update sidebar settings:", error);
      }
    },
    [],
  );

  // Update project preferences
  const updateProjectPreference = useCallback(
    async (projectId: string, preferences: Partial<ProjectPreferences>) => {
      try {
        const response = await fetch("/api/workspace/projects/preferences", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            projectId,
            ...preferences,
          }),
        });

        if (response.ok) {
          // Reload projects to get updated preferences
          await loadProjects();
        }
      } catch (error) {
        console.error("Failed to update project preferences:", error);
      }
    },
    [loadProjects],
  );

  // Toggle sidebar
  const toggleSidebar = useCallback(() => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    updateSettings({ isCollapsed: newState });
  }, [isCollapsed, updateSettings]);

  // Initial load
  useEffect(() => {
    loadProjects();
    loadSettings();

    // Set up WebSocket for real-time status updates
    const wsUrl = getWebSocketUrl("system");
    const ws = new WebSocket(`${wsUrl}/project-status`);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "status-update") {
          // Update project status in state
          setProjects((prev) =>
            prev.map((project) =>
              project.id === data.projectId
                ? { ...project, statusCache: data.status }
                : project,
            ),
          );
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [loadProjects, loadSettings]);

  return {
    projects,
    sidebarSettings,
    isCollapsed,
    loading,
    toggleSidebar,
    updateSettings,
    updateProjectPreference,
    refreshProjects: loadProjects,
  };
}
