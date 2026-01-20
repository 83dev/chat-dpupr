'use client';

import { io, Socket } from 'socket.io-client';
import type { Message, SendMessagePayload, MessageResponse, UserBasic } from './types';

// Socket events
interface ServerToClientEvents {
  'message:new': (message: Message) => void;
  'message:updated': (message: Message) => void;
  'message:deleted': (data: { roomId: string; messageId: string }) => void;
  'messages:read': (data: { roomId: string; messageIds: string[]; readBy: string }) => void;
  'users:online': (nips: string[]) => void;
  'user:online': (nip: string) => void;
  'user:offline': (nip: string) => void;
  'user:typing': (data: { roomId: string; nip: string; nama: string }) => void;
  'user:stop-typing': (data: { roomId: string; nip: string }) => void;
  'room:joined': (data: { roomId: string; user: UserBasic }) => void;
  'room:left': (data: { roomId: string; nip: string }) => void;
}

interface ClientToServerEvents {
  'room:join': (roomId: string) => void;
  'room:leave': (roomId: string) => void;
  'message:send': (data: SendMessagePayload, callback: (response: MessageResponse) => void) => void;
  'message:delete': (data: { roomId: string; messageId: string }, callback: (response: { success: boolean; error?: string }) => void) => void;
  'messages:mark-read': (data: { roomId: string; messageIds: string[] }) => void;
  'typing:start': (roomId: string) => void;
  'typing:stop': (roomId: string) => void;
}

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

let socket: TypedSocket | null = null;

export function getSocket(): TypedSocket | null {
  return socket;
}

export function connectSocket(token: string): TypedSocket {
  if (socket?.connected) {
    return socket;
  }

  socket = io(BACKEND_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
  }) as TypedSocket;

  socket.on('connect', () => {
    console.log('🔌 Socket connected');
  });

  socket.on('disconnect', (reason) => {
    console.log('👋 Socket disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('❌ Socket connection error:', error.message);
  });

  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

// Helper functions
export function joinRoom(roomId: string): void {
  socket?.emit('room:join', roomId);
}

export function leaveRoom(roomId: string): void {
  socket?.emit('room:leave', roomId);
}

export function sendMessage(
  payload: SendMessagePayload,
  callback: (response: MessageResponse) => void
): void {
  socket?.emit('message:send', payload, callback);
}

export function startTyping(roomId: string): void {
  socket?.emit('typing:start', roomId);
}

export function stopTyping(roomId: string): void {
  socket?.emit('typing:stop', roomId);
}

export function markMessagesRead(roomId: string, messageIds: string[]): void {
  if (messageIds.length > 0) {
    socket?.emit('messages:mark-read', { roomId, messageIds });
  }
}

export function deleteMessage(
  roomId: string,
  messageId: string,
  callback: (response: { success: boolean; error?: string }) => void
): void {
  socket?.emit('message:delete', { roomId, messageId }, callback);
}

export default socket;
