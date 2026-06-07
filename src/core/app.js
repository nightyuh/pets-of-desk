/**
 * 应用入口
 *
 * 初始化所有系统模块，启动桌宠。
 */

// 全局设置存储
window.__settings = {}
window.__modelList = []
window.__currentModel = ''

// ─── 从 Electron 读取设置 ─────────────────────
async function loadSettings() {
  if (window.electronAPI) {
    try {
      const settings = await window.electronAPI.getSettings()
      window.__settings = settings
    } catch (e) {
      console.warn('[设置] 读取失败，使用默认值:', e)
    }
  }
}

// ─── 加载模型列表 ─────────────────────────────
async function loadModelList() {
  if (!window.electronAPI) return
  try {
    window.__modelList = await window.electronAPI.getModelList()
  } catch (e) {
    console.warn('[模型] 列表加载失败:', e)
  }
}

// ─── 初始化全部模块 ───────────────────────────
async function initApp() {
  console.log('🐱 桌宠启动中...')

  // 1. 加载设置
  await loadSettings()

  // 2. 初始化 Live2D
  const canvas = document.getElementById('live2d-canvas')
  if (!canvas) {
    console.error('Canvas 元素未找到')
    return
  }

  const live2dOk = await window.__live2d.init(canvas)
  if (!live2dOk) {
    console.warn('Live2D 初始化失败，继续以纯 UI 模式运行')
  }

  // 3. 初始化状态系统
  window.__petState?.init()

  // 4. 初始化动画控制器
  window.__animCtrl?.init()

  // 5. 初始化交互
  window.__drag?.init()
  window.__click?.init()
  window.__keyboard?.init()
  window.__walk?.init()

  // 6. 初始化 UI
  window.__bubble?.init()
  window.__statusIndicator?.init()

  // 7. 启动定时器
  window.__timer?.start()

  // 8. 加载模型列表 + 初始化选择器
  await loadModelList()
  // 从设置中恢复上一次使用的模型
  if (window.__settings.modelPath) {
    window.__currentModel = window.__settings.modelPath
  } else if (window.__modelList.length > 0) {
    window.__currentModel = window.__modelList[0].path
  }
  setupModelSelector()

  // 9. 设置面板绑定
  setupSettingsPanel()

  // 10. 监听右键菜单动作
  if (window.electronAPI) {
    window.electronAPI.onMenuAction((action, ...args) => {
      handleMenuAction(action, ...args)
    })
  }

  // 10. 启动后显示一条欢迎
  setTimeout(() => {
    window.__bubble?.show('嘿！想我了吗~ ✨', 2500)
  }, 800)

  console.log('✅ 桌宠启动完成')
}

// ─── 菜单动作处理 ─────────────────────────────
function handleMenuAction(action, ...args) {
  switch (action) {
    case 'feed':
      window.__petState?.feed()
      window.__bubble?.show('好吃！啊呜啊呜~ 🍗', 2000)
      break
    case 'play':
      window.__petState?.play()
      window.__bubble?.show('嘻嘻！好好玩~ 🎉', 2000)
      break
    case 'rest':
      window.__petState?.rest()
      window.__bubble?.show('呼… 休息一下 😴', 2000)
      break
    case 'switch-model':
      if (args[0] && args[0].path) {
        doSwitchModel(args[0].path, args[0].name)
      }
      break
    case 'toggle-walk':
      window.__walk?.setEnabled(!window.__walk?.isEnabled())
      break
    case 'settings':
      toggleSettingsPanel()
      break
  }
}

// ─── 切换模型 ─────────────────────────────────
async function doSwitchModel(modelPath, modelName) {
  if (modelPath === window.__currentModel) return
  window.__bubble?.show(`切换模型中… 🔄`, 0)
  const ok = await window.__live2d?.switchModel(modelPath)
  if (ok) {
    window.__currentModel = modelPath
    window.__settings.modelPath = modelPath
    window.electronAPI?.setSetting('modelPath', modelPath)
    window.__bubble?.hide()
    window.__bubble?.show(`切换到 ${modelName || modelPath} ✨`, 2000)
    // 更新选择器选中状态
    updateModelSelector(modelPath)
  } else {
    window.__bubble?.hide()
    window.__bubble?.show('模型切换失败 😢', 2000)
  }
}

// ─── 模型选择器（设置面板）────────────────────
function setupModelSelector() {
  const container = document.getElementById('model-selector')
  if (!container) return
  // 初始由 updateModelSelector 填充
  updateModelSelector(window.__currentModel)
}

function updateModelSelector(activePath) {
  const container = document.getElementById('model-selector')
  if (!container) return
  container.innerHTML = ''
  for (const m of window.__modelList) {
    const btn = document.createElement('button')
    btn.className = 'model-btn'
    if (m.path === activePath) btn.classList.add('model-btn-active')
    btn.textContent = m.path === activePath ? `✓ ${m.name}` : m.name
    btn.addEventListener('click', () => doSwitchModel(m.path, m.name))
    container.appendChild(btn)
  }
}

