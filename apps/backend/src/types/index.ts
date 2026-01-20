import type { User, Bidang, Jabatan, ChatRoom, Message, ChatRoomMember } from '@prisma/client';

// SSO User Profile Response
export interface SSOUserProfile {
  id: number;
  nip: string;
  nama: string;
  email: string;
  no_hp: string | null;
  is_active: boolean;
  bidang: {
    id: number;
    kode: string;
    nama: string;
  } | null;
  jabatan: {
    id: number;
    nama: string;
  } | null;
  roles: string[];
  permissions: string[];
  scopes: string[];
}

// JWT Payload
export interface JWTPayload {
  nip: string;
  ssoId: number;
  nama: string;
  email: string;
  bidangId?: number;
  bidangKode?: string;
  jabatanId?: number;
  iat?: number;
  exp?: number;
}

// Extended Express Request
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

// Location Data untuk field report
export interface LocationData {
  [key: string]: unknown;
  lat: number;
  lng: number;
  accuracy?: number;
  address?: string;
  timestamp?: string;
}

// Attachment structure
export interface Attachment {
  [key: string]: unknown;
  url: string;
  filename?: string;
  originalName?: string;
  mimetype?: string;
  size?: number;
}

// Socket Events
export interface ServerToClientEvents {
  'message:new': (message: MessageWithSender) => void;
  'message:updated': (message: MessageWithSender) => void;
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

export interface ClientToServerEvents {
  'room:join': (roomId: string) => void;
  'room:leave': (roomId: string) => void;
  'message:send': (data: SendMessagePayload, callback: (response: MessageResponse) => void) => void;
  'message:delete': (data: { roomId: string; messageId: string }, callback: (response: { success: boolean; error?: string }) => void) => void;
  'messages:mark-read': (data: { roomId: string; messageIds: string[] }) => void;
  'typing:start': (roomId: string) => void;
  'typing:stop': (roomId: string) => void;
}

// Message payload for sending
export interface SendMessagePayload {
  roomId: string;
  body: string;
  isReport?: boolean;
  locationData?: LocationData;
  attachments?: Attachment[];
  replyToId?: string;
}

// Message response
export interface MessageResponse {
  success: boolean;
  message?: MessageWithSender;
  error?: string;
}

// User basic info
export interface UserBasic {
  nip: string;
  nama: string;
  avatar?: string | null;
  isOnline?: boolean;
}

// Message with sender info
export interface MessageWithSender extends Message {
  sender: UserBasic;
}

// Room with members
export interface RoomWithMembers extends ChatRoom {
  members: (ChatRoomMember & {
    user: UserBasic;
  })[];
  _count?: {
    messages: number;
  };
  lastMessage?: MessageWithSender | null;
}

// API Response wrapper
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Pagination
export interface PaginationParams {
  page?: number;
  limit?: number;
  cursor?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

// Chat Room Type enum (mirror Prisma enum)
export type ChatRoomTypeEnum = 'BIDANG' | 'PROYEK' | 'PRIVATE';

export type { User, Bidang, Jabatan, ChatRoom, Message, ChatRoomMember };
