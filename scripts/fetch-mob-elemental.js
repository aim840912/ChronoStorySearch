/**
 * 從 maplestory.io API 獲取怪物元素屬性並更新 mob-info.json
 *
 * 使用方式：
 *   node scripts/fetch-mob-elemental.js [--all]
 *
 * 選項：
 *   --all  處理所有怪物（預設只處理 released=0 的怪物）
 */

const fs = require('fs')
const path = require('path')

const MOB_INFO_PATH = path.join(__dirname, '../data/mob-info.json')
const API_BASE = 'https://maplestory.io/api/GMS/83/mob'
const DELAY_MS = 150

/**
 * 解析 elementalAttributes 字串
 * 例如 "H3I2L2D2" => { fire: null, ice: 2, lightning: 2, holy: 3, poison: null, dark: 2 }
 */
function parseElementalAttributes(attrString) {
  const result = {
    fire: null,
    ice: null,
    lightning: null,
    holy: null,
    poison: null,
    dark: null,
  }

  if (!attrString) return result

  const elementMap = {
    F: 'fire',
    I: 'ice',
    L: 'lightning',
    H: 'holy',
    P: 'poison',
    S: 'poison',  // API 實際使用 S 表示 Poison
    D: 'dark',
  }

  // 解析每兩個字元為一組 (字母+數字)
  for (let i = 0; i < attrString.length - 1; i += 2) {
    const letter = attrString[i]
    const value = attrString[i + 1]
    const element = elementMap[letter]
    if (element && !isNaN(parseInt(value))) {
      result[element] = parseInt(value)
    }
  }

  return result
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchMobData(mobId) {
  const url = API_BASE + '/' + mobId
  try {
    const response = await fetch(url)
    if (!response.ok) {
      return null
    }
    return await response.json()
  } catch (error) {
    console.error('  Failed to fetch ' + mobId + ':', error.message)
    return null
  }
}

async function main() {
  const processAll = process.argv.includes('--all')

  console.log('Reading mob-info.json...')
  const mobData = JSON.parse(fs.readFileSync(MOB_INFO_PATH, 'utf-8'))

  const mobsToProcess = processAll
    ? mobData
    : mobData.filter((m) => m.mob.released === 0)

  console.log('')
  console.log('Processing ' + mobsToProcess.length + ' mobs')
  console.log(processAll ? '(all mobs)' : '(released=0 only)')
  console.log('')

  let updated = 0
  let skipped = 0
  let failed = 0

  for (let i = 0; i < mobsToProcess.length; i++) {
    const mobEntry = mobsToProcess[i]
    const mobId = mobEntry.mob.mob_id
    const mobName = mobEntry.mob.mob_name

    const progress = '[' + (i + 1) + '/' + mobsToProcess.length + ']'
    process.stdout.write(progress + ' ' + mobId + ' ' + mobName + '... ')

    const apiData = await fetchMobData(mobId)

    if (!apiData) {
      console.log('NO API DATA')
      failed++
      await delay(DELAY_MS)
      continue
    }

    const elementalAttr = apiData.meta && apiData.meta.elementalAttributes
    if (!elementalAttr) {
      console.log('no elemental')
      skipped++
      await delay(DELAY_MS)
      continue
    }

    const parsed = parseElementalAttributes(elementalAttr)

    const originalIndex = mobData.findIndex(
      (m) => m.mob.mob_id === mobEntry.mob.mob_id
    )
    if (originalIndex !== -1) {
      mobData[originalIndex].mob.fire_weakness = parsed.fire
      mobData[originalIndex].mob.ice_weakness = parsed.ice
      mobData[originalIndex].mob.lightning_weakness = parsed.lightning
      mobData[originalIndex].mob.holy_weakness = parsed.holy
      mobData[originalIndex].mob.poison_weakness = parsed.poison
    }

    console.log('OK: ' + elementalAttr)
    updated++

    await delay(DELAY_MS)
  }

  console.log('')
  console.log('Writing mob-info.json...')
  fs.writeFileSync(MOB_INFO_PATH, JSON.stringify(mobData, null, 2) + '\n')

  console.log('')
  console.log('Done!')
  console.log('  Updated: ' + updated)
  console.log('  No elemental: ' + skipped)
  console.log('  Failed: ' + failed)
}

main().catch(console.error)
