// Server-only file upload utilities
// This file contains functions that require Node.js APIs (Buffer, fs, crypto, path)

import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import { z } from "zod";

// Re-export client-safe utilities
export * from "./file-upload-client";

// Server-only validation schema with Buffer
export const fileUploadSchema = z.object({
  filename: z.string().min(1),
  originalName: z.string().min(1),
  mimeType: z.string().min(1),
  size: z
    .number()
    .min(1)
    .max(50 * 1024 * 1024), // 50MB
  buffer: z.instanceof(Buffer),
});

export const bulkUploadSchema = z.object({
  files: z.array(fileUploadSchema).max(10), // MAX_FILES_PER_REQUEST
  folderId: z.string().optional(),
  tags: z.array(z.string()).default([]),
  isPublic: z.boolean().default(true),
});

// Server-only configuration
export const SERVER_UPLOAD_CONFIG = {
  UPLOAD_DIR: "./public/uploads",
  TEMP_DIR: "./temp",
};

// Server-only utility functions
export function generateUniqueFilename(originalName: string): string {
  // Use client-safe sanitization from file-upload-client.ts
  const { sanitizeFilename } = require("./file-upload-client");
  const sanitized = sanitizeFilename(originalName);
  const ext = path.extname(sanitized);
  const name = path.basename(sanitized, ext);
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString("hex");

  return `${name}_${timestamp}_${random}${ext}`;
}

export function generateUploadPath(year?: number, month?: number): string {
  const now = new Date();
  const uploadYear = year || now.getFullYear();
  const uploadMonth = month || (now.getMonth() + 1).toString().padStart(2, "0");

  return path.join(
    SERVER_UPLOAD_CONFIG.UPLOAD_DIR,
    uploadYear.toString(),
    uploadMonth,
  );
}

export async function ensureUploadDirectory(uploadPath: string): Promise<void> {
  try {
    await fs.access(uploadPath);
  } catch {
    await fs.mkdir(uploadPath, { recursive: true });
  }
}

export async function saveFile(
  buffer: Buffer,
  filename: string,
  uploadPath?: string,
): Promise<{ path: string; url: string }> {
  const finalUploadPath = uploadPath || generateUploadPath();
  await ensureUploadDirectory(finalUploadPath);

  const filePath = path.join(finalUploadPath, filename);
  await fs.writeFile(filePath, buffer);

  // Generate URL (relative to uploads directory)
  const relativePath = path.relative(SERVER_UPLOAD_CONFIG.UPLOAD_DIR, filePath);
  const url = `/uploads/${relativePath.replace(/\\/g, "/")}`;

  return { path: filePath, url };
}

export async function deleteFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    console.warn(`Failed to delete file ${filePath}:`, error);
  }
}

export function calculateFileHash(
  buffer: Buffer,
  algorithm: "md5" | "sha256" = "sha256",
): string {
  return crypto.createHash(algorithm).update(buffer).digest("hex");
}

export function extractFileMetadata(file: {
  filename: string;
  mimeType: string;
  size: number;
  buffer: Buffer;
}): Record<string, any> {
  const { getFileType } = require("./file-upload-client");

  const metadata: Record<string, any> = {
    originalSize: file.size,
    mimeType: file.mimeType,
    uploadedAt: new Date().toISOString(),
    fileHash: calculateFileHash(file.buffer),
    fileType: getFileType(file.mimeType),
  };

  // Add file-specific metadata
  const fileType = getFileType(file.mimeType);
  if (fileType === "image") {
    // Image metadata will be extracted by image processing utility
    metadata.hasImageData = true;
  } else if (fileType === "video") {
    metadata.hasVideoData = true;
  } else if (fileType === "document") {
    metadata.hasDocumentData = true;
  }

  return metadata;
}

// Helper function to parse multipart form data
export async function parseFormData(request: Request): Promise<{
  files: Array<{
    name: string;
    filename: string;
    mimeType: string;
    buffer: Buffer;
  }>;
  fields: Record<string, string>;
}> {
  const formData = await request.formData();
  const files: Array<{
    name: string;
    filename: string;
    mimeType: string;
    buffer: Buffer;
  }> = [];
  const fields: Record<string, string> = {};

  for (const [key, value] of formData.entries()) {
    if (value instanceof File) {
      const buffer = Buffer.from(await value.arrayBuffer());
      files.push({
        name: key,
        filename: value.name,
        mimeType: value.type,
        buffer,
      });
    } else {
      fields[key] = value.toString();
    }
  }

  return { files, fields };
}
