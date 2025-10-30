#!/usr/bin/env node

/**
 * 生成 drops 索引檔案
 *
 * 目的：減少前端初始載入大小，從 900 KB 減少到 < 100 KB
 *
 * 輸入：data/drops.json (900 KB, 40,283 行)
 * 輸出：
 *   - data/drops-index.json (輕量級索引)
 *   - data/drops-essential.json (完整資料，按需載入)
 */

const fs = require('fs')
const path = require('path')

console.log('🚀 開始生成 drops 索引...\n')

// 讀取原始資料
const originalData = require('../data/drops.json')
console.log(`✓ 讀取原始資料：${originalData.length} 條掉落記錄`)

// ============================================================
// 1. 生成索引資料（僅包含 ID 映射）
// ============================================================
console.log('\n📦 生成索引資料...')

const index = {
  // 物品 ID -> 掉落該物品的怪物 ID 列表
  itemToMobs: {},

  // 怪物 ID -> 掉落物品 ID 列表
  mobToItems: {},

  // 物品基本資訊（用於顯示）
  items: {},

  // 怪物基本資訊（用於顯示）
  mobs: {}
}

// 建立索引
originalData.forEach(drop => {
  const { mobId, mobName, chineseMobName, itemId, itemName, chineseItemName } = drop

  // 物品 -> 怪物映射
  if (!index.itemToMobs[itemId]) {
    index.itemToMobs[itemId] = []
    index.items[itemId] = {
      name: itemName,
      chineseName: chineseItemName || null
    }
  }
  if (!index.itemToMobs[itemId].includes(mobId)) {
    index.itemToMobs[itemId].push(mobId)
  }

  // 怪物 -> 物品映射
  if (!index.mobToItems[mobId]) {
    index.mobToItems[mobId] = []
    index.mobs[mobId] = {
      name: mobName,
      chineseName: chineseMobName || null
    }
  }
  if (!index.mobToItems[mobId].includes(itemId)) {
    index.mobToItems[mobId].push(itemId)
  }
})

// 寫入索引檔案
const indexPath = path.join(__dirname, '../data/drops-index.json')
fs.writeFileSync(indexPath, JSON.stringify(index, null, 2))
const indexSize = fs.statSync(indexPath).size
console.log(`✓ 生成索引：${(indexSize / 1024).toFixed(2)} KB`)
console.log(`  - ${Object.keys(index.items).length} 個不同物品`)
console.log(`  - ${Object.keys(index.mobs).length} 個不同怪物`)

// ============================================================
// 2. 保持 Essential 資料不變（改為按需載入）
// ============================================================
console.log('\n📦 Essential 資料已存在，無需重新生成')

const essentialPath = path.join(__dirname, '../data/drops-essential.json')
if (fs.existsSync(essentialPath)) {
  const essentialSize = fs.statSync(essentialPath).size
  console.log(`✓ Essential 資料：${(essentialSize / 1024).toFixed(2)} KB`)
}

// ============================================================
// 3. 統計資訊
// ============================================================
console.log('\n📊 優化統計：')
const originalSize = fs.statSync(path.join(__dirname, '../data/drops.json')).size
const savingsPercent = ((1 - indexSize / originalSize) * 100).toFixed(1)
const savingsKB = ((originalSize - indexSize) / 1024).toFixed(2)

console.log(`  原始大小：${(originalSize / 1024).toFixed(2)} KB`)
console.log(`  索引大小：${(indexSize / 1024).toFixed(2)} KB`)
console.log(`  節省空間：${savingsKB} KB (${savingsPercent}%)`)

console.log('\n✅ 索引生成完成！')
console.log('\n💡 使用方式：')
console.log('  1. 前端預載入：drops-index.json（輕量級）')
console.log('  2. 搜尋時載入：drops-essential.json（完整資料）')
console.log('  3. Modal 顯示：drops-detailed/{mobId}.json（單一怪物）')
