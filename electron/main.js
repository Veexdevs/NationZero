/* NationZero — processo principal do Electron (versão desktop: .exe/.app/.AppImage/.deb) */

const { app, BrowserWindow, Menu, shell, ipcMain, dialog } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

const isDev = !app.isPackaged;
let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 380,
    minHeight: 560,
    backgroundColor: '#060b0a',
    title: 'NationZero',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'www', 'index.html'));

  mainWindow.once('ready-to-show', () => mainWindow.show());

  // Links externos abrem no navegador, nunca dentro do jogo
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => { mainWindow = null; });

  if (isDev) mainWindow.webContents.openDevTools({ mode: 'detach' });
}

function buildMenu() {
  const template = [
    {
      label: 'Jogo',
      submenu: [
        {
          label: 'Novo jogo',
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow && mainWindow.webContents.executeJavaScript('window.NZ && (window.NZ.state=null, window.NZ.screen="menu", window.NZ.render())'),
        },
        { type: 'separator' },
        { label: 'Sair', role: 'quit' },
      ],
    },
    { label: 'Editar', role: 'editMenu' },
    {
      label: 'Ver',
      submenu: [
        { role: 'reload' },
        { role: 'togglefullscreen' },
        { type: 'separator' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { role: 'resetZoom' },
        ...(isDev ? [{ role: 'toggleDevTools' }] : []),
      ],
    },
    {
      label: 'Ajuda',
      submenu: [
        {
          label: 'Como jogar',
          click: () => mainWindow && mainWindow.webContents.executeJavaScript('window.NZ && window.NZ.ui && import("./src/ui/modals.js").then(m=>m.showHelp(window.NZ))'),
        },
        { label: 'Sobre', click: () => dialog.showMessageBox(mainWindow, {
          type: 'info',
          title: 'NationZero',
          message: 'NationZero',
          detail: `Um simulador de poder. Versão ${app.getVersion()}.\n\nFeito com Electron + Web.`,
        }) },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
  buildMenu();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Exportar/importar save via diálogo nativo (opcional)
ipcMain.handle('nz:export', async (_e, payload) => {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Exportar save do NationZero',
    defaultPath: path.join(app.getPath('documents'), 'nationzero-save.json'),
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });
  if (canceled || !filePath) return { ok: false };
  fs.writeFileSync(filePath, payload, 'utf8');
  return { ok: true, filePath };
});
