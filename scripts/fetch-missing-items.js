/**
 * 從 maplestory.io 和 ChronoStory API 抓取缺少的物品資料
 *
 * 使用方式: node scripts/fetch-missing-items.js
 *
 * 資料來源:
 * - Consumable/Etc: https://maplestory.io/api/GMS/83/item/{id}
 * - Equipment Icon: https://maplestory.io/api/GMS/83/item/{id}/icon
 * - Equipment Stats: https://chronostory.onrender.com/api/item-info?itemId={id}
 */

const fs = require('fs')
const path = require('path')

// API 配置
const MAPLESTORY_IO_API = 'https://maplestory.io/api/GMS/83/item'
const CHRONOSTORY_API = 'https://chronostory.onrender.com/api/item-info'
const REQUEST_DELAY_MS = 1500

// 輸出目錄
const OUTPUT_BASE = path.join(process.cwd(), 'data', 'chronostory', 'items-organized')

// 缺少的物品 ID 清單
const MISSING_EQUIPMENT_IDS = [
  1002013, 1040058, 1040060, 1040070, 1041055, 1041058,
  1060044, 1060046, 1060059, 1061051, 1061054,
  1072032, 1072076, 1072077, 1072080,
  1082007, 1082048, 1082053, 1082189,
  1322014, 1372033, 1462000
]

const MISSING_CONSUMABLE_IDS = [
  2000010, 2002006, 2002008, 2002009, 2002010,
  2020015, 2022003,
  2040344, 2040357, 2040410
]

const MISSING_ETC_IDS = [
  4000106, 4000107, 4000108, 4000109, 4000110,
  4000111, 4000112, 4000113, 4000114, 4000115,
  4000128, 4000129, 4000130, 4000131, 4000132,
  4000133, 4000134, 4000135,
  4000143, 4000144, 4000145, 4000146, 4000147,
  4000148, 4000149, 4000150, 4000151, 4000152,
  4000218,
  4000995, 4000996, 4000997,
  4001110, 4001112,
  4031059
]

/**
 * 延遲函數
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 從 maplestory.io 取得物品資料 (Consumable/Etc)
 */
async function fetchMapleStoryItem(itemId) {
  const url = `${MAPLESTORY_IO_API}/${itemId}`
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  const data = await response.json()

  // 檢查是否為 frameBooks (Equipment)
  if (data.frameBooks) {
    return null // Equipment 需要特殊處理
  }

  // 添加空的 chineseName
  if (data.description) {
    data.description.chineseName = ''
  }

  return data
}

/**
 * 從 maplestory.io 取得物品圖示 (base64)
 */
async function fetchItemIcon(itemId) {
  const url = `${MAPLESTORY_IO_API}/${itemId}/icon`
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  const base64 = Buffer.from(arrayBuffer).toString('base64')
  return base64
}

/**
 * 從 ChronoStory API 取得物品屬性
 */
async function fetchChronoStoryItem(itemId) {
  const url = `${CHRONOSTORY_API}?itemId=${itemId}`
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  return await response.json()
}

/**
 * 取得裝備類別的 typeInfo
 */
function getEquipmentTypeInfo(itemId, subType) {
  const idStr = String(itemId)

  // 根據 ID 前綴判斷類別
  const categoryMap = {
    '1002': { category: 'Armor', subCategory: 'Hat' },
    '1040': { category: 'Armor', subCategory: 'Top' },
    '1041': { category: 'Armor', subCategory: 'Top' },
    '1060': { category: 'Armor', subCategory: 'Bottom' },
    '1061': { category: 'Armor', subCategory: 'Bottom' },
    '1072': { category: 'Armor', subCategory: 'Shoes' },
    '1082': { category: 'Armor', subCategory: 'Glove' },
    '1322': { category: 'One-Handed Weapon', subCategory: 'One-Handed Blunt Weapon' },
    '1372': { category: 'One-Handed Weapon', subCategory: 'Wand' },
    '1462': { category: 'Two-Handed Weapon', subCategory: 'Crossbow' },
  }

  const prefix = idStr.substring(0, 4)
  const info = categoryMap[prefix] || { category: 'Armor', subCategory: subType || 'Unknown' }

  return {
    overallCategory: 'Equip',
    category: info.category,
    subCategory: info.subCategory,
    lowItemId: Math.floor(itemId / 10000) * 10000,
    highItemId: Math.floor(itemId / 10000) * 10000 + 10000
  }
}

