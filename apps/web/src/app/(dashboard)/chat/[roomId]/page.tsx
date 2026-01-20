'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useChatStore, useAuthStore } from '@/stores';
import { fetchAPI, formatMessageTime, getInitials } from '@/lib/utils';
import { joinRoom, leaveRoom, sendMessage, startTyping, stopTyping, markMessagesRead, deleteMessage } from '@/lib/socket';
import type { ApiResponse, Message, PaginatedResponse, Attachment, ChatRoom } from '@/lib/types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Send, MapPin, ArrowLeft, MoreVertical, FileText, Download, Check, CheckCheck, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { FileAttachment } from '@/components/chat/FileAttachment';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function ChatRoomPage() {
  const params = useParams();
  const roomId = params.roomId as string;
  
  const { user } = useAuthStore();
  const { rooms, messages, setMessages, setActiveRoom, typingUsers, onlineUsers, clearRoomUnreadCount } = useChatStore();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [localRoom, setLocalRoom] = useState<ChatRoom | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Try to get room from store, or use local state
  const storeRoom = rooms.find(r => r.id === roomId);
  const room = storeRoom || localRoom;
  const roomMessages = messages[roomId] || [];
  const currentTyping = typingUsers[roomId] || [];

  // Fetch room details if not in store (fallback for direct URL access)
  useEffect(() => {
    if (!roomId || storeRoom) return;
    
    fetchAPI<ApiResponse<ChatRoom>>(`/api/chat/rooms/${roomId}`)
      .then(response => {
        if (response.success && response.data) {
          // Only set local room, don't overwrite store - layout will fetch all rooms
          setLocalRoom(response.data);
        }
      })
      .catch(console.error);
  }, [roomId, storeRoom]);

  // For private chats, show the other member's name and online status
  const { displayName, isOnline, otherMemberNip } = useMemo(() => {
    if (room?.type === 'PRIVATE' && room.members && room.members.length > 0) {
      const otherMember = room.members.find(m => m.userNip !== user?.nip);
      if (otherMember?.user) {
        return {
          displayName: otherMember.user.nama,
          isOnline: onlineUsers.has(otherMember.userNip),
          otherMemberNip: otherMember.userNip,
        };
      }
    }
    return { displayName: room?.nama || 'Chat Room', isOnline: false, otherMemberNip: null };
  }, [room, user?.nip, onlineUsers]);

  // Scroll to bottom (instant for initial load, smooth for new messages)
  const scrollToBottom = useCallback((instant = false) => {
    messagesEndRef.current?.scrollIntoView({ behavior: instant ? 'instant' : 'smooth' });
  }, []);

  // Load messages
  useEffect(() => {
    if (!roomId) return;

    setActiveRoom(roomId);
    joinRoom(roomId);
    clearRoomUnreadCount(roomId); // Clear unread badge when opening chat
    
    fetchAPI<PaginatedResponse<Message>>(`/api/chat/rooms/${roomId}/messages`)
      .then(response => {
        if (response.success && response.data) {
          setMessages(roomId, response.data.reverse());
          setHasMore(response.pagination.hasMore);
          // Scroll to bottom instantly on initial load
          setTimeout(() => scrollToBottom(true), 100);
        }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));

    return () => {
      setActiveRoom(null);
      leaveRoom(roomId);
    };
  }, [roomId, setActiveRoom, setMessages, scrollToBottom]);

  // Scroll smoothly when new messages arrive
  useEffect(() => {
    if (!isLoading && roomMessages.length > 0) {
      scrollToBottom(false);
    }
  }, [roomMessages.length, isLoading, scrollToBottom]);

  // Mark messages as read when viewing (optimized - only mark once)
  const markedAsReadRef = useRef<Set<string>>(new Set());
  
  useEffect(() => {
    // Reset marked set when room changes
    markedAsReadRef.current = new Set();
  }, [roomId]);
  
  useEffect(() => {
    if (!roomId || !user?.nip || roomMessages.length === 0 || isLoading) return;
    
    // Find unread messages from other users that haven't been marked yet
    const unreadMessageIds = roomMessages
      .filter(msg => 
        msg.senderNip !== user.nip && 
        msg.status !== 'READ' && 
        !markedAsReadRef.current.has(msg.id)
      )
      .map(msg => msg.id);
    
    if (unreadMessageIds.length > 0) {
      // Add to tracked set immediately to prevent duplicate calls
      unreadMessageIds.forEach(id => markedAsReadRef.current.add(id));
      markMessagesRead(roomId, unreadMessageIds);
    }
  }, [roomId, roomMessages.length, user?.nip, isLoading]);

  // Handle typing indication
  const handleTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    } else {
      startTyping(roomId);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping(roomId);
      typingTimeoutRef.current = null;
    }, 2000);
  }, [roomId]);

  // Send message
  const handleSend = useCallback(() => {
    const text = messageText.trim();
    if (!text || isSending) return;

    setIsSending(true);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      stopTyping(roomId);
    }

    sendMessage({ roomId, body: text }, (response) => {
      setIsSending(false);
      if (response.success) {
        setMessageText('');
        inputRef.current?.focus();
      } else {
        console.error('Send failed:', response.error);
      }
    });
  }, [messageText, roomId, isSending]);

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="h-16 border-b px-4 flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div>
            <Skeleton className="h-4 w-32 mb-1" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <div className="flex-1 p-4 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className={`flex ${i % 2 === 0 ? '' : 'justify-end'}`}>
              <Skeleton className="h-16 w-48 rounded-2xl" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white dark:bg-slate-950">
      {/* Header */}
      <header className="h-16 shrink-0 border-b border-slate-200 dark:border-slate-800 px-4 flex items-center gap-3 bg-white dark:bg-slate-950">
        <Link href="/" className="lg:hidden">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        
        <Avatar className="h-10 w-10">
          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-400 text-white text-sm">
            {getInitials(displayName)}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-slate-900 dark:text-white truncate">
            {displayName}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {room?.type === 'BIDANG' && 'Grup Bidang'}
            {room?.type === 'PROYEK' && room.proyekNama}
            {room?.type === 'PRIVATE' && (
              <span className="flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-slate-400'}`} />
                {isOnline ? 'Online' : 'Offline'}
              </span>
            )}
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/map?room=${roomId}`}>
                <MapPin className="mr-2 h-4 w-4" />
                Lihat Lokasi Laporan
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Messages - flex-1 with min-h-0 to allow shrinking */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <ScrollArea className="h-full p-4">
          <div className="space-y-4 pb-4">
          {roomMessages.map((msg) => {
            const isOwn = msg.senderNip === user?.nip;
            
            const handleDeleteMessage = () => {
              if (!confirm('Hapus pesan ini?')) return;
              deleteMessage(roomId, msg.id, (response) => {
                if (!response.success) {
                  console.error('Delete failed:', response.error);
                }
              });
            };
            
            return (
              <div 
                key={msg.id} 
                className={`flex gap-2 group ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                {!isOwn && (
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="bg-slate-200 dark:bg-slate-700 text-xs">
                      {getInitials(msg.sender.nama)}
                    </AvatarFallback>
                  </Avatar>
                )}
                
                <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'}`}>
                  {!isOwn && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1 px-1">
                      {msg.sender.nama}
                    </p>
                  )}
                  
                  <div 
                    className={`rounded-2xl px-4 py-2 ${
                      isOwn 
                        ? 'bg-blue-600 text-white rounded-br-md' 
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-bl-md'
                    }`}
                  >
                    {msg.isReport && msg.locationData && (
                      <div className={`flex items-center gap-1 text-xs mb-1 ${isOwn ? 'text-blue-200' : 'text-slate-500'}`}>
                        <MapPin className="h-3 w-3" />
                        Laporan Proyek
                      </div>
                    )}
                    
                    {/* Attachments */}
                    {msg.attachments && Array.isArray(msg.attachments) && msg.attachments.length > 0 && (
                      <div className="mb-2 space-y-2">
                        {(msg.attachments as Attachment[]).map((att, idx) => (
                          att.mimetype?.startsWith('image/') ? (
                            <a 
                              key={idx}
                              href={`${process.env.NEXT_PUBLIC_BACKEND_URL}${att.url}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block"
                            >
                              <img 
                                src={`${process.env.NEXT_PUBLIC_BACKEND_URL}${att.url}`}
                                alt={att.originalName || 'attachment'}
                                className="max-w-full rounded-lg max-h-60 object-cover"
                              />
                            </a>
                          ) : (
                            <a
                              key={idx}
                              href={`${process.env.NEXT_PUBLIC_BACKEND_URL}${att.url}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`flex items-center gap-2 p-2 rounded-lg ${
                                isOwn ? 'bg-blue-500/30' : 'bg-slate-200 dark:bg-slate-700'
                              }`}
                            >
                              <FileText className="h-5 w-5 shrink-0" />
                              <span className="text-sm truncate flex-1">{att.originalName || 'File'}</span>
                              <Download className="h-4 w-4 shrink-0" />
                            </a>
                          )
                        ))}
                      </div>
                    )}
                    
                  <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                  </div>
                  
                  <p className={`text-xs text-slate-400 mt-1 px-1 flex items-center gap-1 ${isOwn ? 'justify-end' : ''}`}>
                    {formatMessageTime(msg.createdAt)}
                    {isOwn && (
                      msg.status === 'READ' ? (
                        <CheckCheck className="h-3.5 w-3.5 text-blue-400" />
                      ) : msg.status === 'DELIVERED' ? (
                        <CheckCheck className="h-3.5 w-3.5" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )
                    )}
                  </p>
                </div>
                
                {/* Delete button for own messages */}
                {isOwn && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity self-center"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem 
                        onClick={handleDeleteMessage}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Hapus Pesan
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            );
          })}
          
          {/* Typing indicator */}
          {currentTyping.length > 0 && (
            <div className="flex gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-slate-200 dark:bg-slate-700 text-xs">
                  {getInitials(currentTyping[0].nama)}
                </AvatarFallback>
              </Avatar>
              <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl px-4 py-2">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-950">
        <div className="flex items-end gap-2">
          <FileAttachment 
            onFilesSelected={(attachments, caption) => {
              // Send message with attachments and optional caption
              sendMessage({ roomId, body: caption || '', attachments }, (response) => {
                if (!response.success) {
                  console.error('Send attachment failed:', response.error);
                }
              });
            }}
          />
          
          <Textarea
            ref={inputRef}
            value={messageText}
            onChange={(e) => {
              setMessageText(e.target.value);
              handleTyping();
            }}
            onKeyDown={handleKeyDown}
            placeholder="Ketik pesan..."
            className="min-h-[44px] max-h-32 resize-none rounded-2xl bg-slate-100 dark:bg-slate-800 border-0"
            rows={1}
          />
          
          <Button 
            onClick={handleSend}
            disabled={!messageText.trim() || isSending}
            size="icon"
            className="shrink-0 rounded-full bg-blue-600 hover:bg-blue-700"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
