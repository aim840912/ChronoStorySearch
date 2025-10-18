/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * 從 ChronoStory API 獲取怪物詳細資訊
 * 輸出到 data/mob-info.json
 *
 * 此腳本會保留 API 回應的完整結構，包括：
 * - mob: 怪物基本資訊（mob_id, mob_name, max_hp, level, 屬性、弱點等）
 * - description: 怪物描述
 * - expBar: 經驗值相關資訊
 * 並新增 chineseMobName 欄位（從 monster-stats.json 提取）
 */

const fs = require('fs')
const path = require('path')

// API 配置
const API_BASE_URL = 'https://chronostory.onrender.com/api/mob-info'
const REQUEST_DELAY_MS = 1500 // 每次請求間隔 1.5 秒
const MAX_RETRIES = 3 // 最大重試次數
const TIMEOUT_MS = 30000 // 請求超時時間 30 秒

// 檔案路徑
const MONSTER_STATS_FILE = path.join(process.cwd(), 'data', 'monster-stats.json')
const OUTPUT_FILE = path.join(process.cwd(), 'data', 'mob-info.json')
const FAILED_LOG = path.join(process.cwd(), 'scripts', 'failed-mobs.txt')

/**
 * 延遲函數
 */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 帶超時的 fetch
 */
async function fetchWithTimeout(url, options = {}, timeout = TIMEOUT_MS) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

/**
 * 獲取單一怪物詳細資訊（帶重試機制）
 * 完整保留 API 回應的所有欄位
 */
async function fetchMobInfo(mobId, retries = MAX_RETRIES) {
  try {
    const url = `${API_BASE_URL}?mobId=${mobId}`
    const response = await fetchWithTimeout(url)

    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`⚠️  怪物 ID ${mobId} 不存在於 API`)
        return null
      }
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()

    // 完整保留 API 回應，不做任何欄位過濾
    return data
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error(`⏱️  怪物 ID ${mobId} 請求超時`)
    }

    if (retries > 0) {
      console.warn(`⚠️  怪物 ID ${mobId} 失敗，重試 ${MAX_RETRIES - retries + 1}/${MAX_RETRIES}...`)
      await delay(2000) // 重試前等待 2 秒
      return fetchMobInfo(mobId, retries - 1)
    }

    console.error(`❌ 怪物 ID ${mobId} 請求失敗: ${error.message}`)
    return null
  }
}

/**
 * 載入現有資料（支援斷點續傳）
 */
function loadExistingData() {
  if (fs.existsSync(OUTPUT_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8'))
      console.log(`📂 找到現有資料：${data.length} 個怪物`)
      return data
    } catch (error) {
      console.warn('⚠️  現有資料檔案損壞，將重新開始')
      return []
    }
  }
  return []
}

/**
 * 定期儲存資料
 */
function saveData(data) {
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(data, null, 2), 'utf8')
}

/**
 * 主函數
 */
