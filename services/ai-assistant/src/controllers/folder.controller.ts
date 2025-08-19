import { Request, Response } from "express";
import { ConversationService } from "../services/conversation.service";
import { logger, logError, createTimer } from "../utils/logger";

export class FolderController {
  private conversationService: ConversationService;

  constructor() {
    this.conversationService = new ConversationService();
  }

  /**
   * Create a new chat folder
   */
  createFolder = async (req: Request, res: Response) => {
    const timer = createTimer("create-folder");

    try {
      const { userId, name, description, color } = req.body;

      if (!userId || !name) {
        return res.status(400).json({
          success: false,
          error: "userId and name are required",
          timestamp: new Date().toISOString(),
          service: "ai-assistant",
        });
      }

      const folder = await this.conversationService.createFolder(
        userId,
        name,
        description,
        color,
      );

      timer.end();

      res.status(201).json({
        success: true,
        data: folder,
        message: "Chat folder created successfully",
        timestamp: new Date().toISOString(),
        service: "ai-assistant",
      });
    } catch (error: any) {
      timer.end();
      logError(error, { endpoint: "POST /chat/folders", body: req.body });

      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
        service: "ai-assistant",
      });
    }
  };

  /**
   * Get user's chat folders
   */
  getUserFolders = async (req: Request, res: Response) => {
    const timer = createTimer("get-user-folders");

    try {
      const { userId } = req.query;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: "userId query parameter is required",
          timestamp: new Date().toISOString(),
          service: "ai-assistant",
        });
      }

      const folders = await this.conversationService.getUserFolders(
        userId as string,
      );

      timer.end();

      res.json({
        success: true,
        data: folders,
        timestamp: new Date().toISOString(),
        service: "ai-assistant",
      });
    } catch (error: any) {
      timer.end();
      logError(error, { endpoint: "GET /chat/folders", query: req.query });

      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
        service: "ai-assistant",
      });
    }
  };

  /**
   * Update a chat folder
   */
  updateFolder = async (req: Request, res: Response) => {
    const timer = createTimer("update-folder");

    try {
      const { folderId } = req.params;
      const { userId, name, description, color } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: "userId is required",
          timestamp: new Date().toISOString(),
          service: "ai-assistant",
        });
      }

      const updates: any = {};
      if (name) updates.name = name;
      if (description !== undefined) updates.description = description;
      if (color !== undefined) updates.color = color;

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({
          success: false,
          error:
            "At least one field (name, description, color) must be provided for update",
          timestamp: new Date().toISOString(),
          service: "ai-assistant",
        });
      }

      const folder = await this.conversationService.updateFolder(
        folderId,
        userId,
        updates,
      );

      timer.end();

      res.json({
        success: true,
        data: folder,
        message: "Folder updated successfully",
        timestamp: new Date().toISOString(),
        service: "ai-assistant",
      });
    } catch (error: any) {
      timer.end();
      logError(error, {
        endpoint: "PUT /chat/folders/:folderId",
        params: req.params,
        body: req.body,
      });

      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
        service: "ai-assistant",
      });
    }
  };

  /**
   * Delete a chat folder
   */
  deleteFolder = async (req: Request, res: Response) => {
    const timer = createTimer("delete-folder");

    try {
      const { folderId } = req.params;
      const { userId } = req.query;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: "userId query parameter is required",
          timestamp: new Date().toISOString(),
          service: "ai-assistant",
        });
      }

      await this.conversationService.deleteFolder(folderId, userId as string);

      timer.end();

      res.json({
        success: true,
        message: "Folder deleted successfully",
        timestamp: new Date().toISOString(),
        service: "ai-assistant",
      });
    } catch (error: any) {
      timer.end();
      logError(error, {
        endpoint: "DELETE /chat/folders/:folderId",
        params: req.params,
        query: req.query,
      });

      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
        service: "ai-assistant",
      });
    }
  };
}
