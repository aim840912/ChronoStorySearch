/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * 從 MapleStory API 獲取怪物屬性資料
 * 輸出到 public/data/monster-stats.json
 */

const fs = require('fs')
const path = require('path')

// API 配置
const API_BASE_URL = 'https://maplestory.io/api/GMS/75/mob'
const REQUEST_DELAY_MS = 500 // 每次請求間隔 500ms
const MAX_RETRIES = 3 // 最大重試次數

// 檔案路徑
const DROPS_FILE = path.join(process.cwd(), 'public', 'data', 'drops.json')
const OUTPUT_FILE = path.join(process.cwd(), 'public', 'data', 'monster-stats.json')

/**
 * 延遲函數
 */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 獲取單一怪物資料（帶重試機制）
 */
async function fetchMonsterData(mobId, retries = MAX_RETRIES) {
  try {
    const response = await fetch(`${API_BASE_URL}/${mobId}`)

    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`⚠️  怪物 ID ${mobId} 不存在於 API`)
        return null
      }
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()

    // 提取需要的欄位
    return {
      mobId: data.id,
      name: data.name,
      chineseMobName: null, // 稍後從 drops.json 填入
      level: data.meta?.level ?? 0,
      maxHP: data.meta?.maxHP ?? 0,
      maxMP: data.meta?.maxMP ?? 0,
      speed: data.meta?.speed ?? 0,
      physicalDamage: data.meta?.physicalDamage ?? 0,
      physicalDefense: data.meta?.physicalDefense ?? 0,
      magicDamage: data.meta?.magicDamage ?? 0,
      magicDefense: data.meta?.magicDefense ?? 0,
      accuracy: data.meta?.accuracy ?? 0,
      evasion: data.meta?.evasion ?? 0,
      exp: data.meta?.exp ?? 0,
      minimumPushDamage: data.meta?.minimumPushDamage ?? 0,
    }
  } catch (error) {
    if (retries > 0) {
      console.warn(`⚠️  怪物 ID ${mobId} 失敗，重試 ${MAX_RETRIES - retries + 1}/${MAX_RETRIES}...`)
      await delay(1000) // 重試前等待 1 秒
      return fetchMonsterData(mobId, retries - 1)
    }

    console.error(`❌ 怪物 ID ${mobId} 請求失敗: ${error.message}`)
    return null
  }
}

/**
 * 主函數
 */
async function main() {
  console.log('📖 讀取 drops.json...')

  // 讀取 drops.json
  const dropsData = JSON.parse(fs.readFileSync(DROPS_FILE, 'utf8'))

  // 提取不重複的 mobId
  const uniqueMobIds = [...new Set(dropsData.map((drop) => drop.mobId))].sort((a, b) => a - b)
  console.log(`✅ 找到 ${uniqueMobIds.length} 個不重複的怪物 ID`)

  // 建立 mobId → chineseMobName 對應表
  const chineseNameMap = new Map()
  dropsData.forEach((drop) => {
    if (drop.chineseMobName && !chineseNameMap.has(drop.mobId)) {
      chineseNameMap.set(drop.mobId, drop.chineseMobName)
    }
  })
  console.log(`✅ 建立中文名稱對應表（${chineseNameMap.size} 個）`)

  // 備份現有檔案
  if (fs.existsSync(OUTPUT_FILE)) {
    const backupFile = `${OUTPUT_FILE}.backup`
    fs.copyFileSync(OUTPUT_FILE, backupFile)
    console.log(`💾 備份現有檔案到 ${path.basename(backupFile)}`)
  }

  console.log('\n🚀 開始獲取怪物資料...')
  console.log(`⏱️  預計時間：約 ${Math.ceil((uniqueMobIds.length * REQUEST_DELAY_MS) / 1000)} 秒\n`)

  const monsterStats = []
  let successCount = 0
  let failedCount = 0
  const failedIds = []

  // 批次獲取資料
  for (let i = 0; i < uniqueMobIds.length; i++) {
    const mobId = uniqueMobIds[i]
    const progress = `[${i + 1}/${uniqueMobIds.length}]`

    process.stdout.write(`${progress} 獲取怪物 ID ${mobId}...`)

    const monsterData = await fetchMonsterData(mobId)

    if (monsterData) {
      // 填入中文名稱
      monsterData.chineseMobName = chineseNameMap.get(mobId) || null
      monsterStats.push(monsterData)
      successCount++
      console.log(` ✅ ${monsterData.name}`)
    } else {
      // 保留空資料
      monsterStats.push({
        mobId,
        name: null,
        chineseMobName: chineseNameMap.get(mobId) || null,
        level: null,
        maxHP: null,
        maxMP: null,
        speed: null,
        physicalDamage: null,
        physicalDefense: null,
        magicDamage: null,
        magicDefense: null,
        accuracy: null,
        evasion: null,
        exp: null,
        minimumPushDamage: null,
      })
      failedCount++
      failedIds.push(mobId)
      console.log(` ❌`)
    }

    // 延遲避免 API rate limit
    if (i < uniqueMobIds.length - 1) {
      await delay(REQUEST_DELAY_MS)
    }
  }

  // 儲存結果
  console.log('\n💾 儲存資料到 monster-stats.json...')
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(monsterStats, null, 2), 'utf8')

  // 統計報告
  console.log('\n✅ 完成！')
  console.log('─────────────────────────────────')
  console.log(`📊 成功獲取: ${successCount} 個怪物`)
  console.log(`❌ 失敗/不存在: ${failedCount} 個怪物`)
  console.log(`📁 輸出檔案: ${path.relative(process.cwd(), OUTPUT_FILE)}`)
  console.log(`📦 檔案大小: ${(fs.statSync(OUTPUT_FILE).size / 1024).toFixed(2)} KB`)

  if (failedIds.length > 0) {
    console.log(`\n⚠️  失敗的怪物 ID: ${failedIds.join(', ')}`)
  }
}

// 執行
main().catch((error) => {
  console.error('❌ 腳本執行失敗:', error)
  process.exit(1)
})
