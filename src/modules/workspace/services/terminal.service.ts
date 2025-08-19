import { spawn, ChildProcess } from "child_process";
import { EventEmitter } from "events";
import { TerminalSession, TerminalCommand, TerminalMessage } from "../types";
import { terminalSessionManager } from "./terminal-session-manager";
import prisma from "@/core/database/prisma";
import * as pty from "node-pty";
import os from "os";
import fs from "fs";
import path from "path";

interface TerminalProcess {
  session: TerminalSession;
  process: any; // node-pty IPty interface
  emitter: EventEmitter;
}

export class TerminalService extends EventEmitter {
  private terminals: Map<string, TerminalProcess> = new Map();
  private shell: string;
  private shellArgs: string[];

  constructor() {
    super();
    // Determine shell based on platform
    if (os.platform() === "win32") {
      this.shell = "powershell.exe";
      this.shellArgs = [];
    } else if (os.platform() === "darwin") {
      // macOS uses zsh by default
      this.shell = "/bin/zsh";
      this.shellArgs = ["-l"]; // Login shell
    } else {
      // Linux
      this.shell = "/bin/bash";
      this.shellArgs = ["-l"]; // Login shell
    }
  }

  /**
   * Load environment variables from project's .env files
   */
  private loadProjectEnv(projectPath: string): Record<string, string> {
    const envFiles = [
      ".env.local",
      ".env.development.local",
      ".env.development",
      ".env",
    ];

    let projectEnv: Record<string, string> = {};

    for (const envFile of envFiles) {
      const envPath = path.join(projectPath, envFile);
      if (fs.existsSync(envPath)) {
        try {
          const envContent = fs.readFileSync(envPath, "utf8");
          const envVars = this.parseEnvFile(envContent);
          projectEnv = { ...projectEnv, ...envVars };
          console.log(`[Terminal] Loaded environment from: ${envFile}`);
        } catch (error) {
          console.warn(`[Terminal] Failed to load ${envFile}:`, error);
        }
      }
    }

    return projectEnv;
  }

