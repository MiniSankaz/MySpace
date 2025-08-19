/**
 * Workspace Service
 */
import apiClient from "./gateway.client";

export interface FileInfo {
  name: string;
  path: string;
  type: "file" | "directory";
  size: number;
  modifiedAt: Date;
}

export interface GitStatus {
  branch: string;
  ahead: number;
  behind: number;
  staged: string[];
  modified: string[];
  untracked: string[];
}

class WorkspaceService {
  async listFiles(path: string = ""): Promise<FileInfo[]> {
    const response = await apiClient.get<FileInfo[]>(
      `/workspace/files?path=${path}`,
    );
    return response.data || [];
  }

  async readFile(path: string): Promise<string> {
    const response = await apiClient.get<{ content: string }>(
      `/workspace/files/${path}`,
    );
    return response.data?.content || "";
  }

  async writeFile(path: string, content: string): Promise<void> {
    await apiClient.put(`/workspace/files/${path}`, { content });
  }

  async getGitStatus(): Promise<GitStatus> {
    const response = await apiClient.get<GitStatus>("/workspace/git/status");
    return response.data!;
  }

  async gitCommit(message: string): Promise<void> {
    await apiClient.post("/workspace/git/commit", { message });
  }
}

export default new WorkspaceService();
