/**
 * 物品分類工具
 * 提供物品類別判斷與分類相關功能
 */

import type { ItemAttributes, ItemCategoryGroup } from '@/types'

/**
 * 武器類別 - 包含所有武器的 equipment.category
 */
export const WEAPON_CATEGORIES = [
  'One Handed Sword',
  'One Handed Axe',
  'One Handed BW',
  'Two Handed Sword',
  'Two Handed SwordL',
  'Two Handed SwordS',
  'Two Handed Axe',
  'Two Handed BW',
  'Spear',
  'Polearm',
  'Bow',
  'Crossbow',
  'Claw',
  'Dagger',
  'Wand',
  'Staff',
  'Knuckle',
  'Gun',
] as const

/**
 * 防具類別 - 包含所有防具的 equipment.category
 */
export const ARMOR_CATEGORIES = [
  'Hat',
  'Top',
  'Bottom',
  'Overall',
  'Gloves',
  'Shoes',
  'Shield',
] as const

/**
 * 飾品類別 - 包含所有飾品的 equipment.category
 */
export const ACCESSORY_CATEGORIES = [
  'Cape',
  'Earring',
  'Accessory',
  'Projectile',
] as const

/**
 * 物品類別群組對應的 equipment.category 集合
 */
export const CATEGORY_GROUP_MAP: Record<ItemCategoryGroup, readonly string[]> = {
  weapon: WEAPON_CATEGORIES,
  armor: ARMOR_CATEGORIES,
  accessory: ACCESSORY_CATEGORIES,
  consume: [], // 消耗品依據 type 判斷，不使用 category
  etc: [], // 其他/材料依據 type 判斷，不使用 category
}

/**
 * 判斷物品屬於哪個類別群組
 * @param item 物品屬性資料
 * @returns 物品類別群組，若無法判斷則返回 null
 */
export function getItemCategoryGroup(item: ItemAttributes): ItemCategoryGroup | null {
  // 消耗品判斷
  if (item.type === 'Consume') {
    return 'consume'
  }

  // 其他/材料判斷
  if (item.type === 'Etc') {
    return 'etc'
  }

  // 裝備類別判斷
  if (item.type === 'Eqp' && item.equipment?.category) {
    const category = item.equipment.category

    // 判斷武器
    if (WEAPON_CATEGORIES.includes(category as typeof WEAPON_CATEGORIES[number])) {
      return 'weapon'
    }

    // 判斷防具
    if (ARMOR_CATEGORIES.includes(category as typeof ARMOR_CATEGORIES[number])) {
      return 'armor'
    }

    // 判斷飾品
    if (ACCESSORY_CATEGORIES.includes(category as typeof ACCESSORY_CATEGORIES[number])) {
      return 'accessory'
    }
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
