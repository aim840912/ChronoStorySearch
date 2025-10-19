import type { GachaItem, ItemAttributes, ItemRequirements, ItemClasses, ItemEquipmentStats, ItemEquipment, StatVariation, ScrollInfo, EnhancedGachaItem, EnhancedRequirements, EnhancedStats, EnhancedStatVariation } from '@/types'

/**
 * 轉蛋物品屬性轉換工具
 *
 * 將轉蛋機資料（來自 maplestory.io API）轉換為 ItemAttributes 格式
 * 用於在 item-attributes.json 中找不到物品時的回退方案
 */

/**
 * 屬性欄位名稱映射表
 * 將 maplestory.io API 的欄位名稱映射到內部格式
 */
const STAT_FIELD_MAPPING: Record<string, keyof ItemEquipmentStats> = {
  'magicDefense': 'mdef',
  'defense': 'wdef',
  'magicAttack': 'matk',
  'attack': 'watk',
  'dex': 'dex',
  'str': 'str',
  'int': 'int',
  'luk': 'luk',
  'hp': 'hp',
  'mp': 'mp',
  'accuracy': 'accuracy',
  'avoidability': 'avoidability',
  'speed': 'speed',
  'jump': 'jump',
}

/**
 * 將轉蛋物品的 stats 轉換為 ItemEquipmentStats 格式
 */
function convertGachaStatsToEquipmentStats(gachaStats: Record<string, number | undefined> | undefined): ItemEquipmentStats {
  const stats: ItemEquipmentStats = {
    attack_speed: null,
    str: null,
    dex: null,
    int: null,
    luk: null,
    watk: null,
    matk: null,
    accuracy: null,
    avoidability: null,
    speed: null,
    jump: null,
    hp: null,
    mp: null,
    wdef: null,
    mdef: null,
    upgrades: null,
  }

  if (!gachaStats) return stats

  // 轉換每個屬性
  Object.entries(gachaStats).forEach(([gachaKey, value]) => {
    const mappedKey = STAT_FIELD_MAPPING[gachaKey]
    if (mappedKey && typeof value === 'number') {
      stats[mappedKey] = value
    }
  })

  return stats
}

/**
 * 將轉蛋物品的 requiredStats 轉換為 ItemRequirements 格式
 */
function convertGachaRequirementsToItemRequirements(
  requiredStats: GachaItem['requiredStats']
): ItemRequirements {
  if (!requiredStats) {
    return {
      req_level: null,
      req_str: null,
      req_dex: null,
      req_int: null,
      req_luk: null,
      req_fam: null,
    }
  }

  return {
    req_level: requiredStats.level ?? null,
    req_str: requiredStats.str ?? null,
    req_dex: requiredStats.dex ?? null,
    req_int: requiredStats.int ?? null,
    req_luk: requiredStats.luk ?? null,
    req_fam: null,
  }
}

/**
 * 將轉蛋物品的 jobTrees 轉換為 ItemClasses 格式
 */
function convertGachaJobTreesToClasses(
  jobTrees: string[] | undefined
): ItemClasses {
  const classes: ItemClasses = {
    beginner: null,
    warrior: null,
    magician: null,
    bowman: null,
    thief: null,
    pirate: null,
  }

  if (!jobTrees || jobTrees.length === 0) {
    // 如果沒有職業限制，默認所有職業都可用
    return {
      beginner: true,
      warrior: true,
      magician: true,
      bowman: true,
      thief: true,
      pirate: true,
    }
  }

  // 設定允許的職業
  jobTrees.forEach((job) => {
    const jobKey = job.toLowerCase() as keyof ItemClasses
    if (jobKey in classes) {
      classes[jobKey] = true
    }
  })

  return classes
}

/**
 * 將轉蛋物品的 category/subcategory 轉換為 equipment.category
 */
function convertGachaCategoryToEquipmentCategory(
  category: string | undefined,
  subcategory: string | undefined
): string {
  // 優先使用 subcategory，如果沒有則使用 category
  // 如果都沒有，返回 "Unknown"
  return subcategory || category || 'Unknown'
}

/**
 * 將轉蛋物品的 statVariation (camelCase) 轉換為 stat_variation (snake_case)
 * Enhanced JSON 使用 camelCase，item-attributes.json 使用 snake_case
 */
