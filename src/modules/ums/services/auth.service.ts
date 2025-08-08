import { prisma } from '@/core/database/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { addDays, addHours, isBefore } from 'date-fns';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface UserRegistrationData {
  email: string;
  username: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

interface LoginCredentials {
  emailOrUsername: string;
  password: string;
  ipAddress?: string;
  userAgent?: string;
}

interface TokenPayload {
  userId: string;
  email: string;
  username: string;
  roles: string[];
}

export class AuthService {
  private readonly JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
  private readonly JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret';
  private readonly ACCESS_TOKEN_EXPIRY = '15m';
  private readonly REFRESH_TOKEN_EXPIRY = '7d';
  private readonly MAX_LOGIN_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION = 30; // minutes

  async register(data: UserRegistrationData) {
    try {
      // Check if user already exists
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email: data.email },
            { username: data.username }
          ]
        }
      });

      if (existingUser) {
        throw new Error('User with this email or username already exists');
      }

      // Hash password
      const passwordHash = await bcrypt.hash(data.password, 12);

      // Create user
      const user = await prisma.user.create({
        data: {
          id: `user_${Date.now()}_${randomBytes(8).toString('hex')}`,
          email: data.email,
          username: data.username,
          passwordHash,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          displayName: data.firstName ? `${data.firstName} ${data.lastName || ''}`.trim() : data.username,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      // Create default user profile
      await prisma.userProfile.create({
        data: {
          id: `profile_${Date.now()}_${randomBytes(8).toString('hex')}`,
          userId: user.id,
          language: 'en',
          timezone: 'UTC',
          currency: 'USD'
        }
      });

      // Assign default role
      const defaultRole = await prisma.role.findFirst({
        where: { code: 'user' }
      });

      if (defaultRole) {
        await prisma.userRole.create({
          data: {
            id: `role_${Date.now()}_${randomBytes(8).toString('hex')}`,
            userId: user.id,
            roleId: defaultRole.id,
            isActive: true
          }
        });
      }

      // Generate tokens
      const tokens = await this.generateTokens(user.id);

      // Create session
      await this.createSession(user.id, tokens.refreshToken);

      return {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          displayName: user.displayName
        },
        tokens
      };
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  async login(credentials: LoginCredentials) {
    try {
      // Find user by email or username
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { email: credentials.emailOrUsername },
            { username: credentials.emailOrUsername }
          ],
          isActive: true,
          deletedAt: null
        },
        include: {
          UserRole: {
            where: { isActive: true },
            include: {
              Role: true
            }
          }
        }
      });

      if (!user) {
        throw new Error('Invalid credentials');
      }

      // Check if account is locked
      if (user.accountLockedUntil && isBefore(new Date(), user.accountLockedUntil)) {
        throw new Error('Account is locked. Please try again later.');
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(credentials.password, user.passwordHash);

      if (!isValidPassword) {
        // Increment failed login attempts
        await this.handleFailedLogin(user.id);
        throw new Error('Invalid credentials');
      }

      // Check if password needs to be changed
      if (user.mustChangePassword) {
        throw new Error('Password change required');
      }

      // Reset failed login attempts
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: 0,
          accountLockedUntil: null,
          lastLoginAt: new Date(),
          lastLoginIp: credentials.ipAddress
        }
      });

      // Log successful login
      await prisma.loginHistory.create({
        data: {
          id: `login_${Date.now()}_${randomBytes(8).toString('hex')}`,
          userId: user.id,
          ipAddress: credentials.ipAddress || 'unknown',
          userAgent: credentials.userAgent,
          success: true
        }
      });

      // Track user activity
      await prisma.userActivity.create({
        data: {
          id: `activity_${Date.now()}_${randomBytes(8).toString('hex')}`,
          userId: user.id,
          action: 'login',
          ipAddress: credentials.ipAddress,
          userAgent: credentials.userAgent
        }
      });

      // Generate tokens
      const tokens = await this.generateTokens(user.id);

      // Create session
      await this.createSession(user.id, tokens.refreshToken, credentials.ipAddress, credentials.userAgent);

      return {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          displayName: user.displayName,
          roles: user.UserRole.map(ur => ur.Role.code)
        },
        tokens
      };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async logout(userId: string, refreshToken?: string) {
    try {
      // Invalidate all sessions or specific session
      if (refreshToken) {
        await prisma.session.deleteMany({
          where: {
            userId,
            sessionToken: refreshToken
          }
        });
      } else {
        await prisma.session.deleteMany({
          where: { userId }
        });
      }

      // Track logout activity
      await prisma.userActivity.create({
        data: {
          id: `activity_${Date.now()}_${randomBytes(8).toString('hex')}`,
          userId,
          action: 'logout'
        }
      });

      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }

  async refreshTokens(refreshToken: string) {
    try {
      // Verify refresh token
      const payload = jwt.verify(refreshToken, this.JWT_REFRESH_SECRET) as TokenPayload;

      // Check if session exists
      const session = await prisma.session.findFirst({
        where: {
          userId: payload.userId,
          sessionToken: refreshToken,
          expires: { gt: new Date() }
        }
      });

      if (!session) {
        throw new Error('Invalid refresh token');
      }

      // Generate new tokens
      const tokens = await this.generateTokens(payload.userId);

      // Update session
      await prisma.session.update({
        where: { id: session.id },
        data: {
          sessionToken: tokens.refreshToken,
          expires: addDays(new Date(), 7),
          updatedAt: new Date()
        }
      });

      return tokens;
    } catch (error) {
      console.error('Token refresh error:', error);
      throw error;
    }
  }

  async verifyToken(token: string): Promise<TokenPayload> {
    try {
      const payload = jwt.verify(token, this.JWT_SECRET) as TokenPayload;
      return payload;
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isValidPassword) {
        throw new Error('Current password is incorrect');
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(newPassword, 12);

      // Update password
      await prisma.user.update({
        where: { id: userId },
        data: {
          passwordHash: newPasswordHash,
          passwordChangedAt: new Date(),
          mustChangePassword: false
        }
      });

      // Log password change
      await prisma.auditLog.create({
        data: {
          id: `audit_${Date.now()}_${randomBytes(8).toString('hex')}`,
          userId,
          action: 'password_change',
          resource: 'user',
          resourceId: userId,
          severity: 'info'
        }
      });

      return { success: true };
    } catch (error) {
      console.error('Password change error:', error);
      throw error;
    }
  }

  async requestPasswordReset(email: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { email }
      });

      if (!user) {
        // Don't reveal if user exists
        return { success: true };
      }

      // Generate reset token
      const resetToken = randomBytes(32).toString('hex');

      // Save reset token
      await prisma.passwordReset.create({
        data: {
          id: `reset_${Date.now()}_${randomBytes(8).toString('hex')}`,
          userId: user.id,
          token: resetToken,
          expires: addHours(new Date(), 1)
        }
      });

      // TODO: Send reset email
      console.log('Password reset token:', resetToken);

      return { success: true, token: resetToken }; // Remove token in production
    } catch (error) {
      console.error('Password reset request error:', error);
      throw error;
    }
  }

  async resetPassword(token: string, newPassword: string) {
    try {
      // Find valid reset token
      const resetRequest = await prisma.passwordReset.findFirst({
        where: {
          token,
          used: false,
          expires: { gt: new Date() }
        }
      });

      if (!resetRequest) {
        throw new Error('Invalid or expired reset token');
      }

      // Hash new password
      const passwordHash = await bcrypt.hash(newPassword, 12);

      // Update password
      await prisma.user.update({
        where: { id: resetRequest.userId },
        data: {
          passwordHash,
          passwordChangedAt: new Date(),
          mustChangePassword: false
        }
      });

      // Mark token as used
      await prisma.passwordReset.update({
        where: { id: resetRequest.id },
        data: {
          used: true,
          usedAt: new Date()
        }
      });

      return { success: true };
    } catch (error) {
      console.error('Password reset error:', error);
      throw error;
    }
  }

  private async generateTokens(userId: string): Promise<AuthTokens> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        UserRole: {
          where: { isActive: true },
          include: {
            Role: true
          }
        }
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      username: user.username,
      roles: user.UserRole.map(ur => ur.Role.code)
    };

    const accessToken = jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.ACCESS_TOKEN_EXPIRY
    });

    const refreshToken = jwt.sign(payload, this.JWT_REFRESH_SECRET, {
      expiresIn: this.REFRESH_TOKEN_EXPIRY
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 900 // 15 minutes in seconds
    };
  }

  private async createSession(userId: string, refreshToken: string, ipAddress?: string, userAgent?: string) {
    await prisma.session.create({
      data: {
        id: `session_${Date.now()}_${randomBytes(8).toString('hex')}`,
        userId,
        sessionToken: refreshToken,
        expires: addDays(new Date(), 7),
        ipAddress,
        userAgent,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
  }

  private async handleFailedLogin(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) return;

    const failedAttempts = user.failedLoginAttempts + 1;
    const updateData: any = {
      failedLoginAttempts: failedAttempts
    };

    // Lock account after max attempts
    if (failedAttempts >= this.MAX_LOGIN_ATTEMPTS) {
      updateData.accountLockedUntil = addMinutes(new Date(), this.LOCKOUT_DURATION);
    }

    await prisma.user.update({
      where: { id: userId },
      data: updateData
    });

    // Log failed attempt
    await prisma.loginHistory.create({
      data: {
        id: `login_${Date.now()}_${randomBytes(8).toString('hex')}`,
        userId,
        ipAddress: 'unknown',
        success: false,
        failureReason: 'Invalid password'
      }
    });
  }
}

// Helper function - add this if not already imported
function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60000);
}