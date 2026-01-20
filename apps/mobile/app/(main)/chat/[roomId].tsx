import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Text,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, Stack, useFocusEffect } from 'expo-router';
import { useChatStore, useAuthStore } from '../../../stores';
import { fetchRoomMessages, fetchRoomDetails } from '../../../lib/api';
import {
  joinRoom,
  leaveRoom,
  sendMessage as socketSendMessage,
  startTyping,
  stopTyping,
  markMessagesRead,
  getSocket,
} from '../../../lib/socket';
import { ChatBubble } from '../../../components/ChatBubble';
import { ChatInput } from '../../../components/ChatInput';
import { setBadgeCount } from '../../../lib/notifications';
import type { Message, ChatRoom } from '../../../lib/types';

export default function ChatRoomScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const { user } = useAuthStore();
  const {
    messages,
    setMessages,
    prependMessages,
    appendMessages, // We need to add this to store if not exists, or just use correct setter
    setActiveRoom,
    clearRoomUnreadCount,
    typingUsers,
    getTotalUnreadCount,
  } = useChatStore();
  const [room, setRoom] = useState<ChatRoom | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  // Messages for this room
  // We want them ordered Newest -> Oldest for Inverted FlatList
  // The store usually keeps them Oldest -> Newest (ASC).
  // Let's reverse them for display if the store is ASC.
  // Actually, let's check how we store them. 
  // Previous code: setMessages(roomId, reversed) -> so store was ASC.
  // New approach: We want store to be DESC or valid for inverted.
  // Let's just reverse the slice from the store for rendering to be safe and easy.
  const rawMessages = messages[roomId!] || [];
  // Verify order:
  // If stored ASC (oldest at 0), then for inverted list (newest at bottom visually, 0 index logic),
  // we need the array to be [Newest, ..., Oldest].
  // So we reverse the ASC array.
  const displayMessages = [...rawMessages].reverse();

  useFocusEffect(
    useCallback(() => {
      if (!roomId) return;

      setActiveRoom(roomId);
      clearRoomUnreadCount(roomId);
      joinRoom(roomId);

      // Update badge count
      const totalUnread = getTotalUnreadCount();
      setBadgeCount(totalUnread);

      // Load room details and messages
      loadRoomDetails();
      loadMessages(true);

      return () => {
        leaveRoom(roomId);
        setActiveRoom(null);
      };
    }, [roomId])
  );

  // Mark messages as read when they are displayed
  useEffect(() => {
    if (rawMessages.length > 0 && user) {
      const unreadMessageIds = rawMessages
        .filter((m) => m.senderNip !== user.nip && m.status !== 'READ')
        .map((m) => m.id);

      if (unreadMessageIds.length > 0) {
        markMessagesRead(roomId!, unreadMessageIds);
      }
    }
  }, [rawMessages, user, roomId]);

  const loadRoomDetails = async () => {
    try {
      const response = await fetchRoomDetails(roomId!);
      if (response.success && response.data) {
        setRoom(response.data);
      }
    } catch (error) {
      console.error('Error loading room details:', error);
    }
  };

  // Get display name for the room
  const displayName = React.useMemo(() => {
    if (!room) return 'Chat';
    
    if (room.type === 'PRIVATE' && room.members) {
      // For private chat, show other user's name
      const otherMember = room.members.find((m) => m.user.nip !== user?.nip);
      return otherMember?.user.nama || room.nama;
    }
    return room.nama;
  }, [room, user]);

  const loadMessages = async (initial = false) => {
    if (!initial && !hasMore) return;
    if (!initial && isLoading) return; 

    try {
      setIsLoading(true);
      const response = await fetchRoomMessages(roomId!, initial ? undefined : cursor || undefined);
      
      if (response.success && response.data) {
        // Backend returns: { success, data: Message[], pagination: {...} }
        // Backend Data order: DESC (Newest first) [MsgN, MsgN-1, ...]
        const newMessages = response.data; // DESC
        const paginationInfo = (response as any).pagination;

        if (Array.isArray(newMessages) && newMessages.length > 0) {
          // If we want to store ASC (Standard logic often implies ASC for appending)
          // We get DESC.
          // reversedMessages = ASC [Oldest, ... Newest]
          const ascMessages = [...newMessages].reverse();
          
          if (initial) {
            setMessages(roomId!, ascMessages);
          } else {
            // Prepend older messages (which are logically 'before' the current oldest)
            // Store has: [Old1, Old2, New1]
            // We fetched: [Oldest1, Oldest2] (DESC from backend) -> reversed to [Oldest2, Oldest1]
            // We want [Oldest2, Oldest1, Old1, Old2, New1]
            prependMessages(roomId!, ascMessages);
          }
          
          setHasMore(paginationInfo?.hasMore || false);
          
          // Cursor for next page (older messages)
          // Backend is cursor-based on DESC list. The last item in newMessages (DESC) is the oldest.
          const oldestMessage = newMessages[newMessages.length - 1]; // Last item in DESC array
          setCursor(oldestMessage.createdAt);
        } else {
          if (initial) {
            setMessages(roomId!, []);
          }
          setHasMore(false);
        }
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      if (initial) {
        setMessages(roomId!, []);
      }
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = (messageText: string) => {
    if (!roomId || !messageText.trim()) return;

    setIsSending(true);

    socketSendMessage(
      {
        roomId,
        body: messageText.trim(),
      },
      (response) => {
        setIsSending(false);
        if (!response.success) {
          console.error('Failed to send message:', response.error);
        }
      }
    );
  };

  const handleTyping = () => {
    if (roomId) startTyping(roomId);
  };

  const handleStopTyping = () => {
    if (roomId) stopTyping(roomId);
  };

  const handleLoadMore = () => {
    if (!isLoading && hasMore) {
      loadMessages(false);
    }
  };

  const typingIndicator = typingUsers[roomId!] || [];
  const typingText =
    typingIndicator.length > 0
      ? typingIndicator.length === 1
        ? `${typingIndicator[0].nama} sedang mengetik...`
        : `${typingIndicator.length} orang sedang mengetik...`
      : null;

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    // Check if next message (visually below, so logically newer? No, Inverted list)
    // Inverted List: Index 0 is bottom (newest). Index 1 is older.
    // We render from bottom up.
    // displayMessages: [Newest(0), Older(1), Oldest(N)]
    
    // Grouping logic:
    // Show name if:
    // 1. Message isn't own
    // 2. AND (It's the oldest message OR previous message (index+1) is different sender or too much gap)
    
    const prevMessage = displayMessages[index + 1]; // Older message
    const nextMessage = displayMessages[index - 1]; // Newer message
    
    const isFirstInSequence = !prevMessage || prevMessage.senderNip !== item.senderNip;
    const isLastInSequence = !nextMessage || nextMessage.senderNip !== item.senderNip;

    return (
      <View style={{ marginBottom: isLastInSequence ? 8 : 2 }}>
        <ChatBubble 
          message={item} 
          isOwn={item.senderNip === user?.nip} 
          showSenderName={isFirstInSequence}
        />
      </View>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: displayName,
          headerTitleStyle: { fontWeight: '600', fontSize: 16 },
          headerShadowVisible: false,
          headerStyle: { backgroundColor: '#f0f2f5' },
        }}
      />
      <View style={styles.container}>
        <FlatList
          ref={flatListRef}
          data={displayMessages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          inverted={true}
          contentContainerStyle={styles.messageList}
          onEndReached={handleLoadMore} // Inverted: onEndReached is top (oldest)
          onEndReachedThreshold={0.5}
          ListFooterComponent={ // Inverted: Footer is at the TOP (loading older messages)
            isLoading && hasMore ? (
              <View style={styles.loadingMore}>
                <ActivityIndicator size="small" color="#3b82f6" />
              </View>
            ) : null
          }
          ListEmptyComponent={
            !isLoading ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Belum ada pesan</Text>
                <Text style={styles.emptySubtext}>Kirim pesan pertama!</Text>
              </View>
            ) : null
          }
        />

        {typingText && (
          <View style={styles.typingContainer}>
            <Text style={styles.typingText}>{typingText}</Text>
          </View>
        )}

        <ChatInput
          onSend={handleSend}
          onTyping={handleTyping}
          onStopTyping={handleStopTyping}
          isSending={isSending}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#efeae2', // WhatsApp-like background
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageList: {
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  loadingMore: {
    paddingVertical: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    transform: [{ scaleY: -1 }], // Counteract inverted FlatList if empty works weirdly, but usually fine
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94a3b8',
  },
  typingContainer: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    backgroundColor: 'transparent',
    position: 'absolute',
    bottom: 70, // Above input
    left: 0,
    zIndex: 10,
  },
  typingText: {
    fontSize: 12,
    color: '#64748b',
    fontStyle: 'italic',
    backgroundColor: 'rgba(255,255,255,0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
});
