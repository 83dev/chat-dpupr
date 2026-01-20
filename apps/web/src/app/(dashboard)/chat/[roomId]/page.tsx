'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useChatStore, useAuthStore } from '@/stores';
import { fetchAPI, formatMessageTime, getInitials } from '@/lib/utils';
import { sendMessage, startTyping, stopTyping, markMessagesRead, deleteMessage } from '@/lib/socket';
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
      // Note: Don't call leaveRoom() here - we want to stay subscribed to all rooms
      // to receive real-time messages. The backend auto-joins all rooms on connect.
      // leaveRoom() should only be used when actually leaving room membership.
    };
  }, [roomId, setActiveRoom, setMessages, scrollToBottom, clearRoomUnreadCount]);

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
    
    // Find unread messages from other users that:
    // 1. Not sent by current user
    // 2. Not already in markedAsReadRef (already sent mark-read in this session)
    // 3. Current user is NOT in readBy array (hasn't been marked as read in DB)
    const unreadMessageIds = roomMessages
      .filter(msg => {
        if (msg.senderNip === user.nip) return false; // Skip own messages
        if (markedAsReadRef.current.has(msg.id)) return false; // Skip already marked in this session
        
        // Check if user has already read this message (exists in readBy)
        const hasRead = msg.readBy?.some(reader => reader.userNip === user.nip);
        return !hasRead;
      })
      .map(msg => msg.id);
    
    if (unreadMessageIds.length > 0) {
      // Add to tracked set immediately to prevent duplicate calls
      unreadMessageIds.forEach(id => markedAsReadRef.current.add(id));
      markMessagesRead(roomId, unreadMessageIds);
    }
  }, [roomId, roomMessages, user?.nip, isLoading]);

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
    <div className="flex flex-col h-full overflow-hidden bg-[var(--wa-bg-default)] dark:bg-[var(--wa-bg-default)] relative">
      {/* Chat Doodle Background Pattern */}
      <div className="absolute inset-0 opacity-[0.06] dark:opacity-[0.04] pointer-events-none z-0" 
           style={{ backgroundImage: `url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")`, backgroundSize: '400px' }} 
      />

      {/* Header */}
      <header className="h-[60px] shrink-0 bg-[var(--wa-header-bg)] px-2 flex items-center gap-1 z-10 shadow-sm">
        <div className="flex items-center">
            <Link href="/" className="lg:hidden text-white rounded-full p-1 mr-1">
            <ArrowLeft className="h-6 w-6" />
            </Link>
            
            <Avatar className="h-9 w-9 cursor-pointer ml-1">
            <AvatarFallback className="bg-slate-200 dark:bg-slate-700 text-sm font-medium text-slate-700">
                {getInitials(displayName)}
            </AvatarFallback>
            </Avatar>
        </div>
        
        <div className="flex-1 min-w-0 ml-2 cursor-pointer">
          <h2 className="font-semibold text-white text-[16px] truncate leading-tight">
            {displayName}
          </h2>
          <p className="text-xs text-white/80 truncate leading-tight mt-0.5">
            {room?.type === 'BIDANG' && 'Grup Bidang'}
            {room?.type === 'PROYEK' && room.proyekNama}
            {room?.type === 'PRIVATE' && (
              isOnline ? 'Online' : 'Offline' // Chat usually doesn't show offline status text, just nothing or 'last seen'
            )}
          </p>
        </div>

        <div className="flex items-center gap-1">
             {/* Phone/Video icons could go here */}
            {/* <Button variant="ghost" size="icon" className="text-white rounded-full h-10 w-10">
              <Phone className="h-5 w-5" />
            </Button> */}

            <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white rounded-full h-10 w-10">
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
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-hidden z-0">
        <ScrollArea className="h-full px-2 sm:px-4 py-2">
          <div className="space-y-1 pb-4"> {/* Reduced space between messages */}
          {roomMessages.map((msg, index) => {
            const isOwn = msg.senderNip === user?.nip;
            const isFirstInSequence = index === 0 || roomMessages[index - 1].senderNip !== msg.senderNip;
            
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
                className={`group flex w-full ${isOwn ? 'justify-end' : 'justify-start'} ${isFirstInSequence ? 'mt-2' : 'mt-0.5'}`}
              >
                <div 
                  className={`
                    relative max-w-[85%] sm:max-w-[75%] px-2 py-1.5 shadow-sm text-sm rounded-lg
                    ${isOwn 
                      ? 'bg-[var(--wa-outgoing-bg)] dark:bg-[var(--wa-outgoing-bg)] text-slate-900 rounded-tr-none' 
                      : 'bg-[var(--wa-incoming-bg)] dark:bg-[var(--wa-incoming-bg)] text-slate-900 dark:text-gray-100 rounded-tl-none'}
                  `}
                  style={{
                      // Optional: Add subtle "tail" using clip-path or absolute pseudo-element if desired. 
                      // Simple rounded corners work well enough for now.
                  }}
                >
                    {/* Add visual tail via SVG/Pseudo if we want to be very precise, but CSS corners is standard "Modern Chat" web look */}
                    
                  {!isOwn && isFirstInSequence && room?.type !== 'PRIVATE' && (
                    <p className={`text-xs font-bold mb-0.5 px-1 ${
                        // Generating a color based on name hash could be cool, hardcoding acceptable for now
                        'text-orange-600'
                    }`}>
                      {msg.sender.nama}
                    </p>
                  )}
                  
                  <div className="px-1">
                    {msg.isReport && msg.locationData && (
                      <div className={`flex items-center gap-1 text-xs mb-1 p-1 bg-black/5 rounded ${isOwn ? 'text-green-800' : 'text-slate-600'}`}>
                        <MapPin className="h-3 w-3" />
                        Laporan Proyek
                      </div>
                    )}
                    
                    {/* Attachments */}
                    {msg.attachments && Array.isArray(msg.attachments) && msg.attachments.length > 0 && (
                      <div className="mb-1 space-y-1">
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
                                className="max-w-full rounded-md max-h-80 object-cover"
                              />
                            </a>
                          ) : (
                            <a
                              key={idx}
                              href={`${process.env.NEXT_PUBLIC_BACKEND_URL}${att.url}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 p-2 rounded-md bg-black/5 dark:bg-white/10"
                            >
                              <FileText className="h-6 w-6 shrink-0 text-slate-500" />
                              <span className="text-sm truncate flex-1">{att.originalName || 'File'}</span>
                              <Download className="h-4 w-4 shrink-0 opacity-50" />
                            </a>
                          )
                        ))}
                      </div>
                    )}
                    
                  <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.body}</p>
                  </div>
                  
                  {/* Timestamp & Status */}
                  <div className="flex justify-end items-center gap-1 mt-0.5 px-1 select-none">
                    <span className={`text-[10px] ${isOwn ? 'text-green-800/60' : 'text-slate-500'}`}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {isOwn && (
                      <span className={msg.status === 'READ' ? 'text-[var(--wa-check-blue)]' : 'text-[var(--wa-check-gray)]'}>
                        {msg.status === 'READ' ? <CheckCheck className="h-3.5 w-3.5" /> : 
                         msg.status === 'DELIVERED' ? <CheckCheck className="h-3.5 w-3.5" /> : 
                         <Check className="h-3.5 w-3.5" />}
                      </span>
                    )}
                  </div>

                  {/* Delete dropdown for own messages */}
                  {isOwn && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="absolute -left-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 hover:opacity-100 focus:opacity-100 p-1 rounded-full hover:bg-black/10 transition-opacity">
                          <MoreVertical className="h-4 w-4 text-slate-500" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" side="left">
                        <DropdownMenuItem onClick={handleDeleteMessage} className="text-red-600">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Hapus Pesan
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            );
          })}
          
           {/* Typing indicator */}
           {currentTyping.length > 0 && (
            <div className="flex gap-2 ml-4 mt-2">
              <div className="bg-white dark:bg-[var(--wa-incoming-bg)] rounded-lg rounded-tl-none px-4 py-2 shadow-sm">
                <div className="flex gap-1 items-center h-full">
                  <span className="text-xs text-slate-500 mr-2">Typing</span>
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </div>

      {/* Input */}
      <div className="shrink-0 p-2 bg-[var(--wa-bg-default)] z-10 flex items-end gap-2 pb-safe">
          <div className="flex-1 bg-white dark:bg-[var(--wa-incoming-bg)] rounded-[24px] flex items-end shadow-sm border border-transparent focus-within:border-white overflow-hidden min-h-[48px]">
             <div className="pb-3 pl-2">
                 {/* Emoji button could go here */}
                 {/* <Smile className="text-slate-400 h-6 w-6 m-1 cursor-pointer hover:text-slate-600" /> */}
             </div>
             
             <FileAttachment 
                onFilesSelected={(attachments, caption) => {
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
                placeholder="Ketik pesan"
                className="flex-1 min-h-[48px] max-h-32 py-3 px-2 resize-none bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-slate-400"
                rows={1}
            />
             
             <div className="pb-3 pr-3">
                 {/* Camera icon could go here */}
             </div>
          </div>
          
          <Button 
            onClick={handleSend}
            disabled={!messageText.trim() || isSending}
            size="icon"
            className="shrink-0 h-12 w-12 rounded-full bg-[var(--wa-teal)] hover:bg-[var(--wa-teal-dark)] text-white shadow-md mb-0 transition-transform active:scale-95"
          >
            {messageText.trim() ? <Send className="h-5 w-5 ml-0.5" /> : <span className="text-xl">🎙️</span> /* Mic icon placeholder when empty */}
          </Button>
      </div>
    </div>
  );
}
