/**
 * 打字键盘 — 桌宠的小键盘
 *
 * 检测到用户打字时，在桌宠下方显示一个迷你键盘，
 * 按键会随机亮起模拟打字效果。
 */

let keyboardEl = null
let glowTimer = null
let _twActive = false
let keyElements = []

function initTypewriterKeyboard() {
  keyboardEl = document.getElementById('typewriter-keyboard')
  if (!keyboardEl) {
    console.warn('[键盘UI] DOM 元素未找到')
    return
  }

  // 缓存所有按键元素
  keyElements = Array.from(keyboardEl.querySelectorAll('.tw-key'))
}

function showKeyboard() {
  if (!keyboardEl || _twActive) return
  _twActive = true
  keyboardEl.classList.remove('hidden')
  startKeyGlow()
}

function hideKeyboard() {
  if (!keyboardEl || !_twActive) return
  _twActive = false
  keyboardEl.classList.add('hidden')
  stopKeyGlow()
  resetAllKeys()
}

function startKeyGlow() {
  // 不再随机亮键，改为由键盘交互驱动
  _twActive = true
}

function stopKeyGlow() {
  // 由 pressKey 管理发光
}

/**
 * 按下指定键时点亮对应按键
 * @param {string} key - 按键字符 (如 'A', 'B')
 */
function pressKey(key) {
  if (!keyboardEl || !_twActive) return
  const normalizedKey = String(key).toUpperCase()
  // 只匹配 A-Z 字母键
  if (!/^[A-Z]$/.test(normalizedKey)) return
  const keyEl = keyboardEl.querySelector(`[data-key="${normalizedKey}"]`)
  if (!keyEl) return

  keyEl.classList.add('tw-key-glow')
  setTimeout(() => {
    keyEl.classList.remove('tw-key-glow')
  }, 250)
}

function resetAllKeys() {
  keyElements.forEach(el => el.classList.remove('tw-key-glow'))
}

// 键盘布局数据（用于生成，不过我们已经在 HTML 里写好了）
const KEYBOARD_LAYOUT = [
  ['Q','W','E','R','T','Y','U','I','O','P'],
  ['A','S','D','F','G','H','J','K','L'],
  ['Z','X','C','V','B','N','M']
]

// ─── 导出 ──────────────────────────────────────
window.__typewriterKeyboard = {
  init: initTypewriterKeyboard,
  show: showKeyboard,
  hide: hideKeyboard,
  isActive: () => _twActive,
  pressKey
}
