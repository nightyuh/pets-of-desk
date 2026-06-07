/**
 * 拖拽功能
 *
 * 让桌宠可以在桌面上被拖拽移动。
 * 通过 IPC 通知主进程移动窗口（绝对坐标 + RAF 节流）。
 */

let isDragging = false
let hasMoved = false

// 起始位置
let startMouseX = 0
let startMouseY = 0
let startWinX = 0
let startWinY = 0

// RAF 节流
let rafId = null
let pendingX = 0
let pendingY = 0

function initDrag() {
  document.addEventListener('mousedown', onMouseDown)
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}

function onMouseDown(e) {
  if (e.button !== 0) return
  if (e.target.closest('.settings-panel, #bubble')) return

  isDragging = true
  hasMoved = false

  // 记录起始鼠标位置和窗口位置
  startMouseX = e.screenX
  startMouseY = e.screenY
  startWinX = e.screenX - e.clientX
  startWinY = e.screenY - e.clientY
}

function onMouseMove(e) {
  if (!isDragging) return

  const dx = e.screenX - startMouseX
  const dy = e.screenY - startMouseY

  if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
    if (!hasMoved) hasMoved = true

    // 计算绝对坐标并 RAF 节流
    pendingX = startWinX + dx
    pendingY = startWinY + dy
    scheduleMove()
  }
}

function scheduleMove() {
  if (rafId) return
  rafId = requestAnimationFrame(() => {
    rafId = null
    if (isDragging && window.electronAPI) {
      window.electronAPI.windowMoveAbs({ x: pendingX, y: pendingY })
    }
  })
}

function onMouseUp(e) {
  if (!isDragging) return
  isDragging = false

  if (rafId) {
    cancelAnimationFrame(rafId)
    rafId = null
  }

  if (hasMoved && window.electronAPI) {
    window.electronAPI.windowDragEnd()
  }
}

function isDragActive() {
  return hasMoved
}

// ─── 导出 ──────────────────────────────────────
window.__drag = {
  init: initDrag,
  isDragging: () => isDragging,
  isDragActive
}
