export {}

declare global {
  interface Window {
    /**
     * Exposed by electron/preload.ts via contextBridge.
     * Only defined when the app is running inside Electron.
     */
    electronAPI?: {
      /** 'win32' | 'darwin' | 'linux' */
      platform: string

      /** Open the OS native file picker. Returns null if the user cancels. */
      openFile: (
        filters?: { name: string; extensions: string[] }[],
      ) => Promise<{ name: string; data: ArrayBuffer } | null>

      /** Packaged app version string, e.g. "1.0.0" */
      getVersion: () => Promise<string>

      /**
       * Subscribe to native menu actions sent from the main process.
       * Returns an unsubscribe function — use it in a useEffect cleanup.
       */
      onMenuAction: (callback: (action: string) => void) => () => void
    }
  }
}
