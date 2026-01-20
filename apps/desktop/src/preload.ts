import { contextBridge, ipcRenderer } from 'electron';

// Types for the API
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

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Notifications
  showNotification: (options: NotificationOptions) => {
    ipcRenderer.send('show-notification', options);
  },

  onNotificationClicked: (callback: () => void) => {
    ipcRenderer.on('notification-clicked', callback);
  },

  // Badge count
  setBadgeCount: (count: number) => {
    ipcRenderer.send('set-badge-count', count);
  },

  // Settings
  getSettings: (): Promise<Settings> => {
    return ipcRenderer.invoke('get-settings');
  },

  setSettings: (settings: Partial<Settings>): Promise<void> => {
    return ipcRenderer.invoke('set-settings', settings);
  },

  // Window controls
  minimizeToTray: () => {
    ipcRenderer.send('minimize-to-tray');
  },

  // Check if running in Electron
  isElectron: true,

  // Platform info
  platform: process.platform,
});

// Declare the types for TypeScript
declare global {
  interface Window {
    electronAPI: {
      showNotification: (options: NotificationOptions) => void;
      onNotificationClicked: (callback: () => void) => void;
      setBadgeCount: (count: number) => void;
      getSettings: () => Promise<Settings>;
      setSettings: (settings: Partial<Settings>) => Promise<void>;
      minimizeToTray: () => void;
      isElectron: boolean;
      platform: string;
    };
  }
}
