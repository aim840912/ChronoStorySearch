#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

console.log('開始拆分 item-attributes.json...\n')

// 讀取原始資料
const originalData = require('../data/item-attributes.json')
console.log(`✓ 讀取原始資料：${originalData.length} 個物品`)

// 建立 detailed 資料夾
const detailedDir = path.join(__dirname, '../data/item-attributes-detailed')
if (!fs.existsSync(detailedDir)) {
  fs.mkdirSync(detailedDir, { recursive: true })
  console.log(`✓ 建立資料夾：${detailedDir}`)
}

// 1. 生成 Essential 資料（包含基本資訊、需求屬性和篩選欄位）
const essential = originalData.map(item => ({
  item_id: item.item_id,
  item_name: item.item_name,
  type: item.type || item.itemType?.type || null,
  sub_type: item.sub_type || item.itemType?.sub_type || null,
  req_level: item.equipment?.requirements?.req_level ?? null,
  req_str: item.equipment?.requirements?.req_str ?? 0,
  req_dex: item.equipment?.requirements?.req_dex ?? 0,
  req_int: item.equipment?.requirements?.req_int ?? 0,
  req_luk: item.equipment?.requirements?.req_luk ?? 0,
  // 篩選所需欄位
  equipment_category: item.equipment?.category ?? null,
  equipment_classes: item.equipment?.classes ?? null,
  scroll_category: item.scroll?.category ?? null,
}))

// 寫入 Essential
const essentialPath = path.join(__dirname, '../data/item-attributes-essential.json')
fs.writeFileSync(essentialPath, JSON.stringify(essential, null, 2))
console.log(`✓ 生成 Essential：${(fs.statSync(essentialPath).size / 1024).toFixed(2)} KB`)

// 2. 為每個物品建立獨立的 Detailed 檔案
let totalSize = 0
originalData.forEach((item, index) => {
  const detailed = {
    item_type_id: item.item_type_id,
    sale_price: item.sale_price,
    max_stack_count: item.max_stack_count,
    untradeable: item.untradeable,
    item_description: item.item_description,
    equipment: item.equipment,
    potion: item.potion,
    scroll: item.scroll,
  }

  const filePath = path.join(detailedDir, `${item.item_id}.json`)
  fs.writeFileSync(filePath, JSON.stringify(detailed, null, 2))
  totalSize += fs.statSync(filePath).size

  // 進度顯示
  if ((index + 1) % 100 === 0) {
    process.stdout.write(`\r  生成 Detailed: ${index + 1}/${originalData.length}`)
  }
})

console.log(`\n✓ 生成 Detailed：${originalData.length} 個檔案，總計 ${(totalSize / 1024 / 1024).toFixed(2)} MB\n`)

// 3. 驗證拆分結果
console.log('驗證拆分結果...')
const errors = []

// 檢查數量一致
if (essential.length !== originalData.length) {
  errors.push(`Essential 數量不符：預期 ${originalData.length}，實際 ${essential.length}`)
}

// 檢查檔案存在性（抽樣 10 個）
const sampleIds = originalData.slice(0, 10).map(i => i.item_id)
sampleIds.forEach(id => {
  const filePath = path.join(detailedDir, `${id}.json`)
  if (!fs.existsSync(filePath)) {
    errors.push(`缺少 Detailed 檔案：${id}.json`)
  }
})

// 檢查資料正確性
const sample = originalData[0]
const essentialSample = essential[0]
const detailedSample = JSON.parse(
  fs.readFileSync(path.join(detailedDir, `${sample.item_id}.json`), 'utf8')
)

if (sample.equipment?.requirements?.req_level !== essentialSample.req_level) {
  errors.push('req_level 提取錯誤')
}

if (sample.equipment && !detailedSample.equipment) {
  errors.push('Detailed equipment 資料遺失')
}

// 輸出結果
if (errors.length > 0) {
  console.error('\n❌ 驗證失敗：')
  errors.forEach(e => console.error(`  - ${e}`))
  process.exit(1)
} else {
  console.log('✓ 驗證通過！資料完整且一致\n')
  console.log('拆分完成！')
  console.log('────────────────────────────────')
  console.log(`Essential: ${essential.length} 項目`)
  console.log(`Detailed: ${originalData.length} 個獨立檔案`)
  console.log(`Essential 大小: ${(fs.statSync(essentialPath).size / 1024).toFixed(2)} KB`)
  console.log(`Detailed 平均大小: ${(totalSize / originalData.length / 1024).toFixed(2)} KB/檔`)
  console.log('────────────────────────────────')
}
