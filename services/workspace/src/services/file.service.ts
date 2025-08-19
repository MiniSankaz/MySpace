import * as fs from "fs/promises";
import * as path from "path";
import { logger } from "@shared/utils/logger";

export interface FileInfo {
  name: string;
  path: string;
  size: number;
  type: "file" | "directory";
  extension?: string;
  createdAt: Date;
  updatedAt: Date;
  permissions: string;
}

export interface FileContent {
  path: string;
  content: string;
  encoding: string;
  size: number;
}

export class FileService {
  private workspaceRoot: string;
  private maxFileSize: number;
  private allowedExtensions: string[];

  constructor() {
    this.workspaceRoot = process.env.WORKSPACE_ROOT || "./workspaces";
    this.maxFileSize = parseInt(process.env.MAX_FILE_SIZE || "10485760", 10); // 10MB default
    this.allowedExtensions = process.env.ALLOWED_EXTENSIONS?.split(",") || [
      ".js",
      ".ts",
      ".jsx",
      ".tsx",
      ".json",
      ".md",
      ".txt",
      ".yml",
      ".yaml",
      ".css",
      ".scss",
      ".html",
    ];
  }

  /**
   * List files and directories in a given path
   */
  async listFiles(relativePath: string = ""): Promise<FileInfo[]> {
    try {
      const fullPath = path.join(this.workspaceRoot, relativePath);
      const entries = await fs.readdir(fullPath, { withFileTypes: true });

      const files: FileInfo[] = [];

      for (const entry of entries) {
        const filePath = path.join(fullPath, entry.name);
        const stats = await fs.stat(filePath);

        files.push({
          name: entry.name,
          path: path.join(relativePath, entry.name),
          size: stats.size,
          type: entry.isDirectory() ? "directory" : "file",
          extension: entry.isFile() ? path.extname(entry.name) : undefined,
          createdAt: stats.birthtime,
          updatedAt: stats.mtime,
          permissions: stats.mode.toString(8).slice(-3),
        });
      }

      return files.sort((a, b) => {
        // Directories first, then files
        if (a.type !== b.type) {
          return a.type === "directory" ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
    } catch (error) {
      logger.error("Error listing files:", error);
      throw new Error(`Failed to list files: ${(error as Error).message}`);
    }
  }

  /**
   * Read file content
   */
  async readFile(relativePath: string): Promise<FileContent> {
    try {
      const fullPath = path.join(this.workspaceRoot, relativePath);

      // Check if file exists
      const stats = await fs.stat(fullPath);

      if (stats.isDirectory()) {
        throw new Error("Path is a directory, not a file");
      }

      if (stats.size > this.maxFileSize) {
        throw new Error(
          `File size exceeds maximum allowed size of ${this.maxFileSize} bytes`,
        );
      }

      // Check file extension
      const ext = path.extname(fullPath);
      if (!this.allowedExtensions.includes(ext)) {
        throw new Error(`File extension ${ext} is not allowed`);
      }

      const content = await fs.readFile(fullPath, "utf-8");

      return {
        path: relativePath,
        content,
        encoding: "utf-8",
        size: stats.size,
      };
    } catch (error) {
      logger.error("Error reading file:", error);
      throw new Error(`Failed to read file: ${(error as Error).message}`);
    }
  }

  /**
   * Create or update file
   */
  async writeFile(relativePath: string, content: string): Promise<FileInfo> {
    try {
      const fullPath = path.join(this.workspaceRoot, relativePath);
      const dir = path.dirname(fullPath);

      // Check file extension
      const ext = path.extname(fullPath);
      if (!this.allowedExtensions.includes(ext)) {
        throw new Error(`File extension ${ext} is not allowed`);
      }

      // Check content size
      const contentSize = Buffer.byteLength(content, "utf-8");
      if (contentSize > this.maxFileSize) {
        throw new Error(
          `Content size exceeds maximum allowed size of ${this.maxFileSize} bytes`,
        );
      }

      // Ensure directory exists
      await fs.mkdir(dir, { recursive: true });

      // Write file
      await fs.writeFile(fullPath, content, "utf-8");

      // Get file info
      const stats = await fs.stat(fullPath);

      return {
        name: path.basename(fullPath),
        path: relativePath,
        size: stats.size,
        type: "file",
        extension: ext,
        createdAt: stats.birthtime,
        updatedAt: stats.mtime,
        permissions: stats.mode.toString(8).slice(-3),
      };
    } catch (error) {
      logger.error("Error writing file:", error);
      throw new Error(`Failed to write file: ${(error as Error).message}`);
    }
  }

  /**
   * Delete file or directory
   */
  async deleteFile(relativePath: string): Promise<void> {
    try {
      const fullPath = path.join(this.workspaceRoot, relativePath);
      const stats = await fs.stat(fullPath);

      if (stats.isDirectory()) {
        await fs.rmdir(fullPath, { recursive: true });
      } else {
        await fs.unlink(fullPath);
      }

      logger.info(`Deleted: ${relativePath}`);
    } catch (error) {
      logger.error("Error deleting file:", error);
      throw new Error(`Failed to delete file: ${(error as Error).message}`);
    }
  }

  /**
   * Create directory
   */
  async createDirectory(relativePath: string): Promise<FileInfo> {
    try {
      const fullPath = path.join(this.workspaceRoot, relativePath);

      await fs.mkdir(fullPath, { recursive: true });

      const stats = await fs.stat(fullPath);

      return {
        name: path.basename(fullPath),
        path: relativePath,
        size: stats.size,
        type: "directory",
        createdAt: stats.birthtime,
        updatedAt: stats.mtime,
        permissions: stats.mode.toString(8).slice(-3),
      };
    } catch (error) {
      logger.error("Error creating directory:", error);
      throw new Error(
        `Failed to create directory: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Move/rename file or directory
   */
  async moveFile(sourcePath: string, targetPath: string): Promise<FileInfo> {
    try {
      const sourceFullPath = path.join(this.workspaceRoot, sourcePath);
      const targetFullPath = path.join(this.workspaceRoot, targetPath);
      const targetDir = path.dirname(targetFullPath);

      // Ensure target directory exists
      await fs.mkdir(targetDir, { recursive: true });

      // Move file
      await fs.rename(sourceFullPath, targetFullPath);

      // Get file info
      const stats = await fs.stat(targetFullPath);
      const isDirectory = stats.isDirectory();

      return {
        name: path.basename(targetFullPath),
        path: targetPath,
        size: stats.size,
        type: isDirectory ? "directory" : "file",
        extension: isDirectory ? undefined : path.extname(targetFullPath),
        createdAt: stats.birthtime,
        updatedAt: stats.mtime,
        permissions: stats.mode.toString(8).slice(-3),
      };
    } catch (error) {
      logger.error("Error moving file:", error);
      throw new Error(`Failed to move file: ${(error as Error).message}`);
    }
  }

  /**
   * Copy file or directory
   */
  async copyFile(sourcePath: string, targetPath: string): Promise<FileInfo> {
    try {
      const sourceFullPath = path.join(this.workspaceRoot, sourcePath);
      const targetFullPath = path.join(this.workspaceRoot, targetPath);
      const targetDir = path.dirname(targetFullPath);

      // Ensure target directory exists
      await fs.mkdir(targetDir, { recursive: true });

      // Copy file
      await fs.cp(sourceFullPath, targetFullPath, { recursive: true });

      // Get file info
      const stats = await fs.stat(targetFullPath);
      const isDirectory = stats.isDirectory();

      return {
        name: path.basename(targetFullPath),
        path: targetPath,
        size: stats.size,
        type: isDirectory ? "directory" : "file",
        extension: isDirectory ? undefined : path.extname(targetFullPath),
        createdAt: stats.birthtime,
        updatedAt: stats.mtime,
        permissions: stats.mode.toString(8).slice(-3),
      };
    } catch (error) {
      logger.error("Error copying file:", error);
      throw new Error(`Failed to copy file: ${(error as Error).message}`);
    }
  }

  /**
   * Search files by pattern
   */
  async searchFiles(
    pattern: string,
    searchPath: string = "",
  ): Promise<FileInfo[]> {
    const results: FileInfo[] = [];
    const searchRegex = new RegExp(pattern, "i");

    const searchDirectory = async (dirPath: string) => {
      const files = await this.listFiles(dirPath);

      for (const file of files) {
        if (searchRegex.test(file.name)) {
          results.push(file);
        }

        if (file.type === "directory") {
          await searchDirectory(file.path);
        }
      }
    };

    await searchDirectory(searchPath);
    return results;
  }
}

export default new FileService();
