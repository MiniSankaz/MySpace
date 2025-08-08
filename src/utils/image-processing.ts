import sharp from "sharp";
import path from "path";
import fs from "fs/promises";
import { FILE_UPLOAD_CONFIG } from "./file-upload";

// Image processing configuration
export const IMAGE_CONFIG = {
  THUMBNAIL_SIZES: {
    small: { width: 150, height: 150 },
    medium: { width: 300, height: 300 },
    large: { width: 800, height: 600 },
  },
  QUALITY: {
    thumbnail: 80,
    optimized: 85,
    original: 95,
  },
  MAX_DIMENSION: 2048,
  WEBP_QUALITY: 80,
  SUPPORTED_FORMATS: [
    "jpeg",
    "jpg",
    "png",
    "webp",
    "gif",
    "bmp",
    "tiff",
  ] as const,
};

export type ImageFormat = (typeof IMAGE_CONFIG.SUPPORTED_FORMATS)[number];
export type ThumbnailSize = keyof typeof IMAGE_CONFIG.THUMBNAIL_SIZES;

export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  size: number;
  channels: number;
  colorSpace?: string;
  hasAlpha: boolean;
  isAnimated?: boolean;
  pages?: number;
  density?: number;
  exif?: Record<string, any>;
}

export interface ImageProcessingResult {
  originalPath: string;
  originalUrl: string;
  thumbnailPath?: string;
  thumbnailUrl?: string;
  optimizedPath?: string;
  optimizedUrl?: string;
  metadata: ImageMetadata;
  variations: Array<{
    size: ThumbnailSize;
    path: string;
    url: string;
    width: number;
    height: number;
  }>;
}

export interface ImageProcessingOptions {
  generateThumbnails?: boolean;
  thumbnailSizes?: ThumbnailSize[];
  optimize?: boolean;
  convertToWebP?: boolean;
  maxDimension?: number;
  quality?: number;
  preserveExif?: boolean;
}

/**
 * Check if a file is an image based on mime type
 */
export function isImageFile(mimeType: string): boolean {
  return FILE_UPLOAD_CONFIG.ALLOWED_IMAGE_TYPES.includes(mimeType);
}

/**
 * Get image format from mime type
 */
export function getImageFormat(mimeType: string): ImageFormat | null {
  const formatMap: Record<string, ImageFormat> = {
    "image/jpeg": "jpeg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/bmp": "bmp",
    "image/tiff": "tiff",
  };
  return formatMap[mimeType] || null;
}

/**
 * Extract metadata from image buffer
 */
export async function extractImageMetadata(
  buffer: Buffer,
): Promise<ImageMetadata> {
  try {
    const image = sharp(buffer);
    const metadata = await image.metadata();

    // Extract EXIF data if available
    let exifData: Record<string, any> | undefined;
    try {
      if (metadata.exif) {
        // Parse EXIF data (basic implementation)
        exifData = {
          // Add basic EXIF parsing here if needed
          hasExif: true,
        };
      }
    } catch (exifError) {
      console.warn("Failed to extract EXIF data:", exifError);
    }

    return {
      width: metadata.width || 0,
      height: metadata.height || 0,
      format: metadata.format || "unknown",
      size: metadata.size || 0,
      channels: metadata.channels || 0,
      colorSpace: metadata.space,
      hasAlpha: metadata.hasAlpha || false,
      isAnimated: metadata.pages ? metadata.pages > 1 : false,
      pages: metadata.pages,
      density: metadata.density,
      exif: exifData,
    };
  } catch (error) {
    throw new Error(`Failed to extract image metadata: ${error.message}`);
  }
}

/**
 * Generate a thumbnail from image buffer
 */
