'use client';

import type { Message } from '@/lib/types';
import { isElectron, showNotification as showElectronNotification, setBadgeCount } from '@/lib/electron';

// Check if browser supports notifications
export function supportsNotifications(): boolean {
  // Electron always supports notifications
  if (isElectron()) {
    return true;
  }
  return typeof window !== 'undefined' && 'Notification' in window;
}

// Request notification permission
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  // Electron always has permission
  if (isElectron()) {
    return 'granted';
  }

  if (!supportsNotifications()) {
    return 'denied';
  }
  
  if (Notification.permission === 'granted') {
    return 'granted';
  }
  
  if (Notification.permission !== 'denied') {
    return await Notification.requestPermission();
  }
  
  return Notification.permission;
}

// Get current permission status
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  // Electron always has permission
  if (isElectron()) {
    return 'granted';
  }

  if (!supportsNotifications()) {
    return 'unsupported';
  }
  return Notification.permission;
}

// Show notification for new message
export function showMessageNotification(
  message: Message,
  roomName: string,
  options?: {
    onClick?: () => void;
  }
): void {
  const hasPermission = isElectron() || 
    (supportsNotifications() && Notification.permission === 'granted');
  
  if (!hasPermission) {
    return;
  }

  // Don't show notification if document is visible/focused (browser only)
  // For Electron, always show notification even when focused
  if (!isElectron() && typeof document !== 'undefined' && document.visibilityState === 'visible') {
    return;
  }

  const body = message.attachments && message.attachments.length > 0
    ? '📎 Mengirim file'
    : message.body.length > 100 
      ? message.body.substring(0, 100) + '...' 
      : message.body;

  const title = `${message.sender.nama} - ${roomName}`;

  // Use Electron native notifications if available
  if (isElectron()) {
    showElectronNotification(title, body, {
      tag: `message-${message.id}`,
    });
    
    // The click handler is managed by Electron's main process
    // It will focus the window automatically
    return;
  }

  // Fallback to browser notifications
  const notification = new Notification(title, {
    body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: `message-${message.id}`,
    requireInteraction: false,
    silent: false,
  });

  notification.onclick = () => {
    // Focus the window first
    window.focus();
    notification.close();
    if (options?.onClick) {
      options.onClick();
    }
  };

  // Auto-close after 5 seconds
  setTimeout(() => {
    notification.close();
  }, 5000);
}

// Update badge count (Electron only)
export function updateBadgeCount(count: number): void {
  if (isElectron()) {
    setBadgeCount(count);
  }
}

// Play notification sound
export function playNotificationSound(): void {
  try {
    const audio = new Audio('/notification.mp3');
    audio.volume = 0.5;
    audio.play().catch(() => {
      // Ignore audio play errors (user hasn't interacted yet)
    });
  } catch {
    // Audio not supported
  }
}
