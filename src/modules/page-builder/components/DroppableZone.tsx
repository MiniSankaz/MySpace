"use client";

import React, { ReactNode } from "react";
import { useDroppable } from "@dnd-kit/core";

interface DroppableZoneProps {
  zoneId: string;
  children: ReactNode;
  className?: string;
}

export function DroppableZone({
  zoneId,
  children,
  className = "",
}: DroppableZoneProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: zoneId,
  });

  return (
    <div
      ref={setNodeRef}
      className={`
        droppable-zone relative border-2 border-dashed rounded-lg p-4
        ${isOver ? "border-primary-500 bg-primary-50" : "border-gray-300"}
        ${className}
      `}
    >
      {children}
      {!children || (Array.isArray(children) && children.length === 0) ? (
        <div className="text-center text-gray-400 py-8">
          <svg
            className="mx-auto h-12 w-12 text-gray-300"
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
          <p className="mt-2 text-sm">Drop components here</p>
        </div>
      ) : null}
    </div>
  );
}
