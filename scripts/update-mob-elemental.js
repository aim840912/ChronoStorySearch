const fs = require('fs');
const path = require('path');

// 配置
const API_BASE = 'https://maplestory.io/api/GMS/83/mob';
const MOB_INFO_PATH = path.join(__dirname, '../data/mob-info.json');
const REPORT_PATH = path.join(__dirname, '../docs/mobs-without-api-data.md');
const DELAY_MS = 100;

// 元素代碼映射
const ELEMENT_MAP = {
  F: 'fire_weakness',
  I: 'ice_weakness',
  L: 'lightning_weakness',
  H: 'holy_weakness',
  S: 'poison_weakness',
  D: 'dark_weakness'
};

// 記錄特殊情況
const report = {
  noElementalAttributes: [],
  weaknessZero: [],
  localValueNoApiMatch: [],
  api404: []
};

// 解析 elementalAttributes 代碼
function parseElementalAttributes(code) {
  if (!code) return {};
  const result = {};
  const regex = /([FILHSD])(\d)/g;
  let match;
  while ((match = regex.exec(code)) !== null) {
    const [, letter, number] = match;
    const field = ELEMENT_MAP[letter];
    if (field) {
      result[field] = parseInt(number, 10);
    }
  }
  return result;
}

// 延遲函數
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 獲取單個怪物的 API 資料
async function fetchMobData(mobId) {
  try {
    const response = await fetch(`${API_BASE}/${mobId}`);
    if (response.status === 404) {
      return { error: '404' };
    }
    if (!response.ok) {
      return { error: `HTTP ${response.status}` };
    }
    const data = await response.json();
    // 注意：elementalAttributes 和 isUndead 在 meta 對象內
    const meta = data.meta || {};
    return {
      elementalAttributes: meta.elementalAttributes || null,
      isUndead: meta.isUndead || false,
      isBoss: meta.isBoss || false
    };
  } catch (error) {
    return { error: error.message };
  }
}

// 檢查本地有值但 API 無對應
function checkLocalValueNoApiMatch(mob, apiElements) {
  const localFields = ['fire_weakness', 'ice_weakness', 'lightning_weakness', 'holy_weakness', 'poison_weakness'];
  const mismatches = [];
  for (const field of localFields) {
    const localValue = mob[field];
    const apiValue = apiElements[field];
    if (localValue !== null && localValue !== undefined && apiValue === undefined) {
      mismatches.push({
        element: field.replace('_weakness', ''),
        localValue: localValue
      });
    }
  }
  return mismatches;
}

