#!/bin/bash

echo "🚀 Creating API Service Layer..."

# Create directories
mkdir -p src/services/api
mkdir -p src/services/websocket
mkdir -p src/services/utils
mkdir -p src/hooks/api
mkdir -p src/hooks/websocket
mkdir -p src/hooks/ui
mkdir -p src/store

# Create AI Service
cat > src/services/api/ai.service.ts << 'EOF'
/**
 * AI Assistant Service
 */
import apiClient from './gateway.client';

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  model: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

class AIService {
  async createSession(model: string = 'claude-3-sonnet'): Promise<ChatSession> {
    const response = await apiClient.post<ChatSession>('/chat/sessions', { model });
    return response.data!;
  }

  async getSessions(): Promise<ChatSession[]> {
    const response = await apiClient.get<ChatSession[]>('/chat/sessions');
    return response.data || [];
  }

  async sendMessage(sessionId: string, content: string): Promise<ChatMessage> {
    const response = await apiClient.post<ChatMessage>('/chat/message', {
      sessionId,
      content
    });
    return response.data!;
  }

  async getModels(): Promise<string[]> {
    const response = await apiClient.get<string[]>('/chat/models');
    return response.data || [];
  }
}

export default new AIService();
EOF

# Create Portfolio Service
cat > src/services/api/portfolio.service.ts << 'EOF'
/**
 * Portfolio Service
 */
import apiClient from './gateway.client';

export interface Portfolio {
  id: string;
  name: string;
  totalValue: number;
  totalCost: number;
  totalGainLoss: number;
  positions: Position[];
}

export interface Position {
  id: string;
  symbol: string;
  name: string;
  quantity: number;
  avgCost: number;
  currentPrice: number;
  value: number;
  gainLoss: number;
}

export interface Trade {
  id: string;
  portfolioId: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  timestamp: Date;
}

class PortfolioService {
  async getPortfolios(): Promise<Portfolio[]> {
    const response = await apiClient.get<Portfolio[]>('/portfolios');
    return response.data || [];
  }

  async getPortfolio(id: string): Promise<Portfolio> {
    const response = await apiClient.get<Portfolio>(`/portfolios/${id}`);
    return response.data!;
  }

  async createTrade(trade: Omit<Trade, 'id' | 'timestamp'>): Promise<Trade> {
    const response = await apiClient.post<Trade>('/trades', trade);
    return response.data!;
  }

  async getStockPrice(symbol: string): Promise<{ symbol: string; price: number }> {
    const response = await apiClient.get<{ symbol: string; price: number }>(`/stocks/${symbol}/price`);
    return response.data!;
  }
}

export default new PortfolioService();
EOF

# Create Terminal Service
cat > src/services/api/terminal.service.ts << 'EOF'
/**
 * Terminal Service
 */
import apiClient from './gateway.client';

export interface TerminalSession {
  id: string;
  projectId: string;
  userId: string;
  status: 'active' | 'idle' | 'closed';
  createdAt: Date;
}

class TerminalService {
  async createSession(projectId: string): Promise<TerminalSession> {
    const response = await apiClient.post<TerminalSession>('/terminals/create', { projectId });
    return response.data!;
  }

  async getSessions(): Promise<TerminalSession[]> {
    const response = await apiClient.get<TerminalSession[]>('/terminals');
    return response.data || [];
  }

  async closeSession(sessionId: string): Promise<void> {
    await apiClient.delete(`/terminals/${sessionId}`);
  }

  async writeToTerminal(sessionId: string, data: string): Promise<void> {
    await apiClient.post(`/terminals/${sessionId}/write`, { data });
  }

  async resizeTerminal(sessionId: string, cols: number, rows: number): Promise<void> {
    await apiClient.post(`/terminals/${sessionId}/resize`, { cols, rows });
  }
}

export default new TerminalService();
EOF

# Create Workspace Service
cat > src/services/api/workspace.service.ts << 'EOF'
/**
 * Workspace Service
 */
import apiClient from './gateway.client';

export interface FileInfo {
  name: string;
  path: string;
  type: 'file' | 'directory';
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
  async listFiles(path: string = ''): Promise<FileInfo[]> {
    const response = await apiClient.get<FileInfo[]>(`/workspace/files?path=${path}`);
    return response.data || [];
  }

  async readFile(path: string): Promise<string> {
    const response = await apiClient.get<{ content: string }>(`/workspace/files/${path}`);
    return response.data?.content || '';
  }

  async writeFile(path: string, content: string): Promise<void> {
    await apiClient.put(`/workspace/files/${path}`, { content });
  }

  async getGitStatus(): Promise<GitStatus> {
    const response = await apiClient.get<GitStatus>('/workspace/git/status');
    return response.data!;
  }

  async gitCommit(message: string): Promise<void> {
    await apiClient.post('/workspace/git/commit', { message });
  }
}

export default new WorkspaceService();
EOF

# Create WebSocket Client
cat > src/services/websocket/ws.client.ts << 'EOF'
/**
 * WebSocket Base Client
 */
export class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private listeners = new Map<string, Set<Function>>();

  constructor(url: string) {
    this.url = url;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        resolve();
      };

      this.ws.onerror = (error) => {
        reject(error);
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.emit(data.type || 'message', data);
        } catch (error) {
          console.error('WebSocket message parse error:', error);
        }
      };

      this.ws.onclose = () => {
        this.handleReconnect();
      };
    });
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        this.connect();
      }, 1000 * this.reconnectAttempts);
    }
  }

  send(data: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  on(event: string, listener: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
  }

  off(event: string, listener: Function): void {
    this.listeners.get(event)?.delete(listener);
  }

  private emit(event: string, data: any): void {
    this.listeners.get(event)?.forEach(listener => listener(data));
  }

  disconnect(): void {
    this.ws?.close();
    this.ws = null;
  }
}
EOF

# Create custom hooks
cat > src/hooks/api/useAuth.ts << 'EOF'
/**
 * Authentication Hook
 */
import { useState, useEffect } from 'react';
import authService from '@/services/api/auth.service';

export function useAuth() {
  const [user, setUser] = useState(authService.getStoredUser());
  const [isAuthenticated, setIsAuthenticated] = useState(authService.isAuthenticated());
  const [loading, setLoading] = useState(false);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const response = await authService.login({ email, password });
      setUser(response.user);
      setIsAuthenticated(true);
      return response;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await authService.logout();
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    isAuthenticated,
    loading,
    login,
    logout
  };
}
EOF

echo "✅ API Service Layer created successfully!"
echo "📁 Created services in /src/services/"
echo "🪝 Created hooks in /src/hooks/"
echo ""
echo "Next steps:"
echo "1. Install required packages: npm install axios zustand react-query"
echo "2. Configure environment variables for API Gateway URL"
echo "3. Import and use services in your components"