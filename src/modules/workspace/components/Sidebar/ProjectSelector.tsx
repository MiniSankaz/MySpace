'use client';

import React, { useState } from 'react';
import { Project, CreateProjectDTO } from '../../types';
import { useWorkspace } from '../../contexts/WorkspaceContext';

const ProjectSelector: React.FC = () => {
  const {
    projects,
    currentProject,
    selectProject,
    createProject,
    deleteProject,
    loading,
  } = useWorkspace();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProject, setNewProject] = useState<CreateProjectDTO>({
    name: '',
    description: '',
    path: '',
  });

  const handleCreateProject = async () => {
    if (!newProject.name || !newProject.path) return;

    try {
      await createProject(newProject);
      setShowCreateModal(false);
      setNewProject({ name: '', description: '', path: '' });
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  return (
    <div>
      {/* Project Dropdown */}
      <div className="flex items-center space-x-2">
        <select
          value={currentProject?.id || ''}
          onChange={(e) => selectProject(e.target.value)}
          className="flex-1 bg-gray-700 text-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={loading}
        >
          <option value="">Select a project</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>

        {/* Create Button */}
        <button
          onClick={() => setShowCreateModal(true)}
          className="p-2 bg-blue-600 hover:bg-blue-700 rounded text-white transition-colors"
          title="Create new project"
        >
          <svg
            className="w-5 h-5"
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

        {/* Delete Button */}
        {currentProject && (
          <button
            onClick={() => {
              if (confirm(`Delete project "${currentProject.name}"?`)) {
                deleteProject(currentProject.id);
              }
            }}
            className="p-2 bg-red-600 hover:bg-red-700 rounded text-white transition-colors"
            title="Delete project"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-96">
            <h2 className="text-xl font-semibold mb-4">Create New Project</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  value={newProject.name}
                  onChange={(e) =>
                    setNewProject({ ...newProject, name: e.target.value })
                  }
                  className="w-full bg-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="My Project"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <input
                  type="text"
                  value={newProject.description}
                  onChange={(e) =>
                    setNewProject({ ...newProject, description: e.target.value })
                  }
                  className="w-full bg-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Project description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Path</label>
                <input
                  type="text"
                  value={newProject.path}
                  onChange={(e) =>
                    setNewProject({ ...newProject, path: e.target.value })
                  }
                  className="w-full bg-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="/path/to/project"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateProject}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm transition-colors"
                disabled={!newProject.name || !newProject.path}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectSelector;