/**
 * Terminal Service
 */
import apiClient from "./gateway.client";

export interface TerminalSession {
  id: string;
  projectId: string;
  userId: string;
  status: "active" | "idle" | "closed";
  createdAt: Date;
}

class TerminalService {
  async createSession(projectId: string): Promise<TerminalSession> {
    const response = await apiClient.post<TerminalSession>(
      "/terminals/create",
      { projectId },
    );
    return response.data!;
  }

  async getSessions(): Promise<TerminalSession[]> {
    const response = await apiClient.get<TerminalSession[]>("/terminals");
    return response.data || [];
  }

  async closeSession(sessionId: string): Promise<void> {
    await apiClient.delete(`/terminals/${sessionId}`);
  }

  async writeToTerminal(sessionId: string, data: string): Promise<void> {
    await apiClient.post(`/terminals/${sessionId}/write`, { data });
  }

  async resizeTerminal(
    sessionId: string,
    cols: number,
    rows: number,
  ): Promise<void> {
    await apiClient.post(`/terminals/${sessionId}/resize`, { cols, rows });
  }
}

export default new TerminalService();
