const fs = require('fs')
const path = require('path')
const https = require('https')

/**
 * 物品圖片下載腳本
 * 從 MapleStory.io API 下載物品圖片
 *
 * 使用方式：node scripts/download-item-images.js
 */

// MapleStory.io API 設定
const MAPLESTORY_IO_API = 'https://maplestory.io/api/GMS/83/item'

// 輸出目錄
const OUTPUT_DIR = path.join(__dirname, '../public/images/items')

// 並行下載數量（避免過多請求被封鎖）
const CONCURRENT_DOWNLOADS = 5

// 請求間隔（毫秒）
const REQUEST_DELAY = 100

// 重試次數
const MAX_RETRIES = 3

/**
 * 確保目錄存在
 */
function ensureDirectoryExists(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
    console.log(`📁 建立目錄: ${dir}`)
  }
}

/**
 * 延遲函數
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 下載單張圖片
 */
function downloadImage(itemId, retries = 0) {
  return new Promise((resolve, reject) => {
    const url = `${MAPLESTORY_IO_API}/${itemId}/icon`
    const outputPath = path.join(OUTPUT_DIR, `${itemId}.png`)

    // 如果檔案已存在，跳過
    if (fs.existsSync(outputPath)) {
      resolve({ itemId, status: 'skipped', reason: 'exists' })
      return
    }

    https.get(url, (response) => {
      // 處理重定向
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location
        https.get(redirectUrl, (redirectResponse) => {
          handleResponse(redirectResponse, itemId, outputPath, resolve, reject, retries)
        }).on('error', (error) => {
          handleError(error, itemId, retries, resolve, reject)
        })
        return
      }

      handleResponse(response, itemId, outputPath, resolve, reject, retries)
    }).on('error', (error) => {
      handleError(error, itemId, retries, resolve, reject)
    })
  })
}

/**
 * 處理 HTTP 回應
 */
function handleResponse(response, itemId, outputPath, resolve, reject, retries) {
  if (response.statusCode === 200) {
    const fileStream = fs.createWriteStream(outputPath)
    response.pipe(fileStream)

    fileStream.on('finish', () => {
      fileStream.close()
      resolve({ itemId, status: 'success' })
    })

    fileStream.on('error', (error) => {
      fs.unlink(outputPath, () => {}) // 刪除不完整的檔案
      handleError(error, itemId, retries, resolve, reject)
    })
  } else if (response.statusCode === 404) {
    resolve({ itemId, status: 'not_found' })
  } else if (response.statusCode === 429) {
    // 速率限制，等待後重試
    handleError(new Error('Rate limited'), itemId, retries, resolve, reject, 5000)
  } else {
    resolve({ itemId, status: 'error', code: response.statusCode })
  }
}

/**
 * 處理錯誤
 */
function handleError(error, itemId, retries, resolve, reject, extraDelay = 0) {
  if (retries < MAX_RETRIES) {
    delay(1000 + extraDelay).then(() => {
      downloadImage(itemId, retries + 1).then(resolve).catch(reject)
    })
  } else {
    resolve({ itemId, status: 'failed', error: error.message })
  }
}

/**
 * 批量下載（控制並行數）
 */
async function downloadBatch(itemIds, startIndex, batchSize) {
  const batch = itemIds.slice(startIndex, startIndex + batchSize)
  const results = await Promise.all(batch.map(id => downloadImage(id)))
  return results
}

/**
 * 主程式
 */
async function main() {
  console.log('🚀 開始下載物品圖片...')
  console.log(`📡 API: ${MAPLESTORY_IO_API}`)
  console.log(`📁 輸出目錄: ${OUTPUT_DIR}`)
  console.log('')

  // 確保輸出目錄存在
  ensureDirectoryExists(OUTPUT_DIR)

  // 讀取物品 ID 清單
  const manifestPath = path.join(__dirname, '../data/available-images.json')
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
  const itemIds = manifest.items.filter(id => id !== 0) // 排除 ID 0

  console.log(`📋 總共需要下載 ${itemIds.length} 張圖片`)
  console.log('')

  // 統計
  const stats = {
    success: 0,
    skipped: 0,
    not_found: 0,
    failed: 0,
    error: 0
  }

  // 批量下載
  const batchSize = CONCURRENT_DOWNLOADS
  let processed = 0

  for (let i = 0; i < itemIds.length; i += batchSize) {
    const results = await downloadBatch(itemIds, i, batchSize)

    results.forEach(result => {
      stats[result.status] = (stats[result.status] || 0) + 1
    })

    processed += results.length

    // 顯示進度
    const progress = ((processed / itemIds.length) * 100).toFixed(1)
    process.stdout.write(`\r⏳ 進度: ${processed}/${itemIds.length} (${progress}%) | ✅ ${stats.success} | ⏭️ ${stats.skipped} | ❌ ${stats.not_found + stats.failed}`)

    // 延遲避免速率限制
    if (i + batchSize < itemIds.length) {
      await delay(REQUEST_DELAY)
    }
  }

  console.log('\n')
  console.log('📊 下載統計:')
  console.log(`   ✅ 成功: ${stats.success}`)
  console.log(`   ⏭️ 已存在（跳過）: ${stats.skipped}`)
  console.log(`   ❌ 找不到: ${stats.not_found}`)
  console.log(`   ⚠️ 失敗: ${stats.failed}`)
  console.log(`   🔴 錯誤: ${stats.error || 0}`)
  console.log('')
  console.log('✨ 完成！')
  console.log('')
  console.log('下一步：')
  console.log('1. 使用 rclone 上傳到 R2: rclone copy public/images/items/ r2:maplestory-images/images/items/')
  console.log('2. 重新生成清單: node scripts/generate-image-manifest.js')
}

main().catch(console.error)
