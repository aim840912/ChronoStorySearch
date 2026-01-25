/**
 * 同步 Unwelcome Guest 系列資料：從 CSV 更新到 JSON
 *
 * 功能：
 * 1. 讀取 CSV 權威資料來源
 * 2. 比對現有 JSON 檔案
 * 3. 輸出差異報告
 * 4. 可選：自動更新 JSON 檔案
 *
 * 使用方式:
 *   node scripts/sync-unwelcome-guest-from-csv.js           # 僅輸出報告
 *   node scripts/sync-unwelcome-guest-from-csv.js --apply   # 實際更新 JSON
 */

const fs = require('fs')
const path = require('path')

const CSV_FILE = path.join(__dirname, '../chronostoryData/csv-data/unwelcome-guest-weapons.csv')
const EQUIPMENT_DIR = path.join(__dirname, '../chronostoryData/items-organized/equipment')

/**
 * 解析 CSV 檔案（簡易解析器，適用於此格式）
 */
function parseCSV(content) {
  const lines = content.split('\n').filter((line) => line.trim())
  const headers = lines[0].split(',').map((h) => h.trim())
  const rows = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map((v) => v.trim())
    const row = {}
    headers.forEach((header, idx) => {
      row[header] = values[idx] || ''
    })
    rows.push(row)
  }

  return rows
}

/**
 * 計算職業位掩碼（reqJob）
 *
 * 職業位掩碼對應：
 *   Warrior  = 1  (0b000001)
 *   Magician = 2  (0b000010)
 *   Bowman   = 4  (0b000100)
 *   Thief    = 8  (0b001000)
 *   Pirate   = 16 (0b010000)
 *
 * Beginner 不計入位掩碼（初心者可用由 reqLevel <= 10 決定）
 * 全職業時返回 0
 */
function calculateReqJob(csvRow) {
  const warrior = csvRow['Warrior'] === 'TRUE'
  const magician = csvRow['Magician'] === 'TRUE'
  const bowman = csvRow['Bowman'] === 'TRUE'
  const thief = csvRow['Thief'] === 'TRUE'
  const pirate = csvRow['Pirate'] === 'TRUE'

  // 檢查是否全職業（包含 Beginner 且所有職業都為 TRUE）
  const beginner = csvRow['Beginner'] === 'TRUE'
  if (beginner && warrior && magician && bowman && thief && pirate) {
    return 0 // 全職業
  }

  // 計算位掩碼
  let mask = 0
  if (warrior) mask |= 1
  if (magician) mask |= 2
  if (bowman) mask |= 4
  if (thief) mask |= 8
  if (pirate) mask |= 16

  return mask
}

/**
 * 從 CSV 行轉換為預期的 metaInfo 欄位
 */
function csvToMetaInfo(csvRow) {
  const attackSpeed = csvRow['AttackSpeed'] ? parseInt(csvRow['AttackSpeed'], 10) : null
  const reqJob = calculateReqJob(csvRow)

  return {
    attackSpeed,
    reqJob,
    incSTR: csvRow['STR'] ? parseInt(csvRow['STR'], 10) : 0,
    incDEX: csvRow['DEX'] ? parseInt(csvRow['DEX'], 10) : 0,
    incINT: csvRow['INT'] ? parseInt(csvRow['INT'], 10) : 0,
    incLUK: csvRow['LUK'] ? parseInt(csvRow['LUK'], 10) : 0,
    incPAD: csvRow['WATK'] ? parseInt(csvRow['WATK'], 10) : 0,
    incMAD: csvRow['MATK'] ? parseInt(csvRow['MATK'], 10) : 0,
    incACC: csvRow['ACCURACY'] ? parseInt(csvRow['ACCURACY'], 10) : 0,
    incEVA: csvRow['AVOIDABILITY'] ? parseInt(csvRow['AVOIDABILITY'], 10) : 0,
    incSpeed: csvRow['SPEED'] ? parseInt(csvRow['SPEED'], 10) : 0,
    incJump: csvRow['JUMP'] ? parseInt(csvRow['JUMP'], 10) : 0,
    incMHP: csvRow['HP'] ? parseInt(csvRow['HP'], 10) : 0,
    incMMP: csvRow['MP'] ? parseInt(csvRow['MP'], 10) : 0,
    incPDD: csvRow['WDEF'] ? parseInt(csvRow['WDEF'], 10) : 0,
    incMDD: csvRow['MDEF'] ? parseInt(csvRow['MDEF'], 10) : 0,
    tuc: csvRow['Upgrades'] ? parseInt(csvRow['Upgrades'], 10) : 0,
  }
}

