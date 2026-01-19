/* eslint-disable @typescript-eslint/no-require-imports */
// Electron preload script
// This file is compiled separately and uses CommonJS

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to renderer
contextBridge.exposeInMainWorld('electron', {
  // Platform info
  platform: process.platform,
  
  // Notifications
  showNotification: (title, body) => {
    ipcRenderer.send('show-notification', { title, body });
  },
  
  // Window controls
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  
  // App info
  getVersion: () => ipcRenderer.invoke('get-version'),
});
