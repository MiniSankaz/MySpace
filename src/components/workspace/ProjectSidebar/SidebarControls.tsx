"use client";

import React from "react";
import {
  Grid3X3,
  List,
  Search,
  RefreshCw,
  SortAsc,
  Clock,
  Star,
} from "lucide-react";

interface SidebarControlsProps {
  viewMode: "grid" | "list";
  sortBy: "name" | "lastAccessed" | "custom";
  onViewModeChange: (mode: "grid" | "list") => void;
  onSortChange: (sort: "name" | "lastAccessed" | "custom") => void;
  onSearchClick: () => void;
  onRefresh: () => void;
}

const SidebarControls: React.FC<SidebarControlsProps> = ({
  viewMode,
  sortBy,
  onViewModeChange,
  onSortChange,
  onSearchClick,
  onRefresh,
}) => {
  return (
    <div className="flex items-center justify-between p-2 border-b border-gray-700/50">
      {/* View Mode */}
      <div className="flex items-center space-x-1">
        <button
          onClick={() => onViewModeChange("grid")}
          className={`p-1.5 rounded transition-colors ${
            viewMode === "grid"
              ? "bg-gray-700 text-blue-400"
              : "hover:bg-gray-700/50 text-gray-400"
          }`}
          title="Grid view"
        >
          <Grid3X3 className="w-4 h-4" />
        </button>
        <button
          onClick={() => onViewModeChange("list")}
          className={`p-1.5 rounded transition-colors ${
            viewMode === "list"
              ? "bg-gray-700 text-blue-400"
              : "hover:bg-gray-700/50 text-gray-400"
          }`}
          title="List view"
        >
          <List className="w-4 h-4" />
        </button>
      </div>

      {/* Sort Options */}
      <div className="flex items-center space-x-1">
        <button
          onClick={() => onSortChange("name")}
          className={`p-1.5 rounded transition-colors ${
            sortBy === "name"
              ? "bg-gray-700 text-blue-400"
              : "hover:bg-gray-700/50 text-gray-400"
          }`}
          title="Sort by name"
        >
          <SortAsc className="w-4 h-4" />
        </button>
        <button
          onClick={() => onSortChange("lastAccessed")}
          className={`p-1.5 rounded transition-colors ${
            sortBy === "lastAccessed"
              ? "bg-gray-700 text-blue-400"
              : "hover:bg-gray-700/50 text-gray-400"
          }`}
          title="Sort by last accessed"
        >
          <Clock className="w-4 h-4" />
        </button>
      </div>

      {/* Actions */}
      <div className="flex items-center space-x-1">
        <button
          onClick={onSearchClick}
          className="p-1.5 rounded hover:bg-gray-700/50 text-gray-400 transition-colors"
          title="Search projects"
        >
          <Search className="w-4 h-4" />
        </button>
        <button
          onClick={onRefresh}
          className="p-1.5 rounded hover:bg-gray-700/50 text-gray-400 transition-colors"
          title="Refresh projects"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default SidebarControls;
