/**
 * 说话气泡
 *
 * 在桌宠头顶显示带台词的对话气泡。
 * 台词根据当前状态自动匹配。
 */

const BUBBLE_EL_ID = 'bubble'

// 台词配置表
const LINES = {
  happy:  ['嘿嘿~爱你呦 ♪','你好Furina' ,'今天心情不错！', '来玩吗来玩吗？', '好开心~ ✨'],
  sad:    ['别理我……', '不开心……', '呜呜……', '好寂寞……'],
  hungry: ['好饿啊……', '想吃东西……', '肚子咕咕叫……', '有吃的吗？'],
  sleepy: ['哈欠~~~~', '好困……', '想睡了……', '眼睛睁不开了……'],
  neutral: ['……', '嗯~', '今天做什么好呢？', '天气真好~']
}

let bubbleEl = null
let hideTimer = null

function initBubble() {
  bubbleEl = document.getElementById(BUBBLE_EL_ID)
  if (!bubbleEl) {
    console.warn('[气泡] DOM 元素 #bubble 未找到')
    return
  }
}

/**
 * 显示气泡
 * @param {string} text  - 台词
 * @param {number} duration - 显示时长（ms），默认 2000
 */
function showBubble(text, duration = 2000) {
  if (!bubbleEl) return

  // 清除之前的定时器
  if (hideTimer) {
    clearTimeout(hideTimer)
    hideTimer = null
  }

  bubbleEl.textContent = text
  bubbleEl.classList.remove('hidden')

  if (duration > 0) {
    hideTimer = setTimeout(() => {
      bubbleEl.classList.add('hidden')
      hideTimer = null
    }, duration)
  }
}

/**
 * 根据状态显示对应的台词
 */
function showStateBubble(state) {
  let pool = LINES.neutral

  if (state.mood < 30) pool = LINES.sad
  else if (state.hunger < 25) pool = LINES.hungry
  else if (state.energy < 15) pool = LINES.sleepy
  else if (state.mood > 70) pool = LINES.happy

  const text = pool[Math.floor(Math.random() * pool.length)]
  showBubble(text, 2500)
}

/**
 * 隐藏气泡
 */
function hideBubble() {
  if (!bubbleEl) return
  bubbleEl.classList.add('hidden')
  if (hideTimer) {
    clearTimeout(hideTimer)
    hideTimer = null
  }
}

// ─── 导出 ──────────────────────────────────────
window.__bubble = {
  init: initBubble,
  show: showBubble,
  showState: showStateBubble,
  hide: hideBubble
}
