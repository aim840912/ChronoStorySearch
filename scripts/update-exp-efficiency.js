/**
 * 重新計算所有怪物的經驗效率
 * 將 mobExpHpRatio 改為 expEfficiency (exp / max_hp)
 */

const fs = require('fs')
const path = require('path')

// 檔案路徑
const MOB_INFO_FILE = path.join(__dirname, '../data/mob-info.json')
const BACKUP_FILE = path.join(__dirname, '../data/mob-info.json.backup-exp-efficiency')

/**
 * 計算經驗效率 (exp / max_hp)
 * @param {number|null} exp - 經驗值
 * @param {number|null} max_hp - 最大血量
 * @returns {number|null} 經驗效率，數值越高越好
 */
function calculateExpEfficiency(exp, max_hp) {
  // 處理 null、undefined 或 0 血量
  if (exp == null || max_hp == null || max_hp === 0) {
    return null
  }

  // 經驗為 0 的怪物（如箱子、道具）效率為 0
  if (exp === 0) {
    return 0
  }

  return exp / max_hp
}

/**
 * 主函數
 */
function main() {
  console.log('='.repeat(60))
  console.log('重新計算怪物經驗效率')
  console.log('='.repeat(60))
  console.log('')

  // 讀取資料
  console.log('📖 讀取 mob-info.json...')
  const mobData = JSON.parse(fs.readFileSync(MOB_INFO_FILE, 'utf8'))
  console.log(`✓ 讀取 ${mobData.length} 個怪物資料\n`)

  // 備份
  console.log('💾 備份原始檔案...')
  fs.copyFileSync(MOB_INFO_FILE, BACKUP_FILE)
  console.log(`✓ 備份至: ${BACKUP_FILE}\n`)

  // 統計
  let updatedCount = 0
  let expEfficiencyCount = 0
  let nullExpEfficiencyCount = 0
  let zeroExpEfficiencyCount = 0

  // 更新資料
  console.log('🔄 重新計算經驗效率...\n')
  mobData.forEach((mobEntry, index) => {
    const exp = mobEntry.mob?.exp
    const max_hp = mobEntry.mob?.max_hp

    // 計算新的經驗效率
    const expEfficiency = calculateExpEfficiency(exp, max_hp)

    // 更新 expBar
    if (mobEntry.expBar) {
      // 檢查是否有舊的 mobExpHpRatio
      const hadOldRatio = mobEntry.expBar.mobExpHpRatio !== undefined

      // 設定新的 expEfficiency
      mobEntry.expBar.expEfficiency = expEfficiency

      // 移除舊的 mobExpHpRatio
      delete mobEntry.expBar.mobExpHpRatio

      if (hadOldRatio) {
        updatedCount++
      }

      // 統計
      if (expEfficiency !== null) {
        expEfficiencyCount++
        if (expEfficiency === 0) {
          zeroExpEfficiencyCount++
        }
      } else {
        nullExpEfficiencyCount++
      }

      // 顯示進度（每 100 個）
      if ((index + 1) % 100 === 0) {
        console.log(`  處理進度: ${index + 1}/${mobData.length}`)
      }
    }
  })

  // 寫入更新後的資料
  console.log('\n💾 儲存更新後的資料...')
  fs.writeFileSync(MOB_INFO_FILE, JSON.stringify(mobData, null, 2), 'utf8')
  console.log(`✓ 已儲存至: ${MOB_INFO_FILE}\n`)

  // 統計報告
  console.log('='.repeat(60))
  console.log('更新完成')
  console.log('='.repeat(60))
  console.log(`總怪物數: ${mobData.length}`)
  console.log(`更新數量: ${updatedCount} 個（從 mobExpHpRatio 轉換）`)
  console.log(`有經驗效率: ${expEfficiencyCount} 個`)
  console.log(`  - 經驗效率 = 0: ${zeroExpEfficiencyCount} 個（無經驗怪物）`)
  console.log(`  - 經驗效率 > 0: ${expEfficiencyCount - zeroExpEfficiencyCount} 個`)
  console.log(`無經驗效率 (null): ${nullExpEfficiencyCount} 個`)
  console.log('')
  console.log('如需復原，請執行：')
  console.log(`cp ${BACKUP_FILE} ${MOB_INFO_FILE}`)
  console.log('')

  // 顯示範例
  console.log('='.repeat(60))
  console.log('經驗效率範例（前 5 個有效率的怪物）')
  console.log('='.repeat(60))
  const examplesWithEfficiency = mobData
    .filter(m => m.expBar?.expEfficiency !== null && m.expBar?.expEfficiency > 0)
    .slice(0, 5)

  examplesWithEfficiency.forEach(m => {
    const name = m.mob?.mob_name || 'Unknown'
    const chineseName = m.chineseMobName || ''
    const hp = m.mob?.max_hp
    const exp = m.mob?.exp
    const efficiency = m.expBar?.expEfficiency

    console.log(`${name} ${chineseName ? `(${chineseName})` : ''}`)
    console.log(`  HP: ${hp}, EXP: ${exp}`)
    console.log(`  經驗效率: ${efficiency?.toFixed(4)} (每點血 ${efficiency?.toFixed(4)} 經驗)\n`)
  })
}

// 執行
try {
  main()
} catch (error) {
  console.error('❌ 執行失敗:', error)
  process.exit(1)
}
