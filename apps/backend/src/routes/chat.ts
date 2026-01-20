import { Router, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.js';
import prisma from '../config/database.js';
import type { ApiResponse, RoomWithMembers, MessageWithSender, PaginatedResponse, ChatRoomTypeEnum } from '../types/index.js';

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get all chat rooms for current user
router.get('/rooms', async (req: Request, res: Response<ApiResponse<RoomWithMembers[]>>) => {
  try {
    const userNip = req.user!.nip;
    
    const rooms = await prisma.chatRoom.findMany({
      where: {
        isActive: true,
        members: {
          some: {
            userNip,
            leftAt: null,
          },
        },
      },
      include: {
        members: {
          where: { leftAt: null },
          include: {
            user: {
              select: {
                nip: true,
                nama: true,
                avatar: true,
              },
            },
          },
        },
        messages: {
          where: { isDeleted: false },
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            sender: {
              select: {
                nip: true,
                nama: true,
                avatar: true,
              },
            },
          },
        },
        _count: {
          select: { messages: true },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
    
    // Calculate unread count for each room
    const roomsWithUnread = await Promise.all(
      rooms.map(async (room: typeof rooms[number]) => {
        // Count messages not from current user that aren't marked as READ
        // Use readBy relation to check if user has read the message
        const unreadCount = await prisma.message.count({
          where: {
            roomId: room.id,
            senderNip: { not: userNip },
            isDeleted: false,
            NOT: {
              readBy: {
                some: {
                  userNip: userNip,
                },
              },
            },
          },
        });
        
        return {
          ...room,
          lastMessage: room.messages[0] || null,
          messages: undefined,
          unreadCount,
        };
      })
    );
    
    res.json({
      success: true,
      data: roomsWithUnread as unknown as RoomWithMembers[],
    });
  } catch (error) {
    console.error('Get rooms error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get chat rooms',
    });
  }
});

// Get single room details
router.get('/rooms/:roomId', async (req: Request, res: Response<ApiResponse<RoomWithMembers>>) => {
  try {
    const roomId = req.params.roomId as string;
    const userNip = req.user!.nip;
    
    const room = await prisma.chatRoom.findFirst({
      where: {
        id: roomId,
        isActive: true,
        members: {
          some: {
            userNip,
            leftAt: null,
          },
        },
      },
      include: {
        members: {
          where: { leftAt: null },
          include: {
            user: {
              select: {
                nip: true,
                nama: true,
                avatar: true,
                lastSeen: true,
              },
            },
          },
        },
        bidang: true,
      },
    });
    
    if (!room) {
      res.status(404).json({
        success: false,
        error: 'Room not found or access denied',
      });
      return;
    }
    
    res.json({
      success: true,
      data: room as unknown as RoomWithMembers,
    });
  } catch (error) {
    console.error('Get room error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get room',
    });
  }
});

// Create new chat room
router.post('/rooms', async (req: Request, res: Response<ApiResponse<RoomWithMembers>>) => {
  try {
    const userNip = req.user!.nip;
    const { nama, description, type, memberNips, proyekKode, proyekNama } = req.body;
    
    // Validate type
    if (!['BIDANG', 'PROYEK', 'PRIVATE'].includes(type)) {
      res.status(400).json({
        success: false,
        error: 'Invalid room type',
      });
      return;
    }
    
    // For PRIVATE, ensure only 2 members
    if (type === 'PRIVATE') {
      if (!memberNips || memberNips.length !== 1) {
        res.status(400).json({
          success: false,
          error: 'Private room must have exactly one other member',
        });
        return;
      }
      
      // Check if private room already exists
      const existingRoom = await prisma.chatRoom.findFirst({
        where: {
          type: 'PRIVATE',
          isActive: true,
          AND: [
            { members: { some: { userNip } } },
            { members: { some: { userNip: memberNips[0] } } },
          ],
        },
        include: {
          members: {
            where: { leftAt: null },
            include: {
              user: {
                select: {
                  nip: true,
                  nama: true,
                  avatar: true,
                },
              },
            },
          },
        },
      });
      
      if (existingRoom) {
        // Return existing room instead of error
        res.json({
          success: true,
          data: existingRoom,
        });
        return;
      }
    }
    
    // Create room
    const room = await prisma.chatRoom.create({
      data: {
        nama,
        description,
        type: type as ChatRoomTypeEnum,
        proyekKode: type === 'PROYEK' ? proyekKode : null,
        proyekNama: type === 'PROYEK' ? proyekNama : null,
        members: {
          create: [
            { userNip, role: 'admin' },
            ...(memberNips || []).map((nip: string) => ({
              userNip: nip,
              role: 'member',
            })),
          ],
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                nip: true,
                nama: true,
                avatar: true,
              },
            },
          },
        },
      },
    });
    
    res.status(201).json({
      success: true,
      data: room as unknown as RoomWithMembers,
    });
  } catch (error) {
    console.error('Create room error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create room',
    });
  }
});

