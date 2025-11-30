const fs = require('fs')
const path = require('path')

// Ludibrium-Clocktower 怪物 ID 列表
const ludibiumMobIds = [
  3000005, 3110101, 3110102, 3210204, 3210205, 3210207, 3210203, 3230306,
  3230305, 4230113, 4230111, 4230114, 4230112, 4230115, 5220003, 6130200,
  6230400, 6230300, 6230500, 8140200, 6300100, 8140300, 6400100, 7140000,
  7130010, 7160000, 7130300, 8141000, 8142000, 8141100, 8143000, 8160000,
  8170000, 8500002
]

const outputDir = path.join(__dirname, '../public/images/monsters-gif')

// 確保輸出目錄存在
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true })
  console.log(`✓ 建立目錄: ${outputDir}`)
}

async function downloadGif(mobId) {
  const url = `https://maplestory.io/api/jms/419/mob/${mobId}/render/stand`
  const outputPath = path.join(outputDir, `${mobId}.gif`)

  // 如果檔案已存在，跳過
  if (fs.existsSync(outputPath)) {
    console.log(`⏭️  跳過 ${mobId} (已存在)`)
    return { mobId, status: 'skipped' }
  }

  try {
    const response = await fetch(url)

    if (!response.ok) {
      console.log(`❌ ${mobId}: HTTP ${response.status}`)
      return { mobId, status: 'error', code: response.status }
    }

    const contentType = response.headers.get('content-type')
    if (!contentType?.includes('image/gif')) {
      console.log(`❌ ${mobId}: 不是 GIF 格式 (${contentType})`)
      return { mobId, status: 'invalid' }
    }

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    fs.writeFileSync(outputPath, buffer)
    console.log(`✅ ${mobId}: 下載成功 (${(buffer.length / 1024).toFixed(1)} KB)`)
    return { mobId, status: 'success' }
  } catch (error) {
    console.log(`❌ ${mobId}: ${error.message}`)
    return { mobId, status: 'failed', error: error.message }
  }
}

async function main() {
  console.log('🚀 開始下載 Ludibrium-Clocktower 怪物 GIF 動圖')
  console.log(`📊 總共 ${ludibiumMobIds.length} 個怪物`)
  console.log(`📁 輸出目錄: ${outputDir}`)
  console.log('─'.repeat(50))

  const results = {
    success: [],
    skipped: [],
    failed: []
  }

  for (let i = 0; i < ludibiumMobIds.length; i++) {
    const mobId = ludibiumMobIds[i]
    console.log(`[${i + 1}/${ludibiumMobIds.length}] 下載 ${mobId}...`)

    const result = await downloadGif(mobId)
    if (result.status === 'success') results.success.push(mobId)
    else if (result.status === 'skipped') results.skipped.push(mobId)
    else results.failed.push(mobId)

    // 避免請求太快
    await new Promise(resolve => setTimeout(resolve, 300))
  }

  console.log('\n' + '═'.repeat(50))
  console.log('📊 下載完成！統計結果：')
  console.log('═'.repeat(50))
  console.log(`✅ 成功: ${results.success.length + results.skipped.length}`)
  console.log(`   - 新下載: ${results.success.length}`)
  console.log(`   - 已存在: ${results.skipped.length}`)
  console.log(`❌ 失敗: ${results.failed.length}`)

  if (results.failed.length > 0) {
    console.log(`\n失敗的怪物 ID: ${results.failed.join(', ')}`)
  }

  console.log(`\n✓ GIF 已儲存至: ${outputDir}`)
}

main().catch(console.error)
