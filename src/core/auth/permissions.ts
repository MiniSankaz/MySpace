import { RBACService } from "@modules/user/services";
import { PERMISSIONS, PERMISSION_GROUPS } from "@/config/permissions";
import type { PermissionCheck } from "@/types/rbac";

/**
 * Permission checking helper functions
 * Provides convenient wrappers around RBACService methods
 */

/**
 * Check if user has specific permission
 */
export async function hasPermission(
  userId: string,
  permission: PermissionCheck,
): Promise<boolean> {
  return await RBACService.hasPermission(userId, permission);
}

/**
 * Check if user has any of the specified permissions
 */
export async function hasAnyPermission(
  userId: string,
  permissions: PermissionCheck[],
): Promise<boolean> {
  return await RBACService.hasAnyPermission(userId, permissions);
}

/**
 * Check if user has all of the specified permissions
 */
export async function hasAllPermissions(
  userId: string,
  permissions: PermissionCheck[],
): Promise<boolean> {
  return await RBACService.hasAllPermissions(userId, permissions);
}

/**
 * Check if user has a specific role
 */
export async function hasRole(
  userId: string,
  roleCode: string,
): Promise<boolean> {
  return await RBACService.hasRole(userId, roleCode);
}

/**
 * Check if user has any of the specified roles
 */
export async function hasAnyRole(
  userId: string,
  roleCodes: string[],
): Promise<boolean> {
  return await RBACService.hasAnyRole(userId, roleCodes);
}

/**
 * Check permission using simplified string format (e.g., 'posts.view', 'posts:view')
 */
export async function checkPermission(
  userId: string,
  permission: string,
): Promise<boolean> {
  // Support both dot and colon notation
  const separator = permission.includes(".") ? "." : ":";
  const [resource, action] = permission.split(separator);
  if (!resource || !action) {
    console.error(`Invalid permission format: ${permission}`);
    return false;
  }

  // First try to find the permission using the exact code (with colon)
  const permissionCode = `${resource}:${action}`;
  const userPerms = await RBACService.getUserPermissions(userId);
  const hasDirectPermission = userPerms.some((p) => p.code === permissionCode);
  if (hasDirectPermission) {
    return true;
  }

  // Try to find matching permission in PERMISSIONS config
  const resourceGroup =
    PERMISSIONS[resource.toUpperCase() as keyof typeof PERMISSIONS];
  if (!resourceGroup) {
    // Fallback to direct permission check
    return await hasPermission(userId, { resource, action, scope: "global" });
  }

  // Look for matching action in resource group
  const permissionKey = Object.keys(resourceGroup).find((key) => {
    const perm = resourceGroup[
      key as keyof typeof resourceGroup
    ] as PermissionCheck;
    return perm.action === action || key.toLowerCase() === action;
  });

  if (permissionKey) {
    const perm = resourceGroup[
      permissionKey as keyof typeof resourceGroup
    ] as PermissionCheck;
    return await hasPermission(userId, perm);
  }

  // Fallback to direct permission check
  return await hasPermission(userId, { resource, action, scope: "global" });
}

// Note: checkPermission function is already defined above for simplified string format
// If you need the hasPermission functionality, use hasPermission directly

/**
 * Get user permissions
 */
export async function getUserPermissions(userId: string) {
  return await RBACService.getUserPermissions(userId);
}

/**
 * Check if user is admin
 */
export async function isAdmin(userId: string): Promise<boolean> {
  return await RBACService.isAdmin(userId);
}

/**
 * Check if user is super admin
 */
export async function isSuperAdmin(userId: string): Promise<boolean> {
  return await RBACService.isSuperAdmin(userId);
}

/**
 * User Management Permission Helpers
 */
