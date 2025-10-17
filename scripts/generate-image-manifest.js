const fs = require('fs')
const path = require('path')

/**
 * 圖片清單生成腳本
 * 掃描 public/images 目錄中的圖片檔案，生成可用圖片清單
 */

// 掃描目錄並提取圖片 ID
function scanImageDirectory(dirPath) {
  try {
    const files = fs.readdirSync(dirPath)
    const imageIds = files
      .filter((file) => file.endsWith('.png'))
      .map((file) => parseInt(file.replace('.png', ''), 10))
      .filter((id) => !isNaN(id))
      .sort((a, b) => a - b)

    return imageIds
  } catch (error) {
    console.error(`無法讀取目錄 ${dirPath}:`, error.message)
    return []
  }
}

// 主程式
function main() {
  console.log('🔍 開始掃描圖片檔案...')

  const itemsPath = path.join(__dirname, '../public/images/items')
  const monstersPath = path.join(__dirname, '../public/images/monsters')

  // 掃描圖片
  const itemIds = scanImageDirectory(itemsPath)
  const monsterIds = scanImageDirectory(monstersPath)

  console.log(`✅ 找到 ${itemIds.length} 個物品圖片`)
  console.log(`✅ 找到 ${monsterIds.length} 個怪物圖片`)

  // 生成清單
  const manifest = {
    items: itemIds,
    monsters: monsterIds,
    generatedAt: new Date().toISOString(),
    totalItems: itemIds.length,
    totalMonsters: monsterIds.length,
  }

  // 寫入檔案
  const outputPath = path.join(__dirname, '../public/data/available-images.json')
  fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2), 'utf-8')

  console.log(`📝 圖片清單已生成: ${outputPath}`)
  console.log('✨ 完成！')
}

main()
