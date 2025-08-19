import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";

export interface AuthResult {
  authenticated: boolean;
  user?: {
    id: string;
    email: string;
    username: string;
    displayName?: string;
  };
  error?: string;
}

/**
 * Simple authentication middleware for API token management
 */
export async function authMiddleware(
  request: NextRequest,
): Promise<AuthResult> {
  try {
    // Get token from cookie or header
    const cookieToken = request.cookies.get("accessToken")?.value;
    const headerToken = request.headers
      .get("authorization")
      ?.replace("Bearer ", "");
    const token = headerToken || cookieToken;

    if (!token) {
      return { authenticated: false, error: "No token provided" };
    }

    // Verify JWT token
    const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    return {
      authenticated: true,
      user: {
        id: decoded.userId || decoded.id,
        email: decoded.email,
        username: decoded.username,
        displayName: decoded.displayName,
      },
    };
  } catch (error: any) {
    console.error("Auth middleware error:", error);
    return { authenticated: false, error: error.message };
  }
}