export const userPermissions = {
  canCreate: (userId: string) =>
    hasPermission(userId, PERMISSIONS.USERS.CREATE),
  canReadAll: (userId: string) =>
    hasPermission(userId, PERMISSIONS.USERS.READ_ALL),
  canReadOwn: (userId: string) =>
    hasPermission(userId, PERMISSIONS.USERS.READ_OWN),
  canUpdateAll: (userId: string) =>
    hasPermission(userId, PERMISSIONS.USERS.UPDATE_ALL),
  canUpdateOwn: (userId: string) =>
    hasPermission(userId, PERMISSIONS.USERS.UPDATE_OWN),
  canDelete: (userId: string) =>
    hasPermission(userId, PERMISSIONS.USERS.DELETE),
  canManage: (userId: string) =>
    hasPermission(userId, PERMISSIONS.USERS.MANAGE),
  canInvite: (userId: string) =>
    hasPermission(userId, PERMISSIONS.USERS.INVITE),
  canAssignRoles: (userId: string) =>
    hasPermission(userId, PERMISSIONS.USERS.ASSIGN_ROLES),

  // Combined checks
  canRead: async (userId: string, targetUserId?: string) => {
    if (await hasPermission(userId, PERMISSIONS.USERS.READ_ALL)) return true;
    if (targetUserId === userId)
      return await hasPermission(userId, PERMISSIONS.USERS.READ_OWN);
    return false;
  },

  canUpdate: async (userId: string, targetUserId?: string) => {
    if (await hasPermission(userId, PERMISSIONS.USERS.UPDATE_ALL)) return true;
    if (targetUserId === userId)
      return await hasPermission(userId, PERMISSIONS.USERS.UPDATE_OWN);
    return false;
  },
};

/**
 * Role Management Permission Helpers
 */
export const rolePermissions = {
  canCreate: (userId: string) =>
    hasPermission(userId, PERMISSIONS.ROLES.CREATE),
  canRead: (userId: string) => hasPermission(userId, PERMISSIONS.ROLES.READ),
  canUpdate: (userId: string) =>
    hasPermission(userId, PERMISSIONS.ROLES.UPDATE),
  canDelete: (userId: string) =>
    hasPermission(userId, PERMISSIONS.ROLES.DELETE),
  canManage: (userId: string) =>
    hasPermission(userId, PERMISSIONS.ROLES.MANAGE),
  canAssign: (userId: string) =>
    hasPermission(userId, PERMISSIONS.ROLES.ASSIGN),
};

/**
 * Permission Management Permission Helpers
 */
export const permissionPermissions = {
  canCreate: (userId: string) =>
    hasPermission(userId, PERMISSIONS.PERMISSIONS.CREATE),
  canRead: (userId: string) =>
    hasPermission(userId, PERMISSIONS.PERMISSIONS.READ),
  canUpdate: (userId: string) =>
    hasPermission(userId, PERMISSIONS.PERMISSIONS.UPDATE),
  canDelete: (userId: string) =>
    hasPermission(userId, PERMISSIONS.PERMISSIONS.DELETE),
  canManage: (userId: string) =>
    hasPermission(userId, PERMISSIONS.PERMISSIONS.MANAGE),
  canSeed: (userId: string) =>
    hasPermission(userId, PERMISSIONS.PERMISSIONS.SEED),
};

/**
 * Content Management Permission Helpers
 */