export async function generateThumbnail(
  buffer: Buffer,
  size: ThumbnailSize = "medium",
  outputPath: string,
  options: {
    quality?: number;
    format?: "jpeg" | "png" | "webp";
    preserveAspectRatio?: boolean;
  } = {},
): Promise<{ path: string; width: number; height: number; size: number }> {
  try {
    const { width, height } = IMAGE_CONFIG.THUMBNAIL_SIZES[size];
    const quality = options.quality || IMAGE_CONFIG.QUALITY.thumbnail;
    const format = options.format || "jpeg";
    const preserveAspectRatio = options.preserveAspectRatio !== false;

    let image = sharp(buffer);

    if (preserveAspectRatio) {
      image = image.resize(width, height, {
        fit: "inside",
        withoutEnlargement: true,
      });
    } else {
      image = image.resize(width, height, {
        fit: "cover",
      });
    }

    // Apply format-specific options
    switch (format) {
      case "jpeg":
        image = image.jpeg({ quality, progressive: true });
        break;
      case "png":
        image = image.png({ quality, progressive: true });
        break;
      case "webp":
        image = image.webp({ quality });
        break;
    }

    // Ensure output directory exists
    await fs.mkdir(path.dirname(outputPath), { recursive: true });

    // Save thumbnail
    await image.toFile(outputPath);

    // Get final metadata
    const finalMetadata = await sharp(outputPath).metadata();

    return {
      path: outputPath,
      width: finalMetadata.width || width,
      height: finalMetadata.height || height,
      size: finalMetadata.size || 0,
    };
  } catch (error) {
    throw new Error(`Failed to generate thumbnail: ${error.message}`);
  }
}

/**
 * Optimize image by reducing file size while maintaining quality
 */
export async function optimizeImage(
  buffer: Buffer,
  outputPath: string,
  options: {
    quality?: number;
    maxDimension?: number;
    convertToWebP?: boolean;
    preserveExif?: boolean;
  } = {},
): Promise<{
  path: string;
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
}> {
  try {
    const originalSize = buffer.length;
    const quality = options.quality || IMAGE_CONFIG.QUALITY.optimized;
    const maxDimension = options.maxDimension || IMAGE_CONFIG.MAX_DIMENSION;
    const convertToWebP = options.convertToWebP || false;
    const preserveExif = options.preserveExif || false;

    let image = sharp(buffer);
    const metadata = await image.metadata();

    // Resize if image is too large
    if (metadata.width && metadata.height) {
      if (metadata.width > maxDimension || metadata.height > maxDimension) {
        image = image.resize(maxDimension, maxDimension, {
          fit: "inside",
          withoutEnlargement: true,
        });
      }
    }

    // Remove EXIF data unless specifically preserved
    if (!preserveExif) {
      image = image.rotate(); // This removes EXIF orientation data
    }

    // Convert to WebP if requested
    if (convertToWebP) {
      image = image.webp({ quality: IMAGE_CONFIG.WEBP_QUALITY });
    } else {
      // Optimize based on original format
      switch (metadata.format) {
        case "jpeg":
          image = image.jpeg({ quality, progressive: true, mozjpeg: true });
          break;
        case "png":
          image = image.png({ quality, progressive: true });
          break;
        case "webp":
          image = image.webp({ quality });
          break;
        default:
          // Convert unknown formats to JPEG
          image = image.jpeg({ quality, progressive: true });
      }
    }

    // Ensure output directory exists
    await fs.mkdir(path.dirname(outputPath), { recursive: true });

    // Save optimized image
    await image.toFile(outputPath);

    // Calculate compression ratio
    const stats = await fs.stat(outputPath);
    const optimizedSize = stats.size;
    const compressionRatio = Math.round(
      ((originalSize - optimizedSize) / originalSize) * 100,
    );

    return {
      path: outputPath,
      originalSize,
      optimizedSize,
      compressionRatio,
    };
  } catch (error) {
    throw new Error(`Failed to optimize image: ${error.message}`);
  }
}

/**
 * Process image with all features (thumbnails, optimization, metadata)
 */
