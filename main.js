const { app, BrowserWindow, ipcMain, Menu, Tray, nativeImage } = require('electron')
const path = require('path')
const fs = require('fs')

// 全局键盘钩子（检测系统全局的键盘输入）
let uIOhook = null
try {
  uIOhook = require('uiohook-napi')
} catch {
  console.warn('uiohook-napi 未安装，键盘监听仅限窗口聚焦时有效')
}

// 持久化设置（electron-store）
let store = null

// 在 electron-store 加载失败时降级到 JSON 文件
function getStore() {
  if (store) return store
  try {
    const Store = require('electron-store')
    store = new Store({
      defaults: require('./config/settings.js')
    })
    return store
  } catch {
    return null
  }
}

const settingsPath = path.join(app.getPath('userData'), 'settings.json')
function readSettings() {
  try {
    const s = getStore()
    if (s) return s.store
    return JSON.parse(fs.readFileSync(settingsPath, 'utf-8'))
  } catch {
    return require('./config/settings.js')
  }
}
function writeSettings(data) {
  const s = getStore()
  if (s) {
    for (const [k, v] of Object.entries(data)) s.set(k, v)
  } else {
    fs.writeFileSync(settingsPath, JSON.stringify(data, null, 2))
  }
}

let mainWindow = null
let tray = null

function createWindow() {
  const settings = readSettings()

  const baseW = 300, baseH = 400
  const s = settings.scale ?? 1.0

  mainWindow = new BrowserWindow({
    width: Math.round(baseW * s),
    height: Math.round(baseH * s),
    minWidth: Math.round(baseW * 0.5),
    minHeight: Math.round(baseH * 0.5),
    x: settings.position?.x,
    y: settings.position?.y,
    transparent: true,
    frame: false,
    alwaysOnTop: settings.alwaysOnTop ?? true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      transparent: true,
      webSecurity: false  // 允许 file:// 下的 fetch，本地应用无需此安全限制
    }
  })

  mainWindow.setOpacity(settings.opacity ?? 1.0)
  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'))

  // 点击穿透 — 只允许在角色区域交互
  mainWindow.setIgnoreMouseEvents(false)

  // 开发工具（--dev 参数打开）
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  }
}

// ─── 托盘 ───────────────────────────────────────
function createTray() {
  try {
    const iconPath = path.join(__dirname, 'resources', 'xiaomao.png')
    const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })
    tray = new Tray(icon)
    tray.setToolTip('Live2D 桌宠')

    const ctxMenu = Menu.buildFromTemplate([
      {
        label: '显示/隐藏',
        click: () => {
          if (mainWindow.isVisible()) mainWindow.hide()
          else mainWindow.show()
        }
      },
      { type: 'separator' },
      {
        label: '退出桌宠',
        click: () => { app.quit() }
      }
    ])
    tray.setContextMenu(ctxMenu)
    tray.on('click', () => mainWindow.show())
  } catch {
    // 没有图标文件就不创建托盘
  }
}

// ─── IPC 处理 ────────────────────────────────────
ipcMain.on('window-drag-start', () => {
  // 拖拽开始，由 renderer 端处理 mousedown/mousemove
})

ipcMain.on('window-move-abs', (_, { x, y }) => {
  if (mainWindow) {
    mainWindow.setPosition(Math.round(x), Math.round(y))
  }
})

ipcMain.handle('get-win-position', () => {
  if (!mainWindow) return { x: 0, y: 0 }
  const [x, y] = mainWindow.getPosition()
  return { x, y }
})

ipcMain.on('window-drag-end', () => {
  // 保存位置
  if (mainWindow) {
    const [x, y] = mainWindow.getPosition()
    writeSettings({ position: { x, y } })
  }
})

ipcMain.on('get-settings', (event) => {
  event.returnValue = readSettings()
})

ipcMain.handle('get-settings-async', () => {
  return readSettings()
})

// ─── 扫描可用模型 ──────────────────────────────
ipcMain.handle('get-model-list', () => {
  const modelsDir = path.join(__dirname, 'src', 'assets', 'models')
  const results = []

  function scanDir(dir, basePrefix) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        if (!entry.isDirectory()) continue
        const fullPath = path.join(dir, entry.name)
        const files = fs.readdirSync(fullPath)
        const modelFile = files.find(f => f.endsWith('.model3.json') || f.endsWith('.model.json'))
        if (modelFile) {
          results.push({
            name: entry.name,
            path: `${basePrefix}${entry.name}/${modelFile}`
          })
        } else {
          // 递归深入一层（适配 default/ 这类中间目录）
          scanDir(fullPath, `${basePrefix}${entry.name}/`)
        }
      }
    } catch { /* 跳过无权限的目录 */ }
  }

  scanDir(modelsDir, 'assets/models/')
  return results
})