/**
 * 建立物品名稱到檔案路徑的對應表
 */
function buildNameToFileMap() {
  const map = new Map()
  const files = fs.readdirSync(EQUIPMENT_DIR).filter((f) => f.endsWith('.json'))

  for (const file of files) {
    try {
      const filePath = path.join(EQUIPMENT_DIR, file)
      const content = fs.readFileSync(filePath, 'utf-8')
      const item = JSON.parse(content)
      const name = item.description?.name

      if (name && name.includes('Unwelcome Guest')) {
        map.set(name, { filePath, item, file })
      }
    } catch (err) {
      // 忽略解析錯誤
    }
  }

  return map
}

/**
 * 比較兩個值是否相等（處理 null/undefined/0 的情況）
 */
function valuesEqual(jsonValue, csvValue) {
  // null/undefined 在 JSON 中等同於不存在或 0
  const jv = jsonValue ?? 0
  const cv = csvValue ?? 0

  // attackSpeed 特殊處理：null 表示不適用（如配件）
  if (csvValue === null && jsonValue === undefined) {
    return true
  }

  return jv === cv
}

/**
 * 主函數
 */
function main() {
  const applyChanges = process.argv.includes('--apply')

  console.log('='.repeat(60))
  console.log('Unwelcome Guest 系列資料同步工具')
  console.log('='.repeat(60))
  console.log(`模式: ${applyChanges ? '🔧 更新模式' : '📋 報告模式'}`)
  console.log()

  // 讀取 CSV
  console.log('讀取 CSV...')
  const csvContent = fs.readFileSync(CSV_FILE, 'utf-8')
  const csvRows = parseCSV(csvContent)
  console.log(`  找到 ${csvRows.length} 個物品\n`)

  // 建立名稱對應表
  console.log('掃描 JSON 檔案...')
  const nameToFile = buildNameToFileMap()
  console.log(`  找到 ${nameToFile.size} 個 Unwelcome Guest JSON 檔案\n`)

  // 統計
  let matchedCount = 0
  let missingCount = 0
  let diffCount = 0
  let updatedCount = 0
  const diffs = []
  const missing = []

  // 比對每個 CSV 項目
  for (const csvRow of csvRows) {
    const itemName = csvRow['Item Name']
    if (!itemName) continue

    const fileInfo = nameToFile.get(itemName)
    if (!fileInfo) {
      missingCount++
      missing.push(itemName)
      continue
    }

    matchedCount++
    const { item, filePath, file } = fileInfo
    const expectedMeta = csvToMetaInfo(csvRow)
    const actualMeta = item.metaInfo || {}
    const itemDiffs = []

    // 比較每個欄位
    const fieldsToCheck = [
      'attackSpeed',
      'reqJob',
      'incSTR',
      'incDEX',
      'incINT',
      'incLUK',
      'incPAD',
      'incMAD',
      'incACC',
      'incEVA',
      'incSpeed',
      'incJump',
      'incMHP',
      'incMMP',
      'incPDD',
      'incMDD',
    ]

    for (const field of fieldsToCheck) {
      const expected = expectedMeta[field]
      const actual = actualMeta[field]

      // 跳過 attackSpeed 為 null 的情況（非武器物品如耳環）
      if (field === 'attackSpeed' && expected === null) {
        continue
      }

      if (!valuesEqual(actual, expected)) {
        itemDiffs.push({
          field,
          expected,
          actual: actual ?? 'undefined',
        })
      }
    }

    if (itemDiffs.length > 0) {
      diffCount++
      diffs.push({
        itemName,
        itemId: item.id,
        file,
        filePath,
        diffs: itemDiffs,
        expectedMeta,
        item,
      })
    }
  }

  // 輸出報告
  console.log('=' .repeat(60))
  console.log('比對結果摘要')
  console.log('='.repeat(60))
  console.log(`  CSV 物品數:    ${csvRows.length}`)
  console.log(`  JSON 檔案數:   ${nameToFile.size}`)
  console.log(`  成功匹配:      ${matchedCount}`)
  console.log(`  找不到 JSON:   ${missingCount}`)
  console.log(`  有差異的物品:  ${diffCount}`)
  console.log()

  // 顯示找不到的物品
  if (missing.length > 0) {
    console.log('❌ 找不到對應 JSON 的物品:')
    missing.forEach((name) => console.log(`   - ${name}`))
    console.log()
  }

  // 顯示差異詳情
  if (diffs.length > 0) {
    console.log('🔍 差異詳情:')
    console.log('-'.repeat(60))

    for (const diffItem of diffs) {
      console.log(`\n📦 ${diffItem.itemName} (ID: ${diffItem.itemId})`)
      console.log(`   檔案: ${diffItem.file}`)

      for (const d of diffItem.diffs) {
        console.log(`   ├─ ${d.field}:`)
        console.log(`   │    JSON:  ${d.actual}`)
        console.log(`   │    CSV:   ${d.expected}`)
      }
    }
    console.log()
  }

  // 如果是更新模式，實際更新檔案
  if (applyChanges && diffs.length > 0) {
    console.log('='.repeat(60))
    console.log('🔧 開始更新 JSON 檔案...')
    console.log('='.repeat(60))

    for (const diffItem of diffs) {
      const { item, filePath, expectedMeta, diffs: itemDiffs } = diffItem

      // 完整更新所有可同步的 metaInfo 欄位（使用 CSV 資料覆蓋）
      // 這樣可以修正錯誤的欄位對應問題
      const fieldsToSync = [
        'attackSpeed',
        'reqJob',
        'incSTR',
        'incDEX',
        'incINT',
        'incLUK',
        'incPAD',
        'incMAD',
        'incACC',
        'incEVA',
        'incSpeed',
        'incJump',
        'incMHP',
        'incMMP',
        'incPDD',
        'incMDD',
      ]

      for (const field of fieldsToSync) {
        const newValue = expectedMeta[field]

        // attackSpeed 為 null 表示非武器物品，跳過
        if (field === 'attackSpeed' && newValue === null) {
          continue
        }

        // 更新欄位（包含 0 值，這很重要，因為可以清除錯誤資料）
        if (newValue === 0) {
          // 如果 CSV 值為 0，刪除該欄位以保持 JSON 簡潔
          delete item.metaInfo[field]
        } else if (newValue !== null && newValue !== undefined) {
          item.metaInfo[field] = newValue
        }
      }

      // 寫回檔案
      fs.writeFileSync(filePath, JSON.stringify(item, null, 2) + '\n', 'utf-8')
      updatedCount++
      console.log(`  ✅ 已更新: ${diffItem.file}`)
    }

    console.log()
    console.log(`🎉 完成！已更新 ${updatedCount} 個檔案`)
  } else if (!applyChanges && diffs.length > 0) {
    console.log('💡 提示: 使用 --apply 參數來實際更新檔案')
    console.log('   node scripts/sync-unwelcome-guest-from-csv.js --apply')
  }

  console.log()
}

main()
