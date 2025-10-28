const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

/**
 * 圖片清單生成腳本
 * 從 Cloudflare R2 讀取圖片檔案列表，生成可用圖片清單
 */

// 從 R2 掃描目錄並提取圖片 ID
function scanR2ImageDirectory(r2Path) {
  try {
    console.log(`🔍 掃描 R2 路徑: ${r2Path}`)

    // 使用 rclone ls 列出 R2 檔案
    const command = `~/rclone ls ${r2Path}`
    const output = execSync(command, { encoding: 'utf-8' })

    // 解析輸出並提取圖片 ID
    const imageIds = output
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => {
        // rclone ls 輸出格式: "    1291 0.png"
        const match = line.match(/\s+\d+\s+(.+)/)
        return match ? match[1] : null
      })
      .filter((file) => file && file.endsWith('.png'))
      .map((file) => parseInt(file.replace('.png', ''), 10))
      .filter((id) => !isNaN(id))
      .sort((a, b) => a - b)

    return imageIds
  } catch (error) {
    console.error(`無法讀取 R2 路徑 ${r2Path}:`, error.message)
    return []
  }
}

// 主程式
function main() {
  console.log('🔍 開始從 R2 掃描圖片檔案...')

  // R2 路徑
  const itemsPath = 'r2:maplestory-images/images/items'
  const monstersPath = 'r2:maplestory-images/images/monsters'

  // 掃描 R2 圖片
  const itemIds = scanR2ImageDirectory(itemsPath)
  const monsterIds = scanR2ImageDirectory(monstersPath)

  console.log(`✅ 從 R2 找到 ${itemIds.length} 個物品圖片`)
  console.log(`✅ 從 R2 找到 ${monsterIds.length} 個怪物圖片`)

  // 生成清單
  const manifest = {
    items: itemIds,
    monsters: monsterIds,
    generatedAt: new Date().toISOString(),
    totalItems: itemIds.length,
    totalMonsters: monsterIds.length,
  }

  // 寫入檔案
  const outputPath = path.join(__dirname, '../data/available-images.json')
  fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2), 'utf-8')

  console.log(`📝 圖片清單已生成: ${outputPath}`)
  console.log('✨ 完成！')
}

main()
