/**
 * Drop Table CSV 轉 JSON 轉換腳本
 *
 * 功能：
 * 1. 解析 public-drop-table.csv
 * 2. 整合中文名稱（從 mob-info.json 和 items-organized/）
 * 3. 產生結構化 JSON 檔案
 */

const fs = require('fs')
const path = require('path')

// 路徑設定
const DATA_DIR = path.join(__dirname, '..', 'data')
const OUTPUT_DIR = __dirname
const CSV_FILE = path.join(OUTPUT_DIR, 'public-drop-table.csv')

// ============================================
// Step 1: 建立中文名稱對照表
// ============================================

function buildMobChineseNameMap() {
  const mobInfoPath = path.join(DATA_DIR, 'mob-info.json')
  const mobInfo = JSON.parse(fs.readFileSync(mobInfoPath, 'utf-8'))

  const map = new Map()
  for (const entry of mobInfo) {
    const mobId = parseInt(entry.mob.mob_id, 10)
    const chineseName = entry.chineseMobName || null
    map.set(mobId, chineseName)
  }

  console.log(`✓ 載入 ${map.size} 個怪物中文名稱`)
  return map
}

function buildItemChineseNameMap() {
  const itemsOrgDir = path.join(DATA_DIR, 'items-organized')
  const map = new Map()

  // 遍歷所有子目錄
  const categories = ['consumable', 'equipment', 'etc', 'setup', 'cash']

  for (const category of categories) {
    const categoryDir = path.join(itemsOrgDir, category)
    if (!fs.existsSync(categoryDir)) continue

    const files = fs.readdirSync(categoryDir).filter(f => f.endsWith('.json'))

    for (const file of files) {
      try {
        const filePath = path.join(categoryDir, file)
        const item = JSON.parse(fs.readFileSync(filePath, 'utf-8'))

        const itemId = item.id || parseInt(file.replace('.json', ''), 10)
        const chineseName = item.description?.chineseName || null

        if (itemId && chineseName) {
          map.set(itemId, chineseName)
        }
      } catch (e) {
        // 忽略解析錯誤
      }
    }
  }

  // 補充：從 drops-essential.json 取得更多中文名稱
  const dropsEssentialPath = path.join(DATA_DIR, 'drops-essential.json')
  if (fs.existsSync(dropsEssentialPath)) {
    const dropsEssential = JSON.parse(fs.readFileSync(dropsEssentialPath, 'utf-8'))
    for (const drop of dropsEssential) {
      if (drop.itemId && drop.chineseItemName && !map.has(drop.itemId)) {
        map.set(drop.itemId, drop.chineseItemName)
      }
    }
  }

  // 特殊處理：Meso
  map.set(0, '楓幣')

  console.log(`✓ 載入 ${map.size} 個物品中文名稱`)
  return map
}

// ============================================
// Step 2: 解析 CSV
// ============================================

function parseCSV(csvContent) {
  const lines = csvContent.split('\n')
  const headers = lines[0].split(',').map(h => h.trim())

  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const values = line.split(',')
    const row = {}
    headers.forEach((header, index) => {
      row[header] = values[index]?.trim() || ''
    })
    rows.push(row)
  }

  return rows
}

function parseBoolean(value) {
  if (value === 'TRUE') return true
  if (value === 'FALSE') return false
  return null
}

// ============================================
// Step 3: 轉換為 JSON 結構
// ============================================

function convertToDrops(rows, mobNameMap, itemNameMap) {
  const drops = []
  const missingMobNames = new Set()
  const missingItemNames = new Set()

  for (const row of rows) {
    const mobId = parseInt(row.DropperID, 10)
    const itemId = parseInt(row.ItemID, 10)

    // 取得中文名稱
    let chineseMobName = mobNameMap.get(mobId) || null
    let chineseItemName = itemNameMap.get(itemId) || null

    // 記錄缺失的中文名稱
    if (!chineseMobName && mobId) {
      missingMobNames.add(JSON.stringify({ id: mobId, name: row.MobName }))
    }
    if (!chineseItemName && itemId !== 0) {
      missingItemNames.add(JSON.stringify({ id: itemId, name: row.ItemName }))
    }

    const drop = {
      mobId,
      mobName: row.MobName,
      chineseMobName,
      isBoss: parseBoolean(row.isBoss),
      itemId,
      itemName: row.ItemName,
      chineseItemName,
      serverItemName: row.ServerItemName,
      chance: parseInt(row.Chance, 10) / 1000000,
      minQty: parseInt(row.MinQTY, 10),
      maxQty: parseInt(row.MaxQTY, 10),
      avgQty: parseFloat(row.AvgQty),
      inGame: row.InGame === 'TRUE',
      enabled: row.Enable === 'TRUE',
      questId: parseInt(row.QuestID, 10) || null
    }

    drops.push(drop)
  }

  return {
    drops,
    missingMobNames: [...missingMobNames].map(s => JSON.parse(s)),
    missingItemNames: [...missingItemNames].map(s => JSON.parse(s))
  }
}

