import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  PanelLeft,
  PanelLeftClose,
  PanelBottom,
  PanelBottomClose,
  Maximize2,
  Minimize2,
  X,
  FolderOpen,
  Terminal,
  Code2,
} from "lucide-react";
import { Button } from "../ui/Button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/Tabs";

interface WorkspaceLayoutProps {
  children: React.ReactNode;
  fileExplorer?: React.ReactNode;
  terminal?: React.ReactNode;
  sidebar?: React.ReactNode;
  className?: string;
  defaultLayout?: "default" | "full" | "focus";
  onLayoutChange?: (layout: string) => void;
}

interface PanelSizes {
  sidebar: number;
  terminal: number;
  explorer: number;
}

const WorkspaceLayout: React.FC<WorkspaceLayoutProps> = ({
  children,
  fileExplorer,
  terminal,
  sidebar,
  className,
  defaultLayout = "default",
  onLayoutChange,
}) => {
  const [layout, setLayout] = useState(defaultLayout);
  const [showExplorer, setShowExplorer] = useState(true);
  const [showTerminal, setShowTerminal] = useState(true);
  const [showSidebar, setShowSidebar] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [panelSizes, setPanelSizes] = useState<PanelSizes>({
    sidebar: 20,
    terminal: 30,
    explorer: 20,
  });

  const [isResizing, setIsResizing] = useState<
    "explorer" | "terminal" | "sidebar" | null
  >(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle panel resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const containerWidth = containerRect.width;
      const containerHeight = containerRect.height;

      if (isResizing === "explorer") {
        const newWidth =
          ((e.clientX - containerRect.left) / containerWidth) * 100;
        setPanelSizes((prev) => ({
          ...prev,
          explorer: Math.min(Math.max(newWidth, 10), 40),
        }));
      } else if (isResizing === "terminal") {
        const newHeight =
          ((containerRect.bottom - e.clientY) / containerHeight) * 100;
        setPanelSizes((prev) => ({
          ...prev,
          terminal: Math.min(Math.max(newHeight, 10), 60),
        }));
      } else if (isResizing === "sidebar") {
        const newWidth =
          ((containerRect.right - e.clientX) / containerWidth) * 100;
        setPanelSizes((prev) => ({
          ...prev,
          sidebar: Math.min(Math.max(newWidth, 15), 40),
        }));
      }
    };

    const handleMouseUp = () => {
      setIsResizing(null);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    if (isResizing) {
      document.body.style.cursor =
        isResizing === "terminal" ? "ns-resize" : "ew-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  // Handle fullscreen
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const handleLayoutChange = (newLayout: string) => {
    setLayout(newLayout);
    onLayoutChange?.(newLayout);

    // Adjust panels based on layout
    switch (newLayout) {
      case "full":
        setShowExplorer(false);
        setShowTerminal(false);
        setShowSidebar(false);
        break;
      case "focus":
        setShowExplorer(true);
        setShowTerminal(false);
        setShowSidebar(false);
        break;
      default:
        setShowExplorer(true);
        setShowTerminal(true);
        setShowSidebar(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "workspace-layout flex h-full bg-background relative",
        isFullscreen && "fixed inset-0 z-50",
        className,
      )}
    >
      {/* File Explorer Panel */}
      {showExplorer && fileExplorer && (
        <>
          <div
            className={cn(
              "workspace-explorer bg-muted/50 border-r flex flex-col overflow-hidden",
              "transition-all duration-200",
            )}
            style={{ width: `${panelSizes.explorer}%` }}
          >
            <div className="flex items-center justify-between px-2 py-1 border-b bg-muted">
              <div className="flex items-center space-x-1">
                <FolderOpen className="h-4 w-4" />
                <span className="text-sm font-medium">Explorer</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowExplorer(false)}
                className="h-6 w-6 p-0"
              >
                <PanelLeftClose className="h-3 w-3" />
              </Button>
            </div>
            <div className="flex-1 overflow-auto">{fileExplorer}</div>
          </div>

          {/* Explorer Resize Handle */}
          <div
            className="w-1 bg-border hover:bg-primary/50 cursor-ew-resize transition-colors"
            onMouseDown={() => setIsResizing("explorer")}
          />
        </>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="workspace-toolbar flex items-center justify-between px-2 py-1 border-b bg-muted/50">
          <div className="flex items-center space-x-1">
            {!showExplorer && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowExplorer(true)}
                className="h-7 px-2"
              >
                <PanelLeft className="h-4 w-4 mr-1" />
                Explorer
              </Button>
            )}

            <div className="flex items-center space-x-1 ml-2">
              <Button
                variant={layout === "default" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => handleLayoutChange("default")}
                className="h-7 px-2"
              >
                Default
              </Button>
              <Button
                variant={layout === "focus" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => handleLayoutChange("focus")}
                className="h-7 px-2"
              >
                Focus
              </Button>
              <Button
                variant={layout === "full" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => handleLayoutChange("full")}
                className="h-7 px-2"
              >
                Full
              </Button>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            {!showTerminal && terminal && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowTerminal(true)}
                className="h-7 px-2"
              >
                <Terminal className="h-4 w-4 mr-1" />
                Terminal
              </Button>
            )}

            {sidebar && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSidebar(!showSidebar)}
                className="h-7 px-2"
              >
                <Code2 className="h-4 w-4 mr-1" />
                Sidebar
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={toggleFullscreen}
              className="h-7 w-7 p-0"
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Editor/Content Area with Terminal */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Main Editor/Content */}
          <div
            className={cn("flex-1 overflow-auto", showTerminal && "border-b")}
            style={{
              height: showTerminal ? `${100 - panelSizes.terminal}%` : "100%",
            }}
          >
            <div className="h-full flex">
              {/* Main Content */}
              <div className="flex-1 overflow-auto">{children}</div>

              {/* Optional Sidebar */}
              {showSidebar && sidebar && (
                <>
                  {/* Sidebar Resize Handle */}
                  <div
                    className="w-1 bg-border hover:bg-primary/50 cursor-ew-resize transition-colors"
                    onMouseDown={() => setIsResizing("sidebar")}
                  />

                  <div
                    className="workspace-sidebar bg-muted/50 border-l overflow-auto"
                    style={{ width: `${panelSizes.sidebar}%` }}
                  >
                    {sidebar}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Terminal Panel */}
          {showTerminal && terminal && (
            <>
              {/* Terminal Resize Handle */}
              <div
                className="h-1 bg-border hover:bg-primary/50 cursor-ns-resize transition-colors"
                onMouseDown={() => setIsResizing("terminal")}
              />

              <div
                className="workspace-terminal bg-muted/50"
                style={{ height: `${panelSizes.terminal}%` }}
              >
                <div className="flex items-center justify-between px-2 py-1 border-b bg-muted">
                  <div className="flex items-center space-x-1">
                    <Terminal className="h-4 w-4" />
                    <span className="text-sm font-medium">Terminal</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowTerminal(false)}
                    className="h-6 w-6 p-0"
                  >
                    <PanelBottomClose className="h-3 w-3" />
                  </Button>
                </div>
                <div className="h-[calc(100%-2rem)] overflow-auto">
                  {terminal}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

WorkspaceLayout.displayName = "WorkspaceLayout";

export default WorkspaceLayout;
export type { WorkspaceLayoutProps };
