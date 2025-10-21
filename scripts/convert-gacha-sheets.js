#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

/**
 * 轉換 Google Sheets CSV 為轉蛋機 JSON
 * 輸入: CSV 檔案（從 Google Sheets 匯出）
 * 輸出: machine-8.json
 */

const csvFilePath = process.argv[2] || '/tmp/gacha-data.csv'
const outputPath = path.join(__dirname, '../data/gacha/machine-8.json')

// 讀取 CSV
const csvContent = fs.readFileSync(csvFilePath, 'utf-8')
const lines = csvContent.trim().split('\n')

// 解析標題行
const headers = lines[0].split(',')
console.log('📋 CSV 標題:', headers)

// 解析資料行
const items = []
for (let i = 1; i < lines.length; i++) {
  const line = lines[i]
  // 簡單的 CSV 解析（假設沒有逗號在欄位內）
  const values = line.split(',')

  if (values.length >= 4) {
    const chance = parseInt(values[0], 10)
    const itemId = parseInt(values[1], 10)
    const name = values[2]
    const probability = values[3].trim()

    items.push({
      chineseName: '',
      probability: probability,
      chance: chance,
      itemId: itemId,
      name: name
    })
  }
}

console.log(`✅ 成功解析 ${items.length} 筆物品`)

// 建立轉蛋機 JSON 結構
const gachaMachine = {
  machineId: 8,
  machineName: 'NewGacha',
  chineseMachineName: '新轉蛋機',
  description: '新的轉蛋機，包含各種裝備道具',
  totalItems: items.length,
  items: items
}

// 確保目錄存在
const dir = path.dirname(outputPath)
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true })
}

// 寫入 JSON 檔案
fs.writeFileSync(outputPath, JSON.stringify(gachaMachine, null, 2), 'utf-8')

console.log(`\n🎉 成功建立轉蛋機 JSON:`)
console.log(`   檔案位置: ${outputPath}`)
console.log(`   物品數量: ${gachaMachine.totalItems}`)
console.log(`   轉蛋機 ID: ${gachaMachine.machineId}`)
console.log(`   轉蛋機名稱: ${gachaMachine.chineseMachineName} (${gachaMachine.machineName})`)
