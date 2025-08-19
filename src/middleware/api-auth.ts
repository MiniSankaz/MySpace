import { NextRequest, NextResponse } from "next/server";
import { ApiTokenService } from "@/services/api-token.service";
import { ApiUsageService } from "@/services/api-usage.service";

const apiTokenService = new ApiTokenService();
const apiUsageService = new ApiUsageService();

export interface ApiAuthContext {
  user: any;
  token: any;
  scopes: string[];
}

/**
 * API Authentication Middleware
 */
export async function withApiAuth(
  request: NextRequest,
  handler: (req: NextRequest, context: ApiAuthContext) => Promise<NextResponse>,
  requiredScopes: string[] = [],
) {
  const startTime = Date.now();
  let statusCode = 200;
  let errorMessage: string | undefined;
  let tokenData: any = null;
  let userData: any = null;

  try {
    // Extract API token from header
    const authHeader = request.headers.get("authorization");
    const apiKeyHeader = request.headers.get("x-api-key");

    const token = authHeader?.replace("Bearer ", "") || apiKeyHeader;

    if (!token) {
      statusCode = 401;
      errorMessage = "API token required";
      return NextResponse.json(
        { error: "API token required" },
        { status: 401 },
      );
    }

    // Validate token
    const validation = await apiTokenService.validateToken(token);

    if (!validation.valid) {
      statusCode = 401;
      errorMessage = validation.error || "Invalid token";
      return NextResponse.json(
        { error: validation.error || "Invalid token" },
        { status: 401 },
      );
    }

    tokenData = validation.token;
    userData = validation.user;

    // Check rate limit
    const withinLimit = await apiTokenService.checkRateLimit(
      tokenData.id,
      tokenData.rateLimit,
    );

    if (!withinLimit) {
      statusCode = 429;
      errorMessage = "Rate limit exceeded";
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": String(tokenData.rateLimit),
            "X-RateLimit-Reset": String(Date.now() + 3600000), // 1 hour from now
          },
        },
      );
    }

    // Check required scopes
    if (requiredScopes.length > 0) {
      const hasAllScopes = requiredScopes.every(
        (scope) =>
          tokenData.scopes.includes(scope) || tokenData.scopes.includes("*"),
      );

      if (!hasAllScopes) {
        statusCode = 403;
        errorMessage = "Insufficient permissions";
        return NextResponse.json(
          {
            error: "Insufficient permissions",
            required: requiredScopes,
            provided: tokenData.scopes,
          },
          { status: 403 },
        );
      }
    }

    // Create context
    const context: ApiAuthContext = {
      user: userData,
      token: tokenData,
      scopes: tokenData.scopes,
    };

    // Call handler
    const response = await handler(request, context);
    statusCode = response.status;

    // Add rate limit headers
    response.headers.set("X-RateLimit-Limit", String(tokenData.rateLimit));
    response.headers.set(
      "X-RateLimit-Remaining",
      String(tokenData.rateLimit - 1),
    ); // Simplified
    response.headers.set("X-RateLimit-Reset", String(Date.now() + 3600000));

    return response;
  } catch (error: any) {
    console.error("API auth error:", error);
    statusCode = 500;
    errorMessage = error.message;

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  } finally {
    // Log usage
    if (tokenData && userData) {
      const responseTime = Date.now() - startTime;
      const endpoint = request.nextUrl.pathname;
      const method = request.method;
      const ipAddress =
        request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip") ||
        "unknown";
      const userAgent = request.headers.get("user-agent") || undefined;

      // Get request body (if any)
      let requestBody: any = null;
      try {
        if (request.body) {
          const clonedRequest = request.clone();
          requestBody = await clonedRequest.json();
        }
      } catch {}

      await apiUsageService
        .logUsage({
          tokenId: tokenData.id,
          userId: userData.id,
          endpoint,
          method,
          statusCode,
          requestBody,
          responseBody: null, // We can't easily capture response body here
          responseTime,
          ipAddress,
          userAgent,
          errorMessage,
          metadata: {
            scopes: tokenData.scopes,
            requiredScopes,
          },
        })
        .catch(console.error);
    }
  }
}

/**
 * Check if a request has a specific scope
 */
export function hasScope(context: ApiAuthContext, scope: string): boolean {
  return context.scopes.includes(scope) || context.scopes.includes("*");
}

/**
 * Available API scopes
 */
export const API_SCOPES = {
  // Assistant scopes
  ASSISTANT_READ: "assistant:read",
  ASSISTANT_WRITE: "assistant:write",
  ASSISTANT_DELETE: "assistant:delete",

  // Project scopes
  PROJECTS_READ: "projects:read",
  PROJECTS_WRITE: "projects:write",
  PROJECTS_DELETE: "projects:delete",

  // Terminal scopes
  TERMINAL_READ: "terminal:read",
  TERMINAL_WRITE: "terminal:write",
  TERMINAL_EXECUTE: "terminal:execute",

  // User scopes
  USER_READ: "user:read",
  USER_WRITE: "user:write",

  // Analytics scopes
  ANALYTICS_READ: "analytics:read",

  // Admin scope
  ADMIN: "admin:*",

  // Full access
  FULL_ACCESS: "*",
};
