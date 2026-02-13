/**
 * 修復 items-organized JSON 中 description.name 為中文的問題
 * 用 item-index.json 的 itemName（英文）替換
 */
const fs = require('fs');
const path = require('path');

const baseDir = 'chronostoryData/items-organized';
const folders = ['equipment', 'consumable', 'etc'];
const hasChinese = /[\u4e00-\u9fff\u3400-\u4dbf]/;

// 1. 建立 itemId → englishName 對照表
const itemIndex = JSON.parse(fs.readFileSync('chronostoryData/item-index.json', 'utf8'));
const englishNameMap = new Map();
for (const item of itemIndex.items) {
  if (item.itemId !== undefined && item.itemName) {
    englishNameMap.set(item.itemId, item.itemName);
  }
}
console.log(`載入 ${englishNameMap.size} 筆英文名稱對照`);

// 2. 掃描並修復
let fixed = 0, skipped = 0, notFound = 0;

for (const folder of folders) {
  const dir = path.join(baseDir, folder);
  if (!fs.existsSync(dir)) continue;
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));

  for (const file of files) {
    const filePath = path.join(dir, file);
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const name = data.description?.name;
      if (!name || !hasChinese.test(name)) continue;

      // 查找英文名稱
      const englishName = englishNameMap.get(data.id);
      if (!englishName) {
        console.log(`[SKIP] ${folder}/${data.id} | 找不到英文名稱 | 保持: ${name}`);
        notFound++;
        continue;
      }

      if (hasChinese.test(englishName)) {
        console.log(`[SKIP] ${folder}/${data.id} | item-index 也是中文: ${englishName}`);
        skipped++;
        continue;
      }

      // 修復
      const oldName = data.description.name;
      data.description.name = englishName;
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
      fixed++;
      console.log(`[FIX]  ${folder}/${data.id} | ${oldName} → ${englishName}`);
    } catch (e) {
      console.error(`[ERR]  ${filePath}: ${e.message}`);
    }
  }
}

console.log('');
console.log('=== 結果 ===');
console.log(`已修復: ${fixed}`);
console.log(`跳過（item-index 也是中文）: ${skipped}`);
console.log(`跳過（找不到英文名）: ${notFound}`);
