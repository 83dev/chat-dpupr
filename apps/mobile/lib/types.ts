// Shared types for mobile app - aligned with web app types

export interface User {
  id: string;
  nip: string;
  nama: string;
  email?: string;
  role: 'superadmin' | 'admin_bidang' | 'operator_bidang' | 'operator_kabupaten';
  bidangId?: string;
  bidang?: Bidang;
  kodeKabupaten?: string;
  createdAt: string;
  updatedAt: string;
  pushToken?: string;
}

export interface Bidang {
  id: string;
  nama: string;
  kode: string;
}

export interface ChatRoom {
  id: string;
  nama: string;
  deskripsi?: string;
  jenis: 'BIDANG' | 'PERSONAL' | 'GROUP';
  type: 'BIDANG' | 'PROYEK' | 'PRIVATE'; // Backend uses 'type'
  bidangId?: string;
  createdAt: string;
  updatedAt: string;
  lastMessage?: Message;
  unreadCount?: number;
  members?: RoomMember[];
}

export interface RoomMember {
  id: string;
  userId: string;
  roomId: string;
  user: User;
  joinedAt: string;
}

export interface Message {
  id: string;
  roomId: string;
  senderNip: string;
  body: string;
  status: 'SENT' | 'DELIVERED' | 'READ';
  attachments?: Attachment[];
  readBy?: { userNip: string; readAt: string }[];
  createdAt: string;
  updatedAt: string;
  sender: {
    nip: string;
    nama: string;
  };
}

export interface Attachment {
  id: string;
  messageId: string;
  // Unified fields (Mobile preference)
  fileName?: string;
  fileUrl?: string;
  fileType?: string;
  fileSize?: number;
  // Backend/Web response fields
  url?: string;
  filename?: string;
  originalName?: string;
  mimetype?: string;
  size?: number;
}

export interface SendMessagePayload {
  roomId: string;
  body: string;
  attachments?: any[]; // Full attachment objects from backend upload
  isReport?: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface ChatState {
  rooms: ChatRoom[];
  activeRoomId: string | null;
  messages: Record<string, Message[]>;
  onlineUsers: Set<string>;
  typingUsers: Record<string, { nip: string; nama: string }[]>;
}
