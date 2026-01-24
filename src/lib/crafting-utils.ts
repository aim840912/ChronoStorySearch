/**
 * Unwelcome Guest 武器製作配方工具函數
 *
 * 製作規則：
 * - 1st: 藍寶石 x2 + 青銅 x5 + 母岩的碎塊 x1
 * - 2nd: 前一階段武器 x1 + 鋼鐵 x5 + 母岩的碎塊 x2
 * - 3rd: 前一階段武器 x1 + 金塊 x5 + 母岩的碎塊 x3
 * - Last: 前一階段武器 x1 + 黑水晶 x5 + 母岩的碎塊 x4
 */

// 材料常數定義（ID 從 maplestory.io API 驗證）
export const CRAFTING_MATERIALS = {
  SAPPHIRE: { id: 4021005, en: 'Sapphire', zh: '藍寶石' },
  BRONZE_PLATE: { id: 4011000, en: 'Bronze Plate', zh: '青銅' },
  STEEL_PLATE: { id: 4011001, en: 'Steel Plate', zh: '鋼鐵' },
  GOLD: { id: 4011006, en: 'Gold', zh: '金塊' },
  ORE_FRAGMENT: { id: 4011010, en: 'Ore Fragment', zh: '母岩的碎塊' },
  BLACK_CRYSTAL: { id: 4021008, en: 'Black Crystal', zh: '黑水晶' },
} as const

export type CraftingStage = '1st' | '2nd' | '3rd' | 'Last'

export interface CraftingMaterial {
  itemId: number
  name: { en: string; zh: string }
  quantity: number
}

export interface CraftingRecipe {
  stage: CraftingStage
  materials: CraftingMaterial[]
  previousWeapon?: {
    itemId: number
    name: { en: string; zh: string }
  }
}

export interface StageRecipe {
  stage: CraftingStage
  materials: CraftingMaterial[]
  previousWeaponId?: number // 前階武器 ID（2nd/3rd/Last 階段有值）
}

export interface MultiStageRecipe {
  currentStage: CraftingStage
  stages: StageRecipe[] // 從 1st 到當前階段的所有配方
}

// Unwelcome Guest 武器 ID 映射表
// 每個武器類型有 4 個版本：[1st, 2nd, 3rd, Last]
const UNWELCOME_GUEST_WEAPONS: Record<string, number[]> = {
  'One-Handed Sword': [1302143, 1302144, 1302145, 1302146],
  'One-Handed Axe': [1312058, 1312059, 1312060, 1312061],
  'One-Handed BW': [1322086, 1322087, 1322088, 1322089],
  Dagger: [1332116, 1332117, 1332118, 1332119],
  Wand: [1372074, 1372075, 1372076, 1372077],
  Staff: [1382095, 1382096, 1382097, 1382098],
  'Two-Handed Sword': [1402086, 1402087, 1402088, 1402089],
  'Two-Handed Axe': [1412058, 1412059, 1412060, 1412061],
  'Two-Handed BW': [1422059, 1422060, 1422061, 1422062],
  Spear: [1432077, 1432078, 1432079, 1432080],
  Polearm: [1442107, 1442108, 1442109, 1442110],
  Bow: [1452102, 1452103, 1452104, 1452105],
  Crossbow: [1462087, 1462088, 1462089, 1462090],
  Claw: [1472113, 1472114, 1472115, 1472116],
  Knuckle: [1482075, 1482076, 1482077, 1482078],
  Gun: [1492075, 1492076, 1492077, 1492078],
  // 盾牌類型
  'Warrior Shield': [1092070, 1092071, 1092072, 1092073],
  'Magician Shield': [1092075, 1092076, 1092077, 1092078],
  'Thief Shield': [1092080, 1092081, 1092082, 1092083],
}

// 建立 itemId -> 武器資訊的反向映射
const ITEM_ID_TO_WEAPON_INFO = new Map<
  number,
  { weaponType: string; stageIndex: number }
>()

for (const [weaponType, ids] of Object.entries(UNWELCOME_GUEST_WEAPONS)) {
  ids.forEach((id, index) => {
    ITEM_ID_TO_WEAPON_INFO.set(id, { weaponType, stageIndex: index })
  })
}

const STAGE_NAMES: CraftingStage[] = ['1st', '2nd', '3rd', 'Last']

/**
 * 判斷是否為 Unwelcome Guest 系列物品（透過 itemId）
 */
export function isUnwelcomeGuestItem(itemId: number): boolean {
  return ITEM_ID_TO_WEAPON_INFO.has(itemId)
}

/**
 * 判斷是否為 Unwelcome Guest 系列物品（透過名稱）
 */
export function isUnwelcomeGuestByName(itemName: string): boolean {
  return itemName.toLowerCase().includes('unwelcome guest')
}

/**
 * 取得製作階段
 */
export function getUnwelcomeGuestStage(itemId: number): CraftingStage | null {
  const info = ITEM_ID_TO_WEAPON_INFO.get(itemId)
  if (!info) return null
  return STAGE_NAMES[info.stageIndex]
}

