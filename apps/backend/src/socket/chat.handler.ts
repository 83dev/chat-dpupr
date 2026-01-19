import { Server as SocketIOServer, Socket } from 'socket.io';
import prisma from '../config/database.js';
import { verifyToken } from '../middleware/auth.js';
import type {
  JWTPayload,
  ServerToClientEvents,
  ClientToServerEvents,
  SendMessagePayload,
  MessageWithSender,
} from '../types/index.js';

// Extended Socket with user data
interface AuthenticatedSocket extends Socket<ClientToServerEvents, ServerToClientEvents> {
  user?: JWTPayload;
}

export function setupChatHandlers(io: SocketIOServer<ClientToServerEvents, ServerToClientEvents>): void {
  // Authentication middleware
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    
    if (!token || typeof token !== 'string') {
      return next(new Error('Authentication required'));
    }
    
    const user = verifyToken(token);
    if (!user) {
      return next(new Error('Invalid token'));
    }
    
    socket.user = user;
    next();
  });
  
  // Track online users
  const onlineUsers = new Set<string>();

  io.on('connection', async (socket: AuthenticatedSocket) => {
    const user = socket.user!;
    console.log(`🔌 User connected: ${user.nama} (${user.nip})`);
    
    // Add to online users set
    onlineUsers.add(user.nip);
    
    // Join user's personal room (for direct notifications)
    socket.join(`user:${user.nip}`);
    
    // Update user online status (gracefully handle if user doesn't exist)
    try {
      await prisma.user.update({
        where: { nip: user.nip },
        data: { lastSeen: new Date() },
      });
    } catch (error) {
      console.warn(`User ${user.nip} not found in database, skipping online status update`);
    }
    
    // Send list of currently online users to this user
    socket.emit('users:online', Array.from(onlineUsers));
    
    // Notify others that user is online
    socket.broadcast.emit('user:online', user.nip);
    
    // Auto-join user's chat rooms
    const memberships = await prisma.chatRoomMember.findMany({
      where: {
        userNip: user.nip,
        leftAt: null,
      },
      select: { roomId: true },
    });
    
    for (const { roomId } of memberships) {
      socket.join(`room:${roomId}`);
    }
    
    // Handle joining a room
    socket.on('room:join', async (roomId: string) => {
      try {
        // Verify membership
        const membership = await prisma.chatRoomMember.findFirst({
          where: {
            roomId,
            userNip: user.nip,
            leftAt: null,
          },
        });
        
        if (membership) {
          socket.join(`room:${roomId}`);
          
          // Notify room
          io.to(`room:${roomId}`).emit('room:joined', {
            roomId,
            user: {
              nip: user.nip,
              nama: user.nama,
            },
          });
        }
      } catch (error) {
        console.error('Error joining room:', error);
      }
    });
    
    // Handle leaving a room
    socket.on('room:leave', (roomId: string) => {
      socket.leave(`room:${roomId}`);
      
      io.to(`room:${roomId}`).emit('room:left', {
        roomId,
        nip: user.nip,
      });
    });
    
    // Handle sending messages
    socket.on('message:send', async (data: SendMessagePayload, callback) => {
      try {
        const { roomId, body, isReport, locationData, attachments, replyToId } = data;
        
        // Allow empty body if attachments exist
        if (!body?.trim() && (!attachments || attachments.length === 0)) {
          return callback({ success: false, error: 'Message body or attachment is required' });
        }
        
        // Verify membership
        const membership = await prisma.chatRoomMember.findFirst({
          where: {
            roomId,
            userNip: user.nip,
            leftAt: null,
          },
        });
        
        if (!membership) {
          return callback({ success: false, error: 'Access denied' });
        }
        
        // Create message
        const message = await prisma.message.create({
          data: {
            body: body.trim(),
            isReport: isReport || false,
            locationData: locationData ? JSON.parse(JSON.stringify(locationData)) : undefined,
            attachments: attachments ? JSON.parse(JSON.stringify(attachments)) : undefined,
            roomId,
            senderNip: user.nip,
            replyToId: replyToId || undefined,
          },
          include: {
            sender: {
              select: {
                nip: true,
                nama: true,
                avatar: true,
              },
            },
          },
        });
        
        // Update room's updatedAt
        await prisma.chatRoom.update({
          where: { id: roomId },
          data: { updatedAt: new Date() },
        });
        
        const messageWithSender = message as unknown as MessageWithSender;
        
        // Broadcast to room
        io.to(`room:${roomId}`).emit('message:new', messageWithSender);
        
        // Success callback
        callback({ success: true, message: messageWithSender });
        
      } catch (error) {
        console.error('Error sending message:', error);
        callback({ success: false, error: 'Failed to send message' });
      }
    });
    
    // Handle typing indicator
    socket.on('typing:start', (roomId: string) => {
      socket.to(`room:${roomId}`).emit('user:typing', {
        roomId,
        nip: user.nip,
        nama: user.nama,
      });
    });
    
    socket.on('typing:stop', (roomId: string) => {
      socket.to(`room:${roomId}`).emit('user:stop-typing', {
        roomId,
        nip: user.nip,
      });
    });
    
    // Handle marking messages as read
    socket.on('messages:mark-read', async ({ roomId, messageIds }) => {
      try {
        if (!messageIds || messageIds.length === 0) return;
        
        // Create read receipts for each message
        await prisma.$transaction(
          messageIds.map(messageId =>
            prisma.messageRead.upsert({
              where: {
                messageId_userNip: {
                  messageId,
                  userNip: user.nip,
                },
              },
              create: {
                messageId,
                userNip: user.nip,
              },
              update: {},
            })
          )
        );
        
        // Notify sender that messages were read
        socket.to(`room:${roomId}`).emit('messages:read', {
          roomId,
          messageIds,
          readBy: user.nip,
        });
      } catch (error) {
        console.error('Mark read error:', error);
      }
    });
    
    // Handle disconnect
    socket.on('disconnect', async () => {
      console.log(`👋 User disconnected: ${user.nama} (${user.nip})`);
      
      // Remove from online users set
      onlineUsers.delete(user.nip);
      
      // Update last seen (gracefully handle if user doesn't exist)
      try {
        await prisma.user.update({
          where: { nip: user.nip },
          data: { lastSeen: new Date() },
        });
      } catch {
        // User may not exist in database
      }
      
      // Notify others that user is offline
      socket.broadcast.emit('user:offline', user.nip);
    });
  });
}

export default setupChatHandlers;
