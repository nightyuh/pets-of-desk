const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // 窗口拖拽（绝对坐标 + RAF 节流）
  windowMoveAbs: (pos) => ipcRenderer.send('window-move-abs', pos),
  getWinPosition: () => ipcRenderer.invoke('get-win-position'),
  windowDragEnd: () => ipcRenderer.send('window-drag-end'),

  // 设置
  getSettings: () => ipcRenderer.invoke('get-settings-async'),
  setSetting: (key, value) => ipcRenderer.send('set-setting', { key, value }),

  // 模型
  getModelList: () => ipcRenderer.invoke('get-model-list'),

  // 右键菜单（传递状态 + 模型列表 + 当前模型）
  showContextMenu: (data) => ipcRenderer.send('show-context-menu', data),

  // 菜单动作监听（支持额外参数，如模型切换）
  onMenuAction: (callback) => {
    ipcRenderer.on('menu-action', (_, action, ...args) => callback(action, ...args))
  },

  // 全局键盘事件监听（主进程通过 uiohook 捕获）
  onGlobalKeydown: (callback) => {
    ipcRenderer.on('global-keydown', (_, event) => callback(event))
  },

  // 缩放变化通知（主进程 → 渲染进程）
  onScaleChanged: (callback) => {
    ipcRenderer.on('scale-changed', (_, scale) => callback(scale))
  },

  // 缩放请求（渲染进程 → 主进程）
  resizePet: (scale) => {
    ipcRenderer.send('resize-pet', { scale })
  }
})
