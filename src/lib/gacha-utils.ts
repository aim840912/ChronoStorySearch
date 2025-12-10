import type { GachaItem, ItemAttributes, ItemRequirements, ItemClasses, ItemEquipmentStats, ItemEquipment, StatVariation, ScrollInfo, EnhancedGachaItem, EnhancedRequirements, EnhancedStats, EnhancedStatVariation, ItemsOrganizedData, ItemsOrganizedRandomStat } from '@/types'

/**
 * 轉蛋物品屬性轉換工具
 *
 * 將轉蛋機資料（來自 maplestory.io API）轉換為 ItemAttributes 格式
 * 用於在 item-attributes.json 中找不到物品時的回退方案
 */

/**
 * 加權隨機抽取算法
 *
 * @param items - 轉蛋機的物品列表
 * @returns 隨機抽取的物品
 */
export function weightedRandomDraw(items: GachaItem[]): GachaItem {
  // 計算總權重
  const totalWeight = items.reduce((sum, item) => sum + item.chance, 0)

  // 生成 0 到 totalWeight 之間的隨機數
  let random = Math.random() * totalWeight

  // 根據權重區間選擇物品
  for (const item of items) {
    random -= item.chance
    if (random <= 0) {
      return item
    }
  }

  // 容錯：如果因為浮點數誤差沒有返回，返回最後一個物品
  return items[items.length - 1]
}

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

/**
 * 將轉蛋物品轉換為 ItemsOrganizedData 格式
 *
 * 用於在 items-organized JSON 中找不到物品時的回退方案
 * ItemsOrganizedData 是新的資料格式，使用 metaInfo 和 randomStats 結構
 *
 * @param gachaItem - 轉蛋物品資料
 * @param itemId - 物品 ID
 * @returns ItemsOrganizedData 格式的物品資料，如果轉換失敗則返回 null
 */
export function convertGachaToOrganized(
  gachaItem: GachaItem | undefined,
  itemId: number
): ItemsOrganizedData | null {
  if (!gachaItem) {
    return null
  }

  const enhancedItem = gachaItem as EnhancedGachaItem

  // 從 Enhanced JSON 的 equipment 或原始格式取得屬性
  const hasEquipment = !!enhancedItem.equipment
  const stats = hasEquipment
    ? enhancedItem.equipment?.stats
    : gachaItem.stats
  const requirements = hasEquipment
    ? enhancedItem.equipment?.requirements
    : gachaItem.requiredStats
  const statVariation = hasEquipment
    ? enhancedItem.equipment?.statVariation
    : undefined

  // 建立 randomStats（從 statVariation 轉換）
  let randomStats: Record<string, ItemsOrganizedRandomStat> | undefined
  if (statVariation && typeof statVariation === 'object') {
    randomStats = {}
    Object.entries(statVariation).forEach(([key, value]) => {
      if (value && typeof value === 'object' && ('min' in value || 'max' in value)) {
        // 將 statVariation 的 key 映射到 metaInfo 的 key 格式
        // 例如: str -> incSTR, watk -> incPAD
        const metaInfoKey = mapStatKeyToMetaInfo(key)
        randomStats![metaInfoKey] = {
          base: 0,
          min: value.min ?? 0,
          max: value.max ?? 0,
        }
      }
    })
    if (Object.keys(randomStats).length === 0) {
      randomStats = undefined
    }
  }

  // 計算 reqJob 位元遮罩
  let reqJob: number | undefined
  if (hasEquipment && enhancedItem.equipment?.classes) {
    const classes = enhancedItem.equipment.classes
    reqJob = 0
    if (classes.warrior) reqJob |= 1
    if (classes.magician) reqJob |= 2
    if (classes.bowman) reqJob |= 4
    if (classes.thief) reqJob |= 8
    if (classes.pirate) reqJob |= 16
    if (reqJob === 0) reqJob = undefined
  } else if (gachaItem.requiredStats?.jobTrees) {
    const jobTrees = gachaItem.requiredStats.jobTrees
    reqJob = 0
    jobTrees.forEach((job) => {
      const jobLower = job.toLowerCase()
      if (jobLower === 'warrior') reqJob! |= 1
      if (jobLower === 'magician') reqJob! |= 2
      if (jobLower === 'bowman') reqJob! |= 4
      if (jobLower === 'thief') reqJob! |= 8
      if (jobLower === 'pirate') reqJob! |= 16
    })
    if (reqJob === 0) reqJob = undefined
  }

  // 決定 overallCategory
  const overallCategory = enhancedItem.type || gachaItem.overallCategory || 'Equip'

  // 取得 requirements 資料（需要處理兩種可能的格式）
  const reqLevel = hasEquipment
    ? (requirements as EnhancedRequirements)?.reqLevel
    : (gachaItem.requiredStats as { level?: number })?.level
  const reqSTR = hasEquipment
    ? (requirements as EnhancedRequirements)?.reqStr
    : (gachaItem.requiredStats as { str?: number })?.str
  const reqDEX = hasEquipment
    ? (requirements as EnhancedRequirements)?.reqDex
    : (gachaItem.requiredStats as { dex?: number })?.dex
  const reqINT = hasEquipment
    ? (requirements as EnhancedRequirements)?.reqInt
    : (gachaItem.requiredStats as { int?: number })?.int
  const reqLUK = hasEquipment
    ? (requirements as EnhancedRequirements)?.reqLuk
    : (gachaItem.requiredStats as { luk?: number })?.luk

  return {
    id: itemId,
    description: {
      id: itemId,
      name: gachaItem.name || enhancedItem.itemName || '',
      description: gachaItem.description || enhancedItem.itemDescription || '',
      chineseItemName: gachaItem.chineseName || undefined,
    },
    metaInfo: {
      only: enhancedItem.untradeable || false,
      cash: gachaItem.availability?.cash || false,
      price: enhancedItem.salePrice || gachaItem.availability?.shopPrice || undefined,
      slotMax: enhancedItem.maxStackCount || undefined,
      tuc: hasEquipment ? (stats as EnhancedStats)?.upgrades ?? undefined : undefined,
      reqLevel: reqLevel || undefined,
      reqSTR: reqSTR || undefined,
      reqDEX: reqDEX || undefined,
      reqINT: reqINT || undefined,
      reqLUK: reqLUK || undefined,
      reqJob,
      incSTR: stats?.str || undefined,
      incDEX: stats?.dex || undefined,
      incINT: stats?.int || undefined,
      incLUK: stats?.luk || undefined,
      incPAD: stats?.watk || (stats as Record<string, number | undefined>)?.attack || undefined,
      incMAD: stats?.matk || (stats as Record<string, number | undefined>)?.magicAttack || undefined,
      incPDD: stats?.wdef || (stats as Record<string, number | undefined>)?.defense || undefined,
      incMDD: stats?.mdef || (stats as Record<string, number | undefined>)?.magicDefense || undefined,
      incMHP: stats?.hp || undefined,
      incMMP: stats?.mp || undefined,
      incACC: stats?.accuracy || undefined,
      incEVA: stats?.avoidability || undefined,
      incSpeed: stats?.speed || undefined,
      incJump: stats?.jump || undefined,
      attackSpeed: (stats as EnhancedStats)?.attackSpeed || undefined,
    },
    typeInfo: {
      overallCategory: overallCategory === 'Equip' ? 'Equip' : overallCategory,
      category: gachaItem.category || enhancedItem.equipment?.category || '',
      subCategory: gachaItem.subcategory || '',
    },
    randomStats,
    isGachapon: true,
  }
}

