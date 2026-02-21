const fs = require('fs');
const path = require('path');

const BASE_DIR = path.join(__dirname, '..');
const CSV_FILE = path.join(BASE_DIR, 'csv-data', 'public-drop-table.csv');
const MOB_INFO_FILE = path.join(BASE_DIR, 'mob-info.json');

// 輸出目錄
const OUTPUT_DIR = BASE_DIR;
const DROPS_BY_MONSTER_DIR = path.join(OUTPUT_DIR, 'drops-by-monster');
const DROPS_BY_ITEM_DIR = path.join(OUTPUT_DIR, 'drops-by-item');

// 確保目錄存在
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// 正確解析 CSV 行（處理引號內的逗號，如 "1,000"）
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.replace(/"/g, '').trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.replace(/"/g, '').trim());
  return result;
}

// 解析 CSV
function parseCSV(content) {
  const lines = content.split('\n').filter(line => line.trim());
  const headers = parseCSVLine(lines[0]).map(h => h.trim());

  return lines.slice(1).map(line => {
    const values = parseCSVLine(line);
    const row = {};
    headers.forEach((header, i) => {
      row[header] = values[i]?.trim() || '';
    });
    return row;
  });
}

// 讀取怪物中文名稱對照
function loadMobChineseNames() {
  const mobInfo = JSON.parse(fs.readFileSync(MOB_INFO_FILE, 'utf8'));
  const nameMap = {};
  mobInfo.forEach(item => {
    nameMap[item.mob.id] = item.chineseMobName;
  });
  return nameMap;
}

// 轉換機率（百萬分之 -> 百分比）
function convertChance(chance) {
  // 移除逗號（如 "400,000" → "400000"）
  const cleanedChance = String(chance).replace(/,/g, '');
  const num = parseInt(cleanedChance, 10);
  if (isNaN(num)) return 0;
  return num / 10000; // 轉為百分比數值
}

// 格式化顯示機率
function formatChance(chance) {
  if (chance >= 100) return '100%';
  if (chance >= 1) return `${chance.toFixed(1)}%`;
  if (chance >= 0.1) return `${chance.toFixed(2)}%`;
  return `${chance.toFixed(3)}%`;
}

