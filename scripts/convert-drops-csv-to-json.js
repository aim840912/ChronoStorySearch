const fs = require('fs')
const path = require('path')

// CSV 檔案路徑（Windows 路徑）
const csvPath = '/mnt/c/Users/aim84/Downloads/ChronoStory_items_tw(新增轉蛋&裝備浮動) - ChronosStory-掉落物查詢.csv'
const outputPath = path.join(__dirname, '../data/drops-new.json')

console.log('開始轉換 CSV 到 JSON...\n')

// 讀取 CSV 檔案
const csvContent = fs.readFileSync(csvPath, 'utf8')

// 正確解析 CSV（處理引號內的換行符）
const records = parseCSV(csvContent)

console.log(`找到 ${records.length} 筆記錄（包含標題行）`)

// 解析標題行
const headers = records[0]
console.log(`欄位數量: ${headers.length}`)
console.log(`資料行數: ${records.length - 1}\n`)

// 轉換資料
const drops = []
let skippedCount = 0
let errorCount = 0

for (let i = 1; i < records.length; i++) {
  const values = records[i]

  // 跳過空行
  if (values.length === 0 || (values.length === 1 && !values[0])) {
    continue
  }

  try {
    if (values.length < 15) {
      console.warn(`第 ${i + 1} 行欄位不足 (${values.length}/15)，跳過`)
      skippedCount++
      continue
    }

    const [
      inGame,           // 0: InGame
      dropperID,        // 1: DropperID
      mobName,          // 2: MobName
      enable,           // 3: Enable
      _questID,         // 4: QuestID
      itemID,           // 5: ItemID
      serverItemName,   // 6: ServerItemName
      chance,           // 7: Chance
      _percentChance,   // 8: Percent Chance
      minQTY,           // 9: MinQTY
      maxQTY,           // 10: MaxQTY
      _applicableJobs,  // 11: ApplicableJobs
      _requiredLevel,   // 12: RequiredLevel
      _requiredStats,   // 13: RequiredStats
      _equipStats       // 14: EquipStatsWithRange
    ] = values

    // 過濾：只保留 InGame=TRUE 且 Enable=TRUE 的記錄
    if (inGame.toUpperCase() !== 'TRUE' || enable.toUpperCase() !== 'TRUE') {
      skippedCount++
      continue
    }

    // 轉換機率（移除逗號並除以 1,000,000）
    const chanceValue = parseFloat(chance.replace(/,/g, '')) / 1000000

    // 建立 drop 物件
    const drop = {
      mobId: parseInt(dropperID),
      mobName: mobName,
      itemId: parseInt(itemID),
      itemName: serverItemName,
      chance: chanceValue,
      minQty: parseInt(minQTY),
      maxQty: parseInt(maxQTY)
    }

    // 驗證資料
    if (isNaN(drop.mobId) || isNaN(drop.itemId) || isNaN(drop.chance)) {
      console.warn(`第 ${i + 1} 行資料格式錯誤，跳過`)
      errorCount++
      continue
    }

    drops.push(drop)
  } catch (error) {
    console.error(`第 ${i + 1} 行解析失敗: ${error.message}`)
    errorCount++
  }
}

// 排序（依 mobId, itemId）
drops.sort((a, b) => {
  if (a.mobId !== b.mobId) return a.mobId - b.mobId
  return a.itemId - b.itemId
})

// 寫入 JSON 檔案
fs.writeFileSync(outputPath, JSON.stringify(drops, null, 2), 'utf8')

// 統計資訊
console.log('\n' + '='.repeat(50))
console.log('轉換完成！')
console.log('='.repeat(50))
console.log(`✅ 成功轉換: ${drops.length} 筆記錄`)
console.log(`⏭️  過濾跳過: ${skippedCount} 筆記錄`)
console.log(`❌ 解析錯誤: ${errorCount} 筆記錄`)
console.log('='.repeat(50))

// 統計怪物和物品數量
const uniqueMobs = new Set(drops.map(d => d.mobId))
const uniqueItems = new Set(drops.map(d => d.itemId))
console.log(`\n📊 資料統計：`)
console.log(`   獨特怪物: ${uniqueMobs.size} 個`)
console.log(`   獨特物品: ${uniqueItems.size} 個`)
console.log(`   平均每怪物掉落: ${(drops.length / uniqueMobs.size).toFixed(2)} 種物品`)

// 顯示機率範圍
const chances = drops.map(d => d.chance).filter(c => c > 0)
const minChance = Math.min(...chances)
const maxChance = Math.max(...chances)
console.log(`   機率範圍: ${minChance.toFixed(6)} ~ ${maxChance.toFixed(6)}`)

console.log(`\n✓ 檔案已儲存至: ${outputPath}`)

// 顯示前 5 筆資料作為範例
console.log(`\n📝 前 5 筆資料範例：`)
drops.slice(0, 5).forEach((drop, idx) => {
  console.log(`${idx + 1}. [${drop.mobId}] ${drop.mobName} → [${drop.itemId}] ${drop.itemName} (機率: ${(drop.chance * 100).toFixed(2)}%)`)
})

// 檢查"嫩寶"的資料
const snailDrops = drops.filter(d => d.mobName === '嫩寶')
console.log(`\n🐌 "嫩寶" 掉落物: ${snailDrops.length} 種`)
if (snailDrops.length > 0) {
  snailDrops.forEach((drop, idx) => {
    console.log(`   ${idx + 1}. [${drop.itemId}] ${drop.itemName}`)
  })
}

/**
 * 正確解析 CSV 內容（處理引號內的換行符和逗號）
 *
 * RFC 4180 標準：
 * - 欄位可以用雙引號包圍
 * - 引號內可以包含逗號和換行符
 * - 引號內的雙引號需要用兩個連續的雙引號表示（""）
 * - 只有引號外的換行符才是記錄分隔符
 */
function parseCSV(content) {
  const records = []
  let currentRecord = []
  let currentField = ''
  let insideQuotes = false

  for (let i = 0; i < content.length; i++) {
    const char = content[i]
    const nextChar = content[i + 1]

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        // 兩個連續的雙引號 = 一個雙引號字符
        currentField += '"'
        i++ // 跳過下一個引號
      } else {
        // 切換引號狀態
        insideQuotes = !insideQuotes
      }
    } else if (char === ',' && !insideQuotes) {
      // 欄位分隔符（只在引號外有效）
      currentRecord.push(currentField.trim())
      currentField = ''
    } else if (char === '\n' && !insideQuotes) {
      // 記錄分隔符（只在引號外有效）
      currentRecord.push(currentField.trim())

      // 只有非空記錄才加入
      if (currentRecord.length > 0 && (currentRecord.length > 1 || currentRecord[0])) {
        records.push(currentRecord)
      }

      currentRecord = []
      currentField = ''
    } else if (char === '\r') {
      // 跳過 \r（處理 Windows 的 \r\n）
      continue
    } else {
      // 普通字符
      currentField += char
    }
  }

  // 處理最後一個欄位和記錄
  if (currentField || currentRecord.length > 0) {
    currentRecord.push(currentField.trim())
    if (currentRecord.length > 0 && (currentRecord.length > 1 || currentRecord[0])) {
      records.push(currentRecord)
    }
  }

  return records
}
