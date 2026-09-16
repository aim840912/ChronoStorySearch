/**
 * Audit Monster Spawn Locations
 * 比對 monster-index.json 和 monster-spawns.json，找出缺少 spawn location 的怪物
 */

const fs = require('fs');
const path = require('path');

// 讀取資料檔案
const monsterIndex = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, '../data/chronostory/monster-index.json'),
    'utf-8'
  )
);

const monsterSpawns = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, '../data/chronostory/map-database/monster-spawns.json'),
    'utf-8'
  )
);

// 取得 monster-spawns.json 中的所有 key
const spawnKeys = new Set(Object.keys(monsterSpawns));

// 定義特殊怪物類型的識別模式
const specialPatterns = [
  /^Exam /,           // 考試怪物
  /^Tutorial /,       // 教程怪物
  /'s Clone$/,        // 分身怪物
  /^Shadow /,         // 暗影怪物
  /Abomination$/,     // 亂七八糟系列
  /^Utah's /,         // 特殊任務怪物
];

// 檢查是否為特殊怪物
function isSpecialMonster(mobName) {
  return specialPatterns.some(pattern => pattern.test(mobName));
}

// 分類結果
const results = {
  // 有 spawn location 的怪物
  hasSpawn: [],
  // 缺少 spawn location 的野外怪物（需要補充）
  missingSpawn: [],
  // 特殊怪物（可忽略）
  specialMonsters: [],
  // inGame=false 的怪物
  notInGame: [],
};

// 比對每個怪物
for (const monster of monsterIndex.monsters) {
  const { mobId, mobName, chineseMobName, inGame, isBoss } = monster;

  // 檢查 inGame 狀態
  if (!inGame) {
    results.notInGame.push({ mobId, mobName, chineseMobName });
    continue;
  }

  // 檢查是否為特殊怪物
  if (isSpecialMonster(mobName)) {
    results.specialMonsters.push({ mobId, mobName, chineseMobName });
    continue;
  }

  // 檢查是否有 spawn location
  if (spawnKeys.has(mobName)) {
    results.hasSpawn.push({ mobId, mobName, chineseMobName });
  } else {
    results.missingSpawn.push({ mobId, mobName, chineseMobName, isBoss });
  }
}

// 輸出報告
console.log('='.repeat(60));
console.log('Monster Spawn Location Audit Report');
console.log('='.repeat(60));

console.log('\n📊 統計摘要:');
console.log(`  - 總怪物數: ${monsterIndex.monsters.length}`);
console.log(`  - 有 spawn location: ${results.hasSpawn.length}`);
console.log(`  - 缺少 spawn location: ${results.missingSpawn.length}`);
console.log(`  - 特殊怪物 (可忽略): ${results.specialMonsters.length}`);
console.log(`  - inGame=false: ${results.notInGame.length}`);

console.log('\n' + '='.repeat(60));
console.log('❌ 缺少 Spawn Location 的怪物 (需要補充):');
console.log('='.repeat(60));

for (const monster of results.missingSpawn) {
  const bossTag = monster.isBoss ? ' [BOSS]' : '';
  console.log(`  - ${monster.mobName} (${monster.chineseMobName})${bossTag} [ID: ${monster.mobId}]`);
}

console.log('\n' + '='.repeat(60));
console.log('🔄 特殊怪物 (可忽略):');
console.log('='.repeat(60));

for (const monster of results.specialMonsters) {
  console.log(`  - ${monster.mobName} (${monster.chineseMobName}) [ID: ${monster.mobId}]`);
}

console.log('\n' + '='.repeat(60));
console.log('⚪ inGame=false 的怪物:');
console.log('='.repeat(60));

for (const monster of results.notInGame) {
  console.log(`  - ${monster.mobName} (${monster.chineseMobName}) [ID: ${monster.mobId}]`);
}

// 輸出 JSON 報告
const report = {
  summary: {
    totalMonsters: monsterIndex.monsters.length,
    hasSpawn: results.hasSpawn.length,
    missingSpawn: results.missingSpawn.length,
    specialMonsters: results.specialMonsters.length,
    notInGame: results.notInGame.length,
  },
  missingSpawn: results.missingSpawn,
  specialMonsters: results.specialMonsters,
  notInGame: results.notInGame,
};

fs.writeFileSync(
  path.join(__dirname, 'spawn-audit-report.json'),
  JSON.stringify(report, null, 2),
  'utf-8'
);

console.log('\n✅ 報告已儲存至 scripts/spawn-audit-report.json');
