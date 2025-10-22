const fs = require('fs');
const path = require('path');

// 讀取翻譯對照表
const translationDraftPath = path.join(__dirname, '../data/map-translation-draft.json');
if (!fs.existsSync(translationDraftPath)) {
  console.error('❌ 找不到翻譯對照檔案：', translationDraftPath);
  console.error('請先執行：node scripts/generate-map-translation-draft.js');
  process.exit(1);
}

const translationDraft = JSON.parse(fs.readFileSync(translationDraftPath, 'utf8'));

// 讀取主資料庫
const dataPath = path.join(__dirname, '../data/map-monster-database.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

// 備份原始檔案
const backupPath = path.join(__dirname, '../data/map-monster-database.json.backup');
fs.copyFileSync(dataPath, backupPath);
console.log('✓ 已備份原始檔案到：', backupPath);

// 建立英文名稱到翻譯的映射
const translationMap = {};
Object.values(translationDraft).forEach(regionMaps => {
  Object.entries(regionMaps).forEach(([englishName, chineseName]) => {
    translationMap[englishName] = chineseName;
  });
});

// 應用翻譯
let updatedCount = 0;
const updateLog = [];

data.regions.forEach(region => {
  region.maps.forEach(map => {
    if (translationMap[map.name]) {
      const oldTranslation = map.chineseName;
      const newTranslation = translationMap[map.name];

      // 只在翻譯不同時才更新
      if (oldTranslation !== newTranslation) {
        map.chineseName = newTranslation;
        updatedCount++;
        updateLog.push({
          region: region.name,
          name: map.name,
          old: oldTranslation,
          new: newTranslation
        });
      }
    }
  });
});

// 寫入更新後的資料
fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf8');
console.log('✓ 已更新主資料庫：', dataPath);

// 生成更新報告
const reportPath = path.join(__dirname, '../data/translation-update-report.txt');
const reportLines = [
  '='.repeat(80),
  '地圖翻譯更新報告',
  '='.repeat(80),
  '',
  `更新時間：${new Date().toLocaleString('zh-TW')}`,
  `更新數量：${updatedCount} 個地圖`,
  '',
  '='.repeat(80),
  '詳細更新記錄',
  '='.repeat(80),
  ''
];

let currentRegion = '';
updateLog.forEach(entry => {
  if (currentRegion !== entry.region) {
    currentRegion = entry.region;
    reportLines.push('');
    reportLines.push(`【${currentRegion}】`);
    reportLines.push('-'.repeat(80));
  }
  reportLines.push(`地圖：${entry.name}`);
  reportLines.push(`  原翻譯：${entry.old}`);
  reportLines.push(`  新翻譯：${entry.new}`);
  reportLines.push('');
});

fs.writeFileSync(reportPath, reportLines.join('\n'), 'utf8');

// 輸出結果
console.log('\n' + '='.repeat(60));
console.log('✓ 翻譯應用完成！');
console.log('='.repeat(60));
console.log(`更新數量：${updatedCount} 個地圖`);
console.log(`詳細報告：${reportPath}`);
console.log(`原始備份：${backupPath}`);
console.log('='.repeat(60));

// 顯示前 10 個更新範例
if (updateLog.length > 0) {
  console.log('\n前 10 個更新範例：');
  updateLog.slice(0, 10).forEach((entry, i) => {
    console.log(`\n${i + 1}. ${entry.name}`);
    console.log(`   ${entry.old} → ${entry.new}`);
  });

  if (updateLog.length > 10) {
    console.log(`\n... 還有 ${updateLog.length - 10} 個更新，請查看詳細報告。`);
  }
}

console.log('\n如需復原，請執行：');
console.log(`cp ${backupPath} ${dataPath}`);
