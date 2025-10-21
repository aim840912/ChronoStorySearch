const fs = require('fs')
const path = require('path')

/**
 * 轉蛋機資料增強腳本
 * 從 API 獲取完整物品資料並合併到轉蛋機 JSON
 */

const API_BASE_URL = 'https://chronostory.onrender.com/api/item-info'
const DATA_DIR = path.join(__dirname, '../data/gacha')
const MACHINE_COUNT = 7
const REQUEST_DELAY = 500 // 500ms 延遲避免 API 速率限制
const MAX_RETRIES = 3

// 將 snake_case 轉換為 camelCase
function toCamelCase(str) {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
}

// 遞迴轉換物件的所有 key 為 camelCase
function convertKeysToCamelCase(obj) {
  if (Array.isArray(obj)) {
    return obj.map(convertKeysToCamelCase)
  } else if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((result, key) => {
      const camelKey = toCamelCase(key)
      result[camelKey] = convertKeysToCamelCase(obj[key])
      return result
    }, {})
  }
  return obj
}

// 延遲函數
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// 從 API 獲取物品資料（帶重試機制）
async function fetchItemData(itemId, retries = MAX_RETRIES) {
  try {
    const response = await fetch(`${API_BASE_URL}?itemId=${itemId}`)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    return convertKeysToCamelCase(data)
  } catch (error) {
    if (retries > 0) {
      console.log(`  ⚠️  API 呼叫失敗 (剩餘重試: ${retries})，等待 ${REQUEST_DELAY * 2}ms 後重試...`)
      await delay(REQUEST_DELAY * 2)
      return fetchItemData(itemId, retries - 1)
    }
    throw error
  }
}

// 合併物品資料
function mergeItemData(originalItem, apiData) {
  // 保留原有的轉蛋機特定資料
  const enhancedItem = {
    chineseName: originalItem.chineseName,
    probability: originalItem.probability,
    chance: originalItem.chance,
    ...apiData, // API 的完整資料
  }

  return enhancedItem
}

// 處理單個轉蛋機
async function processMachine(machineId) {
  const inputFile = path.join(DATA_DIR, `machine-${machineId}.json`)
  const outputFile = path.join(DATA_DIR, `machine-${machineId}-enhanced.json`)

  console.log(`\n📦 處理轉蛋機 ${machineId}...`)

  // 讀取原始資料
  const machineData = JSON.parse(fs.readFileSync(inputFile, 'utf-8'))
  const totalItems = machineData.items.length

  console.log(`   共有 ${totalItems} 個物品`)

  // 處理每個物品
  const enhancedItems = []
  let successCount = 0
  let failCount = 0

  for (let i = 0; i < machineData.items.length; i++) {
    const item = machineData.items[i]
    const itemId = item.itemId

    process.stdout.write(`\r   進度: ${i + 1}/${totalItems} - 正在獲取物品 ${itemId} 的資料...`)

    try {
      const apiData = await fetchItemData(itemId)
      const enhancedItem = mergeItemData(item, apiData)
      enhancedItems.push(enhancedItem)
      successCount++

      // API 速率限制延遲
      await delay(REQUEST_DELAY)
    } catch (error) {
      console.log(`\n   ❌ 物品 ${itemId} 處理失敗: ${error.message}`)
      console.log(`      保留原有資料...`)
      enhancedItems.push(item) // 失敗時保留原有資料
      failCount++
    }
  }

  console.log(`\n   ✅ 完成！成功: ${successCount}, 失敗: ${failCount}`)

  // 建立增強版資料
  const enhancedMachineData = {
    ...machineData,
    items: enhancedItems,
    metadata: {
      enhancedAt: new Date().toISOString(),
      apiSource: API_BASE_URL,
      successRate: `${successCount}/${totalItems}`,
    }
  }

  // 寫入檔案
  fs.writeFileSync(outputFile, JSON.stringify(enhancedMachineData, null, 2), 'utf-8')
  console.log(`   💾 已儲存到: ${outputFile}`)

  return { successCount, failCount, totalItems }
}

// 主函數
async function main() {
  console.log('🚀 開始增強轉蛋機資料...\n')
  console.log(`📡 API 來源: ${API_BASE_URL}`)
  console.log(`📂 資料目錄: ${DATA_DIR}`)
  console.log(`⏱️  請求延遲: ${REQUEST_DELAY}ms\n`)

  const startTime = Date.now()
  const stats = {
    totalSuccess: 0,
    totalFail: 0,
    totalItems: 0,
  }

  // 處理所有轉蛋機
  for (let machineId = 1; machineId <= MACHINE_COUNT; machineId++) {
    const result = await processMachine(machineId)
    stats.totalSuccess += result.successCount
    stats.totalFail += result.failCount
    stats.totalItems += result.totalItems
  }

  const endTime = Date.now()
  const duration = ((endTime - startTime) / 1000).toFixed(2)

  console.log('\n' + '='.repeat(50))
  console.log('✨ 所有轉蛋機處理完成！')
  console.log('='.repeat(50))
  console.log(`📊 總計: ${stats.totalItems} 個物品`)
  console.log(`✅ 成功: ${stats.totalSuccess} 個`)
  console.log(`❌ 失敗: ${stats.totalFail} 個`)
  console.log(`📈 成功率: ${((stats.totalSuccess / stats.totalItems) * 100).toFixed(2)}%`)
  console.log(`⏱️  總耗時: ${duration} 秒`)
  console.log('='.repeat(50))
}

// 執行腳本
main().catch(error => {
  console.error('\n❌ 腳本執行失敗:', error)
  process.exit(1)
})
