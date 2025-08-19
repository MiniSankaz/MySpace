// User Management Service Types
import { UserRole as PrismaUserRole } from "@prisma/client";

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
  service?: string;
}

export interface User {
  id: string;
  email: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  roles?: string[];
  isActive: boolean;
  emailVerified: Date | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  username?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  user: Omit<User, "password">;
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
  };
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface JWTPayload {
  id: string;
  email: string;
  roles?: string[];
  iat?: number;
  exp?: number;
}

export interface ServiceHealth {
  service: string;
  status: "OK" | "WARNING" | "ERROR" | "UNKNOWN";
  timestamp: string;
  uptime: number;
  memory: NodeJS.MemoryUsage;
  version: string;
  environment: string;
  database?: {
    status: string;
    url: string;
  };
  redis?: {
    status: string;
    url: string;
  };
}