async function main() {
  const startTime = Date.now()
  console.log('📖 讀取 monster-stats.json...')

  // 讀取 monster-stats.json
  const monsterStats = JSON.parse(fs.readFileSync(MONSTER_STATS_FILE, 'utf8'))

  // 建立 mobId → chineseMobName 對應表
  const chineseNameMap = new Map()
  monsterStats.forEach((monster) => {
    if (monster.mobId && monster.chineseMobName) {
      chineseNameMap.set(monster.mobId, monster.chineseMobName)
    }
  })
  console.log(`✅ 建立中文名稱對應表（${chineseNameMap.size} 個）`)

  // 提取所有 mobId
  const allMobIds = monsterStats.map((monster) => monster.mobId).sort((a, b) => a - b)
  console.log(`✅ 找到 ${allMobIds.length} 個怪物 ID`)

  // 載入現有資料（斷點續傳）
  const existingData = loadExistingData()
  const existingIds = new Set(
    existingData.map((item) => (item.mob && item.mob.mob_id ? parseInt(item.mob.mob_id) : null)).filter(Boolean)
  )
  const remainingIds = allMobIds.filter((id) => !existingIds.has(id))

  if (remainingIds.length === 0) {
    console.log('✅ 所有怪物資料已存在，無需獲取')
    return
  }

  console.log(`🔄 還有 ${remainingIds.length} 個怪物需要獲取`)

  // 備份現有檔案
  if (existingData.length > 0) {
    const backupFile = `${OUTPUT_FILE}.backup`
    fs.copyFileSync(OUTPUT_FILE, backupFile)
    console.log(`💾 備份現有檔案到 ${path.basename(backupFile)}`)
  }

  console.log('\n🚀 開始獲取怪物詳細資訊...')
  console.log(`⏱️  預計時間：約 ${Math.ceil((remainingIds.length * REQUEST_DELAY_MS) / 1000 / 60)} 分鐘\n`)

  const mobInfoList = [...existingData]
  let successCount = 0
  let failedCount = 0
  const failedIds = []
  let lastSaveTime = Date.now()

  // 批次獲取資料
  for (let i = 0; i < remainingIds.length; i++) {
    const mobId = remainingIds[i]
    const progress = `[${i + 1}/${remainingIds.length}]`
    const totalProgress = `[總進度: ${existingData.length + i + 1}/${allMobIds.length}]`

    process.stdout.write(`${progress} ${totalProgress} 獲取怪物 ID ${mobId}...`)

    const mobInfo = await fetchMobInfo(mobId)

    if (mobInfo) {
      // 新增 chineseMobName 欄位
      mobInfo.chineseMobName = chineseNameMap.get(mobId) || null
      mobInfoList.push(mobInfo)
      successCount++
      const mobName = mobInfo.mob?.mob_name || 'Unknown'
      const chineseName = mobInfo.chineseMobName || '無中文名'
      console.log(` ✅ ${mobName} (${chineseName})`)
    } else {
      failedCount++
      failedIds.push(mobId)
      console.log(` ❌`)
    }

    // 定期儲存（每 50 筆或每 5 分鐘）
    const timeSinceLastSave = Date.now() - lastSaveTime
    if ((i + 1) % 50 === 0 || timeSinceLastSave > 5 * 60 * 1000) {
      console.log(`\n💾 定期儲存資料...`)
      saveData(mobInfoList)
      lastSaveTime = Date.now()
    }

    // 延遲避免 API rate limit
    if (i < remainingIds.length - 1) {
      await delay(REQUEST_DELAY_MS)
    }
  }

  // 最終儲存
  console.log('\n💾 儲存最終資料到 mob-info.json...')
  saveData(mobInfoList)

  // 儲存失敗的 ID
  if (failedIds.length > 0) {
    fs.writeFileSync(FAILED_LOG, failedIds.join('\n'), 'utf8')
    console.log(`📝 失敗的怪物 ID 已儲存到 ${path.basename(FAILED_LOG)}`)
  }

  // 統計報告
  const elapsedTime = ((Date.now() - startTime) / 1000 / 60).toFixed(2)
  console.log('\n✅ 完成！')
  console.log('─────────────────────────────────')
  console.log(`📊 本次成功獲取: ${successCount} 個怪物`)
  console.log(`❌ 本次失敗/不存在: ${failedCount} 個怪物`)
  console.log(`📦 總共怪物數量: ${mobInfoList.length} 個`)
  console.log(`📁 輸出檔案: ${path.relative(process.cwd(), OUTPUT_FILE)}`)
  console.log(`📦 檔案大小: ${(fs.statSync(OUTPUT_FILE).size / 1024).toFixed(2)} KB`)
  console.log(`⏱️  執行時間: ${elapsedTime} 分鐘`)

  if (failedIds.length > 0) {
    console.log(`\n⚠️  失敗的怪物 ID (共 ${failedIds.length} 個):`)
    console.log(failedIds.slice(0, 20).join(', '))
    if (failedIds.length > 20) {
      console.log(`... 以及其他 ${failedIds.length - 20} 個`)
    }
  }
}

// 執行
main().catch((error) => {
  console.error('❌ 腳本執行失敗:', error)
  process.exit(1)
})