/**
 * 將 statVariation 的 key 映射到 metaInfo 的 key 格式
 * 例如: str -> incSTR, watk -> incPAD
 */
function mapStatKeyToMetaInfo(key: string): string {
  const mapping: Record<string, string> = {
    'str': 'incSTR',
    'dex': 'incDEX',
    'int': 'incINT',
    'luk': 'incLUK',
    'watk': 'incPAD',
    'matk': 'incMAD',
    'wdef': 'incPDD',
    'mdef': 'incMDD',
    'hp': 'incMHP',
    'mp': 'incMMP',
    'accuracy': 'incACC',
    'avoidability': 'incEVA',
    'speed': 'incSpeed',
    'jump': 'incJump',
    'attackSpeed': 'attackSpeed',
    // 如果已經是 incXXX 格式，直接返回
    'incSTR': 'incSTR',
    'incDEX': 'incDEX',
    'incINT': 'incINT',
    'incLUK': 'incLUK',
    'incPAD': 'incPAD',
    'incMAD': 'incMAD',
    'incPDD': 'incPDD',
    'incMDD': 'incMDD',
    'incMHP': 'incMHP',
    'incMMP': 'incMMP',
    'incACC': 'incACC',
    'incEVA': 'incEVA',
    'incSpeed': 'incSpeed',
    'incJump': 'incJump',
  }
  return mapping[key] || key
}

/**
 * 從轉蛋機列表中查找指定物品並轉換為 ItemsOrganizedData 格式
 *
 * @param itemId - 物品 ID
 * @param gachaMachines - 轉蛋機列表
 * @returns ItemsOrganizedData 格式的物品資料，如果找不到則返回 null
 */
export function findGachaItemOrganized(
  itemId: number,
  gachaMachines: Array<{ items: GachaItem[] }>
): ItemsOrganizedData | null {
  for (let i = 0; i < gachaMachines.length; i++) {
    const machine = gachaMachines[i]
    const gachaItem = machine.items.find((item) => Number(item.itemId) === Number(itemId))
    if (gachaItem) {
      return convertGachaToOrganized(gachaItem, itemId)
    }
  }
  return null
}
