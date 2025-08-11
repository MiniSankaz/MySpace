import { promises as fs } from 'fs';
import path from 'path';
import { Project, FileNode, CreateProjectDTO, UpdateProjectDTO, Script } from '../types';
import prisma from '@/core/database/prisma';

export class ProjectService {
  async createProject(data: CreateProjectDTO): Promise<Project> {
    const structure = await this.scanProjectStructure(data.path);
    
    const project = await prisma.project.create({
      data: {
        name: data.name,
        description: data.description,
        path: data.path,
        structure: structure as any,
        envVariables: {},
        scripts: [],
        settings: {
          theme: 'dark',
          fontSize: 14,
          fontFamily: 'monospace',
          terminalHeight: 50,
          autoSave: true,
          autoReconnect: true,
        },
      },
    });

    return this.formatProject(project);
  }

  async getProjects(): Promise<Project[]> {
    const projects = await prisma.project.findMany({
      orderBy: { updatedAt: 'desc' },
    });

    return projects.map(this.formatProject);
  }

  async getProject(id: string): Promise<Project | null> {
    const project = await prisma.project.findUnique({
      where: { id },
    });

    return project ? this.formatProject(project) : null;
  }

  async updateProject(id: string, data: UpdateProjectDTO): Promise<Project> {
    const updateData: any = { ...data, updatedAt: new Date() };
    
    // Convert TypeScript objects to JSON for Prisma
    if (data.scripts) {
      updateData.scripts = data.scripts as any;
    }
    if (data.envVariables) {
      updateData.envVariables = data.envVariables as any;
    }
    if (data.settings) {
      updateData.settings = data.settings as any;
    }

    const project = await prisma.project.update({
      where: { id },
      data: updateData,
    });

    return this.formatProject(project);
  }

  async deleteProject(id: string): Promise<void> {
    await prisma.project.delete({
      where: { id },
    });
  }

  async scanProjectStructure(projectPath: string, maxDepth: number = 3): Promise<FileNode[]> {
    try {
      const structure = await this.scanDirectory(projectPath, projectPath, 0, maxDepth);
      return structure;
    } catch (error) {
      console.error('Error scanning project structure:', error);
      return [];
    }
  }

  private async scanDirectory(
    dirPath: string,
    basePath: string,
    currentDepth: number,
    maxDepth: number
  ): Promise<FileNode[]> {
    if (currentDepth >= maxDepth) {
      return [];
    }

    const items = await fs.readdir(dirPath, { withFileTypes: true });
    const nodes: FileNode[] = [];

    const ignoredDirs = ['node_modules', '.git', 'dist', 'build', '.next', 'coverage'];
    const ignoredFiles = ['.DS_Store', 'Thumbs.db'];

    for (const item of items) {
      if (ignoredDirs.includes(item.name) || ignoredFiles.includes(item.name)) {
        continue;
      }

      const itemPath = path.join(dirPath, item.name);
      const relativePath = path.relative(basePath, itemPath);

      if (item.isDirectory()) {
        const children = await this.scanDirectory(itemPath, basePath, currentDepth + 1, maxDepth);
        nodes.push({
          name: item.name,
          type: 'directory',
          path: relativePath,
          children,
        });
      } else {
        const stats = await fs.stat(itemPath);
        nodes.push({
          name: item.name,
          type: 'file',
          path: relativePath,
          size: stats.size,
          extension: path.extname(item.name),
        });
      }
    }

    return nodes.sort((a, b) => {
      if (a.type === b.type) {
        return a.name.localeCompare(b.name);
      }
      return a.type === 'directory' ? -1 : 1;
    });
  }

  async refreshProjectStructure(id: string): Promise<Project> {
    const project = await this.getProject(id);
    if (!project) {
      throw new Error('Project not found');
    }

    const structure = await this.scanProjectStructure(project.path);
    
    const updated = await prisma.project.update({
      where: { id },
      data: {
        structure: structure as any,
        updatedAt: new Date(),
      },
    });

    return this.formatProject(updated);
  }

  async addScript(projectId: string, script: Omit<Script, 'id'>): Promise<Project> {
    const project = await this.getProject(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const newScript = {
      id: `script_${Date.now()}`,
      ...script,
    };

    const scripts = [...project.scripts, newScript];

    return this.updateProject(projectId, { scripts });
  }

  async removeScript(projectId: string, scriptId: string): Promise<Project> {
    const project = await this.getProject(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const scripts = project.scripts.filter(s => s.id !== scriptId);
    return this.updateProject(projectId, { scripts });
  }

  async updateEnvVariables(
    projectId: string,
    envVariables: Record<string, string>
  ): Promise<Project> {
    return this.updateProject(projectId, { envVariables });
  }

  async exportProject(id: string): Promise<string> {
    const project = await this.getProject(id);
    if (!project) {
      throw new Error('Project not found');
    }

    const exportData = {
      ...project,
      exportedAt: new Date(),
      version: '1.0.0',
    };

    return JSON.stringify(exportData, null, 2);
  }

  async importProject(jsonData: string): Promise<Project> {
    const data = JSON.parse(jsonData);
    
    const { id, createdAt, updatedAt, exportedAt, version, ...projectData } = data;

    return this.createProject({
      name: `${projectData.name} (Imported)`,
      description: projectData.description,
      path: projectData.path,
    });
  }

  private formatProject(project: any): Project {
    return {
      ...project,
      structure: project.structure || [],
      envVariables: project.envVariables || {},
      scripts: project.scripts || [],
      settings: project.settings || {},
      createdAt: new Date(project.createdAt),
      updatedAt: new Date(project.updatedAt),
    };
  }
}

export const projectService = new ProjectService();