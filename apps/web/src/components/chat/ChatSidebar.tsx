'use client';

import { useChatStore, useAuthStore } from '@/stores';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { getInitials, truncate, formatRelativeTime } from '@/lib/utils';
import { MessageSquare, Building2, FolderOpen, User, Search, MapPin, LogOut, Plus, MoreVertical } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useMemo } from 'react';
import type { ChatRoom } from '@/lib/types';
import { CreateRoomDialog } from './CreateRoomDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

interface ChatSidebarProps {
  onRoomSelect?: () => void;
}

const roomTypeIcons = {
  BIDANG: Building2,
  PROYEK: FolderOpen,
  PRIVATE: User,
};

const roomTypeLabels = {
  BIDANG: 'Bidang',
  PROYEK: 'Proyek',
  PRIVATE: 'Private',
};

export function ChatSidebar({ onRoomSelect }: ChatSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { rooms } = useChatStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'BIDANG' | 'PROYEK' | 'PRIVATE'>('all');
  const [showSearch, setShowSearch] = useState(false);

  const filteredRooms = useMemo(() => {
    return rooms.filter(room => {
      const matchesSearch = room.nama.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = filter === 'all' || room.type === filter;
      return matchesSearch && matchesFilter;
    });
  }, [rooms, searchQuery, filter]);

  // Group rooms by type
  const groupedRooms = useMemo(() => {
    const groups: Record<string, ChatRoom[]> = {
      BIDANG: [],
      PROYEK: [],
      PRIVATE: [],
    };
    
    filteredRooms.forEach(room => {
      if (groups[room.type]) {
        groups[room.type].push(room);
      }
    });
    
    return groups;
  }, [filteredRooms]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    logout();
    router.replace('/auth/login');
  };

  const RoomItem = ({ room }: { room: ChatRoom }) => {
    const isActive = pathname === `/chat/${room.id}`;
    const Icon = roomTypeIcons[room.type];
    const { onlineUsers } = useChatStore();
    
    // For private chats, show the other member's name and online status
    const { displayName, isOnline } = useMemo(() => {
      if (room.type === 'PRIVATE' && room.members && room.members.length > 0) {
        const otherMember = room.members.find(m => m.userNip !== user?.nip);
        if (otherMember?.user) {
          return {
            displayName: otherMember.user.nama,
            isOnline: onlineUsers.has(otherMember.userNip),
          };
        }
      }
      return { displayName: room.nama, isOnline: false };
    }, [room, onlineUsers]);
    
    return (
      <Link
        href={`/chat/${room.id}`}
        onClick={onRoomSelect}
        className={`
          flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors
          ${isActive 
            ? 'bg-slate-100 dark:bg-slate-800' 
            : 'hover:bg-slate-50 dark:hover:bg-slate-900'}
        `}
      >
        <div className="relative shrink-0">
          <Avatar className="h-12 w-12">
            <AvatarFallback className={`
              text-lg font-medium text-white
              ${room.type === 'BIDANG' ? 'bg-indigo-400' : ''}
              ${room.type === 'PROYEK' ? 'bg-orange-400' : ''}
              ${room.type === 'PRIVATE' ? 'bg-slate-400' : ''}
            `}>
              {room.type === 'BIDANG' ? <Building2 className="w-6 h-6" /> : 
               room.type === 'PROYEK' ? <FolderOpen className="w-6 h-6" /> :
               getInitials(displayName)}
            </AvatarFallback>
          </Avatar>
          {/* Online indicator for private chats */}
          {room.type === 'PRIVATE' && isOnline && (
            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-slate-950 rounded-full" />
          )}
        </div>

        <div className="flex-1 min-w-0 border-b border-slate-100 dark:border-slate-800 pb-3 -mb-3 group-last:border-0">
          <div className="flex items-center justify-between mb-0.5">
            <span className="font-semibold text-base text-slate-900 dark:text-white truncate max-w-[70%]">
              {displayName}
            </span>
             {room.lastMessage && (
              <span className={`text-xs ${room.unreadCount ? 'text-green-500 font-medium' : 'text-slate-500 dark:text-slate-400'}`}>
                {formatRelativeTime(room.lastMessage.createdAt).replace(' yang lalu', '')}
              </span>
            )}
          </div>
          
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 min-w-0 flex-1 overflow-hidden">
              {room.lastMessage ? (
                <>
                   <span className="shrink-0">{room.lastMessage.sender.nama.split(' ')[0]}:</span>
                   {room.lastMessage.body ? (
                    <span className="truncate">{room.lastMessage.body}</span>
                   ) : room.lastMessage.attachments?.length ? (
                    <span className="flex items-center gap-1 truncate">
                      <span className="text-xs shrink-0">📎</span>
                      <span className="truncate">{room.lastMessage.attachments[0].originalName || 'File'}</span>
                    </span>
                   ) : null}
                </>
              ) : (
                <span className="italic opacity-70">Belum ada pesan</span>
              )}
            </div>

            {(room.unreadCount || 0) > 0 && (
              <div className="h-5 min-w-5 rounded-full bg-green-500 text-white text-[10px] font-bold flex items-center justify-center px-1.5 shrink-0">
                {(room.unreadCount || 0) > 99 ? '99+' : (room.unreadCount || 0)}
              </div>
            )}
          </div>
        </div>
      </Link>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[var(--wa-bg-default)] dark:bg-[var(--wa-bg-default)] relative">
      {/* Chat Header */}
      <div className="p-3 bg-[var(--wa-header-bg)] text-white shadow-md z-10">
        <div className="flex items-center justify-between mb-0">
          <div className="flex items-center gap-3">
            <h1 className="font-bold text-xl tracking-tight">Chat DPUPR</h1>
          </div>

          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              className={`text-white hover:bg-white/10 rounded-full h-10 w-10 ${showSearch ? 'bg-white/20' : ''}`}
              onClick={() => {
                setShowSearch(!showSearch);
                if (showSearch) setSearchQuery('');
              }}
            >
              <Search className="w-5 h-5" />
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 rounded-full h-10 w-10">
                  <MoreVertical className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-[var(--card)]">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span>{user?.nama}</span>
                    <span className="text-xs text-muted-foreground font-normal">{user?.nip}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/map">
                    <MapPin className="mr-2 h-4 w-4" />
                    Peta Laporan
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  Keluar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Search Bar */}
        {showSearch && (
          <div className="mt-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari percakapan..."
                className="pl-9 bg-white/90 dark:bg-slate-800 border-0 focus-visible:ring-1 focus-visible:ring-white/50 text-slate-900 dark:text-white placeholder:text-slate-400"
                autoFocus
              />
            </div>
          </div>
        )}

        {/* Tab-like filter */}
        <div className="flex items-center gap-2 mt-2 overflow-x-auto pb-1 scrollbar-hide">
          {(['all', 'BIDANG', 'PROYEK', 'PRIVATE'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`
                px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap
                ${filter === f 
                  ? 'bg-white text-[var(--wa-teal)] dark:bg-[var(--wa-incoming-bg)] dark:text-[var(--wa-teal-dark)]' 
                  : 'bg-white/10 text-white hover:bg-white/20'}
              `}
            >
              {f === 'all' ? 'Semua' : roomTypeLabels[f]}
            </button>
          ))}
        </div>
      </div>

      {/* Room List */}
      <ScrollArea className="flex-1 bg-white dark:bg-[var(--background)]">
        <div className="py-2">
          {filter === 'all' ? (
            Object.entries(groupedRooms).map(([type, typeRooms]) => {
              if (typeRooms.length === 0) return null;
              return (
                <div key={type} className="mb-0">
                   {/* Optional Divider for groups */}
                  <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900/50 text-xs font-bold text-[var(--wa-teal)] uppercase tracking-wider">
                    {roomTypeLabels[type as keyof typeof roomTypeLabels]}
                  </div>
                  {typeRooms.map(room => (
                    <RoomItem key={room.id} room={room} />
                  ))}
                </div>
              );
            })
          ) : (
             filteredRooms.map(room => (
              <RoomItem key={room.id} room={room} />
            ))
          )}
          
          {filteredRooms.length === 0 && (
            <div className="text-center py-12">
              <MessageSquare className="h-16 w-16 text-slate-300 dark:text-slate-600 mx-auto mb-4 opacity-50" />
              <p className="text-slate-500 dark:text-slate-400">
                {searchQuery ? 'Tidak ditemukan' : 'Belum ada percakapan'}
              </p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Floating Action Buttons */}
      <div className="absolute bottom-6 right-6 flex flex-col gap-4 items-end pointer-events-none">
         {/* Small FAB for Proyek */}
        <CreateRoomDialog 
            type="PROYEK"
            trigger={
              <Button size="icon" className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 shadow-lg pointer-events-auto hover:bg-slate-200 dark:hover:bg-slate-600">
                <FolderOpen className="h-5 w-5" />
              </Button>
            }
        />

        {/* Main FAB for New Chat */}
        <CreateRoomDialog 
            type="PRIVATE"
            trigger={
              <Button size="icon" className="h-14 w-14 rounded-2xl bg-[var(--wa-teal)] hover:bg-[var(--wa-teal-dark)] text-white shadow-xl pointer-events-auto transition-transform hover:scale-105 active:scale-95">
                <MessageSquare className="h-7 w-7" />
              </Button>
            }
        />
      </div>
    </div>
  );
}
