/**
 * 從 chronostoryData/gachapon/ 產生 enhanced gacha JSON
 *
 * 使用方式: node scripts/generate-gacha-enhanced.js
 *
 * 功能：
 * 1. 讀取 chronostoryData/gachapon/*.json (7 個檔案)
 * 2. 讀取 chronostoryData/item-index.json 取得中文名稱
 * 3. 讀取 chronostoryData/item-attributes-essential.json 取得裝備類型
 * 4. 產生 chronostoryData/gacha/machine-{1-7}-enhanced.json
 */

const fs = require('fs')
const path = require('path')

const GACHAPON_DIR = path.join(__dirname, '../chronostoryData/gachapon')
const OUTPUT_DIR = path.join(__dirname, '../chronostoryData/gacha')
const ITEM_INDEX_PATH = path.join(__dirname, '../chronostoryData/item-index.json')
const ITEM_ATTRIBUTES_PATH = path.join(__dirname, '../chronostoryData/item-attributes-essential.json')

/**
 * 機台對應表
 */
const MACHINE_CONFIG = {
  'lith-harbor': { id: 1, chineseName: '維多利亞港', description: '維多利亞港轉蛋機' },
  'henesys': { id: 2, chineseName: '弓箭手村', description: '弓箭手村轉蛋機' },
  'perion': { id: 3, chineseName: '勇士部落', description: '勇士部落轉蛋機' },
  'kerning-city': { id: 4, chineseName: '墮落城市', description: '墮落城市轉蛋機' },
  'ellinia': { id: 5, chineseName: '魔法森林', description: '魔法森林轉蛋機' },
  'nautilus': { id: 6, chineseName: '諾特勒斯', description: '諾特勒斯轉蛋機' },
  'scroll': { id: 7, chineseName: '卷軸轉蛋', description: '卷軸專屬轉蛋機' }
}

/**
 * 載入 item-index.json 建立查詢表
 */
function loadItemIndex() {
  const data = JSON.parse(fs.readFileSync(ITEM_INDEX_PATH, 'utf-8'))
  const map = new Map()
  data.items.forEach(item => {
    map.set(item.itemId, {
      chineseItemName: item.chineseItemName || null
    })
  })
  console.log(`  載入 item-index.json: ${map.size} 個物品`)
  return map
}

/**
 * 載入 item-attributes-essential.json 建立查詢表
 */
function loadItemAttributes() {
  const data = JSON.parse(fs.readFileSync(ITEM_ATTRIBUTES_PATH, 'utf-8'))
  const map = new Map()
  data.forEach(item => {
    const itemId = parseInt(item.item_id, 10)
    if (!isNaN(itemId)) {
      map.set(itemId, {
        type: item.type || null,
        subType: item.sub_type || null
      })
    }
  })
  console.log(`  載入 item-attributes-essential.json: ${map.size} 個物品`)
  return map
}

/**
 * 轉換單個物品
 */
function transformItem(item, itemIndexMap, itemAttributesMap) {
  const itemId = item.itemId
  const indexInfo = itemIndexMap.get(itemId)
  const attrInfo = itemAttributesMap.get(itemId)

  return {
    itemId: itemId,
    itemName: item.name,
    chineseName: indexInfo?.chineseItemName || null,
    probability: item.percent,
    chance: item.chance,
    type: attrInfo?.type || null,
    subType: attrInfo?.subType || null
  }
}

/**
 * 轉換單個轉蛋機檔案
 */
function transformMachine(filename, itemIndexMap, itemAttributesMap) {
  const basename = path.basename(filename, '.json')
  const config = MACHINE_CONFIG[basename]

  if (!config) {
    console.error(`  未知的機台: ${basename}`)
    return null
  }

  const data = JSON.parse(fs.readFileSync(filename, 'utf-8'))

  // 統計中文名稱覆蓋率
  let hasChineseName = 0

  const enhancedItems = data.items.map(item => {
    const transformed = transformItem(item, itemIndexMap, itemAttributesMap)
    if (transformed.chineseName) hasChineseName++
    return transformed
  })

  const coverage = ((hasChineseName / data.items.length) * 100).toFixed(1)
  console.log(`  ${basename}: ${data.items.length} 物品, 中文覆蓋率 ${coverage}%`)

  return {
    machineId: config.id,
    machineName: data.location,
    chineseMachineName: config.chineseName,
    description: config.description,
    totalItems: data.totalItems,
    items: enhancedItems
  }
}

/**
 * 主函數
 */
function main() {
  console.log('開始產生 enhanced gacha JSON...\n')

  // 確保輸出目錄存在
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
    console.log(`建立目錄: ${OUTPUT_DIR}`)
  }

  // 載入查詢資料
  console.log('載入參考資料:')
  const itemIndexMap = loadItemIndex()
  const itemAttributesMap = loadItemAttributes()

  console.log('\n轉換轉蛋機:')

  // 處理每個轉蛋機檔案
  const files = fs.readdirSync(GACHAPON_DIR).filter(f => f.endsWith('.json'))

  files.forEach(file => {
    const inputPath = path.join(GACHAPON_DIR, file)
    const machine = transformMachine(inputPath, itemIndexMap, itemAttributesMap)

    if (machine) {
      const outputFilename = `machine-${machine.machineId}-enhanced.json`
      const outputPath = path.join(OUTPUT_DIR, outputFilename)

      fs.writeFileSync(outputPath, JSON.stringify(machine, null, 2), 'utf-8')
    }
  })

  // 統計輸出
  console.log('\n完成!')
  const outputFiles = fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith('.json'))
  console.log(`產生 ${outputFiles.length} 個檔案到 ${OUTPUT_DIR}`)

  // 計算總大小
  let totalSize = 0
  outputFiles.forEach(f => {
    const stats = fs.statSync(path.join(OUTPUT_DIR, f))
    totalSize += stats.size
  })
  console.log(`總大小: ${(totalSize / 1024).toFixed(1)} KB`)
}

main()
