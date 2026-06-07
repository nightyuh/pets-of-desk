/**
 * 状态指示器
 *
 * 在窗口底部显示心情/饱腹/精力的小图标状态条。
 */

function initStatusIndicator() {
  // 监听状态变化，更新显示
  if (window.__petState) {
    window.__petState.onChange(updateDisplay)
  }
}

function updateDisplay(state) {
  const moodEl = document.getElementById('status-mood')
  const hungerEl = document.getElementById('status-hunger')
  const energyEl = document.getElementById('status-energy')

  if (moodEl) moodEl.textContent = `❤️ ${Math.round(state.mood)}`
  if (hungerEl) hungerEl.textContent = `🍗 ${Math.round(state.hunger)}`
  if (energyEl) energyEl.textContent = `⚡ ${Math.round(state.energy)}`
}

// ─── 导出 ──────────────────────────────────────
window.__statusIndicator = {
  init: initStatusIndicator
}
