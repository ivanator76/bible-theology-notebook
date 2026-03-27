const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const net = require('net');

// ── Single-instance lock ───────────────────────────────────────────────────
//    If another instance is already running, focus its window and quit.
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
  process.exit(0);
}

// ── 1. Resolve data paths before loading backend ───────────────────────────
const userData = app.getPath('userData');
const dataDir = path.join(userData, 'data');
fs.mkdirSync(dataDir, { recursive: true });

process.env.DB_PATH = path.join(dataDir, 'notebook.db');
process.env.SETTINGS_PATH = path.join(dataDir, 'settings.json');

// ── 2. Ensure root node_modules (Electron-rebuilt) takes priority ──────────
//    So that backend/src/db.js gets the Electron-compatible better-sqlite3,
//    not the system-Node one in backend/node_modules.
const rootModules = path.resolve(__dirname, '..', 'node_modules');
process.env.NODE_PATH = rootModules;
require('module').Module._initPaths();

// ── 3. Find a free port and start Express backend ─────────────────────────
function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
    srv.on('error', reject);
  });
}

let PORT = null;

// ── 4. Wait for server to be ready ────────────────────────────────────────
function waitForServer(retries, cb) {
  http.get(`http://127.0.0.1:${PORT}/api/health`, cb)
    .on('error', () => {
      if (retries > 0) setTimeout(() => waitForServer(retries - 1, cb), 400);
    });
}

// ── 5. Create window ───────────────────────────────────────────────────────
function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'default',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: '聖經神學筆記',
  });

  waitForServer(25, () => {
    win.loadURL(`http://127.0.0.1:${PORT}`);
    win.show();
  });

  // Open http(s) links in the default browser, not in Electron
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(async () => {
  PORT = await getFreePort();
  process.env.PORT = String(PORT);
  require('../backend/src/server');
  createWindow();
});

// When a second instance tries to launch, focus the existing window
app.on('second-instance', () => {
  const wins = BrowserWindow.getAllWindows();
  if (wins.length > 0) {
    const win = wins[0];
    if (win.isMinimized()) win.restore();
    win.focus();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
