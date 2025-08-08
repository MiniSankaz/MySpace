"use client";

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { PageComponent } from "../types";
import { ComponentRenderer } from "./ComponentRenderer";

interface SortableComponentProps {
  component: PageComponent;
  isSelected: boolean;
  onClick: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  isPreview?: boolean;
}

export function SortableComponent({
  component,
  isSelected,
  onClick,
  onDelete,
  onDuplicate,
  isPreview = false,
}: SortableComponentProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: component.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        sortable-component relative flex group
        ${isDragging ? "opacity-50" : ""}
        ${isSelected ? "ring-2 ring-primary-500 ring-offset-2 rounded-lg" : ""}
      `}
    >
      {/* Drag Handle - Always visible on the left */}
      {!isPreview && (
        <div
          {...attributes}
          {...listeners}
          className="flex items-center px-2 cursor-move text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors rounded-l-lg"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 8h16M4 16h16"
            />
          </svg>
        </div>
      )}

      {/* Component Content Container */}
      <div className="flex-1 relative" onClick={onClick}>
        {/* Component Actions */}
        {!isPreview && (
          <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10">
            <button
              className="p-1.5 bg-white rounded shadow-sm hover:bg-gray-50 border border-gray-200"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate();
              }}
              title="Duplicate component"
            >
              <svg
                className="w-4 h-4 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            </button>
            <button
              className="p-1.5 bg-white rounded shadow-sm hover:bg-red-50 border border-gray-200"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              title="Delete component"
            >
              <svg
                className="w-4 h-4 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>
        )}

        {/* Component Content */}
        <div className="cursor-pointer">
          <ComponentRenderer component={component} />
        </div>
      </div>
    </div>
  );
}
