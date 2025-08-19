"use client";

import { ReactNode, useState, createContext, useContext } from "react";

interface TabsContextType {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  variant: "default" | "pills" | "underline";
  size: "small" | "medium" | "large";
}

const TabsContext = createContext<TabsContextType | null>(null);

interface TabsProps {
  children: ReactNode;
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  variant?: "default" | "pills" | "underline";
  size?: "small" | "medium" | "large";
  className?: string;
}

export function Tabs({
  children,
  defaultValue,
  value,
  onValueChange,
  variant = "default",
  size = "medium",
  className = "",
}: TabsProps) {
  const [activeTab, setActiveTab] = useState(value || defaultValue || "");

  const handleTabChange = (tab: string) => {
    if (!value) {
      setActiveTab(tab);
    }
    onValueChange?.(tab);
  };

  const currentTab = value || activeTab;

  return (
    <TabsContext.Provider
      value={{
        activeTab: currentTab,
        setActiveTab: handleTabChange,
        variant,
        size,
      }}
    >
      <div className={`${className}`}>{children}</div>
    </TabsContext.Provider>
  );
}

// Tab List Component
interface TabListProps {
  children: ReactNode;
  className?: string;
}

export function TabList({ children, className = "" }: TabListProps) {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error("TabList must be used within Tabs");
  }

  const { variant } = context;

  const variantClasses = {
    default: "border-b border-gray-200",
    pills: "bg-gray-100 rounded-lg p-1",
    underline: "border-b border-gray-200",
  };

  return (
    <div
      className={`flex ${variantClasses[variant]} ${className}`}
      role="tablist"
    >
      {children}
    </div>
  );
}

// Tab Trigger Component
interface TabTriggerProps {
  children: ReactNode;
  value: string;
  disabled?: boolean;
  className?: string;
}

export function TabTrigger({
  children,
  value,
  disabled = false,
  className = "",
}: TabTriggerProps) {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error("TabTrigger must be used within Tabs");
  }

  const { activeTab, setActiveTab, variant, size } = context;
  const isActive = activeTab === value;

  const sizeClasses = {
    small: "px-3 py-1.5 text-sm",
    medium: "px-4 py-2 text-sm",
    large: "px-6 py-3 text-base",
  };

  const variantClasses = {
    default: {
      base: "border-b-2 border-transparent font-medium transition-colors",
      active: "border-primary-500 text-primary-600",
      inactive: "text-gray-500 hover:text-gray-700 hover:border-gray-300",
    },
    pills: {
      base: "rounded-md font-medium transition-colors",
      active: "bg-white text-primary-600 shadow-sm",
      inactive: "text-gray-600 hover:text-gray-900 hover:bg-white/50",
    },
    underline: {
      base: "border-b-2 border-transparent font-medium transition-colors relative",
      active:
        "text-primary-600 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary-500",
      inactive: "text-gray-500 hover:text-gray-700",
    },
  };

  const variantConfig = variantClasses[variant];

  return (
    <button
      role="tab"
      aria-selected={isActive}
      aria-controls={`tabpanel-${value}`}
      tabIndex={isActive ? 0 : -1}
      disabled={disabled}
      onClick={() => !disabled && setActiveTab(value)}
      className={`
        ${sizeClasses[size]}
        ${variantConfig.base}
        ${isActive ? variantConfig.active : variantConfig.inactive}
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
        ${className}
      `}
    >
      {children}
    </button>
  );
}

// Tab Content Component
interface TabContentProps {
  children: ReactNode;
  value: string;
  className?: string;
}

export function TabContent({
  children,
  value,
  className = "",
}: TabContentProps) {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error("TabContent must be used within Tabs");
  }

  const { activeTab } = context;
  const isActive = activeTab === value;

  if (!isActive) return null;

  return (
    <div
      role="tabpanel"
      id={`tabpanel-${value}`}
      aria-labelledby={`tab-${value}`}
      className={`focus:outline-none ${className}`}
      tabIndex={0}
    >
      {children}
    </div>
  );
}

// Vertical Tabs Component
interface VerticalTabsProps extends TabsProps {
  orientation?: "horizontal" | "vertical";
}

export function VerticalTabs({
  children,
  orientation = "vertical",
  ...props
}: VerticalTabsProps) {
  return (
    <Tabs {...props}>
      <div className={orientation === "vertical" ? "flex" : ""}>{children}</div>
    </Tabs>
  );
}

// Vertical Tab List
export function VerticalTabList({ children, className = "" }: TabListProps) {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error("VerticalTabList must be used within Tabs");
  }

  return (
    <div
      className={`flex flex-col space-y-1 border-r border-gray-200 pr-4 mr-4 ${className}`}
      role="tablist"
      aria-orientation="vertical"
    >
      {children}
    </div>
  );
}

// Tab Panel Container
interface TabPanelsProps {
  children: ReactNode;
  className?: string;
}

export function TabPanels({ children, className = "" }: TabPanelsProps) {
  return <div className={`flex-1 ${className}`}>{children}</div>;
}

// Scrollable Tabs
interface ScrollableTabsProps extends TabsProps {
  scrollable?: boolean;
}

export function ScrollableTabs({
  children,
  scrollable = true,
  ...props
}: ScrollableTabsProps) {
  return (
    <Tabs {...props}>
      <div className={scrollable ? "overflow-x-auto" : ""}>{children}</div>
    </Tabs>
  );
}

// Icon Tab
interface IconTabProps extends TabTriggerProps {
  icon: ReactNode;
  showLabel?: boolean;
}

export function IconTab({
  children,
  icon,
  showLabel = true,
  ...props
}: IconTabProps) {
  return (
    <TabTrigger {...props}>
      <div className="flex items-center space-x-2">
        <span className="text-current">{icon}</span>
        {showLabel && <span>{children}</span>}
      </div>
    </TabTrigger>
  );
}

// Badge Tab
interface BadgeTabProps extends TabTriggerProps {
  badge?: string | number;
  badgeVariant?: "default" | "primary" | "danger";
}

export function BadgeTab({
  children,
  badge,
  badgeVariant = "default",
  ...props
}: BadgeTabProps) {
  const badgeColors = {
    default: "bg-gray-100 text-gray-800",
    primary: "bg-primary-100 text-primary-800",
    danger: "bg-red-100 text-red-800",
  };

  return (
    <TabTrigger {...props}>
      <div className="flex items-center space-x-2">
        <span>{children}</span>
        {badge !== undefined && (
          <span
            className={`inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium rounded-full ${badgeColors[badgeVariant]}`}
          >
            {badge}
          </span>
        )}
      </div>
    </TabTrigger>
  );
}

// Export aliases for common naming conventions
export { Tabs as TabsRoot };
export { TabList as TabsList };
export { TabTrigger as TabsTrigger };
export { TabContent as TabsContent };

// Default export for backward compatibility
export default Tabs;
