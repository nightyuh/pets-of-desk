/**
 * 点击交互
 *
 * 单击角色 → 开心反馈 + 气泡 + 心情增加
 * 双击角色 → 休息模式
 * 右键 → 交给主进程弹出菜单
 */

let lastClickTime = 0
const DOUBLE_CLICK_DELAY = 400  // ms

function initClickHandler() {
  document.addEventListener('mousedown', onClick)
  document.addEventListener('contextmenu', onRightClick)
}

function onClick(e) {
  // 只处理左键
  if (e.button !== 0) return

  // 忽略在 UI 元素上的点击
  if (e.target.closest('.settings-panel, #bubble')) return

  const now = Date.now()

  // 双击检测
  if (now - lastClickTime < DOUBLE_CLICK_DELAY) {
    onDoubleClick()
    lastClickTime = 0
    return
  }

  lastClickTime = now

  // 如果是拖拽则忽略单击
  setTimeout(() => {
    if (window.__drag && window.__drag.isDragActive()) return
    onSingleClick()
  }, 50)
}

function onSingleClick() {
  console.debug('[交互] 单击')

  // 增加心情
  if (window.__petState) {
    window.__petState.pet()
  }

  // 播放 Tap 反馈动作
  if (window.__live2d) {
    window.__live2d.playMotion('TapBody')
  }

  // 根据当前状态显示对应气泡
  if (window.__bubble && (window.__settings?.bubbleEnabled ?? true)) {
    const state = window.__petState?.getState()
    if (state) {
      window.__bubble.showState(state)
    } else {
      window.__bubble.show('诶嘿~ ♪', 2000)
    }
  }
}

function onDoubleClick() {
  console.debug('[交互] 双击')

  const state = window.__petState?.getState()
  if (state && state.energy < 30) {
    // 精力不足 → 小睡
    if (window.__petState) window.__petState.rest()
    if (window.__bubble) window.__bubble.show('好困… 眯一会儿~ 😴', 2500)
  } else {
    // 有精力 → 跳一跳
    if (window.__bubble) window.__bubble.show('嘿！跳一跳~ ✨', 1500)
  }
}

function onRightClick(e) {
  e.preventDefault()
  const state = window.__petState?.getState() || { mood: 80, hunger: 60, energy: 80 }
  if (window.electronAPI) {
    window.electronAPI.showContextMenu({
      state,
      models: window.__modelList || [],
      currentModel: window.__currentModel,
      walkEnabled: window.__walk?.isEnabled() ?? false
    })
  }
}

/**
 * Live2D 原生 tap 事件回调（由 l2d 包在命中 hit area 时触发）
 */
function onTap(areaName) {
  console.debug('[交互] tap 区域:', areaName)
  // 不同区域不同反应
  if (areaName === 'Head' || areaName === 'Body') {
    onSingleClick()
  }
}

// ─── 导出 ──────────────────────────────────────
window.__click = {
  init: initClickHandler,
  onTap
}
