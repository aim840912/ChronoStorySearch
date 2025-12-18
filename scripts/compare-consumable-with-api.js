/**
 * Consumable 資料比對腳本
 * 比對本地 JSON 與 ChronoStory API 回傳的資料
 */

const fs = require('fs');
const path = require('path');

const CONSUMABLE_DIR = path.join(__dirname, '../chronostoryData/items-organized/consumable');
const OUTPUT_FILE = path.join(__dirname, '../docs/consumable-diff-report.md');
const API_BASE = 'https://chronostory.onrender.com/api/item-info';
const DELAY_MS = 100;

// 欄位映射：本地 -> API
// 已移除 slotMax 和 tradeBlock（資料格式差異，非實際錯誤）
const FIELD_MAPPINGS = {
  // 基本資訊
  name: { local: 'description.name', api: 'item_name' },
  price: { local: 'metaInfo.price', api: 'sale_price' },

  // 卷軸屬性 (scroll.stats)
  incSTR: { local: 'metaInfo.incSTR', api: 'scroll.stats.str' },
  incDEX: { local: 'metaInfo.incDEX', api: 'scroll.stats.dex' },
  incINT: { local: 'metaInfo.incINT', api: 'scroll.stats.int' },
  incLUK: { local: 'metaInfo.incLUK', api: 'scroll.stats.luk' },
  incPAD: { local: 'metaInfo.incPAD', api: 'scroll.stats.watk' },
  incMAD: { local: 'metaInfo.incMAD', api: 'scroll.stats.matk' },
  incACC: { local: 'metaInfo.incACC', api: 'scroll.stats.accuracy' },
  incEVA: { local: 'metaInfo.incEVA', api: 'scroll.stats.avoidability' },
  incSpeed: { local: 'metaInfo.incSpeed', api: 'scroll.stats.speed' },
  incJump: { local: 'metaInfo.incJump', api: 'scroll.stats.jump' },
  incMHP: { local: 'metaInfo.incMHP', api: 'scroll.stats.hp' },
  incMMP: { local: 'metaInfo.incMMP', api: 'scroll.stats.mp' },
  incPDD: { local: 'metaInfo.incPDD', api: 'scroll.stats.wdef' },
  incMDD: { local: 'metaInfo.incMDD', api: 'scroll.stats.mdef' },
};

function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchApiData(itemId) {
  const url = `${API_BASE}?itemId=${itemId}`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return { error: `HTTP ${response.status}` };
    }
    return await response.json();
  } catch (err) {
    return { error: err.message };
  }
}

function compareItem(localData, apiData) {
  const differences = [];

  for (const [fieldName, mapping] of Object.entries(FIELD_MAPPINGS)) {
    const localValue = getNestedValue(localData, mapping.local);
    const apiValue = getNestedValue(apiData, mapping.api);

    // 跳過兩邊都是 null/undefined 的情況
    if (localValue == null && apiValue == null) continue;

    // 標準化比較 (處理 null vs undefined)
    const normalizedLocal = localValue ?? null;
    const normalizedApi = apiValue ?? null;

    // 數值比較
    if (normalizedLocal !== normalizedApi) {
      differences.push({
        field: fieldName,
        local: localValue,
        api: apiValue,
      });
    }
  }

  return differences;
}

function generateMarkdownReport(results, totalCount) {
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const itemsWithDiff = results.filter(r => r.differences.length > 0 || r.error);

  let md = `# Consumable 資料差異報告

生成時間：${now}
比對數量：${totalCount} 個檔案
發現差異：${itemsWithDiff.length} 個檔案

---

`;

  if (itemsWithDiff.length === 0) {
    md += '## 所有檔案資料一致！\n';
    return md;
  }

  md += '## 差異列表\n\n';

  for (const item of itemsWithDiff) {
    md += `### ${item.itemId}\n`;
    md += `**本地名稱**: ${item.localName || 'N/A'}\n\n`;

    if (item.error) {
      md += `API 錯誤: ${item.error}\n\n`;
      continue;
    }

    if (item.differences.length > 0) {
      md += '| 欄位 | 本地值 | API 值 |\n';
      md += '|------|--------|--------|\n';

      for (const diff of item.differences) {
        const localStr = diff.local === null || diff.local === undefined ? '(未設定)' : String(diff.local);
        const apiStr = diff.api === null || diff.api === undefined ? '(未設定)' : String(diff.api);
        md += `| ${diff.field} | ${localStr} | ${apiStr} |\n`;
      }
      md += '\n';
    }
  }

  return md;
}

async function main() {
  console.log('開始比對 consumable 資料...');

  // 確保輸出目錄存在
  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // 讀取所有 consumable JSON 檔案
  const files = fs.readdirSync(CONSUMABLE_DIR)
    .filter(f => f.endsWith('.json'))
    .sort();

  console.log(`找到 ${files.length} 個檔案`);

  const results = [];
  let processedCount = 0;

  for (const file of files) {
    const filePath = path.join(CONSUMABLE_DIR, file);
    const localData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const itemId = localData.id;

    processedCount++;
    if (processedCount % 50 === 0) {
      console.log(`處理進度: ${processedCount}/${files.length}`);
    }

    // 呼叫 API
    const apiData = await fetchApiData(itemId);

    if (apiData.error) {
      results.push({
        itemId,
        localName: localData.description?.name,
        error: apiData.error,
        differences: [],
      });
    } else {
      const differences = compareItem(localData, apiData);
      results.push({
        itemId,
        localName: localData.description?.name,
        apiName: apiData.item_name,
        differences,
      });
    }

    await delay(DELAY_MS);
  }

  // 產生報告
  const report = generateMarkdownReport(results, files.length);
  fs.writeFileSync(OUTPUT_FILE, report, 'utf-8');

  const diffCount = results.filter(r => r.differences.length > 0 || r.error).length;
  console.log(`\n完成！發現 ${diffCount} 個檔案有差異`);
  console.log(`報告已儲存至: ${OUTPUT_FILE}`);
}

main().catch(console.error);
