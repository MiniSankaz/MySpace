import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import { z } from "zod";

// File upload configuration
export const FILE_UPLOAD_CONFIG = {
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  MAX_FILES_PER_REQUEST: 10,
  UPLOAD_DIR: "./public/uploads",
  TEMP_DIR: "./temp",
  ALLOWED_IMAGE_TYPES: [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",
    "image/bmp",
  ],
  ALLOWED_VIDEO_TYPES: [
    "video/mp4",
    "video/webm",
    "video/ogg",
    "video/avi",
    "video/mov",
    "video/wmv",
  ],
  ALLOWED_DOCUMENT_TYPES: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
    "text/csv",
  ],
  ALLOWED_AUDIO_TYPES: [
    "audio/mpeg",
    "audio/wav",
    "audio/ogg",
    "audio/mp3",
    "audio/aac",
  ],
  DANGEROUS_EXTENSIONS: [
    ".exe",
    ".bat",
    ".cmd",
    ".com",
    ".pif",
    ".scr",
    ".vbs",
    ".js",
    ".jar",
    ".app",
    ".dmg",
  ],
};

// TypeScript types
export interface FileUploadResult {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  path: string;
  metadata?: Record<string, any>;
  width?: number;
  height?: number;
}

export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedFilename?: string;
  fileType?: "image" | "video" | "document" | "audio" | "other";
}

export interface UploadProgress {
  fileId: string;
  filename: string;
  bytesUploaded: number;
  totalBytes: number;
  percentage: number;
  status: "uploading" | "processing" | "completed" | "error";
  error?: string;
}

// Validation schemas
export const fileUploadSchema = z.object({
  filename: z.string().min(1),
  originalName: z.string().min(1),
  mimeType: z.string().min(1),
  size: z.number().min(1).max(FILE_UPLOAD_CONFIG.MAX_FILE_SIZE),
  buffer: z.instanceof(Buffer),
});

export const bulkUploadSchema = z.object({
  files: z
    .array(fileUploadSchema)
    .max(FILE_UPLOAD_CONFIG.MAX_FILES_PER_REQUEST),
  folderId: z.string().optional(),
  tags: z.array(z.string()).default([]),
  isPublic: z.boolean().default(true),
});

// Utility functions
export function getAllowedMimeTypes(): string[] {
  return [
    ...FILE_UPLOAD_CONFIG.ALLOWED_IMAGE_TYPES,
    ...FILE_UPLOAD_CONFIG.ALLOWED_VIDEO_TYPES,
    ...FILE_UPLOAD_CONFIG.ALLOWED_DOCUMENT_TYPES,
    ...FILE_UPLOAD_CONFIG.ALLOWED_AUDIO_TYPES,
  ];
}

export function getFileType(
  mimeType: string,
): "image" | "video" | "document" | "audio" | "other" {
  if (FILE_UPLOAD_CONFIG.ALLOWED_IMAGE_TYPES.includes(mimeType)) return "image";
  if (FILE_UPLOAD_CONFIG.ALLOWED_VIDEO_TYPES.includes(mimeType)) return "video";
  if (FILE_UPLOAD_CONFIG.ALLOWED_DOCUMENT_TYPES.includes(mimeType))
    return "document";
  if (FILE_UPLOAD_CONFIG.ALLOWED_AUDIO_TYPES.includes(mimeType)) return "audio";
  return "other";
}

export function validateFileType(mimeType: string): boolean {
  return getAllowedMimeTypes().includes(mimeType);
}

export function validateFileSize(size: number): boolean {
  return size > 0 && size <= FILE_UPLOAD_CONFIG.MAX_FILE_SIZE;
}

export function sanitizeFilename(filename: string): string {
  // Remove path traversal attempts
  let sanitized = path.basename(filename);

  // Remove or replace dangerous characters
  sanitized = sanitized.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_");

  // Limit length
  const ext = path.extname(sanitized);
  const name = path.basename(sanitized, ext);

  if (name.length > 100) {
    sanitized = name.substring(0, 100) + ext;
  }

  // Ensure filename is not empty
  if (!sanitized || sanitized === ext) {
    sanitized = `file_${Date.now()}${ext || ".bin"}`;
  }

  return sanitized;
}

