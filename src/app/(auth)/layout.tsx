"use client";

import { ReactNode, Suspense } from "react";
import { usePathname } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Loading fallback component
function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-400">Loading...</p>
      </div>
    </div>
  );
}

// Error fallback component
function ErrorFallback() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-gray-800 rounded-lg shadow-xl p-6 text-center">
        <h2 className="text-xl font-semibold text-white mb-4">
          Unable to load page
        </h2>
        <p className="text-gray-300 mb-4">
          The application is currently running in offline mode or experiencing
          connection issues.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
        >
          Retry
        </button>
      </div>
    </div>
  );
}

export default function AuthLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // Assistant page has its own layout
  if (pathname === "/assistant") {
    return (
      <ErrorBoundary fallback={<ErrorFallback />}>
        <Suspense fallback={<LoadingFallback />}>{children}</Suspense>
      </ErrorBoundary>
    );
  }

  // Other pages use AppLayout with error boundary
  return (
    <ErrorBoundary
      fallback={<ErrorFallback />}
      onError={(error, errorInfo) => {
        console.error("[AuthLayout] Error caught:", error);
        // In production, send to error tracking service
      }}
    >
      <AppLayout showSidebar={true} showBreadcrumbs={true}>
        <Suspense fallback={<LoadingFallback />}>{children}</Suspense>
      </AppLayout>
    </ErrorBoundary>
  );
}
