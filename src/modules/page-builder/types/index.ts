import { Translation } from "@/modules/i18n/types";

export interface PageTemplate {
  id: string;
  name: Translation;
  code: string;
  structure: TemplateStructure;
  preview?: string;
  isActive: boolean;
}

export interface TemplateStructure {
  columns: number; // 1, 2, or freestyle
  layout: "single" | "two-column" | "freestyle";
  zones: TemplateZone[];
}

export interface TemplateZone {
  id: string;
  name: string;
  column?: number; // For multi-column layouts
  acceptedComponents?: string[]; // Component types that can be dropped here
  maxComponents?: number;
}

export type ComponentType =
  | "text"
  | "heading"
  | "image"
  | "video"
  | "gallery"
  | "form"
  | "button"
  | "spacer"
  | "divider"
  | "html"
  | "embed"
  | "accordion"
  | "tabs"
  | "map"
  | "social"
  | "newsletter"
  | "menu";

export interface BaseComponent {
  id: string;
  type: ComponentType;
  order: number;
  settings: ComponentSettings;
  content: Translation | any; // Content varies by component type
  columnIndex?: number;
  parentId?: string;
}

export interface ComponentSettings {
  padding?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
  margin?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
  backgroundColor?: string;
  borderRadius?: string;
  border?: {
    width?: string;
    style?: string;
    color?: string;
  };
  shadow?: string;
  className?: string;
  responsive?: {
    mobile?: Partial<ComponentSettings>;
    tablet?: Partial<ComponentSettings>;
    desktop?: Partial<ComponentSettings>;
  };
}

// Component-specific types
export interface TextComponent extends BaseComponent {
  type: "text";
  content: Translation;
  settings: ComponentSettings & {
    fontSize?: string;
    fontWeight?: string;
    textAlign?: "left" | "center" | "right" | "justify";
    color?: string;
    lineHeight?: string;
  };
}

export interface HeadingComponent extends BaseComponent {
  type: "heading";
  content: Translation;
  settings: ComponentSettings & {
    level: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
    fontSize?: string;
    fontWeight?: string;
    textAlign?: "left" | "center" | "right";
    color?: string;
  };
}

export interface ImageComponent extends BaseComponent {
  type: "image";
  content: {
    src: string;
    alt: Translation;
    title?: Translation;
  };
  settings: ComponentSettings & {
    width?: string;
    height?: string;
    objectFit?: "cover" | "contain" | "fill" | "none" | "scale-down";
    link?: {
      href: string;
      target?: "_self" | "_blank";
    };
  };
}

export interface ButtonComponent extends BaseComponent {
  type: "button";
  content: Translation;
  settings: ComponentSettings & {
    href: string;
    target?: "_self" | "_blank";
    variant?: "primary" | "secondary" | "outline" | "ghost";
    size?: "sm" | "md" | "lg";
    fullWidth?: boolean;
    icon?: string;
    iconPosition?: "left" | "right";
  };
}

export interface HtmlComponent extends BaseComponent {
  type: "html";
  content: string; // Raw HTML
  settings: ComponentSettings;
}

export type PageComponent =
  | TextComponent
  | HeadingComponent
  | ImageComponent
  | ButtonComponent
  | HtmlComponent
  | BaseComponent; // For other component types

export interface PageBuilderState {
  components: PageComponent[];
  selectedComponentId: string | null;
  isDragging: boolean;
  hoveredZoneId: string | null;
}

export interface ComponentDefinition {
  type: ComponentType;
  label: Translation;
  icon: string;
  defaultContent: any;
  defaultSettings: Partial<ComponentSettings>;
  configurable: boolean;
}
