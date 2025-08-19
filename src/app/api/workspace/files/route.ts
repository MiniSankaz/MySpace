import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
  size?: number;
  modified?: Date;
  extension?: string;
}

// Directories to ignore
const IGNORE_DIRS = new Set([
  ".git",
  "node_modules",
  ".next",
  ".cache",
  "dist",
  "build",
  ".turbo",
  ".vercel",
  "coverage",
  ".nyc_output",
  ".pytest_cache",
  "__pycache__",
  ".DS_Store",
  "thumbs.db",
]);

// Files to ignore
const IGNORE_FILES = new Set([
  ".DS_Store",
  "Thumbs.db",
  ".env",
  "*.log",
  "*.pid",
  "*.seed",
  "*.pid.lock",
]);

async function getFileTree(
  dirPath: string,
  depth: number = 0,
  maxDepth: number = 5,
): Promise<FileNode[]> {
  if (depth > maxDepth) return [];

  try {
    const items = await fs.readdir(dirPath);
    const fileNodes: FileNode[] = [];

    for (const item of items) {
      // Skip ignored directories and files
      if (IGNORE_DIRS.has(item)) continue;
      if (IGNORE_FILES.has(item)) continue;
      if (
        item.startsWith(".") &&
        item !== ".env.local" &&
        item !== ".env.example"
      )
        continue;

      const fullPath = path.join(dirPath, item);

      try {
        const stats = await fs.stat(fullPath);
        // Create a proper relative path from the project base
        const relativePath = path.relative(process.cwd(), fullPath);

        const node: FileNode = {
          name: item,
          path: relativePath,
          type: stats.isDirectory() ? "directory" : "file",
          size: stats.size,
          modified: stats.mtime,
        };

        if (stats.isDirectory()) {
          // Recursively get children for directories
          if (depth < maxDepth) {
            node.children = await getFileTree(fullPath, depth + 1, maxDepth);
          } else {
            node.children = [];
          }
        } else {
          // Add file extension
          const ext = path.extname(item);
          if (ext) {
            node.extension = ext.substring(1); // Remove the dot
          }
        }

        fileNodes.push(node);
      } catch (error) {
        // Skip files/directories we can't access
        console.error(`Error accessing ${fullPath}:`, error);
      }
    }

    // Sort: directories first, then files, alphabetically
    fileNodes.sort((a, b) => {
      if (a.type === "directory" && b.type === "file") return -1;
      if (a.type === "file" && b.type === "directory") return 1;
      return a.name.localeCompare(b.name);
    });

    return fileNodes;
  } catch (error) {
    console.error(`Error reading directory ${dirPath}:`, error);
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    // Get the base project path and the relative path within it
    const projectBasePath = searchParams.get("projectPath") || process.cwd();
    const relativePath = searchParams.get("path") || "";
    const maxDepth = parseInt(searchParams.get("depth") || "3");

    // Determine the full path to scan
    let fullPath: string;
    if (relativePath && relativePath !== "/" && relativePath !== "") {
      // If we have a relative path, combine it with the project base path
      // Remove leading slash if present to prevent double slash
      const cleanRelativePath = relativePath.startsWith("/")
        ? relativePath.slice(1)
        : relativePath;
      fullPath = path.join(projectBasePath, cleanRelativePath);
    } else {
      // If no relative path, use the project base path directly
      fullPath = projectBasePath;
    }

    const resolvedPath = path.resolve(fullPath);

    // Security check: ensure the resolved path is within the project base path
    const allowedPath = path.resolve(projectBasePath);

    if (!resolvedPath.startsWith(allowedPath)) {
      return NextResponse.json(
        { error: "Access denied: Path outside allowed directory" },
        { status: 403 },
      );
    }

    const fileTree = await getFileTree(resolvedPath, 0, maxDepth);

    return NextResponse.json({
      success: true,
      path: resolvedPath,
      files: fileTree,
    });
  } catch (error) {
    console.error("Error in file tree API:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to read file tree",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// Handle file operations
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, path: filePath, content, newPath } = body;

    const { searchParams } = new URL(request.url);
    const projectBasePath = searchParams.get("projectPath") || process.cwd();

    // Resolve relative paths from project base path
    const resolvedPath = path.resolve(
      projectBasePath,
      filePath.startsWith("/") ? filePath.slice(1) : filePath,
    );
    const allowedPath = path.resolve(projectBasePath);

    if (!resolvedPath.startsWith(allowedPath)) {
      return NextResponse.json(
        { error: "Access denied: Path outside project directory" },
        { status: 403 },
      );
    }

    switch (action) {
      case "read":
        const fileContent = await fs.readFile(resolvedPath, "utf-8");
        return NextResponse.json({
          success: true,
          content: fileContent,
        });

      case "write":
        await fs.writeFile(resolvedPath, content, "utf-8");
        return NextResponse.json({
          success: true,
          message: "File saved successfully",
        });

      case "create":
        // Create directory if it doesn't exist
        const dir = path.dirname(resolvedPath);
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(resolvedPath, content || "", "utf-8");
        return NextResponse.json({
          success: true,
          message: "File created successfully",
        });

      case "delete":
        const stats = await fs.stat(resolvedPath);
        if (stats.isDirectory()) {
          await fs.rmdir(resolvedPath, { recursive: true });
        } else {
          await fs.unlink(resolvedPath);
        }
        return NextResponse.json({
          success: true,
          message: "Deleted successfully",
        });

      case "rename":
        const resolvedNewPath = path.resolve(
          projectBasePath,
          newPath.startsWith("/") ? newPath.slice(1) : newPath,
        );
        if (!resolvedNewPath.startsWith(allowedPath)) {
          return NextResponse.json(
            { error: "Access denied: New path outside project directory" },
            { status: 403 },
          );
        }
        await fs.rename(resolvedPath, resolvedNewPath);
        return NextResponse.json({
          success: true,
          message: "Renamed successfully",
        });

      case "mkdir":
        await fs.mkdir(resolvedPath, { recursive: true });
        return NextResponse.json({
          success: true,
          message: "Directory created successfully",
        });

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error in file operation:", error);
    return NextResponse.json(
      {
        success: false,
        error: "File operation failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
