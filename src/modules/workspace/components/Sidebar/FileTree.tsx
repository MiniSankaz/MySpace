"use client";

import React, { useState } from "react";
import { FileNode } from "../../types";

interface FileTreeProps {
  nodes: FileNode[];
  level?: number;
  onNodeClick?: (node: FileNode) => void;
}

const FileTree: React.FC<FileTreeProps> = ({
  nodes,
  level = 0,
  onNodeClick,
}) => {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpand = (path: string) => {
    const newExpanded = new Set(expanded);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpanded(newExpanded);
  };

  const getFileIcon = (node: FileNode) => {
    if (node.type === "directory") {
      return expanded.has(node.path) ? "📂" : "📁";
    }

    // File icons based on extension
    const ext = node.extension?.toLowerCase();
    switch (ext) {
      case ".js":
      case ".jsx":
        return "📜";
      case ".ts":
      case ".tsx":
        return "🔷";
      case ".json":
        return "📋";
      case ".md":
        return "📝";
      case ".css":
      case ".scss":
        return "🎨";
      case ".html":
        return "🌐";
      case ".png":
      case ".jpg":
      case ".gif":
        return "🖼️";
      default:
        return "📄";
    }
  };

  return (
    <div>
      {nodes.map((node) => (
        <div key={node.path}>
          <div
            className={`flex items-center py-1 px-2 hover:bg-gray-700 rounded cursor-pointer text-sm`}
            style={{ paddingLeft: `${level * 16 + 8}px` }}
            onClick={() => {
              if (node.type === "directory") {
                toggleExpand(node.path);
              }
              onNodeClick?.(node);
            }}
          >
            <span className="mr-2 text-base">{getFileIcon(node)}</span>
            <span className="text-gray-300">{node.name}</span>
            {node.size && (
              <span className="ml-auto text-xs text-gray-500">
                {formatFileSize(node.size)}
              </span>
            )}
          </div>
          {node.type === "directory" &&
            node.children &&
            expanded.has(node.path) && (
              <FileTree
                nodes={node.children}
                level={level + 1}
                onNodeClick={onNodeClick}
              />
            )}
        </div>
      ))}
    </div>
  );
};

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export default FileTree;
