const fs = require('fs')
const path = require('path')

/**
 * 從 JSON 檔案提取 iconRaw Base64 圖片
 *
 * 用途：提取 Unwelcome Guest 等裝備的內嵌圖片
 * 只處理 R2 上尚未存在的圖片
 */

// 路徑常數
const EQUIPMENT_DIR = path.join(__dirname, '../chronostoryData/items-organized/equipment')
const OUTPUT_DIR = path.join(__dirname, '../public/images/items')
const AVAILABLE_IMAGES_PATH = path.join(__dirname, '../data/available-images.json')

// PNG 檔案結尾標記 (IEND chunk)
const IEND_MARKER = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82])

/**
 * 載入已存在的圖片 ID 清單
 * @returns {Set<number>}
 */
function loadExistingIds() {
  try {
    const content = fs.readFileSync(AVAILABLE_IMAGES_PATH, 'utf-8')
    const data = JSON.parse(content)
    return new Set(data.items || [])
  } catch {
    console.warn('⚠️ 無法載入 available-images.json，將處理所有檔案')
    return new Set()
  }
}

/**
 * 清理 Base64 字串，移除 PNG IEND 之後的元資料
 * @param {string} base64Str
 * @returns {Buffer}
 */
function cleanBase64ToPng(base64Str) {
  const buffer = Buffer.from(base64Str, 'base64')

  // 尋找 IEND 標記
  const iendIndex = buffer.indexOf(IEND_MARKER)
  if (iendIndex !== -1) {
    // 截取到 IEND 結束為止
    return buffer.subarray(0, iendIndex + IEND_MARKER.length)
  }

  // 沒找到 IEND，返回原始 buffer
  return buffer
}

/**
 * 主程式
 */
function main() {
  console.log('🔍 開始從 JSON 提取圖片...\n')

  // 確保輸出目錄存在
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  }

  // 載入已存在的圖片 ID
  const existingIds = loadExistingIds()
  console.log(`📋 R2 上已有 ${existingIds.size} 個物品圖片`)

  // 讀取所有裝備 JSON 檔案
  const files = fs.readdirSync(EQUIPMENT_DIR).filter(f => f.endsWith('.json'))
  console.log(`📂 找到 ${files.length} 個裝備 JSON 檔案`)

  let extracted = 0
  let skipped = 0
  let noIcon = 0
  const extractedIds = []

  for (const file of files) {
    const itemId = parseInt(path.basename(file, '.json'), 10)
    if (isNaN(itemId)) continue

    // 跳過 R2 上已存在的圖片
    if (existingIds.has(itemId)) {
      skipped++
      continue
    }

    // 讀取 JSON
    const filePath = path.join(EQUIPMENT_DIR, file)
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))

    // 優先使用 iconRaw，其次 icon
    const base64Str = data.metaInfo?.iconRaw || data.metaInfo?.icon
    if (!base64Str) {
      noIcon++
      continue
    }

    // 解碼並清理
    const pngBuffer = cleanBase64ToPng(base64Str)

    // 驗證 PNG header
    if (pngBuffer[0] !== 0x89 || pngBuffer.toString('utf-8', 1, 4) !== 'PNG') {
      console.warn(`⚠️ ${itemId} 不是有效的 PNG 檔案`)
      continue
    }

    // 寫入檔案
    const outputPath = path.join(OUTPUT_DIR, `${itemId}.png`)
    fs.writeFileSync(outputPath, pngBuffer)
    extractedIds.push(itemId)
    extracted++

    if (extracted <= 10 || extracted % 20 === 0) {
      console.log(`✓ 提取 ${itemId}.png (${pngBuffer.length} bytes)`)
    }
  }

  // 顯示統計
  console.log(`\n📊 統計：`)
  console.log(`  ✅ 已提取: ${extracted} 張圖片`)
  console.log(`  ⏭️ 已跳過 (R2 已有): ${skipped}`)
  console.log(`  ❌ 無 iconRaw: ${noIcon}`)

  if (extracted > 0) {
    console.log(`\n📝 提取的 ID 範例:`)
    console.log(`  ${extractedIds.slice(0, 10).join(', ')}${extractedIds.length > 10 ? '...' : ''}`)

    console.log(`\n🚀 下一步：`)
    console.log(`  1. 上傳到 R2: ~/rclone copy public/images/items r2:maplestory-images/images/items --include "*.png" --progress`)
    console.log(`  2. 更新清單: npm run r2:sync-manifest`)
  }

  console.log('\n✨ 完成！')
}

main()
