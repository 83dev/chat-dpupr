import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SystemUI from 'expo-system-ui';
import { useAuthStore, useChatStore } from '../stores';
import { connectSocket, disconnectSocket } from '../lib/socket';
import { fetchRooms } from '../lib/api';
import {
  registerForPushNotificationsAsync,
  registerTokenWithBackend,
  addNotificationResponseListener,
} from '../lib/notifications';
import type { Message } from '../lib/types';

// Set system UI colors
SystemUI.setBackgroundColorAsync('#ffffff');

function useProtectedRoute() {
  const { isAuthenticated, isLoading, loadStoredAuth } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    loadStoredAuth();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(main)');
    }
  }, [isAuthenticated, isLoading, segments]);

  return { isLoading };
}

function useSocketConnection() {
  const { isAuthenticated, user } = useAuthStore();
  const {
    setRooms,
    addMessage,
    setOnlineUsers,
    setUserOnline,
    setUserOffline,
    addTypingUser,
    removeTypingUser,
    updateRoomLastMessage,
    incrementRoomUnreadCount,
    updateMessagesStatus,
    removeMessage,
  } = useChatStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      disconnectSocket();
      return;
    }

    // Connect socket
    connectSocket().then((socket) => {
      if (!socket) return;

      // Fetch rooms
      fetchRooms()
        .then((response) => {
          if (response.success && response.data) {
            setRooms(response.data);
          }
        })
        .catch(console.error);

      // Socket event listeners
      socket.on('message:new', (message: Message) => {
        addMessage(message.roomId, message);
        updateRoomLastMessage(message.roomId, message);

        if (message.senderNip !== user?.nip) {
          incrementRoomUnreadCount(message.roomId);
        }
      });

      socket.on('users:online', setOnlineUsers);
      socket.on('user:online', setUserOnline);
      socket.on('user:offline', setUserOffline);

      socket.on('user:typing', ({ roomId, nip, nama }) => {
        addTypingUser(roomId, nip, nama);
      });

      socket.on('user:stop-typing', ({ roomId, nip }) => {
        removeTypingUser(roomId, nip);
      });

      socket.on('messages:read', ({ roomId, messageIds }) => {
        updateMessagesStatus(roomId, messageIds, 'READ');
      });

      socket.on('message:deleted', ({ roomId, messageId }) => {
        removeMessage(roomId, messageId);
      });
    });

    // Setup push notifications (only works on development builds, not Expo Go)
    registerForPushNotificationsAsync()
      .then((token) => {
        if (token) {
          registerTokenWithBackend(token).catch((err) => {
            console.log('Push token registration failed (expected in Expo Go):', err);
          });
        } else {
          console.log('Push notifications not available (use development build for full functionality)');
        }
      })
      .catch((err) => {
        console.log('Push notifications setup failed (expected in Expo Go):', err);
      });

    return () => {
      disconnectSocket();
    };
  }, [isAuthenticated, user?.nip]);

  // Handle notification response (when user taps notification)
  useEffect(() => {
    try {
      const subscription = addNotificationResponseListener((response) => {
        const data = response.notification.request.content.data;
        if (data?.roomId) {
          router.push(`/(main)/chat/${data.roomId}`);
        }
      });

      return () => subscription.remove();
    } catch (err) {
      // Notification listeners not available in Expo Go
      console.log('Notification listeners not available in Expo Go');
    }
  }, []);
}

export default function RootLayout() {
  const { isLoading } = useProtectedRoute();
  useSocketConnection();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(main)" />
      </Stack>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
