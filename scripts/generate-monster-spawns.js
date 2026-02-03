/**
 * 從地圖資料庫建立怪物出沒地點反向索引
 *
 * 輸入：chronostoryData/map-database/chronostory-map-database.json
 * 輸出：chronostoryData/map-database/monster-spawns.json
 *
 * 輸出格式：
 * {
 *   "Snail": [
 *     { "region": "Maple Island", "section": "Maple Road - Mushroom Town", "map": "Snail Hunting Ground I", "hidden": false },
 *     ...
 *   ],
 *   ...
 * }
 */

const fs = require('fs')
const path = require('path')

// 檔案路徑
const MAP_DATABASE_PATH = path.join(__dirname, '../chronostoryData/map-database/chronostory-map-database.json')
const OUTPUT_PATH = path.join(__dirname, '../chronostoryData/map-database/monster-spawns.json')

/**
 * 檢查地圖是否為隱藏地圖
 * 根據地圖名稱中的關鍵字判斷
 */
function isHiddenMap(mapName) {
  const hiddenKeywords = [
    'Hidden Street',
    'Hidden',
    'Secret',
    '隱藏'
  ]
  return hiddenKeywords.some(keyword =>
    mapName.toLowerCase().includes(keyword.toLowerCase())
  )
}

/**
 * 從地圖資料庫建立怪物出沒地點索引
 */
function generateMonsterSpawns() {
  console.log('Reading map database...')

  // 讀取地圖資料庫
  const mapDatabase = JSON.parse(fs.readFileSync(MAP_DATABASE_PATH, 'utf-8'))

  // 怪物出沒地點索引
  const monsterSpawns = {}

  // 統計資訊
  let totalMaps = 0
  let totalMonsterSpawns = 0

  // 遍歷所有區域
  for (const [regionKey, regionData] of Object.entries(mapDatabase.regions)) {
    const regionName = regionData.name

    // 遍歷所有區段
    for (const section of regionData.sections) {
      const sectionName = section.name

      // 遍歷所有地圖
      for (const map of section.maps) {
        totalMaps++
        const mapName = map.name
        const hidden = isHiddenMap(mapName)

        // 遍歷地圖中的怪物
        for (const monster of map.monsters) {
          const monsterName = monster.name

          // 跳過 Tutorial 怪物
          if (monsterName.toLowerCase().includes('tutorial')) {
            continue
          }

          // 初始化怪物出沒列表
          if (!monsterSpawns[monsterName]) {
            monsterSpawns[monsterName] = []
          }

          // 檢查是否已存在相同的地圖記錄（避免重複）
          const exists = monsterSpawns[monsterName].some(
            spawn => spawn.region === regionName &&
                     spawn.section === sectionName &&
                     spawn.map === mapName
          )

          if (!exists) {
            monsterSpawns[monsterName].push({
              region: regionName,
              section: sectionName,
              map: mapName,
              hidden
            })
            totalMonsterSpawns++
          }
        }
      }
    }
  }

  // 對每個怪物的出沒地點按區域排序
  for (const monsterName of Object.keys(monsterSpawns)) {
    monsterSpawns[monsterName].sort((a, b) => {
      // 先按區域排序
      if (a.region !== b.region) {
        return a.region.localeCompare(b.region)
      }
      // 再按區段排序
      if (a.section !== b.section) {
        return a.section.localeCompare(b.section)
      }
      // 最後按地圖名稱排序
      return a.map.localeCompare(b.map)
    })
  }

  // 寫入輸出檔案
  console.log('Writing monster spawns index...')
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(monsterSpawns, null, 2), 'utf-8')

  // 輸出統計資訊
  console.log('\n=== Generation Complete ===')
  console.log(`Total maps processed: ${totalMaps}`)
  console.log(`Total unique monsters: ${Object.keys(monsterSpawns).length}`)
  console.log(`Total monster spawn records: ${totalMonsterSpawns}`)
  console.log(`Output file: ${OUTPUT_PATH}`)
}

// 執行
generateMonsterSpawns()
