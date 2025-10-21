/**
 * 使用 MapleStory API 更新轉蛋機 JSON 資料
 *
 * 使用方式:
 * node scripts/update-gacha-with-api.js <json檔案路徑>
 *
 * 範例:
 * node scripts/update-gacha-with-api.js data/gacha/backup/machine-1.json
 *
 * 注意：專案已切換到 Enhanced JSON 格式，建議使用 enhance-gacha-data.js 腳本
 */

const fs = require('fs')
const https = require('https')

/**
 * 從 API 獲取物品資料
 * @param {number} itemId - 物品 ID
 * @returns {Promise<Object>} API 回應資料
 */
function fetchItemFromAPI(itemId) {
  return new Promise((resolve, reject) => {
    const url = `https://api.maplestory.net/item/${itemId}`

    https.get(url, (res) => {
      let data = ''

      res.on('data', (chunk) => {
        data += chunk
      })

      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const json = JSON.parse(data)
            resolve(json)
          } catch (e) {
            reject(new Error(`無法解析 JSON: ${e.message}`))
          }
        } else {
          reject(new Error(`API 請求失敗: ${res.statusCode}`))
        }
      })
    }).on('error', (err) => {
      reject(err)
    })
  })
}

/**
 * 延遲函數
 * @param {number} ms - 延遲毫秒數
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 合併 API 資料和現有的轉蛋機資料
 * @param {Object} oldItem - 現有的物品資料
 * @param {Object} apiData - API 回傳的資料
 * @returns {Object} 合併後的物品資料
 */
function mergeItemData(oldItem, apiData) {
  return {
    // 保留轉蛋機特有欄位
    chineseName: oldItem.chineseName,
    probability: oldItem.probability,
    chance: oldItem.chance,

    // 使用 API 資料
    itemId: apiData.itemId,
    name: apiData.name,
    description: apiData.description || '',
    category: apiData.category,
    subcategory: apiData.subcategory,
    overallCategory: apiData.overallCategory,
    availability: apiData.availability,
    requiredStats: apiData.requiredStats,
    stats: apiData.stats,
    version: apiData.version
  }
}

/**
 * 主函數
 */
async function main() {
  const args = process.argv.slice(2)

  if (args.length < 1) {
    console.error('使用方式: node update-gacha-with-api.js <json檔案路徑>')
    console.error('範例: node update-gacha-with-api.js data/gacha/backup/machine-1.json')
    console.error('注意：建議使用 enhance-gacha-data.js 腳本處理轉蛋機資料')
    process.exit(1)
  }

  const jsonFilePath = args[0]

  console.log(`🔄 開始更新轉蛋機資料: ${jsonFilePath}`)

  // 檢查檔案是否存在
  if (!fs.existsSync(jsonFilePath)) {
    console.error(`❌ 錯誤: 找不到 JSON 檔案 ${jsonFilePath}`)
    process.exit(1)
  }

  // 讀取現有的 JSON 檔案
  let gachaMachine
  try {
    const content = fs.readFileSync(jsonFilePath, 'utf-8')
    gachaMachine = JSON.parse(content)
  } catch (e) {
    console.error(`❌ 錯誤: 無法讀取或解析 JSON 檔案: ${e.message}`)
    process.exit(1)
  }

  console.log(`📦 轉蛋機: ${gachaMachine.machineName}`)
  console.log(`📊 物品數量: ${gachaMachine.items.length}`)

  // 處理每個物品
  const updatedItems = []
  let successCount = 0
  let failCount = 0

  for (let i = 0; i < gachaMachine.items.length; i++) {
    const item = gachaMachine.items[i]
    const itemId = item.itemId

    try {
      console.log(`⏳ [${i + 1}/${gachaMachine.items.length}] 處理物品 ${itemId} (${item.chineseName})...`)

      // 從 API 獲取資料
      const apiData = await fetchItemFromAPI(itemId)

      // 合併資料
      const mergedItem = mergeItemData(item, apiData)
      updatedItems.push(mergedItem)

      successCount++
      console.log(`   ✅ 成功: ${apiData.name}`)

      // 延遲 150ms 避免 rate limiting
      await delay(150)
    } catch (error) {
      failCount++
      console.log(`   ❌ 失敗: ${error.message}`)

      // 失敗時保留原始資料
      updatedItems.push(item)
    }
  }

  // 更新轉蛋機資料
  gachaMachine.items = updatedItems

  // 備份原始檔案
  const backupPath = jsonFilePath + '.backup'
  fs.copyFileSync(jsonFilePath, backupPath)
  console.log(`\n💾 已備份原始檔案至: ${backupPath}`)

  // 寫入更新後的 JSON 檔案
  fs.writeFileSync(jsonFilePath, JSON.stringify(gachaMachine, null, 2), 'utf-8')

  console.log(`\n✅ 更新完成！`)
  console.log(`📊 統計:`)
  console.log(`   - 成功: ${successCount} 件`)
  console.log(`   - 失敗: ${failCount} 件`)
  console.log(`   - 總計: ${gachaMachine.items.length} 件`)
  console.log(`\n📁 檔案已更新: ${jsonFilePath}`)
  console.log(`📊 檔案大小: ${(fs.statSync(jsonFilePath).size / 1024).toFixed(2)} KB`)

  // 顯示前 3 件物品作為範例
  console.log('\n📋 前 3 件物品範例:')
  updatedItems.slice(0, 3).forEach((item, index) => {
    console.log(`\n${index + 1}. ${item.chineseName} (${item.name})`)
    console.log(`   機率: ${item.probability}`)
    console.log(`   分類: ${item.category} > ${item.subcategory}`)
    console.log(`   等級需求: ${item.requiredStats.level}`)
    console.log(`   屬性數量: ${Object.keys(item.stats).length}`)
    if (item.description) {
      console.log(`   描述: ${item.description}`)
    }
  })
}

// 執行主函數
main().catch(err => {
  console.error(`❌ 未預期的錯誤: ${err.message}`)
  process.exit(1)
})
