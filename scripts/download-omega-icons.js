const fs = require('fs')
const path = require('path')
const https = require('https')

// Omega Sector 扭蛋機缺少圖片的物品 ID
const MISSING_ITEM_IDS = [
  // 礦石/水晶 - maplestory.io 有提供
  4011004, // Silver Plate
  4021000, // Garnet
  4021002, // AquaMarine
  4005000, // Power Crystal
  4005001, // Wisdom Crystal
  4005003, // Lucky Crystal
  // 以下物品 maplestory.io 可能返回 404
  4011011, // Alien Ingot
  6000009, // Red Mesoranger Hat
  6000010, // Blue Mesoranger Hat
  6000011, // Green Mesoranger Hat
  6000012, // Black Mesoranger Hat
  6000013, // Pink Mesoranger Hat
  6080000, // Red Mesoranger Suit
  6080001, // Blue Mesoranger Suit
  6080002, // Green Mesoranger Suit
  6080003, // Black Mesoranger Suit
  6080004, // Pink Mesoranger Suit
  6081000, // Red Mesoranger Boots
  6081001, // Blue Mesoranger Boots
  6081002, // Green Mesoranger Boots
  6081003, // Black Mesoranger Boots
  6081004, // Pink Mesoranger Boots
  6082120, // Red Mesoranger Gloves
  6082121, // Blue Mesoranger Gloves
  6082122, // Green Mesoranger Gloves
  6082123, // Black Mesoranger Gloves
  6082124, // Pink Mesoranger Gloves
]

const outputDir = path.join(__dirname, '../public/images/items')

// 確保輸出目錄存在
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true })
  console.log(`建立目錄: ${outputDir}`)
}

// 從 maplestory.io 下載圖片 (TWMS/217)
function downloadImage(itemId) {
  return new Promise((resolve) => {
    const url = `https://maplestory.io/api/TWMS/217/item/${itemId}/icon`
    const outputPath = path.join(outputDir, `${itemId}.png`)

    // 如果檔案已存在，跳過
    if (fs.existsSync(outputPath)) {
      console.log(`  skip  ${itemId} (already exists)`)
      resolve({ itemId, status: 'skipped' })
      return
    }

    https
      .get(url, (response) => {
        if (response.statusCode === 200) {
          const fileStream = fs.createWriteStream(outputPath)
          response.pipe(fileStream)

          fileStream.on('finish', () => {
            fileStream.close()
            console.log(`  done  ${itemId}.png`)
            resolve({ itemId, status: 'success' })
          })
        } else if (response.statusCode === 404) {
          console.log(`  404   ${itemId}`)
          resolve({ itemId, status: '404' })
        } else {
          console.log(`  err   ${response.statusCode}: ${itemId}`)
          resolve({ itemId, status: 'error', code: response.statusCode })
        }
      })
      .on('error', (error) => {
        console.log(`  fail  ${itemId} - ${error.message}`)
        resolve({ itemId, status: 'failed', error: error.message })
      })
  })
}

async function downloadAll() {
  console.log(`Downloading ${MISSING_ITEM_IDS.length} missing Omega Sector gacha icons...`)
  console.log(`API: maplestory.io/api/TWMS/217\n`)

  const results = {
    success: [],
    skipped: [],
    notFound: [],
    failed: [],
  }

  // 逐個下載，避免過多並發
  for (const itemId of MISSING_ITEM_IDS) {
    const result = await downloadImage(itemId)

    if (result.status === 'success') results.success.push(result.itemId)
    else if (result.status === 'skipped') results.skipped.push(result.itemId)
    else if (result.status === '404') results.notFound.push(result.itemId)
    else results.failed.push(result.itemId)

    // 延遲 300ms 避免請求太快
    await new Promise((resolve) => setTimeout(resolve, 300))
  }

  return results
}

downloadAll().then((results) => {
  console.log('\n' + '='.repeat(50))
  console.log('Results:')
  console.log('='.repeat(50))
  console.log(`  Downloaded: ${results.success.length}`)
  console.log(`  Skipped:    ${results.skipped.length}`)
  console.log(`  Not found:  ${results.notFound.length}`)
  console.log(`  Failed:     ${results.failed.length}`)
  console.log('='.repeat(50))

  if (results.success.length > 0) {
    console.log(`\nSuccessfully downloaded: ${results.success.join(', ')}`)
  }
  if (results.notFound.length > 0) {
    console.log(`\nNot found (404): ${results.notFound.join(', ')}`)
  }
  console.log(`\nImages saved to: ${outputDir}`)
})
