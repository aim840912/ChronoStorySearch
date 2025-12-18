const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

/**
 * 圖片清單生成腳本
 * 從 Cloudflare R2 讀取圖片檔案列表，生成可用圖片清單
 *
 * 功能：
 * 1. 掃描 R2 圖片目錄，更新 available-images.json
 * 2. 自動檢測檔案變更（透過 MD5 hash 比對）
 * 3. 有變更時自動增加版本號（更新 r2-versions.json）
 *
 * 支援的目錄：
 * - images/items (PNG)
 * - images/monsters (PNG)
 * - images/monsters-gif (GIF)
 * - images/monsters-die (GIF)
 * - images/monsters-hit (GIF)
 *
 * 安全性說明：
 * 此腳本使用 execSync 執行 rclone 命令，所有路徑皆為硬編碼常數，
 * 不接受任何外部輸入，因此沒有命令注入風險。
 */

// 路徑常數
const VERSIONS_PATH = path.join(__dirname, '../data/r2-versions.json')
const MANIFEST_PATH = path.join(__dirname, '../data/available-images.json')

/**
 * 載入現有的版本資料
 * @returns {object} 版本資料物件
 */
function loadVersions() {
  try {
    const content = fs.readFileSync(VERSIONS_PATH, 'utf-8')
    return JSON.parse(content)
  } catch {
    // 檔案不存在或格式錯誤，返回預設結構
    return {
      images: {
        items: {},
        monsters: {},
        'monsters-gif': {},
        'monsters-die': {},
        'monsters-hit': {},
      },
      json: {
        'items-organized': {},
        'drops-by-monster': {},
        'drops-by-item': {},
      },
      hashes: {
        items: {},
        monsters: {},
        'monsters-gif': {},
        'monsters-die': {},
        'monsters-hit': {},
      },
      updatedAt: new Date().toISOString(),
    }
  }
}

/**
 * 從 R2 掃描目錄，取得檔案 ID 和 hash
 * @param {string} r2Path - R2 路徑（硬編碼常數）
 * @param {string} extension - 副檔名（預設 .png）
 * @returns {{ ids: number[], hashes: Record<string, string> }} ID 陣列和 hash 對照表
 */
function scanR2DirectoryWithHash(r2Path, extension = '.png') {
  try {
    console.log(`🔍 掃描 R2 路徑: ${r2Path} (${extension})`)

    // 使用 rclone lsjson --hash 取得檔案清單和 hash
    const command = `~/rclone lsjson ${r2Path} --hash`
    const output = execSync(command, { encoding: 'utf-8' })
    const files = JSON.parse(output)

    const ids = []
    const hashes = {}

    for (const file of files) {
      if (!file.Name.endsWith(extension)) continue

      const id = parseInt(file.Name.replace(extension, ''), 10)
      if (isNaN(id)) continue

      ids.push(id)
      // 優先使用 md5（R2 使用小寫），若無則使用其他可用的 hash
      const hash = file.Hashes?.md5 || file.Hashes?.MD5 || file.Hashes?.sha1 || null
      if (hash) {
        hashes[String(id)] = hash
      }
    }

    // 排序 ID
    ids.sort((a, b) => a - b)

    return { ids, hashes }
  } catch (error) {
    console.error(`無法讀取 R2 路徑 ${r2Path}:`, error.message)
    return { ids: [], hashes: {} }
  }
}

/**
 * 比對 hash 並更新版本號
 * @param {string} category - 類別名稱（如 'items', 'monsters'）
 * @param {Record<string, string>} newHashes - 新的 hash 對照表
 * @param {Record<string, string>} oldHashes - 舊的 hash 對照表
 * @param {Record<string, string>} versions - 現有版本號
 * @returns {{ updatedVersions: Record<string, string>, changedCount: number }}
 */
