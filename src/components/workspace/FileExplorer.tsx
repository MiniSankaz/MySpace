import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  File,
  FileText,
  FileCode,
  Image,
  Archive,
  Database,
  Plus,
  Search,
  MoreVertical,
  Upload,
  Download,
  Edit2,
  Trash2,
  Copy,
  Scissors,
  Clipboard,
  GitBranch,
  GitCommit,
  GitMerge,
  RefreshCw,
  Loader2,
} from "lucide-react";

export interface FileNode {
  id: string;
  name: string;
  type: "file" | "directory";
  path: string;
  size?: number;
  modifiedAt: Date;
  children?: FileNode[];
  gitStatus?: "modified" | "added" | "deleted" | "renamed" | "untracked";
  isSelected?: boolean;
  isExpanded?: boolean;
  extension?: string;
}

interface FileExplorerProps {
  projectId: string;
  files: FileNode[];
  selectedFile?: string;
  onFileSelect: (file: FileNode) => void;
  onFileCreate: (path: string, type: "file" | "directory") => void;
  onFileRename: (oldPath: string, newPath: string) => void;
  onFileDelete: (path: string) => void;
  onFileUpload?: (files: File[], targetPath: string) => void;
  onFileDownload?: (path: string) => void;
  onRefresh?: () => void;
  loading?: boolean;
  error?: string;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  showGitStatus?: boolean;
  className?: string;
}

