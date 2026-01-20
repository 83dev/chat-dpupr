import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { redisClient, redisSubscriber } from '../config/redis.js';
import { setupChatHandlers } from './chat.handler.js';
import type { ServerToClientEvents, ClientToServerEvents } from '../types/index.js';

// Build allowed origins for Socket.io (consistent with Express CORS)
const getAllowedOrigins = (): string[] => {
  const origins = [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:3000',
    'http://localhost:8081',
  ];
  
  if (process.env.ADDITIONAL_ORIGINS) {
    origins.push(...process.env.ADDITIONAL_ORIGINS.split(',').map(o => o.trim()));
  }
  
  return origins;
};

let io: SocketIOServer<ClientToServerEvents, ServerToClientEvents>;

export function initializeSocket(httpServer: HttpServer): SocketIOServer<ClientToServerEvents, ServerToClientEvents> {
  io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps)
        if (!origin) return callback(null, true);
        
        const allowedOrigins = getAllowedOrigins();
        
        // Check allowed list or Expo URLs
        if (allowedOrigins.includes(origin) || origin.startsWith('exp://') || origin.includes('expo')) {
          return callback(null, true);
        }
        
        // In development, allow all
        if (process.env.NODE_ENV !== 'production') {
          return callback(null, true);
        }
        
        callback(new Error('Not allowed by CORS'));
      },
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
