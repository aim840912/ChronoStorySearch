const fs = require('fs');
const path = require('path');

/**
 * 將 drops-new.json 中的 itemName 分成中文名和英文名
 * 原格式: "中文名(英文名)"
 * 轉換後:
 *   - itemName: 英文名
 *   - chineseItemName: 中文名
 */

const INPUT_FILE = path.join(__dirname, '..', 'public', 'data', 'drops-new.json');
const OUTPUT_FILE = path.join(__dirname, '..', 'public', 'data', 'drops-new.json');
const BACKUP_FILE = path.join(__dirname, '..', 'public', 'data', 'drops-new.backup.json');

console.log('開始處理 drops-new.json...');

// 讀取原始文件
const rawData = fs.readFileSync(INPUT_FILE, 'utf-8');
const drops = JSON.parse(rawData);

console.log(`總共 ${drops.length} 筆資料`);

// 備份原始文件
fs.copyFileSync(INPUT_FILE, BACKUP_FILE);
console.log(`已備份至 ${BACKUP_FILE}`);

// 轉換數據
let successCount = 0;
let failCount = 0;
const failedItems = [];

drops.forEach((drop, index) => {
  const originalName = drop.itemName;

  // 使用正則表達式匹配格式: 中文名(英文名)
  const match = originalName.match(/^(.+?)\((.+)\)$/);

  if (match) {
    const chineseItemName = match[1].trim();
    const englishName = match[2].trim();

    drop.chineseItemName = chineseItemName;
    drop.itemName = englishName;
    successCount++;
  } else {
    failCount++;
    failedItems.push({
      index,
      itemId: drop.itemId,
      originalName
    });
  }
});

console.log(`\n處理完成:`);
console.log(`✓ 成功: ${successCount} 筆`);
console.log(`✗ 失敗: ${failCount} 筆`);

if (failedItems.length > 0) {
  console.log(`\n無法解析的項目:`);
  failedItems.slice(0, 10).forEach(item => {
    console.log(`  - [${item.index}] itemId=${item.itemId}, name="${item.originalName}"`);
  });
  if (failedItems.length > 10) {
    console.log(`  ... 還有 ${failedItems.length - 10} 筆`);
  }
}

// 寫入結果
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(drops, null, 2), 'utf-8');
console.log(`\n結果已寫入 ${OUTPUT_FILE}`);

// 顯示範例
console.log(`\n轉換範例 (前 3 筆):`);
drops.slice(0, 3).forEach((drop, i) => {
  console.log(`\n[${i + 1}]`);
  console.log(`  mobName: ${drop.mobName}`);
  console.log(`  itemId: ${drop.itemId}`);
  console.log(`  chineseItemName: ${drop.chineseItemName}`);
  console.log(`  itemName: ${drop.itemName}`);
});
