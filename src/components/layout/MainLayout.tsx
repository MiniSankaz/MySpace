import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import Sidebar from "./Sidebar";
import TopNavbar from "../navigation/TopNavbar";
import Breadcrumbs from "./Breadcrumbs";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import ErrorBoundary from "../ErrorBoundary";

interface MainLayoutProps {
  children: React.ReactNode;
  showSidebar?: boolean;
  showHeader?: boolean;
  showBreadcrumbs?: boolean;
  className?: string;
}

const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  showSidebar = true,
  showHeader = true,
  showBreadcrumbs = true,
  className,
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname();
  const { theme } = useTheme();
  const { user } = useAuth();

  // Handle responsive sidebar
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarCollapsed(true);
        setMobileSidebarOpen(false);
      } else if (window.innerWidth < 1024) {
        setSidebarCollapsed(true);
      } else {
        setSidebarCollapsed(false);
      }
    };

    handleResize();
    setIsLoading(false);

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname]);

  const handleSidebarToggle = () => {
    if (window.innerWidth < 768) {
      setMobileSidebarOpen(!mobileSidebarOpen);
    } else {
      setSidebarCollapsed(!sidebarCollapsed);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div
        className={cn(
          "min-h-screen bg-background",
          theme === "dark" ? "dark" : "light",
          className,
        )}
      >
        {/* Mobile sidebar overlay */}
        {mobileSidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/50 md:hidden"
            onClick={() => setMobileSidebarOpen(false)}
            aria-label="Close sidebar"
          />
        )}

        {/* Sidebar */}
        {showSidebar && (
          <aside
            className={cn(
              "fixed left-0 top-0 z-40 h-full bg-card border-r transition-all duration-300",
              "md:translate-x-0",
              mobileSidebarOpen
                ? "translate-x-0"
                : "-translate-x-full md:translate-x-0",
              sidebarCollapsed ? "w-16" : "w-64",
            )}
          >
            <Sidebar
              collapsed={sidebarCollapsed}
              onToggle={handleSidebarToggle}
              currentPath={pathname}
            />
          </aside>
        )}

        {/* Main content area */}
        <div
          className={cn(
            "transition-all duration-300",
            showSidebar &&
              !mobileSidebarOpen &&
              (sidebarCollapsed ? "md:ml-16" : "md:ml-64"),
          )}
        >
          {/* Top navigation */}
          {showHeader && (
            <header className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
              <TopNavbar
                user={user}
                onMenuClick={handleSidebarToggle}
                showMenuButton={showSidebar}
              />
            </header>
          )}

          {/* Breadcrumbs */}
          {showBreadcrumbs && (
            <div className="px-4 py-2 border-b bg-muted/50">
              <Breadcrumbs />
            </div>
          )}

          {/* Page content */}
          <main className="flex-1">
            <div className="container mx-auto p-4 md:p-6 lg:p-8">
              {children}
            </div>
          </main>

          {/* Footer */}
          <footer className="border-t bg-muted/50 px-4 py-3 text-center text-sm text-muted-foreground">
            <p>
              © 2025 Stock Portfolio Management System. All rights reserved.
            </p>
          </footer>
        </div>
      </div>
    </ErrorBoundary>
  );
};

MainLayout.displayName = "MainLayout";

export default MainLayout;
export type { MainLayoutProps };