export async function processImage(
  buffer: Buffer,
  filename: string,
  basePath: string,
  options: ImageProcessingOptions = {},
): Promise<ImageProcessingResult> {
  try {
    const {
      generateThumbnails = true,
      thumbnailSizes = ["small", "medium"],
      optimize = true,
      convertToWebP = false,
      maxDimension = IMAGE_CONFIG.MAX_DIMENSION,
      quality = IMAGE_CONFIG.QUALITY.optimized,
      preserveExif = false,
    } = options;

    // Extract metadata
    const metadata = await extractImageMetadata(buffer);

    // Generate file paths
    const ext = path.extname(filename);
    const nameWithoutExt = path.basename(filename, ext);
    const originalPath = path.join(basePath, filename);

    // Save original image
    await fs.mkdir(path.dirname(originalPath), { recursive: true });
    await fs.writeFile(originalPath, buffer);

    const result: ImageProcessingResult = {
      originalPath,
      originalUrl: `/uploads/${path.relative(FILE_UPLOAD_CONFIG.UPLOAD_DIR, originalPath).replace(/\\/g, "/")}`,
      metadata,
      variations: [],
    };

    // Generate thumbnails
    if (generateThumbnails && thumbnailSizes.length > 0) {
      for (const size of thumbnailSizes) {
        const thumbnailFilename = `${nameWithoutExt}_${size}${ext}`;
        const thumbnailPath = path.join(
          basePath,
          "thumbnails",
          thumbnailFilename,
        );

        const thumbnail = await generateThumbnail(buffer, size, thumbnailPath, {
          quality: IMAGE_CONFIG.QUALITY.thumbnail,
          format: convertToWebP ? "webp" : undefined,
        });

        result.variations.push({
          size,
          path: thumbnail.path,
          url: `/uploads/${path.relative(FILE_UPLOAD_CONFIG.UPLOAD_DIR, thumbnail.path).replace(/\\/g, "/")}`,
          width: thumbnail.width,
          height: thumbnail.height,
        });

        // Set main thumbnail (medium or first available)
        if (size === "medium" || !result.thumbnailPath) {
          result.thumbnailPath = thumbnail.path;
          result.thumbnailUrl = `/uploads/${path.relative(FILE_UPLOAD_CONFIG.UPLOAD_DIR, thumbnail.path).replace(/\\/g, "/")}`;
        }
      }
    }

    // Optimize image
    if (optimize) {
      const optimizedFilename = convertToWebP
        ? `${nameWithoutExt}_optimized.webp`
        : `${nameWithoutExt}_optimized${ext}`;
      const optimizedPath = path.join(basePath, "optimized", optimizedFilename);

      const optimizationResult = await optimizeImage(buffer, optimizedPath, {
        quality,
        maxDimension,
        convertToWebP,
        preserveExif,
      });

      result.optimizedPath = optimizationResult.path;
      result.optimizedUrl = `/uploads/${path.relative(FILE_UPLOAD_CONFIG.UPLOAD_DIR, optimizationResult.path).replace(/\\/g, "/")}`;
    }

    return result;
  } catch (error) {
    throw new Error(`Failed to process image: ${error.message}`);
  }
}

/**
 * Validate if buffer contains a valid image
 */
export async function validateImageBuffer(buffer: Buffer): Promise<boolean> {
  try {
    const image = sharp(buffer);
    await image.metadata();
    return true;
  } catch {
    return false;
  }
}

/**
 * Get image info without processing
 */
export async function getImageInfo(
  filePath: string,
): Promise<ImageMetadata | null> {
  try {
    const buffer = await fs.readFile(filePath);
    return await extractImageMetadata(buffer);
  } catch {
    return null;
  }
}

/**
 * Convert image to different format
 */
export async function convertImage(
  buffer: Buffer,
  outputPath: string,
  targetFormat: "jpeg" | "png" | "webp",
  quality = 85,
): Promise<void> {
  try {
    let image = sharp(buffer);

    switch (targetFormat) {
      case "jpeg":
        image = image.jpeg({ quality, progressive: true });
        break;
      case "png":
        image = image.png({ quality, progressive: true });
        break;
      case "webp":
        image = image.webp({ quality });
        break;
    }

    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await image.toFile(outputPath);
  } catch (error) {
    throw new Error(`Failed to convert image: ${error.message}`);
  }
}

/**
 * Batch process multiple images
 */
export async function batchProcessImages(
  images: Array<{ buffer: Buffer; filename: string }>,
  basePath: string,
  options: ImageProcessingOptions = {},
): Promise<ImageProcessingResult[]> {
  const results: ImageProcessingResult[] = [];

  for (const image of images) {
    try {
      const result = await processImage(
        image.buffer,
        image.filename,
        basePath,
        options,
      );
      results.push(result);
    } catch (error) {
      console.error(`Failed to process image ${image.filename}:`, error);
      // Continue processing other images
    }
  }

  return results;
}

/**
 * Clean up old image files and thumbnails
 */
export async function cleanupImageFiles(filePaths: string[]): Promise<void> {
  for (const filePath of filePaths) {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.warn(`Failed to delete image file ${filePath}:`, error);
    }
  }
}
