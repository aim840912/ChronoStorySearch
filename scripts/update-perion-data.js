/**
 * 使用提取的 Perion 資料更新資料庫
 */
const fs = require('fs')
const path = require('path')

const DB_PATH = path.join(__dirname, '../chronostoryData/map-database/chronostory-map-database.json')

// 從 Playwright 提取的完整 Perion 資料
const perionRawData = [["","","","","","","","","","","","","","","","","","","","",""],["1","Map Name","NPC","Monster","Monster Level","Base XP","Map Links","","Map Name","NPC","Monster","Monster Level","Base XP","Map Links","","","","","","",""],["","","","","","","","","","","","","","","","","","","","",""],["2","Victoria Road - Perion (A)","","","","","","",""],["3","","","","","","",""],["4","Perion","Duey","-","A1","","Perion Department Store","Sophia","-","A1","","","","","","",""],["5","Regular Cab","A2","","Arturo","","","","","","","",""],["6","Blackbull","A3","","","","","","","","","","","","","",""],["7","Spinel","A4","","Perion Weapon Store","River","-","A2","","","","","","",""],["8","Mr. Wang","A5","","Harry","","","","","","","",""],["9","Cody","A6","","","","","","","","","","","","","",""],["10","Ayan","","","Warriors' Sanctuary","Dances with Balrog","-","A3","","","","","","",""],["11","Manji","","","","","","","","","","","","","","",""],["12","Mr. Smith","","","","","","","","","","","","","","",""],["13","Mr. Thunder","","","","","","","","","","","","","","",""],["14","Gachapon","","","","","","","","","","","","","","",""],["15","","","","","","","","","","","","","","","","","","","",""],["16","Victoria Road - Perion West (B)","","","","","","",""],["17","","","","","","",""],["18","West Street Corner of Perion","-","Blue Snail","2","4","A4","","","","","","","","","","","","","",""],["19","Red Snail","4","8","B1","","","","","","","","","","","","","",""],["20","Stump","4","8","","","","","","","","","","","","","","",""],["21","Dark Stump","10","18","","","","","","","","","","","","","","",""],["22","Axe Stump","17","30","","","","","","","","","","","","","","",""],["23","Dark Axe Stump","22","38","","","","","","","","","","","","","","",""],["24","","","","","","","","","","","","","","","","","","","",""],["25","","","","","","","","","","","","","","","","","","","",""],["26","","","","","","","","","","","","","","","","","","","",""],["27","","","","","","","","","","","","","","","","","","","",""],["28","West Rocky Mountain I","-","Red Snail","4","8","B1","","West Rocky Mountain II","-","Dark Axe Stump","22","38","B2","","","","","","",""],["29","Stump","4","8","B2","","Wild Boar","25","42","B2a","","","","","","",""],["30","Dark Stump","10","18","B3","","Fire Boar","32","60","","","","","","","",""],["31","Dark Axe Stump","22","38","","","","","","","","","","","","","","",""],["32","Wild Boar","25","42","","","West Rocky Mountain III","-","Dark Axe Stump","22","38","B2a","","","","","","",""],["33","","","","","","","","Wild Boar","25","42","B2b","","","","","","",""],["34","","","","","","","","Fire Boar","32","60","","","","","","","",""],["35","","","","","","","","Lupin","37","77","","","","","","","",""],["36","","","","","","","","","","","","","","","","","","","",""],["37","","","","","","","","West Rocky Mountain IV","Warrior Job Instructor","Fire Boar","32","60","B2b","","","","","","",""],["38","","","","","","","","Lupin","37","77","","","","","","","",""],["39","","","","","","","","","","","","","","","","","","","",""],["40","","","","","","","","","","","","","","","","","","","",""],["41","West Domain of Perion","-","Octopus","12","24","B3","","","","","","","","","","","","","",""],["42","Red Snail","4","8","M3 (To Kerning City)","","","","","","","","","","","","","",""],["43","Stump","4","8","","","","","","","","","","","","","","",""],["44","Dark Stump","10","18","","","","","","","","","","","","","","",""],["45","","","","","","","","","","","","","","","","","","","",""],["46","Victoria Road - Perion East (C)","","","","","","",""],["47","","","","","","",""],["48","Perion Street Corner","-","Snail","1","3","A5","","Hidden Street - Land of Wild Boar","-","Wild Boar","25","42","C1","","","","","","",""],["49","Blue Snail","2","4","C1","","","","","","","C1a","","","","","","",""],["50","Red Snail","4","8","C2","","","","","","","C1b","","","","","","",""],["51","Stump","4","8","","","","","","","","","","","","","","",""],["52","Wild Boar","25","42","","","Hidden Street - Iron Boar Land","-","Iron Boar","45","115","C1a","","","","","","",""],["53","","","","","","","","","","","","","","","","","","","",""],["54","","","","","","","","Hidden Street - Over the Wall","-","Jr. Boogie","35","150","C1b","","","","","","",""],["55","","","","","","","","","","","","","","","","","","","",""],["56","","","","","","","","","","","","","","","","","","","",""],["57","East Rocky Mountain I","-","Red Snail","4","8","C2","","East Rocky Mountain II","Winston","Stump","4","8","C3","","","","","","",""],["58","Stump","4","8","C3","","","","","","","C3a","","","","","","",""],["59","Dark Stump","10","18","C4","","","","","","","","","","","","","",""],["60","","","","","","","","East Rocky Mountain III","Burnt Sword","Dark Stump","10","18","C3a","","","","","","",""],["61","","","","","","","","","","","","","C3b","","","","","","",""],["62","","","","","","","","","","","","","","","","","","","",""],["63","","","","","","","","East Rocky Mountain IV","-","Axe Stump","17","30","C3b","","","","","","",""],["64","","","","","","","","","","","","","C3c","","","","","","",""],["65","","","","","","","","","","","","","","","","","","","",""],["66","","","","","","","","East Rocky Mountain V","-","Axe Stump","17","30","C3c","","","","","","",""],["67","","","","","","","","Dark Stump","10","18","C3d","","","","","","",""],["68","","","","","","","","Stumpy","35","205","","","","","","","",""],["69","","","","","","","","Copper Drake","45","105","","","","","","","",""],["70","","","","","","","","","","","","","","","","","","","",""],["71","","","","","","","","East Rocky Mountain VI","-","Copper Drake","45","105","C3d","","","","","","",""],["72","","","","","","","","Red Drake","60","220","C3e","","","","","","",""],["73","","","","","","","","","","","","","","","","","","","",""],["74","","","","","","","","East Rocky Mountain VII","-","Copper Drake","45","105","C3e","","","","","","",""],["75","","","","","","","","Red Drake","60","220","","","","","","","",""],["76","","","","","","","","","","","","","","","","","","","",""],["77","","","","","","","","","","","","","","","","","","","",""],["78","","","","","","","","","","","","","","","","","","","",""],["79","Rocky Road I","-","Red Snail","4","8","C4","","","","","","","","","","","","","",""],["80","Stump","4","8","C5","","","","","","","","","","","","","",""],["81","Dark Stump","10","18","","","","","","","","","","","","","","",""],["82","","","","","","","","","","","","","","","","","","","",""],["83","","","","","","","","","","","","","","","","","","","",""],["84","Rocky Road II","-","Red Snail","4","8","C5","","","","","","","","","","","","","",""],["85","Stump","4","8","C6","","","","","","","","","","","","","",""],["86","Dark Stump","10","18","","","","","","","","","","","","","","",""],["87","Axe Stump","17","30","","","","","","","","","","","","","","",""],["88","","","","","","","","","","","","","","","","","","","",""],["89","","","","","","","","","","","","","","","","","","","",""],["90","Rocky Road III","-","Stump","4","8","C6","","Excavation Site I","-","Ghost Stump","19","33","C7","","","","","","",""],["91","Axe Stump","17","30","C7","","Wooden Mask","23","42","C7a","","","","","","",""],["92","Ghost Stump","19","33","C8","","","","","","","","","","","","","",""],["93","Wild Boar","25","42","","","Excavation Site II","-","Wooden Mask","23","42","C7a","","","","","","",""],["94","","","","","","","","Rocky Mask","24","45","C7b","","","","","","",""],["95","","","","","","","","","","","","","","","","","","","",""],["96","","","","","","","","Excavation Site III","-","Wooden Mask","23","42","C7b","","","","","","",""],["97","","","","","","","","Rocky Mask","24","45","C7c","","","","","","",""],["98","","","","","","","","","","","","","","","","","","","",""],["99","","","","","","","","Excavation Site <Camp>","Guild Rank Board","-","C7c","","","","","","",""],["100","","","","","","","","Shawn","C7d","","","","","","",""],["101","","","","","","","","Bulletin Board","","","","","","","",""],["102","","","","","","","","Shuang","","","","","","","",""],["103","","","","","","","","The Excavator Board","","","","","","","",""],["104","","","","","","","","","","","","","","","","","","","",""],["105","","","","","","","","Remains <Tomb> I","-","Skeledog","44","107","C7d","","","","","","",""],["106","","","","","","","","Mummydog","47","117","C7e","","","","","","",""],["107","","","","","","","","","","","","","","","","","","","",""],["108","","","","","","","","Remains <Tomb> II","-","Skeledog","44","107","C7e","","","","","","",""],["109","","","","","","","","Mummydog","47","117","C7f","","","","","","",""],["110","","","","","","","","","","","","","C7g","","","","","","",""],["111","","","","","","","","","","","","","","","","","","","",""],["112","","","","","","","","Camp 1","-","Skeleton Soldier","57","190","C7f","","","","","","",""],["113","","","","","","","","Officer Skeleton","63","240","","","","","","","",""],["114","","","","","","","","","","","","","","","","","","","",""],["115","","","","","","","","Remains <Tomb> III","-","Mummydog","47","117","C7g","","","","","","",""],["116","","","","","","","","Skeleton Soldier","57","190","C7h","","","","","","",""],["117","","","","","","","","Officer Skeleton","63","240","C7i","","","","","","",""],["118","","","","","","","","","","","","","","","","","","","",""],["119","","","","","","","","Camp 2","-","Skeleton Soldier","57","190","C7h","","","","","","",""],["120","","","","","","","","Officer Skeleton","63","240","","","","","","","",""],["121","","","","","","","","","","","","","","","","","","","",""],["122","","","","","","","","Remains <Tomb> IV","-","Skeleton Soldier","57","190","C7i","","","","","","",""],["123","","","","","","","","Officer Skeleton","63","240","C7j","","","","","","",""],["124","","","","","","","","Commander Skeleton","73","315","C7k","","","","","","",""],["125","","","","","","","","","","","","","","","","","","","",""],["126","","","","","","","","Camp 3","-","Officer Skeleton","63","240","C7j","","","","","","",""],["127","","","","","","","","Commander Skeleton","73","315","","","","","","","",""],["128","","","","","","","","","","","","","","","","","","","",""],["129","","","","","","","","Remains <Cliff>","-","Commander Skeleton","73","315","C7k","","","","","","",""],["130","","","","","","","","","","","","","","","","","","","",""],["131","","","","","","","","","","","","","","","","","","","",""],["132","East Domain of Perion","-","Stump","4","8","C8","","Hidden Street - The Land of Wild Boar II","-","Wild Boar","25","42","C9","","","","","","",""],["133","Dark Stump","10","18","C9","","","","","","","","","","","","","",""],["134","Axe Stump","17","30","M4 (To Ellinia)","","","","","","","","","","","","","",""],["135","Dark Axe Stump","22","38","","","","","","","","","","","","","","",""],["136","Wild Boar","25","42","","","","","","","","","","","","","","",""],["137","","","","","","","","","","","","","","","","","","","",""],["138","","","","","","","","","","","","","","","","","","","",""],["139","","","","","","","","","","","","","","","","","","","",""],["140","Warning Street - Perion Dungeon Entrance (D)","","","","","","",""],["141","","","","","","",""],["142","Perion Dungeon Entrance","-","Dark Axe Stump","22","38","A6","","","","","","","","","","","","","",""],["143","Fire Boar","32","60","D1","","","","","","","","","","","","","",""],["144","Iron Boar","45","115","","","","","","","","","","","","","","",""],["145","","","","","","","","","","","","","","","","","","","",""],["146","","","","","","","","","","","","","","","","","","","",""],["147","Deep Valley I","-","Axe Stump","17","30","D1","","Hidden Street - Dangerous Valley","-","Copper Drake","45","105","D2","","","","","","",""],["148","Dark Axe Stump","22","38","D2","","Red Drake","60","220","D2a","","","","","","",""],["149","Wild Boar","25","42","D3","","","","","","","","","","","","","",""],["150","Fire Boar","32","60","","","Hidden Street - Dangerous Valley II","-","Red Drake","60","220","D2a","","","","","","",""],["151","Copper Drake","45","105","","","","","","","","","","","","","","",""],["152","","","","","","","","","","","","","","","","","","","",""],["153","","","","","","","","","","","","","","","","","","","",""],["154","Deep Valley II","-","Dark Axe Stump","22","38","D3","","The Burnt Land I","-","Fire Boar","32","60","D4","","","","","","",""],["155","Wild Boar","25","42","D4","","","","","","","D4a","","","","","","",""],["156","Fire Boar","32","60","D5","","","","","","","","","","","","","",""],["157","","","","","","","","The Burnt Land II","-","Fire Boar","32","60","D4a","","","","","","",""],["158","","","","","","","","Iron Boar","45","115","D4b","","","","","","",""],["159","","","","","","","","","","","","","","","","","","","",""],["160","","","","","","","","The Burnt Land III","-","Iron Boar","45","115","D4b","","","","","","",""],["161","","","","","","","","Red Drake","60","220","D4c","","","","","","",""],["162","","","","","","","","","","","","","","","","","","","",""],["163","","","","","","","","The Burnt Land IV","-","Red Drake","60","220","D4c","","","","","","",""],["164","","","","","","","","Hot Mixed Golem","68","275","D4d","","","","","","",""],["165","","","","","","","","","","","","","","","","","","","",""],["166","","","","","","","","The Burnt Land V","-","Hot Mixed Golem","68","275","D4d","","","","","","",""],["167","","","","","","","","","","","","","","","","","","","",""],["168","","","","","","","","","","","","","","","","","","","",""],["169","Deep Valley III","-","Dark Axe Stump","22","38","D5","","","","","","","","","","","","","",""],["170","Fire Boar","32","60","M9 (To Sleepywood)","","","","","","","","","","","","","",""],["171","Iron Boar","45","115","","","","","","","","","","","","","","",""]]

