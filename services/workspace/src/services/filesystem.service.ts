import fs from "fs-extra";
import path from "path";
import { logger, createTimer, logError } from "../utils/logger";
import { FileItem, ApiResponse } from "@shared/types";
import mime from "mime-types";
import archiver from "archiver";
import { Readable } from "stream";

export interface FileOperationOptions {
  createMissing?: boolean;
  overwrite?: boolean;
  preserveTimestamps?: boolean;
  filter?: (src: string, dest: string) => boolean;
}

export interface FileSearchOptions {
  pattern?: RegExp;
  extensions?: string[];
  maxDepth?: number;
  includeHidden?: boolean;
  maxSize?: number;
}

export class FileSystemService {
  private workspaceRoot: string;
  private maxFileSize: number;
  private allowedExtensions: Set<string>;
  private blockedPaths: Set<string>;

  constructor() {
    this.workspaceRoot =
      process.env.WORKSPACE_ROOT || path.join(process.cwd(), "workspace");
    this.maxFileSize = parseInt(process.env.MAX_FILE_SIZE || "52428800", 10); // 50MB default

    // Default allowed extensions (can be configured via env)
    const allowedExts =
      process.env.ALLOWED_EXTENSIONS ||
      ".txt,.md,.js,.ts,.json,.yml,.yaml,.css,.scss,.html,.xml,.py,.java,.go,.rs,.cpp,.c,.h,.sql,.sh,.bat,.ps1,.dockerfile,.gitignore,.env";
    this.allowedExtensions = new Set(
      allowedExts.split(",").map((ext) => ext.toLowerCase()),
    );

    // Blocked paths for security
    this.blockedPaths = new Set([
      "..",
      "../",
      "node_modules",
      ".git",
      ".env",
      ".npmrc",
      ".ssh",
      "etc",
      "bin",
      "usr",
      "var",
      "tmp",
    ]);

    this.ensureWorkspaceRoot();
  }

  private async ensureWorkspaceRoot(): Promise<void> {
    try {
      await fs.ensureDir(this.workspaceRoot);
      logger.info(`Workspace root ensured: ${this.workspaceRoot}`);
    } catch (error: any) {
      logError(error, { workspaceRoot: this.workspaceRoot });
      throw new Error(`Failed to ensure workspace root: ${error.message}`);
    }
  }

  private validatePath(targetPath: string): string {
    // Normalize path and check for security issues
    const normalizedPath = path.normalize(targetPath);

    // Check for path traversal
    if (normalizedPath.includes("..") || normalizedPath.startsWith("/")) {
      throw new Error("Invalid path: Path traversal detected");
    }

    // Check blocked paths
    const pathSegments = normalizedPath.split(path.sep);
    for (const segment of pathSegments) {
      if (this.blockedPaths.has(segment.toLowerCase())) {
        throw new Error(`Blocked path segment: ${segment}`);
      }
    }

    // Resolve to absolute path within workspace
    const absolutePath = path.resolve(this.workspaceRoot, normalizedPath);

    // Ensure path is within workspace root
    if (!absolutePath.startsWith(this.workspaceRoot)) {
      throw new Error("Path outside workspace root not allowed");
    }

    return absolutePath;
  }

  private isAllowedExtension(filePath: string): boolean {
    if (this.allowedExtensions.size === 0) return true; // Allow all if not configured

    const ext = path.extname(filePath).toLowerCase();
    return this.allowedExtensions.has(ext);
  }

  private async getFileStats(filePath: string): Promise<FileItem> {
    const stats = await fs.stat(filePath);
    const relativePath = path.relative(this.workspaceRoot, filePath);
    const ext = path.extname(filePath);

    return {
      name: path.basename(filePath),
      path: relativePath,
      type: stats.isDirectory() ? "directory" : "file",
      size: stats.size,
      lastModified: stats.mtime,
      permissions: "0" + (stats.mode & parseInt("777", 8)).toString(8),
      isHidden: path.basename(filePath).startsWith("."),
      extension: ext,
      mimeType: stats.isFile()
        ? mime.lookup(filePath) || "application/octet-stream"
        : undefined,
    };
  }

