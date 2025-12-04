/**
 * 掉落資料同步腳本
 * 從 ChronoStory 官方 Google Sheets 下載 CSV 並更新 drops-essential.json
 */

const https = require('https')
const fs = require('fs')
const path = require('path')

// Google Sheets CSV 下載 URL
const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRpKuZGJQIFFxSi6kzYx4ALI0MQborpLEkh3J1qIGSd0Bw7U4NYg5CK-3ESzyK580z4D8NO59SUeC3k/pub?output=csv&gid=1888753114'

// 輸出路徑
const OUTPUT_PATH = path.join(__dirname, '../data/drops-essential.json')
const DETAILED_DIR = path.join(__dirname, '../data/drops-detailed')

/**
 * 下載 CSV 資料
 */
function downloadCSV(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      // 處理重定向 (301, 302, 307, 308)
      if ([301, 302, 307, 308].includes(response.statusCode)) {
        return downloadCSV(response.headers.location).then(resolve).catch(reject)
      }

      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`))
        return
      }

      let data = ''
      response.on('data', chunk => data += chunk)
      response.on('end', () => resolve(data))
      response.on('error', reject)
    }).on('error', reject)
  })
}

/**
 * 正確解析 CSV 內容（處理引號內的換行符和逗號）
 * 參考 convert-drops-csv-to-json.js 的 parseCSV 函數
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

/**
 * 載入現有的中文名稱映射
 */
function loadExistingChineseNames() {
  try {
    const existingData = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf8'))
    const mobNameMap = new Map()
    const itemNameMap = new Map()

    for (const drop of existingData) {
      if (drop.chineseMobName) {
        mobNameMap.set(drop.mobId, drop.chineseMobName)
      }
      if (drop.chineseItemName) {
        itemNameMap.set(drop.itemId, drop.chineseItemName)
      }
    }

    return { mobNameMap, itemNameMap }
  } catch (error) {
    console.warn('無法載入現有資料，將使用空的中文名稱映射')
    return { mobNameMap: new Map(), itemNameMap: new Map() }
  }
}

/**
 * 主程式
 */
async function main() {
  console.log('開始同步掉落資料...\n')

  // 1. 下載 CSV
  console.log('下載 CSV 資料...')
  const csvContent = await downloadCSV(CSV_URL)
  console.log(`下載完成，資料大小: ${(csvContent.length / 1024).toFixed(2)} KB\n`)

  // 2. 解析 CSV
  const records = parseCSV(csvContent)
  console.log(`找到 ${records.length} 筆記錄（包含標題行）`)

  // 3. 解析標題行，動態對應欄位索引
  const headers = records[0]
  console.log(`欄位: ${headers.join(', ')}\n`)

  // 欄位索引映射
  const colIndex = {
    inGame: headers.indexOf('InGame'),
    dropperID: headers.indexOf('DropperID'),
    mobName: headers.indexOf('MobName'),
    enable: headers.indexOf('Enable'),
    itemID: headers.indexOf('ItemID'),
    serverItemName: headers.indexOf('ServerItemName'),
    chance: headers.indexOf('Chance'),
    minQTY: headers.indexOf('MinQTY'),
    maxQTY: headers.indexOf('MaxQTY'),
  }

  // 驗證必要欄位存在
  for (const [name, idx] of Object.entries(colIndex)) {
    if (idx === -1) {
      throw new Error(`找不到必要欄位: ${name}`)
    }
  }

  // 4. 載入現有的中文名稱
  const { mobNameMap, itemNameMap } = loadExistingChineseNames()
  console.log(`載入了 ${mobNameMap.size} 個怪物中文名稱和 ${itemNameMap.size} 個物品中文名稱\n`)

  // 5. 轉換資料
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
      const inGame = values[colIndex.inGame]
      const enable = values[colIndex.enable]

      // 過濾：只保留 InGame=TRUE 且 Enable=TRUE 的記錄
      if (inGame?.toUpperCase() !== 'TRUE' || enable?.toUpperCase() !== 'TRUE') {
        skippedCount++
        continue
      }

      const mobId = parseInt(values[colIndex.dropperID])
      const itemId = parseInt(values[colIndex.itemID])

      // 轉換機率（除以 1,000,000）
      const chanceRaw = values[colIndex.chance]?.replace(/,/g, '') || '0'
      const chance = parseFloat(chanceRaw) / 1000000

      // 建立 drop 物件
      const drop = {
        mobId,
        mobName: values[colIndex.mobName] || '',
        chineseMobName: mobNameMap.get(mobId) || null,
        itemId,
        itemName: values[colIndex.serverItemName] || '',
        chineseItemName: itemNameMap.get(itemId) || null,
        chance,
        minQty: parseInt(values[colIndex.minQTY]) || 1,
        maxQty: parseInt(values[colIndex.maxQTY]) || 1,
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

  // 6. 排序（依 mobId, itemId）
  drops.sort((a, b) => {
    if (a.mobId !== b.mobId) return a.mobId - b.mobId
    return a.itemId - b.itemId
  })

  // 7. 寫入 drops-essential.json
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(drops, null, 2), 'utf8')

  // 8. 生成 drops-detailed 檔案
  console.log('\n生成 drops-detailed 檔案...')

  // 確保目錄存在
  if (!fs.existsSync(DETAILED_DIR)) {
    fs.mkdirSync(DETAILED_DIR, { recursive: true })
  }

  // 取得現有的 detailed 檔案列表
  const existingFiles = new Set(
    fs.readdirSync(DETAILED_DIR)
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''))
  )

  // 按 mobId 分組
  const dropsByMob = {}
  for (const drop of drops) {
    if (!dropsByMob[drop.mobId]) {
      dropsByMob[drop.mobId] = []
    }
    dropsByMob[drop.mobId].push(drop)
  }

  // 寫入每個怪物的 detailed 檔案
  const newMobIds = new Set()
  for (const [mobId, mobDrops] of Object.entries(dropsByMob)) {
    const filePath = path.join(DETAILED_DIR, `${mobId}.json`)
    fs.writeFileSync(filePath, JSON.stringify(mobDrops, null, 2), 'utf8')
    newMobIds.add(mobId)
  }

  // 刪除不再需要的舊檔案
  let deletedCount = 0
  for (const oldMobId of existingFiles) {
    if (!newMobIds.has(oldMobId)) {
      fs.unlinkSync(path.join(DETAILED_DIR, `${oldMobId}.json`))
      deletedCount++
    }
  }

  console.log(`  生成: ${newMobIds.size} 個怪物的 detailed 檔案`)
  if (deletedCount > 0) {
    console.log(`  刪除: ${deletedCount} 個過時的檔案`)
  }

  // 9. 統計資訊
  console.log('='.repeat(50))
  console.log('同步完成！')
  console.log('='.repeat(50))
  console.log(`成功轉換: ${drops.length} 筆記錄`)
  console.log(`過濾跳過: ${skippedCount} 筆記錄`)
  console.log(`解析錯誤: ${errorCount} 筆記錄`)
  console.log('='.repeat(50))

  // 統計怪物和物品數量
  const uniqueMobs = new Set(drops.map(d => d.mobId))
  const uniqueItems = new Set(drops.map(d => d.itemId))
  console.log(`\n資料統計：`)
  console.log(`  獨特怪物: ${uniqueMobs.size} 個`)
  console.log(`  獨特物品: ${uniqueItems.size} 個`)
  console.log(`  平均每怪物掉落: ${(drops.length / uniqueMobs.size).toFixed(2)} 種物品`)

  // 顯示機率範圍
  const chances = drops.map(d => d.chance).filter(c => c > 0)
  if (chances.length > 0) {
    const minChance = Math.min(...chances)
    const maxChance = Math.max(...chances)
    console.log(`  機率範圍: ${(minChance * 100).toFixed(6)}% ~ ${(maxChance * 100).toFixed(2)}%`)
  }

  console.log(`\n檔案已儲存至: ${OUTPUT_PATH}`)
}

main().catch(error => {
  console.error('錯誤:', error)
  process.exit(1)
})
