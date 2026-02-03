/**
 * 使用 Playwright 從 Google Sheets 提取完整地圖怪物資料
 *
 * 用法：node scripts/extract-map-data-playwright.js
 */

const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')

// Google Sheets pubhtml URL
const SHEETS_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSIUj-72ADgwMqShxt4Dn7OP7dBN54l0wda1IPwlIVTZUN_ZtTlRx5DDidr43VXv2HYQ5RNqccLbbGS/pubhtml'

// 輸出路徑
const OUTPUT_PATH = path.join(__dirname, '../chronostoryData/map-database/chronostory-map-database.json')

// 需要提取的標籤頁
const SHEET_TABS = [
  { name: 'Maple Island', key: 'maple_island' },
  { name: 'Lith Harbor', key: 'lith_harbor' },
  { name: 'Kerning City', key: 'kerning_city' },
  { name: 'Henesys', key: 'henesys' },
  { name: 'Perion', key: 'perion' },
  { name: 'Ellinia', key: 'ellinia' },
  { name: 'Nautilus', key: 'nautilus' },
  { name: 'Sleepywood', key: 'sleepywood' },
  { name: 'Orbis', key: 'orbis' },
  { name: 'El Nath', key: 'el_nath' },
  { name: 'Ludibrium', key: 'ludibrium' },
  { name: 'Omega Sector', key: 'omega_sector' }
]

/**
 * 檢查字串是否為地圖名稱（而非怪物/NPC）
 */
function isMapName(str) {
  if (!str || str === '-') return false

  // 地圖名稱通常包含這些關鍵字
  const mapKeywords = [
    'Street', 'Road', 'Store', 'Sanctuary', 'Mountain', 'Domain', 'Valley',
    'Rocky', 'Dungeon', 'Hidden', 'Town', 'Harbor', 'City', 'Forest',
    'Field', 'Garden', 'Ground', 'Camp', 'Remains', 'Excavation', 'Land',
    'Burnt', 'Station', 'Entrance', 'Exit', 'Path', 'Subway', 'Construction',
    'Swamp', 'Tree', 'Tower', 'Eos', 'Helios', 'Clock', 'Toy', 'Omega',
    'Orbis', 'El Nath', 'Snowman', 'Ice', 'Snow', 'Sharp Cliff', 'Wolf',
    'Dead Mine', 'Cavern', 'Library', 'Magic', 'Nautilus', 'On the Way',
    'Cabin', 'Generator', 'Cafeteria', 'Navigation', 'Bedroom', 'Sleepy',
    'Ant Tunnel', 'Golem', 'Market', 'Department', 'Weapon', 'Chief',
    'Residence', 'Snowy', 'Hill', 'Watch Out', 'Icy', 'Cold', 'Dangerous',
    'Territory', 'Cliff', 'Mine', 'Hallway', 'Passage', 'Square', 'Terrace',
    'Path of Time', 'Toy Factory', 'Apparatus', 'Deep Sea', 'Aquarium',
    'Lair', 'Cave', 'Hideout', 'Sector', 'Corridor', 'Kulan', 'Platform',
    'Perion', 'Ellinia', 'Henesys', 'Kerning', 'Lith', 'Ludibrium',
    'Regular Cab', 'VIP Cab'
  ]

  return mapKeywords.some(kw => str.includes(kw))
}

/**
 * 檢查字串是否為 Section 標題
 */
function isSectionTitle(str) {
  if (!str) return false
  // Section 標題格式: "Region Name - Area (X)" 或 "Ossyria - El Nath"
  return (str.includes(' - ') && !str.includes('Hidden Street')) ||
         str.match(/\([A-Z]\)$/)
}

/**
 * 解析表格資料為結構化的 sections
 */
