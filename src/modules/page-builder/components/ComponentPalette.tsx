"use client";

import React from "react";
import { ComponentType } from "../types";
import { componentDefinitions } from "../data/component-definitions";
import { useTranslation } from "@/modules/i18n/hooks/useTranslation";
import { useDraggable } from "@dnd-kit/core";

interface ComponentPaletteProps {
  onComponentAdd: (type: ComponentType) => void;
}

function DraggableComponentItem({
  type,
  onAdd,
}: {
  type: ComponentType;
  onAdd: () => void;
}) {
  const { language } = useTranslation();
  const definition = componentDefinitions[type];

  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `palette-${type}`,
    data: { type, isNew: true },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="component-palette-item w-full p-3 bg-white border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-all cursor-move group"
      onClick={onAdd}
    >
      <div className="flex items-center space-x-3">
        <div
          className="w-5 h-5 text-gray-500 group-hover:text-primary-600 flex-shrink-0"
          dangerouslySetInnerHTML={{ __html: definition.icon }}
        />
        <span className="text-sm font-medium text-gray-700 group-hover:text-primary-600">
          {definition.label[language]}
        </span>
      </div>
    </div>
  );
}

export function ComponentPalette({ onComponentAdd }: ComponentPaletteProps) {
  const { t } = useTranslation();

  // Only include components that have definitions
  const availableComponents = Object.keys(
    componentDefinitions,
  ) as ComponentType[];

  const componentCategories = {
    basic: availableComponents.filter((type) =>
      ["text", "heading", "image", "button", "spacer", "divider"].includes(
        type,
      ),
    ),
    media: availableComponents.filter((type) =>
      ["video", "gallery", "map", "social"].includes(type),
    ),
    interactive: availableComponents.filter((type) =>
      ["form", "accordion", "tabs", "newsletter"].includes(type),
    ),
    advanced: availableComponents.filter((type) =>
      ["html", "embed", "menu"].includes(type),
    ),
  };

  return (
    <div className="component-palette">
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="text-lg font-semibold">{t("actions.add")} Component</h3>
      </div>

      <div className="p-4 pb-8 space-y-4">
        {Object.entries(componentCategories).map(([category, types]) =>
          types.length > 0 ? (
            <div key={category}>
              <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">
                {category}
              </h4>
              <div className="space-y-2">
                {types.map((type) => (
                  <DraggableComponentItem
                    key={type}
                    type={type as ComponentType}
                    onAdd={() => onComponentAdd(type as ComponentType)}
                  />
                ))}
              </div>
            </div>
          ) : null,
        )}
      </div>
    </div>
  );
}
