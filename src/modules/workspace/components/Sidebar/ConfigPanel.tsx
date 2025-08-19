"use client";

import React, { useState, useEffect } from "react";
import { Project, Script } from "../../types";
import { useWorkspace } from "../../contexts/WorkspaceContext";
import FileTree from "./FileTree";
import GitConfig from "@/components/GitConfig";

interface ConfigPanelProps {
  project: Project;
}

const ConfigPanel: React.FC<ConfigPanelProps> = ({ project }) => {
  const { updateProject, refreshProjectStructure } = useWorkspace();
  const [activeTab, setActiveTab] = useState<"overview" | "git" | "scripts">(
    "overview",
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: project.name,
    description: project.description,
    path: project.path,
  });

  // Update form when project changes
  useEffect(() => {
    setEditForm({
      name: project.name,
      description: project.description,
      path: project.path,
    });
    setIsEditing(false);
  }, [project.id]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshProjectStructure(project.id);
    } catch (error) {
      console.error("Failed to refresh structure:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSaveEdit = async () => {
    try {
      await updateProject(project.id, editForm);
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update project:", error);
    }
  };

  const handleCancelEdit = () => {
    setEditForm({
      name: project.name,
      description: project.description,
      path: project.path,
    });
    setIsEditing(false);
  };

  const handleAddScript = () => {
    const name = prompt("Script name:");
    const command = prompt("Script command:");

    if (name && command) {
      const newScript: Script = {
        id: `script_${Date.now()}`,
        name,
        command,
        description: "",
      };

      updateProject(project.id, {
        scripts: [...project.scripts, newScript],
      });
    }
  };

  const handleRemoveScript = (scriptId: string) => {
    updateProject(project.id, {
      scripts: project.scripts.filter((s) => s.id !== scriptId),
    });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "overview"
              ? "text-blue-400 border-b-2 border-blue-400"
              : "text-gray-400 hover:text-gray-300"
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab("git")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "git"
              ? "text-blue-400 border-b-2 border-blue-400"
              : "text-gray-400 hover:text-gray-300"
          }`}
        >
          Git Config
        </button>
        <button
          onClick={() => setActiveTab("scripts")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "scripts"
              ? "text-blue-400 border-b-2 border-blue-400"
              : "text-gray-400 hover:text-gray-300"
          }`}
        >
          Scripts
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === "overview" && (
          <div>
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-400">
                  Project Info
                </h3>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="p-1 text-gray-400 hover:text-gray-300 transition-colors"
                  title={isEditing ? "Cancel edit" : "Edit project info"}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    {isEditing ? (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    ) : (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    )}
                  </svg>
                </button>
              </div>

              {isEditing ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) =>
                        setEditForm({ ...editForm, name: e.target.value })
                      }
                      className="w-full bg-gray-800 text-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Description
                    </label>
                    <textarea
                      value={editForm.description}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          description: e.target.value,
                        })
                      }
                      className="w-full bg-gray-800 text-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                      rows={2}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Path
                    </label>
                    <input
                      type="text"
                      value={editForm.path}
                      onChange={(e) =>
                        setEditForm({ ...editForm, path: e.target.value })
                      }
                      className="w-full bg-gray-800 text-gray-300 rounded px-2 py-1 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={handleSaveEdit}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-500">Name:</span>{" "}
                    <span className="text-gray-300">{project.name}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Path:</span>{" "}
                    <span className="text-gray-300 font-mono text-xs">
                      {project.path}
                    </span>
                  </div>
                  {project.description && (
                    <div>
                      <span className="text-gray-500">Description:</span>{" "}
                      <span className="text-gray-300">
                        {project.description}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "git" && (
          <GitConfig projectPath={project.path} projectId={project.id} />
        )}

        {activeTab === "scripts" && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-400">Scripts</h3>
              <button
                onClick={handleAddScript}
                className="p-1 text-gray-400 hover:text-gray-300 transition-colors"
                title="Add script"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </button>
            </div>
            <div className="space-y-2">
              {project.scripts.length === 0 ? (
                <p className="text-sm text-gray-500">No scripts defined</p>
              ) : (
                project.scripts.map((script) => (
                  <div
                    key={script.id}
                    className="bg-gray-800 rounded p-3 hover:bg-gray-750 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-300">
                          {script.name}
                        </h4>
                        <code className="text-xs text-gray-400 font-mono block mt-1">
                          {script.command}
                        </code>
                        {script.description && (
                          <p className="text-xs text-gray-500 mt-1">
                            {script.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          className="p-1 text-gray-500 hover:text-green-400 transition-colors"
                          title="Run script"
                          onClick={() => {
                            // TODO: Execute script in terminal
                            console.log("Run script:", script.command);
                          }}
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleRemoveScript(script.id)}
                          className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConfigPanel;