// 地圖名稱關鍵字
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
  'Regular Cab', 'VIP Cab', 'Corner', 'Site'
]

function isMapName(str) {
  if (!str || str === '-') return false
  return mapKeywords.some(kw => str.includes(kw))
}

function isSectionTitle(str) {
  if (!str) return false
  return (str.includes(' - ') && str.includes('Victoria Road')) ||
         (str.includes(' - ') && str.includes('Warning Street')) ||
         str.match(/\([A-Z]\)$/)
}

function parsePerionData(rows) {
  const sections = []
  let currentSection = null
  let currentLeftMap = null
  let currentRightMap = null

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
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
        if (col2 && col2 !== '-' && !parseInt(col2)) {
          currentLeftMap.npcs.push(col2)
        }
        if (col3 && col3 !== '-' && !/^\d+$/.test(col3)) {
          currentLeftMap.monsters.push({
            name: col3,
            level: parseInt(col4) || null,
            baseXP: parseInt(col5) || null
          })
        }
        if (col4 && col4.match(/^[A-Z]\d|^M\d/)) currentLeftMap.links.push(col4)
        if (col5 && col5.match(/^[A-Z]\d|^M\d/)) currentLeftMap.links.push(col5)
        if (col6 && col6.match(/^[A-Z]\d|^M\d/)) currentLeftMap.links.push(col6)
      } else if (currentLeftMap) {
        // 額外怪物: col1 是怪物名, col2 是等級
        if (parseInt(col2) && col1 && !/^\d+$/.test(col1)) {
          currentLeftMap.monsters.push({
            name: col1,
            level: parseInt(col2) || null,
            baseXP: parseInt(col3) || null
          })
        } else if (col1 !== '-' && !col1.match(/^[A-Z]\d|^M\d/) && !/^\d+$/.test(col1) && !parseInt(col2)) {
          currentLeftMap.npcs.push(col1)
        }
        if (col2 && col2.match(/^[A-Z]\d|^M\d/)) {
          if (!currentLeftMap.links.includes(col2)) currentLeftMap.links.push(col2)
        }
        if (col4 && col4.match(/^[A-Z]\d|^M\d/)) {
          if (!currentLeftMap.links.includes(col4)) currentLeftMap.links.push(col4)
        }
      }
    }

    // 處理右側資料
    if (col8) {
      if (isMapName(col8)) {
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
        if (col9 && col9 !== '-' && !parseInt(col9)) {
          currentRightMap.npcs.push(col9)
        }
        if (col10 && col10 !== '-' && !/^\d+$/.test(col10)) {
          currentRightMap.monsters.push({
            name: col10,
            level: parseInt(col11) || null,
            baseXP: parseInt(col12) || null
          })
        }
        if (col11 && col11.match(/^[A-Z]\d|^M\d/)) currentRightMap.links.push(col11)
        if (col12 && col12.match(/^[A-Z]\d|^M\d/)) currentRightMap.links.push(col12)
        if (col13 && col13.match(/^[A-Z]\d|^M\d/)) currentRightMap.links.push(col13)
      } else if (currentRightMap) {
        // 額外怪物: col8 是怪物名, col9 是等級
        if (parseInt(col9) && col8 !== '-' && !/^\d+$/.test(col8)) {
          currentRightMap.monsters.push({
            name: col8,
            level: parseInt(col9) || null,
            baseXP: parseInt(col10) || null
          })
        }
        // 原有格式: col10 是怪物名
        else if (col10 && col10 !== '-' && !/^\d+$/.test(col10)) {
          currentRightMap.monsters.push({
            name: col10,
            level: parseInt(col11) || null,
            baseXP: parseInt(col12) || null
          })
        }
        // 額外 NPC
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

// 主程式
const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'))

// 解析 Perion 資料
const perionSections = parsePerionData(perionRawData)

// 計算統計
let mapCount = 0
let monsterCount = 0
for (const section of perionSections) {
  mapCount += section.maps.length
  for (const map of section.maps) {
    monsterCount += map.monsters.length
  }
}

console.log(`Parsed Perion: ${perionSections.length} sections, ${mapCount} maps, ${monsterCount} monster spawns`)

// 更新資料庫
db.regions.perion = {
  name: 'Perion',
  sections: perionSections
}

// 驗證 Stumpy
let stumpyFound = false
for (const section of perionSections) {
  for (const map of section.maps) {
    for (const mon of map.monsters) {
      if (mon.name === 'Stumpy') {
        console.log(`✅ Found Stumpy in "${map.name}": Level ${mon.level}, XP ${mon.baseXP}`)
        stumpyFound = true
      }
    }
  }
}

if (!stumpyFound) {
  console.log('❌ Stumpy not found!')
}

// 寫入更新後的資料庫
fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8')
console.log('\nDatabase updated successfully!')
