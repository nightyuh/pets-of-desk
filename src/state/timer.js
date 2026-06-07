/**
 * 定时器 — 周期性地驱动状态衰减和动画更新
 */

let tickInterval = null
let lastTick = 0

const TICK_INTERVAL_MS = 30000  // 每 30 秒一次状态衰减

function startTimer() {
  if (tickInterval) return
  lastTick = Date.now()

  tickInterval = setInterval(() => {
    // 状态衰减
    if (window.__petState) {
      window.__petState.decay()
    }

    // 动画调度更新（状态影响表情）
    if (window.__animCtrl) {
      const state = window.__petState?.getState()
      window.__animCtrl.update(state)
    }

    lastTick = Date.now()
  }, TICK_INTERVAL_MS)
}

function stopTimer() {
  if (tickInterval) {
    clearInterval(tickInterval)
    tickInterval = null
  }
}

// ─── 导出 ──────────────────────────────────────
window.__timer = {
  start: startTimer,
  stop: stopTimer,
  getTickInterval: () => TICK_INTERVAL_MS
}
