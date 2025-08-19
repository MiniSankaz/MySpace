import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  roles?: string[];
}

export async function verifyAuth(
  request: NextRequest,
): Promise<AuthUser | null> {
  try {
    // Check for auth token in cookies
    const token = request.cookies.get("auth-token")?.value;

    if (!token) {
      // Check for Bearer token in Authorization header
      const authHeader = request.headers.get("authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return null;
      }

      const bearerToken = authHeader.substring(7);
      return verifyToken(bearerToken);
    }

    return verifyToken(token);
  } catch (error) {
    console.error("Auth verification error:", error);
    return null;
  }
}

function verifyToken(token: string): AuthUser | null {
  try {
    // Use ignoreExpiration option for tokens without exp claim
    const decoded = jwt.verify(token, JWT_SECRET, {
      ignoreExpiration: false, // Will handle tokens without exp claim properly
    }) as any;

    // If token doesn't have exp claim, it's valid (never expires)
    // If it has exp claim, jwt.verify will check it

    return {
      id: decoded.userId || decoded.id,
      email: decoded.email,
      username: decoded.username,
      roles: decoded.roles,
    };
  } catch (error: any) {
    // If error is about expiry, log it for debugging
    if (error.name === "TokenExpiredError") {
      console.log("Token expired:", error.message);
    } else if (error.name === "JsonWebTokenError") {
      console.log("Invalid token:", error.message);
    }
    return null;
  }
}

export function createAuthResponse(user: AuthUser | null, data: any = {}) {
  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized", message: "Please login to continue" },
      { status: 401 },
    );
  }

  return NextResponse.json({
    ...data,
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
    },
  });
}

export async function requireAuth(
  request: NextRequest,
  handler: (user: AuthUser) => Promise<NextResponse>,
): Promise<NextResponse> {
  const user = await verifyAuth(request);

  if (!user) {
    return createAuthResponse(null);
  }

  return handler(user);
}
