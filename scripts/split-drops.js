#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

console.log('🚀 開始拆分 drops.json...\n')

// 讀取原始資料
const originalData = require('../data/drops.json')
console.log(`✓ 讀取原始資料：${originalData.length} 條掉落記錄`)

// 統計不同怪物數量
const uniqueMobs = new Set(originalData.map(d => d.mobId))
console.log(`✓ 發現 ${uniqueMobs.size} 個不同怪物\n`)

// 建立 drops-detailed 資料夾
const detailedDir = path.join(__dirname, '../data/drops-detailed')
if (!fs.existsSync(detailedDir)) {
  fs.mkdirSync(detailedDir, { recursive: true })
  console.log(`✓ 建立資料夾：${detailedDir}`)
}

// ============================================================
// 1. 生成 Essential 資料（用於搜尋索引和初始顯示）
// ============================================================
console.log('\n📦 生成 Essential 資料...')

const essential = originalData.map(item => ({
  mobId: item.mobId,
  mobName: item.mobName,
  chineseMobName: item.chineseMobName,
  itemId: item.itemId,
  itemName: item.itemName,
  chineseItemName: item.chineseItemName,
  chance: item.chance,
  minQty: item.minQty,
  maxQty: item.maxQty,
}))

// 寫入 Essential
const essentialPath = path.join(__dirname, '../data/drops-essential.json')
fs.writeFileSync(essentialPath, JSON.stringify(essential, null, 2))
const essentialSize = fs.statSync(essentialPath).size
console.log(`✓ 生成 Essential：${(essentialSize / 1024).toFixed(2)} KB (${essential.length} 條記錄)`)

// ============================================================
// 2. 按怪物 ID 拆分 Detailed 資料
// ============================================================
console.log('\n📦 生成 Detailed 資料（按怪物 ID 拆分）...')

// 將掉落資料按 mobId 分組
const dropsByMob = {}
originalData.forEach((item) => {
  const mobId = item.mobId
  if (!dropsByMob[mobId]) {
    dropsByMob[mobId] = []
  }
  dropsByMob[mobId].push(item)
})

// 為每個怪物建立獨立的 Detailed 檔案
let totalSize = 0
let fileCount = 0
const mobIds = Object.keys(dropsByMob).sort((a, b) => parseInt(a) - parseInt(b))

mobIds.forEach((mobId, index) => {
  const drops = dropsByMob[mobId]
  const filePath = path.join(detailedDir, `${mobId}.json`)

  fs.writeFileSync(filePath, JSON.stringify(drops, null, 2))
  totalSize += fs.statSync(filePath).size
  fileCount++

  // 進度顯示
  if ((index + 1) % 20 === 0 || index === mobIds.length - 1) {
    process.stdout.write(`\r  生成進度: ${index + 1}/${mobIds.length} 個怪物`)
  }
})

console.log(`\n✓ 生成 Detailed：${fileCount} 個檔案，總計 ${(totalSize / 1024 / 1024).toFixed(2)} MB`)
console.log(`  平均檔案大小：${(totalSize / fileCount / 1024).toFixed(2)} KB`)

// ============================================================
// 3. 驗證拆分結果
// ============================================================
console.log('\n🔍 驗證拆分結果...')
const errors = []

// 檢查數量一致
if (essential.length !== originalData.length) {
  errors.push(`Essential 數量不符：預期 ${originalData.length}，實際 ${essential.length}`)
}

// 檢查檔案存在性（抽樣 10 個）
const sampleMobIds = Array.from(uniqueMobs).slice(0, 10)
sampleMobIds.forEach(mobId => {
  const filePath = path.join(detailedDir, `${mobId}.json`)
  if (!fs.existsSync(filePath)) {
    errors.push(`缺少 Detailed 檔案：${mobId}.json`)
  }
})

// 檢查資料正確性
const firstMobId = mobIds[0]
const firstMobDrops = dropsByMob[firstMobId]
const detailedSample = JSON.parse(
  fs.readFileSync(path.join(detailedDir, `${firstMobId}.json`), 'utf8')
)

if (firstMobDrops.length !== detailedSample.length) {
  errors.push('Detailed 資料數量不正確')
}

// 驗證 Essential 資料完整性
const essentialFirstItem = essential[0]
const originalFirstItem = originalData[0]
if (essentialFirstItem.mobId !== originalFirstItem.mobId ||
    essentialFirstItem.itemId !== originalFirstItem.itemId) {
  errors.push('Essential 資料映射錯誤')
}

// ============================================================
// 4. 輸出結果
// ============================================================
if (errors.length > 0) {
  console.error('\n❌ 驗證失敗：')
  errors.forEach(e => console.error(`  - ${e}`))
  process.exit(1)
} else {
  console.log('✓ 驗證通過！資料完整且一致\n')
  console.log('═══════════════════════════════════════')
  console.log('📊 拆分完成統計')
  console.log('═══════════════════════════════════════')
  console.log(`原始檔案大小：${(fs.statSync(path.join(__dirname, '../data/drops.json')).size / 1024).toFixed(2)} KB`)
  console.log('')
  console.log(`Essential 資料：`)
  console.log(`  - 檔案：drops-essential.json`)
  console.log(`  - 大小：${(essentialSize / 1024).toFixed(2)} KB`)
  console.log(`  - 記錄：${essential.length} 條`)
  console.log(`  - 節省：${((1 - essentialSize / fs.statSync(path.join(__dirname, '../data/drops.json')).size) * 100).toFixed(1)}%`)
  console.log('')
  console.log(`Detailed 資料：`)
  console.log(`  - 檔案數：${fileCount} 個`)
  console.log(`  - 總大小：${(totalSize / 1024 / 1024).toFixed(2)} MB`)
  console.log(`  - 平均大小：${(totalSize / fileCount / 1024).toFixed(2)} KB/檔`)
  console.log('')
  console.log(`預期流量節省：`)
  console.log(`  - 初始載入：900 KB → ${(essentialSize / 1024).toFixed(2)} KB`)
  console.log(`  - Modal 開啟：按需載入 ~${(totalSize / fileCount / 1024).toFixed(2)} KB`)
  console.log(`  - 預估節省：~85-90%`)
  console.log('═══════════════════════════════════════')
}
