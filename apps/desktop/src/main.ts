import {
  app,
  BrowserWindow,
  Menu,
  Tray,
  nativeImage,
  shell,
  ipcMain,
  Notification,
} from 'electron';
import * as path from 'path';
import Store from 'electron-store';
import AutoLaunch from 'auto-launch';

// ============================================================================
// Configuration
// ============================================================================

const APP_URL = 'https://chat.dpupr.com';
const APP_NAME = 'Chat DPUPR';

// Path to resources
const RESOURCES_PATH = app.isPackaged
  ? path.join(process.resourcesPath, 'resources')
  : path.join(__dirname, '../resources');

const ICON_PATH = path.join(RESOURCES_PATH, 'icon.png');
const TRAY_ICON_PATH = path.join(RESOURCES_PATH, 'tray-icon.png');

// ============================================================================
// Store & Settings
// ============================================================================

interface Settings {
  autoLaunch: boolean;
  minimizeToTray: boolean;
  showNotifications: boolean;
}

const store = new Store<Settings>({
  defaults: {
    autoLaunch: false,
    minimizeToTray: true,
    showNotifications: true,
  },
});

// ============================================================================
// Auto Launch
// ============================================================================

const autoLauncher = new AutoLaunch({
  name: APP_NAME,
  path: app.getPath('exe'),
});

async function setupAutoLaunch() {
  const shouldAutoLaunch = store.get('autoLaunch');
  const isEnabled = await autoLauncher.isEnabled();

  if (shouldAutoLaunch && !isEnabled) {
    await autoLauncher.enable();
  } else if (!shouldAutoLaunch && isEnabled) {
    await autoLauncher.disable();
  }
}

// ============================================================================
// Global Variables
// ============================================================================

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

// ============================================================================
// Window Management
// ============================================================================

