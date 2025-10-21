/**
 * 從 monster-stats.json 填補 mob-info.json 中為 null 的屬性欄位
 *
 * 此腳本會：
 * 1. 從 monster-stats.json 讀取完整的怪物屬性資料
 * 2. 更新 mob-info.json 中為 null 的欄位
 * 3. 自動備份原檔案
 */

const fs = require('fs')
const path = require('path')

// 檔案路徑
const MONSTER_STATS_FILE = path.join(process.cwd(), 'data', 'monster-stats.json')
const MOB_INFO_FILE = path.join(process.cwd(), 'data', 'mob-info.json')

// 欄位對應關係 (mob-info.json → monster-stats.json)
const FIELD_MAPPING = {
  max_hp: 'maxHP',
  acc: 'accuracy',
  avoid: 'evasion',
  level: 'level',
  exp: 'exp',
  phys_def: 'physicalDefense',
  mag_def: 'magicDefense',
}

/**
 * 主函數
 */
function main() {
  console.log('📖 讀取資料檔案...')

  // 讀取 monster-stats.json
  const monsterStats = JSON.parse(fs.readFileSync(MONSTER_STATS_FILE, 'utf8'))
  console.log(`✅ 讀取 monster-stats.json (${monsterStats.length} 個怪物)`)

  // 建立 mobId → 完整屬性 對應表
  const statsMap = new Map()
  monsterStats.forEach((monster) => {
    if (monster.mobId !== undefined) {
      // 將 mobId 轉為字串以匹配 mob-info.json 的 mob_id 格式
      statsMap.set(String(monster.mobId), monster)
    }
  })
  console.log(`✅ 建立屬性對應表 (${statsMap.size} 個)`)

  // 讀取 mob-info.json
  const mobInfoList = JSON.parse(fs.readFileSync(MOB_INFO_FILE, 'utf8'))
  console.log(`✅ 讀取 mob-info.json (${mobInfoList.length} 個怪物)`)

  // 備份原檔案
  const backupFile = `${MOB_INFO_FILE}.backup`
  fs.copyFileSync(MOB_INFO_FILE, backupFile)
  console.log(`💾 備份原檔案到 ${path.basename(backupFile)}`)

  console.log('\n🚀 開始填補 null 值...\n')

  // 統計資料
  const stats = {
    totalMobs: mobInfoList.length,
    mobsWithNullFields: 0,
    fieldsFilled: {},
  }

  // 初始化欄位填補計數
  Object.keys(FIELD_MAPPING).forEach((field) => {
    stats.fieldsFilled[field] = 0
  })

  // 更新每個怪物的資料
  mobInfoList.forEach((mobInfo, index) => {
    const mobId = mobInfo.mob?.mob_id

    if (!mobId) {
      return
    }

    const monsterData = statsMap.get(mobId)
    if (!monsterData) {
      return
    }

    let hasNullFields = false
    let filledCount = 0

    // 檢查並填補每個欄位
    Object.entries(FIELD_MAPPING).forEach(([mobInfoField, monsterStatsField]) => {
      // 如果 mob-info.json 中的值是 null，且 monster-stats.json 有對應值
      if (mobInfo.mob[mobInfoField] === null && monsterData[monsterStatsField] !== null) {
        mobInfo.mob[mobInfoField] = monsterData[monsterStatsField]
        stats.fieldsFilled[mobInfoField]++
        filledCount++
        hasNullFields = true
      } else if (mobInfo.mob[mobInfoField] === null) {
        hasNullFields = true
      }
    })

    if (filledCount > 0) {
      stats.mobsWithNullFields++
      const mobName = mobInfo.mob.mob_name || 'Unknown'
      const chineseName = mobInfo.chineseMobName || '無中文名'
      console.log(
        `✅ [${index + 1}/${mobInfoList.length}] ${mobName} (${chineseName}): 填補 ${filledCount} 個欄位`
      )
    } else if (hasNullFields) {
      const mobName = mobInfo.mob.mob_name || 'Unknown'
      console.log(
        `⚠️  [${index + 1}/${mobInfoList.length}] ${mobName}: 有 null 值但無法填補（來源資料也是 null）`
      )
    }
  })

  // 儲存更新後的資料
  console.log('\n💾 儲存更新後的資料...')
  fs.writeFileSync(MOB_INFO_FILE, JSON.stringify(mobInfoList, null, 2), 'utf8')

  // 統計報告
  console.log('\n✅ 完成！')
  console.log('─────────────────────────────────')
  console.log(`📊 總怪物數量: ${stats.totalMobs} 個`)
  console.log(`🔧 更新的怪物數量: ${stats.mobsWithNullFields} 個`)
  console.log('\n各欄位填補統計:')
  Object.entries(stats.fieldsFilled).forEach(([field, count]) => {
    if (count > 0) {
      console.log(`  • ${field}: ${count} 個`)
    }
  })
  console.log(`\n📁 輸出檔案: ${path.relative(process.cwd(), MOB_INFO_FILE)}`)
  console.log(`📦 檔案大小: ${(fs.statSync(MOB_INFO_FILE).size / 1024).toFixed(2)} KB`)
}

// 執行
try {
  main()
} catch (error) {
  console.error('❌ 腳本執行失敗:', error)
  process.exit(1)
}
