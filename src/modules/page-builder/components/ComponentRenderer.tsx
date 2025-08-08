"use client";

import React from "react";
import Image from "next/image";
import { PageComponent } from "../types";
import { useTranslation } from "@/modules/i18n/hooks/useTranslation";
import { VideoPlayer } from "./VideoPlayer";
import { ImageGallery } from "./ImageGallery";
import { SurveyForm } from "./SurveyForm";
import "../styles/text-component.css";

interface ComponentRendererProps {
  component: PageComponent;
}

export function ComponentRenderer({ component }: ComponentRendererProps) {
  const { language } = useTranslation();

  const renderComponent = () => {
    switch (component.type) {
      case "text":
        const textContent =
          typeof component.content === "string"
            ? component.content
            : component.content[language] || component.content.en || "";

        // Default padding values for better appearance
        const defaultPadding = "2rem";
        const paddingTop = component.settings.padding?.top || defaultPadding;
        const paddingRight =
          component.settings.padding?.right || defaultPadding;
        const paddingBottom =
          component.settings.padding?.bottom || defaultPadding;
        const paddingLeft = component.settings.padding?.left || defaultPadding;

        return (
          <div
            className="component-text"
            style={{
              padding: `${paddingTop} ${paddingRight} ${paddingBottom} ${paddingLeft}`,
              margin: `${component.settings.margin?.top || 0} ${component.settings.margin?.right || 0} ${component.settings.margin?.bottom || 0} ${component.settings.margin?.left || 0}`,
              backgroundColor:
                component.settings.backgroundColor || "transparent",
              ...((component.settings as any).textAlign && {
                textAlign: (component.settings as any).textAlign,
              }),
              ...((component.settings as any).fontSize && {
                fontSize: (component.settings as any).fontSize,
              }),
              ...((component.settings as any).color && {
                color: (component.settings as any).color,
              }),
            }}
          >
            <div
              className="prose prose-lg max-w-none"
              dangerouslySetInnerHTML={{ __html: textContent }}
              style={{
                fontFamily:
                  'Prompt, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
              }}
            />
          </div>
        );

      case "heading":
        const HeadingTag = (component.settings as any).level || "h2";
        return (
          <HeadingTag
            className="component-heading"
            style={{
              padding: `${component.settings.padding?.top || 0} ${component.settings.padding?.right || 0} ${component.settings.padding?.bottom || 0} ${component.settings.padding?.left || 0}`,
              margin: `${component.settings.margin?.top || 0} ${component.settings.margin?.right || 0} ${component.settings.margin?.bottom || 0} ${component.settings.margin?.left || 0}`,
              backgroundColor: component.settings.backgroundColor,
              ...((component.settings as any).textAlign && {
                textAlign: (component.settings as any).textAlign,
              }),
              ...((component.settings as any).fontSize && {
                fontSize: (component.settings as any).fontSize,
              }),
              ...((component.settings as any).color && {
                color: (component.settings as any).color,
              }),
            }}
          >
            {typeof component.content === "string"
              ? component.content
              : component.content[language] || component.content.en || ""}
          </HeadingTag>
        );

      case "image":
        return (
          <div
            className="component-image"
            style={{
              padding: `${component.settings.padding?.top || 0} ${component.settings.padding?.right || 0} ${component.settings.padding?.bottom || 0} ${component.settings.padding?.left || 0}`,
              margin: `${component.settings.margin?.top || 0} ${component.settings.margin?.right || 0} ${component.settings.margin?.bottom || 0} ${component.settings.margin?.left || 0}`,
            }}
          >
            <div
              className="relative"
              style={{
                width: (component.settings as any).width || "100%",
                height: (component.settings as any).height || "auto",
              }}
            >
              <Image
                src={
                  typeof component.content === "string"
                    ? component.content
                    : component.content.src || ""
                }
                alt={
                  typeof component.content === "string"
                    ? ""
                    : component.content.alt?.[language] ||
                      component.content.alt ||
                      ""
                }
                fill
                style={{
                  objectFit: (component.settings as any).objectFit || "cover",
                }}
                className="rounded"
              />
            </div>
          </div>
        );

      case "button":
        return (
          <div
            className="component-button"
            style={{
              padding: `${component.settings.padding?.top || 0} ${component.settings.padding?.right || 0} ${component.settings.padding?.bottom || 0} ${component.settings.padding?.left || 0}`,
              margin: `${component.settings.margin?.top || 0} ${component.settings.margin?.right || 0} ${component.settings.margin?.bottom || 0} ${component.settings.margin?.left || 0}`,
            }}
          >
            <a
              href={(component.settings as any).href || "#"}
              target={(component.settings as any).target || "_self"}
              className={`
                inline-block px-4 py-2 rounded font-medium transition-colors
                ${(component.settings as any).variant === "primary" ? "bg-primary-600 text-white hover:bg-primary-700" : ""}
                ${(component.settings as any).variant === "secondary" ? "bg-secondary-600 text-white hover:bg-secondary-700" : ""}
                ${(component.settings as any).variant === "outline" ? "border-2 border-primary-600 text-primary-600 hover:bg-primary-50" : ""}
                ${(component.settings as any).fullWidth ? "w-full text-center" : ""}
              `}
            >
              {typeof component.content === "string"
                ? component.content
                : component.content[language] || component.content.en || ""}
            </a>
          </div>
        );

      case "spacer":
        return (
          <div
            className="component-spacer"
            style={{
              height: (component.settings as any).height || "2rem",
            }}
          />
        );

      case "divider":
        return (
          <hr
            className="component-divider"
            style={{
              margin: `${component.settings.margin?.top || "1rem"} 0 ${component.settings.margin?.bottom || "1rem"} 0`,
              borderColor: (component.settings as any).borderColor || "#e5e7eb",
              borderWidth: (component.settings as any).borderWidth || "1px",
            }}
          />
        );

      case "html":
        return (
          <div
            className="component-html"
            dangerouslySetInnerHTML={{
              __html:
                typeof component.content === "string"
                  ? component.content
                  : component.content[language] || component.content.en || "",
            }}
            style={{
              padding: `${component.settings.padding?.top || 0} ${component.settings.padding?.right || 0} ${component.settings.padding?.bottom || 0} ${component.settings.padding?.left || 0}`,
              margin: `${component.settings.margin?.top || 0} ${component.settings.margin?.right || 0} ${component.settings.margin?.bottom || 0} ${component.settings.margin?.left || 0}`,
            }}
          />
        );

      case "video":
        return (
          <div
            className="component-video"
            style={{
              padding: `${component.settings.padding?.top || 0} ${component.settings.padding?.right || 0} ${component.settings.padding?.bottom || 0} ${component.settings.padding?.left || 0}`,
              margin: `${component.settings.margin?.top || 0} ${component.settings.margin?.right || 0} ${component.settings.margin?.bottom || 0} ${component.settings.margin?.left || 0}`,
            }}
          >
            <VideoPlayer
              src={
                typeof component.content === "string"
                  ? component.content
                  : component.content.src || ""
              }
              type={
                typeof component.content === "string"
                  ? "youtube"
                  : component.content.type || "youtube"
              }
              width={component.settings.width as string}
              height={component.settings.height as string}
              aspectRatio={component.settings.aspectRatio as string}
            />
          </div>
        );

      case "gallery":
        return (
          <div
            className="component-gallery"
            style={{
              padding: `${component.settings.padding?.top || 0} ${component.settings.padding?.right || 0} ${component.settings.padding?.bottom || 0} ${component.settings.padding?.left || 0}`,
              margin: `${component.settings.margin?.top || 0} ${component.settings.margin?.right || 0} ${component.settings.margin?.bottom || 0} ${component.settings.margin?.left || 0}`,
            }}
          >
            <ImageGallery
              images={
                typeof component.content === "object"
                  ? component.content.images || []
                  : []
              }
              layout={
                typeof component.content === "object"
                  ? component.content.layout || "grid"
                  : "grid"
              }
              columns={(component.settings.columns as number) || 3}
              gap={(component.settings.gap as string) || "1rem"}
            />
          </div>
        );

      case "form":
        return (
          <div
            className="component-form"
            style={{
              padding: `${component.settings.padding?.top || 0} ${component.settings.padding?.right || 0} ${component.settings.padding?.bottom || 0} ${component.settings.padding?.left || 0}`,
              margin: `${component.settings.margin?.top || 0} ${component.settings.margin?.right || 0} ${component.settings.margin?.bottom || 0} ${component.settings.margin?.left || 0}`,
            }}
          >
            <SurveyForm
              surveyId={
                typeof component.content === "object"
                  ? component.content.formId || ""
                  : ""
              }
            />
          </div>
        );

      default:
        return (
          <div className="component-placeholder bg-gray-100 p-4 rounded text-center text-gray-500">
            {component.type} component
          </div>
        );
    }
  };

  return <div className="component-wrapper">{renderComponent()}</div>;
}
