"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { PageTemplate } from "../types";
import { useTranslation } from "@/modules/i18n/hooks/useTranslation";

interface TemplateSelectorProps {
  onSelect: (template: PageTemplate) => void;
  onClose: () => void;
}

export function TemplateSelector({ onSelect, onClose }: TemplateSelectorProps) {
  const { t, language } = useTranslation();
  const [templates, setTemplates] = useState<PageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch("/api/pages/templates");
      const data = await response.json();
      setTemplates(data);
    } catch (error) {
      console.error("Failed to fetch templates:", error);
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { id: "all", label: "All Templates" },
    { id: "landing", label: "Landing Pages" },
    { id: "about", label: "About Pages" },
    { id: "services", label: "Services" },
    { id: "contact", label: "Contact" },
    { id: "blog", label: "Blog" },
  ];

  const filteredTemplates = templates.filter(
    (template) =>
      selectedCategory === "all" ||
      (template as any).category === selectedCategory,
  );

  if (loading) {
    return (
      <div className="template-selector-loading flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="template-selector">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">{t("actions.select")} Template</h2>
        <button onClick={onClose} className="rounded-lg p-2 hover:bg-gray-100">
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Category Filter */}
      <div className="flex space-x-2 mb-6 overflow-x-auto pb-2">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={`
              px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors
              ${
                selectedCategory === category.id
                  ? "bg-primary-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }
            `}
          >
            {category.label}
          </button>
        ))}
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Blank Template */}
        <div
          onClick={() =>
            onSelect({
              id: "blank",
              name: { en: "Blank Page", th: "หน้าเปล่า" },
              description: { en: "Start from scratch", th: "เริ่มต้นจากศูนย์" },
              thumbnail: "",
              category: "blank",
              components: [],
              isDefault: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            } as unknown as PageTemplate)
          }
          className="template-card border-2 border-dashed border-gray-300 rounded-lg p-6 cursor-pointer hover:border-primary-500 transition-colors group"
        >
          <div className="h-40 flex items-center justify-center mb-4">
            <svg
              className="w-16 h-16 text-gray-400 group-hover:text-primary-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
          </div>
          <h3 className="font-semibold mb-1">
            {language === "th" ? "หน้าเปล่า" : "Blank Page"}
          </h3>
          <p className="text-sm text-gray-500">
            {language === "th" ? "เริ่มต้นจากศูนย์" : "Start from scratch"}
          </p>
        </div>

        {/* Template Cards */}
        {filteredTemplates.map((template) => (
          <div
            key={template.id}
            onClick={() => onSelect(template)}
            className="template-card bg-white border border-gray-200 rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
          >
            {(template as any).preview ? (
              <Image
                src={(template as any).preview}
                alt={
                  (template.name as any)[language] || (template.name as any).en
                }
                width={300}
                height={160}
                className="w-full h-40 object-cover"
              />
            ) : (
              <div className="h-40 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                <svg
                  className="w-16 h-16 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
                  />
                </svg>
              </div>
            )}
            <div className="p-4">
              <h3 className="font-semibold mb-1">
                {(template.name as any)[language] || (template.name as any).en}
              </h3>
              <p className="text-sm text-gray-500">
                {(template as any).description?.[language] ||
                  (template as any).description?.en ||
                  ""}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
