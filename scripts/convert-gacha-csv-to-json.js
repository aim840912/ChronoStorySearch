/**
 * 轉蛋機 CSV 轉 JSON 腳本
 *
 * 使用方式:
 * node scripts/convert-gacha-csv-to-json.js <csv檔案路徑> <機器ID> <機器名稱>
 *
 * 範例:
 * node scripts/convert-gacha-csv-to-json.js "/path/to/csv" 1 "維多利亞港轉蛋機"
 */

const fs = require('fs')
const path = require('path')

/**
 * 解析裝備屬性文字
 * @param {string} equipStatsText - 多行裝備屬性文字
 * @returns {Array} 裝備屬性陣列和卷軸槽數
 */
function parseEquipStats(equipStatsText) {
  if (!equipStatsText || equipStatsText.trim() === '') {
    return { equipStats: [], scrollSlots: 0 }
  }

  const lines = equipStatsText.split('\n').map(line => line.trim()).filter(line => line)
  const equipStats = []
  let scrollSlots = 0

  for (const line of lines) {
    // 提取可使用卷軸數量
    const scrollMatch = line.match(/可使用卷軸[:：](\d+)/)
    if (scrollMatch) {
      scrollSlots = parseInt(scrollMatch[1], 10)
      continue
    }

    // 提取屬性（格式: "屬性名:+數值(+範圍~+範圍)"）
    const statMatch = line.match(/^([^:：]+)[:：](.+)$/)
    if (statMatch) {
      equipStats.push({
        stat: statMatch[1].trim(),
        value: statMatch[2].trim()
      })
    }
  }

  return { equipStats, scrollSlots }
}

/**
 * 解析物品名稱（分離中英文）
 * @param {string} serverItemName - 格式: "中文名稱(English Name)"
 * @returns {Object} { chineseName, itemName }
 */
function parseItemName(serverItemName) {
  const match = serverItemName.match(/^(.+)\((.+)\)$/)
  if (match) {
    return {
      chineseName: match[1].trim(),
      itemName: match[2].trim() // 英文名稱
    }
  }

  // 如果沒有英文名稱，就都使用中文
  return {
    chineseName: serverItemName,
    itemName: serverItemName
  }
}

/**
 * 解析 CSV 檔案
 * @param {string} csvFilePath - CSV 檔案路徑
 * @returns {Array} 解析後的物品陣列
 */
function parseCSV(csvFilePath) {
  const content = fs.readFileSync(csvFilePath, 'utf-8')
  const lines = content.split('\n')

  // 跳過標題列
  const dataLines = lines.slice(1).filter(line => line.trim())

  const items = []

  for (const line of dataLines) {
    // 解析 CSV 列（注意：EquipStatsWithRange 欄位包含換行符號）
    const columns = parseCSVLine(line)

    if (columns.length < 5) continue // 至少需要 5 個欄位

    // 解析物品名稱（第 4 欄）
    const { chineseName, itemName } = parseItemName(columns[3])

    // 檢查是簡化格式（5 欄位）還是完整格式（9 欄位）
    if (columns.length === 5) {
      // 簡化格式：InGame, Chance, ItemID, ServerItemName, Percent
      const [inGame, chance, itemId, _serverItemName, percent] = columns

      items.push({
        itemId: parseInt(itemId, 10),
        itemName, // 英文名稱
        chineseName, // 中文名稱
        probability: percent,
        chance: parseInt(chance, 10),
        inGame: inGame === 'TRUE',
        applicableJobs: '',
        requiredLevel: 0,
        requiredStats: '',
        equipStats: [],
        scrollSlots: 0
      })
    } else if (columns.length >= 9) {
      // 完整格式：InGame, Chance, ItemID, ServerItemName, Percent, ApplicableJobs, RequiredLevel, RequiredStats, EquipStatsWithRange
      const [inGame, chance, itemId, _serverItemName, percent, applicableJobs, requiredLevel, requiredStats, equipStatsText] = columns

      // 解析裝備屬性
      const { equipStats, scrollSlots } = parseEquipStats(equipStatsText)

      items.push({
        itemId: parseInt(itemId, 10),
        itemName, // 英文名稱
        chineseName, // 中文名稱
        probability: percent,
        chance: parseInt(chance, 10),
        inGame: inGame === 'TRUE',
        applicableJobs,
        requiredLevel: parseInt(requiredLevel, 10) || 0,
        requiredStats: requiredStats || '',
        equipStats,
        scrollSlots
      })
    }
  }

  return items
}

/**
 * 解析 CSV 行（處理引號內的逗號和換行）
 * @param {string} line - CSV 行
 * @returns {Array} 欄位陣列
 */
function parseCSVLine(line) {
  const columns = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      columns.push(current)
      current = ''
    } else {
      current += char
    }
  }

  // 加入最後一個欄位
  columns.push(current)

  return columns
}

/**
 * 主函數
 */
function main() {
  const args = process.argv.slice(2)

  if (args.length < 3) {
    console.error('使用方式: node convert-gacha-csv-to-json.js <csv檔案路徑> <機器ID> <機器名稱>')
    console.error('範例: node convert-gacha-csv-to-json.js "/path/to/csv" 1 "維多利亞港轉蛋機"')
    process.exit(1)
  }

  const [csvFilePath, machineId, machineName] = args

  console.log(`🔄 開始轉換 CSV 檔案: ${csvFilePath}`)
  console.log(`📦 轉蛋機 ID: ${machineId}`)
  console.log(`🏷️  轉蛋機名稱: ${machineName}`)

  // 檢查檔案是否存在
  if (!fs.existsSync(csvFilePath)) {
    console.error(`❌ 錯誤: 找不到 CSV 檔案 ${csvFilePath}`)
    process.exit(1)
  }

  // 解析 CSV
  const items = parseCSV(csvFilePath)
  console.log(`✅ 成功解析 ${items.length} 件物品`)

  // 建立轉蛋機物件
  const gachaMachine = {
    machineId: parseInt(machineId, 10),
    machineName,
    description: `${machineName}，可獲得各種裝備道具`,
    totalItems: items.length,
    items
  }

  // 確保輸出目錄存在
  const outputDir = path.join(__dirname, '..', 'public', 'data', 'gacha')
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
    console.log(`📁 建立目錄: ${outputDir}`)
  }

  // 生成檔案名稱（使用機器ID）
  const outputFileName = `machine-${machineId}.json`
  const outputPath = path.join(outputDir, outputFileName)

  // 寫入 JSON 檔案
  fs.writeFileSync(outputPath, JSON.stringify(gachaMachine, null, 2), 'utf-8')

  console.log(`✅ JSON 檔案已生成: ${outputPath}`)
  console.log(`📊 檔案大小: ${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB`)

  // 顯示前 3 件物品作為範例
  console.log('\n📋 前 3 件物品範例:')
  items.slice(0, 3).forEach((item, index) => {
    console.log(`\n${index + 1}. ${item.chineseName} (${item.itemName})`)
    console.log(`   機率: ${item.probability}`)
    console.log(`   等級需求: ${item.requiredLevel}`)
    console.log(`   屬性數量: ${item.equipStats.length}`)
  })
}

// 執行主函數
main()
