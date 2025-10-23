/**
 * 從 mob-info.json 提取地圖資訊
 * 將資料從「怪物 → 地圖列表」轉換為「地圖 → 怪物列表」
 *
 * 輸出格式：
 * {
 *   metadata: { ... },
 *   maps: [
 *     {
 *       map_id: "1010000",
 *       map_name: "Amherst",
 *       chinese_map_name: "",
 *       monsters: [
 *         { mob_id: "2000", mob_name: "Amherst Crate", chineseMobName: "箱子" }
 *       ]
 *     }
 *   ]
 * }
 */

const fs = require('fs')
const path = require('path')

// 檔案路徑
const MOB_INFO_FILE = path.join(process.cwd(), 'data', 'mob-info.json')
const OUTPUT_FILE = path.join(process.cwd(), 'data', 'mob-maps.json')

/**
 * 主函數
 */
function main() {
  console.log('='.repeat(60))
  console.log('提取地圖與怪物關聯資訊')
  console.log('='.repeat(60))
  console.log('')

  // 讀取資料
  console.log('📖 讀取 mob-info.json...')
  if (!fs.existsSync(MOB_INFO_FILE)) {
    console.error('❌ 找不到 mob-info.json 檔案')
    process.exit(1)
  }

  const mobData = JSON.parse(fs.readFileSync(MOB_INFO_FILE, 'utf8'))
  console.log(`✅ 找到 ${mobData.length} 個怪物\n`)

  // 使用 Map 來彙整地圖資訊（避免重複）
  const mapRegistry = new Map()
  let totalMobMapEntries = 0

  console.log('🔄 轉換資料結構...\n')

  // 遍歷所有怪物
  mobData.forEach((mobEntry) => {
    const mobId = mobEntry.mob.mob_id
    const mobName = mobEntry.mob.mob_name || 'Unknown'
    const chineseMobName = mobEntry.chineseMobName || ''

    // 檢查是否有 maps 陣列
    if (!mobEntry.maps || !Array.isArray(mobEntry.maps) || mobEntry.maps.length === 0) {
      return
    }

    // 處理每個地圖
    mobEntry.maps.forEach((map) => {
      const mapId = map.map_id
      const mapName = map.map_name
      const chineseMapName = map.chinese_map_name || ''

      totalMobMapEntries++

      // 如果地圖還不在 registry 中，建立新條目
      if (!mapRegistry.has(mapId)) {
        mapRegistry.set(mapId, {
          map_id: mapId,
          map_name: mapName,
          chinese_map_name: chineseMapName,
          monsters: [],
        })
      }

      // 新增怪物到該地圖的列表
      mapRegistry.get(mapId).monsters.push({
        mob_id: mobId,
        mob_name: mobName,
        chineseMobName: chineseMobName,
      })
    })
  })

  // 將 Map 轉換為陣列並按 map_id 排序
  const mapsArray = Array.from(mapRegistry.values()).sort((a, b) => {
    return parseInt(a.map_id) - parseInt(b.map_id)
  })

  // 建立輸出資料
  const output = {
    metadata: {
      source: 'data/mob-info.json',
      generatedAt: new Date().toISOString(),
      totalMaps: mapsArray.length,
      totalMobMapEntries: totalMobMapEntries,
      description: '地圖與怪物的對應關係，按地圖分組',
    },
    maps: mapsArray,
  }

  // 寫入檔案
  console.log('💾 儲存到 mob-maps.json...')
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf8')
  console.log('✅ 儲存完成\n')

  // 統計報告
  console.log('='.repeat(60))
  console.log('提取完成！')
  console.log('='.repeat(60))
  console.log(`📍 地圖總數: ${mapsArray.length}`)
  console.log(`🔗 怪物-地圖關聯總數: ${totalMobMapEntries}`)
  console.log(`📊 平均每個地圖的怪物數: ${(totalMobMapEntries / mapsArray.length).toFixed(2)}`)
  console.log('')

  // 找出怪物最多的前 5 個地圖
  const topMaps = mapsArray
    .sort((a, b) => b.monsters.length - a.monsters.length)
    .slice(0, 5)

  console.log('🏆 怪物數量最多的 5 個地圖：')
  topMaps.forEach((map, index) => {
    console.log(
      `   ${index + 1}. ${map.map_name} (${map.chinese_map_name || '無中文名'}) - ${map.monsters.length} 隻怪物`
    )
  })
  console.log('')

  console.log(`📁 輸出檔案: ${path.relative(process.cwd(), OUTPUT_FILE)}`)
  console.log(`📦 檔案大小: ${(fs.statSync(OUTPUT_FILE).size / 1024).toFixed(2)} KB`)
  console.log('')
}

// 執行
try {
  main()
} catch (error) {
  console.error('❌ 腳本執行失敗:', error.message)
  console.error(error.stack)
  process.exit(1)
}
