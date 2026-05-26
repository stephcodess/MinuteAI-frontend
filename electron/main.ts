import { app, BrowserWindow, ipcMain, Menu, dialog, shell, Notification } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
import electronUpdater from 'electron-updater'
const { autoUpdater } = electronUpdater

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
// In dev: __dirname = dist-electron/, renderer is served by Vite dev server
// In prod: __dirname = dist-electron/, renderer is at ../dist/index.html
const RENDERER_DIST = path.join(__dirname, '../dist')

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    backgroundColor: '#080b14',
    show: false,
    icon: path.join(__dirname, '../electron/assets/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  // Show only when ready to avoid white flash
  mainWindow.once('ready-to-show', () => {
    mainWindow!.show()
  })

  // Google OAuth popup must stay inside Electron so that accounts.google.com/gsi/transform
  // can reach window.opener.postMessage() and deliver the access token back to the renderer.
  // All other external links open in the system browser.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://accounts.google.com/')) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: 500,
          height: 650,
          parent: mainWindow ?? undefined,
          modal: true,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
          },
        },
      }
    }
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}


// ── Auto-updater ──────────────────────────────────────────────────────────────

function setupUpdater() {
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('update-available', info => {
    new Notification({
      title: 'MinuteAI Update',
      body: `Version ${info.version} is downloading in the background.`,
      icon: path.join(__dirname, '../electron/assets/icon.png'),
    }).show()
    mainWindow?.webContents.send('update:available', { version: info.version })
  })

  autoUpdater.on('download-progress', progress => {
    mainWindow?.webContents.send('update:progress', {
      percent:       Math.floor(progress.percent),
      transferred:   progress.transferred,
      total:         progress.total,
      bytesPerSecond: progress.bytesPerSecond,
    })
  })

  autoUpdater.on('update-downloaded', info => {
    new Notification({
      title: 'MinuteAI Ready to Update',
      body: `Version ${info.version} downloaded. Restart to apply.`,
      icon: path.join(__dirname, '../electron/assets/icon.png'),
    }).show()
    mainWindow?.webContents.send('update:ready', { version: info.version })
  })

  autoUpdater.on('error', err => {
    mainWindow?.webContents.send('update:error', { message: err.message })
  })
}

// ── IPC handlers ──────────────────────────────────────────────────────────────

ipcMain.handle('dialog:openFile', async (_event, filters) => {
  if (!mainWindow) return null

  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Audio File',
    properties: ['openFile'],
    filters: filters ?? [
      {
        name: 'Audio / Video',
        extensions: ['mp3', 'mp4', 'm4a', 'wav', 'webm', 'ogg', 'flac', 'aac', 'opus'],
      },
    ],
  })

  if (canceled || !filePaths[0]) return null

  const filePath = filePaths[0]
  const buffer = fs.readFileSync(filePath)
  const name = path.basename(filePath)

  // Return the raw buffer; renderer will reconstruct a File from it
  return { name, data: buffer.buffer as ArrayBuffer }
})

ipcMain.handle('app:version', () => app.getVersion())

ipcMain.on('update:install', () => autoUpdater.quitAndInstall())

// ── Lifecycle ─────────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  Menu.setApplicationMenu(null)
  setupUpdater()
  createWindow()
  // Check for updates after window is ready (not on dev server)
  if (!VITE_DEV_SERVER_URL) {
    autoUpdater.checkForUpdates().catch(() => {})
  }

  // macOS: recreate the window when the dock icon is clicked and no windows exist
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
