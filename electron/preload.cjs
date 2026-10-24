/* Preload mínimo e seguro: expõe apenas o necessário ao jogo. */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('NationZeroDesktop', {
  isDesktop: true,
  platform: process.platform,
  version: process.env.npm_package_version || '1.0.0',
  exportSave: (json) => ipcRenderer.invoke('nz:export', json),
});
