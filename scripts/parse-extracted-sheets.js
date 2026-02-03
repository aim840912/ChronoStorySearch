/**
 * 解析從 Google Sheets 提取的原始資料
 * 將原始行資料轉換為結構化的地圖資料庫格式
 */

const fs = require('fs')
const path = require('path')

const OUTPUT_PATH = path.join(__dirname, '../chronostoryData/map-database/chronostory-map-database.json')

/**
 * 已知的怪物名稱列表（容易被誤判為地圖的）
 */
const KNOWN_MONSTERS = [
  'Ice Drake', 'Dark Drake', 'Drake', 'Fire Drake',
  'Mixed Golem', 'Stone Golem', 'Dark Stone Golem', 'Cold Mixed Golem', 'Hot Mixed Golem',
  'Cold Eye', 'Curse Eye', 'Evil Eye', 'Dark Eye',
  'Wild Kargo', 'Tauromacis', 'Taurospear', 'Tauroshield',
  'Jr. Balrog', 'Balrog',
  'Cellion', 'Jr. Cellion', 'Lionel', 'Jr. Lionel', 'Grupin', 'Jr. Grupin',
  'Lucida', 'Jr. Lucida', 'Eliza',
  'Sentinel', 'Jr. Sentinel', 'Fire Sentinel', 'Ice Sentinel',
  'Leatty', 'Dark Leatty',
  'Star Pixie', 'Lunar Pixie', 'Luster Pixie', 'Ghost Pixie',
  'Nependeath', 'Dark Nependeath',
  'Bob', 'Zombie Mushmom'
]

/**
 * 檢查字串是否為地圖名稱
 */
function isMapName(str) {
  if (!str || str === '-') return false

  // 如果是已知怪物名稱，則不是地圖
  if (KNOWN_MONSTERS.includes(str)) return false

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
    'Regular Cab', 'VIP Cab', 'Corner', 'Way', 'Cradle', 'Nest', 'Area', 'Table', 'Prairie',
    'Cloud Park', 'Old Man', 'Off-Limits', 'Loading Dock', 'Command Center', 'Safety Zone', 'Silo', 'HQ',
    'Tunnel', 'Boswell', 'Barnard', 'Zeta', 'Ultra', 'Mateon', 'Plateon', 'Mecateon', 'MT-09'
  ]
  return mapKeywords.some(kw => str.includes(kw))
}

/**
 * 檢查字串是否為 Section 標題
 */
function isSectionTitle(str) {
  if (!str) return false
  return (str.includes(' - ') && !str.includes('Hidden Street')) || str.match(/\([A-Z]\)$/)
}

/**
 * 解析原始行資料
 */
