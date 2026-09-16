/**
 * Verify Monster Spawns Consistency
 * 比對 chronostory-map-database.json 和 monster-spawns.json 的資料一致性
 *
 * 功能：
 * 1. 找出在 map-database 中有出現但 spawns.json 中位置數量不符的怪物
 * 2. 找出在 spawns.json 中存在但 map-database 中沒有的怪物
 */

const fs = require('fs');
const path = require('path');

// 讀取資料檔案
const mapDatabase = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, '../data/chronostory/map-database/chronostory-map-database.json'),
    'utf-8'
  )
);

const monsterSpawns = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, '../data/chronostory/map-database/monster-spawns.json'),
    'utf-8'
  )
);

/**
 * 從 map-database 中提取所有怪物出現位置
 * @returns {Map<string, Array<{region, section, map}>>} 怪物名稱 -> 出現位置列表
 */
function extractMonstersFromMapDatabase() {
  const monsterLocations = new Map();

  for (const regionKey of Object.keys(mapDatabase.regions)) {
    const region = mapDatabase.regions[regionKey];

    for (const section of region.sections || []) {
      for (const map of section.maps || []) {
        for (const monster of map.monsters || []) {
          const monsterName = monster.name;

          if (!monsterLocations.has(monsterName)) {
            monsterLocations.set(monsterName, []);
          }

          monsterLocations.get(monsterName).push({
            region: region.name,
            section: section.name,
            map: map.name,
            hidden: map.hidden || false,
          });
        }
      }
    }
  }

  return monsterLocations;
}

/**
 * 比對兩個資料來源
 */
function compareDataSources() {
  const mapDbMonsters = extractMonstersFromMapDatabase();
  const spawnsMonsters = new Map(Object.entries(monsterSpawns));

  const results = {
    // 位置數量不一致的怪物
    countMismatch: [],
    // 在 map-database 中有但 spawns.json 沒有的怪物
    missingInSpawns: [],
    // 在 spawns.json 中有但 map-database 沒有的怪物
    missingInMapDb: [],
    // 完全一致的怪物
    consistent: [],
    // 位置內容不一致（數量相同但內容不同）
    contentMismatch: [],
  };

  // 檢查 map-database 中的怪物
  for (const [monsterName, mapDbLocations] of mapDbMonsters) {
    if (!spawnsMonsters.has(monsterName)) {
      results.missingInSpawns.push({
        name: monsterName,
        mapDbCount: mapDbLocations.length,
        mapDbLocations,
      });
      continue;
    }

    const spawnsLocations = spawnsMonsters.get(monsterName);

    if (mapDbLocations.length !== spawnsLocations.length) {
      results.countMismatch.push({
        name: monsterName,
        mapDbCount: mapDbLocations.length,
        spawnsCount: spawnsLocations.length,
        mapDbLocations,
        spawnsLocations,
      });
    } else {
      // 數量相同，檢查內容是否一致
      const mapDbMaps = new Set(mapDbLocations.map(l => `${l.region}|${l.section}|${l.map}`));
      const spawnsMaps = new Set(spawnsLocations.map(l => `${l.region}|${l.section}|${l.map}`));

      const isContentMatch = [...mapDbMaps].every(m => spawnsMaps.has(m)) &&
                             [...spawnsMaps].every(m => mapDbMaps.has(m));

      if (isContentMatch) {
        results.consistent.push({
          name: monsterName,
          count: mapDbLocations.length,
        });
      } else {
        results.contentMismatch.push({
          name: monsterName,
          count: mapDbLocations.length,
          mapDbLocations,
          spawnsLocations,
        });
      }
    }
  }

  // 檢查 spawns.json 中有但 map-database 沒有的怪物
  for (const [monsterName, spawnsLocations] of spawnsMonsters) {
    if (!mapDbMonsters.has(monsterName)) {
      results.missingInMapDb.push({
        name: monsterName,
        spawnsCount: spawnsLocations.length,
        spawnsLocations,
      });
    }
  }

  return results;
}

/**
 * 輸出報告
 */
