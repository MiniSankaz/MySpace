import { NextRequest, NextResponse } from "next/server";
import { getAssistantInstance } from "@/modules/personal-assistant";
import { verifyAuth } from "@/middleware/auth";
import { withRateLimit } from "@/middleware/rate-limit";
import { z } from "zod";
import { assistantLogger } from "@/services/assistant-logging.service";
import { cacheManager } from "@/core/database/cache-manager";

// Cache TTL constants
const CHAT_MESSAGES_CACHE_TTL = 1 * 60 * 1000; // 1 minute
const DB_TIMEOUT = 5000; // 5 seconds

const chatSchema = z.object({
  message: z.string().min(1).max(1000),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  directMode: z.boolean().optional(),
  projectId: z.string().optional(),
});

export const POST = withRateLimit(async (request: NextRequest) => {
  try {
    // Get request body
    const body = await request.json();
    const validation = chatSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validation.error.errors },
        { status: 400 },
      );
    }

    // Verify authentication - required for assistant
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    // Always use authenticated user's ID for security
    const userId = user.id;
    const sessionId = validation.data.sessionId || `session-${Date.now()}`;
    const directMode = validation.data.directMode ?? false;
    const projectId = validation.data.projectId;

    // Streamlined session and logging setup
    const startTime = Date.now();

    // Create session first (MUST complete before any message operations)
    try {
      await assistantLogger.createSession({
        sessionId,
        userId,
        projectId,
        sessionName: `Chat Session - ${new Date().toLocaleString()}`,
        model: directMode ? "claude-direct" : "claude-assistant",
      });
    } catch (error) {
      console.error("Session creation failed:", error);
      // Continue - the logMessage method will handle session creation if needed
    }

    // Log user message in background (session now guaranteed to exist or will be created)
    const userMessageLogging = assistantLogger
      .logMessage({
        sessionId,
        role: "user",
        content: validation.data.message,
        userId,
        projectId,
      })
      .catch((error) => {
        console.error("User message logging failed:", error);
      });

    // Don't await user message logging - let it run in background

    const assistant = getAssistantInstance();

    // If direct mode, send straight to Claude
    let response;
    if (directMode) {
      response = await assistant.sendDirectToClaude(
        userId,
        sessionId,
        validation.data.message,
      );
    } else {
      response = await assistant.processMessage(
        userId,
        sessionId,
        validation.data.message,
      );
    }

    // Calculate response metrics and log in background
    const latency = Date.now() - startTime;
    const estimatedTokens = Math.ceil(
      (validation.data.message.length +
        (typeof response === "string" ? response.length : 500)) /
        4,
    );
    const estimatedCost = estimatedTokens * 0.00002;

    // Log assistant response and wait for it to complete
    try {
      const responseContent =
        typeof response === "string"
          ? response
          : response?.message || response?.content || JSON.stringify(response);

      await assistantLogger.logMessage({
        sessionId,
        role: "assistant",
        content: responseContent,
        tokens: estimatedTokens,
        cost: estimatedCost,
        userId,
        projectId,
      });
    } catch (error) {
      console.error("Failed to log assistant response:", error);
    }

    // Generate a message ID for the response
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Wait for user message logging to complete
    await userMessageLogging;

    // Load updated messages after all logging is done with cache and timeout
    let messages = [];
    try {
      // Small delay to ensure database write is committed
      await new Promise((resolve) => setTimeout(resolve, 100));

      const cacheKey = `chat:messages:${userId}:${sessionId}`;

      // Load messages with cache and timeout handling
      messages = await cacheManager.withCacheAndTimeout(
        cacheKey,
        async () => {
          console.log(
            `[API] Loading messages for session ${sessionId} from database`,
          );
          const assistant = getAssistantInstance();
          return await assistant.getConversationHistory(userId, sessionId);
        },
        {
          ttl: CHAT_MESSAGES_CACHE_TTL,
          timeout: DB_TIMEOUT,
          fallbackValue: [], // Return empty messages if timeout
          skipCache: true, // Always get fresh messages after chat response
        },
      );

      console.log(
        `[API] Loaded ${messages.length} messages for session ${sessionId}`,
      );

      // Clear old cache for this session to ensure fresh data next time
      cacheManager.clearByPattern(`chat:messages:${userId}:${sessionId}`);
    } catch (error) {
      console.error("Failed to load messages after response:", error);
      // Use empty fallback
      messages = [];
    }

    // Send response with complete message history
    const result = NextResponse.json({
      success: true,
      sessionId,
      messageId,
      response,
      messages, // Include full conversation history
      user: user ? { id: user.id, username: user.username } : null,
      latency, // Include performance metrics
    });

    return result;
  } catch (error) {
    console.error("Assistant chat error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}, "assistant");

export async function GET(request: NextRequest) {
  try {
    // Verify authentication - required for viewing history
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 },
      );
    }

    try {
      // Generate cache key for conversation history
      const cacheKey = `chat:history:${user.id}:${sessionId}`;

      // Load conversation history with cache and timeout handling
      const history = await cacheManager.withCacheAndTimeout(
        cacheKey,
        async () => {
          console.log(
            `[API] Loading chat history for session ${sessionId} from database`,
          );
          const assistant = getAssistantInstance();
          // Verify session belongs to user before loading
          return await assistant.getConversationHistory(user.id, sessionId);
        },
        {
          ttl: CHAT_MESSAGES_CACHE_TTL,
          timeout: DB_TIMEOUT,
          fallbackValue: [], // Return empty history if timeout
        },
      );

      return NextResponse.json({
        success: true,
        sessionId,
        messages: history,
        cached: history.length > 0 && cacheManager.get(cacheKey) !== null,
      });
    } catch (cacheError) {
      console.error("[Chat] Failed to load history:", cacheError);

      // Return empty history with warning if cache fails
      return NextResponse.json({
        success: true,
        sessionId,
        messages: [],
        warning: "Database unavailable, showing cached or empty data",
      });
    }
  } catch (error) {
    console.error("Get chat history error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
