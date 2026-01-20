'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore, useChatStore } from '@/stores';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import { fetchAPI } from '@/lib/utils';
import { requestNotificationPermission, showMessageNotification, playNotificationSound, updateBadgeCount } from '@/lib/notifications';
import type { ApiResponse, ChatRoom, Message } from '@/lib/types';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu, LogOut } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const { token, user, isAuthenticated, logout } = useAuthStore();
  const { setRooms, addMessage, setOnlineUsers, setUserOnline, setUserOffline, addTypingUser, removeTypingUser, updateRoomLastMessage, incrementRoomUnreadCount } = useChatStore();
  const [isHydrated, setIsHydrated] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Wait for Zustand hydration and request notification permission
  useEffect(() => {
    setIsHydrated(true);
    // Request notification permission
    requestNotificationPermission();
  }, []);

  // Check auth after hydration
  useEffect(() => {
    if (!isHydrated) return;
    
    if (!isAuthenticated || !token) {
      router.replace('/auth/login');
    }
  }, [isHydrated, isAuthenticated, token, router]);

  // Connect socket and fetch rooms
  useEffect(() => {
    if (!isHydrated || !token || !isAuthenticated) return;

    // Connect socket
    const socket = connectSocket(token);

    // Fetch rooms
    fetchAPI<ApiResponse<ChatRoom[]>>('/api/chat/rooms')
      .then(response => {
        if (response.success && response.data) {
          setRooms(response.data);
        }
      })
      .catch(console.error);

    // Socket event listeners
    socket.on('message:new', (message: Message) => {
      addMessage(message.roomId, message);
      updateRoomLastMessage(message.roomId, message);
      
      // Show notification if message is not from current user
      if (message.senderNip !== user?.nip) {
        incrementRoomUnreadCount(message.roomId);
        
        // Update badge count for Electron desktop app
        const currentRooms = useChatStore.getState().rooms;
        const totalUnread = currentRooms.reduce((sum, room) => sum + (room.unreadCount || 0), 0) + 1;
        updateBadgeCount(totalUnread);
        
        const room = currentRooms.find(r => r.id === message.roomId);
        const roomName = room?.nama || 'Chat';
        
        showMessageNotification(message, roomName, {
          onClick: () => {
            router.push(`/chat/${message.roomId}`);
          }
        });
        playNotificationSound();
      }
    });

    // Receive list of all online users when connecting
    socket.on('users:online', (nips: string[]) => {
      setOnlineUsers(nips);
    });

    socket.on('user:online', (nip: string) => {
      setUserOnline(nip);
    });

    socket.on('user:offline', (nip: string) => {
      setUserOffline(nip);
    });

    socket.on('user:typing', ({ roomId, nip, nama }) => {
      addTypingUser(roomId, nip, nama);
    });

    socket.on('user:stop-typing', ({ roomId, nip }) => {
      removeTypingUser(roomId, nip);
    });

    // Listen for read receipts - update message status
    socket.on('messages:read', ({ roomId, messageIds }) => {
      const { updateMessagesStatus } = useChatStore.getState();
      updateMessagesStatus(roomId, messageIds, 'READ');
    });

    // Listen for deleted messages
    socket.on('message:deleted', ({ roomId, messageId }) => {
      const { removeMessage } = useChatStore.getState();
      removeMessage(roomId, messageId);
    });

    return () => {
      disconnectSocket();
    };
  }, [isHydrated, token, isAuthenticated, setRooms, addMessage, setOnlineUsers, setUserOnline, setUserOffline, addTypingUser, removeTypingUser, updateRoomLastMessage, user?.nip, router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    logout();
    router.replace('/auth/login');
  };

  // Show loading while hydrating or not authenticated
  if (!isHydrated || (!isAuthenticated && !token)) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(w => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="h-screen flex bg-slate-50 dark:bg-slate-900">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-80 flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
        <ChatSidebar />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header (Mobile) */}
        <header className="lg:hidden flex items-center justify-between px-4 h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 p-0">
              <SheetTitle className="sr-only">Menu Navigasi</SheetTitle>
              <ChatSidebar onRoomSelect={() => setSidebarOpen(false)} />
            </SheetContent>
          </Sheet>

          <h1 className="font-semibold text-slate-900 dark:text-white">Chat DPUPR</h1>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-blue-100 text-blue-700 text-xs">
                    {user?.nama ? getInitials(user.nama) : 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span>{user?.nama}</span>
                  <span className="text-xs text-muted-foreground font-normal">{user?.bidang?.nama}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                Keluar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Page Content */}
        <main className="flex-1 min-h-0 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
