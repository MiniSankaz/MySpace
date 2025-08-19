import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import {
  PrismaClient,
  User,
  Role,
  UserRole as PrismaUserRole,
} from "@prisma/client";
import { logger } from "../utils/logger";
import {
  LoginRequest,
  LoginResponse,
  CreateUserRequest,
  JWTPayload,
  RefreshTokenRequest,
} from "../types";

// Extended User type with roles
type UserWithRoles = User & {
  UserRole?: (PrismaUserRole & { Role: Role })[];
};

export class AuthService {
  private prisma: PrismaClient;
  private redis: any;
  private jwtSecret: string;
  private jwtExpiresIn: string;
  private refreshTokenExpiresIn: string;
  private refreshTokens: Map<string, { userId: string; expiresAt: Date }> =
    new Map();

  constructor(prisma: PrismaClient, redis: any) {
    this.prisma = prisma;
    this.redis = redis;
    this.jwtSecret = process.env.JWT_SECRET || "your-secret-key";
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || "1h";
    this.refreshTokenExpiresIn = process.env.REFRESH_TOKEN_EXPIRES_IN || "7d";
  }

  async register(
    userData: CreateUserRequest,
  ): Promise<Omit<UserWithRoles, "passwordHash" | "mfaSecret">> {
    try {
      // Check if user already exists
      const existingUser = await this.prisma.user.findUnique({
        where: { email: userData.email },
      });

      if (existingUser) {
        throw new Error("User with this email already exists");
      }

      if (userData.username) {
        const existingUsername = await this.prisma.user.findUnique({
          where: { username: userData.username },
        });

        if (existingUsername) {
          throw new Error("Username already taken");
        }
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 12);

      // Create user with role in a transaction
      const result = await this.prisma.$transaction(async (tx) => {
        // Create user
        const user = await tx.user.create({
          data: {
            id: uuidv4(),
            email: userData.email,
            passwordHash: hashedPassword,
            firstName: userData.firstName,
            lastName: userData.lastName,
            username: userData.username || userData.email.split("@")[0],
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });

        // Find or create USER role
        let userRole = await tx.role.findFirst({
          where: { code: "USER" },
        });

        if (!userRole) {
          userRole = await tx.role.create({
            data: {
              id: uuidv4(),
              name: "User",
              code: "USER",
              description: "Standard user role",
              level: 1,
              isSystemRole: true,
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          });
        }

        // Assign role to user
        await tx.userRole.create({
          data: {
            id: uuidv4(),
            userId: user.id,
            roleId: userRole.id,
            isActive: true,
          },
        });

        // Return user with roles
        return await tx.user.findUnique({
          where: { id: user.id },
          include: {
            UserRole: {
              include: {
                Role: true,
              },
            },
          },
        });
      });

      const user = result as UserWithRoles;

      logger.info("User registered successfully", {
        userId: user.id,
        email: user.email,
        roles: user.UserRole?.map((ur) => ur.Role.code),
      });

      // Return user without sensitive data
      const { passwordHash, mfaSecret, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error: any) {
      logger.error("Registration failed:", {
        error: error.message,
        email: userData.email,
      });
      throw error;
    }
  }

  async login(
    loginData: LoginRequest,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<LoginResponse> {
    try {
      // Find user by email with roles
      const user = (await this.prisma.user.findUnique({
        where: { email: loginData.email },
        include: {
          UserRole: {
            include: {
              Role: true,
            },
          },
        },
      })) as UserWithRoles;

      if (!user) {
        throw new Error("Invalid email or password");
      }

      if (!user.isActive) {
        throw new Error("Account is deactivated");
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(
        loginData.password,
        user.passwordHash,
      );

      if (!isPasswordValid) {
        throw new Error("Invalid email or password");
      }

      // Get user roles
      const roles = user.UserRole?.map((ur) => ur.Role.code) || ["USER"];

      // Generate tokens
      const accessToken = this.generateAccessToken({
        id: user.id,
        email: user.email,
        roles,
      });

      const refreshToken = await this.generateRefreshToken(user.id);

      // Update last login
      await this.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      // Create session (optional)
      if (loginData.rememberMe) {
        await this.createSession(user.id, accessToken, userAgent, ipAddress);
      }

      logger.info("User logged in successfully", {
        userId: user.id,
        email: user.email,
        rememberMe: loginData.rememberMe,
        ipAddress,
      });

      const { passwordHash, mfaSecret, ...userWithoutPassword } = user;

      return {
        user: userWithoutPassword,
        tokens: {
          accessToken,
          refreshToken: refreshToken.token,
          expiresAt: new Date(
            Date.now() + this.parseExpiration(this.jwtExpiresIn),
          ),
        },
      };
    } catch (error: any) {
      logger.error("Login failed:", {
        error: error.message,
        email: loginData.email,
        ipAddress,
      });
      throw error;
    }
  }

  async refreshToken(
    refreshTokenData: RefreshTokenRequest,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      // Check refresh token in memory store (in production, use Redis or DB)
      const storedToken = this.refreshTokens.get(refreshTokenData.refreshToken);

      if (!storedToken) {
        throw new Error("Invalid refresh token");
      }

      if (storedToken.expiresAt < new Date()) {
        this.refreshTokens.delete(refreshTokenData.refreshToken);
        throw new Error("Refresh token has expired");
      }

      // Get user with roles
      const user = (await this.prisma.user.findUnique({
        where: { id: storedToken.userId },
        include: {
          UserRole: {
            include: {
              Role: true,
            },
          },
        },
      })) as UserWithRoles;

      if (!user || !user.isActive) {
        throw new Error("User account is deactivated");
      }

      const roles = user.UserRole?.map((ur) => ur.Role.code) || ["USER"];

      // Generate new tokens
      const newAccessToken = this.generateAccessToken({
        id: user.id,
        email: user.email,
        roles,
      });

      const newRefreshToken = await this.generateRefreshToken(user.id);

      // Remove old refresh token
      this.refreshTokens.delete(refreshTokenData.refreshToken);

      logger.info("Token refreshed successfully", {
        userId: user.id,
        email: user.email,
      });

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken.token,
      };
    } catch (error: any) {
      logger.error("Token refresh failed:", {
        error: error.message,
      });
      throw error;
    }
  }

  async logout(token: string): Promise<void> {
    try {
      // Decode token to get user info
      const decoded = jwt.verify(token, this.jwtSecret) as JWTPayload;

      // Add token to Redis blacklist
      const expiresIn = Math.max(
        0,
        decoded.exp! - Math.floor(Date.now() / 1000),
      );
      await this.redis.setEx(`blacklist:${token}`, expiresIn, "revoked");

      // Remove user sessions
      await this.prisma.session.deleteMany({
        where: {
          userId: decoded.id,
        },
      });

      // Remove refresh tokens for this user
      for (const [key, value] of this.refreshTokens.entries()) {
        if (value.userId === decoded.id) {
          this.refreshTokens.delete(key);
        }
      }

      logger.info("User logged out successfully", {
        userId: decoded.id,
        email: decoded.email,
      });
    } catch (error: any) {
      logger.error("Logout failed:", {
        error: error.message,
      });
      throw error;
    }
  }

  async validateToken(token: string): Promise<JWTPayload | null> {
    try {
      // Check if token is blacklisted
      const isBlacklisted = await this.redis.get(`blacklist:${token}`);
      if (isBlacklisted) {
        return null;
      }

      // Verify JWT token
      const decoded = jwt.verify(token, this.jwtSecret) as JWTPayload;

      // Check if user still exists and is active
      const user = await this.prisma.user.findUnique({
        where: { id: decoded.id },
      });

      if (!user || !user.isActive) {
        return null;
      }

      return decoded;
    } catch (error: any) {
      logger.debug("Token validation failed:", {
        error: error.message,
      });
      return null;
    }
  }

  private generateAccessToken(
    payload: Omit<JWTPayload, "iat" | "exp">,
  ): string {
    return jwt.sign(payload as any, this.jwtSecret, {
      expiresIn: this.jwtExpiresIn as any,
      issuer: "stock-portfolio-user-management",
    } as SignOptions);
  }

  private async generateRefreshToken(
    userId: string,
  ): Promise<{ token: string; expiresAt: Date }> {
    const token = uuidv4();
    const expiresAt = new Date(
      Date.now() + this.parseExpiration(this.refreshTokenExpiresIn),
    );

    // Store in memory (in production, use Redis or DB)
    this.refreshTokens.set(token, { userId, expiresAt });

    // Clean up expired tokens
    for (const [key, value] of this.refreshTokens.entries()) {
      if (value.expiresAt < new Date()) {
        this.refreshTokens.delete(key);
      }
    }

    return { token, expiresAt };
  }

  private async createSession(
    userId: string,
    token: string,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<void> {
    const expiresAt = new Date(
      Date.now() + this.parseExpiration(this.jwtExpiresIn),
    );

    await this.prisma.session.create({
      data: {
        id: uuidv4(),
        sessionToken: token,
        userId,
        userAgent,
        ipAddress,
        expires: expiresAt,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  private parseExpiration(expiration: string): number {
    const match = expiration.match(/^(\d+)([smhd])$/);
    if (!match) return 3600000; // Default 1 hour

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case "s":
        return value * 1000;
      case "m":
        return value * 60 * 1000;
      case "h":
        return value * 60 * 60 * 1000;
      case "d":
        return value * 24 * 60 * 60 * 1000;
      default:
        return 3600000;
    }
  }

  // Helper methods for user management
  async getUserById(
    id: string,
  ): Promise<Omit<UserWithRoles, "passwordHash" | "mfaSecret"> | null> {
    const user = (await this.prisma.user.findUnique({
      where: { id },
      include: {
        UserRole: {
          include: {
            Role: true,
          },
        },
      },
    })) as UserWithRoles | null;

    if (!user) return null;

    const { passwordHash, mfaSecret, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async updateUser(
    id: string,
    data: Partial<Omit<User, "id" | "passwordHash">>,
  ): Promise<Omit<UserWithRoles, "passwordHash" | "mfaSecret">> {
    const user = (await this.prisma.user.update({
      where: { id },
      data,
      include: {
        UserRole: {
          include: {
            Role: true,
          },
        },
      },
    })) as UserWithRoles;

    const { passwordHash, mfaSecret, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async getUserByEmail(
    email: string,
  ): Promise<Omit<UserWithRoles, "passwordHash" | "mfaSecret"> | null> {
    const user = (await this.prisma.user.findUnique({
      where: { email },
      include: {
        UserRole: {
          include: {
            Role: true,
          },
        },
      },
    })) as UserWithRoles | null;

    if (!user) return null;

    const { passwordHash, mfaSecret, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async getUserCount(): Promise<number> {
    return await this.prisma.user.count();
  }

  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const isOldPasswordValid = await bcrypt.compare(
      oldPassword,
      user.passwordHash,
    );
    if (!isOldPasswordValid) {
      throw new Error("Invalid current password");
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: hashedNewPassword,
        passwordChangedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    logger.info("Password changed successfully", { userId });
  }
}
