#!/usr/bin/env node
/**
 * Artale 圖片同步腳本
 *
 * 功能：
 * 1. 從 artaleData/monster-index.json 和 artaleData/item-index.json 讀取名稱
 * 2. 從 GitHub Pages 下載圖片
 * 3. 儲存到 artaleImages/ 目錄
 * 4. 產生 artale-available-images.json 清單
 *
 * 使用方式：
 * npm run artale:sync-images
 */

const fs = require('fs')
const path = require('path')
const https = require('https')

// 設定
const GITHUB_PAGES_BASE = 'https://a2983456456.github.io/artale-drop/image'
const OUTPUT_DIR = path.join(__dirname, '..', 'artaleImages')
const MANIFEST_PATH = path.join(__dirname, '..', 'data', 'artale-available-images.json')

// 並發控制
const CONCURRENT_DOWNLOADS = 10
const RETRY_COUNT = 3
const RETRY_DELAY = 1000 // ms

// 顏色輸出
const colors = {
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  cyan: (text) => `\x1b[36m${text}\x1b[0m`,
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
}

/**
 * 確保目錄存在
 */
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
    console.log(colors.cyan(`📁 建立目錄: ${dirPath}`))
  }
}

/**
 * 延遲函數
 */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 下載單一圖片
 */
function downloadImage(name, retries = RETRY_COUNT) {
  return new Promise((resolve) => {
    const encodedName = encodeURIComponent(name)
    const url = `${GITHUB_PAGES_BASE}/${encodedName}.png`
    const outputPath = path.join(OUTPUT_DIR, `${name}.png`)

    // 如果檔案已存在，跳過下載
    if (fs.existsSync(outputPath)) {
      resolve({ name, status: 'skipped', reason: 'exists' })
      return
    }

    const request = https.get(url, (response) => {
      if (response.statusCode === 200) {
        const file = fs.createWriteStream(outputPath)
        response.pipe(file)
        file.on('finish', () => {
          file.close()
          resolve({ name, status: 'success' })
        })
        file.on('error', (err) => {
          fs.unlink(outputPath, () => {})
          resolve({ name, status: 'error', reason: err.message })
        })
      } else if (response.statusCode === 404) {
        resolve({ name, status: 'not_found' })
      } else if (retries > 0) {
        delay(RETRY_DELAY).then(() => {
          downloadImage(name, retries - 1).then(resolve)
        })
      } else {
        resolve({ name, status: 'error', reason: `HTTP ${response.statusCode}` })
      }
    })

    request.on('error', (err) => {
      if (retries > 0) {
        delay(RETRY_DELAY).then(() => {
          downloadImage(name, retries - 1).then(resolve)
        })
      } else {
        resolve({ name, status: 'error', reason: err.message })
      }
    })

    request.setTimeout(30000, () => {
      request.destroy()
      if (retries > 0) {
        delay(RETRY_DELAY).then(() => {
          downloadImage(name, retries - 1).then(resolve)
        })
      } else {
        resolve({ name, status: 'error', reason: 'timeout' })
      }
    })
  })
}

/**
 * 批次下載（控制並發）
 */
async function downloadBatch(names, onProgress) {
  const results = []
  const queue = [...names]
  let completed = 0

  async function worker() {
    while (queue.length > 0) {
      const name = queue.shift()
      if (!name) break

      const result = await downloadImage(name)
      results.push(result)
      completed++
      onProgress(completed, names.length, result)
    }
  }

  // 啟動並發 workers
  const workers = []
  for (let i = 0; i < CONCURRENT_DOWNLOADS; i++) {
    workers.push(worker())
  }

  await Promise.all(workers)
  return results
}

/**
 * 從 JSON 檔案讀取名稱列表
 */
