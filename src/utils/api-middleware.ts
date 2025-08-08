import { NextRequest, NextResponse } from "next/server";
import { auth } from "@core/auth";
import { withAuth, AuthMiddlewareOptions } from "@core/auth/auth-middleware";
import { getRoutePermissions } from "@/config/permissions";

// Legacy interface for backward compatibility
interface MiddlewareOptions {
  requireAuth?: boolean;
  permissions?: string[];
  rateLimit?: { requests: number; window: string };
}

/**
 * Legacy API middleware - deprecated in favor of withAuth
 * @deprecated Use withAuth from auth-middleware.ts instead
 */
export function withApiMiddleware(
  handler: (req: NextRequest, context?: any) => Promise<Response>,
  options: MiddlewareOptions = {},
) {
  console.warn(
    "withApiMiddleware is deprecated. Use withAuth from auth-middleware.ts instead.",
  );

  return async (req: NextRequest, context?: any) => {
    try {
      // Authentication check
      if (options.requireAuth) {
        const session = await auth();
        if (!session) {
          return NextResponse.json(
            {
              error: "Unauthorized",
              message: "Authentication required",
              code: "AUTH_REQUIRED",
            },
            { status: 401 },
          );
        }

        // Legacy permission check - convert to new format
        if (options.permissions && options.permissions.length > 0) {
          const hasPermission = options.permissions.some((permission) =>
            session.user?.permissions?.includes(permission),
          );
          if (!hasPermission) {
            return NextResponse.json(
              {
                error: "Forbidden",
                message: "Insufficient permissions",
                code: "INSUFFICIENT_PERMISSIONS",
                required: options.permissions,
              },
              { status: 403 },
            );
          }
        }

        // Add session to request
        (req as any).session = session;
      }

      // Call handler
      return await handler(req, context);
    } catch (error) {
      console.error("API Error:", error);
      return NextResponse.json(
        {
          error: "Internal Server Error",
          message:
            process.env.NODE_ENV === "development"
              ? error.message
              : "An error occurred",
          code: "INTERNAL_ERROR",
        },
        { status: 500 },
      );
    }
  };
}

/**
 * Enhanced API middleware with automatic permission detection
 * Automatically applies permissions based on route configuration
 */
export function withAutoAuth(
  handler: (req: NextRequest, context?: any) => Promise<Response>,
  overrideOptions?: Partial<AuthMiddlewareOptions>,
) {
  return async (req: NextRequest, context?: any) => {
    try {
      // Get method and path from request
      const method = req.method;
      const url = new URL(req.url);
      let path = url.pathname;

      // Replace dynamic segments with placeholders for route matching
      // This is a simplified approach - in production you might want more sophisticated matching
      path = path.replace(/\/[^/]+\/([a-f0-9-]{36}|\d+)(?=\/|$)/g, "/[id]");
      path = path.replace(
        /\/[^/]+\/([a-f0-9-]{36}|\d+)\/([^/]+)$/g,
        "/[id]/[action]",
      );
      path = path.replace(
        /\/users\/([a-f0-9-]{36}|\d+)(?=\/|$)/g,
        "/users/[userId]",
      );

      // Get route permissions
      const routePermissions = getRoutePermissions(method, path);

      // Merge with override options
      const finalOptions: AuthMiddlewareOptions = {
        ...routePermissions,
        ...overrideOptions,
      };

      // If no permissions are configured, just require authentication for admin routes
      if (!routePermissions && path.startsWith("/api/admin")) {
        finalOptions.requireAuth = true;
      }

      // Use the enhanced auth middleware
      const authHandler = withAuth(handler, finalOptions);
      return await authHandler(req, context);
    } catch (error) {
      console.error("Auto auth middleware error:", error);
      return NextResponse.json(
        {
          error: "Internal Server Error",
          message:
            process.env.NODE_ENV === "development"
              ? error.message
              : "An error occurred",
          code: "INTERNAL_ERROR",
        },
        { status: 500 },
      );
    }
  };
}

/**
 * Utility function to create a secure API route with automatic permission checking
 */
export function createSecureRoute(
  handler: (req: NextRequest, context?: any) => Promise<Response>,
  options?: Partial<AuthMiddlewareOptions>,
) {
  return withAutoAuth(handler, options);
}

/**
 * Export new auth middleware for convenience
 */
export {
  withAuth,
  type AuthMiddlewareOptions,
} from "@core/auth/auth-middleware";
