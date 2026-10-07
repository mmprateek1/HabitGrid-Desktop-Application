import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// When running in development or portable folder, use folder; when installed, ensure robust persistent path
function getDataFilePath() {
  const localInFolder = path.join(__dirname, 'habitgrid-data.json');
  // If app is packaged into an exe or installer
  if (app.isPackaged) {
    // If local file exists next to exe or directory is writable, use appData for installed app
    return path.join(app.getPath('userData'), 'habitgrid-data.json');
  }
  return localInFolder;
}

const DATA_FILE = getDataFilePath();

function getDefaultData() {
  const today = new Date();
  const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const currentDay = today.getDate();

  return {
    habits: [
      { id: 'h1', name: 'Exercise & Stretching', createdAt: new Date().toISOString() },
      { id: 'h2', name: 'Read 20 mins', createdAt: new Date().toISOString() },
      { id: 'h3', name: 'Drink 2.5L Water', createdAt: new Date().toISOString() },
      { id: 'h4', name: 'Deep Work (2 hrs)', createdAt: new Date().toISOString() }
    ],
    completions: {
      [currentMonthKey]: {
        h1: [1, 2, Math.min(currentDay, 3), Math.min(currentDay, 5)].filter(d => d <= currentDay && d > 0),
        h2: [1, 2, 3, Math.min(currentDay, 4)].filter(d => d <= currentDay && d > 0),
        h3: [1, 2, 4, currentDay].filter(d => d <= currentDay && d > 0),
        h4: [2, 3, currentDay].filter(d => d <= currentDay && d > 0)
      }
    }
  };
}

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (!parsed.habits || !parsed.completions) {
        throw new Error('Invalid schema');
      }
      return parsed;
    }
  } catch (err) {
    console.warn('Failed to read or parse habitgrid-data.json, backing up if existed and creating defaults.', err);
    if (fs.existsSync(DATA_FILE)) {
      try {
        fs.renameSync(DATA_FILE, `${DATA_FILE}.bak-${Date.now()}`);
      } catch (backupErr) {
        console.error('Backup error:', backupErr);
      }
    }
  }

  const initial = getDefaultData();
  saveData(initial);
  return initial;
}

function saveData(data) {
  try {
    const tempFile = `${DATA_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempFile, DATA_FILE);
    return { success: true };
  } catch (err) {
    console.error('Error saving data:', err);
    return { success: false, error: err.message };
  }
}

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1220,
    height: 840,
    minWidth: 950,
    minHeight: 650,
    title: 'HabitGrid - Daily Habit Tracker',
    backgroundColor: '#0f172a',
    autoHideMenuBar: true,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0f172a',
      symbolColor: '#f8fafc',
      height: 34
    },
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  });

  const distIndexPath = path.join(__dirname, 'dist', 'index.html');
  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else if (fs.existsSync(distIndexPath)) {
    mainWindow.loadFile(distIndexPath);
  } else {
    mainWindow.loadURL('http://localhost:5173');
  }
}

// IPC Handlers
ipcMain.handle('habits:load', async () => {
  return loadData();
});

ipcMain.handle('habits:save', async (_event, data) => {
  return saveData(data);
});

ipcMain.handle('habits:getDataPath', async () => {
  return DATA_FILE;
});

ipcMain.handle('window:setTheme', async (_event, theme) => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const isDark = theme === 'dark';
  try {
    mainWindow.setTitleBarOverlay({
      color: isDark ? '#0f172a' : '#f8fafc',
      symbolColor: isDark ? '#f8fafc' : '#0f172a',
      height: 34
    });
    mainWindow.setBackgroundColor(isDark ? '#0f172a' : '#f8fafc');
  } catch (err) {
    console.error('Failed to set title bar overlay:', err);
  }
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
