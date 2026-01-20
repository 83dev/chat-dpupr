import React, { useState, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { Send, Paperclip } from 'lucide-react-native';

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

    // Handle typing indicator
    if (text.length > 0 && !isTypingRef.current) {
      isTypingRef.current = true;
      onTyping?.();
    }

    // Reset typing timeout
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

    // Stop typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (isTypingRef.current) {
      isTypingRef.current = false;
      onStopTyping?.();
    }

    onSend(message.trim());
    setMessage('');
    Keyboard.dismiss();
  };

  const canSend = message.trim().length > 0 && !disabled && !isSending;

  return (
    <View style={styles.container}>
      {onAttachment && (
        <TouchableOpacity
          style={styles.attachButton}
          onPress={onAttachment}
          disabled={disabled}
        >
          <Paperclip size={22} color={disabled ? '#94a3b8' : '#64748b'} />
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
      </View>

      <TouchableOpacity
        style={[styles.sendButton, canSend && styles.sendButtonActive]}
        onPress={handleSend}
        disabled={!canSend}
      >
        {isSending ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Send size={20} color={canSend ? '#fff' : '#94a3b8'} />
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  attachButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputContainer: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 8,
    maxHeight: 120,
  },
  input: {
    fontSize: 16,
    color: '#0f172a',
    paddingVertical: 0,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonActive: {
    backgroundColor: '#3b82f6',
  },
});