function loadNames() {
  const names = new Set()

  // 讀取怪物名稱
  const monsterIndexPath = path.join(__dirname, '..', 'artaleData', 'monster-index.json')
  if (fs.existsSync(monsterIndexPath)) {
    const monsterData = JSON.parse(fs.readFileSync(monsterIndexPath, 'utf-8'))
    monsterData.monsters.forEach((monster) => {
      if (monster.chineseMobName) {
        names.add(monster.chineseMobName)
      }
    })
    console.log(colors.cyan(`📋 載入 ${monsterData.monsters.length} 隻怪物`))
  }

  // 讀取物品名稱
  const itemIndexPath = path.join(__dirname, '..', 'artaleData', 'item-index.json')
  if (fs.existsSync(itemIndexPath)) {
    const itemData = JSON.parse(fs.readFileSync(itemIndexPath, 'utf-8'))
    itemData.items.forEach((item) => {
      if (item.chineseItemName) {
        names.add(item.chineseItemName)
      }
    })
    console.log(colors.cyan(`📋 載入 ${itemData.items.length} 個物品`))
  }

  return Array.from(names)
}

/**
 * 產生圖片清單 JSON
 */
function generateManifest(successfulNames) {
  const manifest = {
    images: successfulNames.sort(),
    totalCount: successfulNames.length,
    lastUpdated: new Date().toISOString(),
  }

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2))
  console.log(colors.green(`\n✅ 已產生圖片清單: ${MANIFEST_PATH}`))
  console.log(colors.green(`   共 ${manifest.totalCount} 張圖片`))
}

/**
 * 主程式
 */
async function main() {
  console.log(colors.blue('\n🖼️  Artale 圖片同步工具\n'))

  // 確保輸出目錄存在
  ensureDir(OUTPUT_DIR)

  // 載入名稱列表
  const names = loadNames()
  console.log(colors.cyan(`\n📊 共需下載 ${names.length} 張圖片\n`))

  if (names.length === 0) {
    console.log(colors.yellow('⚠️  沒有找到任何圖片名稱'))
    return
  }

  // 統計
  const stats = {
    success: 0,
    skipped: 0,
    notFound: 0,
    error: 0,
  }
  const successfulNames = []

  // 進度回調
  const onProgress = (completed, total, result) => {
    const percent = Math.round((completed / total) * 100)
    const statusIcon =
      result.status === 'success'
        ? colors.green('✓')
        : result.status === 'skipped'
          ? colors.yellow('○')
          : result.status === 'not_found'
            ? colors.red('✗')
            : colors.red('!')

    // 更新統計
    if (result.status === 'success') {
      stats.success++
      successfulNames.push(result.name)
    } else if (result.status === 'skipped') {
      stats.skipped++
      successfulNames.push(result.name)
    } else if (result.status === 'not_found') {
      stats.notFound++
    } else {
      stats.error++
    }

    // 每 50 個輸出一次進度
    if (completed % 50 === 0 || completed === total) {
      process.stdout.write(
        `\r${colors.cyan(`[${percent}%]`)} ${completed}/${total} | ` +
          `${colors.green(`成功: ${stats.success}`)} | ` +
          `${colors.yellow(`跳過: ${stats.skipped}`)} | ` +
          `${colors.red(`未找到: ${stats.notFound}`)} | ` +
          `${colors.red(`錯誤: ${stats.error}`)}`
      )
    }
  }

  // 開始下載
  const startTime = Date.now()
  await downloadBatch(names, onProgress)
  const duration = ((Date.now() - startTime) / 1000).toFixed(1)

  // 輸出最終統計
  console.log('\n')
  console.log(colors.blue('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'))
  console.log(colors.blue('📊 同步完成統計'))
  console.log(colors.blue('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'))
  console.log(colors.green(`  ✓ 下載成功: ${stats.success}`))
  console.log(colors.yellow(`  ○ 已跳過:   ${stats.skipped}`))
  console.log(colors.red(`  ✗ 未找到:   ${stats.notFound}`))
  console.log(colors.red(`  ! 錯誤:     ${stats.error}`))
  console.log(colors.cyan(`  ⏱️  耗時:     ${duration} 秒`))

  // 產生清單
  generateManifest(successfulNames)

  console.log(colors.green('\n🎉 同步完成！\n'))
}

main().catch((err) => {
  console.error(colors.red(`\n❌ 執行失敗: ${err.message}\n`))
  process.exit(1)
})
