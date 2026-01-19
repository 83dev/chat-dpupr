'use client';

import { useChatStore, useAuthStore } from '@/stores';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { getInitials, truncate, formatRelativeTime } from '@/lib/utils';
import { MessageSquare, Building2, FolderOpen, User, Search, MapPin, LogOut, Plus } from 'lucide-react';
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
          flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200
          ${isActive 
            ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800' 
            : 'hover:bg-slate-100 dark:hover:bg-slate-800/50'
          }
        `}
      >
        <div className="relative">
          <Avatar className="h-12 w-12">
            <AvatarFallback className={`
              text-sm font-medium
              ${room.type === 'BIDANG' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' : ''}
              ${room.type === 'PROYEK' ? 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300' : ''}
              ${room.type === 'PRIVATE' ? 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300' : ''}
            `}>
              {getInitials(displayName)}
            </AvatarFallback>
          </Avatar>
          {/* Online indicator for private chats */}
          {room.type === 'PRIVATE' && isOnline && (
            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-slate-950 rounded-full" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`font-medium truncate ${isActive ? 'text-blue-700 dark:text-blue-300' : 'text-slate-900 dark:text-white'}`}>
              {displayName}
            </span>
            {(room.unreadCount || 0) > 0 && (
              <Badge className="h-5 min-w-5 rounded-full bg-blue-600 hover:bg-blue-600 text-[10px] px-1.5">
                {(room.unreadCount || 0) > 99 ? '99+' : (room.unreadCount || 0)}
              </Badge>
            )}
          </div>
          {room.lastMessage && (
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
              <span className="font-medium">{room.lastMessage.sender.nama.split(' ')[0]}:</span>{' '}
              {room.lastMessage.body ? (
                truncate(room.lastMessage.body, 30)
              ) : room.lastMessage.attachments && room.lastMessage.attachments.length > 0 ? (
                <span className="flex items-center gap-1">
                  📎 {room.lastMessage.attachments[0].mimetype?.startsWith('image/') ? 'Gambar' : 'Dokumen'}
                </span>
              ) : (
                'Pesan'
              )}
            </p>
          )}
        </div>

        {room.lastMessage && (
          <span className="text-[10px] text-slate-400 shrink-0">
            {formatRelativeTime(room.lastMessage.createdAt).replace(' yang lalu', '')}
          </span>
        )}
      </Link>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-slate-900 dark:text-white">DPUPR Chat</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">{user?.bidang?.nama || 'Internal'}</p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-slate-200 dark:bg-slate-700 text-sm">
                    {user?.nama ? getInitials(user.nama) : 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
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

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Cari percakapan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-slate-100 dark:bg-slate-800 border-0 rounded-xl"
          />
        </div>

        {/* Filter */}
        <div className="flex gap-2 mt-3">
          {(['all', 'BIDANG', 'PROYEK', 'PRIVATE'] as const).map(f => (
            <Button
              key={f}
              variant={filter === f ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFilter(f)}
              className={`rounded-full text-xs ${filter === f ? '' : 'text-slate-600 dark:text-slate-400'}`}
            >
              {f === 'all' ? 'Semua' : roomTypeLabels[f]}
            </Button>
          ))}
        </div>

        {/* Create Room Buttons */}
        <div className="flex gap-2 mt-3">
          <CreateRoomDialog 
            type="PROYEK"
            trigger={
              <Button variant="outline" size="sm" className="flex-1 gap-1 text-xs">
                <FolderOpen className="h-3.5 w-3.5" />
                Grup Proyek
              </Button>
            }
          />
          <CreateRoomDialog 
            type="PRIVATE"
            trigger={
              <Button variant="outline" size="sm" className="flex-1 gap-1 text-xs">
                <User className="h-3.5 w-3.5" />
                Private Chat
              </Button>
            }
          />
        </div>
      </div>

      {/* Room List */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-1">
          {filter === 'all' ? (
            // Grouped view
            Object.entries(groupedRooms).map(([type, typeRooms]) => {
              if (typeRooms.length === 0) return null;
              const Icon = roomTypeIcons[type as keyof typeof roomTypeIcons];
              
              return (
                <div key={type} className="mb-4">
                  <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <Icon className="h-3.5 w-3.5" />
                    {roomTypeLabels[type as keyof typeof roomTypeLabels]}
                    <Badge variant="secondary" className="ml-auto text-[10px] h-4">
                      {typeRooms.length}
                    </Badge>
                  </div>
                  {typeRooms.map(room => (
                    <RoomItem key={room.id} room={room} />
                  ))}
                </div>
              );
            })
          ) : (
            // Flat list
            filteredRooms.map(room => (
              <RoomItem key={room.id} room={room} />
            ))
          )}
          
          {filteredRooms.length === 0 && (
            <div className="text-center py-8">
              <MessageSquare className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {searchQuery ? 'Tidak ditemukan' : 'Belum ada percakapan'}
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
