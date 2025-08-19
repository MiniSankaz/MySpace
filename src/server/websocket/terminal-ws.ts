import { Server as HTTPServer } from "http";
import { parse } from "url";
import { WebSocketServer, WebSocket } from "ws";
import * as pty from "node-pty";
import { jwtVerify } from "jose";
import os from "os";

interface IPty {
  onData: (callback: (data: string) => void) => void;
  onExit: (callback: (code: number, signal?: number) => void) => void;
  write: (data: string) => void;
  resize: (cols: number, rows: number) => void;
  kill: (signal?: string) => void;
  pid: number;
  process: string;
}

interface TerminalConnection {
  ws: WebSocket;
  pty: IPty;
  projectId: string;
  userId: string;
}

export class TerminalWebSocketServer {
  private wss: WebSocketServer;
  private connections: Map<string, TerminalConnection> = new Map();
  private shell: string;

  constructor(server: HTTPServer) {
    this.shell = os.platform() === "win32" ? "powershell.exe" : "/bin/bash";

    this.wss = new WebSocketServer({
      server,
      path: "/ws/terminal",
      verifyClient: async (info, cb) => {
        try {
          // Extract token from query string or headers
          const { query } = parse(info.req.url || "", true);
          const token =
            (query.token as string) ||
            info.req.headers.authorization?.replace("Bearer ", "");

          if (!token) {
            cb(false, 401, "Unauthorized");
            return;
          }

          // Verify JWT token
          const secret = new TextEncoder().encode(
            process.env.JWT_SECRET || "your-secret-key",
          );

          await jwtVerify(token, secret);
          cb(true);
        } catch (error) {
          console.error("WebSocket auth failed:", error);
          cb(false, 401, "Unauthorized");
        }
      },
    });

    this.wss.on("connection", this.handleConnection.bind(this));
  }

  private handleConnection(ws: WebSocket, request: any) {
    console.log("New terminal WebSocket connection");

    const { query } = parse(request.url || "", true);
    const projectId = query.projectId as string;
    const sessionId = (query.sessionId as string) || `session_${Date.now()}`;
    const initialPath = (query.path as string) || process.cwd();

    // Create PTY instance
    const ptyProcess = pty.spawn(this.shell, [], {
      name: "xterm-color",
      cols: 80,
      rows: 30,
      cwd: initialPath,
      env: process.env as { [key: string]: string },
    }) as unknown as IPty;

    // Store connection
    const connection: TerminalConnection = {
      ws,
      pty: ptyProcess,
      projectId,
      userId: "", // Extract from token if needed
    };

    this.connections.set(sessionId, connection);

    // Send initial message
    ws.send(
      JSON.stringify({
        type: "connected",
        sessionId,
        pid: ptyProcess.pid,
      }),
    );

    // Handle PTY data
    ptyProcess.onData((data: string) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: "output",
            data,
          }),
        );
      }
    });

    // Handle PTY exit
    ptyProcess.onExit((code: number) => {
      console.log(`Terminal process exited with code ${code}`);
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: "exit",
            code,
          }),
        );
        ws.close();
      }
      this.connections.delete(sessionId);
    });

    // Handle WebSocket messages
    ws.on("message", (message: Buffer) => {
      try {
        const msg = JSON.parse(message.toString());

        switch (msg.type) {
          case "input":
            ptyProcess.write(msg.data);
            break;

          case "resize":
            ptyProcess.resize(msg.cols, msg.rows);
            break;

          case "ping":
            ws.send(JSON.stringify({ type: "pong" }));
            break;

          default:
            console.warn("Unknown message type:", msg.type);
        }
      } catch (error) {
        console.error("Error handling WebSocket message:", error);
      }
    });

    // Handle WebSocket close
    ws.on("close", () => {
      console.log("Terminal WebSocket closed");
      ptyProcess.kill();
      this.connections.delete(sessionId);
    });

    // Handle WebSocket error
    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
      ptyProcess.kill();
      this.connections.delete(sessionId);
    });
  }

  public closeAllConnections() {
    this.connections.forEach((connection, sessionId) => {
      connection.pty.kill();
      connection.ws.close();
    });
    this.connections.clear();
  }
}
