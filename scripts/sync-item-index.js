/**
 * 同步 items-organized 到 item-index.json
 *
 * 將 items-organized/ 中缺失的物品加入 item-index.json
 * 用於確保轉蛋物品等非掉落物品也能被 getItemNames() 查詢到
 */

const fs = require('fs')
const path = require('path')

const ITEMS_ORGANIZED_DIR = path.join(__dirname, '../chronostoryData/items-organized')
const ITEM_INDEX_PATH = path.join(__dirname, '../chronostoryData/item-index.json')

/**
 * 從 items-organized 讀取所有物品
 */
function readItemsOrganized() {
  const items = new Map()
  const categories = ['consumable', 'equipment', 'etc']

  for (const category of categories) {
    const categoryDir = path.join(ITEMS_ORGANIZED_DIR, category)
    if (!fs.existsSync(categoryDir)) continue

    const files = fs.readdirSync(categoryDir).filter(f => f.endsWith('.json'))

    for (const file of files) {
      try {
        const filePath = path.join(categoryDir, file)
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))

        if (data.id && data.description) {
          items.set(data.id, {
            itemId: data.id,
            itemName: data.description.name || '',
            chineseItemName: data.description.chineseItemName || null,
            category
          })
        }
      } catch (err) {
        console.error(`Error reading ${file}:`, err.message)
      }
    }
  }

  return items
}

/**
 * 讀取現有的 item-index.json
 */
function readItemIndex() {
  const data = JSON.parse(fs.readFileSync(ITEM_INDEX_PATH, 'utf-8'))
  const existingIds = new Set(data.items.map(item => item.itemId))
  return { data, existingIds }
}

/**
 * 同步缺失的物品
 */
function syncItems() {
  console.log('讀取 items-organized...')
  const organizedItems = readItemsOrganized()
  console.log(`找到 ${organizedItems.size} 個物品`)

  console.log('\n讀取 item-index.json...')
  const { data: indexData, existingIds } = readItemIndex()
  console.log(`現有 ${existingIds.size} 個物品`)

  // 找出缺失的物品
  const missingItems = []
  for (const [itemId, item] of organizedItems) {
    if (!existingIds.has(itemId)) {
      missingItems.push({
        itemId: item.itemId,
        itemName: item.itemName,
        chineseItemName: item.chineseItemName,
        monsterCount: 0  // 非掉落物品
      })
    }
  }

  console.log(`\n發現 ${missingItems.length} 個缺失的物品`)

  if (missingItems.length === 0) {
    console.log('沒有需要同步的物品')
    return
  }

  // 顯示前 10 個缺失的物品
  console.log('\n前 10 個缺失物品：')
  missingItems.slice(0, 10).forEach(item => {
    console.log(`  - ${item.itemId}: ${item.itemName} (${item.chineseItemName || 'N/A'})`)
  })

  // 合併並排序
  const allItems = [...indexData.items, ...missingItems]
  allItems.sort((a, b) => a.itemId - b.itemId)

  // 更新資料
  const updatedData = {
    totalItems: allItems.length,
    lastUpdated: new Date().toISOString().split('T')[0],
    items: allItems
  }

  // 寫入檔案
  fs.writeFileSync(ITEM_INDEX_PATH, JSON.stringify(updatedData, null, 2) + '\n')
  console.log(`\n已更新 item-index.json：${indexData.items.length} → ${allItems.length} 個物品`)
}

syncItems()
