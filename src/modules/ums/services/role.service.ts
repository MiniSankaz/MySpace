import { prisma } from '@/core/database/prisma';
import { randomBytes } from 'crypto';

interface RoleData {
  name: string;
  code: string;
  description?: string;
  level?: number;
  isSystemRole?: boolean;
}

interface PermissionData {
  code: string;
  name: string;
  description?: string;
  resource: string;
  action: string;
  scope?: string;
}

export class RoleService {
  async createRole(data: RoleData, createdBy?: string) {
    try {
      // Check if role with same code exists
      const existing = await prisma.role.findUnique({
        where: { code: data.code }
      });

      if (existing) {
        throw new Error('Role with this code already exists');
      }

      const role = await prisma.role.create({
        data: {
          id: `role_${Date.now()}_${randomBytes(8).toString('hex')}`,
          name: data.name,
          code: data.code,
          description: data.description,
          level: data.level || 0,
          isSystemRole: data.isSystemRole || false,
          isActive: true,
          createdBy,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      return role;
    } catch (error) {
      console.error('Create role error:', error);
      throw error;
    }
  }

  async updateRole(roleId: string, data: Partial<RoleData>, updatedBy?: string) {
    try {
      const role = await prisma.role.update({
        where: { id: roleId },
        data: {
          ...data,
          updatedBy,
          updatedAt: new Date()
        }
      });

      return role;
    } catch (error) {
      console.error('Update role error:', error);
      throw error;
    }
  }

  async deleteRole(roleId: string) {
    try {
      // Check if it's a system role
      const role = await prisma.role.findUnique({
        where: { id: roleId }
      });

      if (role?.isSystemRole) {
        throw new Error('Cannot delete system role');
      }

      // Soft delete - deactivate the role
      await prisma.role.update({
        where: { id: roleId },
        data: { isActive: false }
      });

      return { success: true };
    } catch (error) {
      console.error('Delete role error:', error);
      throw error;
    }
  }

  async getRole(roleId: string) {
    try {
      const role = await prisma.role.findUnique({
        where: { id: roleId },
        include: {
          RolePermission: {
            include: {
              Permission: true
            }
          },
          UserRole: {
            where: { isActive: true },
            include: {
              User: {
                select: {
                  id: true,
                  email: true,
                  username: true,
                  displayName: true
                }
              }
            }
          }
        }
      });

      if (!role) {
        throw new Error('Role not found');
      }

      return {
        ...role,
        permissions: role.RolePermission.map(rp => rp.Permission),
        users: role.UserRole.map(ur => ur.User)
      };
    } catch (error) {
      console.error('Get role error:', error);
      throw error;
    }
  }

  async listRoles(includeInactive = false) {
    try {
      const where: any = {};
      if (!includeInactive) {
        where.isActive = true;
      }

      const roles = await prisma.role.findMany({
        where,
        include: {
          _count: {
            select: {
              UserRole: true,
              RolePermission: true
            }
          }
        },
        orderBy: {
          level: 'desc'
        }
      });

      return roles.map(role => ({
        ...role,
        userCount: role._count.UserRole,
        permissionCount: role._count.RolePermission
      }));
    } catch (error) {
      console.error('List roles error:', error);
      throw error;
    }
  }

  async createPermission(data: PermissionData) {
    try {
      // Check if permission exists
      const existing = await prisma.permission.findUnique({
        where: { code: data.code }
      });

      if (existing) {
        throw new Error('Permission with this code already exists');
      }

      const permission = await prisma.permission.create({
        data: {
          id: `perm_${Date.now()}_${randomBytes(8).toString('hex')}`,
          code: data.code,
          name: data.name,
          description: data.description,
          resource: data.resource,
          action: data.action,
          scope: data.scope || 'global',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      return permission;
    } catch (error) {
      console.error('Create permission error:', error);
      throw error;
    }
  }

  async listPermissions(resource?: string) {
    try {
      const where: any = { isActive: true };
      if (resource) {
        where.resource = resource;
      }

      const permissions = await prisma.permission.findMany({
        where,
        orderBy: [
          { resource: 'asc' },
          { action: 'asc' }
        ]
      });

      return permissions;
    } catch (error) {
      console.error('List permissions error:', error);
      throw error;
    }
  }

  async assignPermissionToRole(roleId: string, permissionId: string, grantedBy?: string) {
    try {
      // Check if already assigned
      const existing = await prisma.rolePermission.findFirst({
        where: {
          roleId,
          permissionId
        }
      });

      if (existing) {
        return existing;
      }

      const rolePermission = await prisma.rolePermission.create({
        data: {
          id: `roleperm_${Date.now()}_${randomBytes(8).toString('hex')}`,
          roleId,
          permissionId,
          grantedBy
        }
      });

      // Log permission grant
      await prisma.auditLog.create({
        data: {
          id: `audit_${Date.now()}_${randomBytes(8).toString('hex')}`,
          userId: grantedBy,
          action: 'permission_grant',
          resource: 'role_permission',
          resourceId: rolePermission.id,
          metadata: { roleId, permissionId },
          severity: 'info'
        }
      });

      return rolePermission;
    } catch (error) {
      console.error('Assign permission error:', error);
      throw error;
    }
  }

  async removePermissionFromRole(roleId: string, permissionId: string, removedBy?: string) {
    try {
      const rolePermission = await prisma.rolePermission.findFirst({
        where: {
          roleId,
          permissionId
        }
      });

      if (!rolePermission) {
        throw new Error('Permission not assigned to role');
      }

      await prisma.rolePermission.delete({
        where: { id: rolePermission.id }
      });

      // Log permission revoke
      await prisma.auditLog.create({
        data: {
          id: `audit_${Date.now()}_${randomBytes(8).toString('hex')}`,
          userId: removedBy,
          action: 'permission_revoke',
          resource: 'role_permission',
          resourceId: rolePermission.id,
          metadata: { roleId, permissionId },
          severity: 'info'
        }
      });

      return { success: true };
    } catch (error) {
      console.error('Remove permission error:', error);
      throw error;
    }
  }

  async checkUserPermission(userId: string, resource: string, action: string): Promise<boolean> {
    try {
      const userRoles = await prisma.userRole.findMany({
        where: {
          userId,
          isActive: true
        },
        include: {
          Role: {
            include: {
              RolePermission: {
                include: {
                  Permission: true
                }
              }
            }
          }
        }
      });

      // Check if user has required permission through any role
      for (const userRole of userRoles) {
        const hasPermission = userRole.Role.RolePermission.some(rp => 
          rp.Permission.resource === resource &&
          rp.Permission.action === action &&
          rp.Permission.isActive
        );

        if (hasPermission) {
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Check permission error:', error);
      return false;
    }
  }

  async getUserPermissions(userId: string) {
    try {
      const userRoles = await prisma.userRole.findMany({
        where: {
          userId,
          isActive: true
        },
        include: {
          Role: {
            include: {
              RolePermission: {
                include: {
                  Permission: true
                }
              }
            }
          }
        }
      });

      // Collect all unique permissions
      const permissionsMap = new Map();

      for (const userRole of userRoles) {
        for (const rolePermission of userRole.Role.RolePermission) {
          if (rolePermission.Permission.isActive) {
            permissionsMap.set(
              rolePermission.Permission.code,
              rolePermission.Permission
            );
          }
        }
      }

      return Array.from(permissionsMap.values());
    } catch (error) {
      console.error('Get user permissions error:', error);
      throw error;
    }
  }

  async initializeDefaultRoles() {
    try {
      const defaultRoles = [
        {
          name: 'Administrator',
          code: 'admin',
          description: 'Full system access',
          level: 100,
          isSystemRole: true
        },
        {
          name: 'Manager',
          code: 'manager',
          description: 'Management access',
          level: 50,
          isSystemRole: true
        },
        {
          name: 'User',
          code: 'user',
          description: 'Standard user access',
          level: 10,
          isSystemRole: true
        },
        {
          name: 'Guest',
          code: 'guest',
          description: 'Limited guest access',
          level: 1,
          isSystemRole: true
        }
      ];

      for (const roleData of defaultRoles) {
        const existing = await prisma.role.findUnique({
          where: { code: roleData.code }
        });

        if (!existing) {
          await this.createRole(roleData);
          console.log(`Created default role: ${roleData.name}`);
        }
      }

      // Initialize default permissions
      const defaultPermissions = [
        // User permissions
        { code: 'user.view', name: 'View Users', resource: 'user', action: 'view' },
        { code: 'user.create', name: 'Create Users', resource: 'user', action: 'create' },
        { code: 'user.update', name: 'Update Users', resource: 'user', action: 'update' },
        { code: 'user.delete', name: 'Delete Users', resource: 'user', action: 'delete' },
        
        // Role permissions
        { code: 'role.view', name: 'View Roles', resource: 'role', action: 'view' },
        { code: 'role.create', name: 'Create Roles', resource: 'role', action: 'create' },
        { code: 'role.update', name: 'Update Roles', resource: 'role', action: 'update' },
        { code: 'role.delete', name: 'Delete Roles', resource: 'role', action: 'delete' },
        
        // System permissions
        { code: 'system.config', name: 'System Configuration', resource: 'system', action: 'config' },
        { code: 'system.audit', name: 'View Audit Logs', resource: 'system', action: 'audit' },
        
        // Content permissions
        { code: 'content.view', name: 'View Content', resource: 'content', action: 'view' },
        { code: 'content.create', name: 'Create Content', resource: 'content', action: 'create' },
        { code: 'content.update', name: 'Update Content', resource: 'content', action: 'update' },
        { code: 'content.delete', name: 'Delete Content', resource: 'content', action: 'delete' }
      ];

      for (const permData of defaultPermissions) {
        const existing = await prisma.permission.findUnique({
          where: { code: permData.code }
        });

        if (!existing) {
          await this.createPermission(permData);
          console.log(`Created default permission: ${permData.name}`);
        }
      }

      // Assign all permissions to admin role
      const adminRole = await prisma.role.findUnique({
        where: { code: 'admin' }
      });

      if (adminRole) {
        const allPermissions = await prisma.permission.findMany({
          where: { isActive: true }
        });

        for (const permission of allPermissions) {
          await this.assignPermissionToRole(adminRole.id, permission.id).catch(() => {
            // Permission might already be assigned
          });
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Initialize default roles error:', error);
      throw error;
    }
  }
}