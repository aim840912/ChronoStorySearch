/**
 * 為消耗品物品新增 effects 欄位到 metaInfo
 *
 * 從 description.description 解析效果並寫入 metaInfo.effects 陣列
 *
 * 使用方式：node scripts/add-effects-to-consumables.js
 */

const fs = require('fs')
const path = require('path')

const CONSUMABLE_DIR = path.join(__dirname, '../chronostoryData/items-organized/consumable')

/**
 * 解析物品描述中的效果
 * @param {string} description - 物品描述文字
 * @returns {string[]} - 效果陣列
 */
function parseEffects(description) {
  if (!description) return []

  const effects = []

  // 1. 解析 HP 恢復 (Recovers X HP, Recovers around X HP)
  const hpMatch = description.match(/Recovers?\s+(?:around\s+)?(\d+)\s*HP/i)
  if (hpMatch) {
    effects.push(`+${hpMatch[1]} HP`)
  }

  // 2. 解析 MP 恢復 (Recovers X MP, Recovers around X MP, restores X MP)
  const mpMatch = description.match(/(?:Recovers?|restores?)\s+(?:around\s+)?(\d+)\s*MP/i)
  if (mpMatch) {
    effects.push(`+${mpMatch[1]} MP`)
  }

  // 3. 解析 HP 和 MP 同時恢復 (Recovers X HP and X MP)
  const hpMpMatch = description.match(/Recovers?\s+(\d+)\s*HP\s+and\s+(\d+)\s*MP/i)
  if (hpMpMatch) {
    // 避免重複添加
    if (!effects.includes(`+${hpMpMatch[1]} HP`)) {
      effects.push(`+${hpMpMatch[1]} HP`)
    }
    if (!effects.includes(`+${hpMpMatch[2]} MP`)) {
      effects.push(`+${hpMpMatch[2]} MP`)
    }
  }

  // 4. 解析時效性增益 (Stat +X for Y min/minutes)
  // 支援格式：Speed +8 for 3 min, Att. + 5 for 10 minutes, Accuracy + 10 for 10 minutes
  const buffPatterns = [
    { pattern: /Speed\s*\+\s*(\d+)\s+for\s+(\d+)\s*(?:min|minutes)/i, stat: 'Speed' },
    { pattern: /Avoidab(?:i)?lity\s*\+\s*(\d+)\s+for\s+(\d+)\s*(?:min|minutes)/i, stat: 'Avoidability' },
    { pattern: /Magic\s*Attack\s*\+\s*(\d+)\s+for\s+(\d+)\s*(?:min|minutes)/i, stat: 'Magic Attack' },
    { pattern: /(?<!Magic\s)(?:Attack|Att\.?)\s*\+\s*(\d+)\s+for\s+(\d+)\s*(?:min|minutes)/i, stat: 'Attack' },
    { pattern: /Accuracy\s*\+\s*(\d+)\s+for\s+(\d+)\s*(?:min|minutes)/i, stat: 'Accuracy' },
    { pattern: /(?:Weapon\s+)?Def(?:ense)?\.?\s*\+\s*(\d+)\s+for\s+(\d+)\s*(?:min|minutes)/i, stat: 'Defense' },
    { pattern: /STR\s*\+\s*(\d+)\s+for\s+(\d+)\s*(?:min|minutes)/i, stat: 'STR' },
    { pattern: /DEX\s*\+\s*(\d+)\s+for\s+(\d+)\s*(?:min|minutes)/i, stat: 'DEX' },
    { pattern: /INT\s*\+\s*(\d+)\s+for\s+(\d+)\s*(?:min|minutes)/i, stat: 'INT' },
    { pattern: /LUK\s*\+\s*(\d+)\s+for\s+(\d+)\s*(?:min|minutes)/i, stat: 'LUK' },
  ]

  for (const { pattern, stat } of buffPatterns) {
    const match = description.match(pattern)
    if (match) {
      effects.push(`+${match[1]} ${stat}`)
    }
  }

  // 4.1 解析無數值的 Speed buff (Increased speed for X minutes)
  const increasedSpeedMatch = description.match(/Increased\s+speed\s+for\s+(\d+)\s*(?:min|minutes)/i)
  if (increasedSpeedMatch && !effects.some(e => e.includes('Speed'))) {
    effects.push(`+Speed`)
  }

  // 5. 解析百分比恢復 (Recovers X% HP)
  const hpPercentMatch = description.match(/Recovers?\s+(\d+)%\s*HP/i)
  if (hpPercentMatch) {
    effects.push(`+${hpPercentMatch[1]}% HP`)
  }

  const mpPercentMatch = description.match(/Recovers?\s+(\d+)%\s*MP/i)
  if (mpPercentMatch) {
    effects.push(`+${mpPercentMatch[1]}% MP`)
  }

  // 6. 解析全部恢復 (Recovers all HP and MP)
  const allHpMpMatch = description.match(/Recovers?\s+all\s+HP\s+and\s+MP/i)
  if (allHpMpMatch) {
    effects.push('+100% HP')
    effects.push('+100% MP')
  }

  // 7. 解析狀態解除效果 (Status Cure)
  const statusCurePatterns = [
    { pattern: /poison/i, effect: 'Cure Poison' },
    { pattern: /darkness/i, effect: 'Cure Darkness' },
    { pattern: /weakness/i, effect: 'Cure Weakness' },
    { pattern: /curse/i, effect: 'Cure Curse' },
    { pattern: /seal/i, effect: 'Cure Seal' },
    { pattern: /any\s+abnormal/i, effect: 'Cure All' },
  ]

  for (const { pattern, effect } of statusCurePatterns) {
    if (pattern.test(description)) {
      effects.push(effect)
    }
  }

  return effects
}

/**
 * 處理單一檔案
 */
function processFile(filePath) {
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))

  // 只處理 Potion 類別或有可解析效果的物品
  const subCategory = data.typeInfo?.subCategory
  const description = data.description?.description

  if (!description) {
    return { modified: false }
  }

  // 解析效果
  const effects = parseEffects(description)

  if (effects.length === 0) {
    return { modified: false }
  }

  // 寫入 metaInfo.effects
  data.metaInfo.effects = effects

  // 保存檔案
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2))

  return { modified: true, effects, name: data.description.name }
}

/**
 * 主程式
 */
function main() {
  console.log('開始處理消耗品物品效果...\n')

  const files = fs.readdirSync(CONSUMABLE_DIR).filter(f => f.endsWith('.json'))

  let modifiedCount = 0
  const modifiedItems = []

  for (const file of files) {
    const filePath = path.join(CONSUMABLE_DIR, file)
    const result = processFile(filePath)

    if (result.modified) {
      modifiedCount++
      modifiedItems.push({
        id: file.replace('.json', ''),
        name: result.name,
        effects: result.effects
      })
    }
  }

  console.log(`處理完成！`)
  console.log(`- 總檔案數: ${files.length}`)
  console.log(`- 修改檔案數: ${modifiedCount}`)
  console.log('')

  if (modifiedItems.length > 0) {
    console.log('修改的物品:')
    modifiedItems.slice(0, 20).forEach(item => {
      console.log(`  ${item.id} (${item.name}): ${item.effects.join(', ')}`)
    })

    if (modifiedItems.length > 20) {
      console.log(`  ... 還有 ${modifiedItems.length - 20} 個物品`)
    }
  }
}

main()
