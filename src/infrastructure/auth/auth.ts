import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
}

export interface AuthSession {
  user: AuthUser;
  token: string;
  expiresAt: Date;
}

const JWT_SECRET = process.env.JWT_SECRET || "default-secret-key";
const TOKEN_EXPIRY = "7d";

export class AuthService {
  static generateToken(user: AuthUser): string {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY },
    );
  }

  static verifyToken(token: string): AuthUser | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      return {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
        firstName: decoded.firstName,
        lastName: decoded.lastName,
      };
    } catch {
      return null;
    }
  }

  static async getSession(request: NextRequest): Promise<AuthSession | null> {
    const token = request.cookies.get("auth-token")?.value;

    if (!token) {
      return null;
    }

    const user = this.verifyToken(token);

    if (!user) {
      return null;
    }

    return {
      user,
      token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };
  }

  static setAuthCookie(response: NextResponse, token: string): void {
    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    });
  }

  static clearAuthCookie(response: NextResponse): void {
    response.cookies.delete("auth-token");
  }
}

export async function requireAuth(
  request: NextRequest,
): Promise<AuthUser | NextResponse> {
  const session = await AuthService.getSession(request);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return session.user;
}

export async function withAuth(
  request: NextRequest,
  handler: (request: NextRequest, user: AuthUser) => Promise<NextResponse>,
): Promise<NextResponse> {
  const authResult = await requireAuth(request);

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  return handler(request, authResult);
}
