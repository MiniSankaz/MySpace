export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  sessionId: string;
  iat: number;
  exp: number;
}
export interface RefreshTokenPayload {
  userId: string;
  sessionId: string;
  tokenVersion: number;
  iat: number;
  exp: number;
}
export interface AuthSession {
  id: string;
  userId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  ipAddress: string;
  userAgent: string;
  isActive: boolean;
  createdAt: Date;
  lastAccessedAt: Date;
}
export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  conditions?: Record<string, any>;
}
export interface RolePermission {
  roleId: string;
  permissionId: string;
  grantedAt: Date;
  grantedBy: string;
}
export interface UserSession {
  sessionId: string;
  userId: string;
  isAuthenticated: boolean;
  permissions: string[];
  metadata: {
    loginTime: Date;
    lastActivity: Date;
    ipAddress: string;
    userAgent: string;
  };
}
//# sourceMappingURL=auth.types.d.ts.map