export function generateUniqueFilename(originalName: string): string {
  const sanitized = sanitizeFilename(originalName);
  const ext = path.extname(sanitized);
  const name = path.basename(sanitized, ext);
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString("hex");

  return `${name}_${timestamp}_${random}${ext}`;
}

export function isDangerousFile(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  return FILE_UPLOAD_CONFIG.DANGEROUS_EXTENSIONS.includes(ext);
}

export function validateFile(file: {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
}): FileValidationResult {
  const errors: string[] = [];
  let isValid = true;

  // Check file size
  if (!validateFileSize(file.size)) {
    errors.push(
      `File size exceeds ${FILE_UPLOAD_CONFIG.MAX_FILE_SIZE / (1024 * 1024)}MB limit`,
    );
    isValid = false;
  }

  // Check file type
  if (!validateFileType(file.mimeType)) {
    errors.push(`File type '${file.mimeType}' is not allowed`);
    isValid = false;
  }

  // Check for dangerous files
  if (isDangerousFile(file.filename) || isDangerousFile(file.originalName)) {
    errors.push("File type is potentially dangerous and not allowed");
    isValid = false;
  }

  // Check filename
  const sanitizedFilename = sanitizeFilename(file.originalName);
  if (!sanitizedFilename) {
    errors.push("Invalid filename");
    isValid = false;
  }

  return {
    isValid,
    errors,
    sanitizedFilename: isValid ? sanitizedFilename : undefined,
    fileType: isValid ? getFileType(file.mimeType) : undefined,
  };
}

export function generateUploadPath(year?: number, month?: number): string {
  const now = new Date();
  const uploadYear = year || now.getFullYear();
  const uploadMonth = month || (now.getMonth() + 1).toString().padStart(2, "0");

  return path.join(
    FILE_UPLOAD_CONFIG.UPLOAD_DIR,
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
  const relativePath = path.relative(FILE_UPLOAD_CONFIG.UPLOAD_DIR, filePath);
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
      // Use buffer polyfill for browser compatibility
      const arrayBuffer = await value.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
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

// Rate limiting helper
export class UploadRateLimiter {
  private uploads: Map<string, { count: number; resetTime: number }> =
    new Map();
  private readonly maxUploads: number;
  private readonly windowMs: number;

  constructor(maxUploads = 10, windowMs = 60 * 1000) {
    this.maxUploads = maxUploads;
    this.windowMs = windowMs;
  }

  checkLimit(userId: string): {
    allowed: boolean;
    remainingUploads: number;
    resetTime: number;
  } {
    const now = Date.now();
    const userLimit = this.uploads.get(userId);

    if (!userLimit || now > userLimit.resetTime) {
      // Reset or initialize limit
      const resetTime = now + this.windowMs;
      this.uploads.set(userId, { count: 0, resetTime });
      return {
        allowed: true,
        remainingUploads: this.maxUploads - 1,
        resetTime,
      };
    }

    if (userLimit.count >= this.maxUploads) {
      return {
        allowed: false,
        remainingUploads: 0,
        resetTime: userLimit.resetTime,
      };
    }

    userLimit.count++;
    return {
      allowed: true,
      remainingUploads: this.maxUploads - userLimit.count,
      resetTime: userLimit.resetTime,
    };
  }

  cleanup(): void {
    const now = Date.now();
    for (const [userId, limit] of this.uploads.entries()) {
      if (now > limit.resetTime) {
        this.uploads.delete(userId);
      }
    }
  }
}

// Global rate limiter instance
export const uploadRateLimiter = new UploadRateLimiter();

// Cleanup rate limiter every 5 minutes
setInterval(
  () => {
    uploadRateLimiter.cleanup();
  },
  5 * 60 * 1000,
);
