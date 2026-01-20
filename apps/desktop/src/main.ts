import { app, BrowserWindow, Menu, Tray, nativeImage, shell } from 'electron';
import * as path from 'path';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

const APP_URL = 'https://chat.dpupr.com';
const ICON_PATH = path.join(__dirname, '../../web/public/icon-512.png'); // Adjust path to web public folder

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'Chat DPUPR Banten',
    // icon: ICON_PATH,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    autoHideMenuBar: true,
  });

  // Load the live URL
  mainWindow.loadURL(APP_URL);

  // Open external links (not chat.dpupr.com) in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.includes('chat.dpupr.com')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Create System Tray
function createTray() {
  try {
    const icon = nativeImage.createFromPath(ICON_PATH).resize({ width: 16, height: 16 });
    tray = new Tray(icon);
    
    const contextMenu = Menu.buildFromTemplate([
      { label: 'Open Chat', click: () => mainWindow?.show() },
      { type: 'separator' },
      { label: 'Quit', click: () => {
        app.quit(); 
      }}
    ]);

    tray.setToolTip('Chat DPUPR');
    tray.setContextMenu(contextMenu);
    
    tray.on('click', () => mainWindow?.show());
  } catch (error) {
    console.warn('Tray icon not found or failed to load', error);
  }
}

app.whenReady().then(() => {
  createWindow();
  // createTray(); // Optional: Uncomment if icon exists and tray is desired

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
