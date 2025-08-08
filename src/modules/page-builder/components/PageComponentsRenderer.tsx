"use client";

import React from "react";
import { PageComponent } from "../types";
import { ComponentRenderer } from "./ComponentRenderer";

interface PageComponentsRendererProps {
  components: PageComponent[];
  isPreview?: boolean;
}

export function PageComponentsRenderer({
  components,
  isPreview = false,
}: PageComponentsRendererProps) {
  if (!components || !Array.isArray(components) || components.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No components to display
      </div>
    );
  }

  return (
    <div
      className={`page-components-renderer ${isPreview ? "preview-mode" : ""}`}
    >
      {components.map((component, index) => (
        <div key={component.id || index} className="component-wrapper">
          <ComponentRenderer component={component} />
        </div>
      ))}
    </div>
  );
}