function convertStatVariation(gachaItem: GachaItem): Record<string, StatVariation> | undefined {
  // 檢查是否有 statVariation (camelCase from Enhanced JSON)
  const variation = (gachaItem as EnhancedGachaItem).equipment?.statVariation

  if (!variation || typeof variation !== 'object') {
    return undefined
  }

  // 確保所有欄位符合 StatVariation 介面
  const result: Record<string, StatVariation> = {}

  Object.entries(variation).forEach(([key, value]) => {
    // 確保值有正確的結構
    if (value && typeof value === 'object' && ('min' in value || 'max' in value)) {
      result[key] = {
        min: value.min ?? null,
        max: value.max ?? null,
      }
    }
  })

  return Object.keys(result).length > 0 ? result : undefined
}

/**
 * 將 Enhanced JSON 的 requirements (camelCase) 標準化為 snake_case
 */
function normalizeEnhancedRequirements(requirements: EnhancedRequirements | undefined): ItemRequirements {
  if (!requirements) {
    return {
      req_level: null,
      req_str: null,
      req_dex: null,
      req_int: null,
      req_luk: null,
      req_fam: null,
    }
  }

  return {
    req_level: requirements.reqLevel ?? null,
    req_str: requirements.reqStr ?? null,
    req_dex: requirements.reqDex ?? null,
    req_int: requirements.reqInt ?? null,
    req_luk: requirements.reqLuk ?? null,
    req_fam: requirements.reqFam ?? null,
  }
}

/**
 * 將 Enhanced JSON 的 stats (camelCase) 標準化為 snake_case
 */
function normalizeEnhancedStats(stats: EnhancedStats | undefined): ItemEquipmentStats {
  if (!stats) {
    return {
      attack_speed: null,
      str: null,
      dex: null,
      int: null,
      luk: null,
      watk: null,
      matk: null,
      accuracy: null,
      avoidability: null,
      speed: null,
      jump: null,
      hp: null,
      mp: null,
      wdef: null,
      mdef: null,
      upgrades: null,
    }
  }

  return {
    attack_speed: stats.attackSpeed ?? null,
    str: stats.str ?? null,
    dex: stats.dex ?? null,
    int: stats.int ?? null,
    luk: stats.luk ?? null,
    watk: stats.watk ?? null,
    matk: stats.matk ?? null,
    accuracy: stats.accuracy ?? null,
    avoidability: stats.avoidability ?? null,
    speed: stats.speed ?? null,
    jump: stats.jump ?? null,
    hp: stats.hp ?? null,
    mp: stats.mp ?? null,
    wdef: stats.wdef ?? null,
    mdef: stats.mdef ?? null,
    upgrades: stats.upgrades ?? null,
  }
}

/**
 * 將 Enhanced JSON 的 statVariation (camelCase) 標準化為 stat_variation (snake_case)
 */
function normalizeEnhancedStatVariation(statVariation: EnhancedStatVariation | undefined): Record<string, StatVariation> | undefined {
  if (!statVariation || typeof statVariation !== 'object') {
    return undefined
  }

  const result: Record<string, StatVariation> = {}

  Object.entries(statVariation).forEach(([key, value]) => {
    if (value && typeof value === 'object' && ('min' in value || 'max' in value)) {
      result[key] = {
        min: value.min ?? null,
        max: value.max ?? null,
      }
    }
  })

  return Object.keys(result).length > 0 ? result : undefined
}

/**
 * 將 Enhanced JSON 格式的轉蛋物品轉換為 ItemAttributes 格式
 * Enhanced JSON 已經有完整的 equipment 或 scroll 資料，但使用 camelCase 命名
 */
function normalizeEnhancedJSONToItemAttributes(
  gachaItem: EnhancedGachaItem,
  itemId: number
): ItemAttributes {
  // 條件性創建 equipment 物件（只在有 equipment 欄位時）
  const equipment: ItemEquipment | undefined = gachaItem.equipment ? {
    category: gachaItem.equipment.category || 'Unknown',
    requirements: normalizeEnhancedRequirements(gachaItem.equipment.requirements),
    classes: gachaItem.equipment.classes || {
      beginner: null,
      warrior: null,
      magician: null,
      bowman: null,
      thief: null,
      pirate: null,
    },
    stats: normalizeEnhancedStats(gachaItem.equipment.stats),
    stat_variation: normalizeEnhancedStatVariation(gachaItem.equipment.statVariation),
  } : undefined

  // 條件性創建 scroll 物件（只在有 scroll 欄位時）
  // 將 camelCase 欄位轉換為 snake_case 以符合 ScrollInfo 介面
  const scroll: ScrollInfo | undefined = gachaItem.scroll ? {
    category: gachaItem.scroll.category,
    success_rate: gachaItem.scroll.successRate,
    destroy_rate: gachaItem.scroll.destroyRate,
    stats: gachaItem.scroll.stats,
  } : undefined

  const result = {
    item_id: String(itemId),
    item_name: gachaItem.itemName || gachaItem.chineseName || 'Unknown',
    item_type_id: gachaItem.itemTypeId ?? 7,
    sale_price: gachaItem.salePrice ?? null,
    max_stack_count: gachaItem.maxStackCount ?? 1,
    untradeable: gachaItem.untradeable ?? null,
    item_description: gachaItem.itemDescription || null,
    type: gachaItem.type || 'Eqp',
    sub_type: gachaItem.subType || null,
    equipment,
    scroll,  // 添加 scroll 欄位處理
  }

  return result
}

