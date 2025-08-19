import { Router } from "express";
import { ChatController } from "../controllers/chat.controller";
import { authMiddleware } from "../middleware/auth";
import { validateRequest } from "../middleware/validation";
import { z } from "zod";

const router = Router();
// Lazy initialization - controller will be created when first accessed
let chatController: ChatController | null = null;
const getChatController = () => {
  if (!chatController) {
    chatController = new ChatController();
  }
  return chatController;
};

// Validation schemas
const createSessionSchema = z.object({
  body: z.object({
    userId: z.string().min(1, "User ID is required"),
    title: z.string().min(1, "Title is required").max(200, "Title too long"),
    folderId: z.string().optional(),
  }),
});

const sendMessageSchema = z.object({
  body: z.object({
    sessionId: z.string().min(1, "Session ID is required"),
    userId: z.string().min(1, "User ID is required"),
    message: z
      .string()
      .min(1, "Message is required")
      .max(10000, "Message too long"),
    systemPrompt: z.string().optional(),
    model: z.string().optional(),
  }),
});

const updateTitleSchema = z.object({
  params: z.object({
    sessionId: z.string().min(1, "Session ID is required"),
  }),
  body: z.object({
    userId: z.string().min(1, "User ID is required"),
    title: z.string().min(1, "Title is required").max(200, "Title too long"),
  }),
});

const sessionParamsSchema = z.object({
  params: z.object({
    sessionId: z.string().min(1, "Session ID is required"),
  }),
  query: z.object({
    userId: z.string().min(1, "User ID is required"),
  }),
});

const userSessionsSchema = z.object({
  query: z.object({
    userId: z.string().min(1, "User ID is required"),
    folderId: z.string().optional(),
    page: z.string().regex(/^\d+$/, "Page must be a number").optional(),
    limit: z.string().regex(/^\d+$/, "Limit must be a number").optional(),
  }),
});

const searchSchema = z.object({
  query: z.object({
    userId: z.string().min(1, "User ID is required"),
    query: z.string().min(1, "Search query is required"),
    sessionId: z.string().optional(),
    limit: z.string().regex(/^\d+$/, "Limit must be a number").optional(),
  }),
});

// Routes

/**
 * @route POST /sessions
 * @desc Create a new chat session
 * @access Private
 */
router.post(
  "/sessions",
  authMiddleware,
  validateRequest(createSessionSchema),
  (req, res) => getChatController().createSession(req, res),
);

/**
 * @route GET /sessions/:sessionId
 * @desc Get a specific chat session
 * @access Private
 */
router.get(
  "/sessions/:sessionId",
  authMiddleware,
  validateRequest(sessionParamsSchema),
  (req, res) => getChatController().getSession(req, res),
);

/**
 * @route GET /sessions
 * @desc Get user's chat sessions
 * @access Private
 */
router.get(
  "/sessions",
  authMiddleware,
  validateRequest(userSessionsSchema),
  (req, res) => getChatController().getUserSessions(req, res),
);

/**
 * @route POST /message
 * @desc Send a chat message
 * @access Private
 */
router.post(
  "/message",
  authMiddleware,
  validateRequest(sendMessageSchema),
  (req, res) => getChatController().sendMessage(req, res),
);

/**
 * @route PUT /sessions/:sessionId/title
 * @desc Update session title
 * @access Private
 */
router.put(
  "/sessions/:sessionId/title",
  authMiddleware,
  validateRequest(updateTitleSchema),
  (req, res) => getChatController().updateSessionTitle(req, res),
);

/**
 * @route DELETE /sessions/:sessionId
 * @desc Delete a chat session
 * @access Private
 */
router.delete(
  "/sessions/:sessionId",
  authMiddleware,
  validateRequest(sessionParamsSchema),
  (req, res) => getChatController().deleteSession(req, res),
);

/**
 * @route GET /search
 * @desc Search messages
 * @access Private
 */
router.get(
  "/search",
  authMiddleware,
  validateRequest(searchSchema),
  (req, res) => getChatController().searchMessages(req, res),
);

/**
 * @route GET /sessions/:sessionId/stats
 * @desc Get session statistics
 * @access Private
 */
router.get(
  "/sessions/:sessionId/stats",
  authMiddleware,
  validateRequest(sessionParamsSchema),
  (req, res) => getChatController().getSessionStats(req, res),
);

/**
 * @route GET /models
 * @desc Get available Claude models and current configuration
 * @access Private
 */
router.get("/models", authMiddleware, (req, res) =>
  getChatController().getModelsAndConfig(req, res),
);

export default router;
