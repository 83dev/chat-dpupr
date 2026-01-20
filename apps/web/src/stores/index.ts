'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, ChatRoom, Message } from '@/lib/types';

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      setAuth: (token, user) => set({ token, user, isAuthenticated: true }),
      logout: () => set({ token: null, user: null, isAuthenticated: false }),
    }),
    {
      name: 'dpupr-chat-auth',
    }
  )
);

interface ChatState {
  rooms: ChatRoom[];
  activeRoomId: string | null;
  messages: Record<string, Message[]>;
  onlineUsers: Set<string>;
  typingUsers: Record<string, { nip: string; nama: string }[]>;
  
  setRooms: (rooms: ChatRoom[]) => void;
  setActiveRoom: (roomId: string | null) => void;
  addMessage: (roomId: string, message: Message) => void;
  setMessages: (roomId: string, messages: Message[]) => void;
  prependMessages: (roomId: string, messages: Message[]) => void;
  removeMessage: (roomId: string, messageId: string) => void;
  updateMessagesStatus: (roomId: string, messageIds: string[], status: 'SENT' | 'DELIVERED' | 'READ') => void;
  clearRoomUnreadCount: (roomId: string) => void;
  incrementRoomUnreadCount: (roomId: string) => void;
  setOnlineUsers: (nips: string[]) => void;
  setUserOnline: (nip: string) => void;
  setUserOffline: (nip: string) => void;
  addTypingUser: (roomId: string, nip: string, nama: string) => void;
  removeTypingUser: (roomId: string, nip: string) => void;
  updateRoomLastMessage: (roomId: string, message: Message) => void;
}

export const useChatStore = create<ChatState>()((set, get) => ({
  rooms: [],
  activeRoomId: null,
  messages: {},
  onlineUsers: new Set(),
  typingUsers: {},

  setRooms: (rooms) => set({ rooms }),
  
  setActiveRoom: (roomId) => set({ activeRoomId: roomId }),
  
  addMessage: (roomId, message) => {
    const current = get().messages[roomId] || [];
    set({
      messages: {
        ...get().messages,
        [roomId]: [...current, message],
      },
    });
  },
  
  setMessages: (roomId, messages) => {
    set({
      messages: {
        ...get().messages,
        [roomId]: messages,
      },
    });
  },
  
  prependMessages: (roomId, messages) => {
    const current = get().messages[roomId] || [];
    set({
      messages: {
        ...get().messages,
        [roomId]: [...messages, ...current],
      },
    });
  },

  removeMessage: (roomId, messageId) => {
    const current = get().messages[roomId] || [];
    set({
      messages: {
        ...get().messages,
        [roomId]: current.filter(msg => msg.id !== messageId),
      },
    });
  },
  
  updateMessagesStatus: (roomId, messageIds, status) => {
    const current = get().messages[roomId] || [];
    const updated = current.map(msg => 
      messageIds.includes(msg.id) ? { ...msg, status } : msg
    );
    set({
      messages: {
        ...get().messages,
        [roomId]: updated,
      },
    });
  },
  
  clearRoomUnreadCount: (roomId) => {
    const rooms = get().rooms.map(room =>
      room.id === roomId ? { ...room, unreadCount: 0 } : room
    );
    set({ rooms });
  },

  incrementRoomUnreadCount: (roomId) => {
    // Don't increment if currently in that room
    if (get().activeRoomId === roomId) return;

    const rooms = get().rooms.map(room =>
      room.id === roomId 
        ? { ...room, unreadCount: (room.unreadCount || 0) + 1 } 
        : room
    );
    set({ rooms });
  },
  
  setOnlineUsers: (nips) => {
    set({ onlineUsers: new Set(nips) });
  },
  
  setUserOnline: (nip) => {
    const newSet = new Set(get().onlineUsers);
    newSet.add(nip);
    set({ onlineUsers: newSet });
  },
  
  setUserOffline: (nip) => {
    const newSet = new Set(get().onlineUsers);
    newSet.delete(nip);
    set({ onlineUsers: newSet });
  },
  
  addTypingUser: (roomId, nip, nama) => {
    const current = get().typingUsers[roomId] || [];
    if (!current.find(u => u.nip === nip)) {
      set({
        typingUsers: {
          ...get().typingUsers,
          [roomId]: [...current, { nip, nama }],
        },
      });
    }
  },
  
  removeTypingUser: (roomId, nip) => {
    const current = get().typingUsers[roomId] || [];
    set({
      typingUsers: {
        ...get().typingUsers,
        [roomId]: current.filter(u => u.nip !== nip),
      },
    });
  },
  
  updateRoomLastMessage: (roomId, message) => {
    const updatedRooms = get().rooms.map(room =>
      room.id === roomId
        ? { ...room, lastMessage: message, updatedAt: message.createdAt }
        : room
    );
    // Sort by updatedAt - create new sorted array to ensure React detects change
    const sortedRooms = [...updatedRooms].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    set({ rooms: sortedRooms });
  },
}));
