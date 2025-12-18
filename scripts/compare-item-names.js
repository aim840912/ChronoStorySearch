const fs = require('fs');
const path = require('path');

// 讀取 item-index
const itemIndex = require('../chronostoryData/item-index.json');

// 判斷目錄
function getFolder(itemId) {
  const prefix = Math.floor(itemId / 1000000);
  if (prefix === 1) return 'equipment';
  if (prefix === 2) return 'consumable';
  return 'etc';
}

const nameDiffs = [];
const chineseNameDiffs = [];
const missingFiles = [];

// 比對每個物品
for (const item of itemIndex.items) {
  const folder = getFolder(item.itemId);
  const filePath = path.join(__dirname, '..', 'chronostoryData', 'items-organized', folder, `${item.itemId}.json`);

  if (!fs.existsSync(filePath)) {
    missingFiles.push(item.itemId);
    continue;
  }

  const organized = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  // 比對英文名稱
  if (item.itemName !== organized.description?.name) {
    nameDiffs.push({
      id: item.itemId,
      indexName: item.itemName,
      organizedName: organized.description?.name || '(undefined)'
    });
  }

  // 比對中文名稱
  const indexCn = item.chineseItemName || null;
  const organizedCn = organized.description?.chineseItemName || null;
  if (indexCn !== organizedCn) {
    chineseNameDiffs.push({
      id: item.itemId,
      indexName: indexCn,
      organizedName: organizedCn
    });
  }
}

// 生成報告
let report = '# Item Name Diff Report\n\n';
report += `Generated: ${new Date().toISOString().split('T')[0]}\n\n`;

report += '## Summary\n\n';
report += `- Total items in index: ${itemIndex.items.length}\n`;
report += `- Missing files: ${missingFiles.length}\n`;
report += `- English name differences: ${nameDiffs.length}\n`;
report += `- Chinese name differences: ${chineseNameDiffs.length}\n\n`;

if (missingFiles.length > 0) {
  report += '## Missing Files\n\n';
  report += '| Item ID |\n|---------|\n';
  missingFiles.forEach(id => {
    report += `| ${id} |\n`;
  });
  report += '\n';
}

if (nameDiffs.length > 0) {
  report += '## English Name Differences\n\n';
  report += '| Item ID | item-index | items-organized |\n';
  report += '|---------|------------|------------------|\n';
  nameDiffs.forEach(d => {
    report += `| ${d.id} | ${d.indexName} | ${d.organizedName} |\n`;
  });
  report += '\n';
}

if (chineseNameDiffs.length > 0) {
  report += '## Chinese Name Differences\n\n';
  report += '| Item ID | item-index | items-organized |\n';
  report += '|---------|------------|------------------|\n';
  chineseNameDiffs.forEach(d => {
    report += `| ${d.id} | ${d.indexName || '(null)'} | ${d.organizedName || '(null)'} |\n`;
  });
}

const outputPath = path.join(__dirname, '..', 'docs', 'item-name-diff-report.md');
fs.writeFileSync(outputPath, report);
console.log('Report generated:', outputPath);
console.log('Missing files:', missingFiles.length);
console.log('English name diffs:', nameDiffs.length);
console.log('Chinese name diffs:', chineseNameDiffs.length);
