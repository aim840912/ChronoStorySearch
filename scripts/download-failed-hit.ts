import * as fs from 'fs'
import * as path from 'path'

const BASE_URL = 'https://maplestory.io/api'

// 讀取先前下載結果中的失敗清單
const resultPath = path.join(__dirname, '../data/monsters-animations-result.json')
const animationResult = JSON.parse(fs.readFileSync(resultPath, 'utf-8'))
const failedHitIds: number[] = animationResult['failed-hit'] || []

console.log(`Found ${failedHitIds.length} failed hit animations to retry`)

// 輸出目錄
const outputDir = path.join(__dirname, '../public/images/monsters-hit')

// 確保目錄存在
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true })
}

// 下載函數（帶重試機制）
async function downloadHitAnimation(mobId: number, maxRetries: number = 3): Promise<boolean> {
  const versions = ['gms/83', 'GMS/240', 'jms/419']

  for (let retry = 0; retry < maxRetries; retry++) {
    for (const version of versions) {
      const url = `${BASE_URL}/${version}/mob/${mobId}/render/hit1`

      try {
        const response = await fetch(url)

        if (response.ok) {
          const contentType = response.headers.get('content-type')

          // 檢查是否為圖片（image/gif 或 image/png）
          if (contentType && contentType.includes('image')) {
            const buffer = await response.arrayBuffer()
            const outputPath = path.join(outputDir, `${mobId}.gif`)
            fs.writeFileSync(outputPath, Buffer.from(buffer))
            return true
          }
        } else if (response.status === 429) {
          // 速率限制，等待後重試
          const waitTime = Math.pow(2, retry) * 1000 // 指數退避：1s, 2s, 4s
          console.log(`  Rate limited on ${mobId}, waiting ${waitTime}ms...`)
          await new Promise(resolve => setTimeout(resolve, waitTime))
          break // 跳出 version 迴圈，開始新一輪重試
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        console.log(`  Error downloading ${mobId} from ${version}: ${errorMsg}`)
      }
    }

    // 如果所有版本都失敗，等待後重試
    if (retry < maxRetries - 1) {
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }

  return false
}

// 主函數
async function main() {
  const success: number[] = []
  const failed: number[] = []

  console.log('\nStarting hit animation download with improved rate limiting...')
  console.log(`Delay: 500ms between requests, with exponential backoff on errors\n`)

  for (let i = 0; i < failedHitIds.length; i++) {
    const mobId = failedHitIds[i]
    const result = await downloadHitAnimation(mobId)

    if (result) {
      success.push(mobId)
      console.log(`[${i + 1}/${failedHitIds.length}] ${mobId} - SUCCESS`)
    } else {
      failed.push(mobId)
      console.log(`[${i + 1}/${failedHitIds.length}] ${mobId} - FAILED`)
    }

    // 每個請求之間等待 500ms
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  // 輸出結果
  console.log('\n=== Download Results ===')
  console.log(`Success: ${success.length}`)
  console.log(`Failed: ${failed.length}`)

  if (failed.length > 0 && failed.length <= 20) {
    console.log(`Failed IDs: ${failed.join(', ')}`)
  }

  // 讀取現有成功清單並合併
  const existingHit = animationResult['monsters-hit'] || []
  const allSuccess = [...existingHit, ...success].sort((a, b) => a - b)

  // 更新結果檔案
  const updatedResult = {
    ...animationResult,
    'monsters-hit': allSuccess,
    'failed-hit': failed
  }

  fs.writeFileSync(resultPath, JSON.stringify(updatedResult, null, 2))
  console.log(`\nResults saved to ${resultPath}`)
  console.log(`Total hit animations now: ${allSuccess.length}`)
}

main().catch(console.error)
