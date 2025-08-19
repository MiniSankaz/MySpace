// Client-safe file upload utilities
// This file only contains types, constants, and utilities that can run in the browser

import { z } from "zod";

// File upload configuration (client-safe)
export const FILE_UPLOAD_CONFIG = {
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  MAX_FILES_PER_REQUEST: 10,
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

// Client-safe validation schema (without Buffer dependency)
export const fileUploadClientSchema = z.object({
  filename: z.string().min(1),
  originalName: z.string().min(1),
  mimeType: z.string().min(1),
  size: z.number().min(1).max(FILE_UPLOAD_CONFIG.MAX_FILE_SIZE),
});

export const bulkUploadClientSchema = z.object({
  files: z
    .array(fileUploadClientSchema)
    .max(FILE_UPLOAD_CONFIG.MAX_FILES_PER_REQUEST),
  folderId: z.string().optional(),
  tags: z.array(z.string()).default([]),
  isPublic: z.boolean().default(true),
});

// Client-safe utility functions
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
  // Basic filename sanitization without Node.js path module
  let sanitized = filename.split(/[/\\]/).pop() || "";

  // Remove or replace dangerous characters
  sanitized = sanitized.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_");

  // Get extension
  const lastDotIndex = sanitized.lastIndexOf(".");
  const ext = lastDotIndex > 0 ? sanitized.substring(lastDotIndex) : "";
  const name =
    lastDotIndex > 0 ? sanitized.substring(0, lastDotIndex) : sanitized;

  // Limit length
  if (name.length > 100) {
    sanitized = name.substring(0, 100) + ext;
  }

  // Ensure filename is not empty
  if (!sanitized || sanitized === ext) {
    sanitized = `file_${Date.now()}${ext || ".bin"}`;
  }

  return sanitized;
}

export function isDangerousFile(filename: string): boolean {
  const ext = filename.toLowerCase().substring(filename.lastIndexOf("."));
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

// Rate limiting helper (client-safe)
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

// Cleanup rate limiter every 5 minutes (only in browser environment)
if (typeof window !== "undefined") {
  setInterval(
    () => {
      uploadRateLimiter.cleanup();
    },
    5 * 60 * 1000,
  );
}
