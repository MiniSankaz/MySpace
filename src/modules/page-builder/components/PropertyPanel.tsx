"use client";

import React from "react";
import { PageComponent } from "../types";
import { useTranslation } from "@/modules/i18n/hooks/useTranslation";
import { MediaSelector } from "./MediaSelector";
import { SurveySelector } from "./SurveySelector";
import { SimpleRichTextEditor } from "./SimpleRichTextEditor";

interface PropertyPanelProps {
  component: PageComponent | null;
  onUpdate: (componentId: string, updates: Partial<PageComponent>) => void;
  onClose: () => void;
}

export function PropertyPanel({
  component,
  onUpdate,
  onClose,
}: PropertyPanelProps) {
  const { t, language } = useTranslation();
  const [activeTextLanguage, setActiveTextLanguage] = React.useState<
    "en" | "th"
  >("th");

  if (!component) {
    return (
      <div className="property-panel bg-white rounded-lg shadow-sm p-6">
        <p className="text-gray-500 text-center">{t("messages.noData")}</p>
      </div>
    );
  }

  const handleContentChange = (value: any) => {
    console.log("Updating content:", value);
    onUpdate(component.id, { content: value });
  };

  const handleSettingChange = (key: string, value: any) => {
    onUpdate(component.id, {
      settings: {
        ...component.settings,
        [key]: value,
      },
    });
  };

  const handlePaddingChange = (side: string, value: string) => {
    onUpdate(component.id, {
      settings: {
        ...component.settings,
        padding: {
          ...(component.settings?.padding || {}),
          [side]: value,
        },
      },
    });
  };

  const handleMarginChange = (side: string, value: string) => {
    onUpdate(component.id, {
      settings: {
        ...component.settings,
        margin: {
          ...(component.settings?.margin || {}),
          [side]: value,
        },
      },
    });
  };

  return (
    <div className="property-panel">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-6 py-4">
        <h3 className="text-xl font-semibold capitalize">
          {component.type} Properties
        </h3>
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

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Component-specific properties */}
        {component.type === "text" && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <label className="text-sm font-medium text-gray-700">
                Content
              </label>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setActiveTextLanguage("th")}
                  className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                    activeTextLanguage === "th"
                      ? "bg-primary-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  🇹🇭 ไทย
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTextLanguage("en")}
                  className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                    activeTextLanguage === "en"
                      ? "bg-primary-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  🇬🇧 English
                </button>
              </div>
            </div>
            <SimpleRichTextEditor
              value={
                typeof component.content === "object" &&
                component.content !== null
                  ? component.content[activeTextLanguage] || ""
                  : activeTextLanguage === "en"
                    ? component.content || ""
                    : ""
              }
              onChange={(newValue) => {
                const currentContent =
                  typeof component.content === "object" &&
                  component.content !== null
                    ? component.content
                    : { en: component.content || "", th: "" };

                handleContentChange({
                  ...currentContent,
                  [activeTextLanguage]: newValue,
                });
              }}
              height={300}
              placeholder={
                activeTextLanguage === "en"
                  ? "Enter English content..."
                  : "ใส่เนื้อหาภาษาไทย..."
              }
            />
          </div>
        )}

        {component.type === "heading" && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <label className="text-sm font-medium text-gray-700">
                Heading
              </label>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setActiveTextLanguage("th")}
                  className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                    activeTextLanguage === "th"
                      ? "bg-primary-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  🇹🇭 ไทย
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTextLanguage("en")}
                  className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                    activeTextLanguage === "en"
                      ? "bg-primary-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  🇬🇧 English
                </button>
              </div>
            </div>
            <textarea
              value={
                typeof component.content === "object" &&
                component.content !== null
                  ? component.content[activeTextLanguage] || ""
                  : activeTextLanguage === "en"
                    ? component.content || ""
                    : ""
              }
              onChange={(e) => {
                const currentContent =
                  typeof component.content === "object" &&
                  component.content !== null
                    ? component.content
                    : { en: component.content || "", th: "" };

                handleContentChange({
                  ...currentContent,
                  [activeTextLanguage]: e.target.value,
                });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500 focus:ring-1"
              rows={2}
              placeholder={
                activeTextLanguage === "en"
                  ? "Enter English heading..."
                  : "ใส่หัวข้อภาษาไทย..."
              }
            />
          </div>
        )}

        {component.type === "heading" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Level
            </label>
            <select
              value={(component.settings as any).level || "h2"}
              onChange={(e) => handleSettingChange("level", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500 focus:ring-1"
            >
              <option value="h1">H1</option>
              <option value="h2">H2</option>
              <option value="h3">H3</option>
              <option value="h4">H4</option>
              <option value="h5">H5</option>
              <option value="h6">H6</option>
            </select>
          </div>
        )}

        {component.type === "image" && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Image
              </label>
              <MediaSelector
                value={component.content.mediaId}
                onChange={(mediaId, mediaUrl) =>
                  handleContentChange({
                    ...component.content,
                    mediaId,
                    src: mediaUrl,
                  })
                }
                type="image"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Alt Text
              </label>
              <input
                type="text"
                value={component.content.alt?.[language] || ""}
                onChange={(e) =>
                  handleContentChange({
                    ...component.content,
                    alt: {
                      ...component.content.alt,
                      [language]: e.target.value,
                    },
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500 focus:ring-1"
              />
            </div>
          </>
        )}

        {component.type === "button" && (
          <>
            <div>
              <div className="flex items-center gap-3 mb-4">
                <label className="text-sm font-medium text-gray-700">
                  Button Text
                </label>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setActiveTextLanguage("th")}
                    className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                      activeTextLanguage === "th"
                        ? "bg-primary-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    🇹🇭 ไทย
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTextLanguage("en")}
                    className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                      activeTextLanguage === "en"
                        ? "bg-primary-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    🇬🇧 English
                  </button>
                </div>
              </div>
              <input
                type="text"
                value={
                  typeof component.content === "object" &&
                  component.content !== null
                    ? component.content[activeTextLanguage] || ""
                    : activeTextLanguage === "en"
                      ? component.content || ""
                      : ""
                }
                onChange={(e) => {
                  const currentContent =
                    typeof component.content === "object" &&
                    component.content !== null
                      ? component.content
                      : { en: component.content || "", th: "" };

                  handleContentChange({
                    ...currentContent,
                    [activeTextLanguage]: e.target.value,
                  });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500 focus:ring-1"
                placeholder={
                  activeTextLanguage === "en"
                    ? "Enter English text..."
                    : "ใส่ข้อความภาษาไทย..."
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Link
              </label>
              <input
                type="text"
                value={(component.settings as any).href || ""}
                onChange={(e) => handleSettingChange("href", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500 focus:ring-1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Variant
              </label>
              <select
                value={(component.settings as any).variant || "primary"}
                onChange={(e) => handleSettingChange("variant", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500 focus:ring-1"
              >
                <option value="primary">Primary</option>
                <option value="secondary">Secondary</option>
                <option value="outline">Outline</option>
                <option value="ghost">Ghost</option>
              </select>
            </div>
          </>
        )}

        {component.type === "video" && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Video Source
              </label>
              <select
                value={component.content.type || "youtube"}
                onChange={(e) =>
                  handleContentChange({
                    ...component.content,
                    type: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500 focus:ring-1"
              >
                <option value="youtube">YouTube</option>
                <option value="vimeo">Vimeo</option>
                <option value="media">Media Library</option>
              </select>
            </div>

            {component.content.type !== "media" ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Video URL
                </label>
                <input
                  type="text"
                  value={component.content.src || ""}
                  onChange={(e) =>
                    handleContentChange({
                      ...component.content,
                      src: e.target.value,
                    })
                  }
                  placeholder="https://youtube.com/watch?v=..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500 focus:ring-1"
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Video
                </label>
                <MediaSelector
                  value={component.content.mediaId}
                  onChange={(mediaId, mediaUrl) =>
                    handleContentChange({
                      ...component.content,
                      mediaId,
                      src: mediaUrl,
                    })
                  }
                  type="video"
                />
              </div>
            )}
          </>
        )}

        {component.type === "gallery" && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gallery Layout
              </label>
              <select
                value={component.content.layout || "grid"}
                onChange={(e) =>
                  handleContentChange({
                    ...component.content,
                    layout: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500 focus:ring-1"
              >
                <option value="grid">Grid</option>
                <option value="masonry">Masonry</option>
                <option value="carousel">Carousel</option>
                <option value="slideshow">Slideshow</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Images
              </label>
              <MediaSelector
                value={component.content.images || []}
                onChange={(images) =>
                  handleContentChange({
                    ...component.content,
                    images,
                  })
                }
                type="image"
                multiple
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Columns
              </label>
              <input
                type="number"
                value={component.settings?.columns || 3}
                onChange={(e) =>
                  handleSettingChange("columns", parseInt(e.target.value))
                }
                min="1"
                max="6"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500 focus:ring-1"
              />
            </div>
          </>
        )}

        {component.type === "form" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Survey Form
            </label>
            <SurveySelector
              value={component.content.formId}
              onChange={(formId) =>
                handleContentChange({
                  ...component.content,
                  formId,
                })
              }
            />
          </div>
        )}

        {/* Common properties */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Spacing</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Padding Top
              </label>
              <input
                type="text"
                value={component.settings?.padding?.top || ""}
                onChange={(e) => handlePaddingChange("top", e.target.value)}
                placeholder="e.g., 2rem"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500 focus:ring-1 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Padding Bottom
              </label>
              <input
                type="text"
                value={component.settings?.padding?.bottom || ""}
                onChange={(e) => handlePaddingChange("bottom", e.target.value)}
                placeholder="e.g., 2rem"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500 focus:ring-1 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Margin Top
              </label>
              <input
                type="text"
                value={component.settings?.margin?.top || ""}
                onChange={(e) => handleMarginChange("top", e.target.value)}
                placeholder="e.g., 2rem"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500 focus:ring-1 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Margin Bottom
              </label>
              <input
                type="text"
                value={component.settings?.margin?.bottom || ""}
                onChange={(e) => handleMarginChange("bottom", e.target.value)}
                placeholder="e.g., 2rem"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500 focus:ring-1 text-sm"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Background Color
          </label>
          <div className="flex space-x-2">
            <input
              type="color"
              value={component.settings?.backgroundColor || "#ffffff"}
              onChange={(e) =>
                handleSettingChange("backgroundColor", e.target.value)
              }
              className="h-10 w-20 rounded border border-gray-300"
            />
            <input
              type="text"
              value={component.settings?.backgroundColor || ""}
              onChange={(e) =>
                handleSettingChange("backgroundColor", e.target.value)
              }
              placeholder="#ffffff"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500 focus:ring-1"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Custom CSS Class
          </label>
          <input
            type="text"
            value={component.settings?.className || ""}
            onChange={(e) => handleSettingChange("className", e.target.value)}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          />
        </div>
      </div>
    </div>
  );
}