/**
 * 轉換 ChronoStory 格式為 items-organized 格式
 */
function convertChronoStoryToOrganized(chronoData, iconBase64) {
  const itemId = parseInt(chronoData.item_id)
  const equipment = chronoData.equipment || {}
  const requirements = equipment.requirements || {}
  const stats = equipment.stats || {}
  const statVariation = equipment.stat_variation || {}

  // 構建 metaInfo
  const metaInfo = {
    only: false,
    cash: false,
    iconRaw: iconBase64,
    icon: iconBase64,
    price: chronoData.sale_price || 0,
  }

  // 添加需求屬性
  if (requirements.req_level) metaInfo.reqLevel = requirements.req_level
  if (requirements.req_str) metaInfo.reqSTR = requirements.req_str
  if (requirements.req_dex) metaInfo.reqDEX = requirements.req_dex
  if (requirements.req_int) metaInfo.reqINT = requirements.req_int
  if (requirements.req_luk) metaInfo.reqLUK = requirements.req_luk

  // 添加裝備統計
  if (stats.wdef) metaInfo.incPDD = stats.wdef
  if (stats.mdef) metaInfo.incMDD = stats.mdef
  if (stats.watk) metaInfo.incPAD = stats.watk
  if (stats.matk) metaInfo.incMAD = stats.matk
  if (stats.str) metaInfo.incSTR = stats.str
  if (stats.dex) metaInfo.incDEX = stats.dex
  if (stats.int) metaInfo.incINT = stats.int
  if (stats.luk) metaInfo.incLUK = stats.luk
  if (stats.accuracy) metaInfo.incACC = stats.accuracy
  if (stats.avoidability) metaInfo.incEVA = stats.avoidability
  if (stats.speed) metaInfo.incSpeed = stats.speed
  if (stats.jump) metaInfo.incJump = stats.jump
  if (stats.hp) metaInfo.incMHP = stats.hp
  if (stats.mp) metaInfo.incMMP = stats.mp
  if (stats.upgrades) metaInfo.tuc = stats.upgrades

  // 計算職業需求
  const classes = equipment.classes || {}
  let reqJob = 0
  if (classes.warrior) reqJob |= 1
  if (classes.magician) reqJob |= 2
  if (classes.bowman) reqJob |= 4
  if (classes.thief) reqJob |= 8
  if (classes.pirate) reqJob |= 16
  if (reqJob > 0) metaInfo.reqJob = reqJob

  // 構建 randomStats
  const randomStats = {}
  const statMapping = {
    str: 'incSTR', dex: 'incDEX', int: 'incINT', luk: 'incLUK',
    watk: 'incPAD', matk: 'incMAD', wdef: 'incPDD', mdef: 'incMDD',
    accuracy: 'incACC', avoidability: 'incEVA', speed: 'incSpeed', jump: 'incJump',
    hp: 'incMHP', mp: 'incMMP'
  }

  for (const [chronoKey, organizedKey] of Object.entries(statMapping)) {
    if (statVariation[chronoKey]) {
      const variation = statVariation[chronoKey]
      const baseValue = stats[chronoKey] || 0
      randomStats[organizedKey] = {
        base: baseValue,
        min: variation.min || 0,
        max: variation.max || 0
      }
    }
  }

  return {
    id: itemId,
    description: {
      id: itemId,
      name: chronoData.item_name || '',
      description: chronoData.item_description || '',
      chineseName: ''
    },
    metaInfo,
    typeInfo: getEquipmentTypeInfo(itemId, chronoData.sub_type),
    ...(Object.keys(randomStats).length > 0 ? { randomStats } : {})
  }
}

/**
 * 儲存物品資料到 JSON 檔案
 */
function saveItemData(itemId, data, category) {
  const outputDir = path.join(OUTPUT_BASE, category)
  const outputFile = path.join(outputDir, `${itemId}.json`)

  // 確保目錄存在
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  fs.writeFileSync(outputFile, JSON.stringify(data, null, 2), 'utf8')
  return outputFile
}

/**
 * 處理 Consumable/Etc 物品
 */
