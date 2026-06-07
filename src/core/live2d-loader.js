/**
 * Live2D 模型加载器
 *
 * 使用 l2d 包加载和渲染 Live2D 模型。
 * https://www.npmjs.com/package/l2d
 *
 * 支持 Cubism 2 ~ Cubism 6 模型。
 */

let _l2dPet = null
let _l2dCanvas = null
let _l2dReady = false

// ─── 初始化 ────────────────────────────────────
async function initLive2D(canvasEl) {
  _l2dCanvas = canvasEl

  try {
    const init = window.__l2dInit
    if (!init) throw new Error('l2d bundle 未加载')

    _l2dPet = init(_l2dCanvas)
    if (!_l2dPet) {
      throw new Error('l2d init() 返回 null')
    }

    // 监听事件
    _l2dPet.on('loaded', () => {
      console.log('✅ Live2D 模型加载完成')
      _l2dReady = true
    })

    _l2dPet.on('tap', (areaName) => {
      console.debug('[Live2D] 点击区域:', areaName)
      // 触发点击交互
      if (window.__click && window.__click.onTap) {
        window.__click.onTap(areaName)
      }
    })

    _l2dPet.on('motionstart', (group, index, duration, file) => {
      console.debug('[Live2D] 动作开始:', group, index)
    })

    _l2dPet.on('motionend', (group, index, file) => {
      console.debug('[Live2D] 动作结束:', group, index)
    })

    // 加载模型
    const modelPath = 'assets/models/default/aidang/aidang_2.model3.json'//初始模型路径
    await _l2dPet.load({
      path: modelPath,
      position: [0, -0.1],
      scale: 1.0,
      logLevel: 'warn'
    })

    // 启动自动待机动作
    _l2dPet.playMotion('Idle')

    // 调试完成，不再打印参数列表

    return true
  } catch (err) {
    console.error('Live2D 初始化失败:', err)
    // 失败时回退到 Canvas2D 占位模型
    return initFallbackRenderer(_l2dCanvas)
  }
}

// ─── 回退渲染器（SDK 不可用时使用）─────────────
async function initFallbackRenderer(canvas) {
  console.log('[Live2D] 使用 Canvas2D 回退渲染器')
  // ...保持之前的占位模型代码
  // 简化版：画一个简单的卡通脸
  const ctx = canvas.getContext('2d')
  if (!ctx) return false

  canvas.width = 300
  canvas.height = 400

  function draw() {
    ctx.clearRect(0, 0, 300, 400)
    const time = Date.now() / 1000
    const breathe = Math.sin(time * 2) * 3

    // 身体
    ctx.fillStyle = '#FFD4C4'
    ctx.beginPath()
    ctx.ellipse(150, 200 + breathe, 50, 60, 0, 0, Math.PI * 2)
    ctx.fill()

    // 头
    ctx.fillStyle = '#FFE4E1'
    ctx.beginPath()
    ctx.ellipse(150, 120 + breathe * 0.3, 45, 48, 0, 0, Math.PI * 2)
    ctx.fill()

    // 眼睛
    ctx.fillStyle = '#3D2C1A'
    ctx.beginPath()
    ctx.arc(135, 115 + breathe * 0.3, 6, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(165, 115 + breathe * 0.3, 6, 0, Math.PI * 2)
    ctx.fill()

    // 嘴
    ctx.strokeStyle = '#D4786A'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(150, 130 + breathe * 0.3, 5, 0.2, Math.PI - 0.2)
    ctx.stroke()

    requestAnimationFrame(draw)
  }
  draw()
  return true
}

/**
 * 切换模型（替换 canvas → 重新初始化，避免 WebGL 上下文冲突）
 * @param {string} modelPath - 如 'assets/models/xxx/xxx.model3.json'
 */
async function switchModel(modelPath) {
  if (!_l2dCanvas) return false
  console.log('[Live2D] 切换模型:', modelPath)

  // 1. 销毁当前模型
  if (_l2dPet) {
    _l2dPet.destroy()
    _l2dPet = null
  }
  _l2dReady = false

  // 2. 创建新的 canvas 替换旧的
  const parent = _l2dCanvas.parentNode
  const newCanvas = document.createElement('canvas')
  newCanvas.id = 'live2d-canvas'
  newCanvas.width = _l2dCanvas.width
  newCanvas.height = _l2dCanvas.height
  newCanvas.style.cssText = _l2dCanvas.style.cssText
  parent.replaceChild(newCanvas, _l2dCanvas)
  _l2dCanvas = newCanvas

  // 3. 重新初始化
  const init = window.__l2dInit
  if (!init) {
    _l2dCanvas = null
    return false
  }

  try {
    _l2dPet = init(_l2dCanvas)
    if (!_l2dPet) throw new Error('init 返回 null')

    // 重新绑定事件
    _l2dPet.on('loaded', () => {
      console.log('✅ Live2D 模型加载完成:', modelPath)
      _l2dReady = true
      // 自动播放待机动作
      try { _l2dPet.playMotion('Idle') } catch {}
      try { _l2dPet.playMotion('idle') } catch {}
    })
    _l2dPet.on('tap', (areaName) => {
      console.debug('[Live2D] 点击区域:', areaName)
      if (window.__click && window.__click.onTap) {
        window.__click.onTap(areaName)
      }
    })
    _l2dPet.on('motionstart', (group, index) => {
      console.debug('[Live2D] 动作开始:', group, index)
    })
    _l2dPet.on('motionend', (group, index) => {
      console.debug('[Live2D] 动作结束:', group, index)
    })

    await _l2dPet.load({
      path: modelPath,
      position: [0, -0.1],
      scale: 1.0,
      logLevel: 'warn'
    })

    return true
  } catch (err) {
    console.error('[Live2D] 模型切换失败:', err)
    _l2dPet = null
    _l2dReady = false
    return false
  }
}

// ─── 对外接口 ──────────────────────────────────
window.__live2d = {
  init: initLive2D,
  isReady: () => _l2dReady,
  getModel: () => _l2dPet,
  setMousePos: (clientX, clientY) => {
    // 🖱️ 鼠标跟踪：模型头部跟随鼠标转动，眼睛看鼠标位置
    if (!_l2dPet) return
    const rect = _l2dCanvas?.getBoundingClientRect()
    if (!rect) return
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    // 鼠标相对窗口中心偏移 → 映射到头部角度 (-15~15度)
    const dx = (clientX - cx) / rect.width * 2    // -1~1
    const dy = (clientY - cy) / rect.height * 2    // -1~1
    _l2dPet.setParams({
      ParamAngleY: dx * 15,          // 水平转头
      ParamAngleX: Math.max(-15, Math.min(15, dy * 10)),  // 上下点头（幅度小一点）
      ParamEyeBallX: Math.max(-1, Math.min(1, dx * 0.8)),
      ParamEyeBallY: Math.max(-1, Math.min(1, dy * 0.5))
    })
  },
  playMotion: (group, index) => {
    if (_l2dPet) _l2dPet.playMotion(group, index)
  },
  setExpression: (id) => {
    if (_l2dPet) _l2dPet.setExpression(id)
  },
  switchModel,
  destroy: () => {
    if (_l2dPet) _l2dPet.destroy()
    _l2dPet = null
    _l2dReady = false
  }
}
