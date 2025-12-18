/**
 * Consumable 與掉落資料交叉比對腳本
 */

const fs = require('fs');
const path = require('path');

const CONSUMABLE_DIR = path.join(__dirname, '../chronostoryData/items-organized/consumable');
const DROPS_BY_ITEM_DIR = path.join(__dirname, '../chronostoryData/drops-by-item');
const DROPS_BY_MONSTER_DIR = path.join(__dirname, '../chronostoryData/drops-by-monster');
const OUTPUT_FILE = path.join(__dirname, '../docs/consumable-drops-diff-report.md');

function loadConsumableItems() {
  const items = new Map();
  const files = fs.readdirSync(CONSUMABLE_DIR).filter(f => f.endsWith('.json'));

  for (const file of files) {
    const data = JSON.parse(fs.readFileSync(path.join(CONSUMABLE_DIR, file), 'utf-8'));
    items.set(data.id, {
      name: data.description?.name || '(無名稱)',
      chineseName: data.description?.chineseItemName || null,
    });
  }

  return items;
}

function loadDropsByItem() {
  const items = new Map();
  const files = fs.readdirSync(DROPS_BY_ITEM_DIR).filter(f => f.endsWith('.json'));

  for (const file of files) {
    const data = JSON.parse(fs.readFileSync(path.join(DROPS_BY_ITEM_DIR, file), 'utf-8'));
    const itemId = data.itemId;

    // 只處理 consumable 範圍 (2000000 - 2999999)
    if (itemId >= 2000000 && itemId < 3000000) {
      items.set(itemId, {
        name: data.itemName || '(無名稱)',
        chineseName: data.chineseItemName || null,
        totalMonsters: data.totalMonsters || 0,
      });
    }
  }

  return items;
}

function loadDropsByMonster() {
  const consumableDrops = new Map(); // itemId -> Set of monster names
  const files = fs.readdirSync(DROPS_BY_MONSTER_DIR).filter(f => f.endsWith('.json'));

  for (const file of files) {
    const data = JSON.parse(fs.readFileSync(path.join(DROPS_BY_MONSTER_DIR, file), 'utf-8'));
    const mobName = data.mobName || '(未知怪物)';

    if (data.drops) {
      for (const drop of data.drops) {
        const itemId = drop.itemId;
        // 只處理 consumable 範圍
        if (itemId >= 2000000 && itemId < 3000000) {
          if (!consumableDrops.has(itemId)) {
            consumableDrops.set(itemId, {
              name: drop.itemName || '(無名稱)',
              chineseName: drop.chineseItemName || null,
              monsters: new Set(),
            });
          }
          consumableDrops.get(itemId).monsters.add(mobName);
        }
      }
    }
  }

  return consumableDrops;
}

