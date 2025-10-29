#!/usr/bin/env node

/**
 * 修復轉蛋機 JSON 檔案中的 itemId 型別
 * 將 string 型別的 itemId 轉換為 number 型別
 */

const fs = require('fs')
const path = require('path')

const DATA_DIR = path.join(__dirname, '../data/gacha')
const MACHINE_COUNT = 7

console.log('🔧 開始修復轉蛋機 itemId 型別...\n')

let totalFixed = 0
let totalItems = 0

for (let machineId = 1; machineId <= MACHINE_COUNT; machineId++) {
  const filePath = path.join(DATA_DIR, `machine-${machineId}-enhanced.json`)

  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  檔案不存在，跳過：${filePath}`)
    continue
  }

  // 讀取檔案
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  console.log(`📦 處理轉蛋機 ${machineId} (${data.items.length} 個物品)`)

  let fixedCount = 0

  // 修復每個物品的 itemId 型別
  data.items.forEach((item) => {
    totalItems++
    if (typeof item.itemId === 'string') {
      item.itemId = parseInt(item.itemId, 10)
      fixedCount++
    }
  })

  // 寫回檔案
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
  console.log(`   ✅ 修復 ${fixedCount} 個 itemId\n`)

  totalFixed += fixedCount
}

console.log('=' .repeat(50))
console.log(`✨ 修復完成！`)
console.log(`   總物品數：${totalItems}`)
console.log(`   修復數量：${totalFixed}`)
console.log(`   修復率：${((totalFixed / totalItems) * 100).toFixed(2)}%`)
console.log('=' .repeat(50))