function parseSheetData(rows, regionName) {
  const sections = []
  let currentSection = null
  let currentLeftMap = null
  let currentRightMap = null

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    if (!row || row.length < 2) continue

    // 欄位索引（基於觀察到的結構）
    // 左側: [rowNum, MapName, NPC, Monster, Level, XP, Links, empty]
    // 右側: [MapName, NPC, Monster, Level, XP, Links]
    const col1 = row[1]?.trim() || ''  // 左側 Map Name
    const col2 = row[2]?.trim() || ''  // 左側 NPC
    const col3 = row[3]?.trim() || ''  // 左側 Monster
    const col4 = row[4]?.trim() || ''  // 左側 Level
    const col5 = row[5]?.trim() || ''  // 左側 XP
    const col6 = row[6]?.trim() || ''  // 左側 Links

    const col8 = row[8]?.trim() || ''   // 右側 Map Name
    const col9 = row[9]?.trim() || ''   // 右側 NPC
    const col10 = row[10]?.trim() || '' // 右側 Monster
    const col11 = row[11]?.trim() || '' // 右側 Level
    const col12 = row[12]?.trim() || '' // 右側 XP
    const col13 = row[13]?.trim() || '' // 右側 Links

    // 跳過標題行
    if (col1 === 'Map Name') continue

    // 檢查是否為 Section 標題
    if (isSectionTitle(col1) && !col2 && !col3) {
      // 儲存前一個 section
      if (currentLeftMap && currentSection) {
        currentSection.maps.push(currentLeftMap)
        currentLeftMap = null
      }
      if (currentRightMap && currentSection) {
        currentSection.maps.push(currentRightMap)
        currentRightMap = null
      }
      if (currentSection) {
        sections.push(currentSection)
      }

      // 解析 section 名稱和代碼
      const codeMatch = col1.match(/\(([A-Z])\)$/)
      const sectionName = col1.replace(/\s*\([A-Z]\)$/, '').trim()

      currentSection = {
        name: sectionName,
        code: codeMatch ? codeMatch[1] : '',
        maps: []
      }
      continue
    }

    if (!currentSection) continue

    // 處理左側資料
    if (col1) {
      if (isMapName(col1)) {
        // 這是新地圖
        if (currentLeftMap) {
          currentSection.maps.push(currentLeftMap)
        }
        currentLeftMap = {
          name: col1,
          npcs: [],
          monsters: [],
          links: []
        }
        if (col1.includes('Hidden')) {
          currentLeftMap.hidden = true
        }
        // 處理同一行的 NPC
        if (col2 && col2 !== '-' && !parseInt(col2)) {
          currentLeftMap.npcs.push(col2)
        }
        // 處理同一行的怪物
        if (col3 && col3 !== '-') {
          currentLeftMap.monsters.push({
            name: col3,
            level: parseInt(col4) || null,
            baseXP: parseInt(col5) || null
          })
        }
        // 處理連結
        if (col4 && col4.match(/^[A-Z]\d|^M\d/)) currentLeftMap.links.push(col4)
        if (col5 && col5.match(/^[A-Z]\d|^M\d/)) currentLeftMap.links.push(col5)
        if (col6 && col6.match(/^[A-Z]\d|^M\d/)) currentLeftMap.links.push(col6)
      } else if (currentLeftMap) {
        // 這是額外的 NPC 或怪物
        // 判斷：如果 col2 是數字，且 col1 不是純數字，則 col1 是怪物
        if (parseInt(col2) && col1 && !/^\d+$/.test(col1)) {
          // col1 是怪物名，col2 是等級，col3 是經驗值
          currentLeftMap.monsters.push({
            name: col1,
            level: parseInt(col2) || null,
            baseXP: parseInt(col3) || null
          })
        } else if (col1 !== '-' && !col1.match(/^[A-Z]\d|^M\d/) && !/^\d+$/.test(col1)) {
          // 可能是 NPC
          currentLeftMap.npcs.push(col1)
        }
        // 檢查連結
        if (col2 && col2.match(/^[A-Z]\d|^M\d/)) {
          if (!currentLeftMap.links.includes(col2)) currentLeftMap.links.push(col2)
        }
        if (col4 && col4.match(/^[A-Z]\d|^M\d/)) {
          if (!currentLeftMap.links.includes(col4)) currentLeftMap.links.push(col4)
        }
      }
    }

    // 處理右側資料（col8 或 col10 有值時處理）
    if (col8 || col10) {
      if (isMapName(col8)) {
        // 這是新地圖
        if (currentRightMap) {
          currentSection.maps.push(currentRightMap)
        }
        currentRightMap = {
          name: col8,
          npcs: [],
          monsters: [],
          links: []
        }
        if (col8.includes('Hidden')) {
          currentRightMap.hidden = true
        }
        // 處理同一行的 NPC
        if (col9 && col9 !== '-' && !parseInt(col9)) {
          currentRightMap.npcs.push(col9)
        }
        // 處理同一行的怪物
        if (col10 && col10 !== '-') {
          currentRightMap.monsters.push({
            name: col10,
            level: parseInt(col11) || null,
            baseXP: parseInt(col12) || null
          })
        }
        // 處理連結
        if (col11 && col11.match(/^[A-Z]\d|^M\d/)) currentRightMap.links.push(col11)
        if (col12 && col12.match(/^[A-Z]\d|^M\d/)) currentRightMap.links.push(col12)
        if (col13 && col13.match(/^[A-Z]\d|^M\d/)) currentRightMap.links.push(col13)
      } else if (currentRightMap) {
        // col8 不是地圖名稱，可能是額外怪物或 NPC
        // 情況 1: col8 是怪物名、col9 是等級（數字）、col10 是經驗值
        if (col8 && parseInt(col9) && col8 !== '-' && !/^\d+$/.test(col8)) {
          currentRightMap.monsters.push({
            name: col8,
            level: parseInt(col9) || null,
            baseXP: parseInt(col10) || null
          })
        }
        // 情況 2: col10 是怪物名（原有格式）
        else if (col10 && col10 !== '-' && !/^\d+$/.test(col10)) {
          currentRightMap.monsters.push({
            name: col10,
            level: parseInt(col11) || null,
            baseXP: parseInt(col12) || null
          })
        }
        // 情況 3: 額外的 NPC
        else if (col9 && !parseInt(col9) && !/^\d+$/.test(col9)) {
          currentRightMap.npcs.push(col9)
        }
      }
    }
  }

  // 儲存最後的地圖和 section
  if (currentLeftMap && currentSection) {
    currentSection.maps.push(currentLeftMap)
  }
  if (currentRightMap && currentSection) {
    currentSection.maps.push(currentRightMap)
  }
  if (currentSection) {
    sections.push(currentSection)
  }

  return sections
}

