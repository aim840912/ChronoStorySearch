/**
 * 物品分類工具
 * 提供物品類別判斷與分類相關功能
 * 基於 equipment.category 欄位，降級使用 sub_type
 */

import type { ItemAttributes, ItemCategoryGroup, CategoryGroupType } from '@/types'

/**
 * equipment.category 到 ItemCategoryGroup 的對應表
 * 合併相似武器類型（如單手劍+雙手劍 => 劍）
 */
const EQUIPMENT_CATEGORY_MAP: Record<string, ItemCategoryGroup> = {
  // 穿著類
  'Hat': 'hat',
  'Top': 'top',
  'Bottom': 'bottom',
  'Overall': 'overall',
  'Shoes': 'shoes',
  'Gloves': 'gloves',
  'Cape': 'cape',

  // 武器類（拆分單手/雙手劍、斧、棍）
  'One Handed Sword': 'oneHandedSword',
  'Two Handed Sword': 'twoHandedSword',
  'One Handed Axe': 'oneHandedAxe',
  'Two Handed Axe': 'twoHandedAxe',
  'One Handed BW': 'oneHandedBW',
  'Two Handed BW': 'twoHandedBW',
  'Polearm': 'polearm',
  'Spear': 'spear',
  'Dagger': 'dagger',
  'Claw': 'claw',
  'Bow': 'bow',
  'Crossbow': 'crossbow',
  'Wand': 'wand',
  'Staff': 'staff',
  'Knuckle': 'knuckle',
  'Gun': 'gun',
  'Shield': 'shield',

  // 飾品類
  'Earring': 'earring',
  'Accessory': 'accessory',

  // 投擲物（特殊：既是武器也是消耗品）
  'Projectile': 'projectile',
}

/**
 * sub_type 到 ItemCategoryGroup 的降級對應表
 * 用於無 equipment 欄位的物品（如卷軸、藥水）
 */
const SUB_TYPE_FALLBACK_MAP: Record<string, ItemCategoryGroup> = {
  'Scroll': 'scroll',
  'Potion': 'potion',
  'Projectile': 'projectile',
  // 舊版相容性（如果有物品仍使用舊的 sub_type）
  'Cap': 'hat',
  'Pants': 'bottom',
  'Longcoat': 'overall',
  'Glove': 'gloves',
}

/**
 * 分組映射：每個分組包含哪些類別
 */
export const CATEGORY_GROUP_MAP: Record<CategoryGroupType, ItemCategoryGroup[]> = {
  apparel: ['hat', 'top', 'bottom', 'overall', 'shoes', 'gloves', 'cape'],
  weapon: ['oneHandedSword', 'twoHandedSword', 'oneHandedAxe', 'twoHandedAxe', 'oneHandedBW', 'twoHandedBW', 'polearm', 'spear', 'dagger', 'claw', 'bow', 'crossbow', 'wand', 'staff', 'knuckle', 'gun', 'shield'],
  accessory: ['earring', 'accessory'],
  consumable: ['scroll', 'potion', 'projectile'],
}

/**
 * 判斷物品屬於哪個類別群組
 * 優先使用 equipment.category，降級使用 sub_type
 * @param item 物品屬性資料
 * @returns 物品類別群組，若無法判斷則返回 null
 */
export function getItemCategoryGroup(item: ItemAttributes): ItemCategoryGroup | null {
  // 優先使用 equipment.category
  if (item.equipment?.category && item.equipment.category in EQUIPMENT_CATEGORY_MAP) {
    return EQUIPMENT_CATEGORY_MAP[item.equipment.category]
  }

  // 降級：使用 sub_type
  if (item.sub_type && item.sub_type in SUB_TYPE_FALLBACK_MAP) {
    return SUB_TYPE_FALLBACK_MAP[item.sub_type]
  }

  // 無法判斷
  return null
}

/**
 * 判斷物品是否屬於指定的類別群組
 * @param item 物品屬性資料
 * @param categoryGroup 要檢查的類別群組
 * @returns 是否屬於該類別群組
 */
export function isItemInCategoryGroup(
  item: ItemAttributes,
  categoryGroup: ItemCategoryGroup
): boolean {
  const itemGroup = getItemCategoryGroup(item)
  return itemGroup === categoryGroup
}

/**
 * 判斷物品是否屬於任一指定的類別群組（OR 邏輯）
 * @param item 物品屬性資料
 * @param categoryGroups 要檢查的類別群組陣列
 * @returns 是否屬於任一類別群組
 */
export function isItemInAnyCategoryGroup(
  item: ItemAttributes,
  categoryGroups: ItemCategoryGroup[]
): boolean {
  if (categoryGroups.length === 0) return true // 空陣列表示不篩選

  const itemGroup = getItemCategoryGroup(item)
  if (!itemGroup) return false

  return categoryGroups.includes(itemGroup)
}

/**
 * 判斷物品是否屬於所有指定的類別群組（AND 邏輯）
 * 注意：由於每個物品只能屬於一個類別群組，AND 邏輯只在選擇一個群組時才有意義
 * @param item 物品屬性資料
 * @param categoryGroups 要檢查的類別群組陣列
 * @returns 是否屬於所有類別群組
 */
export function isItemInAllCategoryGroups(
  item: ItemAttributes,
  categoryGroups: ItemCategoryGroup[]
): boolean {
  if (categoryGroups.length === 0) return true // 空陣列表示不篩選
  if (categoryGroups.length > 1) return false // 物品不可能同時屬於多個群組

  return isItemInCategoryGroup(item, categoryGroups[0])
}

/**
 * 獲取分組下的所有類別
 * @param groupType 分組類型
 * @returns 該分組下的所有類別
 */
export function getCategoriesInGroup(groupType: CategoryGroupType): ItemCategoryGroup[] {
  return CATEGORY_GROUP_MAP[groupType] || []
}

/**
 * 獲取類別所屬的分組
 * @param category 類別
 * @returns 所屬分組，若找不到則返回 null
 */
export function getCategoryGroup(category: ItemCategoryGroup): CategoryGroupType | null {
  for (const [groupType, categories] of Object.entries(CATEGORY_GROUP_MAP)) {
    if (categories.includes(category)) {
      return groupType as CategoryGroupType
    }
  }
  return null
}
