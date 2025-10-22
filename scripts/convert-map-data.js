#!/usr/bin/env node

/**
 * 將 Google Sheets 地圖和怪物資料轉換為 JSON 格式
 *
 * 支援處理多個工作表並合併為單一資料庫
 *
 * 使用方式：
 *   node convert-map-data.js [gid1] [gid2] ...
 *   或使用預設的工作表列表
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 預設的工作表 GID 列表
const DEFAULT_GIDS = [
  '415330053',   // Maple Road - Mushroom Town, Rainbow Street - Amherst, Maple Road - Southperry
  '486394009',   // Victoria Road - Lith Harbor
  '0',           // Victoria Road - Kerning City
  '898655980',   // Victoria Road - Henesys
  '1754196543',  // Victoria Road - Perion
  '508846815',   // Victoria Road - Ellinia
  '714441637',   // Victoria Road - Nautilus
  '615729202',   // Dungeon - Sleepywood
  '350970245',   // Ossyria - Orbis
  '1897049096'   // 新增工作表
];

// Google Sheets 基礎 URL
const SHEETS_BASE_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSIUj-72ADgwMqShxt4Dn7OP7dBN54l0wda1IPwlIVTZUN_ZtTlRx5DDidr43VXv2HYQ5RNqccLbbGS';

const OUTPUT_FILE = path.join(__dirname, '../data/map-monster-database.json');
const TEMP_DIR = '/tmp';

/**
 * 下載指定 GID 的 CSV 資料
 */
function downloadSheet(gid) {
  const url = `${SHEETS_BASE_URL}/pub?gid=${gid}&single=true&output=csv`;
  const tempFile = path.join(TEMP_DIR, `sheet-${gid}.csv`);

  try {
    console.log(`📥 下載工作表 (gid: ${gid})...`);
    execSync(`curl -L "${url}" -o "${tempFile}" 2>/dev/null`);
    return tempFile;
  } catch (error) {
    console.error(`❌ 下載失敗 (gid: ${gid}):`, error.message);
    return null;
  }
}

/**
 * 解析 CSV 行為陣列
 */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());

  return result;
}

/**
 * 檢查是否為區域標題行
 * 區域標題特徵：
 * 1. 第一個欄位有內容
 * 2. 包含括號中的區域代碼，格式如 (A)、(B)、(C) 等
 *    或者包含 " - " 分隔符（如 "Ossyria - Orbis"）
 * 3. 第 2、3 欄為空
 */
function isRegionHeader(cells) {
  const firstCell = cells[0];

  // 檢查是否為空或只是標題行
  if (!firstCell || firstCell === 'Map Name') {
    return false;
  }

  // 格式1：包含括號中的大寫字母或數字（區域代碼）
  const hasRegionCode = /\([A-Z0-9]+\)/.test(firstCell);

  // 格式2：包含 " - " 分隔符，且第2、3欄為空（奧西利亞格式）
  const hasRegionSeparator = firstCell.includes(' - ') && cells[1] === '' && cells[2] === '';

  return firstCell &&
         (hasRegionCode || hasRegionSeparator) &&
         cells[1] === '' &&
         cells[2] === '';
}

/**
 * 從區域名稱提取區域代碼
 * 例如：'Maple Road - Mushroom Town (A)' => 'A'
 * 如果沒有區域代碼，返回空字串
 */
function extractRegionCode(regionName) {
  const match = regionName.match(/\(([A-Z0-9]+)\)/);
  return match ? match[1] : '';
}

/**
 * 處理單組欄位的資料（CSV 有兩組並列的欄位）
 */
function processFieldSet(cells, startIndex) {
  const mapName = cells[startIndex];
  const npc = cells[startIndex + 1];
  const monster = cells[startIndex + 2];
  const monsterLevel = cells[startIndex + 3];
  const baseXP = cells[startIndex + 4];
  const mapLinks = cells[startIndex + 5];

  return {
    mapName,
    npc,
    monster,
    monsterLevel,
    baseXP,
    mapLinks
  };
}

/**
 * 解析單個 CSV 檔案並返回區域資料
 */