function printReport(results) {
  console.log('='.repeat(70));
  console.log('Monster Spawn Verification Report');
  console.log('='.repeat(70));

  console.log('\n📊 統計摘要:');
  console.log(`  - 完全一致: ${results.consistent.length}`);
  console.log(`  - 位置數量不一致: ${results.countMismatch.length}`);
  console.log(`  - 位置內容不一致: ${results.contentMismatch.length}`);
  console.log(`  - map-database 有但 spawns.json 沒有: ${results.missingInSpawns.length}`);
  console.log(`  - spawns.json 有但 map-database 沒有: ${results.missingInMapDb.length}`);

  if (results.countMismatch.length > 0) {
    console.log('\n' + '='.repeat(70));
    console.log('❌ 位置數量不一致 (需要檢查):');
    console.log('='.repeat(70));

    for (const monster of results.countMismatch) {
      console.log(`\n  📍 ${monster.name}`);
      console.log(`     map-database: ${monster.mapDbCount} 個位置`);
      console.log(`     spawns.json: ${monster.spawnsCount} 個位置`);

      console.log('\n     map-database 位置:');
      for (const loc of monster.mapDbLocations) {
        const hidden = loc.hidden ? ' [Hidden]' : '';
        console.log(`       - ${loc.region} > ${loc.section} > ${loc.map}${hidden}`);
      }

      console.log('\n     spawns.json 位置:');
      for (const loc of monster.spawnsLocations) {
        const hidden = loc.hidden ? ' [Hidden]' : '';
        console.log(`       - ${loc.region} > ${loc.section} > ${loc.map}${hidden}`);
      }
    }
  }

  if (results.contentMismatch.length > 0) {
    console.log('\n' + '='.repeat(70));
    console.log('⚠️ 位置內容不一致 (數量相同但地圖不同):');
    console.log('='.repeat(70));

    for (const monster of results.contentMismatch) {
      console.log(`\n  📍 ${monster.name} (${monster.count} 個位置)`);

      console.log('\n     map-database 位置:');
      for (const loc of monster.mapDbLocations) {
        const hidden = loc.hidden ? ' [Hidden]' : '';
        console.log(`       - ${loc.region} > ${loc.section} > ${loc.map}${hidden}`);
      }

      console.log('\n     spawns.json 位置:');
      for (const loc of monster.spawnsLocations) {
        const hidden = loc.hidden ? ' [Hidden]' : '';
        console.log(`       - ${loc.region} > ${loc.section} > ${loc.map}${hidden}`);
      }
    }
  }

  if (results.missingInSpawns.length > 0) {
    console.log('\n' + '='.repeat(70));
    console.log('🔷 map-database 有但 spawns.json 沒有:');
    console.log('='.repeat(70));

    for (const monster of results.missingInSpawns) {
      console.log(`\n  📍 ${monster.name} (${monster.mapDbCount} 個位置)`);
      for (const loc of monster.mapDbLocations) {
        const hidden = loc.hidden ? ' [Hidden]' : '';
        console.log(`     - ${loc.region} > ${loc.section} > ${loc.map}${hidden}`);
      }
    }
  }

  if (results.missingInMapDb.length > 0) {
    console.log('\n' + '='.repeat(70));
    console.log('🔶 spawns.json 有但 map-database 沒有:');
    console.log('='.repeat(70));

    for (const monster of results.missingInMapDb) {
      console.log(`\n  📍 ${monster.name} (${monster.spawnsCount} 個位置)`);
      for (const loc of monster.spawnsLocations) {
        const hidden = loc.hidden ? ' [Hidden]' : '';
        console.log(`     - ${loc.region} > ${loc.section} > ${loc.map}${hidden}`);
      }
    }
  }

  // 如果全部一致
  if (results.countMismatch.length === 0 &&
      results.contentMismatch.length === 0 &&
      results.missingInSpawns.length === 0 &&
      results.missingInMapDb.length === 0) {
    console.log('\n✅ 所有怪物的 spawn 位置資料完全一致！');
  }
}

// 執行比對
const results = compareDataSources();

// 輸出報告
printReport(results);

// 儲存 JSON 報告
const report = {
  generatedAt: new Date().toISOString(),
  summary: {
    consistent: results.consistent.length,
    countMismatch: results.countMismatch.length,
    contentMismatch: results.contentMismatch.length,
    missingInSpawns: results.missingInSpawns.length,
    missingInMapDb: results.missingInMapDb.length,
  },
  countMismatch: results.countMismatch,
  contentMismatch: results.contentMismatch,
  missingInSpawns: results.missingInSpawns,
  missingInMapDb: results.missingInMapDb,
};

fs.writeFileSync(
  path.join(__dirname, 'spawn-verify-report.json'),
  JSON.stringify(report, null, 2),
  'utf-8'
);

console.log('\n📄 報告已儲存至 scripts/spawn-verify-report.json');
