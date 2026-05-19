import { contextBridge, ipcRenderer } from 'electron'

const electronAPI = {
  /** 'win32' | 'darwin' | 'linux' */
  platform: process.platform,

  /** Open the OS native file picker and return the selected audio file as a File-like object. */
  openFile: (
    filters?: { name: string; extensions: string[] }[],
  ): Promise<{ name: string; data: ArrayBuffer } | null> =>
    ipcRenderer.invoke('dialog:openFile', filters),

  /** Get the packaged app version (e.g. "1.0.0"). */
  getVersion: (): Promise<string> => ipcRenderer.invoke('app:version'),

  /**
   * Subscribe to native menu actions ('upload' | 'new-meeting').
   * Returns an unsubscribe function — call it in a useEffect cleanup.
   */
  onMenuAction: (callback: (action: string) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, action: string) => callback(action)
    ipcRenderer.on('menu:action', handler)
    return () => ipcRenderer.removeListener('menu:action', handler)
  },

  // ── Auto-updater ────────────────────────────────────────────────────────────

  onUpdateAvailable: (cb: (info: { version: string }) => void): (() => void) => {
    const handler = (_e: Electron.IpcRendererEvent, info: { version: string }) => cb(info)
    ipcRenderer.on('update:available', handler)
    return () => ipcRenderer.removeListener('update:available', handler)
  },

  onUpdateProgress: (cb: (p: { percent: number; bytesPerSecond: number; total: number }) => void): (() => void) => {
    const handler = (_e: Electron.IpcRendererEvent, p: any) => cb(p)
    ipcRenderer.on('update:progress', handler)
    return () => ipcRenderer.removeListener('update:progress', handler)
  },

  onUpdateReady: (cb: (info: { version: string }) => void): (() => void) => {
    const handler = (_e: Electron.IpcRendererEvent, info: { version: string }) => cb(info)
    ipcRenderer.on('update:ready', handler)
    return () => ipcRenderer.removeListener('update:ready', handler)
  },

  installUpdate: (): void => ipcRenderer.send('update:install'),
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)
