/**
 * 同步 MobStats CSV 資料到 mob-info.json
 *
 * 功能：
 * 1. 讀取 chronostoryData/csv-data/mob-stats.csv（完整資料）
 * 2. 更新 chronostoryData/mob-info.json 中的怪物資料
 * 3. 保留 JSON 獨有的怪物（如 Amherst Crate）和中文名稱
 * 4. 新增 CSV 有但 JSON 沒有的欄位
 */

const fs = require('fs');
const path = require('path');

// 檔案路徑
const CSV_PATH = path.join(__dirname, '../chronostoryData/csv-data/mob-stats.csv');
const JSON_PATH = path.join(__dirname, '../chronostoryData/mob-info.json');
const OUTPUT_PATH = JSON_PATH; // 直接覆蓋原檔案

// CSV 欄位到 JSON 欄位的對應表
const FIELD_MAPPING = {
  // 現有欄位（更新）
  MobID: { jsonKey: 'id', type: 'string' },
  MobName: { jsonKey: 'name', type: 'string' },
  Level: { jsonKey: 'level', type: 'number' },
  MaxHp: { jsonKey: 'maxHP', type: 'number' },
  Acc: { jsonKey: 'accuracy', type: 'number' },
  Avoid: { jsonKey: 'evasion', type: 'number' },
  Exp: { jsonKey: 'exp', type: 'number' },
  PhysDef: { jsonKey: 'physicalDefense', type: 'number' },
  MagDef: { jsonKey: 'magicDefense', type: 'number' },
  FireWeakness: { jsonKey: 'fire_weakness', type: 'number' },
  IceWeakness: { jsonKey: 'ice_weakness', type: 'number' },
  LightningWeakness: { jsonKey: 'lightning_weakness', type: 'number' },
  HolyWeakness: { jsonKey: 'holy_weakness', type: 'number' },
  PoisonWeakness: { jsonKey: 'poison_weakness', type: 'number' },
  MinPushDamage: { jsonKey: 'minimumPushDamage', type: 'number' },
  isBoss: { jsonKey: 'isBoss', type: 'boolean' },

  // 新增欄位
  MaxMp: { jsonKey: 'maxMp', type: 'number' },
  Speed: { jsonKey: 'speed', type: 'number' },
  PhysDamage: { jsonKey: 'physDamage', type: 'number' },
  MagDamage: { jsonKey: 'magDamage', type: 'number' },
  ImmuneToHeal: { jsonKey: 'immuneToHeal', type: 'boolean' },
  ImmuneToPoisonStatus: { jsonKey: 'immuneToPoison', type: 'boolean' },
  ImmuneToBurnStatus: { jsonKey: 'immuneToBurn', type: 'boolean' },
  ImmuneToFreezeStatus: { jsonKey: 'immuneToFreeze', type: 'boolean' },
};

/**
 * 解析 CSV 檔案
 */
function parseCSV(csvContent) {
  const lines = csvContent.trim().split('\n');
  const headers = lines[0].split(',');
  const records = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === headers.length) {
      const record = {};
      headers.forEach((header, index) => {
        record[header.trim()] = values[index];
      });
      records.push(record);
    }
  }

  return records;
}

/**
 * 解析 CSV 行（處理引號和逗號）
 */
function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());

  return values;
}

/**
 * 轉換值類型
 */
function convertValue(value, type) {
  if (value === '' || value === undefined || value === null) {
    return null;
  }

  switch (type) {
    case 'string':
      return String(value);
    case 'number':
      const num = Number(value);
      return isNaN(num) ? null : num;
    case 'boolean':
      return value === 'TRUE' || value === 'true' || value === '1';
    default:
      return value;
  }
}

/**
 * 主函數
 */