const FileExplorer: React.FC<FileExplorerProps> = ({
  projectId,
  files,
  selectedFile,
  onFileSelect,
  onFileCreate,
  onFileRename,
  onFileDelete,
  onFileUpload,
  onFileDownload,
  onRefresh,
  loading = false,
  error,
  searchQuery = "",
  onSearchChange,
  showGitStatus = true,
  className,
}) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    file: FileNode;
  } | null>(null);
  const [renamingFile, setRenamingFile] = useState<string | null>(null);
  const [newFileName, setNewFileName] = useState("");
  const [draggedFile, setDraggedFile] = useState<FileNode | null>(null);
  const [dragOverPath, setDragOverPath] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  const toggleExpand = (path: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const handleContextMenu = (e: React.MouseEvent, file: FileNode) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, file });
  };

  const handleRename = (file: FileNode) => {
    setRenamingFile(file.path);
    setNewFileName(file.name);
    setContextMenu(null);
  };

  const confirmRename = (oldPath: string) => {
    if (newFileName.trim() && newFileName !== oldPath.split("/").pop()) {
      const newPath = oldPath
        .split("/")
        .slice(0, -1)
        .concat(newFileName)
        .join("/");
      onFileRename(oldPath, newPath);
    }
    setRenamingFile(null);
    setNewFileName("");
  };

  const handleDragStart = (e: React.DragEvent, file: FileNode) => {
    setDraggedFile(file);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, path: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverPath(path);
  };

  const handleDrop = (e: React.DragEvent, targetFile: FileNode) => {
    e.preventDefault();
    e.stopPropagation();

    if (
      draggedFile &&
      targetFile.type === "directory" &&
      draggedFile.path !== targetFile.path
    ) {
      const newPath = `${targetFile.path}/${draggedFile.name}`;
      onFileRename(draggedFile.path, newPath);
    }

    setDraggedFile(null);
    setDragOverPath(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0 && onFileUpload) {
      onFileUpload(files, contextMenu?.file.path || "/");
    }
    setContextMenu(null);
  };

  const getFileIcon = (file: FileNode) => {
    if (file.type === "directory") {
      const isExpanded = expandedNodes.has(file.path);
      return isExpanded ? (
        <FolderOpen className="h-4 w-4" />
      ) : (
        <Folder className="h-4 w-4" />
      );
    }

    const ext = file.extension || file.name.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "ts":
      case "tsx":
      case "js":
      case "jsx":
        return <FileCode className="h-4 w-4 text-blue-500" />;
      case "html":
      case "css":
      case "scss":
        return <FileCode className="h-4 w-4 text-orange-500" />;
      case "json":
      case "xml":
      case "yaml":
        return <FileText className="h-4 w-4 text-yellow-500" />;
      case "md":
      case "txt":
        return <FileText className="h-4 w-4" />;
      case "png":
      case "jpg":
      case "jpeg":
      case "gif":
      case "svg":
        return <Image className="h-4 w-4 text-green-500" />;
      case "zip":
      case "tar":
      case "gz":
        return <Archive className="h-4 w-4 text-purple-500" />;
      case "db":
      case "sql":
        return <Database className="h-4 w-4 text-red-500" />;
      default:
        return <File className="h-4 w-4" />;
    }
  };

  const getGitStatusColor = (status?: FileNode["gitStatus"]) => {
    switch (status) {
      case "modified":
        return "text-yellow-600 dark:text-yellow-400";
      case "added":
        return "text-green-600 dark:text-green-400";
      case "deleted":
        return "text-red-600 dark:text-red-400";
      case "renamed":
        return "text-blue-600 dark:text-blue-400";
      case "untracked":
        return "text-gray-500 dark:text-gray-400";
      default:
        return "";
    }
  };

  const getGitStatusIndicator = (status?: FileNode["gitStatus"]) => {
    switch (status) {
      case "modified":
        return "M";
      case "added":
        return "A";
      case "deleted":
        return "D";
      case "renamed":
        return "R";
      case "untracked":
        return "U";
      default:
        return null;
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "";
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const renderFileTree = (nodes: FileNode[], level = 0) => {
    return nodes.map((file) => {
      const isExpanded = expandedNodes.has(file.path);
      const isSelected = selectedFile === file.path;
      const isDragOver = dragOverPath === file.path;

      return (
        <div key={file.path}>
          <div
            className={cn(
              "group flex items-center px-2 py-1 text-sm cursor-pointer rounded transition-colors",
              isSelected && "bg-blue-100 dark:bg-blue-900/30",
              !isSelected && "hover:bg-gray-100 dark:hover:bg-gray-700",
              isDragOver && "bg-blue-50 dark:bg-blue-900/20",
              renamingFile === file.path && "bg-gray-100 dark:bg-gray-700",
            )}
            style={{ paddingLeft: `${level * 16 + 8}px` }}
            onClick={() => {
              if (file.type === "directory") {
                toggleExpand(file.path);
              } else {
                onFileSelect(file);
              }
            }}
            onContextMenu={(e) => handleContextMenu(e, file)}
            draggable={!renamingFile}
            onDragStart={(e) => handleDragStart(e, file)}
            onDragOver={(e) =>
              file.type === "directory" && handleDragOver(e, file.path)
            }
            onDrop={(e) => file.type === "directory" && handleDrop(e, file)}
          >
            {file.type === "directory" && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(file.path);
                }}
                className="mr-1 p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
              >
                {isExpanded ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </button>
            )}

            <div className="flex items-center flex-1 min-w-0">
              <span className="mr-2 flex-shrink-0">{getFileIcon(file)}</span>

              {renamingFile === file.path ? (
                <input
                  type="text"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  onBlur={() => confirmRename(file.path)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") confirmRename(file.path);
                    if (e.key === "Escape") {
                      setRenamingFile(null);
                      setNewFileName("");
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 px-1 py-0 text-sm bg-white dark:bg-gray-800 border border-blue-500 rounded outline-none"
                  autoFocus
                />
              ) : (
                <span className="truncate flex-1">{file.name}</span>
              )}

              {showGitStatus && file.gitStatus && (
                <span
                  className={cn(
                    "ml-2 px-1 text-xs font-bold",
                    getGitStatusColor(file.gitStatus),
                  )}
                >
                  {getGitStatusIndicator(file.gitStatus)}
                </span>
              )}

              {file.type === "file" && file.size && (
                <span className="ml-2 text-xs text-gray-500 dark:text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  {formatFileSize(file.size)}
                </span>
              )}
            </div>
          </div>

          {file.type === "directory" && isExpanded && file.children && (
            <div>{renderFileTree(file.children, level + 1)}</div>
          )}
        </div>
      );
    });
  };

  if (loading) {
    return (
      <div
        className={cn(
          "bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700",
          className,
        )}
      >
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex flex-col",
        className,
      )}
    >
      {/* Header */}
      <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Explorer
          </h3>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => onFileCreate("/", "file")}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              title="New File"
            >
              <File className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onFileCreate("/", "directory")}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              title="New Folder"
            >
              <Folder className="h-3.5 w-3.5" />
            </button>
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                title="Refresh"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Search */}
        {onSearchChange && (
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search files..."
              className="w-full pl-7 pr-2 py-1 text-xs bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded"
            />
          </div>
        )}
      </div>

      {/* File Tree */}
      <div className="flex-1 overflow-y-auto p-1">
        {error ? (
          <div className="text-center py-8 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
            No files in this project
          </div>
        ) : (
          renderFileTree(files)
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.file.type === "directory" && (
            <>
              <button
                onClick={() => {
                  onFileCreate(contextMenu.file.path, "file");
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                New File
              </button>
              <button
                onClick={() => {
                  onFileCreate(contextMenu.file.path, "directory");
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                New Folder
              </button>
              <hr className="my-1 border-gray-200 dark:border-gray-700" />
            </>
          )}

          <button
            onClick={() => handleRename(contextMenu.file)}
            className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Rename
          </button>

          {onFileDownload && contextMenu.file.type === "file" && (
            <button
              onClick={() => {
                onFileDownload(contextMenu.file.path);
                setContextMenu(null);
              }}
              className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Download
            </button>
          )}

          <button
            onClick={() => {
              onFileDelete(contextMenu.file.path);
              setContextMenu(null);
            }}
            className="w-full px-3 py-1.5 text-left text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Delete
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileUpload}
        className="hidden"
      />
    </div>
  );
};

// Mock data for display
export const mockFileTree: FileNode[] = [
  {
    id: "1",
    name: "src",
    type: "directory",
    path: "/src",
    modifiedAt: new Date(),
    children: [
      {
        id: "2",
        name: "components",
        type: "directory",
        path: "/src/components",
        modifiedAt: new Date(),
        children: [
          {
            id: "3",
            name: "Button.tsx",
            type: "file",
            path: "/src/components/Button.tsx",
            size: 2456,
            modifiedAt: new Date(),
            gitStatus: "modified",
          },
          {
            id: "4",
            name: "Card.tsx",
            type: "file",
            path: "/src/components/Card.tsx",
            size: 1890,
            modifiedAt: new Date(),
          },
        ],
      },
      {
        id: "5",
        name: "App.tsx",
        type: "file",
        path: "/src/App.tsx",
        size: 3421,
        modifiedAt: new Date(),
        gitStatus: "added",
      },
    ],
  },
  {
    id: "6",
    name: "package.json",
    type: "file",
    path: "/package.json",
    size: 1245,
    modifiedAt: new Date(),
  },
];

export default FileExplorer;
