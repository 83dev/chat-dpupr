import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet, Text, AppState } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SystemUI from 'expo-system-ui';
import * as SplashScreen from 'expo-splash-screen';
import { useAuthStore, useChatStore } from '../stores';
import { connectSocket, disconnectSocket } from '../lib/socket';
import { fetchRooms } from '../lib/api';
import {
  registerForPushNotificationsAsync,
  registerTokenWithBackend,
  addNotificationResponseListener,
} from '../lib/notifications';
import type { Message } from '../lib/types';
import { theme } from '../lib/theme';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync().catch(() => {
  /* reloading the app might trigger some race conditions, ignore them */
});

// Set system UI colors
SystemUI.setBackgroundColorAsync('#ffffff');

function useProtectedRoute() {
  const { isAuthenticated, isLoading, loadStoredAuth } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    console.log('🔄 Initializing Auth...');
    loadStoredAuth()
      .then((success) => {
        console.log('✅ Auth loaded, success:', success);
      })
      .catch((err) => {
        console.error('❌ Auth load error:', err);
      });
  }, []);

  useEffect(() => {
    if (isLoading) return;

    // Hide splash screen once loading is done
    console.log('✅ Auth loading finished, hiding splash screen');
    SplashScreen.hideAsync().catch((err) => console.warn('Failed to hide splash:', err));

    console.log('Navigation check - Auth:', isAuthenticated, 'Segment:', segments[0]);

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      console.log('Redirecting to login');
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      console.log('Redirecting to main');
      router.replace('/(main)');
    }
  }, [isAuthenticated, isLoading, segments]);

  // Safety timeout: Hide splash screen after 5 seconds max if it hasn't hidden yet
  useEffect(() => {
      const timeout = setTimeout(() => {
          console.log('⚠️ Safety timeout: Forcing splash screen hide');
          SplashScreen.hideAsync().catch(() => {});
      }, 5000);
      return () => clearTimeout(timeout);
  }, []);

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
    setSocketConnected,
  } = useChatStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      disconnectSocket();
      return;
    }

    console.log('🔌 Initiating socket connection...');

    // Connect socket
    connectSocket().then((socket) => {
      if (!socket) return;
      
      // Update initial status
      setSocketConnected(socket.connected);

      // Fetch rooms on connect to ensure sync
      fetchRooms()
        .then((response) => {
          if (response.success && response.data) {
            setRooms(response.data);
          }
        })
        .catch(err => console.error('Error fetching rooms (socket init):', err));

      socket.on('connect', () => {
        console.log('🔌 Socket connected in layout');
        setSocketConnected(true);
      });

      socket.on('disconnect', () => {
        console.log('👋 Socket disconnected in layout');
        setSocketConnected(false);
      });

      // Socket event listeners
      socket.on('message:new', async (message: Message) => {
        // Use getState to ensure we have latest rooms list
        const currentRooms = useChatStore.getState().rooms;
        const roomExists = currentRooms.find(r => r.id === message.roomId);

        addMessage(message.roomId, message);
        
        if (roomExists) {
          updateRoomLastMessage(message.roomId, message);
          if (message.senderNip !== user?.nip) {
            incrementRoomUnreadCount(message.roomId);
          }
        } else {
          // If room doesn't exist in list (e.g. new private chat), fetch it
          try {
             // We need fetchRoomDetails but we need to import it properly
             // Since I cannot change imports easily in this block without messing up, 
             // I will assume fetchRoomDetails is unused in this scope or I need to update imports first.
             const response = await fetchRooms();
             if (response.success && response.data) {
               setRooms(response.data);
             }
          } catch (e) {
            console.error('Error fetching rooms on new message:', e);
          }
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

    // Setup push notifications
    registerForPushNotificationsAsync()
      .then((token) => {
        if (token) {
          registerTokenWithBackend(token).catch((err) => {
             // Ignore in dev
          });
        }
      })
      .catch(() => {});

    return () => {
      disconnectSocket();
    };
  }, [isAuthenticated, user?.nip]);

  // Handle notification response
  useEffect(() => {
    try {
      const subscription = addNotificationResponseListener((response) => {
        const data = response.notification.request.content.data;
        if (data?.roomId) {
          router.push(`/(main)/chat/${data.roomId}`);
        }
      });
      return () => subscription.remove();
    } catch (err) {}
  }, []);
  // Handle AppState changes to reconnect/sync
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && isAuthenticated) {
        console.log('📱 App active, syncing data...');
        connectSocket();
        // Fetch rooms to ensure fresh data (missed messages while backgrounded)
        fetchRooms().then((response) => {
          if (response.success && response.data) {
            setRooms(response.data);
          }
        }).catch(console.error);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated]);
}

export default function RootLayout() {
  const { isLoading } = useProtectedRoute();
  useSocketConnection();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={{ marginTop: 10, color: theme.colors.textSecondary }}>Memuat data...</Text>
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
