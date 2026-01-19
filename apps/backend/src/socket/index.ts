import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { redisClient, redisSubscriber } from '../config/redis.js';
import { setupChatHandlers } from './chat.handler.js';
import type { ServerToClientEvents, ClientToServerEvents } from '../types/index.js';

let io: SocketIOServer<ClientToServerEvents, ServerToClientEvents>;

export function initializeSocket(httpServer: HttpServer): SocketIOServer<ClientToServerEvents, ServerToClientEvents> {
  io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
  });
  
  // Use Redis adapter for horizontal scaling
  try {
    io.adapter(createAdapter(redisClient, redisSubscriber));
    console.log('✅ Socket.io Redis adapter initialized');
  } catch (error) {
    console.warn('⚠️ Redis adapter not available, using in-memory adapter');
  }
  
  // Setup chat event handlers
  setupChatHandlers(io);
  
  console.log('✅ Socket.io initialized');
  
  return io;
}

export function getIO(): SocketIOServer<ClientToServerEvents, ServerToClientEvents> {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
}

export default { initializeSocket, getIO };
