import { prisma } from "@core/database";
import type {
  PermissionCheck,
  UserPermissions,
  RoleWithPermissions,
  PermissionWithRoles,
} from "@/types/rbac";
import crypto from "crypto";

/**
 * Role-Based Access Control (RBAC) Service
 * Handles permission checking, role management, and access control
 */
export class RBACService {
  /**
   * Check if a user has a specific permission
   */
  static async hasPermission(
    userId: string,
    check: PermissionCheck,
  ): Promise<boolean> {
    try {
      const userPermissions = await this.getUserPermissions(userId);

      return userPermissions.permissions.some((permission) => {
        const resourceMatch = permission.resource === check.resource;
        const actionMatch = permission.action === check.action;
        const scopeMatch =
          !check.scope ||
          permission.scope === check.scope ||
          permission.scope === "global";

        return resourceMatch && actionMatch && scopeMatch;
      });
    } catch (error) {
      console.error("Error checking permission:", error);
      return false;
    }
  }

  /**
   * Check if a user has any of the specified permissions
   */
  static async hasAnyPermission(
    userId: string,
    checks: PermissionCheck[],
  ): Promise<boolean> {
    try {
      for (const check of checks) {
        if (await this.hasPermission(userId, check)) {
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error("Error checking any permission:", error);
      return false;
    }
  }

  /**
   * Check if a user has all of the specified permissions
   */
  static async hasAllPermissions(
    userId: string,
    checks: PermissionCheck[],
  ): Promise<boolean> {
    try {
      for (const check of checks) {
        if (!(await this.hasPermission(userId, check))) {
          return false;
        }
      }
      return true;
    } catch (error) {
      console.error("Error checking all permissions:", error);
      return false;
    }
  }

  /**
   * Get all permissions for a user (via roles)
   */
  static async getUserPermissions(userId: string): Promise<UserPermissions> {
    const userWithRoles = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        UserRole: {
          where: {
            isActive: true,
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          },
          include: {
            Role: {
              include: {
                RolePermission: {
                  include: {
                    Permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!userWithRoles) {
      throw new Error("User not found");
    }

    // Collect all permissions from all roles
    const permissionMap = new Map();
    const roles = [];

    for (const userRole of (userWithRoles as any).UserRole) {
      if (!userRole.Role.isActive) continue;

      roles.push({
        id: userRole.Role.id,
        code: userRole.Role.code,
        name: userRole.Role.name,
        level: userRole.Role.level,
        assignedAt: userRole.assignedAt,
        expiresAt: userRole.expiresAt,
        isActive: userRole.isActive,
      });

      for (const rolePermission of userRole.Role.RolePermission) {
        const permission = rolePermission.Permission;
        const key = `${permission.resource}:${permission.action}:${permission.scope}`;

        if (!permissionMap.has(key)) {
          permissionMap.set(key, {
            id: permission.id,
            code: permission.code,
            resource: permission.resource,
            action: permission.action,
            scope: permission.scope,
            grantedVia: {
              roleId: userRole.role.id,
              roleName: userRole.role.name,
              roleCode: userRole.role.code,
            },
          });
        }
      }
    }

    return {
      userId,
      permissions: Array.from(permissionMap.values()),
      roles,
    };
  }

  /**
   * Check if user has a specific role
   */
  static async hasRole(userId: string, roleCode: string): Promise<boolean> {
    try {
      const userRole = await prisma.userRole.findFirst({
        where: {
          userId,
          isActive: true,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          Role: {
            code: roleCode,
            isActive: true,
          },
        },
      });

      return !!userRole;
    } catch (error) {
      console.error("Error checking role:", error);
      return false;
    }
  }

  /**
   * Check if user has any of the specified roles
   */
  static async hasAnyRole(
    userId: string,
    roleCodes: string[],
  ): Promise<boolean> {
    try {
      const userRole = await prisma.userRole.findFirst({
        where: {
          userId,
          isActive: true,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          Role: {
            code: { in: roleCodes },
            isActive: true,
          },
        },
      });

      return !!userRole;
    } catch (error) {
      console.error("Error checking any role:", error);
      return false;
    }
  }

  /**
   * Get user's highest role level
   */
  static async getUserMaxLevel(userId: string): Promise<number> {
    try {
      const userRoles = await prisma.userRole.findMany({
        where: {
          userId,
          isActive: true,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          Role: {
            isActive: true,
          },
        },
        include: {
          Role: {
            select: { level: true },
          },
        },
      });

      if (userRoles.length === 0) {
        return 0;
      }

      return Math.max(...userRoles.map((ur) => ur.Role.level));
    } catch (error) {
      console.error("Error getting user max level:", error);
      return 0;
    }
  }

  /**
   * Check if user is admin (has admin-level role)
   */
  static async isAdmin(userId: string): Promise<boolean> {
    const maxLevel = await this.getUserMaxLevel(userId);
    return maxLevel >= 80; // Admin level or above
  }

  /**
   * Check if user is super admin
   */
  static async isSuperAdmin(userId: string): Promise<boolean> {
    return await this.hasRole(userId, "SUPER_ADMIN");
  }

  /**
   * Assign role to user
   */
  static async assignRole(
    userId: string,
    roleId: string,
    assignedBy: string,
    expiresAt?: Date,
  ): Promise<void> {
    // Check if role exists and is active
    const role = await prisma.role.findUnique({
      where: { id: roleId, isActive: true },
    });

    if (!role) {
      throw new Error("Role not found or inactive");
    }

    // Check if user exists and is active
    const user = await prisma.user.findUnique({
      where: { id: userId, isActive: true },
    });

    if (!user) {
      throw new Error("User not found or inactive");
    }

    // Check if assignment already exists
    const existingAssignment = await prisma.userRole.findUnique({
      where: {
        userId_roleId: {
          userId,
          roleId,
        },
      },
    });

    if (existingAssignment) {
      if (existingAssignment.isActive) {
        throw new Error("User already has this role");
      } else {
        // Reactivate existing assignment
        await prisma.userRole.update({
          where: { id: existingAssignment.id },
          data: {
            isActive: true,
            assignedBy,
            assignedAt: new Date(),
            expiresAt,
          },
        });
        return;
      }
    }

    // Create new assignment
    await prisma.userRole.create({
      data: {
        id: crypto.randomUUID(),
        userId,
        roleId,
        assignedBy,
        expiresAt,
      },
    });
  }

  /**
   * Remove role from user
   */
  static async removeRole(userId: string, roleId: string): Promise<void> {
    await prisma.userRole.updateMany({
      where: {
        userId,
        roleId,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });
  }

  /**
   * Get role by ID with permissions
   */
  static async getRoleWithPermissions(
    roleId: string,
  ): Promise<RoleWithPermissions | null> {
    const role = await prisma.role.findUnique({
      where: { id: roleId },
      include: {
        RolePermission: {
          include: {
            Permission: true,
          },
        },
        UserRole: {
          where: { isActive: true },
          include: {
            User: {
              select: {
                id: true,
                username: true,
                email: true,
                displayName: true,
              },
            },
          },
        },
        _count: {
          select: {
            RolePermission: true,
            UserRole: true,
          },
        },
      },
    });

    if (!role) return null;

    return {
      ...role,
      permissions: role.RolePermission.map((rp) => ({
        id: rp.id,
        roleId: rp.roleId,
        permissionId: rp.permissionId,
        grantedBy: rp.grantedBy,
        grantedAt: rp.grantedAt,
        permission: rp.Permission,
      })),
      users: role.UserRole.map((ur) => ({
        id: ur.id,
        userId: ur.userId,
        roleId: ur.roleId,
        assignedBy: ur.assignedBy,
        assignedAt: ur.assignedAt,
        expiresAt: ur.expiresAt,
        isActive: ur.isActive,
        user: ur.User,
      })),
      _count: {
        permissions: role._count.RolePermission,
        users: role._count.UserRole,
      },
    } as RoleWithPermissions;
  }

  /**
   * Get permission by ID with roles
   */
  static async getPermissionWithRoles(
    permissionId: string,
  ): Promise<PermissionWithRoles | null> {
    const permission = await prisma.permission.findUnique({
      where: { id: permissionId },
      include: {
        RolePermission: {
          include: {
            Role: true,
          },
        },
        _count: {
          select: {
            RolePermission: true,
          },
        },
      },
    });

    if (!permission) return null;

    return {
      ...permission,
      roles: permission.RolePermission.map((rp) => ({
        id: rp.id,
        roleId: rp.roleId,
        permissionId: rp.permissionId,
        grantedBy: rp.grantedBy,
        grantedAt: rp.grantedAt,
        role: rp.Role,
      })),
      _count: {
        roles: permission._count.RolePermission,
      },
    } as PermissionWithRoles;
  }

  /**
   * Create a middleware function for permission checking
   */
  static requirePermission(permission: PermissionCheck) {
    return async (userId: string): Promise<boolean> => {
      return await this.hasPermission(userId, permission);
    };
  }

  /**
   * Create a middleware function for role checking
   */
  static requireRole(roleCode: string) {
    return async (userId: string): Promise<boolean> => {
      return await this.hasRole(userId, roleCode);
    };
  }

  /**
   * Create a middleware function for admin checking
   */
  static requireAdmin() {
    return async (userId: string): Promise<boolean> => {
      return await this.isAdmin(userId);
    };
  }

  /**
   * Validate if user can perform action on resource
   * Supports scope-based access control
   */
  static async canAccess(
    userId: string,
    resource: string,
    action: string,
    targetResourceId?: string,
    targetUserId?: string,
  ): Promise<boolean> {
    // Check global permission first
    if (
      await this.hasPermission(userId, { resource, action, scope: "global" })
    ) {
      return true;
    }

    // Check own scope if target user is the same as current user
    if (targetUserId && targetUserId === userId) {
      if (
        await this.hasPermission(userId, { resource, action, scope: "own" })
      ) {
        return true;
      }
    }

    // Additional scope checks can be added here (department, team, etc.)

    return false;
  }

  /**
   * Clean up expired role assignments
   */
  static async cleanupExpiredRoles(): Promise<number> {
    const result = await prisma.userRole.updateMany({
      where: {
        isActive: true,
        expiresAt: {
          lte: new Date(),
        },
      },
      data: {
        isActive: false,
      },
    });

    return result.count;
  }

  /**
   * Get users with specific permission
   */
  static async getUsersWithPermission(
    permissionCode: string,
  ): Promise<string[]> {
    const userRoles = await prisma.userRole.findMany({
      where: {
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        Role: {
          isActive: true,
          RolePermission: {
            some: {
              Permission: {
                code: permissionCode,
                isActive: true,
              },
            },
          },
        },
      },
      select: {
        userId: true,
      },
      distinct: ["userId"],
    });

    return userRoles.map((ur) => ur.userId);
  }

  /**
   * Get roles with specific permission
   */
  static async getRolesWithPermission(
    permissionCode: string,
  ): Promise<string[]> {
    const rolePermissions = await prisma.rolePermission.findMany({
      where: {
        Permission: {
          code: permissionCode,
          isActive: true,
        },
        Role: {
          isActive: true,
        },
      },
      select: {
        roleId: true,
      },
      distinct: ["roleId"],
    });

    return rolePermissions.map((rp) => rp.roleId);
  }
}