export const contentPermissions = {
  // Posts
  posts: {
    canCreate: (userId: string) =>
      hasAnyPermission(userId, [
        PERMISSIONS.POSTS.CREATE,
        PERMISSIONS.POSTS.CREATE_OWN,
      ]),
    canRead: (userId: string) => hasPermission(userId, PERMISSIONS.POSTS.READ),
    canUpdateAll: (userId: string) =>
      hasPermission(userId, PERMISSIONS.POSTS.UPDATE_ALL),
    canUpdateOwn: (userId: string) =>
      hasPermission(userId, PERMISSIONS.POSTS.UPDATE_OWN),
    canDeleteAll: (userId: string) =>
      hasPermission(userId, PERMISSIONS.POSTS.DELETE_ALL),
    canDeleteOwn: (userId: string) =>
      hasPermission(userId, PERMISSIONS.POSTS.DELETE_OWN),
    canPublish: (userId: string) =>
      hasPermission(userId, PERMISSIONS.POSTS.PUBLISH),
    canManage: (userId: string) =>
      hasPermission(userId, PERMISSIONS.POSTS.MANAGE),

    // Combined checks
    canUpdate: async (userId: string, authorId?: string) => {
      if (await hasPermission(userId, PERMISSIONS.POSTS.UPDATE_ALL))
        return true;
      if (authorId === userId)
        return await hasPermission(userId, PERMISSIONS.POSTS.UPDATE_OWN);
      return false;
    },

    canDelete: async (userId: string, authorId?: string) => {
      if (await hasPermission(userId, PERMISSIONS.POSTS.DELETE_ALL))
        return true;
      if (authorId === userId)
        return await hasPermission(userId, PERMISSIONS.POSTS.DELETE_OWN);
      return false;
    },
  },

  // Pages
  pages: {
    canCreate: (userId: string) =>
      hasPermission(userId, PERMISSIONS.PAGES.CREATE),
    canRead: (userId: string) => hasPermission(userId, PERMISSIONS.PAGES.READ),
    canUpdate: (userId: string) =>
      hasPermission(userId, PERMISSIONS.PAGES.UPDATE),
    canDelete: (userId: string) =>
      hasPermission(userId, PERMISSIONS.PAGES.DELETE),
    canPublish: (userId: string) =>
      hasPermission(userId, PERMISSIONS.PAGES.PUBLISH),
    canManage: (userId: string) =>
      hasPermission(userId, PERMISSIONS.PAGES.MANAGE),
    canSetHomepage: (userId: string) =>
      hasPermission(userId, PERMISSIONS.PAGES.SET_HOMEPAGE),
    canDuplicate: (userId: string) =>
      hasPermission(userId, PERMISSIONS.PAGES.DUPLICATE),
  },

  // Media
  media: {
    canUpload: (userId: string) =>
      hasPermission(userId, PERMISSIONS.MEDIA.UPLOAD),
    canRead: (userId: string) => hasPermission(userId, PERMISSIONS.MEDIA.READ),
    canUpdate: (userId: string) =>
      hasPermission(userId, PERMISSIONS.MEDIA.UPDATE),
    canDelete: (userId: string) =>
      hasPermission(userId, PERMISSIONS.MEDIA.DELETE),
    canManage: (userId: string) =>
      hasPermission(userId, PERMISSIONS.MEDIA.MANAGE),
  },

  // Categories
  categories: {
    canCreate: (userId: string) =>
      hasPermission(userId, PERMISSIONS.CATEGORIES.CREATE),
    canRead: (userId: string) =>
      hasPermission(userId, PERMISSIONS.CATEGORIES.READ),
    canUpdate: (userId: string) =>
      hasPermission(userId, PERMISSIONS.CATEGORIES.UPDATE),
    canDelete: (userId: string) =>
      hasPermission(userId, PERMISSIONS.CATEGORIES.DELETE),
    canManage: (userId: string) =>
      hasPermission(userId, PERMISSIONS.CATEGORIES.MANAGE),
    canReorder: (userId: string) =>
      hasPermission(userId, PERMISSIONS.CATEGORIES.REORDER),
  },

  // Tags
  tags: {
    canCreate: (userId: string) =>
      hasPermission(userId, PERMISSIONS.TAGS.CREATE),
    canRead: (userId: string) => hasPermission(userId, PERMISSIONS.TAGS.READ),
    canUpdate: (userId: string) =>
      hasPermission(userId, PERMISSIONS.TAGS.UPDATE),
    canDelete: (userId: string) =>
      hasPermission(userId, PERMISSIONS.TAGS.DELETE),
    canManage: (userId: string) =>
      hasPermission(userId, PERMISSIONS.TAGS.MANAGE),
  },

  // Menus
  menus: {
    canCreate: (userId: string) =>
      hasPermission(userId, PERMISSIONS.MENUS.CREATE),
    canRead: (userId: string) => hasPermission(userId, PERMISSIONS.MENUS.READ),
    canUpdate: (userId: string) =>
      hasPermission(userId, PERMISSIONS.MENUS.UPDATE),
    canDelete: (userId: string) =>
      hasPermission(userId, PERMISSIONS.MENUS.DELETE),
    canManage: (userId: string) =>
      hasPermission(userId, PERMISSIONS.MENUS.MANAGE),
    canReorder: (userId: string) =>
      hasPermission(userId, PERMISSIONS.MENUS.REORDER),
  },
};

