import * as pty from 'node-pty';
import { EventEmitter } from 'events';
import { randomBytes } from 'crypto';

interface TerminalSession {
  id: string;
  pty: pty.IPty;
  userId: string;
  createdAt: Date;
  lastActivity: Date;
  rows: number;
  cols: number;
}

export class TerminalService extends EventEmitter {
  private sessions: Map<string, TerminalSession> = new Map();
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    super();
    // Cleanup inactive sessions every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveSessions();
    }, 5 * 60 * 1000);
  }

  createSession(userId: string, cols = 80, rows = 24): string {
    const sessionId = `term_${Date.now()}_${randomBytes(8).toString('hex')}`;
    
    // Create PTY instance
    const shell = process.platform === 'win32' ? 'powershell.exe' : 'bash';
    const ptyProcess = pty.spawn(shell, [], {
      name: 'xterm-256color',
      cols,
      rows,
      cwd: process.env.HOME || process.cwd(),
      env: {
        ...process.env,
        TERM: 'xterm-256color',
        COLORTERM: 'truecolor'
      }
    });

    // Create session
    const session: TerminalSession = {
      id: sessionId,
      pty: ptyProcess,
      userId,
      createdAt: new Date(),
      lastActivity: new Date(),
      rows,
      cols
    };

    this.sessions.set(sessionId, session);

    // Set up PTY event handlers
    ptyProcess.onData((data) => {
      session.lastActivity = new Date();
      this.emit('data', sessionId, data);
    });

    ptyProcess.onExit(({ exitCode, signal }) => {
      console.log(`Terminal ${sessionId} exited with code ${exitCode} and signal ${signal}`);
      this.destroySession(sessionId);
    });

    console.log(`Created terminal session ${sessionId} for user ${userId}`);
    
    // Send initial prompt
    setTimeout(() => {
      this.emit('data', sessionId, '\r\n🚀 Web Terminal Ready\r\n\r\n');
    }, 100);

    return sessionId;
  }

  writeToSession(sessionId: string, data: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      console.error(`Session ${sessionId} not found`);
      return false;
    }

    try {
      session.lastActivity = new Date();
      session.pty.write(data);
      return true;
    } catch (error) {
      console.error(`Error writing to session ${sessionId}:`, error);
      return false;
    }
  }

  resizeSession(sessionId: string, cols: number, rows: number): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      console.error(`Session ${sessionId} not found`);
      return false;
    }

    try {
      session.lastActivity = new Date();
      session.cols = cols;
      session.rows = rows;
      session.pty.resize(cols, rows);
      return true;
    } catch (error) {
      console.error(`Error resizing session ${sessionId}:`, error);
      return false;
    }
  }

  getSession(sessionId: string): TerminalSession | undefined {
    return this.sessions.get(sessionId);
  }

  getUserSessions(userId: string): TerminalSession[] {
    const userSessions: TerminalSession[] = [];
    this.sessions.forEach(session => {
      if (session.userId === userId) {
        userSessions.push(session);
      }
    });
    return userSessions;
  }

  destroySession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    try {
      // Kill PTY process
      session.pty.kill();
    } catch (error) {
      console.error(`Error killing PTY for session ${sessionId}:`, error);
    }

    this.sessions.delete(sessionId);
    this.emit('session-closed', sessionId);
    console.log(`Destroyed terminal session ${sessionId}`);
    return true;
  }

  destroyUserSessions(userId: string): number {
    let count = 0;
    const userSessions = this.getUserSessions(userId);
    
    for (const session of userSessions) {
      if (this.destroySession(session.id)) {
        count++;
      }
    }
    
    return count;
  }

  private cleanupInactiveSessions() {
    const now = Date.now();
    const sessionsToRemove: string[] = [];

    this.sessions.forEach((session, sessionId) => {
      const inactiveTime = now - session.lastActivity.getTime();
      if (inactiveTime > this.SESSION_TIMEOUT) {
        sessionsToRemove.push(sessionId);
      }
    });

    for (const sessionId of sessionsToRemove) {
      console.log(`Cleaning up inactive session ${sessionId}`);
      this.destroySession(sessionId);
    }
  }

  executeCommand(sessionId: string, command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const session = this.sessions.get(sessionId);
      if (!session) {
        reject(new Error('Session not found'));
        return;
      }

      let output = '';
      const timeout = setTimeout(() => {
        this.removeListener('data', dataHandler);
        resolve(output);
      }, 5000); // 5 second timeout

      const dataHandler = (sid: string, data: string) => {
        if (sid === sessionId) {
          output += data;
        }
      };

      this.on('data', dataHandler);
      
      // Send command
      session.pty.write(command + '\r');
      
      // Cleanup after response
      setTimeout(() => {
        clearTimeout(timeout);
        this.removeListener('data', dataHandler);
        resolve(output);
      }, 1000);
    });
  }

  // Get session statistics
  getStatistics() {
    const stats = {
      totalSessions: this.sessions.size,
      userSessions: new Map<string, number>(),
      oldestSession: null as Date | null,
      newestSession: null as Date | null
    };

    this.sessions.forEach(session => {
      // Count sessions per user
      const count = stats.userSessions.get(session.userId) || 0;
      stats.userSessions.set(session.userId, count + 1);

      // Find oldest and newest sessions
      if (!stats.oldestSession || session.createdAt < stats.oldestSession) {
        stats.oldestSession = session.createdAt;
      }
      if (!stats.newestSession || session.createdAt > stats.newestSession) {
        stats.newestSession = session.createdAt;
      }
    });

    return stats;
  }

  // Cleanup all sessions on shutdown
  cleanup() {
    clearInterval(this.cleanupInterval);
    
    this.sessions.forEach((session, sessionId) => {
      this.destroySession(sessionId);
    });
  }
}

// Create singleton instance
export const terminalService = new TerminalService();

// Cleanup on process exit
process.on('exit', () => {
  terminalService.cleanup();
});

process.on('SIGINT', () => {
  terminalService.cleanup();
  process.exit(0);
});

process.on('SIGTERM', () => {
  terminalService.cleanup();
  process.exit(0);
});