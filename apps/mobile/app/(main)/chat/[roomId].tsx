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

  const roomMessages = messages[roomId!] || [];

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
    if (roomMessages.length > 0 && user) {
      const unreadMessageIds = roomMessages
        .filter((m) => m.senderNip !== user.nip && m.status !== 'READ')
        .map((m) => m.id);

      if (unreadMessageIds.length > 0) {
        markMessagesRead(roomId!, unreadMessageIds);
      }
    }
  }, [roomMessages, user, roomId]);

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

  const loadMessages = async (initial = false) => {
    if (!initial && !hasMore) return;

    try {
      const response = await fetchRoomMessages(roomId!, initial ? undefined : cursor || undefined);
      if (response.success && response.data) {
        const { messages: newMessages, nextCursor } = response.data;

        if (initial) {
          setMessages(roomId!, newMessages.reverse());
        } else {
          prependMessages(roomId!, newMessages.reverse());
        }

        setCursor(nextCursor);
        setHasMore(!!nextCursor);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
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

  const renderMessage = ({ item }: { item: Message }) => (
    <ChatBubble message={item} isOwn={item.senderNip === user?.nip} />
  );

  if (isLoading && roomMessages.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: room?.nama || 'Chat',
          headerTitleStyle: { fontWeight: '600', fontSize: 16 },
        }}
      />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={roomMessages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          inverted={false}
          contentContainerStyle={styles.messageList}
          onStartReached={handleLoadMore}
          onStartReachedThreshold={0.5}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Belum ada pesan</Text>
              <Text style={styles.emptySubtext}>Kirim pesan pertama!</Text>
            </View>
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
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  messageList: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
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
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  typingText: {
    fontSize: 12,
    color: '#64748b',
    fontStyle: 'italic',
  },
});
