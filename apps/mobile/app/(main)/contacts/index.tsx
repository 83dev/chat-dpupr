import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Search, Users, User as UserIcon } from 'lucide-react-native';
import { useAuthStore, useChatStore } from '../../../stores';
import { searchUsers, createRoom } from '../../../lib/api';
import { theme } from '../../../lib/theme';
// import { useDebounce } from '../../../hooks/useDebounce'; 


// Simple debounce implementation inside component for now if hook doesn't exist
function useDebounceValue(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

export default function ContactsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { setRooms, rooms } = useChatStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debouncedSearch = useDebounceValue(searchQuery, 300);

  useEffect(() => {
    if (debouncedSearch.length < 2) {
      setSearchResults([]);
      return;
    }

    const search = async () => {
      setIsLoading(true);
      try {
        const response = await searchUsers(debouncedSearch);
        if (response.success && response.data) {
          setSearchResults(response.data.filter((u: any) => u.nip !== user?.nip));
        }
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    search();
  }, [debouncedSearch, user?.nip]);

  const handleUserPress = async (selectedUser: any) => {
    setIsLoading(true);
    try {
      // Check if room already exists with this user (Private)
      // Note: This logic is simple, ideally backend handles "get or create"
      // But for now we just create, backend should handle deduplication or we assume new
      
      const payload = {
        nama: `Chat dengan ${selectedUser.nama}`,
        type: 'PRIVATE',
        memberNips: [selectedUser.nip],
      };

      const response = await createRoom(payload);
      if (response.success && response.data) {
        // Update store
        const existingRoomIndex = rooms.findIndex(r => r.id === response.data.id);
        if (existingRoomIndex === -1) {
            setRooms([response.data, ...rooms]);
        }
        
        // Navigate to chat
        // Replace current screen so back button goes to list
        router.replace(`/(main)/chat/${response.data.id}`);
      }
    } catch (error) {
      console.error('Failed to start chat:', error);
      alert('Gagal memulai chat');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateGroup = () => {
    router.push('/contacts/create-group' as any);
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.userItem} onPress={() => handleUserPress(item)}>
      <View style={styles.avatar}>
         {/* Placeholder Avatar */}
         <Text style={styles.avatarText}>{item.nama.substring(0, 2).toUpperCase()}</Text>
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.nama}</Text>
        <Text style={styles.userNip}>{item.bidang?.nama || 'Staff'} • {item.nip}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <>
      <Stack.Screen 
        options={{ 
            title: 'Pilih Kontak',
            headerStyle: { backgroundColor: theme.colors.headerBackground },
            headerTintColor: '#fff',
        }} 
      />
      <View style={styles.container}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
            <View style={styles.searchWrapper}>
                <Search size={20} color={theme.colors.icon} style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Cari nama atau NIP..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoFocus
                />
            </View>
        </View>

        {/* Options */}
        <TouchableOpacity style={styles.optionItem} onPress={handleCreateGroup}>
             <View style={[styles.avatar, styles.groupAvatar]}>
                <Users size={24} color="#fff" />
             </View>
             <Text style={styles.optionText}>Buat Grup Baru</Text>
        </TouchableOpacity>

        {/* Results */}
        {isLoading ? (
            <ActivityIndicator style={{ marginTop: 20 }} size="small" color={theme.colors.primary} />
        ) : (
            <FlatList
                data={searchResults}
                keyExtractor={(item) => item.nip}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    searchQuery.length >= 2 ? (
                        <Text style={styles.emptyText}>Tidak ditemukan</Text>
                    ) : null
                }
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
  searchContainer: {
      padding: 10,
      backgroundColor: '#fff',
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
  },
  searchWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.inputBackground, // Should ideally be light gray for input
      borderRadius: 8,
      paddingHorizontal: 10,
      height: 40,
      borderWidth: 1,
      borderColor: theme.colors.border,
  },
  searchIcon: {
      marginRight: 8,
  },
  searchInput: {
      flex: 1,
      fontSize: 16,
      color: theme.colors.text,
  },
  optionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
  },
  groupAvatar: {
      backgroundColor: theme.colors.primary,
  },
  optionText: {
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 16,
      color: theme.colors.text,
  },
  listContent: {
      paddingBottom: 20,
  },
  userItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      paddingHorizontal: 16,
  },
  avatar: {
      width: 45,
      height: 45,
      borderRadius: 22.5,
      backgroundColor: '#e2e8f0',
      alignItems: 'center',
      justifyContent: 'center',
  },
  avatarText: {
      fontSize: 14,
      fontWeight: 'bold',
      color: '#64748b',
  },
  userInfo: {
      marginLeft: 16,
      flex: 1,
  },
  userName: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 2,
  },
  userNip: {
      fontSize: 13,
      color: theme.colors.textSecondary,
  },
  emptyText: {
      textAlign: 'center',
      marginTop: 20,
      color: theme.colors.textSecondary,
  },
});
