/**
 * 键盘监听 — 打字时桌宠跟着动
 *
 * 支持两种模式：
 * 1. DOM keydown（窗口聚焦时）
 * 2. 全局键盘钩子（uiohook-napi，系统全局）
 */

let isTyping = false
let typingTimer = null
let keystrokeCount = 0
let paramTimer = null

const TYPING_IDLE_TIMEOUT = 1500  // ms，无按键后恢复待机

// DOM 事件要忽略的按键（修饰键、功能键、导航键等）
const IGNORED_KEYS = new Set([
  'Shift', 'Control', 'Alt', 'Meta',
  'CapsLock', 'Tab', 'Escape', 'Enter',
  'Backspace', 'Delete', 'Insert',
  'Home', 'End', 'PageUp', 'PageDown',
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'F1','F2','F3','F4','F5','F6','F7','F8',
  'F9','F10','F11','F12',
  'NumLock', 'ScrollLock', 'Pause',
  'PrintScreen'
])

// uiohook 键码 → 字符映射（用于全局键盘钩子）
const HID_KEYCODE_TO_CHAR = {
  30:'A', 48:'B', 46:'C', 32:'D', 18:'E', 33:'F', 34:'G', 35:'H',
  23:'I', 36:'J', 37:'K', 38:'L', 50:'M', 49:'N', 24:'O', 25:'P',
  16:'Q', 19:'R', 31:'S', 20:'T', 22:'U', 47:'V', 17:'W', 45:'X', 21:'Y', 44:'Z',
  2:'1', 3:'2', 4:'3', 5:'4', 6:'5', 7:'6', 8:'7', 9:'8', 10:'9', 11:'0',
  57:' ', 28:'Enter', 14:'Backspace'
}

function initKeyboardMonitor() {
  // 方式 1：窗口聚焦时捕获键盘（DOM 事件）
  document.addEventListener('keydown', onDomKeyDown)

  // 方式 2：全局键盘钩子（通过主进程 uiohook，适用于任何窗口）
  if (window.electronAPI && window.electronAPI.onGlobalKeydown) {
    window.electronAPI.onGlobalKeydown(onGlobalKeyDown)
  }

  // 初始化键盘 UI
  if (window.__typewriterKeyboard) {
    window.__typewriterKeyboard.init()
  }

  console.log('[键盘] 打字监听已启动')
}

// ─── DOM 键盘事件（窗口聚焦时）─────────────
function onDomKeyDown(e) {
  // 只检测可打印字符键
  if (IGNORED_KEYS.has(e.key)) return
  if (e.ctrlKey || e.altKey || e.metaKey) return
  if (e.key.length > 1) return
  processKeyStroke(e.key)
}

// ─── 全局键盘钩子（任何窗口）───────────────
function onGlobalKeyDown(rawEvent) {
  // 主进程已经过滤过 PRINTABLE_KEYCODES，这里直接处理
  const key = HID_KEYCODE_TO_CHAR[rawEvent.keycode] || ''
  processKeyStroke(key)
}

// ─── 核心逻辑 ────────────────────────────────
function processKeyStroke(key) {
  keystrokeCount++

  if (!isTyping) {
    startTyping()
  }

  // 每次按键触发微小的参数变化
  applyKeystrokeParam()

  // 🔑 点亮键盘上对应的按键
  if (window.__typewriterKeyboard && key) {
    window.__typewriterKeyboard.pressKey(key)
  }

  // 重置闲置定时器
  clearTimeout(typingTimer)
  typingTimer = setTimeout(stopTyping, TYPING_IDLE_TIMEOUT)
}

function startTyping() {
  isTyping = true
  console.debug('[键盘] 开始打字')

  // 显示打字气泡
  if (window.__bubble && (window.__settings?.bubbleEnabled ?? true)) {
    window.__bubble.show('打字中… 📝', 0)  // duration=0 表示不自动隐藏
  }

  // 显示小键盘
  if (window.__typewriterKeyboard) {
    window.__typewriterKeyboard.show()
  }

  // 启动周期性参数抖动
  paramTimer = setInterval(() => {
    applyTypingBounce()
  }, 300)
}

function stopTyping() {
  if (!isTyping) return
  isTyping = false
  console.debug('[键盘] 停止打字 (敲了', keystrokeCount, '键)')

  // 隐藏气泡
  if (window.__bubble) {
    window.__bubble.hide()
  }

  // 隐藏小键盘
  if (window.__typewriterKeyboard) {
    window.__typewriterKeyboard.hide()
  }

  // 停止参数抖动
  if (paramTimer) {
    clearInterval(paramTimer)
    paramTimer = null
  }

  // 恢复模型到正常姿态
  restoreNormalPose()

  keystrokeCount = 0
}

/**
 * 每次按键的小幅参数抖动
 */
function applyKeystrokeParam() {
  const model = window.__live2d?.getModel()
  if (!model) return

  model.setParams({
    ParamShoulderRY: 2 + Math.random() * 2,
    ParamBodyAngleX: (Math.random() - 0.5) * 1.5
  })
}

/**
 * 打字中的周期性弹动（模拟打字节奏）
 */
function applyTypingBounce() {
  const model = window.__live2d?.getModel()
  if (!model) return

  const t = Date.now() / 200
  model.setParams({
    ParamBreath: 0.5 + Math.sin(t) * 0.15,
    ParamShoulderRY: 0.5 + Math.sin(t * 1.5) * 0.5,
    ParamBreastY: Math.sin(t * 0.8) * 0.3
  })
}

/**
 * 停止打字后恢复自然姿态
 */
function restoreNormalPose() {
  const model = window.__live2d?.getModel()
  if (!model) return

  model.setParams({
    ParamShoulderRY: 0,
    ParamBodyAngleX: 0,
    ParamBreath: 0,
    ParamBreastY: 0
  })
}

// ─── 导出 ──────────────────────────────────────
window.__keyboard = {
  init: initKeyboardMonitor,
  isTyping: () => isTyping
}
