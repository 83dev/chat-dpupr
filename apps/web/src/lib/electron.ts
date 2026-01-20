'use client';

// Types for Electron API
interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
}

interface Settings {
  autoLaunch: boolean;
  minimizeToTray: boolean;
  showNotifications: boolean;
}

interface ElectronAPI {
  showNotification: (options: NotificationOptions) => void;
  onNotificationClicked: (callback: () => void) => void;
  setBadgeCount: (count: number) => void;
  getSettings: () => Promise<Settings>;
  setSettings: (settings: Partial<Settings>) => Promise<void>;
  minimizeToTray: () => void;
  isElectron: boolean;
  platform: string;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

/**
 * Check if running in Electron desktop app
 */
export function isElectron(): boolean {
  return typeof window !== 'undefined' && !!window.electronAPI?.isElectron;
}

/**
 * Show a native notification (works in both Electron and browser)
 */
export function showNotification(title: string, body: string, options?: { icon?: string; tag?: string }): void {
  if (isElectron()) {
    // Use Electron native notifications
    window.electronAPI?.showNotification({
      title,
      body,
      icon: options?.icon,
      tag: options?.tag,
    });
  } else if (typeof window !== 'undefined' && 'Notification' in window) {
    // Use Web Notifications API
    if (Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: options?.icon || '/icon-192.png',
        tag: options?.tag,
      });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          new Notification(title, {
            body,
            icon: options?.icon || '/icon-192.png',
            tag: options?.tag,
          });
        }
      });
    }
  }
}

/**
 * Set the badge count on taskbar (Electron only)
 */
export function setBadgeCount(count: number): void {
  if (isElectron()) {
    window.electronAPI?.setBadgeCount(count);
  }
}

/**
 * Register notification click handler (Electron only)
 */
export function onNotificationClicked(callback: () => void): void {
  if (isElectron()) {
    window.electronAPI?.onNotificationClicked(callback);
  }
}

/**
 * Get desktop app settings (Electron only)
 */
export async function getDesktopSettings(): Promise<Settings | null> {
  if (isElectron()) {
    return window.electronAPI?.getSettings() ?? null;
  }
  return null;
}

/**
 * Update desktop app settings (Electron only)
 */
export async function setDesktopSettings(settings: Partial<Settings>): Promise<void> {
  if (isElectron()) {
    await window.electronAPI?.setSettings(settings);
  }
}

/**
 * Request notification permission (browser only)
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (isElectron()) {
    // Electron always has notification permission
    return true;
  }
  
  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'granted') {
      return true;
    }
    
    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
  }
  
  return false;
}

export default {
  isElectron,
  showNotification,
  setBadgeCount,
  onNotificationClicked,
  getDesktopSettings,
  setDesktopSettings,
  requestNotificationPermission,
};
