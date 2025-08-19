import { NextRequest, NextResponse } from "next/server";
import { withApiAuth, API_SCOPES } from "@/middleware/api-auth";
import { ClaudeDirectService } from "@/services/claude-direct.service";
import { ConversationStorage } from "@/modules/personal-assistant/services/conversation-storage";
import { z } from "zod";

const claudeService = new ClaudeDirectService();
const storageService = new ConversationStorage();

// Request validation schema
const chatRequestSchema = z.object({
  message: z.string().min(1).max(10000),
  sessionId: z.string().optional(),
  context: z
    .object({
      projectPath: z.string().optional(),
      files: z.array(z.string()).optional(),
      history: z
        .array(
          z.object({
            role: z.enum(["user", "assistant"]),
            content: z.string(),
          }),
        )
        .optional(),
    })
    .optional(),
  options: z
    .object({
      temperature: z.number().min(0).max(1).optional(),
      maxTokens: z.number().min(1).max(100000).optional(),
      stream: z.boolean().optional(),
    })
    .optional(),
});

/**
 * POST /api/v1/assistant/chat
 * Send a message to the AI assistant
 */
export async function POST(request: NextRequest) {
  return withApiAuth(
    request,
    async (req, context) => {
      try {
        const body = await req.json();
        const validated = chatRequestSchema.parse(body);

        // Get or create session
        let sessionId = validated.sessionId;
        if (!sessionId) {
          sessionId = `api-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        }

        // Load session history if exists
        let messages = [];
        try {
          const session = await storageService.getSession(
            sessionId,
            context.user.id,
          );
          if (session) {
            messages = session.messages || [];
          }
        } catch (error) {
          // Session doesn't exist, will be created
        }

        // Add context from request
        if (validated.context?.history) {
          messages = [...validated.context.history, ...messages];
        }

        // Add user message
        messages.push({
          role: "user",
          content: validated.message,
        });

        // Prepare context
        const contextInfo = validated.context
          ? {
              projectPath: validated.context.projectPath,
              files: validated.context.files,
            }
          : undefined;

        // Get AI response
        const response = await claudeService.sendMessage(
          validated.message,
          messages.slice(-10), // Keep last 10 messages for context
          contextInfo,
        );

        // Save to session
        await storageService.saveMessage(
          sessionId,
          context.user.id,
          "user",
          validated.message,
        );

        await storageService.saveMessage(
          sessionId,
          context.user.id,
          "assistant",
          response.content,
        );

        // Return response
        return NextResponse.json({
          success: true,
          sessionId,
          response: {
            content: response.content,
            role: "assistant",
            timestamp: new Date().toISOString(),
          },
          usage: {
            inputTokens: response.usage?.input_tokens,
            outputTokens: response.usage?.output_tokens,
            totalTokens: response.usage?.total_tokens,
          },
        });
      } catch (error: any) {
        console.error("Chat API error:", error);

        if (error.name === "ZodError") {
          return NextResponse.json(
            {
              error: "Invalid request",
              details: error.errors,
            },
            { status: 400 },
          );
        }

        return NextResponse.json(
          { error: error.message || "Failed to process chat request" },
          { status: 500 },
        );
      }
    },
    [API_SCOPES.ASSISTANT_WRITE],
  );
}

/**
 * GET /api/v1/assistant/chat
 * Get chat history
 */
export async function GET(request: NextRequest) {
  return withApiAuth(
    request,
    async (req, context) => {
      try {
        const { searchParams } = new URL(req.url);
        const sessionId = searchParams.get("sessionId");
        const limit = parseInt(searchParams.get("limit") || "50");

        if (!sessionId) {
          return NextResponse.json(
            { error: "Session ID required" },
            { status: 400 },
          );
        }

        // Get session
        const session = await storageService.getSession(
          sessionId,
          context.user.id,
        );

        if (!session) {
          return NextResponse.json(
            { error: "Session not found" },
            { status: 404 },
          );
        }

        // Get messages
        const messages = session.messages?.slice(-limit) || [];

        return NextResponse.json({
          success: true,
          sessionId,
          messages,
          metadata: {
            title: session.title,
            createdAt: session.createdAt,
            updatedAt: session.updatedAt,
            messageCount: session.messages?.length || 0,
          },
        });
      } catch (error: any) {
        console.error("Get chat history error:", error);
        return NextResponse.json(
          { error: error.message || "Failed to get chat history" },
          { status: 500 },
        );
      }
    },
    [API_SCOPES.ASSISTANT_READ],
  );
}
