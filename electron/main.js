const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

let win = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    fullscreen: false,
    title: 'Grand City',
    backgroundColor: '#07090d',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Load the built game. In production (packaged .exe) the renderer files
  // live in resources/app/dist. In dev, run `npm run dev:web` first.
  const prodPath = path.join(process.resourcesPath, 'app', 'dist', 'index.html');
  const devPath = path.join(__dirname, '..', 'dist', 'index.html');
  const fs = require('fs');
  const target = fs.existsSync(prodPath) ? prodPath : devPath;
  win.loadFile(target);

  // Open external links in the OS browser, keep game in-app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) { shell.openExternal(url); return { action: 'deny' }; }
    return { action: 'allow' };
  });

  win.on('closed', () => { win = null; });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
