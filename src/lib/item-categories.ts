/**
 * 物品分類工具
 * 提供物品類別判斷與分類相關功能
 * 基於 equipment.category 欄位，降級使用 sub_type
 */

import type { ItemAttributes, ItemAttributesEssential, ItemCategoryGroup, CategoryGroupType } from '@/types'

// 統一的篩選資料介面（支援 Essential 和完整 Attributes）
type FilterableItem = ItemAttributes | ItemAttributesEssential

/**
 * equipment.category 到 ItemCategoryGroup 的對應表
 * 合併相似武器類型（如單手劍+雙手劍 => 劍）
 */
export const EQUIPMENT_CATEGORY_MAP: Record<string, ItemCategoryGroup> = {
  // 穿著類
  'Hat': 'hat',
  'Helmet': 'hat',       // 卷軸使用此格式
  'Top': 'top',
  'Topwear': 'top',      // 卷軸使用此格式
  'Bottom': 'bottom',
  'Bottomwear': 'bottom',
  'Overall': 'overall',
  'Shoes': 'shoes',
  'Glove': 'gloves',
  'Gloves': 'gloves',
  'Cape': 'cape',

  // 武器類（使用資料中的格式：連字符命名）
  'One-Handed Sword': 'oneHandedSword',
  'Two-Handed Sword': 'twoHandedSword',
  'One-Handed Axe': 'oneHandedAxe',
  'Two-Handed Axe': 'twoHandedAxe',
  'One-Handed Blunt Weapon': 'oneHandedBW',
  'One-Handed BW': 'oneHandedBW',
  'Two-Handed Blunt Weapon': 'twoHandedBW',
  'Two-Handed Blunt': 'twoHandedBW',
  'Two-Handed BW': 'twoHandedBW',
  'Pole Arm': 'polearm',
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
  'Earrings': 'earring',
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
  'Food and Drink': 'potion',
  'Status Cure': 'potion',
  'Consumable': 'potion',
  'Transformation': 'potion',
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
  // 穿著類（含耳環、飾品）
  apparel: ['hat', 'top', 'bottom', 'overall', 'shoes', 'gloves', 'cape', 'earring', 'accessory'],
  // 武器防具類
  weapon: ['oneHandedSword', 'twoHandedSword', 'oneHandedAxe', 'twoHandedAxe', 'oneHandedBW', 'twoHandedBW', 'polearm', 'spear', 'dagger', 'claw', 'bow', 'crossbow', 'wand', 'staff', 'knuckle', 'gun', 'shield'],
  // 消耗品類
  consumable: ['scroll', 'potion', 'projectile'],
}

/**
 * 判斷物品屬於哪個類別群組
 * 優先使用 equipment.category，降級使用 sub_type
 * @param item 物品屬性資料
 * @returns 物品類別群組，若無法判斷則返回 null
 */
export function getItemCategoryGroup(item: FilterableItem): ItemCategoryGroup | null {
  // 支援 Essential (扁平化) 和 Attributes (嵌套) 兩種結構
  const equipmentCategory = ('equipment_category' in item)
    ? item.equipment_category
    : item.equipment?.category

  // 優先使用 equipment.category
  if (equipmentCategory && equipmentCategory in EQUIPMENT_CATEGORY_MAP) {
    return EQUIPMENT_CATEGORY_MAP[equipmentCategory]
  }

  // 檢查是否為卷軸（有 scroll_category 或 scroll 欄位）
  const scrollCategory = ('scroll_category' in item)
    ? item.scroll_category
    : (item as ItemAttributes).scroll?.category
  if (scrollCategory) {
    return 'scroll'
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
  item: FilterableItem,
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
  item: FilterableItem,
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
  item: FilterableItem,
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
