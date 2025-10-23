/**
 * 從 ChronoStory API 更新怪物地圖資訊
 * 為 data/mob-info.json 的每個怪物新增 "maps" 欄位
 *
 * 此腳本會：
 * 1. 讀取現有的 mob-info.json
 * 2. 為每個怪物呼叫 API 獲取 maps 資料
 * 3. 新增 "maps" 欄位到每個怪物物件
 * 4. 儲存更新後的資料
 */

const fs = require('fs')
const path = require('path')

// API 配置
const API_BASE_URL = 'https://chronostory.onrender.com/api/mob-info'
const REQUEST_DELAY_MS = 300 // 每次請求間隔 300ms
const MAX_RETRIES = 3 // 最大重試次數
const TIMEOUT_MS = 30000 // 請求超時時間 30 秒

// 檔案路徑
const MOB_INFO_FILE = path.join(process.cwd(), 'data', 'mob-info.json')
const BACKUP_FILE = path.join(process.cwd(), 'data', 'mob-info.json.backup-maps')
const REPORT_FILE = path.join(process.cwd(), 'data', 'mob-maps-update-report.txt')

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
 * 獲取單一怪物的 maps 資料（帶重試機制）
 */
async function fetchMobMaps(mobId, retries = MAX_RETRIES) {
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

    // 只提取 maps 欄位
    return data.maps || []
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error(`⏱️  怪物 ID ${mobId} 請求超時`)
    }

    if (retries > 0) {
      console.warn(`⚠️  怪物 ID ${mobId} 失敗，重試 ${MAX_RETRIES - retries + 1}/${MAX_RETRIES}...`)
      await delay(2000) // 重試前等待 2 秒
      return fetchMobMaps(mobId, retries - 1)
    }

    console.error(`❌ 怪物 ID ${mobId} 請求失敗: ${error.message}`)
    return null
  }
}

/**
 * 主函數
 */
