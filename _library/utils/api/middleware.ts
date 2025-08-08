import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/infrastructure/auth/auth";

interface MiddlewareOptions {
  requireAuth?: boolean;
  permissions?: string[];
  rateLimit?: { requests: number; window: string };
}

export function withApiMiddleware(
  handler: (req: NextRequest) => Promise<Response>,
  options: MiddlewareOptions = {},
) {
  return async (req: NextRequest) => {
    try {
      // Authentication check
      if (options.requireAuth) {
        const session = await auth();
        if (!session) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
      }

      // Call handler
      return await handler(req);
    } catch (error) {
      console.error("API Error:", error);
      return NextResponse.json(
        { error: "Internal Server Error" },
        { status: 500 },
      );
    }
  };
}
