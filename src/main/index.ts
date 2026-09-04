import { createRequire } from 'node:module'
import { join } from 'node:path'
import { registerDiskIpc } from './ipc/disk'
import { registerMlIpc } from './ipc/ml'
import { registerFirmwareIpc } from './ipc/firmware'
import { registerUpdateIpc } from './ipc/update'
import { registerBootLogoIpc } from './ipc/bootLogo'

// Electron's built-in "electron" module doesn't reliably expose named ESM
// exports on every Node/Electron combo (its shape isn't statically
// analyzable by cjs-module-lexer). Going through require() sidesteps that
// entirely - it's the same object Electron always gave CJS main processes.
const require = createRequire(import.meta.url)
const { app, shell, BrowserWindow, ipcMain } = require('electron') as typeof import('electron')

function createWindow(): InstanceType<typeof BrowserWindow> {
  const win = new BrowserWindow({
    width: 1040,
    height: 720,
    minWidth: 860,
    minHeight: 600,
    show: false,
    backgroundColor: '#ffffff',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: process.platform === 'darwin' ? { x: 16, y: 13 } : undefined,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false
    }
  })

  win.on('ready-to-show', () => win.show())

  // Forward renderer console output (including uncaught errors) to this
  // process's stdout - handy for debugging without opening DevTools.
  win.webContents.on('console-message', (event) => {
    console.log('[renderer]', event.level, event.message)
  })

  win.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return win
}

ipcMain.handle('app:getPlatform', () => process.platform)
ipcMain.handle('app:openExternal', (_event, url: string) => {
  if (/^https:\/\//.test(url)) {
    shell.openExternal(url)
  }
})
ipcMain.handle('app:quit', () => app.quit())

registerDiskIpc(ipcMain)
registerMlIpc(ipcMain)
registerFirmwareIpc(ipcMain)
registerBootLogoIpc(ipcMain)

app.whenReady().then(() => {
  const win = createWindow()
  registerUpdateIpc(ipcMain, win)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