  /**
   * List directory contents
   */
  async listDirectory(dirPath: string = ""): Promise<FileItem[]> {
    const timer = createTimer("list-directory");

    try {
      const absolutePath = this.validatePath(dirPath);

      if (!(await fs.pathExists(absolutePath))) {
        throw new Error("Directory not found");
      }

      const stats = await fs.stat(absolutePath);
      if (!stats.isDirectory()) {
        throw new Error("Path is not a directory");
      }

      const entries = await fs.readdir(absolutePath);
      const fileItems: FileItem[] = [];

      for (const entry of entries) {
        try {
          const entryPath = path.join(absolutePath, entry);
          const fileItem = await this.getFileStats(entryPath);
          fileItems.push(fileItem);
        } catch (error) {
          logger.warn(`Failed to get stats for ${entry}:`, error);
        }
      }

      // Sort: directories first, then files, both alphabetically
      fileItems.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === "directory" ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });

      timer.end();
      logger.info(`Listed directory: ${dirPath} (${fileItems.length} items)`);

      return fileItems;
    } catch (error: any) {
      timer.end();
      logError(error, { dirPath });
      throw error;
    }
  }

  /**
   * Read file content
   */
  async readFile(
    filePath: string,
    encoding: BufferEncoding = "utf8",
  ): Promise<string | Buffer> {
    const timer = createTimer("read-file");

    try {
      const absolutePath = this.validatePath(filePath);

      if (!(await fs.pathExists(absolutePath))) {
        throw new Error("File not found");
      }

      const stats = await fs.stat(absolutePath);
      if (!stats.isFile()) {
        throw new Error("Path is not a file");
      }

      if (stats.size > this.maxFileSize) {
        throw new Error(
          `File too large (${stats.size} bytes, max: ${this.maxFileSize})`,
        );
      }

      if (!this.isAllowedExtension(filePath)) {
        throw new Error("File type not allowed");
      }

      const content = await fs.readFile(absolutePath, encoding);

      timer.end();
      logger.info(`Read file: ${filePath} (${stats.size} bytes)`);

      return content;
    } catch (error: any) {
      timer.end();
      logError(error, { filePath });
      throw error;
    }
  }

  /**
   * Write file content
   */
  async writeFile(
    filePath: string,
    content: string | Buffer,
    options: FileOperationOptions = {},
  ): Promise<void> {
    const timer = createTimer("write-file");

    try {
      const absolutePath = this.validatePath(filePath);

      if (!this.isAllowedExtension(filePath)) {
        throw new Error("File type not allowed");
      }

      const contentSize = Buffer.isBuffer(content)
        ? content.length
        : Buffer.byteLength(content);
      if (contentSize > this.maxFileSize) {
        throw new Error(
          `Content too large (${contentSize} bytes, max: ${this.maxFileSize})`,
        );
      }

      // Check if file exists
      const exists = await fs.pathExists(absolutePath);
      if (exists && !options.overwrite) {
        throw new Error("File already exists and overwrite is disabled");
      }

      // Ensure directory exists
      if (options.createMissing) {
        await fs.ensureDir(path.dirname(absolutePath));
      }

      await fs.writeFile(absolutePath, content);

      timer.end();
      logger.info(`Wrote file: ${filePath} (${contentSize} bytes)`);
    } catch (error: any) {
      timer.end();
      logError(error, {
        filePath,
        contentSize: Buffer.isBuffer(content)
          ? content.length
          : Buffer.byteLength(content),
      });
      throw error;
    }
  }

  /**
   * Create directory
   */
  async createDirectory(dirPath: string): Promise<void> {
    const timer = createTimer("create-directory");

    try {
      const absolutePath = this.validatePath(dirPath);

      if (await fs.pathExists(absolutePath)) {
        throw new Error("Directory already exists");
      }

      await fs.ensureDir(absolutePath);

      timer.end();
      logger.info(`Created directory: ${dirPath}`);
    } catch (error: any) {
      timer.end();
      logError(error, { dirPath });
      throw error;
    }
  }

  /**
   * Delete file or directory
   */
  async delete(targetPath: string, recursive: boolean = false): Promise<void> {
    const timer = createTimer("delete");

    try {
      const absolutePath = this.validatePath(targetPath);

      if (!(await fs.pathExists(absolutePath))) {
        throw new Error("Path not found");
      }

      const stats = await fs.stat(absolutePath);

      if (stats.isDirectory() && !recursive) {
        const entries = await fs.readdir(absolutePath);
        if (entries.length > 0) {
          throw new Error("Directory not empty (use recursive option)");
        }
      }

      await fs.remove(absolutePath);

      timer.end();
      logger.info(
        `Deleted: ${targetPath} (${stats.isDirectory() ? "directory" : "file"})`,
      );
    } catch (error: any) {
      timer.end();
      logError(error, { targetPath });
      throw error;
    }
  }

  /**
   * Copy file or directory
   */
  async copy(
    srcPath: string,
    destPath: string,
    options: FileOperationOptions = {},
  ): Promise<void> {
    const timer = createTimer("copy");

    try {
      const absoluteSrcPath = this.validatePath(srcPath);
      const absoluteDestPath = this.validatePath(destPath);

      if (!(await fs.pathExists(absoluteSrcPath))) {
        throw new Error("Source path not found");
      }

      if ((await fs.pathExists(absoluteDestPath)) && !options.overwrite) {
        throw new Error("Destination already exists and overwrite is disabled");
      }

      const copyOptions: any = {
        preserveTimestamps: options.preserveTimestamps,
        filter: options.filter,
      };

      if (options.overwrite) {
        copyOptions.overwrite = true;
      }

      await fs.copy(absoluteSrcPath, absoluteDestPath, copyOptions);

      timer.end();
      logger.info(`Copied: ${srcPath} -> ${destPath}`);
    } catch (error: any) {
      timer.end();
      logError(error, { srcPath, destPath });
      throw error;
    }
  }

  /**
   * Move/rename file or directory
   */
  async move(
    srcPath: string,
    destPath: string,
    options: FileOperationOptions = {},
  ): Promise<void> {
    const timer = createTimer("move");

    try {
      const absoluteSrcPath = this.validatePath(srcPath);
      const absoluteDestPath = this.validatePath(destPath);

      if (!(await fs.pathExists(absoluteSrcPath))) {
        throw new Error("Source path not found");
      }

      if ((await fs.pathExists(absoluteDestPath)) && !options.overwrite) {
        throw new Error("Destination already exists and overwrite is disabled");
      }

      await fs.move(absoluteSrcPath, absoluteDestPath, {
        overwrite: options.overwrite,
      });

      timer.end();
      logger.info(`Moved: ${srcPath} -> ${destPath}`);
    } catch (error: any) {
      timer.end();
      logError(error, { srcPath, destPath });
      throw error;
    }
  }

  /**
   * Search for files
   */
  async searchFiles(
    searchPath: string = "",
    options: FileSearchOptions = {},
  ): Promise<FileItem[]> {
    const timer = createTimer("search-files");

    try {
      const absolutePath = this.validatePath(searchPath);
      const results: FileItem[] = [];

      const search = async (
        currentPath: string,
        depth: number = 0,
      ): Promise<void> => {
        if (options.maxDepth && depth > options.maxDepth) return;

        const entries = await fs.readdir(currentPath);

        for (const entry of entries) {
          if (!options.includeHidden && entry.startsWith(".")) continue;

          const entryPath = path.join(currentPath, entry);
          const stats = await fs.stat(entryPath);

          if (stats.isDirectory()) {
            await search(entryPath, depth + 1);
          } else if (stats.isFile()) {
            // Apply filters
            if (options.maxSize && stats.size > options.maxSize) continue;

            if (options.extensions) {
              const ext = path.extname(entry).toLowerCase().slice(1);
              if (!options.extensions.includes(ext)) continue;
            }

            if (options.pattern && !options.pattern.test(entry)) continue;

            const fileItem = await this.getFileStats(entryPath);
            results.push(fileItem);
          }
        }
      };

      await search(absolutePath);

      timer.end();
      logger.info(`Search completed: ${results.length} files found`);

      return results;
    } catch (error: any) {
      timer.end();
      logError(error, { searchPath, options });
      throw error;
    }
  }

  /**
   * Get file/directory information
   */
  async getInfo(targetPath: string): Promise<FileItem> {
    const timer = createTimer("get-info");

    try {
      const absolutePath = this.validatePath(targetPath);

      if (!(await fs.pathExists(absolutePath))) {
        throw new Error("Path not found");
      }

      const fileItem = await this.getFileStats(absolutePath);

      timer.end();
      logger.info(`Got info for: ${targetPath}`);

      return fileItem;
    } catch (error: any) {
      timer.end();
      logError(error, { targetPath });
      throw error;
    }
  }

  /**
   * Create archive of directory or files
   */
  async createArchive(
    targetPaths: string[],
    outputPath: string,
    format: "zip" | "tar" = "zip",
  ): Promise<void> {
    const timer = createTimer("create-archive");

    try {
      const absoluteOutputPath = this.validatePath(outputPath);

      // Ensure output directory exists
      await fs.ensureDir(path.dirname(absoluteOutputPath));

      const output = fs.createWriteStream(absoluteOutputPath);
      const archive = archiver(format === "zip" ? "zip" : "tar", {
        zlib: { level: 9 }, // Compression level
        gzip: format === "tar",
      });

      archive.pipe(output);

      for (const targetPath of targetPaths) {
        const absolutePath = this.validatePath(targetPath);

        if (!(await fs.pathExists(absolutePath))) {
          logger.warn(`Skipping non-existent path: ${targetPath}`);
          continue;
        }

        const stats = await fs.stat(absolutePath);

        if (stats.isDirectory()) {
          archive.directory(absolutePath, path.basename(absolutePath));
        } else {
          archive.file(absolutePath, { name: path.basename(absolutePath) });
        }
      }

      await archive.finalize();

      await new Promise<void>((resolve, reject) => {
        output.on("close", () => resolve());
        output.on("error", reject);
      });

      timer.end();
      logger.info(
        `Created archive: ${outputPath} (${targetPaths.length} items)`,
      );
    } catch (error: any) {
      timer.end();
      logError(error, { targetPaths, outputPath });
      throw error;
    }
  }

  /**
   * Get workspace usage statistics
   */
  async getWorkspaceStats(): Promise<{
    totalFiles: number;
    totalDirectories: number;
    totalSize: number;
    largestFile: { path: string; size: number } | null;
    recentFiles: FileItem[];
  }> {
    const timer = createTimer("workspace-stats");

    try {
      let totalFiles = 0;
      let totalDirectories = 0;
      let totalSize = 0;
      let largestFile: { path: string; size: number } | null = null;
      const recentFiles: FileItem[] = [];

      const scan = async (currentPath: string): Promise<void> => {
        const entries = await fs.readdir(currentPath);

        for (const entry of entries) {
          if (entry.startsWith(".")) continue; // Skip hidden files

          const entryPath = path.join(currentPath, entry);
          const stats = await fs.stat(entryPath);

          if (stats.isDirectory()) {
            totalDirectories++;
            await scan(entryPath);
          } else {
            totalFiles++;
            totalSize += stats.size;

            // Track largest file
            if (!largestFile || stats.size > largestFile.size) {
              largestFile = {
                path: path.relative(this.workspaceRoot, entryPath),
                size: stats.size,
              };
            }

            // Track recent files (last 7 days)
            const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            if (stats.mtime > weekAgo) {
              const fileItem = await this.getFileStats(entryPath);
              recentFiles.push(fileItem);
            }
          }
        }
      };

      await scan(this.workspaceRoot);

      // Sort recent files by modification time
      recentFiles.sort(
        (a, b) => b.lastModified.getTime() - a.lastModified.getTime(),
      );

      timer.end();

      return {
        totalFiles,
        totalDirectories,
        totalSize,
        largestFile,
        recentFiles: recentFiles.slice(0, 10), // Top 10 recent files
      };
    } catch (error: any) {
      timer.end();
      logError(error);
      throw error;
    }
  }

  /**
   * Get workspace root path
   */
  getWorkspaceRoot(): string {
    return this.workspaceRoot;
  }

  /**
   * Check if path exists
   */
  async exists(targetPath: string): Promise<boolean> {
    try {
      const absolutePath = this.validatePath(targetPath);
      return await fs.pathExists(absolutePath);
    } catch (error) {
      return false;
    }
  }
}