function updateVersions(category, newHashes, oldHashes, versions) {
  const updatedVersions = { ...versions }
  let changedCount = 0

  for (const [id, newHash] of Object.entries(newHashes)) {
    const oldHash = oldHashes[id]

    // 如果 hash 存在且不同，表示檔案有更新
    if (oldHash && oldHash !== newHash) {
      const currentVersion = parseInt(versions[id] || '1', 10)
      updatedVersions[id] = String(currentVersion + 1)
      changedCount++
      console.log(`  📦 ${category}/${id} 變更 → v${currentVersion + 1}`)
    }
  }

  return { updatedVersions, changedCount }
}

// R2 路徑常數（硬編碼，無命令注入風險）
const R2_PATHS = {
  items: 'r2:maplestory-images/images/items',
  monsters: 'r2:maplestory-images/images/monsters',
  'monsters-gif': 'r2:maplestory-images/images/monsters-gif',
  'monsters-die': 'r2:maplestory-images/images/monsters-die',
  'monsters-hit': 'r2:maplestory-images/images/monsters-hit',
}

// 圖片類別對應的副檔名
const CATEGORY_EXTENSIONS = {
  items: '.png',
  monsters: '.png',
  'monsters-gif': '.gif',
  'monsters-die': '.gif',
  'monsters-hit': '.gif',
}

// 主程式
function main() {
  console.log('🔍 開始從 R2 掃描圖片檔案...\n')

  // 載入現有版本資料
  const versions = loadVersions()
  let totalChangedCount = 0

  // 掃描結果
  const scanResults = {}
  const newHashes = {}

  // 掃描所有目錄
  for (const [category, r2Path] of Object.entries(R2_PATHS)) {
    const extension = CATEGORY_EXTENSIONS[category]
    const result = scanR2DirectoryWithHash(r2Path, extension)
    scanResults[category] = result.ids
    newHashes[category] = result.hashes

    // 比對 hash 並更新版本號
    const oldHashes = versions.hashes?.[category] || {}
    const oldVersions = versions.images?.[category] || {}
    const { updatedVersions, changedCount } = updateVersions(
      category,
      result.hashes,
      oldHashes,
      oldVersions
    )

    // 更新版本資料
    versions.images[category] = updatedVersions
    versions.hashes[category] = result.hashes
    totalChangedCount += changedCount
  }

  // 顯示統計
  console.log(`\n✅ 從 R2 找到 ${scanResults.items.length} 個物品圖片`)
  console.log(`✅ 從 R2 找到 ${scanResults.monsters.length} 個怪物圖片 (PNG)`)
  console.log(`✅ 從 R2 找到 ${scanResults['monsters-gif'].length} 個怪物動圖 (stand GIF)`)
  console.log(`✅ 從 R2 找到 ${scanResults['monsters-die'].length} 個怪物動圖 (die GIF)`)
  console.log(`✅ 從 R2 找到 ${scanResults['monsters-hit'].length} 個怪物動圖 (hit GIF)`)

  if (totalChangedCount > 0) {
    console.log(`\n🔄 檢測到 ${totalChangedCount} 個檔案變更，版本號已自動更新`)
  } else {
    console.log(`\n✓ 沒有檔案變更`)
  }

  // 生成圖片清單
  const manifest = {
    items: scanResults.items,
    monsters: scanResults.monsters,
    'monsters-gif': scanResults['monsters-gif'],
    'monsters-die': scanResults['monsters-die'],
    'monsters-hit': scanResults['monsters-hit'],
    generatedAt: new Date().toISOString(),
    totalItems: scanResults.items.length,
    totalMonsters: scanResults.monsters.length,
    totalMonstersGif: scanResults['monsters-gif'].length,
    totalMonstersDie: scanResults['monsters-die'].length,
    totalMonstersHit: scanResults['monsters-hit'].length,
  }

  // 更新版本資料時間戳
  versions.updatedAt = new Date().toISOString()

  // 寫入檔案
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf-8')
  fs.writeFileSync(VERSIONS_PATH, JSON.stringify(versions, null, 2), 'utf-8')

  console.log(`\n📝 圖片清單已生成: ${MANIFEST_PATH}`)
  console.log(`📝 版本資料已更新: ${VERSIONS_PATH}`)
  console.log('✨ 完成！')
}

main()
