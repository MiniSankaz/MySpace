import { prisma } from '@/core/database/prisma';
import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';

interface UserUpdateData {
  firstName?: string;
  lastName?: string;
  displayName?: string;
  phone?: string;
  bio?: string;
  avatar?: string;
}

interface UserProfileData {
  dateOfBirth?: Date;
  gender?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  timezone?: string;
  language?: string;
  currency?: string;
  newsletter?: boolean;
  occupation?: string;
  company?: string;
  website?: string;
  interests?: string[];
  skills?: string[];
  socialLinks?: any;
  notifications?: any;
  preferences?: any;
}

interface UserFilters {
  search?: string;
  isActive?: boolean;
  role?: string;
  department?: string;
  team?: string;
  createdFrom?: Date;
  createdTo?: Date;
}

export class UserService {
  async getUser(userId: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          UserProfile: true,
          UserRole: {
            include: {
              Role: true
            }
          },
          UserDepartment: {
            include: {
              Department: true
            }
          },
          TeamMember: {
            include: {
              Team: true
            }
          }
        }
      });

      if (!user) {
        throw new Error('User not found');
      }

      return this.formatUserResponse(user);
    } catch (error) {
      console.error('Get user error:', error);
      throw error;
    }
  }

  async getUserByEmail(email: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { email },
        include: {
          UserProfile: true,
          UserRole: {
            include: {
              Role: true
            }
          }
        }
      });

      if (!user) {
        throw new Error('User not found');
      }

      return this.formatUserResponse(user);
    } catch (error) {
      console.error('Get user by email error:', error);
      throw error;
    }
  }

  async listUsers(filters: UserFilters = {}, page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;
      const where: any = {
        deletedAt: null
      };

      // Apply filters
      if (filters.isActive !== undefined) {
        where.isActive = filters.isActive;
      }

      if (filters.search) {
        where.OR = [
          { email: { contains: filters.search, mode: 'insensitive' } },
          { username: { contains: filters.search, mode: 'insensitive' } },
          { firstName: { contains: filters.search, mode: 'insensitive' } },
          { lastName: { contains: filters.search, mode: 'insensitive' } }
        ];
      }

      if (filters.role) {
        where.UserRole = {
          some: {
            Role: {
              code: filters.role
            }
          }
        };
      }

      if (filters.department) {
        where.UserDepartment = {
          some: {
            Department: {
              code: filters.department
            }
          }
        };
      }

      if (filters.team) {
        where.TeamMember = {
          some: {
            Team: {
              code: filters.team
            }
          }
        };
      }

      if (filters.createdFrom || filters.createdTo) {
        where.createdAt = {};
        if (filters.createdFrom) {
          where.createdAt.gte = filters.createdFrom;
        }
        if (filters.createdTo) {
          where.createdAt.lte = filters.createdTo;
        }
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip,
          take: limit,
          include: {
            UserProfile: true,
            UserRole: {
              include: {
                Role: true
              }
            },
            UserDepartment: {
              include: {
                Department: true
              }
            },
            TeamMember: {
              include: {
                Team: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        }),
        prisma.user.count({ where })
      ]);

      return {
        users: users.map(user => this.formatUserResponse(user)),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('List users error:', error);
      throw error;
    }
  }

  async updateUser(userId: string, data: UserUpdateData) {
    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          ...data,
          updatedAt: new Date()
        },
        include: {
          UserProfile: true,
          UserRole: {
            include: {
              Role: true
            }
          }
        }
      });

      // Log update
      await prisma.auditLog.create({
        data: {
          id: `audit_${Date.now()}_${randomBytes(8).toString('hex')}`,
          userId,
          action: 'user_update',
          resource: 'user',
          resourceId: userId,
          changes: data,
          severity: 'info'
        }
      });

      return this.formatUserResponse(user);
    } catch (error) {
      console.error('Update user error:', error);
      throw error;
    }
  }

  async updateUserProfile(userId: string, data: UserProfileData) {
    try {
      let profile = await prisma.userProfile.findUnique({
        where: { userId }
      });

      if (!profile) {
        profile = await prisma.userProfile.create({
          data: {
            id: `profile_${Date.now()}_${randomBytes(8).toString('hex')}`,
            userId,
            ...data
          }
        });
      } else {
        profile = await prisma.userProfile.update({
          where: { id: profile.id },
          data: {
            ...data,
            updatedAt: new Date()
          }
        });
      }

      return profile;
    } catch (error) {
      console.error('Update user profile error:', error);
      throw error;
    }
  }

  async deleteUser(userId: string, deletedBy?: string) {
    try {
      // Soft delete
      await prisma.user.update({
        where: { id: userId },
        data: {
          isActive: false,
          deletedAt: new Date(),
          deletedBy
        }
      });

      // Log deletion
      await prisma.auditLog.create({
        data: {
          id: `audit_${Date.now()}_${randomBytes(8).toString('hex')}`,
          userId: deletedBy || userId,
          action: 'user_delete',
          resource: 'user',
          resourceId: userId,
          severity: 'warning'
        }
      });

      return { success: true };
    } catch (error) {
      console.error('Delete user error:', error);
      throw error;
    }
  }

  async assignRole(userId: string, roleId: string, assignedBy?: string) {
    try {
      // Check if role assignment already exists
      const existing = await prisma.userRole.findFirst({
        where: {
          userId,
          roleId
        }
      });

      if (existing) {
        // Reactivate if inactive
        if (!existing.isActive) {
          await prisma.userRole.update({
            where: { id: existing.id },
            data: { isActive: true }
          });
        }
        return existing;
      }

      // Create new role assignment
      const userRole = await prisma.userRole.create({
        data: {
          id: `userrole_${Date.now()}_${randomBytes(8).toString('hex')}`,
          userId,
          roleId,
          assignedBy,
          isActive: true
        }
      });

      // Log role assignment
      await prisma.auditLog.create({
        data: {
          id: `audit_${Date.now()}_${randomBytes(8).toString('hex')}`,
          userId: assignedBy || userId,
          action: 'role_assign',
          resource: 'user_role',
          resourceId: userRole.id,
          metadata: { userId, roleId },
          severity: 'info'
        }
      });

      return userRole;
    } catch (error) {
      console.error('Assign role error:', error);
      throw error;
    }
  }

  async removeRole(userId: string, roleId: string, removedBy?: string) {
    try {
      const userRole = await prisma.userRole.findFirst({
        where: {
          userId,
          roleId
        }
      });

      if (!userRole) {
        throw new Error('Role assignment not found');
      }

      // Deactivate role assignment
      await prisma.userRole.update({
        where: { id: userRole.id },
        data: { isActive: false }
      });

      // Log role removal
      await prisma.auditLog.create({
        data: {
          id: `audit_${Date.now()}_${randomBytes(8).toString('hex')}`,
          userId: removedBy || userId,
          action: 'role_remove',
          resource: 'user_role',
          resourceId: userRole.id,
          metadata: { userId, roleId },
          severity: 'info'
        }
      });

      return { success: true };
    } catch (error) {
      console.error('Remove role error:', error);
      throw error;
    }
  }

  async assignToDepartment(userId: string, departmentId: string, position?: string, isPrimary = false) {
    try {
      const existing = await prisma.userDepartment.findFirst({
        where: {
          userId,
          departmentId
        }
      });

      if (existing) {
        return await prisma.userDepartment.update({
          where: { id: existing.id },
          data: {
            position,
            isPrimary
          }
        });
      }

      // If setting as primary, unset other primary departments
      if (isPrimary) {
        await prisma.userDepartment.updateMany({
          where: {
            userId,
            isPrimary: true
          },
          data: {
            isPrimary: false
          }
        });
      }

      return await prisma.userDepartment.create({
        data: {
          id: `userdept_${Date.now()}_${randomBytes(8).toString('hex')}`,
          userId,
          departmentId,
          position,
          isPrimary
        }
      });
    } catch (error) {
      console.error('Assign to department error:', error);
      throw error;
    }
  }

  async addToTeam(userId: string, teamId: string, role = 'member') {
    try {
      const existing = await prisma.teamMember.findFirst({
        where: {
          userId,
          teamId
        }
      });

      if (existing) {
        return await prisma.teamMember.update({
          where: { id: existing.id },
          data: { role }
        });
      }

      return await prisma.teamMember.create({
        data: {
          id: `teammember_${Date.now()}_${randomBytes(8).toString('hex')}`,
          userId,
          teamId,
          role
        }
      });
    } catch (error) {
      console.error('Add to team error:', error);
      throw error;
    }
  }

  async getUserActivity(userId: string, limit = 50) {
    try {
      const activities = await prisma.userActivity.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit
      });

      return activities;
    } catch (error) {
      console.error('Get user activity error:', error);
      throw error;
    }
  }

  async getUserNotifications(userId: string, unreadOnly = false) {
    try {
      const where: any = { userId };
      if (unreadOnly) {
        where.isRead = false;
      }

      const notifications = await prisma.userNotification.findMany({
        where,
        orderBy: { sentAt: 'desc' }
      });

      return notifications;
    } catch (error) {
      console.error('Get user notifications error:', error);
      throw error;
    }
  }

  async markNotificationAsRead(notificationId: string, userId: string) {
    try {
      await prisma.userNotification.update({
        where: {
          id: notificationId,
          userId // Ensure user owns the notification
        },
        data: {
          isRead: true,
          readAt: new Date()
        }
      });

      return { success: true };
    } catch (error) {
      console.error('Mark notification as read error:', error);
      throw error;
    }
  }

  async sendNotification(userId: string, title: string, message: string, type = 'in-app', data?: any) {
    try {
      const notification = await prisma.userNotification.create({
        data: {
          id: `notif_${Date.now()}_${randomBytes(8).toString('hex')}`,
          userId,
          type,
          title,
          message,
          data
        }
      });

      // TODO: Implement push/email notification based on type

      return notification;
    } catch (error) {
      console.error('Send notification error:', error);
      throw error;
    }
  }

  async createApiKey(userId: string, name: string, scopes: string[] = []) {
    try {
      const apiKey = randomBytes(32).toString('hex');
      const hashedKey = await bcrypt.hash(apiKey, 10);

      const key = await prisma.userApiKey.create({
        data: {
          id: `apikey_${Date.now()}_${randomBytes(8).toString('hex')}`,
          userId,
          name,
          key: hashedKey,
          scopes,
          isActive: true
        }
      });

      return {
        id: key.id,
        name: key.name,
        key: apiKey, // Return the unhashed key only once
        scopes: key.scopes,
        createdAt: key.createdAt
      };
    } catch (error) {
      console.error('Create API key error:', error);
      throw error;
    }
  }

  async revokeApiKey(keyId: string, userId: string) {
    try {
      await prisma.userApiKey.update({
        where: {
          id: keyId,
          userId // Ensure user owns the key
        },
        data: {
          isActive: false
        }
      });

      return { success: true };
    } catch (error) {
      console.error('Revoke API key error:', error);
      throw error;
    }
  }

  private formatUserResponse(user: any) {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      displayName: user.displayName,
      avatar: user.avatar,
      bio: user.bio,
      phone: user.phone,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      mfaEnabled: user.mfaEnabled,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      profile: user.UserProfile,
      roles: user.UserRole?.map((ur: any) => ({
        id: ur.Role.id,
        name: ur.Role.name,
        code: ur.Role.code
      })) || [],
      departments: user.UserDepartment?.map((ud: any) => ({
        id: ud.Department.id,
        name: ud.Department.name,
        code: ud.Department.code,
        position: ud.position,
        isPrimary: ud.isPrimary
      })) || [],
      teams: user.TeamMember?.map((tm: any) => ({
        id: tm.Team.id,
        name: tm.Team.name,
        code: tm.Team.code,
        role: tm.role
      })) || []
    };
  }
}