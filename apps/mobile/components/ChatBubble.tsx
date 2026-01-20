import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Linking } from 'react-native';
import { format } from 'date-fns';
import { Check, CheckCheck, FileText } from 'lucide-react-native';
import type { Message, Attachment } from '../lib/types';
import { BACKEND_URL } from '../lib/api';
import { theme } from '../lib/theme';

interface ChatBubbleProps {
  message: Message;
  isOwn: boolean;
  showSenderName?: boolean;
  isFirstInSequence?: boolean;
  isLastInSequence?: boolean;
}

export function ChatBubble({ 
  message, 
  isOwn, 
  showSenderName = true,
  isFirstInSequence = true,
  isLastInSequence = true
}: ChatBubbleProps) {
  const renderStatus = () => {
    if (!isOwn) return null;

    const iconProps = { size: 16, strokeWidth: 2 };
    const color = message.status === 'READ' ? '#53bdeb' : '#8696a0'; // Chat blue check

    switch (message.status) {
      case 'READ':
        return <CheckCheck {...iconProps} color={color} />;
      case 'DELIVERED':
        return <CheckCheck {...iconProps} color={color} />;
      case 'SENT':
      default:
        return <Check {...iconProps} color={color} />;
    }
  };

  const getFullUrl = (url?: string) => {
    if (!url) return undefined;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    const baseUrl = BACKEND_URL.endsWith('/') ? BACKEND_URL.slice(0, -1) : BACKEND_URL;
    const normalizedPath = url.startsWith('/') ? url : `/${url}`;
    return `${baseUrl}${normalizedPath}`;
  };

  const handleAttachmentPress = (url?: string) => {
    const fullUrl = getFullUrl(url);
    if (!fullUrl) {
      console.warn('Attachment URL is missing');
      return;
    }
    Linking.openURL(fullUrl).catch((err) => console.error('Error opening URL:', err));
  };

  const renderAttachment = (attachment: Attachment, index: number) => {
    const url = getFullUrl(attachment.fileUrl || attachment.url);
    const name = attachment.fileName || attachment.originalName || attachment.filename || 'File';
    const type = attachment.fileType || attachment.mimetype;
    const size = attachment.fileSize || attachment.size;

    const isImage = 
      type?.startsWith('image/') || 
      (name && ['.jpg', '.jpeg', '.png', '.gif', '.webp'].some(ext => 
        name.toLowerCase().endsWith(ext)
      ));
    
    if (isImage) {
      return (
        <TouchableOpacity 
          key={`${attachment.id || index}-${index}`}
          activeOpacity={0.9}
          onPress={() => handleAttachmentPress(url)}
          style={styles.imageAttachment}
        >
          {url ? (
            <Image 
              source={{ uri: url }} 
              style={styles.image} 
              resizeMode="cover" 
            />
          ) : (
            <View style={[styles.image, { backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' }]}>
               <Text style={{ fontSize: 10, color: '#64748b' }}>No Image</Text>
            </View>
          )}
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        key={`${attachment.id || index}-${index}`}
        activeOpacity={0.7}
        onPress={() => handleAttachmentPress(url)}
        style={[styles.fileAttachment, isOwn ? styles.ownFileAttachment : styles.otherFileAttachment]}
      >
        <View style={styles.fileIcon}>
          <FileText size={24} color={isOwn ? theme.colors.primaryDark : theme.colors.textSecondary} />
        </View>
        <View style={styles.fileInfo}>
          <Text style={[styles.fileName]} numberOfLines={1}>
            {name}
          </Text>
          <Text style={[styles.fileSize]}>
            {size ? `${(size / 1024).toFixed(1)} KB` : 'Document'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const hasAttachments = message.attachments && message.attachments.length > 0;
  
  // Tailored corners logic
  const bubbleRadius = 12; // Slightly smaller radius for WA feel
  const sharpCorner = 0;
  
  const getBubbleStyle = () => {
    const style: any = {
      borderTopLeftRadius: bubbleRadius,
      borderTopRightRadius: bubbleRadius,
      borderBottomLeftRadius: bubbleRadius,
      borderBottomRightRadius: bubbleRadius,
    };

    if (isOwn) {
      if (isFirstInSequence) style.borderTopRightRadius = sharpCorner;
    } else {
      if (isFirstInSequence) style.borderTopLeftRadius = sharpCorner;
    }

    return style;
  };

  return (
    <View style={[styles.container, isOwn ? styles.ownContainer : styles.otherContainer]}>
      {!isOwn && message.sender && showSenderName && (
        // Not showing name in bubble for privacy/cleanliness unless Group? 
        // WA shows it inside the bubble for groups. For now, let's keep it outside or inside?
        // Let's put it slightly above/inside. WA puts it inside the bubble for received messages in groups.
        // We'll mimic that structure by putting it inside the bubble container if we could, 
        // but current structure has it outside. Let's keep distinct but minimal.
        // Actually, let's move it INSIDE the bubble for the true WA feel on received group messages.
        // But for now, to minimize structural refactoring, let's just style it cleanly.
        // Wait, I can move it inside.
        null
      )}

      <View style={[styles.bubble, isOwn ? styles.ownBubble : styles.otherBubble, getBubbleStyle()]}>
        {/* Render sender name INSIDE bubble if not own and first in sequence */}
        {!isOwn && message.sender && showSenderName && (
            <Text style={styles.senderName} numberOfLines={1}>
              {message.sender.nama}
            </Text>
        )}

        {hasAttachments && (
          <View style={styles.attachmentList}>
            {message.attachments!.map((attachment, index) => renderAttachment(attachment, index))}
          </View>
        )}

        {message.body ? (
          <Text style={[styles.messageText, isOwn ? styles.ownText : styles.otherText]}>
            {message.body}
            <Text style={styles.timeSpacer}>{'       '}</Text>
          </Text>
        ) : null}

        <View style={styles.metaContainer}>
          <Text style={[styles.time, isOwn ? styles.ownTime : styles.otherTime]}>
            {format(new Date(message.createdAt), 'HH:mm')}
          </Text>
          {isOwn && <View style={styles.statusContainer}>{renderStatus()}</View>}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 1, // Tighter spacing
    paddingHorizontal: 8, // More horizontal space
    width: '100%',
    flexDirection: 'column',
  },
  ownContainer: {
    alignItems: 'flex-end',
  },
  otherContainer: {
    alignItems: 'flex-start',
  },
  senderName: {
    fontSize: 13,
    color: '#e07a5f', // Or a generated color
    fontWeight: 'bold',
    marginBottom: 2,
  },
  bubble: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    paddingBottom: 8,
    maxWidth: '80%',
    minWidth: 80, // Ensure space for time
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  ownBubble: {
    backgroundColor: theme.colors.bubbleOut, // Light Blue
  },
  otherBubble: {
    backgroundColor: theme.colors.bubbleIn, // White
  },
  attachmentList: {
    marginBottom: 2,
  },
  imageAttachment: {
    width: 240,
    height: 160,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#e2e8f0',
    marginBottom: 4,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  fileAttachment: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 6,
    padding: 8,
    marginBottom: 4,
    width: 240, 
    backgroundColor: 'rgba(0,0,0,0.05)', // Subtle internal bg for files
  },
  ownFileAttachment: {
      backgroundColor: 'rgba(0,128,105, 0.05)',
  },
  otherFileAttachment: {
      backgroundColor: '#f0f2f5',
  },
  fileIcon: {
    marginRight: 10,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '500',
  },
  fileSize: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    color: theme.colors.text,
  },
  ownText: {
    color: theme.colors.text,
  },
  otherText: {
    color: theme.colors.text,
  },
  timeSpacer: {
    width: 45,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    position: 'absolute',
    bottom: 4,
    right: 6,
  },
  time: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: '400',
  },
  ownTime: {
    color: '#667781', // Gray-ish
  },
  otherTime: {
    color: '#667781',
  },
  statusContainer: {
    marginLeft: 3,
  },
});
