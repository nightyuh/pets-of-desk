/**
 * 动画调度器
 *
 * 管理模型的待机动作、表情切换、动作队列。
 * Phase 3: 完成版 — 状态影响表情 + 随机待机动作
 */

let isActive = true

function initAnimationController() {
  console.log('[动画] 调度器已初始化')
}

function updateAnimationController(petState) {
  if (!isActive || !petState) return
  applyExpressionFromState(petState)
}

/**
 * 根据状态调整模型参数来模拟表情
 * 使用 ParamAngleX/Y/Z、ParamEyeLOpen、ParamBrowRY 等参数
 */
function applyExpressionFromState(state) {
  const model = window.__live2d?.getModel()
  if (!model) return

  const mood = state.mood       // 0~100
  const energy = state.energy   // 0~100
  const hunger = state.hunger   // 0~100

  // 心情 → 头部倾斜 + 眉毛
  const headTilt = (50 - mood) * 0.15           // 心情差就歪头（值范围 -30~30）
  const browPos = Math.max(-1, Math.min(1, (mood - 50) * 0.02))  // 心情好眉毛高（范围 -1~1）

  // 精力 → 眼睛睁开程度
  const eyeOpen = Math.max(0.1, energy / 100)   // 困了就半闭眼

  // 饱腹 → 嘴巴（饿的时候嘴微张）
  const mouthOpen = hunger < 30 ? 0.3 : 0

  // 批量设置参数
  model.setParams({
    ParamAngleX: 0,
    ParamAngleY: 0,
    ParamAngleZ: headTilt,
    ParamBrowRY: browPos,
    ParamBrowLY: browPos,
    ParamEyeLOpen: eyeOpen,
    ParamEyeROpen: eyeOpen,
    ParamMouthOpenY: mouthOpen
  })
}

function triggerRandomIdle() {
  const motions = ['Idle']  // l2d 会自动选取随机的 Idle 动作
  if (window.__live2d) {
    window.__live2d.playMotion('Idle')
  }
}

function setActive(active) {
  isActive = active
}

// ─── 导出 ──────────────────────────────────────
window.__animCtrl = {
  init: initAnimationController,
  update: updateAnimationController,
  triggerIdle: triggerRandomIdle,
  setActive
}
