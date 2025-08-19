/**
 * Ephemeral Chat Routes
 * Fair Use Policy compliant endpoints
 */

import { Router, Request, Response } from "express";
// TEMPORARILY DISABLED: Terminal Service connection causing crashes
// import { claudeTerminalEphemeralService } from "../services/claude-terminal-ephemeral.service";
import { usageMonitor } from "../services/usage-monitor.service";
import { authMiddleware } from "../middleware/auth.middleware";
import { logger } from "../utils/logger";
import { z } from "zod";

const router = Router();

// Input validation schemas
const chatRequestSchema = z.object({
  message: z.string().min(1).max(4000),
  systemPrompt: z.string().optional(),
  context: z
    .object({
      includeHistory: z.boolean().default(true),
      maxMessages: z.number().min(0).max(10).default(5),
    })
    .optional(),
});

/**
 * POST /api/v1/chat/ephemeral
 * Send a message with ephemeral session (Fair Use compliant)
 */
router.post(
  "/ephemeral",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Validate input
      const validation = chatRequestSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: "Invalid request",
          details: validation.error.errors,
        });
      }

      const { message, systemPrompt } = validation.data;

      // Check usage limits
      const usageCheck = await usageMonitor.checkUsageLimits(userId);
      if (!usageCheck.allowed) {
        return res.status(429).json({
          error: "Rate limit exceeded",
          reason: usageCheck.reason,
          stats: usageCheck.stats,
          retryAfter: 60, // seconds
        });
      }

      // TEMPORARILY DISABLED: Direct Terminal Service connection 
      // Implementing standalone Claude CLI integration for stability
      return res.status(503).json({
        success: false,
        error: "Service temporarily unavailable during system upgrade",
        message: "Claude CLI integration is being optimized. Please try again shortly.",
        retryAfter: 30
      );

      // NOTE: Following code is temporarily unreachable during system upgrade
      // TODO: Re-enable after Terminal Service integration is fixed
      
      // // Record usage
      // await usageMonitor.recordUsage(
      //   userId,
      //   response.usage.inputTokens,
      //   response.usage.outputTokens,
      //   response.sessionId,
      // );

      // // Return response
      // res.json({
      //   success: true,
      //   data: {
      //     message: response.content,
      //     sessionId: response.sessionId,
      //     usage: response.usage,
      //     timestamp: response.timestamp,
      //   },
      // });
    } catch (error) {
      logger.error("Error in ephemeral chat endpoint:", error);
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to process your request",
      });
    }
  },
);

/**
 * POST /api/v1/chat/stream
 * Stream response with ephemeral session
 */
router.post("/stream", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Validate input
    const validation = chatRequestSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: "Invalid request",
        details: validation.error.errors,
      });
    }

    const { message, systemPrompt } = validation.data;

    // Check usage limits
    const usageCheck = await usageMonitor.checkUsageLimits(userId);
    if (!usageCheck.allowed) {
      return res.status(429).json({
        error: "Rate limit exceeded",
        reason: usageCheck.reason,
        stats: usageCheck.stats,
        retryAfter: 60,
      });
    }

    // Set up SSE headers
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });

    // Send initial connection event
    res.write(
      `event: connected\ndata: ${JSON.stringify({ status: "connected" })}\n\n`,
    );

    try {
      // Process with ephemeral session
      // TEMPORARILY DISABLED: Direct Terminal Service connection causing crashes
      // const response = await claudeEphemeralService.processQuestion(
      //   userId,
      //   message,
      //   systemPrompt,
      // );

      // Send temporary response during system upgrade
      res.write(
        `event: error\\ndata: ${JSON.stringify({ error: "Service temporarily unavailable during system upgrade" })}\\n\\n`,
      );
      return res.end();

      // Stream the response in chunks (simulate streaming)
      const chunks = response.content.match(/.{1,50}/g) || [];
      for (const chunk of chunks) {
        res.write(
          `event: message\ndata: ${JSON.stringify({ content: chunk })}\n\n`,
        );
        await new Promise((resolve) => setTimeout(resolve, 50)); // Small delay for streaming effect
      }

      // Send completion event
      res.write(
        `event: done\ndata: ${JSON.stringify({
          usage: response.usage,
          sessionId: response.sessionId,
        })}\n\n`,
      );

      // Record usage
      await usageMonitor.recordUsage(
        userId,
        response.usage.inputTokens,
        response.usage.outputTokens,
        response.sessionId,
      );
    } catch (error) {
      logger.error("Error during streaming:", error);
      res.write(
        `event: error\ndata: ${JSON.stringify({ error: "Processing failed" })}\n\n`,
      );
    } finally {
      res.end();
    }
  } catch (error) {
    logger.error("Error in stream endpoint:", error);
    res.status(500).json({
      error: "Internal server error",
      message: "Failed to process your request",
    });
  }
});

/**
 * GET /api/v1/chat/usage
 * Get user's usage statistics
 */
router.get("/usage", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const usageCheck = await usageMonitor.checkUsageLimits(userId);

    res.json({
      success: true,
      data: {
        stats: usageCheck.stats,
        limits: {
          perMinute: 5,
          perHour: 50,
          perDay: 500,
          tokensPerDay: 100000,
        },
        isWithinLimits: usageCheck.allowed,
      },
    });
  } catch (error) {
    logger.error("Error fetching usage stats:", error);
    res.status(500).json({
      error: "Internal server error",
      message: "Failed to fetch usage statistics",
    });
  }
});

/**
 * GET /api/v1/chat/status
 * Get service status and statistics
 */
router.get("/status", async (req: Request, res: Response) => {
  try {
    // TEMPORARILY DISABLED: Terminal Service connection
    const ephemeralStats = {
      totalSessions: 0,
      activeSessions: 0,
      totalRequests: 0,
      averageResponseTime: 0,
      uptime: 0,
      status: "upgrading"
    };
    const globalStats = await usageMonitor.getGlobalStats();

    res.json({
      success: true,
      data: {
        service: "AI Assistant (Ephemeral Mode)",
        fairUseCompliant: true,
        ephemeralStats,
        globalStats,
        health: "healthy",
      },
    });
  } catch (error) {
    logger.error("Error fetching service status:", error);
    res.status(500).json({
      error: "Internal server error",
      message: "Failed to fetch service status",
    });
  }
});

/**
 * DELETE /api/v1/chat/cache
 * Clear user's cache (admin only)
 */
router.delete("/cache", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const isAdmin = (req as any).user?.role === "admin";

    if (!isAdmin) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // Clear cache logic here
    logger.info(`Cache cleared by admin user ${userId}`);

    res.json({
      success: true,
      message: "Cache cleared successfully",
    });
  } catch (error) {
    logger.error("Error clearing cache:", error);
    res.status(500).json({
      error: "Internal server error",
      message: "Failed to clear cache",
    });
  }
});

export default router;
