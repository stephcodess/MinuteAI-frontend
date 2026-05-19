/** @type {import('electron-builder').Configuration} */
module.exports = {
  appId: 'com.minuteai.desktop',
  productName: 'MinuteAI',
  copyright: 'Copyright © 2026 MinuteAI',
  asar: true,

  directories: {
    output: 'release',
    buildResources: 'electron/assets',
  },

  // Files bundled into the installer — compiled renderer + compiled main/preload
  files: [
    'dist/**',
    'dist-electron/**',
  ],

  // ── Windows ─────────────────────────────────────────────────────────────────
  win: {
    target: [
      { target: 'nsis',     arch: ['x64'] },
      { target: 'portable', arch: ['x64'] },
    ],
    icon: 'electron/assets/icon.ico',
  },

  nsis: {
    oneClick: false,
    perMachine: false,
    allowToChangeInstallationDirectory: true,
    deleteAppDataOnUninstall: false,
    installerIcon: 'electron/assets/icon.ico',
    uninstallerIcon: 'electron/assets/icon.ico',
    shortcutName: 'MinuteAI',
  },

  // ── macOS ────────────────────────────────────────────────────────────────────
  mac: {
    target: [
      { target: 'dmg', arch: ['x64', 'arm64'] },
    ],
    icon: 'electron/assets/icon.icns',
    category: 'public.app-category.productivity',
    // Hardened runtime is required for notarization
    hardenedRuntime: true,
    gatekeeperAssess: false,
    entitlements: 'electron/assets/entitlements.mac.plist',
    entitlementsInherit: 'electron/assets/entitlements.mac.plist',
  },

  dmg: {
    title: 'MinuteAI',
    contents: [
      { x: 130, y: 220 },
      { x: 410, y: 220, type: 'link', path: '/Applications' },
    ],
  },

  // ── Auto-updater (GitHub Releases) ──────────────────────────────────────────
  publish: {
    provider: 'github',
    releaseType: 'draft',
  },
}
