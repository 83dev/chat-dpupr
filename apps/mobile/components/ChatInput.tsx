import React, { useState, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
  Platform,
} from 'react-native';
import { Send, Paperclip, Smile } from 'lucide-react-native';

interface ChatInputProps {
  onSend: (message: string) => void;
  onAttachment?: () => void;
  onTyping?: () => void;
  onStopTyping?: () => void;
  disabled?: boolean;
  isSending?: boolean;
}

export function ChatInput({
  onSend,
  onAttachment,
  onTyping,
  onStopTyping,
  disabled,
  isSending,
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  const handleChangeText = (text: string) => {
    setMessage(text);

    if (text.length > 0 && !isTypingRef.current) {
      isTypingRef.current = true;
      onTyping?.();
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      if (isTypingRef.current) {
        isTypingRef.current = false;
        onStopTyping?.();
      }
    }, 2000);
  };

  const handleSend = () => {
    if (!message.trim() || disabled || isSending) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (isTypingRef.current) {
      isTypingRef.current = false;
      onStopTyping?.();
    }

    onSend(message.trim());
    setMessage('');
    // Do not dismiss keyboard to allow fast follow-up messages
  };

  const canSend = message.trim().length > 0 && !disabled && !isSending;

  return (
    <View style={styles.wrapper}>
      <View style={styles.container}>
        {onAttachment && (
          <TouchableOpacity
            style={styles.iconButton}
            onPress={onAttachment}
            disabled={disabled}
            activeOpacity={0.7}
          >
            <Paperclip size={24} color="#64748b" />
          </TouchableOpacity>
        )}

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={message}
            onChangeText={handleChangeText}
            placeholder="Ketik pesan..."
            placeholderTextColor="#94a3b8"
            multiline
            maxLength={4000}
            editable={!disabled}
          />
          {/* <TouchableOpacity style={styles.inputAction}>
            <Smile size={24} color="#94a3b8" />
          </TouchableOpacity> */}
        </View>

        <TouchableOpacity
          style={[styles.sendButton, canSend && styles.sendButtonActive]}
          onPress={handleSend}
          disabled={!canSend}
          activeOpacity={0.7}
        >
          {isSending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Send size={20} color={canSend ? '#fff' : '#64748b'} style={{ marginLeft: 2 }} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#f0f2f5', // Whatsapp dynamic background
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
    paddingTop: 6,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
  },
  iconButton: {
    width: 44,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 0,
  },
  inputContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 4,
    minHeight: 48,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#0f172a',
    paddingTop: 0,
    paddingBottom: 0,
    maxHeight: 100,
  },
  inputAction: {
    marginLeft: 8,
    marginBottom: 1,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e2e8f0', // Inactive color
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  sendButtonActive: {
    backgroundColor: '#005c9a', // DPUPR Blue
  },
});
