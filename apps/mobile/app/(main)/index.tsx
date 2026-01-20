import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { useRouter, useFocusEffect, Stack } from 'expo-router';
import { LogOut, MessageSquarePlus, MapPin } from 'lucide-react-native';
import { useChatStore, useAuthStore } from '../../stores';
import { fetchRooms } from '../../lib/api';
import { RoomListItem } from '../../components/RoomListItem';
import { disconnectSocket, connectSocket } from '../../lib/socket';
import { unregisterPushToken, setBadgeCount } from '../../lib/notifications';
import { theme } from '../../lib/theme';

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
      // Ensure socket is connected when returning to list
      connectSocket().catch(console.error);
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

  // "New Chat" Action
  const handleNewChat = () => {
      // Navigate to /contacts. Using 'as any' to bypass strict strict-typed route mismatch 
      // between (main) group opacity and file structure.
      router.push('/contacts' as any); 
  };

  const [filter, setFilter] = useState<'all' | 'BIDANG' | 'PROYEK' | 'PRIVATE'>('all');

  const filteredRooms = rooms.filter(room => {
      if (filter === 'all') return true;
      return room.type === filter;
  });

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Chat DPUPR',
          headerLargeTitle: false,
          headerStyle: { backgroundColor: theme.colors.primary },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold', fontSize: 20 },
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity onPress={() => router.push('/(main)/map')} style={{ marginRight: 16 }}>
                    <MapPin size={24} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleLogout} style={{ marginRight: 16 }}>
                    <LogOut size={24} color="#fff" />
                </TouchableOpacity>
            </View>
          ),
          headerShadowVisible: false, // Clean header like WA
        }}
      />
      {!useChatStore((s) => s.isConnected) && (
        <View style={styles.offlineContainer}>
          <Text style={styles.offlineText}>Menghubungkan...</Text>
        </View>
      )}
      <View style={styles.container}>
        {/* Filter Chips */}
        <View style={styles.filterContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
                {(['all', 'BIDANG', 'PROYEK', 'PRIVATE'] as const).map(f => (
                    <TouchableOpacity
                        key={f}
                        style={[
                            styles.filterChip, 
                            filter === f && styles.filterChipActive
                        ]}
                        onPress={() => setFilter(f)}
                    >
                        <Text style={[
                            styles.filterText,
                            filter === f && styles.filterTextActive
                        ]}>
                            {f === 'all' ? 'Semua' : f === 'BIDANG' ? 'Bidang' : f === 'PROYEK' ? 'Proyek' : 'Private'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>

        {filteredRooms.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Belum ada chat</Text>
            <Text style={styles.emptySubtext}>
              {rooms.length === 0 ? 'Mulai chat baru dengan teman kerja Anda' : 'Tidak ada chat di kategori ini'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredRooms}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <RoomListItem
                room={item}
                isOnline={isUserOnline(item)}
                onPress={() => handleRoomPress(item.id)}
              />
            )}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[theme.colors.primary]}
                tintColor={theme.colors.primary}
              />
            }
            contentContainerStyle={styles.listContent}
          />
        )}
        
        {/* Floating Action Button */}
        <TouchableOpacity 
            style={styles.fab} 
            onPress={handleNewChat}
            activeOpacity={0.8}
        >
            <MessageSquarePlus size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  filterContainer: {
      backgroundColor: theme.colors.primary,
      paddingBottom: 12,
  },
  filterContent: {
      paddingHorizontal: 12,
  },
  filterChip: {
      paddingHorizontal: 16,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: 'rgba(255,255,255,0.2)',
      marginRight: 8,
  },
  filterChipActive: {
      backgroundColor: '#fff',
  },
  filterText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '500',
  },
  filterTextActive: {
      color: theme.colors.primary,
  },
  listContent: {
    paddingBottom: 80, 
  },
  // separator: {
  //   height: 1,
  //   backgroundColor: '#f1f5f9',
  //   marginLeft: 82, 
  // },
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
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  offlineContainer: {
    backgroundColor: theme.colors.primaryDark,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offlineText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  fab: {
      position: 'absolute',
      bottom: 24,
      right: 24,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 6,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
  },
});
