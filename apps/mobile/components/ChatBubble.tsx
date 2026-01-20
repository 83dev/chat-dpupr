import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { format } from 'date-fns';
import { Check, CheckCheck } from 'lucide-react-native';
import type { Message } from '../lib/types';

interface ChatBubbleProps {
  message: Message;
  isOwn: boolean;
}

export function ChatBubble({ message, isOwn }: ChatBubbleProps) {
  const renderStatus = () => {
    if (!isOwn) return null;

    const iconProps = { size: 14, strokeWidth: 2.5 };
    const color = message.status === 'READ' ? '#34b7f1' : '#8696a0'; // WhatsApp-like colors

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

  const hasAttachments = message.attachments && message.attachments.length > 0;

  return (
    <View style={[styles.container, isOwn ? styles.ownContainer : styles.otherContainer]}>
      {/* Sender Name for other users in group chats */}
      {!isOwn && message.sender && (
        <Text style={styles.senderName} numberOfLines={1}>
          {message.sender.nama}
        </Text>
      )}

      <View style={[styles.bubble, isOwn ? styles.ownBubble : styles.otherBubble]}>
        {hasAttachments && (
          <View style={styles.attachmentContainer}>
            {message.attachments!.map((attachment) => (
              <View key={attachment.id} style={styles.attachment}>
                <View style={styles.attachmentIcon}>
                  <Text style={{ fontSize: 16 }}>📎</Text>
                </View>
                <Text style={styles.attachmentText} numberOfLines={1}>
                  {attachment.fileName}
                </Text>
              </View>
            ))}
          </View>
        )}

        {message.body && (
          <Text style={[styles.messageText, isOwn ? styles.ownText : styles.otherText]}>
            {message.body}
            {/* Spacer to prevent text from overlapping with time */}
            <Text style={styles.timeSpacer}>{'      '}</Text>
          </Text>
        )}

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
    marginVertical: 2,
    paddingHorizontal: 8,
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
    fontSize: 12,
    color: '#E15F29', // DPUPR brand color accent or neutral
    fontWeight: '600',
    marginBottom: 2,
    marginLeft: 12,
    maxWidth: '80%',
  },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    paddingBottom: 8,
    maxWidth: '80%',
    minWidth: 80,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  ownBubble: {
    backgroundColor: '#005c9a', // Deep Blue (DPUPR-ish) or standard chat blue
    borderTopRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 4,
  },
  attachmentContainer: {
    marginBottom: 4,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
    padding: 4,
  },
  attachment: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
  },
  attachmentIcon: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  attachmentText: {
    fontSize: 14,
    color: '#0f172a',
    flex: 1,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
    paddingRight: 4, // Space for read receipt if brief
  },
  ownText: {
    color: '#ffffff',
  },
  otherText: {
    color: '#0f172a',
  },
  timeSpacer: {
    width: 40,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    position: 'absolute',
    bottom: 4,
    right: 8,
  },
  time: {
    fontSize: 10.5,
    marginRight: 3,
  },
  ownTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  otherTime: {
    color: '#8696a0',
  },
  statusContainer: {
    marginLeft: 2,
  },
});
