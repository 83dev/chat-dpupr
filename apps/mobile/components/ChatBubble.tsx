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

    const iconProps = { size: 14, color: message.status === 'READ' ? '#3b82f6' : '#94a3b8' };

    switch (message.status) {
      case 'READ':
        return <CheckCheck {...iconProps} />;
      case 'DELIVERED':
        return <CheckCheck {...iconProps} color="#94a3b8" />;
      case 'SENT':
      default:
        return <Check {...iconProps} color="#94a3b8" />;
    }
  };

  const hasAttachments = message.attachments && message.attachments.length > 0;

  return (
    <View style={[styles.container, isOwn ? styles.ownContainer : styles.otherContainer]}>
      {!isOwn && (
        <Text style={styles.senderName}>{message.sender.nama}</Text>
      )}

      <View style={[styles.bubble, isOwn ? styles.ownBubble : styles.otherBubble]}>
        {hasAttachments && (
          <View style={styles.attachmentContainer}>
            {message.attachments!.map((attachment) => (
              <View key={attachment.id} style={styles.attachment}>
                <Text style={[styles.attachmentText, isOwn && styles.ownText]} numberOfLines={1}>
                  📎 {attachment.fileName}
                </Text>
              </View>
            ))}
          </View>
        )}

        {message.body && (
          <Text style={[styles.messageText, isOwn ? styles.ownText : styles.otherText]}>
            {message.body}
          </Text>
        )}

        <View style={styles.footer}>
          <Text style={[styles.time, isOwn ? styles.ownTime : styles.otherTime]}>
            {format(new Date(message.createdAt), 'HH:mm')}
          </Text>
          {renderStatus()}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 2,
    paddingHorizontal: 12,
    maxWidth: '80%',
  },
  ownContainer: {
    alignSelf: 'flex-end',
  },
  otherContainer: {
    alignSelf: 'flex-start',
  },
  senderName: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '600',
    marginBottom: 2,
    marginLeft: 8,
  },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 80,
  },
  ownBubble: {
    backgroundColor: '#3b82f6',
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#f1f5f9',
    borderBottomLeftRadius: 4,
  },
  attachmentContainer: {
    marginBottom: 4,
  },
  attachment: {
    paddingVertical: 4,
  },
  attachmentText: {
    fontSize: 14,
    color: '#64748b',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  ownText: {
    color: '#fff',
  },
  otherText: {
    color: '#0f172a',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
    gap: 4,
  },
  time: {
    fontSize: 11,
  },
  ownTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  otherTime: {
    color: '#94a3b8',
  },
});