/**
 * 取得武器類型的中文名稱
 */
function getWeaponTypeZhName(weaponType: string): string {
  const typeMap: Record<string, string> = {
    'One-Handed Sword': '單手劍',
    'One-Handed Axe': '單手斧',
    'One-Handed BW': '單手鈍器',
    Dagger: '短劍',
    Wand: '短杖',
    Staff: '長杖',
    'Two-Handed Sword': '雙手劍',
    'Two-Handed Axe': '雙手斧',
    'Two-Handed BW': '雙手鈍器',
    Spear: '槍',
    Polearm: '矛',
    Bow: '弓',
    Crossbow: '弩',
    Claw: '拳套',
    Knuckle: '指虎',
    Gun: '槍',
    // 盾牌類型
    'Warrior Shield': '戰士盾牌',
    'Magician Shield': '法師盾牌',
    'Thief Shield': '盜賊盾牌',
  }
  return typeMap[weaponType] || weaponType
}

/**
 * 取得武器名稱
 */
function getWeaponName(
  weaponType: string,
  stage: CraftingStage
): { en: string; zh: string } {
  const zhType = getWeaponTypeZhName(weaponType)
  return {
    en: `${stage} Unwelcome Guest ${weaponType}`,
    zh: `${stage} 不速之客${zhType}`,
  }
}

/**
 * 取得製作配方
 */
export function getUnwelcomeGuestRecipe(itemId: number): CraftingRecipe | null {
  const info = ITEM_ID_TO_WEAPON_INFO.get(itemId)
  if (!info) return null

  const { weaponType, stageIndex } = info
  const stage = STAGE_NAMES[stageIndex]
  const weaponIds = UNWELCOME_GUEST_WEAPONS[weaponType]

  const materials: CraftingMaterial[] = []
  let previousWeapon: CraftingRecipe['previousWeapon'] | undefined

  switch (stage) {
    case '1st':
      // 藍寶石 x2 + 青銅 x5 + 母岩的碎塊 x1
      materials.push({
        itemId: CRAFTING_MATERIALS.SAPPHIRE.id,
        name: { en: CRAFTING_MATERIALS.SAPPHIRE.en, zh: CRAFTING_MATERIALS.SAPPHIRE.zh },
        quantity: 2,
      })
      materials.push({
        itemId: CRAFTING_MATERIALS.BRONZE_PLATE.id,
        name: { en: CRAFTING_MATERIALS.BRONZE_PLATE.en, zh: CRAFTING_MATERIALS.BRONZE_PLATE.zh },
        quantity: 5,
      })
      materials.push({
        itemId: CRAFTING_MATERIALS.ORE_FRAGMENT.id,
        name: { en: CRAFTING_MATERIALS.ORE_FRAGMENT.en, zh: CRAFTING_MATERIALS.ORE_FRAGMENT.zh },
        quantity: 1,
      })
      break

    case '2nd':
      // 前一階段武器 x1 + 鋼鐵 x5 + 母岩的碎塊 x2
      previousWeapon = {
        itemId: weaponIds[0],
        name: getWeaponName(weaponType, '1st'),
      }
      materials.push({
        itemId: CRAFTING_MATERIALS.STEEL_PLATE.id,
        name: { en: CRAFTING_MATERIALS.STEEL_PLATE.en, zh: CRAFTING_MATERIALS.STEEL_PLATE.zh },
        quantity: 5,
      })
      materials.push({
        itemId: CRAFTING_MATERIALS.ORE_FRAGMENT.id,
        name: { en: CRAFTING_MATERIALS.ORE_FRAGMENT.en, zh: CRAFTING_MATERIALS.ORE_FRAGMENT.zh },
        quantity: 2,
      })
      break

    case '3rd':
      // 前一階段武器 x1 + 金塊 x5 + 母岩的碎塊 x3
      previousWeapon = {
        itemId: weaponIds[1],
        name: getWeaponName(weaponType, '2nd'),
      }
      materials.push({
        itemId: CRAFTING_MATERIALS.GOLD.id,
        name: { en: CRAFTING_MATERIALS.GOLD.en, zh: CRAFTING_MATERIALS.GOLD.zh },
        quantity: 5,
      })
      materials.push({
        itemId: CRAFTING_MATERIALS.ORE_FRAGMENT.id,
        name: { en: CRAFTING_MATERIALS.ORE_FRAGMENT.en, zh: CRAFTING_MATERIALS.ORE_FRAGMENT.zh },
        quantity: 3,
      })
      break

    case 'Last':
      // 前一階段武器 x1 + 黑水晶 x5 + 母岩的碎塊 x4
      previousWeapon = {
        itemId: weaponIds[2],
        name: getWeaponName(weaponType, '3rd'),
      }
      materials.push({
        itemId: CRAFTING_MATERIALS.BLACK_CRYSTAL.id,
        name: { en: CRAFTING_MATERIALS.BLACK_CRYSTAL.en, zh: CRAFTING_MATERIALS.BLACK_CRYSTAL.zh },
        quantity: 5,
      })
      materials.push({
        itemId: CRAFTING_MATERIALS.ORE_FRAGMENT.id,
        name: { en: CRAFTING_MATERIALS.ORE_FRAGMENT.en, zh: CRAFTING_MATERIALS.ORE_FRAGMENT.zh },
        quantity: 4,
      })
      break
  }

  return {
    stage,
    materials,
    previousWeapon,
  }
}

