/**
 * Recalculate randomStats for all equipment files
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EQUIPMENT_DIR = path.join(__dirname, '../chronostoryData/items-organized/equipment');

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
};

const MAIN_STATS = ['incSTR', 'incDEX', 'incINT', 'incLUK'];

function calculateRandomStats(metaInfo, typeInfo) {
  const reqLevel = metaInfo.reqLevel || metaInfo.reqLevelEquip || 0;
  const isOnePiece = typeInfo?.subCategory === 'Overall';

  let O = reqLevel / 10;
  if (isOnePiece) O *= 2;

  const mainStatCount = MAIN_STATS.filter(
    (stat) => metaInfo[stat] !== undefined && metaInfo[stat] !== null
  ).length;

  const randomStats = {};

  for (const [, localField] of Object.entries(FIELD_MAP)) {
    const baseValue = metaInfo[localField];

    if (baseValue === undefined || baseValue === null) continue;

    let A;

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

async function main() {
  console.log('重新計算所有 equipment 的 randomStats...\n');

  const files = fs.readdirSync(EQUIPMENT_DIR).filter((f) => f.endsWith('.json'));
  console.log(`找到 ${files.length} 個檔案\n`);

  let updated = 0;
  let unchanged = 0;

  for (const file of files) {
    const filePath = path.join(EQUIPMENT_DIR, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    // 投射物（箭矢/子彈/飛鏢）沒有浮動值，清空 randomStats
    if (data.typeInfo?.subCategory === 'Projectile') {
      if (Object.keys(data.randomStats || {}).length > 0) {
        data.randomStats = {};
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
        updated++;
      } else {
        unchanged++;
      }
      continue;
    }

    const oldStats = JSON.stringify(data.randomStats);
    const newStats = calculateRandomStats(data.metaInfo, data.typeInfo);
    const newStatsStr = JSON.stringify(newStats);

    if (oldStats !== newStatsStr) {
      data.randomStats = newStats;
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
      updated++;
    } else {
      unchanged++;
    }
  }

  console.log('完成！');
  console.log(`  - 已更新: ${updated} 個`);
  console.log(`  - 未變更: ${unchanged} 個`);
}

main().catch(console.error);
