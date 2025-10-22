/**
 * 命中率計算工具
 * 基於 accurate.md 和 Magic Accuracy.md 的公式
 */

export interface PhysicalAccuracyInput {
  playerLevel: number
  monsterLevel: number
  monsterAvoid: number
  playerAccuracy: number
}

export interface MagicAccuracyInput {
  playerLevel: number
  monsterLevel: number
  monsterAvoid: number
  playerInt: number
  playerLuk: number
  bonusAccuracy: number
}

export interface AccuracyResult {
  requiredAccuracy: number
  actualAccuracy: number
  hitRate: number // 0-100
  willMiss: boolean
}

/**
 * 計算物理命中（基於 mrsoupman 的公式）
 * 公式：
 * - diff = max(0, 怪物等級 - 玩家等級)
 * - acc100 = (55.2 + 2.15 × diff) × (怪物迴避 / 15.0)
 * - acc1 = acc100 × 0.5 + 1
 * - 命中率 = 漸進式（0%-100%）
 */
export function calculatePhysicalAccuracy(input: PhysicalAccuracyInput): AccuracyResult {
  const { playerLevel, monsterLevel, monsterAvoid, playerAccuracy } = input

  // 計算等級差（不允許為負）
  const diff = Math.max(0, monsterLevel - playerLevel)

  // 計算 100% 命中所需命中值
  const acc100 = (55.2 + 2.15 * diff) * (monsterAvoid / 15.0)

  // 計算 1% 命中所需命中值
  const acc1 = acc100 * 0.5 + 1

  // 計算命中率（漸進式）
  let hitRate: number
  if (playerAccuracy >= acc100) {
    hitRate = 100
  } else if (playerAccuracy <= acc1) {
    hitRate = 0
  } else {
    const accRatio = ((playerAccuracy - acc100 * 0.5) / (acc100 * 0.5)) * 100
    hitRate = Math.max(0, Math.min(100, accRatio))
  }

  return {
    requiredAccuracy: Math.ceil(acc100),
    actualAccuracy: playerAccuracy,
    hitRate: Math.round(hitRate * 100) / 100,
    willMiss: hitRate < 100,
  }
}

/**
 * 計算魔法命中
 * 公式：
 * - 法師命中 = floor(INT/10) + floor(LUK/10) + floor(額外命中/5)
 * - 需求命中 = (怪物迴避 + 1) × (1 + 0.0415 × D)
 * - D = max(0, 怪物等級 - 玩家等級)
 * - 命中率% = -2.5795x² + 5.2343x - 1.6749，x = 法師命中 / 需求命中
 */
export function calculateMagicAccuracy(input: MagicAccuracyInput): AccuracyResult {
  const { playerLevel, monsterLevel, monsterAvoid, playerInt, playerLuk, bonusAccuracy } = input

  // 計算法師實際命中
  const mageAccuracy =
    Math.floor(playerInt / 10) +
    Math.floor(playerLuk / 10) +
    Math.floor(bonusAccuracy / 5)

  // 計算等級差（D）
  const D = Math.max(0, monsterLevel - playerLevel)

  // 計算需求命中
  const requiredAccuracy = (monsterAvoid + 1) * (1 + 0.0415 * D)

  // 計算命中率
  let hitRate: number
  if (mageAccuracy >= requiredAccuracy) {
    hitRate = 100
  } else {
    const x = mageAccuracy / requiredAccuracy
    hitRate = (-2.5795 * x * x + 5.2343 * x - 1.6749) * 100
    hitRate = Math.max(0, Math.min(100, hitRate)) // 限制在 0-100 之間
  }

  return {
    requiredAccuracy: Math.ceil(requiredAccuracy),
    actualAccuracy: mageAccuracy,
    hitRate: Math.round(hitRate * 100) / 100, // 保留兩位小數
    willMiss: hitRate < 100,
  }
}