// ─── 设置面板 ─────────────────────────────────
function setupSettingsPanel() {
  // 复选框
  bindCheckbox('setting-alwaysOnTop', 'alwaysOnTop', (val) => {
    window.electronAPI?.setSetting('alwaysOnTop', val)
  })
  bindCheckbox('setting-bubble', 'bubbleEnabled', (val) => {
    window.__settings.bubbleEnabled = val
    window.electronAPI?.setSetting('bubbleEnabled', val)
  })
  bindCheckbox('setting-idle', 'idleMotions', (val) => {
    window.__settings.idleMotions = val
    window.__animCtrl?.setActive(val)
    window.electronAPI?.setSetting('idleMotions', val)
  })
  bindCheckbox('setting-walk', 'walkEnabled', (val) => {
    window.__walk?.setEnabled(val)
  })

  // 透明度滑块
  const opacitySlider = document.getElementById('setting-opacity')
  if (opacitySlider) {
    opacitySlider.addEventListener('input', () => {
      const val = parseFloat(opacitySlider.value)
      window.electronAPI?.setSetting('opacity', val)
    })
  }

  // 大小滑块（仅保存值，实际缩放由 toggleSettingsPanel 在关闭时触发）
  const scaleSlider = document.getElementById('setting-scale')
  const scaleLabel = document.getElementById('setting-scale-label')
  if (scaleSlider) {
    const saved = window.__settings.scale ?? 1.0
    scaleSlider.value = saved
    if (scaleLabel) scaleLabel.textContent = Math.round(saved * 100) + '%'
    scaleSlider.addEventListener('input', () => {
      const val = Math.round(parseFloat(scaleSlider.value) * 10) / 10
      if (scaleLabel) scaleLabel.textContent = Math.round(val * 100) + '%'
      _savedScale = val
    })
  }

  // 监听主进程的缩放通知（Ctrl+滚轮缩放时更新滑块）
  if (window.electronAPI && window.electronAPI.onScaleChanged) {
    window.electronAPI.onScaleChanged((scale) => {
      window.__settings.scale = scale
      _savedScale = scale
      // 设置面板关闭时同步滑块，打开时不干扰
      const panel = document.getElementById('settings-panel')
      if (panel && panel.classList.contains('hidden')) {
        if (scaleSlider) scaleSlider.value = scale
        if (scaleLabel) scaleLabel.textContent = Math.round(scale * 100) + '%'
      }
      if (window.__live2d) {
        const model = window.__live2d.getModel()
        if (model) model.setPosition(0, -0.1)
      }
      updateKeyboardScale(scale)
    })
  }

  // 关闭按钮
  const closeBtn = document.getElementById('settings-close')
  if (closeBtn) {
    closeBtn.addEventListener('click', () => toggleSettingsPanel())
  }
  const closeX = document.getElementById('settings-close-x')
  if (closeX) {
    closeX.addEventListener('click', () => toggleSettingsPanel())
  }
}

function bindCheckbox(id, settingKey, onChange) {
  const el = document.getElementById(id)
  if (!el) return
  el.checked = window.__settings[settingKey] ?? true
  el.addEventListener('change', () => {
    window.__settings[settingKey] = el.checked
    onChange(el.checked)
  })
}

// 设置面板打开前的缩放值（关闭时恢复用）
let _savedScale = 1.0

function toggleSettingsPanel() {
  const panel = document.getElementById('settings-panel')
  if (!panel) return
  const isOpening = panel.classList.contains('hidden')

  if (isOpening) {
    // 打开设置 → 保存当前缩放，临时恢复到基础大小
    _savedScale = window.__settings.scale ?? 1.0
    panel.classList.remove('hidden')
    if (window.electronAPI) {
      window.electronAPI.resizePet(1.0)
    }
  } else {
    // 关闭设置 → 恢复之前的缩放
    panel.classList.add('hidden')
    if (window.electronAPI) {
      window.electronAPI.resizePet(_savedScale)
    }
  }
}

// ─── 键盘跟随缩放 ──────────────────────────────
function updateKeyboardScale(scale) {
  const kb = document.getElementById('typewriter-keyboard')
  if (kb) {
    kb.style.setProperty('--kb-scale', scale)
  }
}

// 启动时应用初始缩放
setTimeout(() => {
  updateKeyboardScale(window.__settings.scale ?? 1.0)
}, 100)

// ─── 鼠标跟踪（给 Live2D 眼睛跟随用）───────────
document.addEventListener('mousemove', (e) => {
  window.__live2d?.setMousePos(e.clientX, e.clientY)
})

// ─── Ctrl+滚轮缩放 ──────────────────────────────
document.addEventListener('wheel', (e) => {
  if (!e.ctrlKey && !e.metaKey) return

  e.preventDefault()
  const current = window.__settings.scale ?? 1.0
  const delta = e.deltaY > 0 ? -0.1 : 0.1
  const newScale = Math.round(Math.min(2.0, Math.max(0.5, current + delta)) * 10) / 10

  if (newScale !== current && window.electronAPI) {
    window.__settings.scale = newScale
    window.electronAPI.resizePet(newScale)
  }
}, { passive: false })

// ─── 键盘快捷键 ────────────────────────────────
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    // 关闭设置面板
    const panel = document.getElementById('settings-panel')
    if (panel && !panel.classList.contains('hidden')) {
      panel.classList.add('hidden')
    }
  }
})

// ─── 启动 ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initApp().catch(err => {
    console.error('启动失败:', err)
  })
})
