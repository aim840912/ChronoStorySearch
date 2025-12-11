/**
 * 更新轉蛋機 JSON 中缺失的中文名稱
 *
 * 從 items-organized 目錄讀取中文名稱，補充到 gacha machine JSON 中
 *
 * 執行方式：node scripts/update-gacha-chinese-names.js
 */

const fs = require('fs')
const path = require('path')

const ITEMS_ORGANIZED_DIR = path.join(__dirname, '../chronostoryData/items-organized')
const GACHA_DIR = path.join(__dirname, '../chronostoryData/gacha')

/**
 * 從 items-organized 建立 itemId → chineseItemName Map
 */
function buildChineseNameIndex() {
  const chineseNameMap = new Map()
  const categories = ['equipment', 'consumable', 'etc']

  for (const category of categories) {
    const categoryDir = path.join(ITEMS_ORGANIZED_DIR, category)

    if (!fs.existsSync(categoryDir)) {
      console.log(`跳過不存在的目錄: ${category}`)
      continue
    }

    const files = fs.readdirSync(categoryDir).filter((f) => f.endsWith('.json'))

    for (const file of files) {
      try {
        const filePath = path.join(categoryDir, file)
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))

        if (data.id && data.description?.chineseItemName) {
          chineseNameMap.set(data.id, data.description.chineseItemName)
        }
      } catch (err) {
        console.error(`讀取檔案失敗: ${file}`, err.message)
      }
    }

    console.log(`載入 ${category}: ${files.length} 個檔案`)
  }

  console.log(`總共建立索引: ${chineseNameMap.size} 個物品有中文名稱\n`)
  return chineseNameMap
}

/**
 * 更新轉蛋機 JSON 中的中文名稱
 */
function updateGachaMachines(chineseNameMap) {
  const machineFiles = fs.readdirSync(GACHA_DIR).filter((f) => f.includes('enhanced.json'))

  let totalUpdated = 0
  let totalNull = 0

  for (const file of machineFiles) {
    const filePath = path.join(GACHA_DIR, file)
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))

    let machineUpdated = 0
    let machineNull = 0

    for (const item of data.items) {
      if (item.chineseName === null) {
        machineNull++
        const chineseName = chineseNameMap.get(item.itemId)

        if (chineseName) {
          item.chineseName = chineseName
          machineUpdated++
        }
      }
    }

    // 寫回 JSON
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8')

    console.log(`${file}:`)
    console.log(`  - 原本缺少中文名稱: ${machineNull} 個`)
    console.log(`  - 成功補充: ${machineUpdated} 個`)
    console.log(`  - 仍然缺少: ${machineNull - machineUpdated} 個`)

    totalUpdated += machineUpdated
    totalNull += machineNull
  }

  console.log(`\n========== 總計 ==========`)
  console.log(`原本缺少中文名稱: ${totalNull} 個`)
  console.log(`成功補充: ${totalUpdated} 個`)
  console.log(`仍然缺少: ${totalNull - totalUpdated} 個`)
}

// 執行
console.log('=== 更新轉蛋物品中文名稱 ===\n')
const chineseNameMap = buildChineseNameIndex()
updateGachaMachines(chineseNameMap)
console.log('\n完成！')
