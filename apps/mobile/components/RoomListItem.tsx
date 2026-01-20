import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { format, isToday, isYesterday } from 'date-fns';
import { id } from 'date-fns/locale';
import type { ChatRoom, Message } from '../lib/types';
import { useAuthStore } from '../stores';

interface RoomListItemProps {
  room: ChatRoom;
  isOnline?: boolean;
  onPress: () => void;
}

import { theme } from '../lib/theme';
import { User as UserIcon, Building2, FolderOpen } from 'lucide-react-native';

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

  const getLastMessagePreview = (message?: Message) => {
    if (!message) return 'Belum ada pesan';

    if (message.body) return message.body;

    if (message.attachments && message.attachments.length > 0) {
      const firstAttachment = message.attachments[0];
      const name = firstAttachment.fileName || firstAttachment.originalName || firstAttachment.filename;
      const type = firstAttachment.fileType || firstAttachment.mimetype;

      // Check if it's an image
      const isImage = type?.startsWith('image/') || 
                      (name && ['.jpg', '.jpeg', '.png', '.gif', '.webp'].some(ext => 
                        name.toLowerCase().endsWith(ext)
                      ));
      return isImage ? '📷 Foto' : '📄 Dokumen';
    }

    return 'Pesan kosong';
  };

  const lastMessagePreview = getLastMessagePreview(room.lastMessage);
  const truncatedMessage =
    lastMessagePreview.length > 35
      ? lastMessagePreview.substring(0, 35) + '...'
      : lastMessagePreview;

  // Determine Default Avatar Icon
  const AvatarContent = () => {
      if (room.type === 'BIDANG') return <Building2 size={24} color="#fff" />;
      if (room.type === 'PROYEK') return <FolderOpen size={24} color="#fff" />;
      if (room.type === 'PRIVATE') return <Text style={styles.avatarText}>{getInitials(displayName)}</Text>;
      
      return <Text style={styles.avatarText}>{getInitials(displayName)}</Text>;
  }

  // Avatar Background color - lighter/neutral for Chat style or keep distinct? 
  // Chat usually has gray generic avatars. Let's use a subtle color or keep distinct for utility.
  // Let's keep distinct but muted.
  const getAvatarBg = () => {
     if (room.type === 'BIDANG') return '#a855f7'; 
     if (room.type === 'PROYEK') return '#f97316';
     return '#cfd8dc'; // Default gray for private
  }

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.avatarContainer}>
        <View style={[styles.avatar, { backgroundColor: getAvatarBg() }]}>
           <AvatarContent />
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
            {room.lastMessage?.sender?.nama && room.type !== 'PRIVATE' && (
                <Text style={styles.senderNamePreview}>{room.lastMessage.sender.nama.split(' ')[0]}: </Text>
            )}
            {truncatedMessage}
          </Text>
          
          {(room.unreadCount || 0) > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {room.unreadCount! > 99 ? '99+' : room.unreadCount}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.separator} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    height: 72,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 15,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '500', 
    // Chat default avatars are weight 500ish
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.online,
    borderWidth: 2,
    borderColor: theme.colors.background,
  },
  contentContainer: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    position: 'relative',
  },
  separator: {
    position: 'absolute',
    bottom: -10, // Adjust to bottom of container
    right: 0,
    left: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.border,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold', // Chat uses bold for unread, but generally boldish for names
    color: theme.colors.text,
    flex: 1,
    marginRight: 8,
  },
  time: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '400',
  },
  timeUnread: {
    color: theme.colors.primary, // Green for unread time
    fontWeight: '600',
  },
  message: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    flex: 1,
    marginRight: 8,
    fontWeight: '400',
  },
  messageUnread: {
    color: theme.colors.text, // Darker text for unread message content (optional, WA usually keeps gray but bold)
    fontWeight: '600',
  },
  senderNamePreview: {
      color: theme.colors.text,
      fontWeight: '500',
  },
  badge: {
    backgroundColor: theme.colors.primary, // Green badge
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
