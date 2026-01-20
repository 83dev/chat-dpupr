import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

// Get backend URL from app config or environment
const BACKEND_URL = Constants.expoConfig?.extra?.backendUrl || 'http://192.168.1.100:3001';

// Create axios instance
const api = axios.create({
  baseURL: BACKEND_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token storage keys
const TOKEN_KEY = 'dpupr_chat_token';
const USER_KEY = 'dpupr_chat_user';

// Token management
export async function getStoredToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setStoredToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function removeStoredToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function getStoredUser(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(USER_KEY);
  } catch {
    return null;
  }
}

export async function setStoredUser(user: string): Promise<void> {
  await SecureStore.setItemAsync(USER_KEY, user);
}

export async function removeStoredUser(): Promise<void> {
  await SecureStore.deleteItemAsync(USER_KEY);
}

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    const token = await getStoredToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired, clear storage
      removeStoredToken();
      removeStoredUser();
    }
    return Promise.reject(error);
  }
);

// API methods
export async function fetchRooms() {
  const response = await api.get('/api/chat/rooms');
  return response.data;
}

export async function fetchRoomMessages(roomId: string, cursor?: string, limit = 50) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.append('cursor', cursor);
  
  const response = await api.get(`/api/chat/rooms/${roomId}/messages?${params}`);
  return response.data;
}

export async function fetchRoomDetails(roomId: string) {
  const response = await api.get(`/api/chat/rooms/${roomId}`);
  return response.data;
}

export async function uploadFile(uri: string, fileName: string, mimeType: string) {
  const formData = new FormData();
  formData.append('file', {
    uri,
    name: fileName,
    type: mimeType,
  } as any);
  
  const response = await api.post('/api/chat/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
}

export async function registerPushToken(pushToken: string) {
  const response = await api.post('/api/notifications/register', { pushToken });
  return response.data;
}

export async function unregisterPushToken() {
  const response = await api.delete('/api/notifications/unregister');
  return response.data;
}

export async function getCurrentUser() {
  const response = await api.get('/auth/me');
  return response.data;
}

export { api, BACKEND_URL };