  /**
   * Parse .env file content into key-value pairs
   */
  private parseEnvFile(content: string): Record<string, string> {
    const result: Record<string, string> = {};
    const lines = content.split("\n");

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const equalIndex = trimmed.indexOf("=");
        if (equalIndex > 0) {
          const key = trimmed.substring(0, equalIndex).trim();
          let value = trimmed.substring(equalIndex + 1).trim();

          // Remove quotes if present
          if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
          ) {
            value = value.slice(1, -1);
          }

          result[key] = value;
        }
      }
    }

    return result;
  }

  async createSession(
    projectId: string,
    type: "system" | "claude",
    tabName: string,
    projectPath: string,
    userId?: string,
  ): Promise<TerminalSession> {
    // Use the session manager to create or restore session
    const terminalSession = await terminalSessionManager.createOrRestoreSession(
      projectId,
      type,
      tabName,
      projectPath,
      userId,
    );

    try {
      await this.startTerminal(terminalSession, projectPath);
      // Mark as connected in session manager
      terminalSessionManager.markConnected(
        terminalSession.id,
        terminalSession.id,
      );
    } catch (error) {
      console.error("Failed to start terminal:", error);
      await terminalSessionManager.updateSessionStatus(
        terminalSession.id,
        false,
      );
    }

    return terminalSession;
  }

  private async startTerminal(
    session: TerminalSession,
    cwd: string,
  ): Promise<void> {
    try {
      const emitter = new EventEmitter();

      console.log(
        `Starting terminal with shell: ${this.shell}, args: ${this.shellArgs}, cwd: ${cwd}`,
      );

      // Load project-specific environment variables
      const projectEnv = this.loadProjectEnv(cwd);

      // Combine system env with project env (project env takes precedence)
      const combinedEnv = {
        ...process.env,
        ...projectEnv,
        TERM: "xterm-256color",
        COLORTERM: "truecolor",
        LANG: process.env.LANG || "en_US.UTF-8",
        // Ensure we're in the correct working directory
        PWD: cwd,
      };

      console.log(
        `[Terminal] Loaded ${Object.keys(projectEnv).length} environment variables from project`,
      );
      if (projectEnv.PORT) {
        console.log(`[Terminal] Using project PORT: ${projectEnv.PORT}`);
      }

      // Create pseudo-terminal
      const ptyProcess = pty.spawn(this.shell, this.shellArgs, {
        name: "xterm-256color",
        cols: 80,
        rows: 30,
        cwd,
        env: combinedEnv as any,
      });

      // Store terminal process
      this.terminals.set(session.id, {
        session,
        process: ptyProcess,
        emitter,
      });

      // Handle output
      ptyProcess.on("data", (data: string) => {
        this.handleOutput(session.id, data);
      });

      // Handle exit
      ptyProcess.on("exit", (exitCode: number) => {
        this.handleExit(session.id, exitCode);
      });

      // Set PID
      await this.updateSession(session.id, { pid: ptyProcess.pid });

      console.log(`Terminal started successfully with PID: ${ptyProcess.pid}`);
    } catch (error) {
      console.error("Error starting terminal:", error);
      // Clean up the terminal from the map if it was added
      if (this.terminals.has(session.id)) {
        this.terminals.delete(session.id);
      }
      throw new Error(
        `Failed to start terminal: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async executeCommand(sessionId: string, command: string): Promise<void> {
    const terminal = this.terminals.get(sessionId);
    if (!terminal) {
      throw new Error("Terminal session not found");
    }

    // Send command to terminal
    terminal.process.write(`${command}\r`);

    // Save command to database
    await prisma.terminalCommand.create({
      data: {
        sessionId,
        projectId: terminal.session.projectId,
        command,
        output: "",
      },
    });
  }

  async resizeTerminal(
    sessionId: string,
    cols: number,
    rows: number,
  ): Promise<void> {
    const terminal = this.terminals.get(sessionId);
    if (terminal && terminal.process.resize) {
      terminal.process.resize(cols, rows);
    }
  }

  async clearTerminal(sessionId: string): Promise<void> {
    const terminal = this.terminals.get(sessionId);
    if (!terminal) {
      throw new Error("Terminal session not found");
    }

    // Clear terminal screen
    terminal.process.write("\x1bc"); // Clear screen command

    // Clear output in database
    await this.updateSession(sessionId, { output: [] });
  }

  async closeSession(sessionId: string): Promise<void> {
    const terminal = this.terminals.get(sessionId);
    if (terminal) {
      // Kill process
      if (terminal.process && !terminal.process.killed) {
        terminal.process.kill();
      }

      // Remove from map
      this.terminals.delete(sessionId);
    }

    // Mark as disconnected in session manager
    terminalSessionManager.markDisconnected(sessionId);

    // Close session in session manager
    await terminalSessionManager.closeSession(sessionId);
  }

  async getSession(sessionId: string): Promise<TerminalSession | null> {
    const session = await prisma.terminalSession.findUnique({
      where: { id: sessionId },
    });

    return session ? this.formatSession(session) : null;
  }

  async getProjectSessions(projectId: string): Promise<TerminalSession[]> {
    const sessions = await prisma.terminalSession.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    });

    return sessions.map(this.formatSession);
  }

  async getActiveSessions(projectId: string): Promise<TerminalSession[]> {
    const sessions = await prisma.terminalSession.findMany({
      where: {
        projectId,
        active: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return sessions.map(this.formatSession);
  }

  async getCommandHistory(
    sessionId: string,
    limit: number = 100,
  ): Promise<TerminalCommand[]> {
    const commands = await prisma.terminalCommand.findMany({
      where: { sessionId },
      orderBy: { timestamp: "desc" },
      take: limit,
    });

    return commands.map((cmd) => ({
      ...cmd,
      timestamp: new Date(cmd.timestamp),
    }));
  }

  async reconnectSession(sessionId: string): Promise<TerminalSession> {
    // Get session from session manager
    const session = terminalSessionManager.getSession(sessionId);
    if (!session) {
      // Try to get from database
      const dbSession = await this.getSession(sessionId);
      if (!dbSession) {
        throw new Error("Session not found");
      }
      return dbSession;
    }

    // Check if terminal is already running
    if (this.terminals.has(sessionId)) {
      // Mark as connected in session manager
      terminalSessionManager.markConnected(sessionId, sessionId);
      return session;
    }

    // Restart terminal
    await this.startTerminal(session, session.currentPath);
    await terminalSessionManager.updateSessionStatus(sessionId, true);
    terminalSessionManager.markConnected(sessionId, sessionId);

    return session;
  }

  private async handleOutput(sessionId: string, data: string): void {
    const terminal = this.terminals.get(sessionId);
    if (!terminal) return;

    // Emit output event
    this.emit("output", {
      sessionId,
      data,
      type: "output",
    } as TerminalMessage);

    // Add output to session manager
    terminalSessionManager.addOutput(sessionId, data);

    // Append to session output (limit to last 1000 lines)
    const output = [...terminal.session.output, data];
    if (output.length > 1000) {
      output.splice(0, output.length - 1000);
    }
    terminal.session.output = output;

    // Update last command output if exists
    const lastCommand = await prisma.terminalCommand.findFirst({
      where: { sessionId },
      orderBy: { timestamp: "desc" },
    });

    if (lastCommand) {
      await prisma.terminalCommand.update({
        where: { id: lastCommand.id },
        data: {
          output: lastCommand.output + data,
        },
      });
    }
  }

  private async handleExit(sessionId: string, exitCode: number): void {
    const terminal = this.terminals.get(sessionId);
    if (!terminal) return;

    // Emit exit event
    this.emit("exit", {
      sessionId,
      exitCode,
    });

    // Update session
    await this.updateSession(sessionId, {
      active: false,
      pid: null,
    });

    // Update last command with exit code
    const lastCommand = await prisma.terminalCommand.findFirst({
      where: { sessionId },
      orderBy: { timestamp: "desc" },
    });

    if (lastCommand) {
      await prisma.terminalCommand.update({
        where: { id: lastCommand.id },
        data: { exitCode },
      });
    }

    // Remove from map
    this.terminals.delete(sessionId);
  }

  private async updateSession(sessionId: string, data: any): Promise<void> {
    await prisma.terminalSession.update({
      where: { id: sessionId },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
  }

  private formatSession(session: any): TerminalSession {
    return {
      ...session,
      output: session.output || [],
      createdAt: new Date(session.createdAt),
    };
  }

  // Cleanup all terminals on service shutdown
  async cleanup(): Promise<void> {
    for (const [sessionId, terminal] of this.terminals) {
      if (terminal.process && !terminal.process.killed) {
        terminal.process.kill();
      }
      await this.updateSession(sessionId, { active: false });
    }
    this.terminals.clear();
  }

  // Get terminal status
  getTerminalStatus(sessionId: string): boolean {
    return this.terminals.has(sessionId);
  }

  // Get all active terminal sessions in memory
  getActiveTerminals(): string[] {
    return Array.from(this.terminals.keys());
  }
}

export const terminalService = new TerminalService();

// Cleanup on process exit
process.on("exit", () => {
  terminalService.cleanup();
});

process.on("SIGINT", () => {
  terminalService.cleanup();
  process.exit();
});

process.on("SIGTERM", () => {
  terminalService.cleanup();
  process.exit();
});