function main() {
  console.log('=== 同步 MobStats CSV 到 mob-info.json ===\n');

  // 讀取檔案
  console.log('讀取 CSV 檔案...');
  const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
  const csvRecords = parseCSV(csvContent);
  console.log(`  CSV 記錄數: ${csvRecords.length}`);

  console.log('讀取 JSON 檔案...');
  const jsonContent = fs.readFileSync(JSON_PATH, 'utf-8');
  const jsonData = JSON.parse(jsonContent);
  console.log(`  JSON 記錄數: ${jsonData.length}`);

  // 建立 CSV 記錄的 MobID 索引
  const csvByMobId = {};
  csvRecords.forEach((record) => {
    csvByMobId[record.MobID] = record;
  });

  // 統計
  let updatedCount = 0;
  let jsonOnlyCount = 0;
  let fieldsAddedCount = 0;
  const updatedMobs = [];
  const jsonOnlyMobs = [];

  // 更新 JSON 資料
  jsonData.forEach((entry) => {
    const mob = entry.mob;
    const mobId = mob.id;
    const csvRecord = csvByMobId[mobId];

    if (csvRecord) {
      // 有對應的 CSV 記錄，更新資料
      let hasChanges = false;
      let newFields = [];

      for (const [csvKey, mapping] of Object.entries(FIELD_MAPPING)) {
        const csvValue = csvRecord[csvKey];
        const convertedValue = convertValue(csvValue, mapping.type);
        const jsonKey = mapping.jsonKey;

        // 檢查是否為新增欄位
        const isNewField = !(jsonKey in mob);
        const oldValue = mob[jsonKey];

        // 更新值
        mob[jsonKey] = convertedValue;

        // 記錄變更
        if (isNewField && convertedValue !== null) {
          newFields.push(jsonKey);
          fieldsAddedCount++;
        }
        if (oldValue !== convertedValue) {
          hasChanges = true;
        }
      }

      if (hasChanges) {
        updatedCount++;
        if (newFields.length > 0) {
          updatedMobs.push({ name: mob.name, id: mobId, newFields });
        }
      }
    } else {
      // JSON 獨有的怪物，保留不變
      jsonOnlyCount++;
      jsonOnlyMobs.push({ name: mob.name, id: mobId });
    }
  });

  // 輸出統計
  console.log('\n=== 同步結果 ===');
  console.log(`更新的怪物數: ${updatedCount}`);
  console.log(`JSON 獨有的怪物數: ${jsonOnlyCount}`);
  console.log(`新增欄位次數: ${fieldsAddedCount}`);

  if (jsonOnlyMobs.length > 0) {
    console.log('\nJSON 獨有的怪物（保留不變）:');
    jsonOnlyMobs.forEach((m) => {
      console.log(`  - ${m.name} (ID: ${m.id})`);
    });
  }

  // 抽查幾隻有弱點資料的怪物
  console.log('\n=== 抽查弱點資料 ===');
  const checkMobs = ['3210100', '4230100', '1140100', '2230103']; // Fire Boar, Cold Eye, Ghost Stump, Trixter
  checkMobs.forEach((mobId) => {
    const entry = jsonData.find((e) => e.mob.id === mobId);
    if (entry) {
      const m = entry.mob;
      console.log(`\n${m.name} (ID: ${mobId}):`);
      console.log(`  火弱點: ${m.fire_weakness}`);
      console.log(`  冰弱點: ${m.ice_weakness}`);
      console.log(`  雷弱點: ${m.lightning_weakness}`);
      console.log(`  聖弱點: ${m.holy_weakness}`);
      console.log(`  毒弱點: ${m.poison_weakness}`);
      if (m.immuneToHeal !== undefined) {
        console.log(`  治癒免疫: ${m.immuneToHeal}`);
      }
    }
  });

  // 寫入更新後的 JSON
  console.log('\n寫入更新後的 JSON...');
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(jsonData, null, 2), 'utf-8');
  console.log(`已儲存到: ${OUTPUT_PATH}`);

  console.log('\n=== 同步完成 ===');
}

main();
