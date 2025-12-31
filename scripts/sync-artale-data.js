/**
 * Artale 資料同步腳本
 *
 * 從 GitHub Pages 下載 Artale 遊戲資料並轉換成與 chronostoryData 相容的格式
 *
 * 使用方式：
 *   node scripts/sync-artale-data.js
 *
 * 輸入來源：
 *   - https://a2983456456.github.io/artale-drop/drop_data.json
 *   - https://a2983456456.github.io/artale-drop/mob.json
 *   - https://a2983456456.github.io/artale-drop/item.json
 *
 * 輸出檔案：
 *   - artaleData/monster-index.json
 *   - artaleData/item-index.json
 *   - artaleData/drop-relations.json
 *   - artaleData/mob-info.json
 */

const fs = require('fs')
const path = require('path')

const ARTALE_BASE_URL = 'https://a2983456456.github.io/artale-drop'
const OUTPUT_DIR = path.join(__dirname, '..', 'artaleData')

/**
 * 從 URL 獲取 JSON 資料
 */
async function fetchJson(url) {
  console.log(`📥 Fetching: ${url}`)
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`)
  }
  return response.json()
}

/**
 * 將 Artale 原始資料轉換成 chronostoryData 相容格式
 */
function convertData(dropData, mobData, itemData) {
  console.log('\n🔄 Converting data to chronostoryData format...')

  // 1. 建立怪物索引 (monster-index.json)
  const monsters = Object.entries(mobData).map(([name, stats]) => ({
    mobId: name,  // Artale 使用名稱作為 ID
    mobName: name,
    chineseMobName: name,
    isBoss: false,  // Artale 資料中沒有 Boss 標記
    dropCount: dropData[name]?.length || 0,
    inGame: true,
    // 額外資訊
    level: stats[0],
    tag: stats[9] || '',
  }))

  const monsterIndex = {
    totalMonsters: monsters.length,
    lastUpdated: new Date().toISOString(),
    monsters,
  }

  // 2. 建立物品索引 (item-index.json)
  // 從 drop_data 收集所有不重複的物品名稱
  const itemSet = new Set()
  Object.values(dropData).forEach(items => {
    items.forEach(item => itemSet.add(item))
  })

  const items = Array.from(itemSet).map(name => {
    // 嘗試從 itemData 找到對應的 ID
    const itemId = Object.entries(itemData).find(([, n]) => n === name)?.[0] || name
    return {
      itemId,
      itemName: name,
      chineseItemName: name,
      monsterCount: Object.entries(dropData).filter(([, items]) =>
        items.includes(name)
      ).length,
    }
  })

  const itemIndex = {
    totalItems: items.length,
    lastUpdated: new Date().toISOString(),
    items,
  }

  // 3. 建立掉落關係 (drop-relations.json)
  const mobToItems = {}
  Object.entries(dropData).forEach(([mobName, itemNames]) => {
    mobToItems[mobName] = itemNames
  })

  const dropRelations = {
    lastUpdated: new Date().toISOString(),
    mobToItems,
  }

  // 4. 建立怪物詳細資訊 (mob-info.json)
  const mobInfo = Object.entries(mobData).map(([name, stats]) => ({
    mob: {
      id: name,
      name: name,
      chineseName: name,
      level: stats[0],
      hp: stats[1],
      atk: stats[2],
      def: stats[3],
      matk: stats[4],
      mdef: stats[5],
      exp: stats[7],
      imageId: stats[8],
      tag: stats[9],
      InGame: true,
    },
  }))

  return {
    monsterIndex,
    itemIndex,
    dropRelations,
    mobInfo,
  }
}

/**
 * 寫入 JSON 檔案
 */
function writeJson(filename, data) {
  const filepath = path.join(OUTPUT_DIR, filename)
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8')
  console.log(`✅ Written: ${filepath}`)
}

/**
 * 主程式
 */
async function main() {
  console.log('🚀 Artale Data Sync Script')
  console.log('=' .repeat(50))

  try {
    // 確保輸出目錄存在
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true })
    }

    // 1. 下載原始資料
    console.log('\n📦 Downloading Artale data from GitHub Pages...')
    const [dropData, mobData, itemData] = await Promise.all([
      fetchJson(`${ARTALE_BASE_URL}/drop_data.json`),
      fetchJson(`${ARTALE_BASE_URL}/mob.json`),
      fetchJson(`${ARTALE_BASE_URL}/item.json`),
    ])

    console.log(`\n📊 Raw data statistics:`)
    console.log(`   - Monsters: ${Object.keys(mobData).length}`)
    console.log(`   - Items: ${Object.keys(itemData).length}`)
    console.log(`   - Drop relations: ${Object.keys(dropData).length}`)

    // 2. 轉換資料格式
    const { monsterIndex, itemIndex, dropRelations, mobInfo } = convertData(
      dropData,
      mobData,
      itemData
    )

    // 3. 寫入檔案
    console.log('\n💾 Writing output files...')
    writeJson('monster-index.json', monsterIndex)
    writeJson('item-index.json', itemIndex)
    writeJson('drop-relations.json', dropRelations)
    writeJson('mob-info.json', mobInfo)

    console.log('\n✨ Artale data sync completed!')
    console.log(`   - Output directory: ${OUTPUT_DIR}`)
    console.log(`   - Total monsters: ${monsterIndex.totalMonsters}`)
    console.log(`   - Total items: ${itemIndex.totalItems}`)

  } catch (error) {
    console.error('\n❌ Error:', error.message)
    process.exit(1)
  }
}

main()
