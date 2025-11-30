const fs = require('fs')
const path = require('path')
const https = require('https')

// Ludibrium-Clocktower 怪物 ID 列表
const ludibiumMobIds = [
  3000005, 3110101, 3110102, 3210204, 3210205, 3210207, 3210203, 3230306,
  3230305, 4230113, 4230111, 4230114, 4230112, 4230115, 5220003, 6130200,
  6230400, 6230300, 6230500, 8140200, 6300100, 8140300, 6400100, 7140000,
  7130010, 7160000, 7130300, 8141000, 8142000, 8141100, 8143000, 8160000,
  8170000, 8500002
]

const outputDir = path.join(__dirname, '../public/images/monsters')

// 確保輸出目錄存在
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true })
  console.log(`✓ 建立目錄: ${outputDir}`)
}

// 下載單張圖片
function downloadImage(mobId) {
  return new Promise((resolve) => {
    const url = `https://api.maplestory.net/monster/${mobId}/icon`
    const outputPath = path.join(outputDir, `${mobId}.png`)

    // 如果檔案已存在，跳過
    if (fs.existsSync(outputPath)) {
      console.log(`⏭️  跳過 ${mobId} (已存在)`)
      resolve({ mobId, status: 'skipped' })
      return
    }

    https
      .get(url, (response) => {
        if (response.statusCode === 200) {
          const fileStream = fs.createWriteStream(outputPath)
          response.pipe(fileStream)

          fileStream.on('finish', () => {
            fileStream.close()
            console.log(`✅ 下載成功: ${mobId}.png`)
            resolve({ mobId, status: 'success' })
          })
        } else if (response.statusCode === 404) {
          console.log(`❌ 無圖示: ${mobId} (404)`)
          resolve({ mobId, status: '404' })
        } else {
          console.log(`⚠️  錯誤 ${response.statusCode}: ${mobId}`)
          resolve({ mobId, status: 'error', code: response.statusCode })
        }
      })
      .on('error', (error) => {
        console.log(`❌ 下載失敗: ${mobId} - ${error.message}`)
        resolve({ mobId, status: 'failed', error: error.message })
      })
  })
}

// 批次下載
async function downloadAll() {
  console.log('🚀 開始下載 Ludibrium-Clocktower 怪物圖示')
  console.log(`📊 總共 ${ludibiumMobIds.length} 個怪物`)
  console.log(`📁 輸出目錄: ${outputDir}`)
  console.log('─'.repeat(50))

  const results = {
    success: [],
    skipped: [],
    notFound: [],
    failed: [],
  }

  const batchSize = 5
  for (let i = 0; i < ludibiumMobIds.length; i += batchSize) {
    const batch = ludibiumMobIds.slice(i, i + batchSize)
    const batchResults = await Promise.all(batch.map(downloadImage))

    batchResults.forEach((result) => {
      if (result.status === 'success') results.success.push(result.mobId)
      else if (result.status === 'skipped') results.skipped.push(result.mobId)
      else if (result.status === '404') results.notFound.push(result.mobId)
      else results.failed.push(result.mobId)
    })

    // 稍微延遲避免請求太快
    if (i + batchSize < ludibiumMobIds.length) {
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  }

  return results
}

// 執行下載
downloadAll().then((results) => {
  console.log('\n' + '═'.repeat(50))
  console.log('📊 下載完成！統計結果：')
  console.log('═'.repeat(50))
  console.log(`✅ 成功下載: ${results.success.length} 個`)
  console.log(`⏭️  已存在跳過: ${results.skipped.length} 個`)
  console.log(`❌ 無圖示 (404): ${results.notFound.length} 個`)
  console.log(`⚠️  下載失敗: ${results.failed.length} 個`)
  console.log('═'.repeat(50))

  if (results.notFound.length > 0) {
    console.log(`\n缺失的怪物 ID: ${results.notFound.join(', ')}`)
  }

  console.log(`\n✓ 圖示已儲存至: ${outputDir}`)
})
