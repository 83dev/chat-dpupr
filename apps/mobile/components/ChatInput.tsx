import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Image,
  FlatList,
} from 'react-native';
import { Send, Paperclip, Smile, Image as ImageIcon, FileText, Camera, X, Mic } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { uploadFile } from '../lib/api';
import { Attachment } from '../lib/types';
import { theme } from '../lib/theme';

interface ChatInputProps {
  onSend: (message: string, attachments?: any[]) => void; // Support attachments
  onTyping?: () => void;
  onStopTyping?: () => void;
  disabled?: boolean;
  isSending?: boolean;
}

interface PendingAttachment {
  uri: string;
  name: string;
  type: string;
  isUploading: boolean;
  fileUrl?: string; // Result from backend
}

export function ChatInput({
  onSend,
  onTyping,
  onStopTyping,
  disabled,
  isSending: externalIsSending,
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  const handleChangeText = (text: string) => {
    setMessage(text);
    if (text.length > 0 && !isTypingRef.current) {
      isTypingRef.current = true;
      onTyping?.();
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      if (isTypingRef.current) {
        isTypingRef.current = false;
        onStopTyping?.();
      }
    }, 2000);
  };

  const pickImage = async (useCamera = false) => {
    setShowMenu(false);
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      allowsMultipleSelection: !useCamera,
      quality: 0.8,
    };

    const result = useCamera 
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);

    if (!result.canceled && result.assets) {
      const newAttachments = result.assets.map(asset => ({
        uri: asset.uri,
        name: asset.fileName || `image_${Date.now()}.jpg`,
        type: asset.mimeType || 'image/jpeg',
        isUploading: false,
      }));
      setAttachments(prev => [...prev, ...newAttachments]);
    }
  };

  const pickDocument = async () => {
    setShowMenu(false);
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      copyToCacheDirectory: true,
      multiple: true,
    });

    if (!result.canceled && result.assets) {
      const newAttachments = result.assets.map(asset => ({
        uri: asset.uri,
        name: asset.name,
        type: asset.mimeType || 'application/octet-stream',
        isUploading: false,
      }));
      setAttachments(prev => [...prev, ...newAttachments]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if ((!message.trim() && attachments.length === 0) || disabled || externalIsSending) return;

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (isTypingRef.current) {
      isTypingRef.current = false;
      onStopTyping?.();
    }

    let uploadedAttachments: any[] = [];

    if (attachments.length > 0) {
      setIsUploading(true);
      try {
        for (const attachment of attachments) {
          const res = await uploadFile(attachment.uri, attachment.name, attachment.type);
          if (res.success && res.data) {
            // Map to the backend expected structure
            uploadedAttachments.push({
              url: res.data.url,
              filename: res.data.filename,
              originalName: res.data.originalName,
              mimetype: res.data.mimetype,
              size: res.data.size,
            });
          }
        }
      } catch (err) {
        console.error('Upload failed:', err);
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }

    onSend(message.trim(), uploadedAttachments.length > 0 ? uploadedAttachments : undefined);
    setMessage('');
    setAttachments([]);
  };

  const canSend = (message.trim().length > 0 || attachments.length > 0) && !disabled && !externalIsSending && !isUploading;

  return (
    <View style={styles.wrapper}>
      {/* Attachment Previews */}
      {attachments.length > 0 && (
        <View style={styles.previewContainer}>
          <FlatList
            data={attachments}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, i) => i.toString()}
            renderItem={({ item, index }) => (
              <View style={styles.previewItem}>
                {item.type.startsWith('image/') ? (
                  <Image source={{ uri: item.uri }} style={styles.previewImage} />
                ) : (
                  <View style={styles.previewFile}>
                    <FileText size={20} color={theme.colors.textSecondary} />
                  </View>
                )}
                <TouchableOpacity 
                  style={styles.removeButton} 
                  onPress={() => removeAttachment(index)}
                >
                  <X size={12} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
            contentContainerStyle={styles.previewList}
          />
        </View>
      )}

      {/* Attachment Menu */}
      {showMenu && (
        <View style={styles.menuContainer}>
          <TouchableOpacity style={styles.menuItem} onPress={() => pickImage(true)}>
            <View style={[styles.menuIcon, { backgroundColor: '#ef4444' }]}>
              <Camera size={24} color="#fff" />
            </View>
            <Text style={styles.menuText}>Kamera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => pickImage(false)}>
            <View style={[styles.menuIcon, { backgroundColor: '#a855f7' }]}>
              <ImageIcon size={24} color="#fff" />
            </View>
            <Text style={styles.menuText}>Galeri</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={pickDocument}>
            <View style={[styles.menuIcon, { backgroundColor: '#3b82f6' }]}>
              <FileText size={24} color="#fff" />
            </View>
            <Text style={styles.menuText}>Dokumen</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.container}>
        <View style={styles.inputContainer}>
            <TouchableOpacity
                style={styles.iconButton}
                onPress={() => setShowMenu(!showMenu)}
                disabled={disabled || isUploading}
                activeOpacity={0.7}
            >
                <Paperclip 
                    size={22} 
                    color={theme.colors.icon} 
                    style={{ transform: [{ rotate: showMenu ? '45deg' : '0deg' }] }}
                />
            </TouchableOpacity>

            <TextInput
                style={styles.input}
                value={message}
                onChangeText={handleChangeText}
                placeholder="Ketik pesan..."
                placeholderTextColor={theme.colors.textSecondary}
                multiline
                maxLength={4000}
                editable={!disabled && !isUploading}
            />
             
             {/* Use space or attachment logic here for icons inside pill */}
             <TouchableOpacity 
                 style={styles.iconButton}
                 onPress={() => pickImage(true)}
                 disabled={disabled || isUploading}
             >
                 <Camera size={22} color={theme.colors.icon} />
             </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.sendButton}
          onPress={canSend ? handleSend : undefined} // Or handle voice recording if not sending
          disabled={!canSend} // In real app, this would toggle mic/send
          activeOpacity={0.7}
        >
          {isUploading || externalIsSending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : canSend ? (
            <Send size={20} color="#fff" style={{ marginLeft: 2 }} />
          ) : (
            <Mic size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: 'transparent',
    paddingBottom: Platform.OS === 'ios' ? 6 : 6,
    paddingTop: 6,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
  },
  previewContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingVertical: 10,
    marginHorizontal: 8,
    marginBottom: -10,
    paddingBottom: 15,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderBottomWidth: 0,
    zIndex: 10,
  },
  previewList: {
    paddingHorizontal: 12,
  },
  previewItem: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 10,
    position: 'relative',
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewFile: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButton: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  menuItem: {
    alignItems: 'center',
  },
  menuIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  menuText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  iconButton: {
    width: 40,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputContainer: {
    flex: 1,
    backgroundColor: theme.colors.inputBackground,
    borderRadius: 22, // Fully rounded
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 6,
    minHeight: 44,
    maxHeight: 120,
    flexDirection: 'row',
    alignItems: 'flex-end',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text,
    paddingTop: Platform.OS === 'ios' ? 12 : 8,
    paddingBottom: Platform.OS === 'ios' ? 12 : 8,
    paddingHorizontal: 8,
    minHeight: 44,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
});
