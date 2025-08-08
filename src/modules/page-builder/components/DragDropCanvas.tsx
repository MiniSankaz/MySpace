"use client";

import React from "react";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { PageComponent } from "../types";
import { SortableComponent } from "./SortableComponent";

interface DragDropCanvasProps {
  components: PageComponent[];
  selectedComponentId?: string;
  onComponentSelect: (component: PageComponent) => void;
  onComponentDelete: (componentId: string) => void;
  onComponentDuplicate: (componentId: string) => void;
  isPreview?: boolean;
}

export function DragDropCanvas({
  components,
  selectedComponentId,
  onComponentSelect,
  onComponentDelete,
  onComponentDuplicate,
  isPreview = false,
}: DragDropCanvasProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: "canvas",
  });

  return (
    <div
      ref={setNodeRef}
      className={`
        page-builder-canvas min-h-[600px] bg-white rounded-lg shadow-sm relative
        ${isOver ? "ring-2 ring-primary-500 ring-offset-2" : ""}
        ${components.length === 0 ? "border-2 border-dashed border-gray-300" : "border border-gray-200"}
      `}
    >
      <SortableContext
        items={components.map((c) => c.id)}
        strategy={verticalListSortingStrategy}
      >
        {components.length > 0 ? (
          <div className="p-8 space-y-3">
            {components.map((component) => (
              <SortableComponent
                key={component.id}
                component={component}
                isSelected={component.id === selectedComponentId}
                onClick={() => onComponentSelect(component)}
                onDelete={() => onComponentDelete(component.id)}
                onDuplicate={() => onComponentDuplicate(component.id)}
                isPreview={isPreview}
              />
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full p-12 text-center">
            <div>
              <svg
                className="mx-auto h-16 w-16 text-gray-300 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <p className="text-lg font-medium text-gray-900 mb-1">
                Start building your page
              </p>
              <p className="text-sm text-gray-500">
                Drag components from the left panel or select a template
              </p>
            </div>
          </div>
        )}
      </SortableContext>
    </div>
  );
}