/**
 * 取得材料圖片 URL（使用 maplestory.io API）
 */
export function getMaterialImageUrl(itemId: number): string {
  return `https://maplestory.io/api/GMS/217/item/${itemId}/icon`
}

/**
 * 取得單一階段的材料（內部輔助函數）
 */
function getStageMaterials(stage: CraftingStage): CraftingMaterial[] {
  const materials: CraftingMaterial[] = []

  switch (stage) {
    case '1st':
      // 藍寶石 x2 + 青銅 x5 + 母岩的碎塊 x1
      materials.push({
        itemId: CRAFTING_MATERIALS.SAPPHIRE.id,
        name: { en: CRAFTING_MATERIALS.SAPPHIRE.en, zh: CRAFTING_MATERIALS.SAPPHIRE.zh },
        quantity: 2,
      })
      materials.push({
        itemId: CRAFTING_MATERIALS.BRONZE_PLATE.id,
        name: { en: CRAFTING_MATERIALS.BRONZE_PLATE.en, zh: CRAFTING_MATERIALS.BRONZE_PLATE.zh },
        quantity: 5,
      })
      materials.push({
        itemId: CRAFTING_MATERIALS.ORE_FRAGMENT.id,
        name: { en: CRAFTING_MATERIALS.ORE_FRAGMENT.en, zh: CRAFTING_MATERIALS.ORE_FRAGMENT.zh },
        quantity: 1,
      })
      break

    case '2nd':
      // 鋼鐵 x5 + 母岩的碎塊 x2
      materials.push({
        itemId: CRAFTING_MATERIALS.STEEL_PLATE.id,
        name: { en: CRAFTING_MATERIALS.STEEL_PLATE.en, zh: CRAFTING_MATERIALS.STEEL_PLATE.zh },
        quantity: 5,
      })
      materials.push({
        itemId: CRAFTING_MATERIALS.ORE_FRAGMENT.id,
        name: { en: CRAFTING_MATERIALS.ORE_FRAGMENT.en, zh: CRAFTING_MATERIALS.ORE_FRAGMENT.zh },
        quantity: 2,
      })
      break

    case '3rd':
      // 金塊 x5 + 母岩的碎塊 x3
      materials.push({
        itemId: CRAFTING_MATERIALS.GOLD.id,
        name: { en: CRAFTING_MATERIALS.GOLD.en, zh: CRAFTING_MATERIALS.GOLD.zh },
        quantity: 5,
      })
      materials.push({
        itemId: CRAFTING_MATERIALS.ORE_FRAGMENT.id,
        name: { en: CRAFTING_MATERIALS.ORE_FRAGMENT.en, zh: CRAFTING_MATERIALS.ORE_FRAGMENT.zh },
        quantity: 3,
      })
      break

    case 'Last':
      // 黑水晶 x5 + 母岩的碎塊 x4
      materials.push({
        itemId: CRAFTING_MATERIALS.BLACK_CRYSTAL.id,
        name: { en: CRAFTING_MATERIALS.BLACK_CRYSTAL.en, zh: CRAFTING_MATERIALS.BLACK_CRYSTAL.zh },
        quantity: 5,
      })
      materials.push({
        itemId: CRAFTING_MATERIALS.ORE_FRAGMENT.id,
        name: { en: CRAFTING_MATERIALS.ORE_FRAGMENT.en, zh: CRAFTING_MATERIALS.ORE_FRAGMENT.zh },
        quantity: 4,
      })
      break
  }

  return materials
}

/**
 * 取得多階段製作配方（從 1st 到當前階段）
 */
export function getMultiStageRecipe(itemId: number): MultiStageRecipe | null {
  const info = ITEM_ID_TO_WEAPON_INFO.get(itemId)
  if (!info) return null

  const { weaponType, stageIndex } = info
  const currentStage = STAGE_NAMES[stageIndex]
  const weaponIds = UNWELCOME_GUEST_WEAPONS[weaponType]
  const stages: StageRecipe[] = []

  // 從 1st 到當前階段依序加入
  for (let i = 0; i <= stageIndex; i++) {
    const stage = STAGE_NAMES[i]
    stages.push({
      stage,
      materials: getStageMaterials(stage),
      // 2nd/3rd/Last 階段需要前階武器（i > 0 時有前階武器）
      previousWeaponId: i > 0 ? weaponIds[i - 1] : undefined,
    })
  }

  return {
    currentStage,
    stages,
  }
}
