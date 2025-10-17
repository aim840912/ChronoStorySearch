const fs = require('fs');
const path = require('path');

/**
 * 為 drops.json 增加 chineseMobName 欄位
 * 透過比對 drops-new.json 的 mobId 來獲取對應的中文怪物名稱
 */

const DROPS_FILE = path.join(__dirname, '..', 'public', 'data', 'drops.json');
const DROPS_NEW_FILE = path.join(__dirname, '..', 'public', 'data', 'drops-new.json');
const OUTPUT_FILE = path.join(__dirname, '..', 'public', 'data', 'drops.json');
const BACKUP_FILE = path.join(__dirname, '..', 'public', 'data', 'drops.backup-mob-names.json');

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

// 建立 mobId -> chineseMobName 映射表
console.log('建立映射表...');
const chineseMobNameMap = new Map();

dropsNew.forEach(item => {
  if (item.mobId && item.mobName) {
    // 如果同一個 mobId 出現多次，保留第一個（它們應該都一樣）
    if (!chineseMobNameMap.has(item.mobId)) {
      chineseMobNameMap.set(item.mobId, item.mobName);
    }
  }
});

console.log(`✓ 映射表建立完成: ${chineseMobNameMap.size} 個獨特的 mobId\n`);

// 為 drops.json 添加 chineseMobName
console.log('合併中文怪物名稱...');
let matchCount = 0;
let noMatchCount = 0;
const noMatchExamples = [];

drops.forEach((drop, index) => {
  const chineseMobName = chineseMobNameMap.get(drop.mobId);

  if (chineseMobName) {
    drop.chineseMobName = chineseMobName;
    matchCount++;
  } else {
    drop.chineseMobName = null;
    noMatchCount++;

    // 記錄前 10 個無法匹配的範例
    if (noMatchExamples.length < 10) {
      noMatchExamples.push({
        index,
        mobId: drop.mobId,
        mobName: drop.mobName
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
    console.log(`  [${item.index}] mobId=${item.mobId}, mobName="${item.mobName}"`);
  });
}

// 寫入結果
console.log(`\n寫入結果到 ${OUTPUT_FILE}...`);
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(drops, null, 2), 'utf-8');
console.log('✓ 完成！\n');

// 顯示範例
console.log('轉換範例:\n');

// 顯示成功匹配的範例
const matchedExample = drops.find(d => d.chineseMobName !== null);
if (matchedExample) {
  console.log('【成功匹配】');
  console.log(`  mobId: ${matchedExample.mobId}`);
  console.log(`  mobName (英文): ${matchedExample.mobName}`);
  console.log(`  chineseMobName (中文): ${matchedExample.chineseMobName}`);
  console.log(`  itemName: ${matchedExample.itemName}\n`);
}

// 顯示無法匹配的範例
const unmatchedExample = drops.find(d => d.chineseMobName === null);
if (unmatchedExample) {
  console.log('【無法匹配】');
  console.log(`  mobId: ${unmatchedExample.mobId}`);
  console.log(`  mobName (英文): ${unmatchedExample.mobName}`);
  console.log(`  chineseMobName: ${unmatchedExample.chineseMobName}`);
  console.log(`  itemName: ${unmatchedExample.itemName}`);
}