/**
 * System Management Permission Helpers
 */
export const systemPermissions = {
  settings: {
    canRead: (userId: string) =>
      hasPermission(userId, PERMISSIONS.SETTINGS.READ),
    canUpdate: (userId: string) =>
      hasPermission(userId, PERMISSIONS.SETTINGS.UPDATE),
    canManage: (userId: string) =>
      hasPermission(userId, PERMISSIONS.SETTINGS.MANAGE),
  },

  theme: {
    canRead: (userId: string) => hasPermission(userId, PERMISSIONS.THEME.READ),
    canUpdate: (userId: string) =>
      hasPermission(userId, PERMISSIONS.THEME.UPDATE),
    canManage: (userId: string) =>
      hasPermission(userId, PERMISSIONS.THEME.MANAGE),
  },

  translations: {
    canCreate: (userId: string) =>
      hasPermission(userId, PERMISSIONS.TRANSLATIONS.CREATE),
    canRead: (userId: string) =>
      hasPermission(userId, PERMISSIONS.TRANSLATIONS.READ),
    canUpdate: (userId: string) =>
      hasPermission(userId, PERMISSIONS.TRANSLATIONS.UPDATE),
    canDelete: (userId: string) =>
      hasPermission(userId, PERMISSIONS.TRANSLATIONS.DELETE),
    canManage: (userId: string) =>
      hasPermission(userId, PERMISSIONS.TRANSLATIONS.MANAGE),
  },

  analytics: {
    canRead: (userId: string) =>
      hasPermission(userId, PERMISSIONS.ANALYTICS.READ),
    canViewReports: (userId: string) =>
      hasPermission(userId, PERMISSIONS.ANALYTICS.VIEW_REPORTS),
    canExport: (userId: string) =>
      hasPermission(userId, PERMISSIONS.ANALYTICS.EXPORT),
  },

  system: {
    canManage: (userId: string) =>
      hasPermission(userId, PERMISSIONS.SYSTEM.MANAGE),
    canConfig: (userId: string) =>
      hasPermission(userId, PERMISSIONS.SYSTEM.CONFIG),
    canHealth: (userId: string) =>
      hasPermission(userId, PERMISSIONS.SYSTEM.HEALTH),
  },
};

/**
 * Permission Group Helpers
 */
export const groupPermissions = {
  isContentManager: (userId: string) =>
    hasAllPermissions(userId, PERMISSION_GROUPS.CONTENT_MANAGER),
  isUserManager: (userId: string) =>
    hasAllPermissions(userId, PERMISSION_GROUPS.USER_MANAGER),
  isAdmin: (userId: string) =>
    hasAllPermissions(userId, PERMISSION_GROUPS.ADMIN),
  isSuperAdmin: (userId: string) =>
    hasAllPermissions(userId, PERMISSION_GROUPS.SUPER_ADMIN),
};

/**
 * Resource ownership checks
 */