function main() {
  console.log('開始處理掉落資料...');

  // 確保輸出目錄存在
  ensureDir(DROPS_BY_MONSTER_DIR);
  ensureDir(DROPS_BY_ITEM_DIR);

  // 讀取資料
  const csvContent = fs.readFileSync(CSV_FILE, 'utf8');
  const rows = parseCSV(csvContent);
  const mobChineseNames = loadMobChineseNames();

  console.log(`讀取到 ${rows.length} 筆掉落記錄`);

  // 資料結構
  const monsterMap = new Map(); // mobId -> monster data
  const itemMap = new Map();    // itemId -> item data
  const mobToItems = {};        // mobId -> [itemIds]
  const itemToMobs = {};        // itemId -> [mobIds]

  // 處理每一筆掉落記錄
  rows.forEach(row => {
    const inGame = row.InGame === 'TRUE';
    const enabled = row.Enable === 'TRUE';
    const mobId = parseInt(row.DropperID, 10);
    const mobName = row.MobName || '';
    const isBoss = row.isBoss === 'TRUE';
    const itemId = parseInt(row.ItemID, 10);
    const rawItemName = row.ItemName;
    const itemName = (rawItemName && rawItemName !== '#N/A')
      ? rawItemName
      : (row.ServerItemName || '');
    const chance = convertChance(row.Chance);
    const minQty = parseInt(row.MinQTY, 10) || 1;
    const maxQty = parseInt(row.MaxQTY, 10) || 1;
    const questId = parseInt(row.QuestID, 10) || 0;

    if (isNaN(mobId) || !mobName) return;

    const chineseMobName = mobChineseNames[String(mobId)] || null;

    // 初始化怪物資料
    if (!monsterMap.has(mobId)) {
      monsterMap.set(mobId, {
        mobId,
        mobName,
        chineseMobName,
        isBoss,
        inGame,
        drops: []
      });
      mobToItems[mobId] = [];
    }

    // 初始化物品資料
    if (!itemMap.has(itemId)) {
      itemMap.set(itemId, {
        itemId,
        itemName,
        chineseItemName: null, // TODO: 需要物品中文名稱資料
        monsters: []
      });
      itemToMobs[itemId] = [];
    }

    // 建立掉落資料
    const dropData = {
      itemId,
      itemName,
      chineseItemName: null,
      chance,
      displayChance: formatChance(chance),
      minQty,
      maxQty,
      questId,
      enabled
    };

    const monsterDropData = {
      mobId,
      mobName,
      chineseMobName,
      isBoss,
      inGame,
      chance,
      displayChance: formatChance(chance),
      minQty,
      maxQty
    };

    // 加入怪物的掉落列表
    monsterMap.get(mobId).drops.push(dropData);

    // 加入物品的怪物列表
    itemMap.get(itemId).monsters.push(monsterDropData);

    // 建立關聯索引
    if (!mobToItems[mobId].includes(itemId)) {
      mobToItems[mobId].push(itemId);
    }
    if (!itemToMobs[itemId].includes(mobId)) {
      itemToMobs[itemId].push(mobId);
    }
  });

  console.log(`處理完成：${monsterMap.size} 種怪物，${itemMap.size} 種物品`);

  // 產生 monster-index.json
  const monsterIndex = {
    totalMonsters: monsterMap.size,
    lastUpdated: new Date().toISOString().split('T')[0],
    monsters: Array.from(monsterMap.values())
      .filter(m => m.inGame) // 只顯示 InGame 的怪物
      .map(m => ({
        mobId: m.mobId,
        mobName: m.mobName,
        chineseMobName: m.chineseMobName,
        isBoss: m.isBoss,
        dropCount: m.drops.length
      }))
      .sort((a, b) => a.mobId - b.mobId)
  };

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'monster-index.json'),
    JSON.stringify(monsterIndex, null, 2)
  );
  console.log(`產生 monster-index.json (${monsterIndex.monsters.length} 種怪物)`);

  // 產生 item-index.json
  const itemIndex = {
    totalItems: itemMap.size,
    lastUpdated: new Date().toISOString().split('T')[0],
    items: Array.from(itemMap.values())
      .map(i => ({
        itemId: i.itemId,
        itemName: i.itemName,
        chineseItemName: i.chineseItemName,
        monsterCount: i.monsters.filter(m => m.inGame).length
      }))
      .filter(i => i.monsterCount > 0) // 只顯示有怪物掉落的物品
      .sort((a, b) => a.itemId - b.itemId)
  };

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'item-index.json'),
    JSON.stringify(itemIndex, null, 2)
  );
  console.log(`產生 item-index.json (${itemIndex.items.length} 種物品)`);

  // 產生 drops-by-monster/{mobId}.json
  let monsterFileCount = 0;
  monsterMap.forEach((monster, mobId) => {
    if (!monster.inGame) return; // 只產生 InGame 的怪物

    const monsterData = {
      mobId: monster.mobId,
      mobName: monster.mobName,
      chineseMobName: monster.chineseMobName,
      isBoss: monster.isBoss,
      inGame: monster.inGame,
      totalDrops: monster.drops.length,
      drops: monster.drops.sort((a, b) => b.chance - a.chance) // 按機率排序
    };

    fs.writeFileSync(
      path.join(DROPS_BY_MONSTER_DIR, `${mobId}.json`),
      JSON.stringify(monsterData, null, 2)
    );
    monsterFileCount++;
  });
  console.log(`產生 drops-by-monster/ (${monsterFileCount} 個檔案)`);

  // 產生 drops-by-item/{itemId}.json
  let itemFileCount = 0;
  itemMap.forEach((item, itemId) => {
    const inGameMonsters = item.monsters.filter(m => m.inGame);
    if (inGameMonsters.length === 0) return; // 只產生有 InGame 怪物的物品

    const itemData = {
      itemId: item.itemId,
      itemName: item.itemName,
      chineseItemName: item.chineseItemName,
      totalMonsters: inGameMonsters.length,
      monsters: inGameMonsters.sort((a, b) => b.chance - a.chance) // 按機率排序
    };

    fs.writeFileSync(
      path.join(DROPS_BY_ITEM_DIR, `${itemId}.json`),
      JSON.stringify(itemData, null, 2)
    );
    itemFileCount++;
  });
  console.log(`產生 drops-by-item/ (${itemFileCount} 個檔案)`);

  // 產生 drop-relations.json
  const dropRelations = {
    lastUpdated: new Date().toISOString().split('T')[0],
    mobToItems,
    itemToMobs
  };

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'drop-relations.json'),
    JSON.stringify(dropRelations)
  );
  console.log('產生 drop-relations.json');

  console.log('\n✅ 所有檔案產生完成！');
}

main();