function parseRawData(rows, regionName) {
  const sections = []
  let currentSection = null
  let currentLeftMap = null
  let currentRightMap = null

  for (const row of rows) {
    if (!row || row.length < 2) continue

    const col1 = row[1]?.trim() || ''
    const col2 = row[2]?.trim() || ''
    const col3 = row[3]?.trim() || ''
    const col4 = row[4]?.trim() || ''
    const col5 = row[5]?.trim() || ''
    const col6 = row[6]?.trim() || ''

    const col8 = row[8]?.trim() || ''
    const col9 = row[9]?.trim() || ''
    const col10 = row[10]?.trim() || ''
    const col11 = row[11]?.trim() || ''
    const col12 = row[12]?.trim() || ''
    const col13 = row[13]?.trim() || ''

    if (col1 === 'Map Name') continue

    // Section 標題
    if (isSectionTitle(col1) && !col2 && !col3) {
      if (currentLeftMap && currentSection) currentSection.maps.push(currentLeftMap)
      if (currentRightMap && currentSection) currentSection.maps.push(currentRightMap)
      if (currentSection) sections.push(currentSection)

      const codeMatch = col1.match(/\(([A-Z])\)$/)
      currentSection = {
        name: col1.replace(/\s*\([A-Z]\)$/, '').trim(),
        code: codeMatch ? codeMatch[1] : '',
        maps: []
      }
      currentLeftMap = null
      currentRightMap = null
      continue
    }

    if (!currentSection) continue

    // 左側資料
    if (col1) {
      if (isMapName(col1)) {
        if (currentLeftMap) currentSection.maps.push(currentLeftMap)
        currentLeftMap = {
          name: col1,
          npcs: [],
          monsters: [],
          links: []
        }
        if (col1.includes('Hidden')) currentLeftMap.hidden = true

        if (col2 && col2 !== '-' && !parseInt(col2)) currentLeftMap.npcs.push(col2)
        if (col3 && col3 !== '-') {
          currentLeftMap.monsters.push({
            name: col3,
            level: parseInt(col4) || null,
            baseXP: parseInt(col5) || null
          })
        }
        if (col4?.match(/^[A-Z]\d|^M\d/)) currentLeftMap.links.push(col4)
        if (col5?.match(/^[A-Z]\d|^M\d/)) currentLeftMap.links.push(col5)
        if (col6?.match(/^[A-Z]\d|^M\d/)) currentLeftMap.links.push(col6)
      } else if (currentLeftMap) {
        if (parseInt(col2)) {
          currentLeftMap.monsters.push({
            name: col1,
            level: parseInt(col2) || null,
            baseXP: parseInt(col3) || null
          })
        } else if (col1 !== '-' && !col1.match(/^[A-Z]\d|^M\d/)) {
          currentLeftMap.npcs.push(col1)
        }
        if (col2?.match(/^[A-Z]\d|^M\d/) && !currentLeftMap.links.includes(col2)) currentLeftMap.links.push(col2)
        if (col4?.match(/^[A-Z]\d|^M\d/) && !currentLeftMap.links.includes(col4)) currentLeftMap.links.push(col4)
      }
    }

    // 右側資料
    // 先檢查 col8 是否為怪物續行（格式：怪物名稱 | 等級 | 經驗值）
    const col8IsMonsterContinuation = col8 && parseInt(col9) && parseInt(col10) && !isMapName(col8)

    if (col8 && isMapName(col8) && !col8IsMonsterContinuation) {
      // 新地圖開始
      if (currentRightMap) currentSection.maps.push(currentRightMap)
      currentRightMap = {
        name: col8,
        npcs: [],
        monsters: [],
        links: []
      }
      if (col8.includes('Hidden')) currentRightMap.hidden = true

      if (col9 && col9 !== '-' && !parseInt(col9)) currentRightMap.npcs.push(col9)
      if (col10 && col10 !== '-') {
        currentRightMap.monsters.push({
          name: col10,
          level: parseInt(col11) || null,
          baseXP: parseInt(col12) || null
        })
      }
      if (col11?.match(/^[A-Z]\d|^M\d/)) currentRightMap.links.push(col11)
      if (col12?.match(/^[A-Z]\d|^M\d/)) currentRightMap.links.push(col12)
      if (col13?.match(/^[A-Z]\d|^M\d/)) currentRightMap.links.push(col13)
    } else if (currentRightMap) {
      // 續行資料
      // 情況 1：col8 是怪物名稱（格式：怪物名稱 | 等級 | 經驗值）
      if (col8IsMonsterContinuation) {
        currentRightMap.monsters.push({
          name: col8,
          level: parseInt(col9) || null,
          baseXP: parseInt(col10) || null
        })
        // 檢查 col11 是否為地圖連結
        if (col11?.match(/^[A-Z]\d|^M\d/) && !currentRightMap.links.includes(col11)) {
          currentRightMap.links.push(col11)
        }
      }
      // 情況 2：col10 是怪物名稱（格式：空 | NPC/- | 怪物名稱 | 等級 | 經驗值）
      // 排除地圖連結格式（如 C19b, A2a 等）
      else if (col10 && col10 !== '-' && !parseInt(col10) && !col10.match(/^[A-Z]\d+[a-z]?$/)) {
        currentRightMap.monsters.push({
          name: col10,
          level: parseInt(col11) || null,
          baseXP: parseInt(col12) || null
        })
        if (col13?.match(/^[A-Z]\d|^M\d/) && !currentRightMap.links.includes(col13)) {
          currentRightMap.links.push(col13)
        }
      }
      // 處理連結
      if (col10?.match(/^[A-Z]\d|^M\d/) && !currentRightMap.links.includes(col10)) {
        currentRightMap.links.push(col10)
      }
      // NPC 續行
      if (col9 && !parseInt(col9) && col9 !== '-') {
        currentRightMap.npcs.push(col9)
      }
    }
  }

  if (currentLeftMap && currentSection) currentSection.maps.push(currentLeftMap)
  if (currentRightMap && currentSection) currentSection.maps.push(currentRightMap)
  if (currentSection) sections.push(currentSection)

  return sections
}

/**
 * 更新指定區域的資料
 */
function updateRegion(regionKey, regionName, rawData) {
  let db = {}
  if (fs.existsSync(OUTPUT_PATH)) {
    db = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf-8'))
  }

  const rows = JSON.parse(rawData)
  const sections = parseRawData(rows, regionName)

  let mapCount = 0
  let monsterCount = 0
  for (const section of sections) {
    mapCount += section.maps.length
    for (const map of section.maps) {
      monsterCount += map.monsters.length
    }
  }

  console.log(`${regionName}: ${sections.length} sections, ${mapCount} maps, ${monsterCount} monsters`)

  db.regions = db.regions || {}
  db.regions[regionKey] = {
    name: regionName,
    sections: sections
  }

  db.metadata = db.metadata || {}
  db.metadata.extractedAt = new Date().toISOString().split('T')[0]

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(db, null, 2), 'utf-8')
  console.log(`Updated ${OUTPUT_PATH}`)

  return { mapCount, monsterCount }
}

// 如果直接執行此腳本
if (require.main === module) {
  const args = process.argv.slice(2)
  if (args.length < 3) {
    console.log('Usage: node parse-extracted-sheets.js <regionKey> <regionName> <rawDataFile>')
    process.exit(1)
  }

  const [regionKey, regionName, rawDataFile] = args
  const rawData = fs.readFileSync(rawDataFile, 'utf-8')
  updateRegion(regionKey, regionName, rawData)
}

module.exports = { parseRawData, updateRegion }
