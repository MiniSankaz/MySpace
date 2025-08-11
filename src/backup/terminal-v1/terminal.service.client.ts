// Client-side terminal service (ใช้ WebSocket)
import { EventEmitter } from 'events';
import { TerminalSession, TerminalCommand } from '../types';

export class ClientTerminalService extends EventEmitter {
  private baseUrl = '/api/workspace/terminal';

  async createSession(
    projectId: string,
    type: 'system' | 'claude',
    tabName: string
  ): Promise<TerminalSession> {
    const response = await fetch(`${this.baseUrl}/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, type, tabName }),
    });

    if (!response.ok) {
      throw new Error('Failed to create terminal session');
    }

    return response.json();
  }

  async getSession(sessionId: string): Promise<TerminalSession | null> {
    const response = await fetch(`${this.baseUrl}/session/${sessionId}`);
    
    if (!response.ok) {
      return null;
    }

    return response.json();
  }

  async closeSession(sessionId: string): Promise<void> {
    await fetch(`${this.baseUrl}/session/${sessionId}`, {
      method: 'DELETE',
    });
  }

  async getCommandHistory(sessionId: string, limit = 100): Promise<TerminalCommand[]> {
    const response = await fetch(
      `${this.baseUrl}/session/${sessionId}/history?limit=${limit}`
    );

    if (!response.ok) {
      return [];
    }

    return response.json();
  }

  async executeCommand(sessionId: string, command: string): Promise<void> {
    await fetch(`${this.baseUrl}/session/${sessionId}/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command }),
    });
  }
}

export const clientTerminalService = new ClientTerminalService();