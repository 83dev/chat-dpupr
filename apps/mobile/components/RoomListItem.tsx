import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { format, isToday, isYesterday } from 'date-fns';
import { id } from 'date-fns/locale';
import type { ChatRoom } from '../lib/types';
import { useAuthStore } from '../stores';

interface RoomListItemProps {
  room: ChatRoom;
  isOnline?: boolean;
  onPress: () => void;
}

export function RoomListItem({ room, isOnline, onPress }: RoomListItemProps) {
  const { user } = useAuthStore();

  // Get display name for the room
  const displayName = useMemo(() => {
    if (room.type === 'PRIVATE' && room.members) {
      // For private chat, show other user's name
      const otherMember = room.members.find((m) => m.user.nip !== user?.nip);
      return otherMember?.user.nama || room.nama;
    }
    return room.nama;
  }, [room, user]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) {
      return format(date, 'HH:mm');
    }
    if (isYesterday(date)) {
      return 'Kemarin';
    }
    return format(date, 'dd/MM/yy');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const lastMessagePreview = room.lastMessage?.body || 'Belum ada pesan';
  const truncatedMessage =
    lastMessagePreview.length > 40
      ? lastMessagePreview.substring(0, 40) + '...'
      : lastMessagePreview;

  // Determine avatar color based on room type
  const getAvatarColor = () => {
    if (room.type === 'BIDANG') return '#8b5cf6'; // Violet for Bidang
    if (room.type === 'PROYEK') return '#10b981'; // Emerald for Proyek
    return '#3b82f6'; // Blue for Private
  };

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.avatarContainer}>
        <View style={[styles.avatar, { backgroundColor: getAvatarColor() }]}>
          <Text style={styles.avatarText}>{getInitials(displayName)}</Text>
        </View>
        {isOnline && <View style={styles.onlineIndicator} />}
      </View>

      <View style={styles.contentContainer}>
        <View style={styles.topRow}>
          <Text style={styles.name} numberOfLines={1}>
            {displayName}
          </Text>
          {room.lastMessage && (
            <Text style={[styles.time, (room.unreadCount || 0) > 0 && styles.timeUnread]}>
              {formatTime(room.lastMessage.createdAt)}
            </Text>
          )}
        </View>

        <View style={styles.bottomRow}>
          <Text 
            style={[styles.message, (room.unreadCount || 0) > 0 && styles.messageUnread]} 
            numberOfLines={1}
          >
            {room.lastMessage?.sender?.nama && room.type !== 'PRIVATE'
              ? `${room.lastMessage.sender.nama}: ${truncatedMessage}`
              : truncatedMessage
            }
          </Text>
          
          {(room.unreadCount || 0) > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {room.unreadCount! > 99 ? '99+' : room.unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 56, // Larger avatar
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#22c55e',
    borderWidth: 2.5,
    borderColor: '#fff',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 2,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontSize: 17,
    fontWeight: '600',
    color: '#0f172a',
    flex: 1,
    marginRight: 8,
    letterSpacing: -0.3,
  },
  time: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '400',
  },
  timeUnread: {
    color: '#22c55e', // WhatsApp green for unread time
    fontWeight: '600',
  },
  message: {
    fontSize: 15,
    color: '#64748b',
    flex: 1,
    marginRight: 8,
    fontWeight: '400',
  },
  messageUnread: {
    color: '#334155',
    fontWeight: '500',
  },
  badge: {
    backgroundColor: '#25D366', // WhatsApp green
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
});
