/**
 * Consumable JSON 與 CSV 掉落表交叉比對腳本
 */

const fs = require('fs');
const path = require('path');

const CONSUMABLE_DIR = path.join(__dirname, '../chronostoryData/items-organized/consumable');
const CSV_FILE = path.join(__dirname, '../chronostoryData/csv-data/public-drop-table-enabled.csv');
const OUTPUT_FILE = path.join(__dirname, '../docs/consumable-csv-diff-report.md');

function parseCSV(content) {
  const lines = content.split('\n');
  const items = new Map(); // ItemID -> Set of ItemNames (可能有多個怪物掉落同一物品)

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = line.split(',');
    const itemId = parseInt(cols[6], 10); // ItemID 是第 7 欄 (index 6)
    const itemName = cols[8]; // ItemName 是第 9 欄 (index 8)

    // 只處理 consumable 範圍 (2000000 - 2999999)
    if (itemId >= 2000000 && itemId < 3000000) {
      if (!items.has(itemId)) {
        items.set(itemId, new Set());
      }
      if (itemName) {
        items.get(itemId).add(itemName);
      }
    }
  }

  return items;
}

function loadConsumableJSON() {
  const items = new Map();
  const files = fs.readdirSync(CONSUMABLE_DIR).filter(f => f.endsWith('.json'));

  for (const file of files) {
    const filePath = path.join(CONSUMABLE_DIR, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    items.set(data.id, data.description?.name || '(無名稱)');
  }

  return items;
}

function generateReport(jsonItems, csvItems) {
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

  // 找出差異
  const onlyInJSON = [];
  const onlyInCSV = [];
  const nameDiffs = [];

  // JSON 有但 CSV 沒有
  for (const [id, name] of jsonItems) {
    if (!csvItems.has(id)) {
      onlyInJSON.push({ id, name });
    }
  }

  // CSV 有但 JSON 沒有
  for (const [id, names] of csvItems) {
    if (!jsonItems.has(id)) {
      onlyInCSV.push({ id, names: Array.from(names) });
    }
  }

  // 名稱不同
  for (const [id, jsonName] of jsonItems) {
    if (csvItems.has(id)) {
      const csvNames = csvItems.get(id);
      // 檢查 JSON 名稱是否在 CSV 名稱中
      if (!csvNames.has(jsonName)) {
        nameDiffs.push({
          id,
          jsonName,
          csvNames: Array.from(csvNames),
        });
      }
    }
  }

  let md = `# Consumable 與 CSV 掉落表差異報告

生成時間：${now}

## 統計摘要

| 項目 | 數量 |
|------|------|
| JSON 檔案數 | ${jsonItems.size} |
| CSV 中的 Consumable ID 數 | ${csvItems.size} |
| JSON 有但 CSV 沒有 | ${onlyInJSON.length} |
| CSV 有但 JSON 沒有 | ${onlyInCSV.length} |
| 名稱不同 | ${nameDiffs.length} |

---

`;

  if (onlyInJSON.length > 0) {
    md += `## JSON 有但 CSV 沒有 (${onlyInJSON.length} 個)

這些物品在 JSON 中存在，但不在掉落表中（可能是非掉落取得的物品）。

| ID | 名稱 |
|----|------|
`;
    for (const item of onlyInJSON.sort((a, b) => a.id - b.id)) {
      md += `| ${item.id} | ${item.name} |\n`;
    }
    md += '\n';
  }

  if (onlyInCSV.length > 0) {
    md += `## CSV 有但 JSON 沒有 (${onlyInCSV.length} 個)

這些物品在掉落表中存在，但沒有對應的 JSON 檔案。

| ID | CSV 名稱 |
|----|----------|
`;
    for (const item of onlyInCSV.sort((a, b) => a.id - b.id)) {
      md += `| ${item.id} | ${item.names.join(', ')} |\n`;
    }
    md += '\n';
  }

  if (nameDiffs.length > 0) {
    md += `## 名稱不同 (${nameDiffs.length} 個)

這些物品的 ID 相同，但名稱不一致。

| ID | JSON 名稱 | CSV 名稱 |
|----|-----------|----------|
`;
    for (const item of nameDiffs.sort((a, b) => a.id - b.id)) {
      md += `| ${item.id} | ${item.jsonName} | ${item.csvNames.join(', ')} |\n`;
    }
    md += '\n';
  }

  if (onlyInJSON.length === 0 && onlyInCSV.length === 0 && nameDiffs.length === 0) {
    md += '## 所有資料完全一致！\n';
  }

  return md;
}

function main() {
  console.log('載入 CSV 資料...');
  const csvContent = fs.readFileSync(CSV_FILE, 'utf-8');
  const csvItems = parseCSV(csvContent);
  console.log(`CSV 中找到 ${csvItems.size} 個 Consumable ID`);

  console.log('載入 JSON 資料...');
  const jsonItems = loadConsumableJSON();
  console.log(`JSON 中找到 ${jsonItems.size} 個檔案`);

  console.log('產生報告...');
  const report = generateReport(jsonItems, csvItems);

  // 確保輸出目錄存在
  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_FILE, report, 'utf-8');
  console.log(`報告已儲存至: ${OUTPUT_FILE}`);
}

main();
