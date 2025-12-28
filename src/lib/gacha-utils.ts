import type { GachaItem, EnhancedGachaItem, EnhancedRequirements, EnhancedStats, ItemsOrganizedData, ItemsOrganizedRandomStat, ItemAttributesEssential } from '@/types'
import { mapStatToOrganized } from './stat-mappings'

/**
 * 轉蛋物品屬性轉換工具
 *
 * 將轉蛋機資料（來自 maplestory.io API）轉換為 ItemsOrganizedData 格式
 * 用於在 items-organized JSON 中找不到物品時的回退方案
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
        const metaInfoKey = mapStatToOrganized(key)
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

/**
 * 將 ItemsOrganizedData 轉換為 ItemAttributesEssential
 * 用於篩選操作（物品類別、職業、等級範圍篩選）
 *
 * @param organized - ItemsOrganizedData 格式的物品資料
 * @returns ItemAttributesEssential 格式的物品資料
 */
export function convertOrganizedToEssential(
  organized: ItemsOrganizedData
): ItemAttributesEssential {
  // 將 reqJob 位元遮罩轉換為 equipment_classes
  // 位元遮罩: warrior=1, magician=2, bowman=4, thief=8, pirate=16
  const reqJob = organized.metaInfo.reqJob
  const equipment_classes: ItemAttributesEssential['equipment_classes'] = reqJob !== undefined
    ? {
        beginner: reqJob === 0 ? true : null,
        warrior: (reqJob & 1) > 0 ? true : null,
        magician: (reqJob & 2) > 0 ? true : null,
        bowman: (reqJob & 4) > 0 ? true : null,
        thief: (reqJob & 8) > 0 ? true : null,
        pirate: (reqJob & 16) > 0 ? true : null,
      }
    : null

  return {
    item_id: String(organized.id),
    item_name: organized.description.name,
    type: organized.typeInfo.overallCategory === 'Equip' ? 'Eqp' : organized.typeInfo.overallCategory,
    sub_type: organized.typeInfo.category || null,
    req_level: organized.metaInfo.reqLevel ?? null,
    req_str: organized.metaInfo.reqSTR ?? 0,
    req_dex: organized.metaInfo.reqDEX ?? 0,
    req_int: organized.metaInfo.reqINT ?? 0,
    req_luk: organized.metaInfo.reqLUK ?? 0,
    equipment_category: organized.typeInfo.subCategory || organized.typeInfo.category || null,
    equipment_classes,
    scroll_category: null,
    attack_speed: organized.metaInfo.attackSpeed ?? null,  // 攻擊速度 (2=最快, 9=最慢)
    // 四維屬性
    inc_str: organized.metaInfo.incSTR ?? 0,
    inc_dex: organized.metaInfo.incDEX ?? 0,
    inc_int: organized.metaInfo.incINT ?? 0,
    inc_luk: organized.metaInfo.incLUK ?? 0,
    // 攻擊/魔攻
    inc_pad: organized.metaInfo.incPAD ?? 0,
    inc_mad: organized.metaInfo.incMAD ?? 0,
    // 防禦
    inc_pdd: organized.metaInfo.incPDD ?? 0,
    inc_mdd: organized.metaInfo.incMDD ?? 0,
    // HP/MP
    inc_mhp: organized.metaInfo.incMHP ?? 0,
    inc_mmp: organized.metaInfo.incMMP ?? 0,
    // 命中/迴避
    inc_acc: organized.metaInfo.incACC ?? 0,
    inc_eva: organized.metaInfo.incEVA ?? 0,
    // 速度/跳躍
    inc_speed: organized.metaInfo.incSpeed ?? 0,
    inc_jump: organized.metaInfo.incJump ?? 0,
    // 升級次數
    tuc: organized.metaInfo.tuc ?? 0,
  }
}

/**
 * 從轉蛋機列表中查找指定物品並轉換為 ItemAttributesEssential 格式
 * 用於篩選操作的簡化版查詢函數
 *
 * @param itemId - 物品 ID
 * @param gachaMachines - 轉蛋機列表
 * @returns ItemAttributesEssential 格式的物品資料，如果找不到則返回 null
 */
export function findGachaItemEssential(
  itemId: number,
  gachaMachines: Array<{ items: GachaItem[] }>
): ItemAttributesEssential | null {
  const organized = findGachaItemOrganized(itemId, gachaMachines)
  if (!organized) return null
  return convertOrganizedToEssential(organized)
}
