import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useAuthStore, useChatStore } from '../../../stores';
import { createRoom } from '../../../lib/api';
import { theme } from '../../../lib/theme';

export default function CreateGroupScreen() {
  const router = useRouter();
  const { setRooms, rooms } = useChatStore();
  
  const [nama, setNama] = useState('');
  const [description, setDescription] = useState('');
  const [proyekKode, setProyekKode] = useState('');
  const [memberNips, setMemberNips] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleCreate = async () => {
    if (!nama.trim()) {
        alert('Nama proyek wajib diisi');
        return;
    }

    setIsLoading(true);
    try {
      const payload = {
        nama: nama.trim(),
        description: description.trim() || undefined,
        type: 'PROYEK',
        proyekKode: proyekKode.trim() || undefined,
        proyekNama: nama.trim(),
        memberNips: memberNips.split(',').map(n => n.trim()).filter(Boolean),
      };

      const response = await createRoom(payload as any);
      if (response.success && response.data) {
        setRooms([response.data, ...rooms]);
        // Navigate to the new chat, replacing current stack to avoid going back to form
        // Using (main) prefix as it seems required for chat ID route based on existing code
        router.replace(`/(main)/chat/${response.data.id}` as any);
      }
    } catch (error) {
      console.error('Failed to create group:', error);
      alert('Gagal membuat grup');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen 
        options={{ 
            title: 'Buat Grup Proyek',
            headerStyle: { backgroundColor: theme.colors.headerBackground },
            headerTintColor: '#fff',
        }} 
      />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.formGroup}>
            <Text style={styles.label}>Nama Proyek *</Text>
            <TextInput
                style={styles.input}
                placeholder="Contoh: Proyek Jalan Serang"
                value={nama}
                onChangeText={setNama}
            />
        </View>

        <View style={styles.formGroup}>
            <Text style={styles.label}>Kode Proyek</Text>
            <TextInput
                style={styles.input}
                placeholder="Contoh: PRJ-001"
                value={proyekKode}
                onChangeText={setProyekKode}
                autoCapitalize="characters"
            />
        </View>

        <View style={styles.formGroup}>
            <Text style={styles.label}>Deskripsi</Text>
            <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Deskripsi singkat..."
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
            />
        </View>

        <View style={styles.formGroup}>
            <Text style={styles.label}>Anggota (NIP)</Text>
            <Text style={styles.helperText}>Pisahkan dengan koma</Text>
            <TextInput
                style={[styles.input]}
                placeholder="199xxx, 198xxx"
                value={memberNips}
                onChangeText={setMemberNips}
                keyboardType="numeric"
            />
        </View>

        <TouchableOpacity 
            style={[styles.button, (!nama.trim() || isLoading) && styles.buttonDisabled]} 
            onPress={handleCreate}
            disabled={!nama.trim() || isLoading}
        >
            {isLoading ? (
                <ActivityIndicator color="#fff" />
            ) : (
                <Text style={styles.buttonText}>Buat Grup</Text>
            )}
        </TouchableOpacity>
      </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
      padding: 20,
  },
  formGroup: {
      marginBottom: 20,
  },
  label: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 8,
  },
  input: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 16,
      backgroundColor: theme.colors.inputBackground,
  },
  textArea: {
      height: 80,
      textAlignVertical: 'top',
  },
  helperText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginBottom: 6,
  },
  button: {
      backgroundColor: theme.colors.primary,
      borderRadius: 24,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 10,
  },
  buttonDisabled: {
      backgroundColor: '#cbd5e1',
  },
  buttonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: 'bold',
  },
});