function createWindow() {
  const preloadPath = path.join(__dirname, 'preload.js');

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: APP_NAME,
    icon: ICON_PATH,
    show: false, // Don't show until ready
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: preloadPath,
    },
    autoHideMenuBar: true,
  });

  // Load the app URL
  mainWindow.loadURL(APP_URL);

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Handle external links - open in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.includes('chat.dpupr.com')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // Minimize to tray instead of closing
  mainWindow.on('close', (event) => {
    if (!isQuitting && store.get('minimizeToTray')) {
      event.preventDefault();
      mainWindow?.hide();

      // Show notification on first minimize
      if (Notification.isSupported()) {
        const firstMinimize = store.get('firstMinimize', true);
        if (firstMinimize) {
          new Notification({
            title: APP_NAME,
            body: 'Aplikasi berjalan di background. Klik icon di system tray untuk membuka.',
            icon: ICON_PATH,
          }).show();
          store.set('firstMinimize' as any, false);
        }
      }
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ============================================================================
// System Tray
// ============================================================================

function createTray() {
  try {
    // Create tray icon
    let trayIcon: Electron.NativeImage;

    try {
      trayIcon = nativeImage.createFromPath(TRAY_ICON_PATH);
      if (trayIcon.isEmpty()) {
        trayIcon = nativeImage.createFromPath(ICON_PATH);
      }
    } catch {
      trayIcon = nativeImage.createFromPath(ICON_PATH);
    }

    // Resize for tray (16x16 on Windows)
    trayIcon = trayIcon.resize({ width: 16, height: 16 });

    tray = new Tray(trayIcon);
    tray.setToolTip(APP_NAME);

    // Create context menu
    updateTrayMenu();

    // Double-click to show window
    tray.on('double-click', () => {
      showWindow();
    });

    // Single click to show window (Windows behavior)
    tray.on('click', () => {
      showWindow();
    });
  } catch (error) {
    console.error('Failed to create tray:', error);
  }
}

function updateTrayMenu() {
  if (!tray) return;

  const autoLaunchEnabled = store.get('autoLaunch');
  const minimizeToTrayEnabled = store.get('minimizeToTray');
  const notificationsEnabled = store.get('showNotifications');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Buka Chat DPUPR',
      click: () => showWindow(),
    },
    { type: 'separator' },
    {
      label: 'Pengaturan',
      submenu: [
        {
          label: 'Jalankan saat Startup',
          type: 'checkbox',
          checked: autoLaunchEnabled,
          click: async (menuItem) => {
            store.set('autoLaunch', menuItem.checked);
            await setupAutoLaunch();
            updateTrayMenu();
          },
        },
        {
          label: 'Minimize ke Tray',
          type: 'checkbox',
          checked: minimizeToTrayEnabled,
          click: (menuItem) => {
            store.set('minimizeToTray', menuItem.checked);
            updateTrayMenu();
          },
        },
        {
          label: 'Tampilkan Notifikasi',
          type: 'checkbox',
          checked: notificationsEnabled,
          click: (menuItem) => {
            store.set('showNotifications', menuItem.checked);
            updateTrayMenu();
          },
        },
      ],
    },
    { type: 'separator' },
    {
      label: 'Keluar',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
}

function showWindow() {
  if (mainWindow) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.show();
    mainWindow.focus();
  } else {
    createWindow();
  }
}

// ============================================================================
// IPC Handlers
// ============================================================================

function setupIpcHandlers() {
  // Show notification
  ipcMain.on('show-notification', (_, options: { title: string; body: string; icon?: string }) => {
    if (!store.get('showNotifications')) return;
    if (!Notification.isSupported()) return;

    const notification = new Notification({
      title: options.title,
      body: options.body,
      icon: options.icon || ICON_PATH,
      silent: false,
    });

    notification.on('click', () => {
      showWindow();
      mainWindow?.webContents.send('notification-clicked');
    });

    notification.show();
  });

  // Set badge count (taskbar overlay on Windows)
  ipcMain.on('set-badge-count', (_, count: number) => {
    if (process.platform === 'win32' && mainWindow) {
      if (count > 0) {
        // Create badge overlay
        const badge = createBadgeImage(count);
        mainWindow.setOverlayIcon(badge, `${count} pesan belum dibaca`);
      } else {
        mainWindow.setOverlayIcon(null, '');
      }
    }
  });

  // Get settings
  ipcMain.handle('get-settings', () => {
    return {
      autoLaunch: store.get('autoLaunch'),
      minimizeToTray: store.get('minimizeToTray'),
      showNotifications: store.get('showNotifications'),
    };
  });

  // Set settings
  ipcMain.handle('set-settings', async (_, settings: Partial<Settings>) => {
    if (settings.autoLaunch !== undefined) {
      store.set('autoLaunch', settings.autoLaunch);
      await setupAutoLaunch();
    }
    if (settings.minimizeToTray !== undefined) {
      store.set('minimizeToTray', settings.minimizeToTray);
    }
    if (settings.showNotifications !== undefined) {
      store.set('showNotifications', settings.showNotifications);
    }
    updateTrayMenu();
  });

  // Minimize to tray
  ipcMain.on('minimize-to-tray', () => {
    mainWindow?.hide();
  });
}

// ============================================================================
// Badge Image Helper
// ============================================================================

function createBadgeImage(count: number): Electron.NativeImage {
  // For Windows, we create a simple badge overlay
  // This is a simplified version - you could make it more sophisticated
  const { nativeImage } = require('electron');
  
  // Create a canvas-like badge using nativeImage
  // For now, return a simple circle with number
  // Note: For production, you might want to use canvas or a pre-made icon set
  
  try {
    // Try to load pre-made badge icons
    const badgeNumber = Math.min(count, 9);
    const badgePath = path.join(RESOURCES_PATH, `badge-${badgeNumber}.png`);
    const badge = nativeImage.createFromPath(badgePath);
    if (!badge.isEmpty()) {
      return badge;
    }
  } catch {
    // Fallback: use default icon
  }
  
  // Fallback: use a generic notification badge
  try {
    const genericBadge = nativeImage.createFromPath(path.join(RESOURCES_PATH, 'badge.png'));
    if (!genericBadge.isEmpty()) {
      return genericBadge;
    }
  } catch {
    // Ignore
  }
  
  // Last fallback: empty image (no badge)
  return nativeImage.createEmpty();
}

// ============================================================================
// App Lifecycle
// ============================================================================

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // Someone tried to run a second instance, focus our window
    showWindow();
  });

  app.whenReady().then(async () => {
    // Setup auto-launch
    await setupAutoLaunch();

    // Setup IPC handlers
    setupIpcHandlers();

    // Create window and tray
    createWindow();
    createTray();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });
}

// Prevent app from quitting when all windows are closed (for tray)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' && !store.get('minimizeToTray')) {
    app.quit();
  }
});

// Handle before quit
app.on('before-quit', () => {
  isQuitting = true;
});

export default {};
