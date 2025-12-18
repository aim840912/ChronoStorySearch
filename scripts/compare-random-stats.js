/**
 * Compare API stats with local metaInfo
 * Output differences to random-stats-diff.md
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const EQUIPMENT_DIR = path.join(__dirname, '../chronostoryData/items-organized/equipment');
const OUTPUT_FILE = path.join(__dirname, '../random-stats-diff.md');
const API_BASE = 'https://chronostory-pr-9.onrender.com/api/item-info';
const DELAY_MS = 100; // Delay between API calls

// Field mapping: API stats -> local metaInfo
const FIELD_MAP = {
  str: 'incSTR',
  dex: 'incDEX',
  int: 'incINT',
  luk: 'incLUK',
  watk: 'incPAD',
  matk: 'incMAD',
  accuracy: 'incACC',
  avoidability: 'incEVA',
  speed: 'incSpeed',
  jump: 'incJump',
  hp: 'incMHP',
  mp: 'incMMP',
  wdef: 'incPDD',
  mdef: 'incMDD',
  upgrades: 'tuc',
  attack_speed: 'attackSpeed',
};

// Helper: delay
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper: fetch with retry
async function fetchItemInfo(itemId, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(`${API_BASE}?itemId=${itemId}`);
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      if (i === retries - 1) {
        console.error(`Failed to fetch ${itemId}: ${error.message}`);
        return null;
      }
      await delay(1000); // Wait before retry
    }
  }
  return null;
}

// Compare API stats with local metaInfo (bidirectional)
function compareStats(localItem, apiData) {
  const differences = [];
  const localMeta = localItem.metaInfo || {};
  const apiStats = apiData?.equipment?.stats || {};
  const checkedFields = new Set();

  // Direction 1: Compare API stats fields with local metaInfo
  for (const [apiField, localField] of Object.entries(FIELD_MAP)) {
    const apiValue = apiStats[apiField];
    const localValue = localMeta[localField];
    checkedFields.add(localField);

    // Skip if API value is null (equipment doesn't have this stat)
    if (apiValue === null || apiValue === undefined) continue;

    // Compare values
    const apiVal = apiValue;
    const localVal = localValue ?? null;

    if (apiVal !== localVal) {
      differences.push({
        field: `${apiField} (${localField})`,
        apiValue: apiVal,
        localValue: localVal === null ? '-' : localVal,
        note: localVal === null ? '本地缺少' : '數值不同',
      });
    }
  }

  // Direction 2: Check for local fields that API doesn't have
  for (const [apiField, localField] of Object.entries(FIELD_MAP)) {
    const localValue = localMeta[localField];
    const apiValue = apiStats[apiField];

    // If local has value but API is null/undefined
    if (
      localValue !== undefined &&
      localValue !== null &&
      (apiValue === null || apiValue === undefined)
    ) {
      differences.push({
        field: `${apiField} (${localField})`,
        apiValue: '-',
        localValue: localValue,
        note: 'API 缺少',
      });
    }
  }

  return differences;
}

// Generate markdown report
function generateReport(results, stats) {
  let md = `# Stats vs MetaInfo 差異報告

產生時間: ${new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}

## 統計摘要
- 總共比對: ${stats.total} 個物品
- 有差異: ${stats.withDiff} 個物品
- API 無資料: ${stats.noApiData} 個物品

## 差異列表

`;

  if (results.length === 0) {
    md += '無差異！所有 API stats 與本地 metaInfo 完全一致。\n';
    return md;
  }

  for (const item of results) {
    md += `### ${item.id} - ${item.name}\n\n`;
    md += '| 屬性 | API 值 | 本地值 | 備註 |\n';
    md += '|------|--------|--------|------|\n';

    for (const diff of item.differences) {
      md += `| ${diff.field} | ${diff.apiValue} | ${diff.localValue} | ${diff.note} |\n`;
    }
    md += '\n';
  }

  return md;
}

// Main
async function main() {
  console.log('開始比對 API stats vs 本地 metaInfo...\n');

  // Read all equipment files
  const files = fs.readdirSync(EQUIPMENT_DIR).filter((f) => f.endsWith('.json'));
  console.log(`找到 ${files.length} 個 equipment 檔案`);

  // Load all items
  const allItems = [];
  for (const file of files) {
    const filePath = path.join(EQUIPMENT_DIR, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    allItems.push(data);
  }
  console.log(`載入 ${allItems.length} 個物品\n`);

  // Compare each item
  const results = [];
  const stats = {
    total: allItems.length,
    withDiff: 0,
    noApiData: 0,
  };

  for (let i = 0; i < allItems.length; i++) {
    const item = allItems[i];
    const progress = `[${i + 1}/${allItems.length}]`;

    process.stdout.write(`\r${progress} 比對 ${item.id} - ${item.description?.name || 'Unknown'}...`);

    // Fetch API data
    const apiData = await fetchItemInfo(item.id);

    if (!apiData) {
      stats.noApiData++;
      results.push({
        id: item.id,
        name: item.description?.name || 'Unknown',
        differences: [
          {
            field: '-',
            apiValue: '-',
            localValue: '-',
            note: 'API 無資料',
          },
        ],
      });
      await delay(DELAY_MS);
      continue;
    }

    // Compare stats
    const differences = compareStats(item, apiData);

    if (differences.length > 0) {
      stats.withDiff++;
      results.push({
        id: item.id,
        name: item.description?.name || 'Unknown',
        differences,
      });
    }

    await delay(DELAY_MS);
  }

  console.log('\n\n比對完成！產生報告中...\n');

  // Generate and save report
  const report = generateReport(results, stats);
  fs.writeFileSync(OUTPUT_FILE, report, 'utf-8');

  console.log(`報告已儲存至: ${OUTPUT_FILE}`);
  console.log(`\n統計:`);
  console.log(`  - 總共比對: ${stats.total} 個`);
  console.log(`  - 有差異: ${stats.withDiff} 個`);
  console.log(`  - API 無資料: ${stats.noApiData} 個`);
}

main().catch(console.error);
