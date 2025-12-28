/**
 * 從 chronostoryData/items-organized/ 產生 item-attributes-essential.json
 *
 * 使用方式: node scripts/generate-item-attributes-essential.js
 */

const fs = require('fs')
const path = require('path')

const ITEMS_ORGANIZED_DIR = path.join(__dirname, '../chronostoryData/items-organized')
const OUTPUT_FILE = path.join(__dirname, '../chronostoryData/item-attributes-essential.json')

/**
 * 根據 reqJob 計算 equipment_classes
 * 參考: chronostoryData/REQJOB-REFERENCE.md
 */
function reqJobToClasses(reqJob) {
  // 0 或 -1 都表示全職業可用
  if (reqJob === 0 || reqJob === -1) {
    return {
      beginner: true,
      warrior: true,
      magician: true,
      bowman: true,
      thief: true,
      pirate: true,
    }
  }
  // 位元遮罩計算
  return {
    beginner: null,
    warrior: reqJob & 1 ? true : null,
    magician: reqJob & 2 ? true : null,
    bowman: reqJob & 4 ? true : null,
    thief: reqJob & 8 ? true : null,
    pirate: reqJob & 16 ? true : null,
  }
}

/**
 * 標準化物品類型
 */
function normalizeType(overallCategory) {
  switch (overallCategory) {
    case 'Equip':
      return 'Eqp'
    case 'Use':
      return 'Consume'
    case 'Etc':
      return 'Etc'
    default:
      return overallCategory || null
  }
}

/**
 * 判斷是否為卷軸
 */
function isScroll(item) {
  // 卷軸通常在 Use 類別，且 subCategory 包含 Scroll 或特定關鍵字
  if (!item.typeInfo) return false
  const subCategory = item.typeInfo.subCategory || ''
  return subCategory.toLowerCase().includes('scroll') || (item.id >= 2040000 && item.id < 2050000)
}

/**
 * 轉換單個物品
 */
function transformItem(item, sourceDir) {
  const isEquipment = sourceDir === 'equipment'
  const isScrollItem = isScroll(item)

  const essential = {
    item_id: String(item.id),
    item_name: item.description?.name || null,
    type: normalizeType(item.typeInfo?.overallCategory),
    sub_type: item.typeInfo?.subCategory || null,
    req_level: item.metaInfo?.reqLevel ?? null,
    req_str: item.metaInfo?.reqSTR ?? 0,
    req_dex: item.metaInfo?.reqDEX ?? 0,
    req_int: item.metaInfo?.reqINT ?? 0,
    req_luk: item.metaInfo?.reqLUK ?? 0,
    equipment_category: isEquipment ? item.typeInfo?.subCategory || null : null,
    equipment_classes: isEquipment ? reqJobToClasses(item.metaInfo?.reqJob ?? 0) : null,
    scroll_category: isScrollItem ? item.typeInfo?.subCategory || null : null,
    attack_speed: isEquipment ? (item.metaInfo?.attackSpeed ?? null) : null,  // 攻擊速度 (2=最快, 9=最慢)
    // 四維屬性
    inc_str: isEquipment ? (item.metaInfo?.incSTR ?? 0) : 0,
    inc_dex: isEquipment ? (item.metaInfo?.incDEX ?? 0) : 0,
    inc_int: isEquipment ? (item.metaInfo?.incINT ?? 0) : 0,
    inc_luk: isEquipment ? (item.metaInfo?.incLUK ?? 0) : 0,
    // 攻擊/魔攻
    inc_pad: isEquipment ? (item.metaInfo?.incPAD ?? 0) : 0,
    inc_mad: isEquipment ? (item.metaInfo?.incMAD ?? 0) : 0,
    // 防禦
    inc_pdd: isEquipment ? (item.metaInfo?.incPDD ?? 0) : 0,
    inc_mdd: isEquipment ? (item.metaInfo?.incMDD ?? 0) : 0,
    // HP/MP
    inc_mhp: isEquipment ? (item.metaInfo?.incMHP ?? 0) : 0,
    inc_mmp: isEquipment ? (item.metaInfo?.incMMP ?? 0) : 0,
    // 命中/迴避
    inc_acc: isEquipment ? (item.metaInfo?.incACC ?? 0) : 0,
    inc_eva: isEquipment ? (item.metaInfo?.incEVA ?? 0) : 0,
    // 速度/跳躍
    inc_speed: isEquipment ? (item.metaInfo?.incSpeed ?? 0) : 0,
    inc_jump: isEquipment ? (item.metaInfo?.incJump ?? 0) : 0,
    // 升級次數
    tuc: isEquipment ? (item.metaInfo?.tuc ?? 0) : 0,
  }

  return essential
}

/**
 * 讀取目錄下所有 JSON 檔案
 */
function readJsonFilesFromDir(dirPath, dirName) {
  const items = []
  const files = fs.readdirSync(dirPath).filter((f) => f.endsWith('.json'))

  for (const file of files) {
    try {
      const filePath = path.join(dirPath, file)
      const content = fs.readFileSync(filePath, 'utf-8')
      const item = JSON.parse(content)
      const transformed = transformItem(item, dirName)
      items.push(transformed)
    } catch (err) {
      console.error(`Error reading ${file}:`, err.message)
    }
  }

  return items
}

/**
 * 主函數
 */
function main() {
  console.log('Starting item-attributes-essential.json generation...\n')

  const allItems = []
  const dirs = ['equipment', 'consumable', 'etc']

  for (const dir of dirs) {
    const dirPath = path.join(ITEMS_ORGANIZED_DIR, dir)
    if (fs.existsSync(dirPath)) {
      const items = readJsonFilesFromDir(dirPath, dir)
      console.log(`  ${dir}/: ${items.length} items`)
      allItems.push(...items)
    } else {
      console.log(`  ${dir}/: directory not found`)
    }
  }

  // 按 item_id 排序
  allItems.sort((a, b) => parseInt(a.item_id, 10) - parseInt(b.item_id, 10))

  // 寫入輸出檔案
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allItems, null, 2), 'utf-8')

  console.log(`\nTotal: ${allItems.length} items`)
  console.log(`Output: ${OUTPUT_FILE}`)

  // 計算檔案大小
  const stats = fs.statSync(OUTPUT_FILE)
  console.log(`Size: ${(stats.size / 1024).toFixed(1)} KB`)
}

main()
