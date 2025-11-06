import type { ItemEquipmentStats, ScrollStats } from '@/types'
import type {
  EnhanceableEquipment,
  EnhanceScroll,
  EnhanceResult
} from '@/types/enhance'

/**
 * 根據裝備分類篩選可用的卷軸
 */
export function getAvailableScrollsForEquipment(
  equipmentCategory: string,
  allScrolls: EnhanceScroll[]
): EnhanceScroll[] {
  return allScrolls.filter(scroll => scroll.category === equipmentCategory)
}

/**
 * 判斷是否為詛咒卷軸
 */
export function isCursedScroll(scroll: EnhanceScroll): boolean {
  return scroll.destroyRate > 0
}

/**
 * 判斷強化是否成功
 */
function isEnhanceSuccess(successRate: number): boolean {
  const random = Math.random() * 100
  return random <= successRate
}

/**
 * 判斷裝備是否被毀滅（僅在失敗且為詛咒卷時調用）
 */
function isEquipmentDestroyed(destroyRate: number): boolean {
  if (destroyRate === 0) return false
  const random = Math.random() * 100
  return random <= destroyRate
}

/**
 * 將卷軸屬性加到裝備上
 */
function applyScrollStats(
  equipmentStats: ItemEquipmentStats,
  scrollStats: ScrollStats
): ItemEquipmentStats {
  const result = { ...equipmentStats }

  // 遍歷卷軸的所有屬性
  const statsKeys: (keyof ScrollStats)[] = [
    'str', 'dex', 'int', 'luk',
    'watk', 'matk', 'wdef', 'mdef',
    'hp', 'mp', 'accuracy', 'avoidability',
    'speed', 'jump'
  ]

  statsKeys.forEach(key => {
    const scrollValue = scrollStats[key]
    if (scrollValue !== null && scrollValue !== 0) {
      const currentValue = result[key] || 0
      result[key] = currentValue + scrollValue
    }
  })

  return result
}

/**
 * 執行裝備強化
 */
export function performEnhance(
  equipment: EnhanceableEquipment,
  scroll: EnhanceScroll
): EnhanceResult {
  const success = isEnhanceSuccess(scroll.successRate)

  if (success) {
    // 強化成功
    const newStats = applyScrollStats(equipment.currentStats, scroll.stats)
    const updatedEquipment: EnhanceableEquipment = {
      ...equipment,
      currentStats: {
        ...newStats,
        upgrades: (equipment.currentStats.upgrades || 0) - 1
      },
      remainingUpgrades: equipment.remainingUpgrades - 1,
      enhanceCount: equipment.enhanceCount + 1
    }

    return {
      type: 'success',
      equipment: updatedEquipment,
      scroll,
      addedStats: scroll.stats,
      timestamp: Date.now()
    }
  } else {
    // 強化失敗
    const destroyRate = scroll.destroyRate
    const destroyed = isEquipmentDestroyed(destroyRate)

    if (destroyed) {
      // 裝備被毀滅
      const updatedEquipment: EnhanceableEquipment = {
        ...equipment,
        isDestroyed: true,
        remainingUpgrades: 0
      }

      return {
        type: 'destroyed',
        equipment: updatedEquipment,
        scroll,
        timestamp: Date.now()
      }
    } else {
      // 單純失敗（經典規則：失敗也扣升級次數）
      const updatedEquipment: EnhanceableEquipment = {
        ...equipment,
        currentStats: {
          ...equipment.currentStats,
          upgrades: (equipment.currentStats.upgrades || 0) - 1
        },
        remainingUpgrades: equipment.remainingUpgrades - 1
      }

      return {
        type: 'failed',
        equipment: updatedEquipment,
        scroll,
        timestamp: Date.now()
      }
    }
  }
}

/**
 * 將 GachaItem 轉換為可強化裝備
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function convertToEnhanceableEquipment(item: any): EnhanceableEquipment | null {
  // 檢查是否為裝備類型
  if (!item.equipment || !item.equipment.stats) {
    return null
  }

  const stats = item.equipment.stats
  const upgrades = stats.upgrades || 0

  return {
    itemId: item.itemId,
    drawId: item.drawId, // 保留 drawId 用於識別唯一抽取
    itemName: item.itemName,
    chineseName: item.chineseName || item.itemName,
    category: item.equipment.category,
    originalStats: { ...stats },
    currentStats: { ...stats },
    remainingUpgrades: upgrades,
    enhanceCount: 0,
    isDestroyed: false,
    randomStats: item.randomStats // 保留隨機屬性
  }
}

/**
 * 獲取強化結果的描述文字
 */
export function getEnhanceResultMessage(
  result: EnhanceResult,
  locale: string = 'zh-TW'
): string {
  const equipmentName = locale === 'zh-TW'
    ? result.equipment.chineseName
    : result.equipment.itemName

  switch (result.type) {
    case 'success': {
      // 列出加成的屬性
      const addedStatsText: string[] = []
      if (result.addedStats) {
        const statsMap: Record<string, string> = {
          str: 'STR',
          dex: 'DEX',
          int: 'INT',
          luk: 'LUK',
          watk: locale === 'zh-TW' ? '物攻' : 'WATK',
          matk: locale === 'zh-TW' ? '魔攻' : 'MATK',
          wdef: locale === 'zh-TW' ? '物防' : 'WDEF',
          mdef: locale === 'zh-TW' ? '魔防' : 'MDEF',
          hp: 'HP',
          mp: 'MP',
          accuracy: locale === 'zh-TW' ? '命中' : 'ACC',
          avoidability: locale === 'zh-TW' ? '迴避' : 'AVOID',
          speed: locale === 'zh-TW' ? '速度' : 'SPEED',
          jump: locale === 'zh-TW' ? '跳躍' : 'JUMP'
        }

        Object.entries(result.addedStats).forEach(([key, value]) => {
          if (value !== null && value !== 0) {
            const statName = statsMap[key] || key.toUpperCase()
            addedStatsText.push(`${statName} +${value}`)
          }
        })
      }

      if (locale === 'zh-TW') {
        return addedStatsText.length > 0
          ? `強化成功！${addedStatsText.join(', ')}`
          : '強化成功！'
      } else {
        return addedStatsText.length > 0
          ? `Enhancement successful! ${addedStatsText.join(', ')}`
          : 'Enhancement successful!'
      }
    }

    case 'failed': {
      const remaining = result.equipment.remainingUpgrades
      if (locale === 'zh-TW') {
        return `強化失敗，剩餘 ${remaining} 次升級機會`
      } else {
        return `Enhancement failed, ${remaining} upgrade slots remaining`
      }
    }

    case 'destroyed': {
      if (locale === 'zh-TW') {
        return `${equipmentName} 已毀滅！`
      } else {
        return `${equipmentName} has been destroyed!`
      }
    }

    default:
      return ''
  }
}
