import React from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/useTheme";
import Image from "next/image";

interface AuthLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  showLogo?: boolean;
  backgroundImage?: string;
  className?: string;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  title,
  subtitle,
  showLogo = true,
  backgroundImage,
  className,
}) => {
  const { theme } = useTheme();

  return (
    <div
      className={cn(
        "min-h-screen flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8",
        "bg-gradient-to-br from-primary/5 via-background to-secondary/5",
        className,
      )}
    >
      {/* Background Image Overlay */}
      {backgroundImage && (
        <div className="absolute inset-0 z-0">
          <Image
            src={backgroundImage}
            alt="Background"
            fill
            className="object-cover opacity-10"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-br from-background/90 to-background/70" />
        </div>
      )}

      {/* Auth Card Container */}
      <div className="relative z-10 w-full max-w-md space-y-8">
        {/* Logo and Branding */}
        {showLogo && (
          <div className="text-center">
            <div className="mx-auto h-16 w-16 bg-primary rounded-full flex items-center justify-center mb-4">
              <svg
                className="h-10 w-10 text-primary-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                />
              </svg>
            </div>

            <h1 className="text-3xl font-bold tracking-tight">
              Stock Portfolio System
            </h1>

            {(title || subtitle) && (
              <div className="mt-4">
                {title && (
                  <h2 className="text-2xl font-semibold text-foreground">
                    {title}
                  </h2>
                )}
                {subtitle && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {subtitle}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Auth Form Card */}
        <div
          className={cn(
            "bg-card rounded-xl shadow-xl",
            "border border-border/50",
            "backdrop-blur-sm",
            "p-8",
          )}
        >
          {children}
        </div>

        {/* Footer Links */}
        <div className="text-center space-y-2">
          <div className="text-sm text-muted-foreground">
            <a href="/privacy" className="hover:text-primary transition-colors">
              Privacy Policy
            </a>
            <span className="mx-2">•</span>
            <a href="/terms" className="hover:text-primary transition-colors">
              Terms of Service
            </a>
            <span className="mx-2">•</span>
            <a href="/help" className="hover:text-primary transition-colors">
              Help Center
            </a>
          </div>

          <p className="text-xs text-muted-foreground">
            © 2025 Stock Portfolio Management System. All rights reserved.
          </p>
        </div>
      </div>

      {/* Loading Overlay */}
      <div
        id="auth-loading-overlay"
        className="fixed inset-0 z-50 hidden bg-background/80 backdrop-blur-sm"
      >
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-sm text-muted-foreground">Authenticating...</p>
          </div>
        </div>
      </div>

      {/* Error Alert Container */}
      <div
        id="auth-error-container"
        className="fixed top-4 right-4 z-50 max-w-sm"
      />
    </div>
  );
};

AuthLayout.displayName = "AuthLayout";

export default AuthLayout;
export type { AuthLayoutProps };
