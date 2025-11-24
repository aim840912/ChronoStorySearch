/**
 * 下載怪物 GIF 動圖腳本
 * 從 maplestory.io API 下載怪物的站立動畫 GIF
 *
 * 使用方式：npx tsx scripts/download-monster-gifs.ts
 */

import * as fs from 'fs'
import * as path from 'path'

// 讀取可用的怪物圖片列表
const availableImages = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../data/available-images.json'), 'utf-8')
)

const monsterIds: number[] = availableImages.monsters
const outputDir = path.join(__dirname, '../public/images/monsters-gif')
const failedFile = path.join(__dirname, '../data/monsters-gif-failed.json')

// 確保輸出目錄存在
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true })
}

interface DownloadResult {
  success: number[]
  failed: number[]
  skipped: number[]
}

async function downloadGif(mobId: number): Promise<boolean> {
  const url = `https://maplestory.io/api/jms/419/mob/${mobId}/render/stand`
  const outputPath = path.join(outputDir, `${mobId}.gif`)

  // 如果檔案已存在，跳過
  if (fs.existsSync(outputPath)) {
    return true // 標記為成功（已存在）
  }

  try {
    const response = await fetch(url)

    if (!response.ok) {
      console.error(`❌ ${mobId}: HTTP ${response.status}`)
      return false
    }

    const contentType = response.headers.get('content-type')
    if (!contentType?.includes('image/gif')) {
      console.error(`❌ ${mobId}: 不是 GIF 格式 (${contentType})`)
      return false
    }

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    fs.writeFileSync(outputPath, buffer)
    console.log(`✅ ${mobId}: 下載成功 (${(buffer.length / 1024).toFixed(1)} KB)`)
    return true
  } catch (error) {
    console.error(`❌ ${mobId}: ${error instanceof Error ? error.message : '未知錯誤'}`)
    return false
  }
}

async function main() {
  console.log('🚀 開始下載怪物 GIF 動圖')
  console.log(`📊 總共 ${monsterIds.length} 個怪物`)
  console.log(`📁 輸出目錄: ${outputDir}`)
  console.log('─'.repeat(50))

  const result: DownloadResult = {
    success: [],
    failed: [],
    skipped: []
  }

  // 檢查已存在的檔案
  for (const mobId of monsterIds) {
    const outputPath = path.join(outputDir, `${mobId}.gif`)
    if (fs.existsSync(outputPath)) {
      result.skipped.push(mobId)
    }
  }

  if (result.skipped.length > 0) {
    console.log(`⏭️  跳過已存在: ${result.skipped.length} 個`)
  }

  // 下載未存在的檔案
  const toDownload = monsterIds.filter(id => !result.skipped.includes(id))

  for (let i = 0; i < toDownload.length; i++) {
    const mobId = toDownload[i]
    console.log(`[${i + 1}/${toDownload.length}] 下載 ${mobId}...`)

    const success = await downloadGif(mobId)
    if (success) {
      result.success.push(mobId)
    } else {
      result.failed.push(mobId)
    }

    // 避免請求過快
    await new Promise(resolve => setTimeout(resolve, 200))
  }

  // 儲存失敗列表
  if (result.failed.length > 0) {
    fs.writeFileSync(failedFile, JSON.stringify(result.failed, null, 2))
    console.log(`\n💾 失敗列表已儲存到: ${failedFile}`)
  }

  // 輸出統計
  console.log('\n' + '═'.repeat(50))
  console.log('📊 下載統計')
  console.log('═'.repeat(50))
  console.log(`✅ 成功: ${result.success.length + result.skipped.length}`)
  console.log(`   - 新下載: ${result.success.length}`)
  console.log(`   - 已存在: ${result.skipped.length}`)
  console.log(`❌ 失敗: ${result.failed.length}`)

  if (result.failed.length > 0) {
    console.log(`\n失敗的怪物 ID: ${result.failed.join(', ')}`)
  }

  // 更新 available-images.json 新增 monsters-gif 列表
  const successIds = [...result.success, ...result.skipped].sort((a, b) => a - b)
  availableImages['monsters-gif'] = successIds

  fs.writeFileSync(
    path.join(__dirname, '../data/available-images.json'),
    JSON.stringify(availableImages, null, 2)
  )
  console.log('\n✅ 已更新 available-images.json')
}

main().catch(console.error)
