/**
 * 進階篩選工具函數
 * 提供複合式篩選邏輯
 */

import type {
  DropItem,
  AdvancedFilterOptions,
  ItemAttributes,
} from '@/types'
import { isItemInAnyCategoryGroup, isItemInAllCategoryGroups } from './item-categories'

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
    // 物品屬性不存在（如楓幣 itemId=0），預設通過篩選
    return true
  }

  // 根據邏輯運算子判斷
  if (filter.logicOperator === 'OR') {
    // OR 邏輯：只要符合任一類別即可
    return isItemInAnyCategoryGroup(item, filter.itemCategories)
  } else {
    // AND 邏輯：必須符合所有類別（實務上只會選一個類別）
    return isItemInAllCategoryGroups(item, filter.itemCategories)
  }
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

    // 根據邏輯運算子決定最終結果
    if (filter.logicOperator === 'OR') {
      // OR 邏輯：只要符合任一條件即可
      // 如果沒有設定任何篩選條件，則全部通過
      const hasAnyFilter = filter.dataType !== 'all' || filter.itemCategories.length > 0
      if (!hasAnyFilter) return true

      return matchesDataType || matchesCategory
    } else {
      // AND 邏輯：必須同時符合所有條件
      return matchesDataType && matchesCategory
    }
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
    logicOperator: 'AND',
    enabled: false,
  }
}
