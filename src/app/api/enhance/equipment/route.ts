import { NextRequest } from 'next/server'
import { withOptionalAuthAndError } from '@/lib/middleware/api-middleware'
import { success } from '@/lib/api-response'
import type { EnhanceableEquipment } from '@/types/enhance'
import type { ItemEquipmentStats } from '@/types'
import machine1Data from '@/../data/gacha/machine-1-enhanced.json'
import machine2Data from '@/../data/gacha/machine-2-enhanced.json'
import machine3Data from '@/../data/gacha/machine-3-enhanced.json'
import machine4Data from '@/../data/gacha/machine-4-enhanced.json'
import machine5Data from '@/../data/gacha/machine-5-enhanced.json'
import machine6Data from '@/../data/gacha/machine-6-enhanced.json'

/**
 * GET /api/enhance/equipment
 * 獲取所有可用的裝備列表（來自所有轉蛋機）
 *
 * Query Parameters:
 * - category?: string - 篩選特定分類的裝備
 * - minLevel?: number - 最低等級需求
 * - maxLevel?: number - 最高等級需求
 */
async function handleGET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const minLevel = searchParams.get('minLevel')
  const maxLevel = searchParams.get('maxLevel')

  // 合併所有轉蛋機的物品
  const allMachines = [
    machine1Data,
    machine2Data,
    machine3Data,
    machine4Data,
    machine5Data,
    machine6Data
  ]

  // 提取所有裝備物品
  const equipment: EnhanceableEquipment[] = []
  const seenIds = new Set<number>()

  for (const machine of allMachines) {
    for (const item of machine.items) {
      // 只選擇有 equipment 屬性且有 stats 的物品
      if (!item.equipment || !item.equipment.stats) {
        continue
      }

      // 避免重複（同一裝備可能在多台轉蛋機）
      if (seenIds.has(item.itemId)) {
        continue
      }
      seenIds.add(item.itemId)

      const stats = item.equipment.stats
      const upgrades = stats.upgrades || 0

      // 檢查是否有可升級次數
      if (upgrades === 0) {
        continue
      }

      equipment.push({
        itemId: item.itemId,
        itemName: item.itemName,
        chineseName: item.chineseName || item.itemName,
        category: item.equipment.category,
        originalStats: { ...stats } as unknown as ItemEquipmentStats,
        currentStats: { ...stats } as unknown as ItemEquipmentStats,
        remainingUpgrades: upgrades,
        enhanceCount: 0,
        isDestroyed: false
      })
    }
  }

  // 應用篩選條件
  let filteredEquipment = equipment

  if (category) {
    filteredEquipment = filteredEquipment.filter(eq => eq.category === category)
  }

  if (minLevel) {
    const min = parseInt(minLevel)
    filteredEquipment = filteredEquipment.filter(
      eq => (eq.originalStats.attack_speed || 0) >= min
    )
  }

  if (maxLevel) {
    const max = parseInt(maxLevel)
    filteredEquipment = filteredEquipment.filter(
      eq => (eq.originalStats.attack_speed || 0) <= max
    )
  }

  return success(filteredEquipment, '成功獲取裝備列表')
}

export const GET = withOptionalAuthAndError(handleGET, {
  module: 'EnhanceEquipmentAPI'
})
