const fs = require('fs')
const path = require('path')

/**
 * 更新 drops.json 中 Meso 的中文名稱
 * 將 itemName 為 "Meso" 且 chineseItemName 為 null 的項目改為 "楓幣"
 */

const dropsPath = path.join(__dirname, '../data/drops.json')
const backupPath = path.join(__dirname, '../data/drops.json.backup-meso')

console.log('📝 開始更新 Meso 中文名稱...\n')

// 1. 建立備份
console.log('💾 建立備份檔案...')
fs.copyFileSync(dropsPath, backupPath)
console.log(`✅ 備份已建立: ${backupPath}\n`)

// 2. 讀取資料
console.log('📖 讀取 drops.json...')
const dropsData = JSON.parse(fs.readFileSync(dropsPath, 'utf-8'))
console.log(`✅ 成功讀取 ${dropsData.length} 筆資料\n`)

// 3. 更新資料
console.log('🔄 更新 Meso 中文名稱...')
let updateCount = 0

dropsData.forEach((drop) => {
  if (drop.itemName === 'Meso' && drop.chineseItemName === null) {
    drop.chineseItemName = '楓幣'
    updateCount++
  }
})

console.log(`✅ 成功更新 ${updateCount} 筆資料\n`)

// 4. 寫回檔案
console.log('💾 寫入檔案...')
fs.writeFileSync(dropsPath, JSON.stringify(dropsData, null, 2), 'utf-8')
console.log(`✅ 檔案已更新: ${dropsPath}\n`)

// 5. 驗證結果
console.log('🔍 驗證結果...')
const updatedData = JSON.parse(fs.readFileSync(dropsPath, 'utf-8'))
const mesoWithChinese = updatedData.filter(
  (drop) => drop.itemName === 'Meso' && drop.chineseItemName === '楓幣'
).length
const mesoWithNull = updatedData.filter(
  (drop) => drop.itemName === 'Meso' && drop.chineseItemName === null
).length

console.log(`✅ Meso 項目已設定中文名稱: ${mesoWithChinese} 筆`)
console.log(`⚠️  Meso 項目仍為 null: ${mesoWithNull} 筆\n`)

if (mesoWithNull === 0) {
  console.log('🎉 所有 Meso 項目已成功更新！')
} else {
  console.log('⚠️  仍有部分 Meso 項目未更新')
}

console.log('\n✨ 完成！')
