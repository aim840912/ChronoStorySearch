/**
 * 從 maplestory.io API 獲取缺失的中文物品名稱
 * 用法: node scripts/fetch-missing-chinese-names.js [--dry-run]
 */

const fs = require('fs');
const path = require('path');

const DROPS_DIR = path.join(__dirname, '../chronostoryData/unreleased/drops-by-monster');
const API_BASE = 'https://maplestory.io/api/TWMS/230/item';
const DELAY_MS = 300; // API 請求間隔，避免過度請求

// 命令行參數
const isDryRun = process.argv.includes('--dry-run');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchChineseName(itemId) {
  if (itemId === 0) return null; // Meso 不需要獲取

  try {
    const response = await fetch(`${API_BASE}/${itemId}`);
    if (!response.ok) {
      console.log(`  ⚠️ API 返回 ${response.status} for itemId ${itemId}`);
      return null;
    }
    const data = await response.json();
    // 中文名稱在 description.name 裡
    return data?.description?.name || null;
  } catch (error) {
    console.log(`  ❌ 獲取 itemId ${itemId} 失敗: ${error.message}`);
    return null;
  }
}

async function processFile(filePath) {
  const fileName = path.basename(filePath);
  const content = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(content);

  let updated = false;
  const updates = [];

  for (const drop of data.drops) {
    // 跳過 Meso (itemId: 0) 和已有中文名稱的項目
    if (drop.itemId === 0 || drop.chineseItemName) continue;

    console.log(`  🔍 查詢 itemId ${drop.itemId} (${drop.itemName})...`);
    const chineseName = await fetchChineseName(drop.itemId);

    if (chineseName) {
      updates.push({
        itemId: drop.itemId,
        itemName: drop.itemName,
        chineseName
      });
      drop.chineseItemName = chineseName;
      updated = true;
      console.log(`    ✅ 找到: ${chineseName}`);
    } else {
      console.log(`    ⚠️ 未找到中文名稱`);
    }

    await sleep(DELAY_MS);
  }

  if (updated && !isDryRun) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
    console.log(`  💾 已更新 ${fileName}`);
  }

  return updates;
}

async function main() {
  console.log('🚀 開始獲取缺失的中文物品名稱\n');
  console.log(`📁 目錄: ${DROPS_DIR}`);
  console.log(`🔧 模式: ${isDryRun ? 'Dry Run (不寫入檔案)' : '實際執行'}\n`);

  const files = fs.readdirSync(DROPS_DIR).filter(f => f.endsWith('.json'));
  console.log(`📄 找到 ${files.length} 個檔案\n`);

  let totalUpdates = 0;
  const allUpdates = [];

  for (const file of files) {
    const filePath = path.join(DROPS_DIR, file);
    console.log(`\n📋 處理 ${file}...`);

    const updates = await processFile(filePath);
    totalUpdates += updates.length;
    allUpdates.push(...updates);
  }

  console.log('\n' + '='.repeat(50));
  console.log(`✨ 完成！共更新 ${totalUpdates} 個物品名稱`);

  if (allUpdates.length > 0) {
    console.log('\n📝 更新清單:');
    for (const u of allUpdates) {
      console.log(`  - ${u.itemId}: ${u.itemName} → ${u.chineseName}`);
    }
  }
}

main().catch(console.error);
