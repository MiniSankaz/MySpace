import { NextRequest, NextResponse } from "next/server";
import { auth } from "./auth";
import { RBACService } from "@modules/user/services";
import type { PermissionCheck } from "@/types/rbac";

export interface AuthMiddlewareOptions {
  requireAuth?: boolean;
  requireRole?: string | string[];
  requirePermission?: PermissionCheck | PermissionCheck[];
  requireAnyPermission?: PermissionCheck[];
  requireAllPermissions?: PermissionCheck[];
  requireAdmin?: boolean;
  requireSuperAdmin?: boolean;
  rateLimit?: { requests: number; window: string };
  allowSelfAccess?: boolean; // Allow access to own resources
}

export interface AuthenticatedRequest extends NextRequest {
  session: any;
  user: {
    id: string;
    email: string;
    username: string;
    displayName?: string;
    permissions?: string[];
  };
}

/**
 * Enhanced authorization middleware with RBAC support
 */
export function withAuth(
  handler: (req: AuthenticatedRequest, context?: any) => Promise<Response>,
  options: AuthMiddlewareOptions = {},
) {
  return async (req: NextRequest, context?: any) => {
    try {
      // Always check authentication if any security options are specified
      const requiresAuth =
        options.requireAuth !== false &&
        (options.requireRole ||
          options.requirePermission ||
          options.requireAnyPermission ||
          options.requireAllPermissions ||
          options.requireAdmin ||
          options.requireSuperAdmin);

      if (requiresAuth || options.requireAuth) {
        const session = await auth();
        if (!session?.user) {
          return NextResponse.json(
            {
              error: "Unauthorized",
              message: "Authentication required",
              code: "AUTH_REQUIRED",
            },
            { status: 401 },
          );
        }

        const userId = session.user.id;

        // Role-based checks
        if (options.requireRole) {
          const roles = Array.isArray(options.requireRole)
            ? options.requireRole
            : [options.requireRole];

          const hasAnyRole = await RBACService.hasAnyRole(userId, roles);
          if (!hasAnyRole) {
            return NextResponse.json(
              {
                error: "Forbidden",
                message: `Required role: ${roles.join(" or ")}`,
                code: "INSUFFICIENT_ROLE",
                required: roles,
              },
              { status: 403 },
            );
          }
        }

        // Permission-based checks
        if (options.requirePermission) {
          const permissions = Array.isArray(options.requirePermission)
            ? options.requirePermission
            : [options.requirePermission];

          const hasAnyPermission = await RBACService.hasAnyPermission(
            userId,
            permissions,
          );
          if (!hasAnyPermission) {
            return NextResponse.json(
              {
                error: "Forbidden",
                message: "Insufficient permissions",
                code: "INSUFFICIENT_PERMISSIONS",
                required: permissions,
              },
              { status: 403 },
            );
          }
        }

        // Require any of the specified permissions
        if (options.requireAnyPermission) {
          const hasAnyPermission = await RBACService.hasAnyPermission(
            userId,
            options.requireAnyPermission,
          );
          if (!hasAnyPermission) {
            return NextResponse.json(
              {
                error: "Forbidden",
                message: "At least one of the required permissions is needed",
                code: "INSUFFICIENT_PERMISSIONS",
                required: options.requireAnyPermission,
              },
              { status: 403 },
            );
          }
        }

        // Require all of the specified permissions
        if (options.requireAllPermissions) {
          const hasAllPermissions = await RBACService.hasAllPermissions(
            userId,
            options.requireAllPermissions,
          );
          if (!hasAllPermissions) {
            return NextResponse.json(
              {
                error: "Forbidden",
                message: "All specified permissions are required",
                code: "INSUFFICIENT_PERMISSIONS",
                required: options.requireAllPermissions,
              },
              { status: 403 },
            );
          }
        }

        // Admin level checks
        if (options.requireAdmin) {
          const isAdmin = await RBACService.isAdmin(userId);
          if (!isAdmin) {
            return NextResponse.json(
              {
                error: "Forbidden",
                message: "Administrator access required",
                code: "ADMIN_REQUIRED",
              },
              { status: 403 },
            );
          }
        }

        if (options.requireSuperAdmin) {
          const isSuperAdmin = await RBACService.isSuperAdmin(userId);
          if (!isSuperAdmin) {
            return NextResponse.json(
              {
                error: "Forbidden",
                message: "Super administrator access required",
                code: "SUPER_ADMIN_REQUIRED",
              },
              { status: 403 },
            );
          }
        }

        // Add session and user to request
        const authenticatedReq = req as AuthenticatedRequest;
        authenticatedReq.session = session;
        authenticatedReq.user = {
          id: session.user.id,
          email: session.user.email || "",
          username: session.user.username,
          displayName: session.user.displayName,
          permissions: session.user.permissions,
        };

        return await handler(authenticatedReq, context);
      }

      // No auth required, call handler directly
      return await handler(req as AuthenticatedRequest, context);
    } catch (error) {
      console.error("Auth middleware error:", error);
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
 * Helper function to check if user can access their own resource
 */
export async function checkSelfAccess(
  userId: string,
  targetUserId: string,
  resourcePermission: PermissionCheck,
): Promise<boolean> {
  // If it's the same user, check if they have 'own' scope permission
  if (userId === targetUserId) {
    return await RBACService.hasPermission(userId, {
      ...resourcePermission,
      scope: "own",
    });
  }

  // Otherwise check for global permission
  return await RBACService.hasPermission(userId, {
    ...resourcePermission,
    scope: "global",
  });
}

/**
 * Middleware for routes that allow self-access (e.g., user profile routes)
 */
export function withSelfOrPermission(
  handler: (req: AuthenticatedRequest, context?: any) => Promise<Response>,
  resourcePermission: PermissionCheck,
) {
  return withAuth(
    async (req: AuthenticatedRequest, context?: any) => {
      const userId = req.user.id;
      const targetUserId = context?.params?.userId || context?.params?.id;

      if (targetUserId) {
        const canAccess = await checkSelfAccess(
          userId,
          targetUserId,
          resourcePermission,
        );
        if (!canAccess) {
          return NextResponse.json(
            {
              error: "Forbidden",
              message:
                "You can only access your own resources or need elevated permissions",
              code: "INSUFFICIENT_PERMISSIONS",
              required: [
                { ...resourcePermission, scope: "own" },
                { ...resourcePermission, scope: "global" },
              ],
            },
            { status: 403 },
          );
        }
      }

      return await handler(req, context);
    },
    { requireAuth: true },
  );
}

/**
 * Common permission checking decorators
 */
export const requirePermissions = {
  // User management
  manageUsers: (scope: "global" | "own" = "global") =>
    withAuth(null, {
      requirePermission: { resource: "users", action: "manage", scope },
    }),

  createUsers: () =>
    withAuth(null, {
      requirePermission: {
        resource: "users",
        action: "create",
        scope: "global",
      },
    }),

  viewUsers: (scope: "global" | "own" = "global") =>
    withAuth(null, {
      requirePermission: { resource: "users", action: "read", scope },
    }),

  updateUsers: (scope: "global" | "own" = "global") =>
    withAuth(null, {
      requirePermission: { resource: "users", action: "update", scope },
    }),

  deleteUsers: () =>
    withAuth(null, {
      requirePermission: {
        resource: "users",
        action: "delete",
        scope: "global",
      },
    }),

  // Role and permission management
  manageRoles: () =>
    withAuth(null, {
      requirePermission: {
        resource: "roles",
        action: "manage",
        scope: "global",
      },
    }),

  managePermissions: () =>
    withAuth(null, {
      requirePermission: {
        resource: "permissions",
        action: "manage",
        scope: "global",
      },
    }),

  // Content management
  managePosts: (scope: "global" | "own" = "global") =>
    withAuth(null, {
      requirePermission: { resource: "posts", action: "manage", scope },
    }),

  managePages: () =>
    withAuth(null, {
      requirePermission: {
        resource: "pages",
        action: "manage",
        scope: "global",
      },
    }),

  manageMedia: () =>
    withAuth(null, {
      requirePermission: {
        resource: "media",
        action: "manage",
        scope: "global",
      },
    }),

  manageCategories: () =>
    withAuth(null, {
      requirePermission: {
        resource: "categories",
        action: "manage",
        scope: "global",
      },
    }),

  manageTags: () =>
    withAuth(null, {
      requirePermission: {
        resource: "tags",
        action: "manage",
        scope: "global",
      },
    }),

  // System management
  manageSettings: () =>
    withAuth(null, {
      requirePermission: {
        resource: "settings",
        action: "manage",
        scope: "global",
      },
    }),

  viewAnalytics: () =>
    withAuth(null, {
      requirePermission: {
        resource: "analytics",
        action: "read",
        scope: "global",
      },
    }),

  manageSystem: () =>
    withAuth(null, {
      requirePermission: {
        resource: "system",
        action: "manage",
        scope: "global",
      },
    }),

  // Admin access
  admin: () => withAuth(null, { requireAdmin: true }),
  superAdmin: () => withAuth(null, { requireSuperAdmin: true }),
};

/**
 * Quick middleware factory for common patterns
 */
export const createMiddleware = {
  adminOnly: () => withAuth(null, { requireAdmin: true }),

  superAdminOnly: () => withAuth(null, { requireSuperAdmin: true }),

  authenticated: () => withAuth(null, { requireAuth: true }),

  permission: (permission: PermissionCheck) =>
    withAuth(null, { requirePermission: permission }),

  anyPermission: (permissions: PermissionCheck[]) =>
    withAuth(null, { requireAnyPermission: permissions }),

  allPermissions: (permissions: PermissionCheck[]) =>
    withAuth(null, { requireAllPermissions: permissions }),

  role: (role: string | string[]) => withAuth(null, { requireRole: role }),

  selfOrPermission: (permission: PermissionCheck) =>
    withSelfOrPermission(null, permission),
};
