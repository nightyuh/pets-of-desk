/**
 * 桌宠状态系统
 *
 * 三个核心属性（0~100）：
 * - mood（心情）
 * - hunger（饱腹）
 * - energy（精力）
 */

const STATE = {
  mood: 80,
  hunger: 60,
  energy: 80,
  // 衰减速度（每 tick 减少量）
  decayRate: {
    mood:   0.3,
    hunger: 0.4,
    energy: 0.2
  }
}

// 状态监听器
const listeners = []

function initPetState() {
  resetState()
  notifyListeners()
}

function resetState() {
  STATE.mood = 80
  STATE.hunger = 60
  STATE.energy = 80
}

// ─── 操作 ──────────────────────────────────────
function feed(amount = 15) {
  STATE.hunger = Math.min(100, STATE.hunger + amount)
  STATE.mood = Math.min(100, STATE.mood + 2)
  notifyListeners()
}

function play(amount = 10) {
  STATE.mood = Math.min(100, STATE.mood + amount)
  STATE.energy = Math.max(0, STATE.energy - 5)
  notifyListeners()
}

function rest(amount = 20) {
  STATE.energy = Math.min(100, STATE.energy + amount)
  STATE.mood = Math.min(100, STATE.mood + 3)
  notifyListeners()
}

function pet(amount = 5) {
  STATE.mood = Math.min(100, STATE.mood + amount)
  notifyListeners()
}

// ─── 衰减（由 timer.js 调用）────────────────────
function decay() {
  if (!window.__settings?.stateDecay ?? true) return

  STATE.mood   = Math.max(0, STATE.mood - STATE.decayRate.mood * randomInRange(0.5, 1.5))
  STATE.hunger = Math.max(0, STATE.hunger - STATE.decayRate.hunger * randomInRange(0.5, 1.5))
  STATE.energy = Math.max(0, STATE.energy - STATE.decayRate.energy * randomInRange(0.5, 1.5))
  notifyListeners()
}

// ─── 状态阈值判断 ──────────────────────────────
function isHappy()    { return STATE.mood > 70 }
function isSad()      { return STATE.mood < 30 }
function isHungry()   { return STATE.hunger < 25 }
function isTired()    { return STATE.energy < 15 }
function isSleeping() { return STATE.energy < 5 }

// ─── 监听器 ────────────────────────────────────
function onChange(fn) {
  listeners.push(fn)
  return () => {
    const idx = listeners.indexOf(fn)
    if (idx >= 0) listeners.splice(idx, 1)
  }
}

function notifyListeners() {
  const snapshot = getState()
  for (const fn of listeners) fn(snapshot)
}

function getState() {
  return { ...STATE }
}

function randomInRange(min, max) {
  return min + Math.random() * (max - min)
}

// ─── 导出 ──────────────────────────────────────
window.__petState = {
  init: initPetState,
  getState,
  feed,
  play,
  rest,
  pet,
  decay,
  isHappy,
  isSad,
  isHungry,
  isTired,
  isSleeping,
  onChange
}