function generateReport(consumableItems, dropsByItem, dropsByMonster) {
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

  // 分析差異
  const onlyInConsumable = [];
  const onlyInDropsByItem = [];
  const nameDiffsWithDrops = [];
  const chineseNameDiffs = [];

  // Consumable 有但 drops-by-item 沒有
  for (const [id, item] of consumableItems) {
    if (!dropsByItem.has(id)) {
      const monsterData = dropsByMonster.get(id);
      onlyInConsumable.push({
        id,
        name: item.name,
        chineseName: item.chineseName,
        inMonsterDrops: !!monsterData,
        monsterCount: monsterData ? monsterData.monsters.size : 0,
      });
    }
  }

  // drops-by-item 有但 Consumable 沒有
  for (const [id, item] of dropsByItem) {
    if (!consumableItems.has(id)) {
      onlyInDropsByItem.push({
        id,
        name: item.name,
        chineseName: item.chineseName,
        totalMonsters: item.totalMonsters,
      });
    }
  }

  // 名稱不同（在兩邊都有的情況下）
  for (const [id, consumableItem] of consumableItems) {
    if (dropsByItem.has(id)) {
      const dropsItem = dropsByItem.get(id);
      // 英文名稱比對
      if (consumableItem.name !== dropsItem.name) {
        nameDiffsWithDrops.push({
          id,
          consumableName: consumableItem.name,
          dropsName: dropsItem.name,
        });
      }
      // 中文名稱比對
      if (consumableItem.chineseName && dropsItem.chineseName &&
          consumableItem.chineseName !== dropsItem.chineseName) {
        chineseNameDiffs.push({
          id,
          consumableChineseName: consumableItem.chineseName,
          dropsChineseName: dropsItem.chineseName,
        });
      }
    }
  }

  // 統計
  const allDroppedIds = new Set([...dropsByItem.keys(), ...dropsByMonster.keys()]);
  const consumableInDrops = [...consumableItems.keys()].filter(id => allDroppedIds.has(id));

  let md = `# Consumable 與掉落資料差異報告

生成時間：${now}

## 統計摘要

| 項目 | 數量 |
|------|------|
| Consumable 檔案數 | ${consumableItems.size} |
| drops-by-item 中的 Consumable | ${dropsByItem.size} |
| drops-by-monster 中的 Consumable | ${dropsByMonster.size} |
| Consumable 有但 drops-by-item 沒有 | ${onlyInConsumable.length} |
| drops-by-item 有但 Consumable 沒有 | ${onlyInDropsByItem.length} |
| 英文名稱不同 | ${nameDiffsWithDrops.length} |
| 中文名稱不同 | ${chineseNameDiffs.length} |

---

`;

  if (onlyInConsumable.length > 0) {
    md += `## Consumable 有但 drops-by-item 沒有 (${onlyInConsumable.length} 個)

這些物品有 JSON 定義，但沒有獨立的掉落檔案。

| ID | 名稱 | 中文名 | 在 monster drops 中? |
|----|------|--------|---------------------|
`;
    for (const item of onlyInConsumable.sort((a, b) => a.id - b.id)) {
      const inMonster = item.inMonsterDrops ? `是 (${item.monsterCount} 怪物)` : '否';
      md += `| ${item.id} | ${item.name} | ${item.chineseName || '-'} | ${inMonster} |\n`;
    }
    md += '\n';
  }

  if (onlyInDropsByItem.length > 0) {
    md += `## drops-by-item 有但 Consumable 沒有 (${onlyInDropsByItem.length} 個)

這些物品有掉落資料，但沒有 Consumable JSON 定義。

| ID | 名稱 | 中文名 | 掉落怪物數 |
|----|------|--------|-----------|
`;
    for (const item of onlyInDropsByItem.sort((a, b) => a.id - b.id)) {
      md += `| ${item.id} | ${item.name} | ${item.chineseName || '-'} | ${item.totalMonsters} |\n`;
    }
    md += '\n';
  }

  if (nameDiffsWithDrops.length > 0) {
    md += `## 英文名稱不同 (${nameDiffsWithDrops.length} 個)

| ID | Consumable 名稱 | drops-by-item 名稱 |
|----|-----------------|-------------------|
`;
    for (const item of nameDiffsWithDrops.sort((a, b) => a.id - b.id)) {
      md += `| ${item.id} | ${item.consumableName} | ${item.dropsName} |\n`;
    }
    md += '\n';
  }

  if (chineseNameDiffs.length > 0) {
    md += `## 中文名稱不同 (${chineseNameDiffs.length} 個)

| ID | Consumable 中文名 | drops-by-item 中文名 |
|----|-------------------|---------------------|
`;
    for (const item of chineseNameDiffs.sort((a, b) => a.id - b.id)) {
      md += `| ${item.id} | ${item.consumableChineseName} | ${item.dropsChineseName} |\n`;
    }
    md += '\n';
  }

  if (onlyInConsumable.length === 0 && onlyInDropsByItem.length === 0 && nameDiffsWithDrops.length === 0 && chineseNameDiffs.length === 0) {
    md += '## 所有資料完全一致！\n';
  }

  return md;
}

function main() {
  console.log('載入 Consumable 資料...');
  const consumableItems = loadConsumableItems();
  console.log(`找到 ${consumableItems.size} 個 Consumable 檔案`);

  console.log('載入 drops-by-item 資料...');
  const dropsByItem = loadDropsByItem();
  console.log(`找到 ${dropsByItem.size} 個 Consumable 掉落檔案`);

  console.log('載入 drops-by-monster 資料...');
  const dropsByMonster = loadDropsByMonster();
  console.log(`找到 ${dropsByMonster.size} 個 Consumable 在怪物掉落中`);

  console.log('產生報告...');
  const report = generateReport(consumableItems, dropsByItem, dropsByMonster);

  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_FILE, report, 'utf-8');
  console.log(`報告已儲存至: ${OUTPUT_FILE}`);
}

main();
