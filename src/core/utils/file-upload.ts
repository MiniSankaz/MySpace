// File upload utilities with Buffer polyfill support
// This file contains utilities that work in both browser and Node.js environments

// Re-export client-safe utilities
export * from "./file-upload-client";

// For browser compatibility, these functions require the Buffer polyfill
// which is configured in next.config.js

// Helper function to parse multipart form data with Buffer polyfill
export async function parseFormData(request: Request): Promise<{
  files: Array<{
    name: string;
    filename: string;
    mimeType: string;
    buffer: any; // Buffer in Node.js, polyfilled Buffer in browser
  }>;
  fields: Record<string, string>;
}> {
  const formData = await request.formData();
  const files: Array<{
    name: string;
    filename: string;
    mimeType: string;
    buffer: any;
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