// ============================================
// Step 4: 建立雙向索引
// ============================================

function buildIndex(drops) {
  const itemToMobs = {}
  const mobToItems = {}
  const items = {}
  const mobs = {}

  for (const drop of drops) {
    const mobKey = String(drop.mobId)
    const itemKey = String(drop.itemId)

    // itemToMobs
    if (!itemToMobs[itemKey]) itemToMobs[itemKey] = []
    if (!itemToMobs[itemKey].includes(drop.mobId)) {
      itemToMobs[itemKey].push(drop.mobId)
    }

    // mobToItems
    if (!mobToItems[mobKey]) mobToItems[mobKey] = []
    if (!mobToItems[mobKey].includes(drop.itemId)) {
      mobToItems[mobKey].push(drop.itemId)
    }

    // items index
    if (!items[itemKey]) {
      items[itemKey] = {
        name: drop.itemName,
        chineseName: drop.chineseItemName,
        serverName: drop.serverItemName
      }
    }

    // mobs index
    if (!mobs[mobKey]) {
      mobs[mobKey] = {
        name: drop.mobName,
        chineseName: drop.chineseMobName,
        isBoss: drop.isBoss
      }
    }
  }

  return {
    itemToMobs,
    mobToItems,
    items,
    mobs,
    metadata: {
      totalDrops: drops.length,
      totalMobs: Object.keys(mobs).length,
      totalItems: Object.keys(items).length,
      inGameDrops: drops.filter(d => d.inGame).length,
      enabledDrops: drops.filter(d => d.enabled).length,
      generatedAt: new Date().toISOString(),
      sourceFile: 'public-drop-table.csv'
    }
  }
}

// ============================================
// 主程式
// ============================================

async function main() {
  console.log('=== Drop Table CSV 轉 JSON ===\n')

  // Step 1: 建立中文對照表
  console.log('Step 1: 建立中文名稱對照表...')
  const mobNameMap = buildMobChineseNameMap()
  const itemNameMap = buildItemChineseNameMap()

  // Step 2: 解析 CSV
  console.log('\nStep 2: 解析 CSV...')
  const csvContent = fs.readFileSync(CSV_FILE, 'utf-8')
  const rows = parseCSV(csvContent)
  console.log(`✓ 解析 ${rows.length} 筆資料`)

  // Step 3: 轉換為 JSON
  console.log('\nStep 3: 轉換為 JSON 結構...')
  const { drops, missingMobNames, missingItemNames } = convertToDrops(rows, mobNameMap, itemNameMap)

  // 過濾遊戲內有效資料
  const inGameDrops = drops.filter(d => d.inGame && d.enabled)
  console.log(`✓ 總資料: ${drops.length} 筆`)
  console.log(`✓ 遊戲內有效: ${inGameDrops.length} 筆`)

  // Step 4: 建立索引
  console.log('\nStep 4: 建立雙向索引...')
  const fullIndex = buildIndex(drops)
  const inGameIndex = buildIndex(inGameDrops)

  // Step 5: 輸出檔案
  console.log('\nStep 5: 輸出檔案...')

  // 完整資料
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'drops-chronostory-full.json'),
    JSON.stringify(drops, null, 2)
  )
  console.log(`✓ drops-chronostory-full.json (${drops.length} 筆)`)

  // 遊戲內有效資料
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'drops-chronostory.json'),
    JSON.stringify(inGameDrops, null, 2)
  )
  console.log(`✓ drops-chronostory.json (${inGameDrops.length} 筆)`)

  // 雙向索引
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'drops-chronostory-index.json'),
    JSON.stringify(inGameIndex, null, 2)
  )
  console.log(`✓ drops-chronostory-index.json`)

  // 缺失中文名稱
  if (missingMobNames.length > 0 || missingItemNames.length > 0) {
    const missing = {
      mobs: missingMobNames,
      items: missingItemNames,
      summary: {
        missingMobCount: missingMobNames.length,
        missingItemCount: missingItemNames.length
      }
    }
    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'missing-chinese-names.json'),
      JSON.stringify(missing, null, 2)
    )
    console.log(`\n⚠ 缺失中文名稱:`)
    console.log(`  - 怪物: ${missingMobNames.length} 個`)
    console.log(`  - 物品: ${missingItemNames.length} 個`)
    console.log(`  → 已輸出到 missing-chinese-names.json`)
  }

  // 統計
  console.log('\n=== 完成 ===')
  console.log(`怪物數: ${fullIndex.metadata.totalMobs}`)
  console.log(`物品數: ${fullIndex.metadata.totalItems}`)
  console.log(`總掉落: ${fullIndex.metadata.totalDrops}`)
  console.log(`有效掉落: ${inGameIndex.metadata.inGameDrops}`)
}

main().catch(console.error)
