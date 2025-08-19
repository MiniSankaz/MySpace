"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Clock, Folder, Loader2 } from "lucide-react";
import ProjectIcon from "./ProjectIcon";
import { Project } from "@/types/project";

interface ProjectListProps {
  projects: Project[];
  pinnedProjects: Project[];
  recentProjects: Project[];
  currentProject: Project | null;
  isCollapsed: boolean;
  viewMode: "grid" | "list";
  loading: boolean;
  onProjectSelect: (project: Project) => void;
  onPinToggle: (project: Project) => void;
}

const ProjectList: React.FC<ProjectListProps> = ({
  projects,
  pinnedProjects,
  recentProjects,
  currentProject,
  isCollapsed,
  viewMode,
  loading,
  onProjectSelect,
  onPinToggle,
}) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-gray-500">
        <Folder className="w-12 h-12 mb-2" />
        {!isCollapsed && (
          <>
            <p className="text-sm font-medium">No projects found</p>
            <p className="text-xs mt-1">Create a new project to get started</p>
          </>
        )}
      </div>
    );
  }

  // Collapsed view - icons only
  if (isCollapsed) {
    return (
      <div className="p-2 space-y-2">
        {projects.slice(0, 15).map((project) => (
          <motion.div
            key={project.id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="relative"
          >
            <button
              onClick={() => onProjectSelect(project)}
              className={`w-full p-2 rounded-lg transition-all ${
                currentProject?.id === project.id
                  ? "bg-blue-500/20 border border-blue-500/30"
                  : "hover:bg-gray-700/50"
              }`}
              title={project.name}
            >
              <ProjectIcon project={project} size={28} showStatus={false} />
              {project.preferences?.isPinned && (
                <Star className="absolute top-1 right-1 w-3 h-3 text-yellow-400 fill-yellow-400" />
              )}
            </button>
          </motion.div>
        ))}
      </div>
    );
  }

  // Expanded view
  return (
    <div className="p-3 space-y-4">
      {/* Pinned Projects */}
      {pinnedProjects.length > 0 && (
        <div>
          <div className="flex items-center space-x-2 px-2 mb-2">
            <Star className="w-4 h-4 text-yellow-400" />
            <span className="text-xs font-medium text-gray-400 uppercase">
              Pinned
            </span>
          </div>
          <ProjectSection
            projects={pinnedProjects}
            currentProject={currentProject}
            viewMode={viewMode}
            onProjectSelect={onProjectSelect}
            onPinToggle={onPinToggle}
            showPin={true}
          />
        </div>
      )}

      {/* Recent Projects */}
      {recentProjects.length > 0 && (
        <div>
          <div className="flex items-center space-x-2 px-2 mb-2">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-medium text-gray-400 uppercase">
              Recent
            </span>
          </div>
          <ProjectSection
            projects={recentProjects}
            currentProject={currentProject}
            viewMode={viewMode}
            onProjectSelect={onProjectSelect}
            onPinToggle={onPinToggle}
            showPin={true}
          />
        </div>
      )}

      {/* All Projects */}
      {projects.length > pinnedProjects.length + recentProjects.length && (
        <div>
          <div className="flex items-center space-x-2 px-2 mb-2">
            <Folder className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-medium text-gray-400 uppercase">
              All Projects
            </span>
          </div>
          <ProjectSection
            projects={projects.filter(
              (p) => !pinnedProjects.includes(p) && !recentProjects.includes(p),
            )}
            currentProject={currentProject}
            viewMode={viewMode}
            onProjectSelect={onProjectSelect}
            onPinToggle={onPinToggle}
            showPin={true}
          />
        </div>
      )}
    </div>
  );
};

interface ProjectSectionProps {
  projects: Project[];
  currentProject: Project | null;
  viewMode: "grid" | "list";
  onProjectSelect: (project: Project) => void;
  onPinToggle: (project: Project) => void;
  showPin?: boolean;
}

const ProjectSection: React.FC<ProjectSectionProps> = ({
  projects,
  currentProject,
  viewMode,
  onProjectSelect,
  onPinToggle,
  showPin = false,
}) => {
  if (viewMode === "grid") {
    return (
      <div className="grid grid-cols-3 gap-2">
        {projects.map((project) => (
          <motion.div
            key={project.id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="relative"
          >
            <button
              onClick={() => onProjectSelect(project)}
              onContextMenu={(e) => {
                e.preventDefault();
                onPinToggle(project);
              }}
              className={`w-full p-3 rounded-lg transition-all ${
                currentProject?.id === project.id
                  ? "bg-blue-500/20 border border-blue-500/30"
                  : "hover:bg-gray-700/50"
              }`}
            >
              <ProjectIcon project={project} size={32} showStatus={true} />
              <p className="text-xs text-gray-300 mt-1 truncate">
                {project.name}
              </p>
              {showPin && project.preferences?.isPinned && (
                <Star className="absolute top-1 right-1 w-3 h-3 text-yellow-400 fill-yellow-400" />
              )}
            </button>
          </motion.div>
        ))}
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-1">
      {projects.map((project) => (
        <motion.div
          key={project.id}
          whileHover={{ x: 2 }}
          whileTap={{ scale: 0.98 }}
        >
          <button
            onClick={() => onProjectSelect(project)}
            onContextMenu={(e) => {
              e.preventDefault();
              onPinToggle(project);
            }}
            className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-all ${
              currentProject?.id === project.id
                ? "bg-blue-500/20 border border-blue-500/30"
                : "hover:bg-gray-700/50"
            }`}
          >
            <ProjectIcon project={project} size={24} showStatus={true} />
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-gray-200 truncate">
                {project.name}
              </p>
              {project.description && (
                <p className="text-xs text-gray-500 truncate">
                  {project.description}
                </p>
              )}
            </div>
            {showPin && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPinToggle(project);
                }}
                className="p-1 hover:bg-gray-600/50 rounded transition-colors"
              >
                <Star
                  className={`w-4 h-4 ${
                    project.preferences?.isPinned
                      ? "text-yellow-400 fill-yellow-400"
                      : "text-gray-500"
                  }`}
                />
              </button>
            )}
          </button>
        </motion.div>
      ))}
    </div>
  );
};

export default ProjectList;