/**
 * 將 maplestory.io API 的物品類型標準化為內部格式
 *
 * maplestory.io API 使用 "Equip"，但內部統一使用 "Eqp"
 * 這確保翻譯鍵的一致性
 *
 * @param overallCategory - API 的 overallCategory 欄位
 * @returns 標準化後的類型名稱
 */
function normalizeItemType(overallCategory: string | undefined): string {
  if (!overallCategory) return 'Eqp'

  // 類型映射表：API 格式 → 內部格式
  const typeMapping: Record<string, string> = {
    'Equip': 'Eqp',      // 裝備
    'Consume': 'Consume', // 消耗品
    'Etc': 'Etc',        // 其他
  }

  return typeMapping[overallCategory] || overallCategory
}

/**
 * 將轉蛋物品轉換為 ItemAttributes 格式
 *
 * @param gachaItem - 轉蛋物品資料
 * @param itemId - 物品 ID
 * @returns ItemAttributes 格式的物品屬性，如果轉換失敗則返回 null
 */
export function convertGachaItemToAttributes(
  gachaItem: GachaItem | undefined,
  itemId: number
): ItemAttributes | null {
  if (!gachaItem) {
    return null
  }

  // 優先檢查 Enhanced JSON 格式（有 equipment 或 scroll 物件）
  const enhancedItem = gachaItem as EnhancedGachaItem
  const hasEquipment = !!enhancedItem.equipment
  const hasScroll = !!enhancedItem.scroll

  if (hasEquipment || hasScroll) {
    const result = normalizeEnhancedJSONToItemAttributes(enhancedItem, itemId)
    return result
  }

  // 舊格式：如果沒有屬性資料（可能是消耗品），返回 null
  const hasStats = !!gachaItem.stats
  const hasRequiredStats = !!gachaItem.requiredStats

  if (!hasStats && !hasRequiredStats) {
    return null
  }

  const equipment: ItemEquipment = {
    category: convertGachaCategoryToEquipmentCategory(gachaItem.category, gachaItem.subcategory),
    requirements: convertGachaRequirementsToItemRequirements(gachaItem.requiredStats),
    classes: convertGachaJobTreesToClasses(gachaItem.requiredStats?.jobTrees),
    stats: convertGachaStatsToEquipmentStats(gachaItem.stats),
    stat_variation: convertStatVariation(gachaItem), // 新增：轉換浮動值資料
  }

  const attributes: ItemAttributes = {
    item_id: String(itemId),
    item_name: gachaItem.name || gachaItem.itemName || gachaItem.chineseName || 'Unknown',
    item_type_id: 7, // 裝備類型 ID（假設轉蛋物品都是裝備）
    sale_price: gachaItem.availability?.shopPrice ?? null,
    max_stack_count: 1, // 裝備類物品通常不可堆疊
    untradeable: gachaItem.availability?.tradeable === false,
    item_description: gachaItem.description || null,
    type: normalizeItemType(gachaItem.overallCategory), // 標準化類型格式（Equip → Eqp）
    sub_type: gachaItem.category || null,
    equipment,
  }

  return attributes
}

/**
 * 從轉蛋機列表中查找指定物品的屬性
 *
 * @param itemId - 物品 ID
 * @param gachaMachines - 轉蛋機列表
 * @returns ItemAttributes 格式的物品屬性，如果找不到則返回 null
 */
export function findGachaItemAttributes(
  itemId: number,
  gachaMachines: Array<{ items: GachaItem[] }>
): ItemAttributes | null {
  // 遍歷所有轉蛋機查找物品
  for (let i = 0; i < gachaMachines.length; i++) {
    const machine = gachaMachines[i]

    // 使用數值比較以處理 JSON 中 itemId 可能是字串或數字的情況
    const gachaItem = machine.items.find((item) => Number(item.itemId) === Number(itemId))
    if (gachaItem) {
      const result = convertGachaItemToAttributes(gachaItem, itemId)
      return result
    }
  }

  return null
}
