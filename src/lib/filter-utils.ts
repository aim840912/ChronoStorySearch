/**
 * 進階篩選工具函數
 * 提供複合式篩選邏輯
 */

import type {
  DropItem,
  AdvancedFilterOptions,
  ItemAttributes,
} from '@/types'
import { isItemInAnyCategoryGroup } from './item-categories'

/**
 * 判斷掉落資料是否符合資料類型篩選
 * @param _drop 掉落資料（目前未使用，保留以維持函數簽名一致性）
 * @param dataType 資料類型篩選
 * @returns 是否符合篩選
 */
export function matchesDataTypeFilter(
  _drop: DropItem,
  dataType: AdvancedFilterOptions['dataType']
): boolean {
  // 全部資料、怪物、物品篩選：顯示所有掉落資料
  if (dataType === 'all' || dataType === 'monster' || dataType === 'item') {
    return true
  }

  // 轉蛋物品篩選：掉落資料中沒有轉蛋物品，所以不顯示
  if (dataType === 'gacha') {
    return false
  }

  return true
}

/**
 * 判斷掉落資料是否符合物品類別篩選
 * @param itemId 物品 ID
 * @param itemAttributes 物品屬性 Map
 * @param filter 進階篩選選項
 * @returns 是否符合篩選
 */
export function matchesItemCategoryFilter(
  itemId: number,
  itemAttributes: Map<number, ItemAttributes>,
  filter: AdvancedFilterOptions
): boolean {
  // 未啟用篩選或未選擇任何類別
  if (!filter.enabled || filter.itemCategories.length === 0) {
    return true
  }

  // 取得物品屬性
  const item = itemAttributes.get(itemId)
  if (!item) {
    // 物品屬性不存在時，不符合任何類別篩選條件
    return false
  }

  // 使用 OR 邏輯：只要符合任一類別即可（物品類別是多選的）
  return isItemInAnyCategoryGroup(item, filter.itemCategories)
}

/**
 * 判斷掉落資料是否符合職業篩選
 * @param itemId 物品 ID
 * @param itemAttributes 物品屬性 Map
 * @param filter 進階篩選選項
 * @returns 是否符合篩選
 */
export function matchesJobClassFilter(
  itemId: number,
  itemAttributes: Map<number, ItemAttributes>,
  filter: AdvancedFilterOptions
): boolean {
  // 未啟用篩選或未選擇任何職業
  if (!filter.enabled || filter.jobClasses.length === 0) {
    return true
  }

  // 取得物品屬性
  const item = itemAttributes.get(itemId)
  if (!item || !item.equipment) {
    // 非裝備類物品，不符合職業篩選（職業篩選只針對裝備）
    return false
  }

  // 檢查物品是否允許任一選中的職業使用
  const { classes } = item.equipment
  return filter.jobClasses.some((jobClass) => {
    const classValue = classes[jobClass]

    // 如果該職業明確可用，通過
    if (classValue === true) return true

    // 如果該職業明確不可用，不通過
    if (classValue === false) return false

    // classValue === null，檢查是否為全職業通用裝備
    // 如果有任何職業是 true，表示有職業限制，null 表示不可用
    const hasAnyJobRestriction = Object.values(classes).some((v) => v === true)
    return !hasAnyJobRestriction  // 沒有職業限制時才通過
  })
}

/**
 * 判斷掉落資料是否符合等級範圍篩選
 * @param itemId 物品 ID
 * @param itemAttributes 物品屬性 Map
 * @param filter 進階篩選選項
 * @returns 是否符合篩選
 */
export function matchesLevelRangeFilter(
  itemId: number,
  itemAttributes: Map<number, ItemAttributes>,
  filter: AdvancedFilterOptions
): boolean {
  const { min, max } = filter.levelRange

  // 未啟用篩選或未設定任何等級範圍
  if (!filter.enabled || (min === null && max === null)) {
    return true
  }

  // 取得物品屬性
  const item = itemAttributes.get(itemId)
  if (!item || !item.equipment) {
    // 非裝備類物品（無等級需求），不符合等級範圍篩選條件
    return false
  }

  const reqLevel = item.equipment.requirements.req_level

  // 如果物品沒有等級需求，預設通過
  if (reqLevel === null) {
    return true
  }

  // 檢查是否在範圍內
  const meetsMin = min === null || reqLevel >= min
  const meetsMax = max === null || reqLevel <= max

  return meetsMin && meetsMax
}

/**
 * 判斷怪物是否符合等級範圍篩選
 * @param mobId 怪物 ID
 * @param mobLevelMap 怪物等級 Map
 * @param filter 進階篩選選項
 * @returns 是否符合篩選
 */
export function matchesMonsterLevelRangeFilter(
  mobId: number,
  mobLevelMap: Map<number, number | null>,
  filter: AdvancedFilterOptions
): boolean {
  const { min, max } = filter.levelRange

  // 未啟用篩選或未設定任何等級範圍
  if (!filter.enabled || (min === null && max === null)) {
    return true
  }

  // 取得怪物等級
  const mobLevel = mobLevelMap.get(mobId)

  // 如果怪物沒有等級資料，預設通過
  if (mobLevel === null || mobLevel === undefined) {
    return true
  }

  // 檢查是否在範圍內
  const meetsMin = min === null || mobLevel >= min
  const meetsMax = max === null || mobLevel <= max

  return meetsMin && meetsMax
}

/**
 * 應用進階篩選到掉落資料陣列
 * @param drops 掉落資料陣列
 * @param filter 進階篩選選項
 * @param itemAttributes 物品屬性 Map
 * @returns 篩選後的掉落資料陣列
 */
export function applyAdvancedFilter(
  drops: DropItem[],
  filter: AdvancedFilterOptions,
  itemAttributes: Map<number, ItemAttributes>
): DropItem[] {
  // 未啟用進階篩選，直接返回原資料
  if (!filter.enabled) {
    return drops
  }

  return drops.filter((drop) => {
    // 檢查資料類型篩選
    const matchesDataType = matchesDataTypeFilter(drop, filter.dataType)

    // 檢查物品類別篩選
    const matchesCategory = matchesItemCategoryFilter(drop.itemId, itemAttributes, filter)

    // 檢查職業篩選
    const matchesJobClass = matchesJobClassFilter(drop.itemId, itemAttributes, filter)

    // 檢查等級範圍篩選
    const matchesLevelRange = matchesLevelRangeFilter(drop.itemId, itemAttributes, filter)

    // 使用 AND 邏輯：必須同時符合所有條件
    return matchesDataType && matchesCategory && matchesJobClass && matchesLevelRange
  })
}

/**
 * 取得預設的進階篩選選項
 * @returns 預設篩選選項
 */
export function getDefaultAdvancedFilter(): AdvancedFilterOptions {
  return {
    dataType: 'all',
    itemCategories: [],
    jobClasses: [],
    levelRange: { min: null, max: null },
    enabled: false,
  }
}
