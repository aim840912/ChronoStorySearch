const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, '..');

// 讀取 monster-index.json
const monsterIndexPath = path.join(baseDir, 'chronostoryData/monster-index.json');
const monsterIndex = JSON.parse(fs.readFileSync(monsterIndexPath, 'utf8'));

// 讀取 mob-info.json 取得 inGame 狀態
const mobInfoPath = path.join(baseDir, 'chronostoryData/mob-info.json');
const mobInfo = JSON.parse(fs.readFileSync(mobInfoPath, 'utf8'));

const mobInfoMap = new Map();
mobInfo.forEach(m => {
  mobInfoMap.set(parseInt(m.mob.id), {
    inGame: m.mob.InGame,
    name: m.mob.name,
    chineseName: m.chineseMobName,
    isBoss: m.mob.isBoss
  });
});

// 為現有怪物加入 inGame 欄位
monsterIndex.monsters.forEach(monster => {
  const info = mobInfoMap.get(monster.mobId);
  monster.inGame = info ? info.inGame : true; // 預設 true
});

// 從 mob-info.json 找出不在 monster-index 中的怪物
const existingIds = new Set(monsterIndex.monsters.map(m => m.mobId));
const newMobs = mobInfo.filter(m => !existingIds.has(parseInt(m.mob.id)));

console.log('現有怪物數:', monsterIndex.monsters.length);
console.log('新增怪物數:', newMobs.length);

// 新增怪物
newMobs.forEach(m => {
  monsterIndex.monsters.push({
    mobId: parseInt(m.mob.id),
    mobName: m.mob.name,
    chineseMobName: m.chineseMobName || null,
    isBoss: m.mob.isBoss || false,
    dropCount: 0,
    inGame: m.mob.InGame
  });
});

// 更新 totalMonsters
monsterIndex.totalMonsters = monsterIndex.monsters.length;
monsterIndex.lastUpdated = new Date().toISOString().split('T')[0];

// 寫回檔案
fs.writeFileSync(monsterIndexPath, JSON.stringify(monsterIndex, null, 2));

console.log('總怪物數:', monsterIndex.totalMonsters);
console.log('inGame=true:', monsterIndex.monsters.filter(m => m.inGame).length);
console.log('inGame=false:', monsterIndex.monsters.filter(m => !m.inGame).length);
