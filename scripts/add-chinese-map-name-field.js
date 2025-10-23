/**
 * 為 mob-info.json 的 maps 陣列新增 chinese_map_name 欄位
 *
 * 此腳本會：
 * 1. 讀取 data/mob-info.json
 * 2. 為每個怪物的 maps 陣列中的每個地圖物件新增 chinese_map_name: ""
 * 3. 儲存更新後的資料
 */

const fs = require('fs')
const path = require('path')

// 檔案路徑
const MOB_INFO_FILE = path.join(process.cwd(), 'data', 'mob-info.json')
const BACKUP_FILE = path.join(process.cwd(), 'data', 'mob-info.json.backup-chinese-field')

/**
 * 主函數
 */
function main() {
  console.log('='.repeat(60))
  console.log('為 maps 新增 chinese_map_name 欄位')
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

  // 備份原始檔案
  console.log('💾 備份原始檔案...')
  fs.copyFileSync(MOB_INFO_FILE, BACKUP_FILE)
  console.log(`✅ 備份至: ${path.basename(BACKUP_FILE)}\n`)

  // 統計
  let totalMaps = 0
  let updatedMaps = 0
  let mobsWithMaps = 0

  console.log('🚀 開始新增 chinese_map_name 欄位...\n')

  // 處理每個怪物
  mobData.forEach((mobEntry, index) => {
    // 檢查是否有 maps 陣列
    if (!mobEntry.maps || !Array.isArray(mobEntry.maps)) {
      return
    }

    if (mobEntry.maps.length === 0) {
      return
    }

    mobsWithMaps++

    // 為每個地圖新增 chinese_map_name 欄位
    mobEntry.maps.forEach((map) => {
      totalMaps++

      // 如果尚未有 chinese_map_name 欄位，則新增
      if (!map.hasOwnProperty('chinese_map_name')) {
        map.chinese_map_name = ''
        updatedMaps++
      }
    })

    // 每 20 個怪物顯示進度
    if ((index + 1) % 20 === 0) {
      console.log(`處理進度: ${index + 1}/${mobData.length} 個怪物`)
    }
  })

  console.log('')

  // 儲存資料
  console.log('💾 儲存更新後的資料...')
  fs.writeFileSync(MOB_INFO_FILE, JSON.stringify(mobData, null, 2), 'utf8')
  console.log('✅ 儲存完成\n')

  // 統計報告
  console.log('='.repeat(60))
  console.log('更新完成！')
  console.log('='.repeat(60))
  console.log(`📊 總怪物數量: ${mobData.length}`)
  console.log(`🗺️  有地圖的怪物: ${mobsWithMaps}`)
  console.log(`📍 地圖記錄總數: ${totalMaps}`)
  console.log(`✅ 新增欄位數量: ${updatedMaps}`)
  console.log('')
  console.log(`📁 輸出檔案: ${path.relative(process.cwd(), MOB_INFO_FILE)}`)
  console.log(`💾 備份檔案: ${path.relative(process.cwd(), BACKUP_FILE)}`)
  console.log('')
  console.log('如需復原，請執行：')
  console.log(`cp ${path.relative(process.cwd(), BACKUP_FILE)} ${path.relative(process.cwd(), MOB_INFO_FILE)}`)
  console.log('')
}

// 執行
try {
  main()
} catch (error) {
  console.error('❌ 腳本執行失敗:', error.message)
  process.exit(1)
}
