"use client";

import React, { useState, useEffect } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  pointerWithin,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { PageComponent, ComponentType, PageTemplate } from "../types";
import { DragDropCanvas } from "./DragDropCanvas";
import { ComponentPalette } from "./ComponentPalette";
import { PropertyPanel } from "./PropertyPanel";
import { TemplateSelector } from "./TemplateSelector";
import { componentDefinitions } from "../data/component-definitions";
import { useTranslation } from "@/modules/i18n/hooks/useTranslation";
import { PageService } from "../services/pageService";
import Modal from "@/components/ui/Modal";

interface PageBuilderProps {
  pageId?: string;
  initialComponents?: PageComponent[];
  onSave?: (components: PageComponent[]) => void;
}

export function PageBuilder({
  pageId,
  initialComponents = [],
  onSave,
}: PageBuilderProps) {
  const { t, language } = useTranslation();
  const [components, setComponents] =
    useState<PageComponent[]>(initialComponents);
  const [selectedComponent, setSelectedComponent] =
    useState<PageComponent | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPreview, setIsPreview] = useState(false);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 8,
      },
    }),
  );

  useEffect(() => {
    if (pageId) {
      loadPage();
    }
  }, [pageId]);

  const loadPage = async () => {
    if (!pageId) return;

    try {
      const page = await PageService.getPage(pageId);
      if (page) {
        // Check for components in the dedicated field first
        if ((page as any).components) {
          setComponents((page as any).components as PageComponent[]);
        }
        // Fallback to parsing content field for backward compatibility
        else if ((page as any).content) {
          try {
            const parsed = JSON.parse((page as any).content);
            if (Array.isArray(parsed)) {
              setComponents(parsed as PageComponent[]);
            } else if (parsed.components && Array.isArray(parsed.components)) {
              setComponents(parsed.components as PageComponent[]);
            }
          } catch (e) {
            console.error("Failed to parse content:", e);
          }
        }
      }
    } catch (error) {
      console.error("Failed to load page:", error);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setIsDragging(true);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setIsDragging(false);

    if (!over) return;

    // Handle new component from palette
    if (active.data.current?.isNew) {
      const componentType = active.data.current.type as ComponentType;
      addComponent(componentType, over.id as string);
      return;
    }

    // Handle reordering existing components
    if (active.id !== over.id) {
      setComponents((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    // Handle drag over logic if needed
  };

  const addComponent = (type: ComponentType, targetId?: string) => {
    const definition = componentDefinitions[type];
    const newComponent: PageComponent = {
      id: `component-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      content: definition.defaultContent || {},
      settings: definition.defaultSettings || {},
      order: components.length,
    };

    if (targetId === "canvas") {
      setComponents([...components, newComponent]);
    } else {
      // Insert after target component
      const targetIndex = components.findIndex((c) => c.id === targetId);
      if (targetIndex >= 0) {
        const newComponents = [...components];
        newComponents.splice(targetIndex + 1, 0, newComponent);
        setComponents(newComponents);
      } else {
        setComponents([...components, newComponent]);
      }
    }
  };

  const updateComponent = (
    componentId: string,
    updates: Partial<PageComponent>,
  ) => {
    console.log("Updating component:", componentId, "with:", updates);
    setComponents((prevComponents) =>
      prevComponents.map((component) =>
        component.id === componentId ? { ...component, ...updates } : component,
      ),
    );
    // Update selectedComponent if it's the one being edited
    if (selectedComponent?.id === componentId) {
      setSelectedComponent((prev) => (prev ? { ...prev, ...updates } : null));
    }
  };

  const deleteComponent = (componentId: string) => {
    setComponents((prevComponents) =>
      prevComponents.filter((component) => component.id !== componentId),
    );
    if (selectedComponent?.id === componentId) {
      setSelectedComponent(null);
    }
  };

  const duplicateComponent = (componentId: string) => {
    const component = components.find((c) => c.id === componentId);
    if (!component) return;

    const newComponent: PageComponent = {
      ...component,
      id: `component-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      order: component.order + 0.5,
    };

    const index = components.findIndex((c) => c.id === componentId);
    const newComponents = [...components];
    newComponents.splice(index + 1, 0, newComponent);
    setComponents(newComponents);
  };

  const handleTemplateSelect = (template: PageTemplate) => {
    if (template.id === "blank") {
      setComponents([]);
    } else {
      setComponents((template as any).structure?.components || []);
    }
    setShowTemplateSelector(false);
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      if (onSave) {
        onSave(components);
      } else if (pageId) {
        await PageService.updatePage(pageId, { components });
      }
      // Show success message
    } catch (error) {
      console.error("Failed to save page:", error);
      // Show error message
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="page-builder flex h-screen bg-gray-50">
      {/* Left Sidebar - Component Palette */}
      {!isPreview && (
        <div className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="p-4 pb-8">
            <ComponentPalette onComponentAdd={addComponent} />
          </div>
        </div>
      )}

      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="bg-white border-b border-gray-200 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold">Page Builder</h1>
              <button
                onClick={() => setShowTemplateSelector(true)}
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                {t("actions.select")} Template
              </button>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setIsPreview(!isPreview)}
                className={`
                  px-4 py-2 rounded-lg font-medium transition-colors
                  ${
                    isPreview
                      ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                  }
                `}
              >
                {isPreview ? "Edit" : "Preview"}
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? t("actions.saving") : t("actions.save")}
              </button>
            </div>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 overflow-auto p-6">
          <DndContext
            sensors={sensors}
            collisionDetection={pointerWithin}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
          >
            <DragDropCanvas
              components={components}
              selectedComponentId={selectedComponent?.id}
              onComponentSelect={setSelectedComponent}
              onComponentDelete={deleteComponent}
              onComponentDuplicate={duplicateComponent}
              isPreview={isPreview}
            />
          </DndContext>
        </div>
      </div>

      {/* Property Panel Modal */}
      <Modal
        isOpen={!isPreview && !!selectedComponent}
        onClose={() => setSelectedComponent(null)}
        size="large"
      >
        {selectedComponent && (
          <PropertyPanel
            key={selectedComponent.id}
            component={
              components.find((c) => c.id === selectedComponent.id) ||
              selectedComponent
            }
            onUpdate={updateComponent}
            onClose={() => setSelectedComponent(null)}
          />
        )}
      </Modal>

      {/* Template Selector Modal */}
      {showTemplateSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-6xl max-h-[90vh] overflow-auto w-full p-6">
            <TemplateSelector
              onSelect={handleTemplateSelect}
              onClose={() => setShowTemplateSelector(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