export const ownershipChecks = {
  /**
   * Check if user owns a resource or has global permission
   */
  canAccessResource: async (
    userId: string,
    resourceOwnerId: string | null,
    globalPermission: PermissionCheck,
    ownPermission: PermissionCheck,
  ): Promise<boolean> => {
    // Check global permission first
    if (await hasPermission(userId, globalPermission)) return true;

    // Check ownership permission
    if (
      resourceOwnerId === userId &&
      (await hasPermission(userId, ownPermission))
    )
      return true;

    return false;
  },

  /**
   * Check if user can access their own user profile
   */
  canAccessOwnProfile: async (
    userId: string,
    targetUserId: string,
  ): Promise<boolean> => {
    if (userId === targetUserId) {
      return await hasPermission(userId, PERMISSIONS.USERS.READ_OWN);
    }
    return await hasPermission(userId, PERMISSIONS.USERS.READ_ALL);
  },

  /**
   * Check if user can edit their own user profile
   */
  canEditOwnProfile: async (
    userId: string,
    targetUserId: string,
  ): Promise<boolean> => {
    if (userId === targetUserId) {
      return await hasPermission(userId, PERMISSIONS.USERS.UPDATE_OWN);
    }
    return await hasPermission(userId, PERMISSIONS.USERS.UPDATE_ALL);
  },
};

/**
 * Bulk permission check helper
 */
export async function checkMultiplePermissions(
  userId: string,
  permissions: { [key: string]: PermissionCheck },
): Promise<{ [key: string]: boolean }> {
  const results: { [key: string]: boolean } = {};

  for (const [key, permission] of Object.entries(permissions)) {
    results[key] = await hasPermission(userId, permission);
  }

  return results;
}

/**
 * Permission cache for request-scoped caching
 */
class PermissionCache {
  private cache = new Map<string, boolean>();

  getCacheKey(userId: string, permission: PermissionCheck): string {
    return `${userId}:${permission.resource}:${permission.action}:${permission.scope || "default"}`;
  }

  async checkPermission(
    userId: string,
    permission: PermissionCheck,
  ): Promise<boolean> {
    const key = this.getCacheKey(userId, permission);

    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    const result = await hasPermission(userId, permission);
    this.cache.set(key, result);
    return result;
  }

  clear(): void {
    this.cache.clear();
  }
}

export const permissionCache = new PermissionCache();

/**
 * Error classes for permission-related errors
 */
export class PermissionError extends Error {
  constructor(
    message: string,
    public code: string,
    public required?: PermissionCheck | PermissionCheck[],
  ) {
    super(message);
    this.name = "PermissionError";
  }
}

export class InsufficientPermissionError extends PermissionError {
  constructor(required: PermissionCheck | PermissionCheck[]) {
    super("Insufficient permissions", "INSUFFICIENT_PERMISSIONS", required);
  }
}

export class AccessDeniedError extends PermissionError {
  constructor(resource: string) {
    super(`Access denied to ${resource}`, "ACCESS_DENIED");
  }
}

/**
 * Utility functions
 */
export const utils = {
  /**
   * Format permission for display
   */
  formatPermission(permission: PermissionCheck): string {
    return `${permission.resource}:${permission.action}${permission.scope ? `:${permission.scope}` : ""}`;
  },

  /**
   * Parse permission string back to PermissionCheck
   */
  parsePermission(permissionString: string): PermissionCheck {
    const parts = permissionString.split(":");
    return {
      resource: parts[0],
      action: parts[1],
      scope: parts[2] || undefined,
    };
  },

  /**
   * Get all permissions for a user in a formatted way
   */
  async getUserPermissionSummary(userId: string): Promise<{
    permissions: string[];
    roles: string[];
    isAdmin: boolean;
    isSuperAdmin: boolean;
  }> {
    const userPermissions = await RBACService.getUserPermissions(userId);

    return {
      permissions: userPermissions.permissions.map((p) =>
        utils.formatPermission({
          resource: p.resource,
          action: p.action,
          scope: p.scope,
        }),
      ),
      roles: userPermissions.roles.map((r) => r.code),
      isAdmin: await isAdmin(userId),
      isSuperAdmin: await isSuperAdmin(userId),
    };
  },
};
