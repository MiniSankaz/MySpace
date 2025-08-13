import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { getAssistantInstance } from '@/modules/personal-assistant';
import { initTerminalSocket } from '@/modules/terminal/handlers/terminal.socket';

let io: SocketIOServer | null = null;

export function initSocketServer(server: HTTPServer) {
  if (io) return io;

  io = new SocketIOServer(server, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || 'http://127.0.0.1:process.env.PORT || 4000',
      methods: ['GET', 'POST']
    },
    path: '/socket.io'
  });

  const assistant = getAssistantInstance();
  
  // Initialize terminal namespace
  initTerminalSocket(io);

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    // Join user room
    socket.on('join-session', (data: { userId: string; sessionId: string }) => {
      const roomName = `${data.userId}-${data.sessionId}`;
      socket.join(roomName);
      socket.emit('session-joined', { roomName });
    });

    // Handle assistant messages
    socket.on('assistant-message', async (data: {
      userId: string;
      sessionId: string;
      message: string;
    }) => {
      try {
        const response = await assistant.processMessage(
          data.userId,
          data.sessionId,
          data.message
        );
        
        const roomName = `${data.userId}-${data.sessionId}`;
        
        // ส่งข้อความผู้ใช้กลับ
        io?.to(roomName).emit('user-message', {
          id: `user-${Date.now()}`,
          content: data.message,
          type: 'user',
          timestamp: new Date()
        });
        
        // ส่งคำตอบจาก assistant
        io?.to(roomName).emit('assistant-response', {
          id: `assistant-${Date.now()}`,
          content: response.message,
          type: 'assistant',
          timestamp: new Date(),
          suggestions: response.suggestions
        });
      } catch (error) {
        console.error('WebSocket assistant error:', error);
        socket.emit('error', { message: 'Failed to process message' });
      }
    });

    // Handle typing indicators
    socket.on('typing-start', (data: { userId: string; sessionId: string }) => {
      const roomName = `${data.userId}-${data.sessionId}`;
      socket.to(roomName).emit('user-typing', { userId: data.userId });
    });

    socket.on('typing-stop', (data: { userId: string; sessionId: string }) => {
      const roomName = `${data.userId}-${data.sessionId}`;
      socket.to(roomName).emit('user-stopped-typing', { userId: data.userId });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  return io;
}

export function getSocketServer(): SocketIOServer | null {
  return io;
}