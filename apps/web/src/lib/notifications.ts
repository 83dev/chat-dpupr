'use client';

import type { Message } from '@/lib/types';

// Check if browser supports notifications
export function supportsNotifications(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

// Request notification permission
export async function requestNotificationPermission(): Promise<NotificationPermission> {
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
  if (!supportsNotifications() || Notification.permission !== 'granted') {
    return;
  }

  // Don't show notification if document is visible/focused
  if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
    return;
  }

  const body = message.attachments && message.attachments.length > 0
    ? '📎 Mengirim file'
    : message.body.length > 100 
      ? message.body.substring(0, 100) + '...' 
      : message.body;

  const notification = new Notification(
    `${message.sender.nama} - ${roomName}`,
    {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: `message-${message.id}`,
      requireInteraction: false,
      silent: false,
    }
  );

  notification.onclick = () => {
    // Focus the window first
    window.focus();
    notification.close();
    // Use location.assign for navigation (works better than href)
    if (options?.onClick) {
      options.onClick();
    }
  };

  // Auto-close after 5 seconds
  setTimeout(() => {
    notification.close();
  }, 5000);
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