// Get messages in a room
router.get('/rooms/:roomId/messages', async (req: Request, res: Response<PaginatedResponse<MessageWithSender>>) => {
  try {
    const roomId = req.params.roomId as string;
    const userNip = req.user!.nip;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const cursor = req.query.cursor as string | undefined;
    
    // Verify user is member
    const membership = await prisma.chatRoomMember.findFirst({
      where: {
        roomId,
        userNip,
        leftAt: null,
      },
    });
    
    if (!membership) {
      res.status(403).json({
        success: false,
        pagination: { page: 0, limit: 0, total: 0, totalPages: 0, hasMore: false },
        error: 'Access denied',
      });
      return;
    }
    
    // Get total count
    const total = await prisma.message.count({
      where: {
        roomId,
        isDeleted: false,
      },
    });
    
    // Get messages with cursor-based pagination
    const messages = await prisma.message.findMany({
      where: {
        roomId,
        isDeleted: false,
        ...(cursor && {
          createdAt: {
            lt: new Date(cursor),
          },
        }),
      },
      include: {
        sender: {
          select: {
            nip: true,
            nama: true,
            avatar: true,
          },
        },
        replyTo: {
          include: {
            sender: {
              select: {
                nip: true,
                nama: true,
              },
            },
          },
        },
        readBy: {
          select: {
            userNip: true,
            readAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });
    
    const totalPages = Math.ceil(total / limit);
    
    res.json({
      success: true,
      data: messages as unknown as MessageWithSender[],
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore: messages.length === limit,
      },
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      pagination: { page: 0, limit: 0, total: 0, totalPages: 0, hasMore: false },
      error: 'Failed to get messages',
    });
  }
});

// Send message (REST fallback - prefer Socket.io)
router.post('/rooms/:roomId/messages', async (req: Request, res: Response<ApiResponse<MessageWithSender>>) => {
  try {
    const roomId = req.params.roomId as string;
    const userNip = req.user!.nip;
    const { body, isReport, locationData, attachments, replyToId } = req.body;
    
    if (!body?.trim()) {
      res.status(400).json({
        success: false,
        error: 'Message body is required',
      });
      return;
    }
    
    // Verify user is member
    const membership = await prisma.chatRoomMember.findFirst({
      where: {
        roomId,
        userNip,
        leftAt: null,
      },
    });
    
    if (!membership) {
      res.status(403).json({
        success: false,
        error: 'Access denied',
      });
      return;
    }
    
    // Create message
    const message = await prisma.message.create({
      data: {
        body: body.trim(),
        isReport: isReport || false,
        locationData: locationData || undefined,
        attachments: attachments || undefined,
        roomId,
        senderNip: userNip,
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
    
    res.status(201).json({
      success: true,
      data: message as unknown as MessageWithSender,
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send message',
    });
  }
});

// Search users (for adding to rooms)
router.get('/users/search', async (req: Request, res: Response<ApiResponse>) => {
  try {
    const query = req.query.q as string;
    
    if (!query || query.length < 2) {
      res.status(400).json({
        success: false,
        error: 'Search query must be at least 2 characters',
      });
      return;
    }
    
    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        OR: [
          { nama: { contains: query, mode: 'insensitive' } },
          { nip: { contains: query } },
          { email: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: {
        nip: true,
        nama: true,
        avatar: true,
        bidang: {
          select: {
            nama: true,
          },
        },
        jabatan: {
          select: {
            nama: true,
          },
        },
      },
      take: 20,
    });
    
    res.json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search users',
    });
  }
});

// Get reports (messages with isReport=true and locationData)
router.get('/reports', async (req: Request, res: Response<ApiResponse>) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const skip = (page - 1) * limit;
    
    const reports = await prisma.message.findMany({
      where: {
        isReport: true,
        isDeleted: false,
        NOT: {
          locationData: { equals: Prisma.DbNull },
        },
      },
      include: {
        sender: {
          select: {
            nip: true,
            nama: true,
            avatar: true,
            bidang: {
              select: { nama: true },
            },
          },
        },
        room: {
          select: {
            id: true,
            nama: true,
            proyekNama: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: limit,
    });
    
    res.json({
      success: true,
      data: reports,
    });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get reports',
    });
  }
});

export default router;