/**
 * 主提取邏輯
 */
async function extractAllSheets() {
  console.log('Starting Playwright extraction...')
  console.log('Target URL:', SHEETS_URL)

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  await page.setViewportSize({ width: 1920, height: 1080 })

  try {
    console.log('\nNavigating to Google Sheets...')
    await page.goto(SHEETS_URL, { waitUntil: 'networkidle', timeout: 60000 })
    await page.waitForSelector('iframe', { timeout: 30000 })
    await page.waitForTimeout(2000)

    // 讀取現有資料
    let existingData = {}
    if (fs.existsSync(OUTPUT_PATH)) {
      existingData = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf-8'))
    }

    const result = {
      metadata: {
        title: 'ChronoStory Map and Monster Database',
        author: 'helloshorty',
        extractedAt: new Date().toISOString().split('T')[0],
        source: SHEETS_URL,
        totalSheets: SHEET_TABS.length,
        description: 'Complete map and monster database for ChronoStory (MapleStory Worlds)'
      },
      documentation: existingData.documentation || {},
      regions: {}
    }

    // 遍歷每個標籤頁
    for (const tab of SHEET_TABS) {
      console.log(`\n=== Extracting: ${tab.name} ===`)

      // 點擊標籤頁
      try {
        await page.click(`td:has-text("${tab.name}")`, { timeout: 5000 })
        await page.waitForTimeout(1500)
      } catch (e) {
        console.log(`  Tab not found: ${tab.name}, using existing data`)
        if (existingData.regions?.[tab.key]) {
          result.regions[tab.key] = existingData.regions[tab.key]
        }
        continue
      }

      // 從 iframe 提取表格資料
      const tableData = await page.evaluate(() => {
        const iframe = document.querySelector('iframe')
        if (!iframe) return { error: 'No iframe found' }

        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
        if (!iframeDoc) return { error: 'Cannot access iframe content' }

        const table = iframeDoc.querySelector('table')
        if (!table) return { error: 'No table found in iframe' }

        const rows = Array.from(table.querySelectorAll('tr'))
        return rows.map(row => {
          const cells = Array.from(row.querySelectorAll('td, th'))
          return cells.map(cell => cell.textContent?.trim() || '')
        })
      })

      if (tableData.error) {
        console.log(`  Error: ${tableData.error}`)
        if (existingData.regions?.[tab.key]) {
          result.regions[tab.key] = existingData.regions[tab.key]
        }
        continue
      }

      console.log(`  Found ${tableData.length} rows`)

      // 解析表格資料
      const sections = parseSheetData(tableData, tab.name)

      // 計算統計
      let mapCount = 0
      let monsterCount = 0
      for (const section of sections) {
        mapCount += section.maps.length
        for (const map of section.maps) {
          monsterCount += map.monsters.length
        }
      }

      console.log(`  Parsed ${sections.length} sections, ${mapCount} maps, ${monsterCount} monster spawns`)

      // 如果解析結果為空，使用現有資料；否則使用新資料
      if (sections.length === 0) {
        const existingMonsterCount = existingData.regions?.[tab.key]?.sections?.reduce((acc, s) =>
          acc + s.maps.reduce((a, m) => a + m.monsters.length, 0), 0) || 0
        console.log(`  Using existing data (has ${existingMonsterCount} monsters)`)
        result.regions[tab.key] = existingData.regions[tab.key]
      } else {
        result.regions[tab.key] = {
          name: tab.name,
          sections: sections
        }
      }
    }

    // 寫入結果
    console.log('\n=== Writing output file ===')
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(result, null, 2), 'utf-8')
    console.log(`Output written to: ${OUTPUT_PATH}`)

    // 輸出最終統計
    console.log('\n=== Final Statistics ===')
    for (const [key, region] of Object.entries(result.regions)) {
      let monsterCount = 0
      let mapCount = 0
      for (const section of region.sections) {
        mapCount += section.maps.length
        for (const map of section.maps) {
          monsterCount += map.monsters.length
        }
      }
      console.log(`${region.name}: ${mapCount} maps, ${monsterCount} monster spawns`)
    }

  } finally {
    await browser.close()
  }
}

// 執行
extractAllSheets().catch(console.error)
