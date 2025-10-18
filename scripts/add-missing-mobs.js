/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * 將 monster-stats.json 中存在但 mob-info.json 缺少的怪物加入
 *
 * 此腳本會：
 * 1. 從 monster-stats.json 讀取缺少的怪物資料
 * 2. 建立符合 mob-info.json 格式的資料結構
 * 3. 附加到 mob-info.json
 * 4. 按 mob_id 排序
 */

const fs = require('fs')
const path = require('path')

// 檔案路徑
const MONSTER_STATS_FILE = path.join(process.cwd(), 'data', 'monster-stats.json')
const MOB_INFO_FILE = path.join(process.cwd(), 'data', 'mob-info.json')

// 缺少的怪物 ID (從 monster-stats.json 有但 mob-info.json 沒有的)
const MISSING_MOB_IDS = [2002011, 9300038, 9500148, 9834178]

/**
 * 從 monster-stats 資料建立 mob-info 格式的資料
 */
function createMobInfoFromStats(monsterData) {
  return {
    mob: {
      mob_id: String(monsterData.mobId),
      mob_name: monsterData.name,
      released: null,
      max_hp: monsterData.maxHP,
      acc: monsterData.accuracy,
      avoid: monsterData.evasion,
      level: monsterData.level,
      exp: monsterData.exp,
      phys_def: monsterData.physicalDefense,
      mag_def: monsterData.magicDefense,
      fire_weakness: null,
      ice_weakness: null,
      lightning_weakness: null,
      holy_weakness: null,
      poison_weakness: null,
      immune_to_poison_status: null,
      minimumPushDamage: monsterData.minimumPushDamage,
    },
    description: '',
    expBar: {
      minExpHpRatio: null,
      maxExpHpRatio: null,
      mobExpHpRatio: null,
    },
    chineseMobName: monsterData.chineseMobName,
  }
}

/**
 * 主函數
 */
function main() {
  console.log('📖 讀取資料檔案...')

  // 讀取 monster-stats.json
  const monsterStats = JSON.parse(fs.readFileSync(MONSTER_STATS_FILE, 'utf8'))
  console.log(`✅ 讀取 monster-stats.json (${monsterStats.length} 個怪物)`)

  // 讀取 mob-info.json
  const mobInfoList = JSON.parse(fs.readFileSync(MOB_INFO_FILE, 'utf8'))
  console.log(`✅ 讀取 mob-info.json (${mobInfoList.length} 個怪物)`)

  // 備份原檔案
  const backupFile = `${MOB_INFO_FILE}.backup`
  fs.copyFileSync(MOB_INFO_FILE, backupFile)
  console.log(`💾 備份原檔案到 ${path.basename(backupFile)}`)

  console.log('\n🚀 開始新增缺少的怪物...\n')

  let addedCount = 0

  // 處理每個缺少的怪物
  MISSING_MOB_IDS.forEach((mobId) => {
    const monsterData = monsterStats.find((m) => m.mobId === mobId)

    if (monsterData) {
      const mobInfo = createMobInfoFromStats(monsterData)
      mobInfoList.push(mobInfo)
      addedCount++

      const mobName = monsterData.name || '無英文名'
      const chineseName = monsterData.chineseMobName || '無中文名'
      const hasData = monsterData.maxHP !== null ? '有完整資料' : '僅基本資料'

      console.log(`✅ 新增 ID ${mobId}: ${mobName} (${chineseName}) - ${hasData}`)
    } else {
      console.warn(`⚠️  找不到 ID ${mobId} 的資料`)
    }
  })

  // 按 mob_id 數字排序
  console.log('\n📊 按 mob_id 排序...')
  mobInfoList.sort((a, b) => {
    const idA = parseInt(a.mob?.mob_id || '0')
    const idB = parseInt(b.mob?.mob_id || '0')
    return idA - idB
  })

  // 儲存更新後的資料
  console.log('💾 儲存更新後的資料...')
  fs.writeFileSync(MOB_INFO_FILE, JSON.stringify(mobInfoList, null, 2), 'utf8')

  // 統計報告
  console.log('\n✅ 完成！')
  console.log('─────────────────────────────────')
  console.log(`📊 原有怪物數量: ${mobInfoList.length - addedCount} 個`)
  console.log(`➕ 新增怪物數量: ${addedCount} 個`)
  console.log(`📦 更新後總數量: ${mobInfoList.length} 個`)
  console.log(`📁 輸出檔案: ${path.relative(process.cwd(), MOB_INFO_FILE)}`)
  console.log(`📦 檔案大小: ${(fs.statSync(MOB_INFO_FILE).size / 1024).toFixed(2)} KB`)

  // 列出新增的怪物
  console.log('\n✨ 新增的怪物:')
  MISSING_MOB_IDS.forEach((mobId) => {
    const monsterData = monsterStats.find((m) => m.mobId === mobId)
    if (monsterData) {
      console.log(
        `  • ${mobId}: ${monsterData.chineseMobName || '無名'} (${monsterData.name || '無英文名'})`
      )
    }
  })
}

// 執行
try {
  main()
} catch (error) {
  console.error('❌ 腳本執行失敗:', error)
  process.exit(1)
}
