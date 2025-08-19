import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { verifyAuth } from "@/middleware/auth";
import { cacheManager } from "@/core/database/cache-manager";

const prisma = new PrismaClient();

// Cache TTL constants
const SESSIONS_CACHE_TTL = 2 * 60 * 1000; // 2 minutes
const DB_TIMEOUT = 5000; // 5 seconds

export async function GET(request: NextRequest) {
  try {
    // Verify authentication - required for assistant sessions
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required",
        },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20");

    // Generate cache key for user sessions
    const cacheKey = `sessions:${user.id}:${limit}`;

    try {
      // Use cache with timeout handling
      const conversations = await cacheManager.withCacheAndTimeout(
        cacheKey,
        async () => {
          console.log(
            `[Sessions] Loading sessions for user ${user.id} with limit ${limit}`,
          );
          return await prisma.assistantChatSession.findMany({
            where: {
              userId: user.id, // Filter by authenticated user
            },
            include: {
              messages: {
                orderBy: {
                  timestamp: "desc",
                },
                take: 1,
              },
              _count: {
                select: {
                  messages: true,
                },
              },
            },
            orderBy: {
              lastActiveAt: "desc",
            },
            take: limit,
          });
        },
        {
          ttl: SESSIONS_CACHE_TTL,
          timeout: DB_TIMEOUT,
          fallbackValue: [], // Return empty sessions if timeout
        },
      );

      // Format sessions for response (remove userId from response for security)
      const sessions = conversations.map((session) => ({
        sessionId: session.id, // Use the session UUID as sessionId for frontend
        title:
          session.sessionName ||
          session.messages[0]?.content?.substring(0, 50) ||
          "New Chat",
        lastMessage: session.messages[0]?.content || "",
        messageCount: session._count.messages,
        createdAt: session.startedAt,
        folderId: null, // Assistant chat sessions don't have folders yet
      }));

      return NextResponse.json({
        success: true,
        sessions,
        cached: conversations.length > 0 && cacheManager.get(cacheKey) !== null, // Indicate if from cache
      });
    } catch (cacheError) {
      console.error("[Sessions] Cache operation failed:", cacheError);

      // Return empty sessions with warning if cache fails
      return NextResponse.json({
        success: true,
        sessions: [],
        warning: "Database unavailable, showing cached or empty data",
      });
    }
  } catch (error) {
    console.error("Get sessions error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to load sessions",
      },
      { status: 500 },
    );
  } finally {
    try {
      await prisma.$disconnect();
    } catch (disconnectError) {
      console.error("Prisma disconnect error:", disconnectError);
    }
  }
}
