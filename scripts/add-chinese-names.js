const fs = require('fs');
const path = require('path');

/**
 * 為 drops.json 增加 chineseItemName 欄位
 * 透過比對 drops-new.json 的 itemId 來獲取對應的中文名稱
 */

const DROPS_FILE = path.join(__dirname, '..', 'public', 'data', 'drops.json');
const DROPS_NEW_FILE = path.join(__dirname, '..', 'public', 'data', 'drops-new.json');
const OUTPUT_FILE = path.join(__dirname, '..', 'public', 'data', 'drops.json');
const BACKUP_FILE = path.join(__dirname, '..', 'public', 'data', 'drops.backup.json');

console.log('開始處理 drops.json...\n');

// 讀取文件
console.log('讀取文件...');
const drops = JSON.parse(fs.readFileSync(DROPS_FILE, 'utf-8'));
const dropsNew = JSON.parse(fs.readFileSync(DROPS_NEW_FILE, 'utf-8'));

console.log(`- drops.json: ${drops.length} 筆資料`);
console.log(`- drops-new.json: ${dropsNew.length} 筆資料\n`);

// 備份原始文件
fs.copyFileSync(DROPS_FILE, BACKUP_FILE);
console.log(`✓ 已備份至 ${BACKUP_FILE}\n`);

// 建立 itemId -> chineseItemName 映射表
console.log('建立映射表...');
const chineseNameMap = new Map();

dropsNew.forEach(item => {
  if (item.itemId && item.chineseItemName) {
    // 如果同一個 itemId 出現多次，保留第一個
    if (!chineseNameMap.has(item.itemId)) {
      chineseNameMap.set(item.itemId, item.chineseItemName);
    }
  }
});

console.log(`✓ 映射表建立完成: ${chineseNameMap.size} 個獨特的 itemId\n`);

// 為 drops.json 添加 chineseItemName
console.log('合併中文名稱...');
let matchCount = 0;
let noMatchCount = 0;
const noMatchExamples = [];

drops.forEach((drop, index) => {
  const chineseItemName = chineseNameMap.get(drop.itemId);

  if (chineseItemName) {
    drop.chineseItemName = chineseItemName;
    matchCount++;
  } else {
    drop.chineseItemName = null;
    noMatchCount++;

    // 記錄前 10 個無法匹配的範例
    if (noMatchExamples.length < 10) {
      noMatchExamples.push({
        index,
        itemId: drop.itemId,
        itemName: drop.itemName
      });
    }
  }
});

console.log('\n處理完成:');
console.log(`✓ 成功匹配: ${matchCount} 筆 (${(matchCount / drops.length * 100).toFixed(1)}%)`);
console.log(`ℹ 無法匹配: ${noMatchCount} 筆 (${(noMatchCount / drops.length * 100).toFixed(1)}%)`);

if (noMatchExamples.length > 0) {
  console.log('\n無法匹配的範例 (設為 null):');
  noMatchExamples.forEach(item => {
    console.log(`  [${item.index}] itemId=${item.itemId}, itemName="${item.itemName}"`);
  });
}

// 寫入結果
console.log(`\n寫入結果到 ${OUTPUT_FILE}...`);
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(drops, null, 2), 'utf-8');
console.log('✓ 完成！\n');

// 顯示範例
console.log('轉換範例:\n');

// 顯示成功匹配的範例
const matchedExample = drops.find(d => d.chineseItemName !== null);
if (matchedExample) {
  console.log('【成功匹配】');
  console.log(`  mobName: ${matchedExample.mobName}`);
  console.log(`  itemId: ${matchedExample.itemId}`);
  console.log(`  itemName: ${matchedExample.itemName}`);
  console.log(`  chineseItemName: ${matchedExample.chineseItemName}\n`);
}

// 顯示無法匹配的範例
const unmatchedExample = drops.find(d => d.chineseItemName === null);
if (unmatchedExample) {
  console.log('【無法匹配】');
  console.log(`  mobName: ${unmatchedExample.mobName}`);
  console.log(`  itemId: ${unmatchedExample.itemId}`);
  console.log(`  itemName: ${unmatchedExample.itemName}`);
  console.log(`  chineseItemName: ${unmatchedExample.chineseItemName}`);
}