async function main() {
  const startTime = Date.now()
  console.log('='.repeat(60))
  console.log('怪物地圖資訊更新工具')
  console.log('='.repeat(60))
  console.log('')

  // 讀取現有資料
  console.log('📖 讀取 mob-info.json...')
  if (!fs.existsSync(MOB_INFO_FILE)) {
    console.error('❌ 找不到 mob-info.json 檔案')
    process.exit(1)
  }

  const mobData = JSON.parse(fs.readFileSync(MOB_INFO_FILE, 'utf8'))
  console.log(`✅ 找到 ${mobData.length} 個怪物\n`)

  // 備份原始檔案
  console.log('💾 備份原始檔案...')
  fs.copyFileSync(MOB_INFO_FILE, BACKUP_FILE)
  console.log(`✅ 備份至: ${path.basename(BACKUP_FILE)}\n`)

  // 統計資料
  const stats = {
    total: mobData.length,
    processed: 0,
    success: 0,
    failed: 0,
    skipped: 0, // 已有 maps 欄位的數量
    addedMaps: 0, // 成功新增地圖的數量
  }

  const report = []
  const failedIds = []

  console.log('🚀 開始更新怪物地圖資訊...')
  console.log(`⏱️  預計時間：約 ${Math.ceil((mobData.length * REQUEST_DELAY_MS) / 1000)} 秒\n`)

  // 逐一處理每個怪物
  for (let i = 0; i < mobData.length; i++) {
    const mobEntry = mobData[i]
    const mobId = mobEntry.mob.mob_id
    const mobName = mobEntry.mob.mob_name || 'Unknown'
    const chineseName = mobEntry.chineseMobName || '無中文名'

    const progress = `[${i + 1}/${mobData.length}]`
    process.stdout.write(`${progress} 處理 ${mobId} - ${mobName} (${chineseName})...`)

    // 檢查是否已有 maps 欄位
    if (mobEntry.maps !== undefined) {
      console.log(` ⏭️  已有 maps 欄位，跳過`)
      stats.skipped++
      stats.processed++
      continue
    }

    // 獲取 maps 資料
    const maps = await fetchMobMaps(mobId)

    // 延遲避免 rate limiting
    await delay(REQUEST_DELAY_MS)

    // 處理結果
    if (maps === null) {
      // API 請求失敗
      stats.failed++
      failedIds.push(mobId)
      console.log(` ❌ 失敗`)

      // 即使失敗也新增空的 maps 欄位
      mobEntry.maps = []

      report.push({
        mobId,
        mobName,
        chineseName,
        status: 'failed',
        error: 'API 請求失敗',
      })
    } else {
      // 成功獲取 maps 資料
      stats.success++
      mobEntry.maps = maps

      if (maps.length > 0) {
        stats.addedMaps++
        console.log(` ✅ (${maps.length} 個地圖)`)
      } else {
        console.log(` ✅ (無地圖)`)
      }

      report.push({
        mobId,
        mobName,
        chineseName,
        status: 'success',
        mapsCount: maps.length,
      })
    }

    stats.processed++

    // 定期儲存（每 50 筆）
    if ((i + 1) % 50 === 0) {
      console.log(`\n💾 定期儲存資料...`)
      fs.writeFileSync(MOB_INFO_FILE, JSON.stringify(mobData, null, 2), 'utf8')
    }
  }

  // 最終儲存
  console.log('\n💾 儲存最終資料到 mob-info.json...')
  fs.writeFileSync(MOB_INFO_FILE, JSON.stringify(mobData, null, 2), 'utf8')
  console.log('✅ 儲存完成\n')

  // 生成報告
  console.log('📝 生成報告...')
  const reportLines = [
    '='.repeat(80),
    '怪物地圖資訊更新報告',
    '='.repeat(80),
    '',
    `更新時間: ${new Date().toLocaleString('zh-TW')}`,
    `總怪物數量: ${stats.total}`,
    `已處理: ${stats.processed}`,
    `成功: ${stats.success}`,
    `失敗: ${stats.failed}`,
    `跳過（已有資料）: ${stats.skipped}`,
    `新增地圖資訊: ${stats.addedMaps} 個怪物有地圖資料`,
    '',
    '='.repeat(80),
    '處理詳情',
    '='.repeat(80),
    '',
  ]

  // 失敗的項目
  const failedItems = report.filter((item) => item.status === 'failed')
  if (failedItems.length > 0) {
    reportLines.push('【失敗項目】')
    failedItems.forEach((item, index) => {
      reportLines.push(
        `${index + 1}. mob_id: ${item.mobId} - ${item.mobName} (${item.chineseName})`
      )
      reportLines.push(`   錯誤: ${item.error}`)
    })
    reportLines.push('')
  }

  // 有地圖資料的項目（前 20 個）
  const successWithMaps = report.filter((item) => item.status === 'success' && item.mapsCount > 0)
  if (successWithMaps.length > 0) {
    reportLines.push('【成功新增地圖資訊】（前 20 個）')
    successWithMaps.slice(0, 20).forEach((item, index) => {
      reportLines.push(
        `${index + 1}. mob_id: ${item.mobId} - ${item.mobName} (${item.chineseName}) - ${item.mapsCount} 個地圖`
      )
    })
    if (successWithMaps.length > 20) {
      reportLines.push(`... 以及其他 ${successWithMaps.length - 20} 個怪物`)
    }
    reportLines.push('')
  }

  fs.writeFileSync(REPORT_FILE, reportLines.join('\n'), 'utf8')
  console.log(`✅ 報告已儲存至: ${path.basename(REPORT_FILE)}\n`)

  // 執行時間
  const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2)

  // 最終統計
  console.log('='.repeat(60))
  console.log('更新完成！')
  console.log('='.repeat(60))
  console.log(`📊 總怪物數量: ${stats.total}`)
  console.log(`✅ 成功: ${stats.success}`)
  console.log(`❌ 失敗: ${stats.failed}`)
  console.log(`⏭️  跳過: ${stats.skipped}`)
  console.log(`🗺️  有地圖資料: ${stats.addedMaps} 個怪物`)
  console.log(`⏱️  執行時間: ${elapsedTime} 秒`)
  console.log('')
  console.log(`📁 輸出檔案: ${path.relative(process.cwd(), MOB_INFO_FILE)}`)
  console.log(`💾 備份檔案: ${path.relative(process.cwd(), BACKUP_FILE)}`)
  console.log(`📝 報告檔案: ${path.relative(process.cwd(), REPORT_FILE)}`)
  console.log('')

  if (failedIds.length > 0) {
    console.log(`⚠️  失敗的怪物 ID (共 ${failedIds.length} 個):`)
    console.log(failedIds.join(', '))
    console.log('')
  }

  console.log('如需復原，請執行：')
  console.log(`cp ${path.relative(process.cwd(), BACKUP_FILE)} ${path.relative(process.cwd(), MOB_INFO_FILE)}`)
  console.log('')
}

// 執行
main().catch((error) => {
  console.error('❌ 腳本執行失敗:', error)
  process.exit(1)
})
