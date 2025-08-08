import { promises as fs } from 'fs';
import path from 'path';
import { FileNode } from '../types';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class FilesystemService {
  async scanDirectory(dirPath: string, maxDepth: number = 3): Promise<FileNode[]> {
    try {
      const structure = await this.scanDirectoryRecursive(dirPath, dirPath, 0, maxDepth);
      return structure;
    } catch (error) {
      console.error('Error scanning directory:', error);
      throw error;
    }
  }

  private async scanDirectoryRecursive(
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

    const ignoredDirs = [
      'node_modules',
      '.git',
      'dist',
      'build',
      '.next',
      'coverage',
      '.vscode',
      '.idea',
      '__pycache__',
      '.pytest_cache',
      'venv',
      'env',
    ];
    
    const ignoredFiles = [
      '.DS_Store',
      'Thumbs.db',
      '*.pyc',
      '*.pyo',
      '*.swp',
      '*.swo',
      '.env.local',
      '.env.production',
    ];

    for (const item of items) {
      // Skip ignored items
      if (ignoredDirs.includes(item.name)) continue;
      if (ignoredFiles.some(pattern => this.matchPattern(item.name, pattern))) continue;

      const itemPath = path.join(dirPath, item.name);
      const relativePath = path.relative(basePath, itemPath);

      if (item.isDirectory()) {
        const children = await this.scanDirectoryRecursive(
          itemPath,
          basePath,
          currentDepth + 1,
          maxDepth
        );
        
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

  private matchPattern(filename: string, pattern: string): boolean {
    if (pattern.startsWith('*')) {
      return filename.endsWith(pattern.slice(1));
    }
    return filename === pattern;
  }

  async readFile(filePath: string): Promise<string> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return content;
    } catch (error) {
      console.error('Error reading file:', error);
      throw error;
    }
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    try {
      await fs.writeFile(filePath, content, 'utf-8');
    } catch (error) {
      console.error('Error writing file:', error);
      throw error;
    }
  }

  async createDirectory(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      console.error('Error creating directory:', error);
      throw error;
    }
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }

  async deleteDirectory(dirPath: string): Promise<void> {
    try {
      await fs.rmdir(dirPath, { recursive: true });
    } catch (error) {
      console.error('Error deleting directory:', error);
      throw error;
    }
  }

  async exists(path: string): Promise<boolean> {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  async getFileStats(filePath: string): Promise<any> {
    try {
      const stats = await fs.stat(filePath);
      return {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        isDirectory: stats.isDirectory(),
        isFile: stats.isFile(),
      };
    } catch (error) {
      console.error('Error getting file stats:', error);
      throw error;
    }
  }

  async searchFiles(
    dirPath: string,
    pattern: string,
    maxResults: number = 100
  ): Promise<string[]> {
    const results: string[] = [];
    
    async function search(currentPath: string): Promise<void> {
      if (results.length >= maxResults) return;

      const items = await fs.readdir(currentPath, { withFileTypes: true });
      
      for (const item of items) {
        if (results.length >= maxResults) break;
        
        const itemPath = path.join(currentPath, item.name);
        
        if (item.name.includes(pattern)) {
          results.push(itemPath);
        }
        
        if (item.isDirectory() && !['node_modules', '.git', 'dist'].includes(item.name)) {
          await search(itemPath);
        }
      }
    }

    await search(dirPath);
    return results;
  }

  async getGitStatus(projectPath: string): Promise<string> {
    try {
      const { stdout } = await execAsync('git status --short', { cwd: projectPath });
      return stdout;
    } catch (error) {
      return '';
    }
  }

  async getGitBranch(projectPath: string): Promise<string> {
    try {
      const { stdout } = await execAsync('git branch --show-current', { cwd: projectPath });
      return stdout.trim();
    } catch (error) {
      return 'main';
    }
  }

  async getProjectInfo(projectPath: string): Promise<any> {
    const info: any = {
      path: projectPath,
      exists: await this.exists(projectPath),
    };

    if (info.exists) {
      // Check for package.json
      const packageJsonPath = path.join(projectPath, 'package.json');
      if (await this.exists(packageJsonPath)) {
        try {
          const packageContent = await this.readFile(packageJsonPath);
          const packageJson = JSON.parse(packageContent);
          info.type = 'node';
          info.name = packageJson.name;
          info.version = packageJson.version;
          info.scripts = packageJson.scripts || {};
        } catch (error) {
          console.error('Error reading package.json:', error);
        }
      }

      // Check for Python project
      const requirementsPath = path.join(projectPath, 'requirements.txt');
      if (await this.exists(requirementsPath)) {
        info.type = info.type ? `${info.type},python` : 'python';
      }

      // Get git info
      info.gitBranch = await this.getGitBranch(projectPath);
      info.gitStatus = await this.getGitStatus(projectPath);
    }

    return info;
  }
}

export const filesystemService = new FilesystemService();