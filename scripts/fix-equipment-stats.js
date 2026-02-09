/**
 * Fix equipment metaInfo based on API data and recalculate randomStats
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const EQUIPMENT_DIR = path.join(__dirname, '../chronostoryData/items-organized/equipment');
const API_BASE = 'https://chronostory-pr-9.onrender.com/api/item-info';
const DELAY_MS = 100;

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

// Main stats for counting
const MAIN_STATS = ['incSTR', 'incDEX', 'incINT', 'incLUK'];

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
      await delay(1000);
    }
  }
  return null;
}

// Calculate randomStats based on metaInfo
function calculateRandomStats(metaInfo, typeInfo) {
  const reqLevel = metaInfo.reqLevel || metaInfo.reqLevelEquip || 0;
  const isOnePiece = typeInfo?.subCategory === 'Overall';

  // Base O value
  let O = reqLevel / 10;
  if (isOnePiece) O *= 2;

  // Count main stats in metaInfo
  const mainStatCount = MAIN_STATS.filter(
    (stat) => metaInfo[stat] !== undefined && metaInfo[stat] !== null
  ).length;

  const randomStats = {};

  // Calculate for each stat field
  for (const [, localField] of Object.entries(FIELD_MAP)) {
    const baseValue = metaInfo[localField];

    // Skip if no base value or not a stat field
    if (baseValue === undefined || baseValue === null) continue;
    if (['tuc', 'attackSpeed'].includes(localField)) continue;

    let A;

    // Calculate A based on stat type
    if (MAIN_STATS.includes(localField)) {
      A = mainStatCount > 0 ? O / mainStatCount : O;
    } else if (['incPAD', 'incMAD', 'incSpeed'].includes(localField)) {
      A = O / 2;
    } else if (['incACC', 'incEVA'].includes(localField)) {
      A = O;
    } else if (localField === 'incJump') {
      A = O / 4;
    } else if (['incMHP', 'incMMP', 'incPDD', 'incMDD'].includes(localField)) {
      A = O * 5;
    } else {
      continue;
    }

    A = Math.round(A * 100) / 100;

    randomStats[localField] = {
      base: baseValue,
      min: Math.max(0, Math.round(baseValue - A)),
      max: Math.round(baseValue + A),
    };
  }

  return randomStats;
}

// Fix equipment based on API data
async function fixEquipment(itemId) {
  const filePath = path.join(EQUIPMENT_DIR, `${itemId}.json`);

  const localData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  const apiData = await fetchItemInfo(itemId);
  if (!apiData) {
    return { id: itemId, status: 'api_error' };
  }

  const apiStats = apiData?.equipment?.stats || {};
  const changes = [];

  for (const [apiField, localField] of Object.entries(FIELD_MAP)) {
    const apiValue = apiStats[apiField];
    const localValue = localData.metaInfo?.[localField];

    if (apiValue !== null && apiValue !== undefined) {
      if (localValue !== apiValue) {
        changes.push({
          field: localField,
          action: localValue === undefined ? 'add' : 'update',
          from: localValue,
          to: apiValue,
        });
        localData.metaInfo[localField] = apiValue;
      }
    } else {
      if (localValue !== undefined && localValue !== null) {
        changes.push({
          field: localField,
          action: 'delete',
          from: localValue,
          to: null,
        });
        delete localData.metaInfo[localField];
      }
    }
  }

  if (changes.length === 0) {
    return { id: itemId, status: 'no_changes' };
  }

  // 投射物（箭矢/子彈/飛鏢）沒有浮動值
  localData.randomStats = localData.typeInfo?.subCategory === 'Projectile'
    ? {}
    : calculateRandomStats(localData.metaInfo, localData.typeInfo);

  fs.writeFileSync(filePath, JSON.stringify(localData, null, 2) + '\n', 'utf-8');

  return { id: itemId, status: 'fixed', changes };
}

// Main
async function main() {
  console.log('開始修正 equipment 資料...\n');

  const diffReport = fs.readFileSync(
    path.join(__dirname, '../random-stats-diff.md'),
    'utf-8'
  );

  const itemIds = [];
  const regex = /### (\d+) -/g;
  let match;
  while ((match = regex.exec(diffReport)) !== null) {
    itemIds.push(match[1]);
  }

  console.log(`找到 ${itemIds.length} 個需要修正的物品\n`);

  const results = { fixed: 0, noChanges: 0, apiError: 0 };

  for (let i = 0; i < itemIds.length; i++) {
    const itemId = itemIds[i];
    const progress = `[${i + 1}/${itemIds.length}]`;

    process.stdout.write(`\r${progress} 修正 ${itemId}...`);

    const result = await fixEquipment(itemId);

    if (result.status === 'fixed') {
      results.fixed++;
      console.log(`\n  已修正 ${itemId}:`);
      for (const change of result.changes) {
        const from = change.from ?? '-';
        const to = change.to ?? '(deleted)';
        console.log(`     - ${change.field}: ${from} -> ${to}`);
      }
    } else if (result.status === 'no_changes') {
      results.noChanges++;
    } else {
      results.apiError++;
      console.log(`\n  API error: ${itemId}`);
    }

    await delay(DELAY_MS);
  }

  console.log('\n\n修正完成！');
  console.log(`  - 已修正: ${results.fixed} 個`);
  console.log(`  - 無需修正: ${results.noChanges} 個`);
  console.log(`  - API 錯誤: ${results.apiError} 個`);
}

main().catch(console.error);
