/**
 * 散步模式 — 桌宠在桌面上左右溜达
 *
 * 可经由右键菜单或设置面板开关。
 * 散步时模型会有轻微晃动，配合窗口平滑移动。
 */

let _walkingEnabled = false
let _walkActive = false      // 是否正在走动（区别于开关状态）
let _walkAnimId = null
let _currentStep = 0
let _direction = 1           // 1=右, -1=左
let _windowWidth = 0
let _paused = false
let _pauseTimer = null
let _bounceTime = 0

const WALK_SPEED = 120       // px/s
const WALK_DISTANCE_MIN = 120
const WALK_DISTANCE_MAX = 350
const PAUSE_MIN = 2000
const PAUSE_MAX = 5000
const SCREEN_MARGIN = 20     // 离屏幕边缘的边距

function initWalk() {
  // 读取设置
  _walkingEnabled = window.__settings?.walkEnabled ?? false
  if (_walkingEnabled) startWalking()

  // 监听屏幕尺寸变化
  updateScreenSize()
}

function updateScreenSize() {
  _windowWidth = window.screen?.width || 1920
}

// ─── 开关 ──────────────────────────────────────
function setWalkingEnabled(enabled) {
  _walkingEnabled = enabled
  window.__settings.walkEnabled = enabled
  window.electronAPI?.setSetting('walkEnabled', enabled)

  if (enabled) {
    startWalking()
  } else {
    stopWalking()
  }
}

function isWalkingEnabled() {
  return _walkingEnabled
}

function isCurrentlyWalking() {
  return _walkActive
}

// ─── 散步循环 ──────────────────────────────────
function startWalking() {
  if (_walkActive) return
  _walkActive = true
  _bounceTime = 0
  console.log('[散步] 开始溜达')
  planNextWalk()
}

function stopWalking() {
  _walkActive = false
  _paused = false

  if (_walkAnimId) {
    cancelAnimationFrame(_walkAnimId)
    _walkAnimId = null
  }
  if (_pauseTimer) {
    clearTimeout(_pauseTimer)
    _pauseTimer = null
  }

  // 恢复姿态
  restoreWalkPose()
  console.log('[散步] 停止溜达')
}

// ─── 规划下一步 ────────────────────────────────
function planNextWalk() {
  if (!_walkActive || !_walkingEnabled) return

  // 随机方向（但不要太靠近屏幕边缘）
  _direction = Math.random() > 0.5 ? 1 : -1

  // 随机走多远
  const distance = WALK_DISTANCE_MIN + Math.random() * (WALK_DISTANCE_MAX - WALK_DISTANCE_MIN)
  _currentStep = 0

  // 启动移动动画
  if (window.electronAPI) {
    window.electronAPI.getWinPosition().then(({ x }) => {
      doWalk(x, distance)
    })
  }
}

function doWalk(startX, distance) {
  if (!_walkActive || !_walkingEnabled) return

  const targetX = startX + _direction * distance
  const startTime = performance.now()

  function step(now) {
    if (!_walkActive || !_walkingEnabled) return

    const elapsed = (now - startTime) / 1000
    const moved = _direction * WALK_SPEED * elapsed
    const newX = startX + moved

    // 检查边界
    const clampedX = clampToScreen(newX)

    // 如果到达目标或碰壁
    const reachedTarget = _direction > 0 ? newX >= targetX : newX <= targetX
    const hitBoundary = clampedX !== newX

    if (reachedTarget || hitBoundary) {
      // 移动到最后合法位置
      if (window.electronAPI) {
        window.electronAPI.windowMoveAbs({ x: Math.round(clampedX), y: 0 })
      }
      // 停一下再走
      enterPause()
      return
    }

    // 移动窗口
    if (window.electronAPI) {
      window.electronAPI.windowMoveAbs({ x: Math.round(clampedX), y: 0 })
    }

    // 走路晃动
    _bounceTime += 0.05
    applyWalkPose()

    _walkAnimId = requestAnimationFrame(step)
  }

  _walkAnimId = requestAnimationFrame(step)
}

function clampToScreen(targetX) {
  const maxX = _windowWidth - SCREEN_MARGIN
  const minX = SCREEN_MARGIN
  return Math.max(minX, Math.min(maxX, targetX))
}

function enterPause() {
  _paused = true
  restoreWalkPose()

  const duration = PAUSE_MIN + Math.random() * (PAUSE_MAX - PAUSE_MIN)
  _pauseTimer = setTimeout(() => {
    _paused = false
    if (_walkActive && _walkingEnabled) {
      planNextWalk()
    }
  }, duration)
}

// ─── 走路姿态 ──────────────────────────────────
function applyWalkPose() {
  const model = window.__live2d?.getModel()
  if (!model) return

  const t = _bounceTime
  model.setParams({
    ParamBodyAngleX: Math.sin(t * 8) * 2.5,
    ParamShoulderRY: 0.3 + Math.sin(t * 12) * 0.2,
    ParamBreath: 0.4 + Math.sin(t * 10) * 0.15
  })
}

function restoreWalkPose() {
  const model = window.__live2d?.getModel()
  if (!model) return
  model.setParams({
    ParamBodyAngleX: 0,
    ParamShoulderRY: 0,
    ParamBreath: 0
  })
}

// ─── 导出 ──────────────────────────────────────
window.__walk = {
  init: initWalk,
  setEnabled: setWalkingEnabled,
  isEnabled: isWalkingEnabled,
  isActive: isCurrentlyWalking
}
