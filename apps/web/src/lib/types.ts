// Shared types between web and mobile
// These should be identical to backend types for consistency

// User profile from SSO
export interface User {
  nip: string;
  nama: string;
  email: string;
  avatar?: string | null;
  bidang?: {
    id: number;
    kode: string;
    nama: string;
  } | null;
  jabatan?: {
    id: number;
    nama: string;
  } | null;
}

// JWT Token payload
export interface AuthToken {
  nip: string;
  ssoId: number;
  nama: string;
  email: string;
  bidangId?: number;
  bidangKode?: string;
  jabatanId?: number;
}

// Chat Room Types
export type ChatRoomType = 'BIDANG' | 'PROYEK' | 'PRIVATE';

export interface ChatRoom {
  id: string;
  nama: string;
  description?: string | null;
  type: ChatRoomType;
  avatar?: string | null;
  bidangId?: number | null;
  proyekKode?: string | null;
  proyekNama?: string | null;
  members?: ChatRoomMember[];
  lastMessage?: Message | null;
  unreadCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChatRoomMember {
  id: string;
  role: string;
  userNip: string;
  user: UserBasic;
  joinedAt: string;
}

export interface UserBasic {
  nip: string;
  nama: string;
  avatar?: string | null;
  isOnline?: boolean;
}

// Message with location data
export interface LocationData {
  lat: number;
  lng: number;
  accuracy?: number;
  address?: string;
  timestamp?: string;
}

export interface Attachment {
  url: string;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
}

export type MessageStatus = 'SENT' | 'DELIVERED' | 'READ';

export interface Message {
  id: string;
  body: string;
  isReport: boolean;
  status: MessageStatus;
  isDeleted: boolean;
  locationData?: LocationData | null;
  attachments?: Attachment[] | null;
  roomId: string;
  senderNip: string;
  sender: UserBasic;
  replyToId?: string | null;
  replyTo?: Message | null;
  readBy?: { userNip: string; readAt: string }[];
  createdAt: string;
  updatedAt: string;
}

// Socket Events
export interface SendMessagePayload {
  roomId: string;
  body: string;
  isReport?: boolean;
  locationData?: LocationData;
  attachments?: Attachment[];
  replyToId?: string;
}

export interface MessageResponse {
  success: boolean;
  message?: Message;
  error?: string;
}

// API Response
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
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