// 主函數
async function main() {
  console.log('讀取 mob-info.json...');
  const mobInfoRaw = fs.readFileSync(MOB_INFO_PATH, 'utf-8');
  const mobInfo = JSON.parse(mobInfoRaw);
  console.log(`共 ${mobInfo.length} 隻怪物，開始更新...`);

  for (let i = 0; i < mobInfo.length; i++) {
    const entry = mobInfo[i];
    const mob = entry.mob;
    const mobId = mob.mob_id;
    const mobName = mob.mob_name;

    process.stdout.write(`\r[${i + 1}/${mobInfo.length}] 處理 ${mobId} ${mobName}...`);

    // 先檢查本地 weakness: 0 的情況
    const localFields = ['fire_weakness', 'ice_weakness', 'lightning_weakness', 'holy_weakness', 'poison_weakness'];
    for (const field of localFields) {
      if (mob[field] === 0) {
        report.weaknessZero.push({
          id: mobId,
          name: mobName,
          chineseName: entry.chineseMobName,
          element: field.replace('_weakness', ''),
          originalValue: 0
        });
      }
    }

    // 獲取 API 資料
    const apiData = await fetchMobData(mobId);

    if (apiData.error === '404') {
      report.api404.push({
        id: mobId,
        name: mobName,
        chineseName: entry.chineseMobName
      });
      mob.fire_weakness = null;
      mob.ice_weakness = null;
      mob.lightning_weakness = null;
      mob.holy_weakness = null;
      mob.poison_weakness = null;
      mob.dark_weakness = null;
      mob.isUndead = false;
      mob.isBoss = false;
    } else if (apiData.error) {
      console.log(`\n警告: ${mobId} API 錯誤: ${apiData.error}`);
    } else {
      const apiElements = parseElementalAttributes(apiData.elementalAttributes);

      if (!apiData.elementalAttributes) {
        report.noElementalAttributes.push({
          id: mobId,
          name: mobName,
          chineseName: entry.chineseMobName,
          reason: 'API 無 elementalAttributes 欄位'
        });
      }

      const mismatches = checkLocalValueNoApiMatch(mob, apiElements);
      for (const mismatch of mismatches) {
        report.localValueNoApiMatch.push({
          id: mobId,
          name: mobName,
          chineseName: entry.chineseMobName,
          element: mismatch.element,
          localValue: mismatch.localValue,
          description: `本地有 ${mismatch.element}: ${mismatch.localValue}，API 無此屬性`
        });
      }

      mob.fire_weakness = apiElements.fire_weakness ?? null;
      mob.ice_weakness = apiElements.ice_weakness ?? null;
      mob.lightning_weakness = apiElements.lightning_weakness ?? null;
      mob.holy_weakness = apiElements.holy_weakness ?? null;
      mob.poison_weakness = apiElements.poison_weakness ?? null;
      mob.dark_weakness = apiElements.dark_weakness ?? null;
      mob.isUndead = apiData.isUndead;
      mob.isBoss = apiData.isBoss;
    }

    await delay(DELAY_MS);
  }

  console.log('\n\n寫入更新後的 mob-info.json...');
  fs.writeFileSync(MOB_INFO_PATH, JSON.stringify(mobInfo, null, 2), 'utf-8');

  console.log('生成報告...');
  generateReport();

  console.log('\n完成！');
  console.log(`- 沒有 elementalAttributes: ${report.noElementalAttributes.length}`);
  console.log(`- weakness: 0 的怪物: ${report.weaknessZero.length}`);
  console.log(`- 本地有值但 API 無對應: ${report.localValueNoApiMatch.length}`);
  console.log(`- API 404 錯誤: ${report.api404.length}`);
}

// 生成 Markdown 報告
function generateReport() {
  let md = `# 沒有 API 元素資料的怪物

> 更新時間: ${new Date().toISOString()}
> API 版本: GMS v83

## 沒有 elementalAttributes 的怪物

| ID | 英文名稱 | 中文名稱 | 原因 |
|----|----------|----------|------|
`;

  for (const item of report.noElementalAttributes) {
    md += `| ${item.id} | ${item.name} | ${item.chineseName || ''} | ${item.reason} |\n`;
  }

  md += `
## 有 weakness: 0 的怪物（強免疫/吸收）

| ID | 英文名稱 | 中文名稱 | 元素 | 原始值 |
|----|----------|----------|------|--------|
`;

  for (const item of report.weaknessZero) {
    md += `| ${item.id} | ${item.name} | ${item.chineseName || ''} | ${item.element} | ${item.originalValue} |\n`;
  }

  md += `
## 本地有值但 API 無對應的怪物

| ID | 英文名稱 | 中文名稱 | 元素 | 本地值 | 說明 |
|----|----------|----------|------|--------|------|
`;

  for (const item of report.localValueNoApiMatch) {
    md += `| ${item.id} | ${item.name} | ${item.chineseName || ''} | ${item.element} | ${item.localValue} | ${item.description} |\n`;
  }

  md += `
## API 404 錯誤的怪物

| ID | 英文名稱 | 中文名稱 |
|----|----------|----------|
`;

  for (const item of report.api404) {
    md += `| ${item.id} | ${item.name} | ${item.chineseName || ''} |\n`;
  }

  const docsDir = path.dirname(REPORT_PATH);
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }

  fs.writeFileSync(REPORT_PATH, md, 'utf-8');
  console.log(`報告已寫入: ${REPORT_PATH}`);
}

main().catch(console.error);
