import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  Text,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect, Stack } from 'expo-router';
import { LogOut, Settings } from 'lucide-react-native';
import { useChatStore, useAuthStore } from '../../stores';
import { fetchRooms } from '../../lib/api';
import { RoomListItem } from '../../components/RoomListItem';
import { disconnectSocket } from '../../lib/socket';
import { unregisterPushToken, setBadgeCount } from '../../lib/notifications';

export default function RoomListScreen() {
  const router = useRouter();
  const { rooms, setRooms, onlineUsers, setActiveRoom, reset } = useChatStore();
  const { user, logout } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);

  const loadRooms = async () => {
    try {
      const response = await fetchRooms();
      if (response.success && response.data) {
        setRooms(response.data);
      }
    } catch (error) {
      console.error('Error fetching rooms:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setActiveRoom(null);
      loadRooms();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRooms();
    setRefreshing(false);
  };

  const handleRoomPress = (roomId: string) => {
    router.push(`/(main)/chat/${roomId}`);
  };

  const handleLogout = () => {
    Alert.alert(
      'Keluar',
      'Apakah Anda yakin ingin keluar?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Keluar',
          style: 'destructive',
          onPress: async () => {
            try {
              await unregisterPushToken();
            } catch (e) {
              // Ignore
            }
            disconnectSocket();
            reset();
            await logout();
            setBadgeCount(0);
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const isUserOnline = (room: any) => {
    if (room.jenis === 'PERSONAL' && room.members) {
      const otherMember = room.members.find((m: any) => m.user.nip !== user?.nip);
      return otherMember ? onlineUsers.has(otherMember.user.nip) : false;
    }
    return false;
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Chat DPUPR',
          headerLargeTitle: false,
          headerRight: () => (
            <TouchableOpacity onPress={handleLogout} style={{ marginRight: 16 }}>
              <LogOut size={24} color="#ef4444" />
            </TouchableOpacity>
          ),
        }}
      />
      <View style={styles.container}>
        {rooms.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Belum ada chat</Text>
            <Text style={styles.emptySubtext}>
              Tarik ke bawah untuk refresh
            </Text>
          </View>
        ) : (
          <FlatList
            data={rooms}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <RoomListItem
                room={item}
                isOnline={isInitialLoad ? undefined : isUserOnline(item)}
                onPress={() => handleRoomPress(item.id)}
              />
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#3b82f6']}
                tintColor="#3b82f6"
              />
            }
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  listContent: {
    paddingBottom: 20,
  },
  separator: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginLeft: 88, // Indent separator to align with text
  },
  logoutButton: {
    padding: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94a3b8',
  },
  emptyList: {
    flex: 1,
  },
});