async function processSimpleItems(ids, category) {
  console.log(`\n📦 處理 ${category} 物品 (${ids.length} 個)...`)

  let successCount = 0
  let failedCount = 0
  const failedIds = []

  for (let i = 0; i < ids.length; i++) {
    const itemId = ids[i]
    process.stdout.write(`  [${i + 1}/${ids.length}] ID ${itemId}...`)

    try {
      const data = await fetchMapleStoryItem(itemId)

      if (data) {
        const outputFile = saveItemData(itemId, data, category)
        console.log(` ✅ ${data.description?.name || 'Unknown'}`)
        successCount++
      } else {
        console.log(` ⚠️ 需要特殊處理`)
        failedIds.push(itemId)
        failedCount++
      }
    } catch (error) {
      console.log(` ❌ ${error.message}`)
      failedIds.push(itemId)
      failedCount++
    }

    if (i < ids.length - 1) {
      await delay(REQUEST_DELAY_MS)
    }
  }

  return { successCount, failedCount, failedIds }
}

/**
 * 處理 Equipment 物品
 */
async function processEquipmentItems(ids) {
  console.log(`\n⚔️ 處理 Equipment 物品 (${ids.length} 個)...`)

  let successCount = 0
  let failedCount = 0
  const failedIds = []

  for (let i = 0; i < ids.length; i++) {
    const itemId = ids[i]
    process.stdout.write(`  [${i + 1}/${ids.length}] ID ${itemId}...`)

    try {
      // 取得圖示
      const iconBase64 = await fetchItemIcon(itemId)
      await delay(500) // 短暫延遲避免 rate limit

      // 取得屬性
      const chronoData = await fetchChronoStoryItem(itemId)

      // 轉換格式
      const organizedData = convertChronoStoryToOrganized(chronoData, iconBase64)

      // 儲存
      const outputFile = saveItemData(itemId, organizedData, 'equipment')
      console.log(` ✅ ${organizedData.description?.name || 'Unknown'}`)
      successCount++
    } catch (error) {
      console.log(` ❌ ${error.message}`)
      failedIds.push(itemId)
      failedCount++
    }

    if (i < ids.length - 1) {
      await delay(REQUEST_DELAY_MS)
    }
  }

  return { successCount, failedCount, failedIds }
}

/**
 * 主函數
 */
async function main() {
  console.log('🚀 開始抓取缺少的物品資料...\n')
  console.log('📊 統計:')
  console.log(`  - Equipment: ${MISSING_EQUIPMENT_IDS.length} 個`)
  console.log(`  - Consumable: ${MISSING_CONSUMABLE_IDS.length} 個`)
  console.log(`  - Etc: ${MISSING_ETC_IDS.length} 個`)
  console.log(`  - 總計: ${MISSING_EQUIPMENT_IDS.length + MISSING_CONSUMABLE_IDS.length + MISSING_ETC_IDS.length} 個`)

  const startTime = Date.now()
  const results = {
    equipment: { successCount: 0, failedCount: 0, failedIds: [] },
    consumable: { successCount: 0, failedCount: 0, failedIds: [] },
    etc: { successCount: 0, failedCount: 0, failedIds: [] }
  }

  // 處理 Consumable
  results.consumable = await processSimpleItems(MISSING_CONSUMABLE_IDS, 'consumable')

  // 處理 Etc
  results.etc = await processSimpleItems(MISSING_ETC_IDS, 'etc')

  // 處理 Equipment
  results.equipment = await processEquipmentItems(MISSING_EQUIPMENT_IDS)

  // 統計報告
  const elapsedTime = ((Date.now() - startTime) / 1000 / 60).toFixed(2)
  const totalSuccess = results.equipment.successCount + results.consumable.successCount + results.etc.successCount
  const totalFailed = results.equipment.failedCount + results.consumable.failedCount + results.etc.failedCount

  console.log('\n' + '═'.repeat(50))
  console.log('📊 最終報告')
  console.log('═'.repeat(50))
  console.log(`\n✅ 成功: ${totalSuccess} 個物品`)
  console.log(`❌ 失敗: ${totalFailed} 個物品`)
  console.log(`⏱️  執行時間: ${elapsedTime} 分鐘`)

  if (totalFailed > 0) {
    console.log('\n⚠️ 失敗的物品 ID:')
    const allFailed = [
      ...results.equipment.failedIds,
      ...results.consumable.failedIds,
      ...results.etc.failedIds
    ]
    console.log(allFailed.join(', '))
  }

  console.log('\n📁 輸出目錄: data/chronostory/items-organized/')
}

// 執行
main().catch(error => {
  console.error('❌ 腳本執行失敗:', error)
  process.exit(1)
})
