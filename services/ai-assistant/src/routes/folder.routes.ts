import { Router } from "express";
import { FolderController } from "../controllers/folder.controller";
import { authMiddleware } from "../middleware/auth";
import { validateRequest } from "../middleware/validation";
import { z } from "zod";

const router = Router();
const folderController = new FolderController();

// Validation schemas
const createFolderSchema = z.object({
  body: z.object({
    userId: z.string().min(1, "User ID is required"),
    name: z.string().min(1, "Name is required").max(100, "Name too long"),
    description: z.string().max(500, "Description too long").optional(),
    color: z
      .string()
      .regex(/^#[0-9A-F]{6}$/i, "Invalid color format")
      .optional(),
  }),
});

const updateFolderSchema = z.object({
  params: z.object({
    folderId: z.string().min(1, "Folder ID is required"),
  }),
  body: z.object({
    userId: z.string().min(1, "User ID is required"),
    name: z
      .string()
      .min(1, "Name is required")
      .max(100, "Name too long")
      .optional(),
    description: z.string().max(500, "Description too long").optional(),
    color: z
      .string()
      .regex(/^#[0-9A-F]{6}$/i, "Invalid color format")
      .optional(),
  }),
});

const folderParamsSchema = z.object({
  params: z.object({
    folderId: z.string().min(1, "Folder ID is required"),
  }),
  query: z.object({
    userId: z.string().min(1, "User ID is required"),
  }),
});

const userFoldersSchema = z.object({
  query: z.object({
    userId: z.string().min(1, "User ID is required"),
  }),
});

// Routes

/**
 * @route POST /folders
 * @desc Create a new chat folder
 * @access Private
 */
router.post(
  "/folders",
  authMiddleware,
  validateRequest(createFolderSchema),
  folderController.createFolder,
);

/**
 * @route GET /folders
 * @desc Get user's chat folders
 * @access Private
 */
router.get(
  "/folders",
  authMiddleware,
  validateRequest(userFoldersSchema),
  folderController.getUserFolders,
);

/**
 * @route PUT /folders/:folderId
 * @desc Update a chat folder
 * @access Private
 */
router.put(
  "/folders/:folderId",
  authMiddleware,
  validateRequest(updateFolderSchema),
  folderController.updateFolder,
);

/**
 * @route DELETE /folders/:folderId
 * @desc Delete a chat folder
 * @access Private
 */
router.delete(
  "/folders/:folderId",
  authMiddleware,
  validateRequest(folderParamsSchema),
  folderController.deleteFolder,
);

export default router;
