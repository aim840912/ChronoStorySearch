/**
 * 將 minimumPushDamage 欄位從 monster-stats.json 合併到 mob-info.json
 *
 * 此腳本會：
 * 1. 從 monster-stats.json 讀取 minimumPushDamage 資料
 * 2. 更新 mob-info.json 的每個 mob 物件，新增 minimumPushDamage 欄位
 * 3. 自動備份原檔案
 */

const fs = require('fs')
const path = require('path')

// 檔案路徑
const MONSTER_STATS_FILE = path.join(process.cwd(), 'data', 'monster-stats.json')
const MOB_INFO_FILE = path.join(process.cwd(), 'data', 'mob-info.json')

/**
 * 主函數
 */
function main() {
  console.log('📖 讀取資料檔案...')

  // 讀取 monster-stats.json
  const monsterStats = JSON.parse(fs.readFileSync(MONSTER_STATS_FILE, 'utf8'))
  console.log(`✅ 讀取 monster-stats.json (${monsterStats.length} 個怪物)`)

  // 建立 mobId → minimumPushDamage 對應表
  const pushDamageMap = new Map()
  monsterStats.forEach((monster) => {
    if (monster.mobId !== undefined) {
      // 將 mobId 轉為字串以匹配 mob-info.json 的 mob_id 格式
      pushDamageMap.set(String(monster.mobId), monster.minimumPushDamage)
    }
  })
  console.log(`✅ 建立 minimumPushDamage 對應表 (${pushDamageMap.size} 個)`)

  // 讀取 mob-info.json
  const mobInfoList = JSON.parse(fs.readFileSync(MOB_INFO_FILE, 'utf8'))
  console.log(`✅ 讀取 mob-info.json (${mobInfoList.length} 個怪物)`)

  // 備份原檔案
  const backupFile = `${MOB_INFO_FILE}.backup`
  fs.copyFileSync(MOB_INFO_FILE, backupFile)
  console.log(`💾 備份原檔案到 ${path.basename(backupFile)}`)

  console.log('\n🚀 開始合併 minimumPushDamage 欄位...\n')

  let successCount = 0
  let notFoundCount = 0
  const notFoundIds = []

  // 更新每個怪物的資料
  mobInfoList.forEach((mobInfo, index) => {
    const mobId = mobInfo.mob?.mob_id

    if (!mobId) {
      console.warn(`⚠️  [${index + 1}/${mobInfoList.length}] 缺少 mob_id，跳過`)
      notFoundCount++
      return
    }

    const minimumPushDamage = pushDamageMap.get(mobId)

    if (minimumPushDamage !== undefined) {
      // 新增 minimumPushDamage 到 mob 物件
      mobInfo.mob.minimumPushDamage = minimumPushDamage
      successCount++
      const mobName = mobInfo.mob.mob_name || 'Unknown'
      const chineseName = mobInfo.chineseMobName || '無中文名'
      console.log(`✅ [${index + 1}/${mobInfoList.length}] ${mobName} (${chineseName}): ${minimumPushDamage}`)
    } else {
      // 如果找不到對應的 minimumPushDamage，設為 null
      mobInfo.mob.minimumPushDamage = null
      notFoundCount++
      notFoundIds.push(mobId)
      const mobName = mobInfo.mob.mob_name || 'Unknown'
      console.log(`⚠️  [${index + 1}/${mobInfoList.length}] ${mobName} (ID: ${mobId}): 無對應資料，設為 null`)
    }
  })

  // 儲存更新後的資料
  console.log('\n💾 儲存更新後的資料...')
  fs.writeFileSync(MOB_INFO_FILE, JSON.stringify(mobInfoList, null, 2), 'utf8')

  // 統計報告
  console.log('\n✅ 完成！')
  console.log('─────────────────────────────────')
  console.log(`📊 成功合併: ${successCount} 個怪物`)
  console.log(`⚠️  無對應資料: ${notFoundCount} 個怪物`)
  console.log(`📁 輸出檔案: ${path.relative(process.cwd(), MOB_INFO_FILE)}`)
  console.log(`📦 檔案大小: ${(fs.statSync(MOB_INFO_FILE).size / 1024).toFixed(2)} KB`)

  if (notFoundIds.length > 0) {
    console.log(`\n⚠️  無對應資料的怪物 ID (共 ${notFoundIds.length} 個):`)
    console.log(notFoundIds.join(', '))
  }
}

// 執行
try {
  main()
} catch (error) {
  console.error('❌ 腳本執行失敗:', error)
  process.exit(1)
}
