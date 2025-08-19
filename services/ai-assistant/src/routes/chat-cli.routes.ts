import { Router } from "express";
import { ChatCLIController } from "../controllers/chat-cli.controller";

const router = Router();
const controller = new ChatCLIController();

// Session management
router.post("/sessions", controller.createSession);
router.get("/sessions", controller.listSessions);
router.get("/sessions/:sessionId", controller.getSession);
router.delete("/sessions/:sessionId", controller.closeSession);

// Messaging
router.post("/sessions/:sessionId/messages", controller.sendMessage);
router.get("/sessions/:sessionId/messages", controller.getMessages);

// Health check
router.get("/health", controller.healthCheck);

export default router;
