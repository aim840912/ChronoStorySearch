/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs')
const path = require('path')
const https = require('https')

// 路徑設定
const dropsJsonPath = path.join(__dirname, '../public/data/drops.json')
const outputDir = path.join(__dirname, '../public/images/items')

// 確保輸出目錄存在
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true })
  console.log(`✓ 建立目錄: ${outputDir}`)
}

// 讀取掉落資料
const dropsData = JSON.parse(fs.readFileSync(dropsJsonPath, 'utf8'))

// 獲取所有獨特的物品 ID（排除 0，也就是 Meso）
const uniqueItemIds = [
  ...new Set(dropsData.map((drop) => drop.itemId).filter((id) => id !== 0)),
].sort((a, b) => a - b)

console.log(`\n找到 ${uniqueItemIds.length} 個獨特物品 ID（排除 Meso）`)
console.log('開始下載圖示...\n')

// 下載單張圖片
function downloadImage(itemId) {
  return new Promise((resolve) => {
    const url = `https://api.maplestory.net/item/${itemId}/icon`
    const outputPath = path.join(outputDir, `${itemId}.png`)

    // 如果檔案已存在，跳過
    if (fs.existsSync(outputPath)) {
      console.log(`⏭️  跳過 ${itemId} (已存在)`)
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
            console.log(`✅ 下載成功: ${itemId}.png`)
            resolve({ itemId, status: 'success' })
          })
        } else if (response.statusCode === 404) {
          console.log(`❌ 無圖示: ${itemId} (404)`)
          resolve({ itemId, status: '404' })
        } else {
          console.log(`⚠️  錯誤 ${response.statusCode}: ${itemId}`)
          resolve({ itemId, status: 'error', code: response.statusCode })
        }
      })
      .on('error', (error) => {
        console.log(`❌ 下載失敗: ${itemId} - ${error.message}`)
        resolve({ itemId, status: 'failed', error: error.message })
      })
  })
}

// 批次下載（每次 20 個，避免過多並發）
async function downloadAll() {
  const results = {
    success: [],
    skipped: [],
    notFound: [],
    failed: [],
  }

  const batchSize = 20
  for (let i = 0; i < uniqueItemIds.length; i += batchSize) {
    const batch = uniqueItemIds.slice(i, i + batchSize)
    const batchResults = await Promise.all(batch.map(downloadImage))

    batchResults.forEach((result) => {
      if (result.status === 'success') results.success.push(result.itemId)
      else if (result.status === 'skipped') results.skipped.push(result.itemId)
      else if (result.status === '404') results.notFound.push(result.itemId)
      else results.failed.push(result.itemId)
    })

    // 稍微延遲避免請求太快
    if (i + batchSize < uniqueItemIds.length) {
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  }

  return results
}

// 執行下載
downloadAll().then((results) => {
  console.log('\n' + '='.repeat(50))
  console.log('下載完成！統計結果：')
  console.log('='.repeat(50))
  console.log(`✅ 成功下載: ${results.success.length} 個`)
  console.log(`⏭️  已存在跳過: ${results.skipped.length} 個`)
  console.log(`❌ 無圖示 (404): ${results.notFound.length} 個`)
  console.log(`⚠️  下載失敗: ${results.failed.length} 個`)
  console.log('='.repeat(50))

  // 儲存缺失圖示清單
  if (results.notFound.length > 0) {
    const missingListPath = path.join(outputDir, 'missing-icons.json')
    fs.writeFileSync(
      missingListPath,
      JSON.stringify(results.notFound, null, 2),
      'utf8'
    )
    console.log(`\n📝 缺失圖示清單已儲存: missing-icons.json`)
    console.log(`缺失的物品 ID (前 20 個): ${results.notFound.slice(0, 20).join(', ')}${results.notFound.length > 20 ? '...' : ''}`)
  }

  console.log(`\n✓ 圖示已儲存至: ${outputDir}`)
})
