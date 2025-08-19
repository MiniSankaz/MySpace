import React, { useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { TouchBackend } from "react-dnd-touch-backend";
import { Maximize2, Minimize2, X, GripVertical } from "lucide-react";
import { Button } from "../ui/Button";

export interface DashboardWidget {
  id: string;
  type: string;
  title: string;
  content: React.ReactNode;
  size: "sm" | "md" | "lg" | "xl";
  position?: { x: number; y: number };
  config?: Record<string, any>;
  refreshInterval?: number;
  onRefresh?: () => void;
  onRemove?: () => void;
  onResize?: (size: DashboardWidget["size"]) => void;
}

export interface WidgetLayout {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface DashboardLayoutProps {
  widgets: DashboardWidget[];
  onLayoutChange?: (layout: WidgetLayout[]) => void;
  onWidgetRemove?: (widgetId: string) => void;
  onWidgetResize?: (widgetId: string, size: DashboardWidget["size"]) => void;
  gridColumns?: number;
  gap?: number;
  className?: string;
  editMode?: boolean;
}

const sizeToGrid = {
  sm: { w: 1, h: 1 },
  md: { w: 2, h: 2 },
  lg: { w: 3, h: 2 },
  xl: { w: 4, h: 3 },
};

const DraggableWidget: React.FC<{
  widget: DashboardWidget;
  index: number;
  moveWidget: (dragIndex: number, hoverIndex: number) => void;
  onRemove?: () => void;
  onResize?: (size: DashboardWidget["size"]) => void;
  editMode: boolean;
}> = ({ widget, index, moveWidget, onRemove, onResize, editMode }) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [{ isDragging }, drag, preview] = useDrag({
    type: "widget",
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    canDrag: editMode,
  });

  const [, drop] = useDrop({
    accept: "widget",
    hover: (item: { index: number }) => {
      if (item.index !== index) {
        moveWidget(item.index, index);
        item.index = index;
      }
    },
    canDrop: () => editMode,
  });

  const handleMaximize = () => {
    setIsMaximized(!isMaximized);
    if (!isMaximized) {
      onResize?.("xl");
    } else {
      onResize?.(widget.size);
    }
  };

  return (
    <div
      ref={(node) => preview(drop(node))}
      className={cn(
        "dashboard-widget relative bg-card rounded-lg border shadow-sm transition-all duration-200",
        `col-span-${sizeToGrid[widget.size].w} row-span-${sizeToGrid[widget.size].h}`,
        isDragging && "opacity-50",
        isMaximized && "fixed inset-4 z-50 col-span-1 row-span-1",
        "hover:shadow-md",
      )}
    >
      {/* Widget Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/50 rounded-t-lg">
        <div className="flex items-center space-x-2">
          {editMode && (
            <div ref={drag} className="cursor-move">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
          <h3 className="font-semibold text-sm">{widget.title}</h3>
        </div>

        <div className="flex items-center space-x-1">
          {widget.onRefresh && (
            <Button
              variant="ghost"
              size="sm"
              onClick={widget.onRefresh}
              className="h-6 w-6 p-0"
              aria-label="Refresh widget"
            >
              <svg
                className="h-3 w-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={handleMaximize}
            className="h-6 w-6 p-0"
            aria-label={isMaximized ? "Minimize widget" : "Maximize widget"}
          >
            {isMaximized ? (
              <Minimize2 className="h-3 w-3" />
            ) : (
              <Maximize2 className="h-3 w-3" />
            )}
          </Button>

          {editMode && onRemove && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRemove}
              className="h-6 w-6 p-0 hover:text-destructive"
              aria-label="Remove widget"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Widget Content */}
      <div className="p-4 overflow-auto h-[calc(100%-2.5rem)]">
        {widget.content}
      </div>
    </div>
  );
};

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  widgets,
  onLayoutChange,
  onWidgetRemove,
  onWidgetResize,
  gridColumns = 4,
  gap = 4,
  className,
  editMode = false,
}) => {
  const [localWidgets, setLocalWidgets] = useState(widgets);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    setLocalWidgets(widgets);
  }, [widgets]);

  useEffect(() => {
    // Detect touch device
    setIsTouchDevice("ontouchstart" in window);

    // Load saved layout from localStorage
    const savedLayout = localStorage.getItem("dashboardLayout");
    if (savedLayout && onLayoutChange) {
      try {
        const layout = JSON.parse(savedLayout);
        onLayoutChange(layout);
      } catch (error) {
        console.error("Failed to load dashboard layout:", error);
      }
    }
  }, [onLayoutChange]);

  const moveWidget = useCallback(
    (dragIndex: number, hoverIndex: number) => {
      const draggedWidget = localWidgets[dragIndex];
      const newWidgets = [...localWidgets];
      newWidgets.splice(dragIndex, 1);
      newWidgets.splice(hoverIndex, 0, draggedWidget);

      setLocalWidgets(newWidgets);

      // Save layout to localStorage
      const layout = newWidgets.map((widget, index) => ({
        id: widget.id,
        x: (index % gridColumns) * sizeToGrid[widget.size].w,
        y: Math.floor(index / gridColumns) * sizeToGrid[widget.size].h,
        w: sizeToGrid[widget.size].w,
        h: sizeToGrid[widget.size].h,
      }));

      localStorage.setItem("dashboardLayout", JSON.stringify(layout));
      onLayoutChange?.(layout);
    },
    [localWidgets, gridColumns, onLayoutChange],
  );

  const handleWidgetRemove = (widgetId: string) => {
    setLocalWidgets((prev) => prev.filter((w) => w.id !== widgetId));
    onWidgetRemove?.(widgetId);
  };

  const handleWidgetResize = (
    widgetId: string,
    size: DashboardWidget["size"],
  ) => {
    setLocalWidgets((prev) =>
      prev.map((w) => (w.id === widgetId ? { ...w, size } : w)),
    );
    onWidgetResize?.(widgetId, size);
  };

  const Backend = isTouchDevice ? TouchBackend : HTML5Backend;

  return (
    <DndProvider backend={Backend}>
      <div
        className={cn(
          "dashboard-grid grid auto-rows-min",
          `gap-${gap}`,
          className,
        )}
        style={{
          gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))`,
        }}
      >
        {localWidgets.map((widget, index) => (
          <DraggableWidget
            key={widget.id}
            widget={widget}
            index={index}
            moveWidget={moveWidget}
            onRemove={() => handleWidgetRemove(widget.id)}
            onResize={(size) => handleWidgetResize(widget.id, size)}
            editMode={editMode}
          />
        ))}

        {localWidgets.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-muted-foreground">
            <svg
              className="h-12 w-12 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
              />
            </svg>
            <p className="text-lg font-medium mb-1">No widgets added</p>
            <p className="text-sm">Add widgets to customize your dashboard</p>
          </div>
        )}
      </div>
    </DndProvider>
  );
};

DashboardLayout.displayName = "DashboardLayout";

export default DashboardLayout;
export type { DashboardLayoutProps, DashboardWidget, WidgetLayout };
