/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs')
const path = require('path')

// 路徑設定
const csvFilePath = path.join(__dirname, '../data/drops.csv')
const jsonFilePath = path.join(__dirname, '../data/drops.json')

console.log('開始轉換 CSV 到 JSON...')
console.log('讀取檔案:', csvFilePath)

// 讀取 CSV 檔案
const csvContent = fs.readFileSync(csvFilePath, 'utf8')
const lines = csvContent.split('\n')

console.log(`總共 ${lines.length} 行（含標題）`)

// 跳過標題行，處理資料
const drops = []
let skippedCount = 0

for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim()

  // 跳過空行
  if (!line) {
    continue
  }

  // 解析 CSV 行（處理逗號分隔）
  const columns = line.split(',')

  // CSV 格式: InGame,DropperID,MobName,Enable,QuestID,ItemID,ServerItemName,ItemName,Chance,MinQTY,MaxQTY
  // 索引:      0      1         2        3      4       5       6              7        8      9       10

  if (columns.length < 11) {
    skippedCount++
    continue
  }

  const inGame = columns[0]
  const enable = columns[3]

  // 只保留 InGame=TRUE 且 Enable=TRUE 的資料
  if (inGame !== 'TRUE' || enable !== 'TRUE') {
    skippedCount++
    continue
  }

  const dropperID = parseInt(columns[1])
  const mobName = columns[2]
  const itemID = parseInt(columns[5])
  const itemName = columns[7]
  const chance = parseInt(columns[8]) / 1000000 // 轉換為 0-1 的機率
  const minQty = parseInt(columns[9])
  const maxQty = parseInt(columns[10])

  drops.push({
    mobId: dropperID,
    mobName: mobName,
    itemId: itemID,
    itemName: itemName,
    chance: chance,
    minQty: minQty,
    maxQty: maxQty,
  })
}

console.log(`\n轉換完成！`)
console.log(`- 有效資料: ${drops.length} 筆`)
console.log(`- 跳過資料: ${skippedCount} 筆（不符合 InGame=TRUE 或 Enable=TRUE）`)

// 寫入 JSON 檔案
fs.writeFileSync(jsonFilePath, JSON.stringify(drops, null, 2), 'utf8')

console.log(`\nJSON 檔案已儲存至: ${jsonFilePath}`)
console.log(`檔案大小: ${(fs.statSync(jsonFilePath).size / 1024 / 1024).toFixed(2)} MB`)