ipcMain.on('set-setting', (_, { key, value }) => {
  const store = getStore()
  if (store) store.set(key, value)
  else {
    const data = readSettings()
    data[key] = value
    writeSettings(data)
  }

  // 实时应用某些设置
  if (key === 'opacity' && mainWindow) {
    mainWindow.setOpacity(value)
  }
  if (key === 'alwaysOnTop' && mainWindow) {
    mainWindow.setAlwaysOnTop(value)
  }
  if (key === 'scale' && mainWindow) {
    const baseW = 300, baseH = 400
    mainWindow.setResizable(true)
    mainWindow.setSize(Math.round(baseW * value), Math.round(baseH * value))
    mainWindow.setResizable(false)
    mainWindow.webContents.send('scale-changed', value)
  }
})

// 缩放（由渲染进程的 Ctrl+滚轮 触发）
ipcMain.on('resize-pet', (_, { scale }) => {
  const store = getStore()
  if (store) store.set('scale', scale)
  else {
    const data = readSettings()
    data.scale = scale
    writeSettings(data)
  }
  if (mainWindow) {
    const baseW = 300, baseH = 400
    mainWindow.setResizable(true)
    mainWindow.setSize(Math.round(baseW * scale), Math.round(baseH * scale))
    mainWindow.setResizable(false)
    mainWindow.webContents.send('scale-changed', scale)
  }
})

// ─── 右键菜单（主进程原生）────────────────────
ipcMain.on('show-context-menu', (event, { state, models, currentModel, walkEnabled }) => {
  const template = [
    {
      label: `❤️ 心情 ${'█'.repeat(Math.floor(state.mood / 10))}${'░'.repeat(10 - Math.floor(state.mood / 10))} ${Math.round(state.mood)}`,
      enabled: false
    },
    {
      label: `🍗 饱腹 ${'█'.repeat(Math.floor(state.hunger / 10))}${'░'.repeat(10 - Math.floor(state.hunger / 10))} ${Math.round(state.hunger)}`,
      enabled: false
    },
    {
      label: `⚡ 精力 ${'█'.repeat(Math.floor(state.energy / 10))}${'░'.repeat(10 - Math.floor(state.energy / 10))} ${Math.round(state.energy)}`,
      enabled: false
    },
    { type: 'separator' },
    { label: '🍗 喂食', click: () => mainWindow.webContents.send('menu-action', 'feed') },
    { label: '🧸 陪玩', click: () => mainWindow.webContents.send('menu-action', 'play') },
    { label: '😴 休息', click: () => mainWindow.webContents.send('menu-action', 'rest') },
    { type: 'separator' },
    {
      label: walkEnabled ? '🚶 散步中' : '🚶 散步',
      click: () => mainWindow.webContents.send('menu-action', 'toggle-walk')
    },
    {
      label: '🔄 切换模型',
      submenu: (models || []).map(m => ({
        label: m.name === currentModel ? `✓ ${m.name}` : m.name,
        click: () => mainWindow.webContents.send('menu-action', 'switch-model', m)
      }))
    },
    { type: 'separator' },
    { label: '⚙️ 设置', click: () => mainWindow.webContents.send('menu-action', 'settings') },
    { type: 'separator' },
    { label: '✕ 退出', click: () => app.quit() }
  ]

  const menu = Menu.buildFromTemplate(template)
  menu.popup({ window: mainWindow })
})

// ─── 全局键盘钩子 ──────────────────────────────
// 可打印字符的 keycode 集合（A-Z, 0-9, 标点, Space, Enter, Backspace）
const PRINTABLE_KEYCODES = new Set([
  30,48,46,32,18,33,34,35,23,36,37,38,50,49,24,25,16,19,31,20,22,47,17,45,21,44,  // A-Z
  2,3,4,5,6,7,8,9,10,11,  // 1-9, 0
  57,   // Space
  28,   // Enter
  14,   // Backspace
  39,13,51,12,52,53,41,26,43,27,40  // 标点符号
])

function startGlobalKeyboardHook() {
  if (!uIOhook || !uIOhook.uIOhook) return
  const { uIOhook: hook } = uIOhook

  hook.on('keydown', (e) => {
    if (PRINTABLE_KEYCODES.has(e.keycode) && mainWindow) {
      mainWindow.webContents.send('global-keydown', e)
    }
  })

  try {
    hook.start()
    console.log('✅ 全局键盘钩子已启动')
  } catch (err) {
    console.warn('全局键盘钩子启动失败:', err.message)
  }
}

function stopGlobalKeyboardHook() {
  if (!uIOhook || !uIOhook.uIOhook) return
  try { uIOhook.uIOhook.stop() } catch {}
}

// ─── 应用生命周期 ──────────────────────────────
// 允许 file:// 协议下的 fetch 和 import（加载 Live2D 模型需要）
app.commandLine.appendSwitch('allow-file-access-from-files')

app.whenReady().then(() => {
  createWindow()
  createTray()
  startGlobalKeyboardHook()
})

app.on('will-quit', () => {
  stopGlobalKeyboardHook()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  if (mainWindow) {
    const [x, y] = mainWindow.getPosition()
    writeSettings({ position: { x, y } })
  }
})