function parseCSVFile(csvFile) {
  const csvContent = fs.readFileSync(csvFile, 'utf-8');
  const lines = csvContent.split('\n').filter(line => line.trim());

  const regions = [];
  let currentRegion = null;
  let currentMap = null;
  const mapCache = new Map();

  // 跳過標題行
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCSVLine(lines[i]);

    // 檢查是否為區域標題
    if (isRegionHeader(cells)) {
      // 儲存前一個區域的地圖
      if (currentRegion && mapCache.size > 0) {
        currentRegion.maps = Array.from(mapCache.values());
        mapCache.clear();
      }

      // 建立新區域
      currentRegion = {
        name: cells[0],
        code: extractRegionCode(cells[0]),
        maps: []
      };
      regions.push(currentRegion);
      continue;
    }

    // 處理兩組欄位（左側和右側）
    for (let setIndex = 0; setIndex < 2; setIndex++) {
      const data = processFieldSet(cells, setIndex * 7);

      // 跳過空的資料行
      if (!data.mapName && !data.npc && !data.monster) {
        continue;
      }

      // 如果有地圖名稱，建立或更新地圖
      if (data.mapName && data.mapName !== '-') {
        if (!mapCache.has(data.mapName)) {
          mapCache.set(data.mapName, {
            name: data.mapName,
            npcs: [],
            monsters: [],
            links: []
          });
        }
        currentMap = mapCache.get(data.mapName);
      }

      if (!currentMap) continue;

      // 新增 NPC
      if (data.npc && data.npc !== '-' && !currentMap.npcs.includes(data.npc)) {
        currentMap.npcs.push(data.npc);
      }

      // 新增怪物
      if (data.monster && data.monster !== '-') {
        const level = data.monsterLevel === '#N/A' ? null : parseInt(data.monsterLevel) || null;
        const xp = data.baseXP === '#N/A' ? null : parseInt(data.baseXP) || null;

        // 檢查是否已存在相同怪物
        const existingMonster = currentMap.monsters.find(m => m.name === data.monster);
        if (!existingMonster) {
          currentMap.monsters.push({
            name: data.monster,
            level: level,
            baseXP: xp
          });
        }
      }

      // 新增地圖連結
      if (data.mapLinks && data.mapLinks !== '-' && !currentMap.links.includes(data.mapLinks)) {
        currentMap.links.push(data.mapLinks);
      }
    }
  }

  // 儲存最後一個區域的地圖
  if (currentRegion && mapCache.size > 0) {
    currentRegion.maps = Array.from(mapCache.values());
  }

  return regions;
}

/**
 * 處理多個工作表並合併資料
 */
function processMultipleSheets(gids) {
  const allRegions = [];
  const tempFiles = [];

  // 下載所有工作表
  for (const gid of gids) {
    const tempFile = downloadSheet(gid);
    if (tempFile) {
      tempFiles.push(tempFile);
    }
  }

  // 解析所有 CSV 檔案
  console.log(`🔄 解析 ${tempFiles.length} 個工作表...`);
  for (const tempFile of tempFiles) {
    const regions = parseCSVFile(tempFile);
    allRegions.push(...regions);
  }

  // 清理臨時檔案
  console.log('🧹 清理臨時檔案...');
  for (const tempFile of tempFiles) {
    try {
      fs.unlinkSync(tempFile);
    } catch (_error) {
      // 忽略清理錯誤
    }
  }

  return allRegions;
}

// 主程式
try {
  console.log('🚀 開始轉換地圖和怪物資料...\n');

  // 從命令列參數獲取 GID，如果沒有則使用預設值
  const gids = process.argv.length > 2 ? process.argv.slice(2) : DEFAULT_GIDS;
  console.log(`📋 處理 ${gids.length} 個工作表：${gids.join(', ')}\n`);

  // 處理所有工作表
  const allRegions = processMultipleSheets(gids);

  // 建立最終的 JSON 結構
  const jsonData = {
    metadata: {
      source: 'ChronoStory Map and Monster Database',
      sourceUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSIUj-72ADgwMqShxt4Dn7OP7dBN54l0wda1IPwlIVTZUN_ZtTlRx5DDidr43VXv2HYQ5RNqccLbbGS/pubhtml',
      generatedAt: new Date().toISOString(),
      totalRegions: allRegions.length,
      totalMaps: allRegions.reduce((sum, r) => sum + r.maps.length, 0),
      processedSheets: gids.length
    },
    regions: allRegions
  };

  // 確保輸出目錄存在
  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // 寫入 JSON 檔案（美化格式）
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(jsonData, null, 2), 'utf-8');

  console.log('\n✅ 轉換完成！');
  console.log(`📊 統計資訊：`);
  console.log(`   - 處理工作表: ${jsonData.metadata.processedSheets}`);
  console.log(`   - 區域數量: ${jsonData.metadata.totalRegions}`);
  console.log(`   - 地圖數量: ${jsonData.metadata.totalMaps}`);
  console.log(`📁 輸出檔案: ${OUTPUT_FILE}`);

} catch (error) {
  console.error('\n❌ 轉換失敗:', error.message);
  console.error(error.stack);
  process.exit(1);
}
