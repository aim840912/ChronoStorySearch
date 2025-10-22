#!/usr/bin/env node

/**
 * 地圖名稱翻譯腳本
 * 為 map-monster-database.json 中的所有地圖添加中文名稱
 */

const fs = require('fs');
const path = require('path');

// ========== 翻譯規則庫 ==========

// A. 主要城鎮與地點翻譯（官方翻譯 - 使用台灣常用版本）
const CITY_TRANSLATIONS = {
  // 維多利亞島主要城鎮
  'Lith Harbor': '維多利亞港',
  'Perion': '勇士之村',
  'Ellinia': '魔法密林',
  'Henesys': '弓箭手村',
  'Kerning City': '墮落城市',
  'Sleepywood': '奇幻村',
  'Amherst': '阿姆斯特',
  'Nautilus': '鯨魚號',
  'Mushroom Town': '蘑菇城鎮',
  'Southperry': '南港',

  // Ossyria 主要城鎮
  'Orbis': '天空之城',
  'El Nath': '冰原雪域',
  'Ludibrium': '玩具城',
  'Leafre': '神木村',
  'Mu Lung': '武林',
  'Ariant': '阿里安特',

  // 特殊地點
  'Ant Tunnel': '螞蟻洞',
  'Cloud Park': '雲朵公園',
  'Orbis Tower': '天空之塔',
};

// B. 常用地圖術語翻譯
const TERM_TRANSLATIONS = {
  'Hunting Ground': '狩獵場',
  'Dungeon': '地城',
  'Entrance': '入口',
  'East': '東部',
  'West': '西部',
  'North': '北部',
  'South': '南部',
  'Town': '城鎮',
  'Townstreet': '城鎮大街',
  'Forest': '森林',
  'Road': '道路',
  'Field': '原野',
  'Swamp': '沼澤',
  'Subway': '地鐵',
  'Tower': '塔',
  'Park': '公園',
  'Outside': '外圍',
  'Bottom': '底層',
  'Top': '頂層',
  'Floor': '樓層',
  'Cave': '洞穴',
  'Mine': '礦坑',
  'Path': '小徑',
  'Crossway': '岔道',
  'Split Road': '岔路',
  'The Field': '原野',
  'Domain': '領地',
};

// 怪物名稱翻譯（用於狩獵場）
const MONSTER_TRANSLATIONS = {
  'Snail': '蝸牛',
  'Slime': '史萊姆',
  'Mushroom': '蘑菇',
  'Stump': '樹樁',
  'Pig': '豬',
  'Orange Mushroom': '橙色蘑菇',
  'Ribbon Pig': '緞帶豬',
  'Green Mushroom': '綠色蘑菇',
  'Zombie Mushroom': '殭屍蘑菇',
  'Horny Mushroom': '刺蘑菇',
  'Octopus': '章魚',
  'Jr. Sentinel': '初階哨兵',
  'Sentine': '哨兵',
  'Sentinel': '哨兵',
};

/**
 * 翻譯地圖名稱
 * @param {string} englishName - 英文地圖名稱
 * @returns {string} 中文地圖名稱
 */
function translateMapName(englishName) {
  // 1. 優先檢查完整匹配（主要城鎮）
  if (CITY_TRANSLATIONS[englishName]) {
    return CITY_TRANSLATIONS[englishName];
  }

  // 2. 處理特殊模式
  let translated = englishName;

  // 模式：Victoria Road - XXX → XXX（直接使用城市翻譯）
  const victoriaRoadMatch = englishName.match(/^Victoria Road - (.+)$/);
  if (victoriaRoadMatch) {
    const cityName = victoriaRoadMatch[1];
    if (CITY_TRANSLATIONS[cityName]) {
      return CITY_TRANSLATIONS[cityName];
    }
  }

  // 模式：Maple Road - XXX → 楓葉道路 - XXX
  const mapleRoadMatch = englishName.match(/^Maple Road - (.+)$/);
  if (mapleRoadMatch) {
    const locationName = mapleRoadMatch[1];
    if (CITY_TRANSLATIONS[locationName]) {
      return `楓葉道路 - ${CITY_TRANSLATIONS[locationName]}`;
    }
    return `楓葉道路 - ${translateMapName(locationName)}`;
  }

  // 模式：Rainbow Street - XXX → 彩虹街 - XXX
  const rainbowStreetMatch = englishName.match(/^Rainbow Street - (.+)$/);
  if (rainbowStreetMatch) {
    const locationName = rainbowStreetMatch[1];
    return `彩虹街 - ${translateMapName(locationName)}`;
  }

  // 模式：Warning Street - XXX → 警告街 - XXX
  const warningStreetMatch = englishName.match(/^Warning Street - (.+)$/);
  if (warningStreetMatch) {
    const locationName = warningStreetMatch[1];
    return `警告街 - ${translateMapName(locationName)}`;
  }

  // 模式：Dungeon - XXX → 地城 - XXX
  const dungeonMatch = englishName.match(/^Dungeon - (.+)$/);
  if (dungeonMatch) {
    const locationName = dungeonMatch[1];
    if (CITY_TRANSLATIONS[locationName]) {
      return `地城 - ${CITY_TRANSLATIONS[locationName]}`;
    }
    return `地城 - ${translateMapName(locationName)}`;
  }

  // 模式：Ossyria - XXX → 艾莉西亞 - XXX
  const ossyriaMatch = englishName.match(/^Ossyria - (.+)$/);
  if (ossyriaMatch) {
    const locationName = ossyriaMatch[1];
    if (CITY_TRANSLATIONS[locationName]) {
      return CITY_TRANSLATIONS[locationName];
    }
    return translateMapName(locationName);
  }

  // 模式：Orbis - XXX → 天空之城 - XXX
  const orbisMatch = englishName.match(/^Orbis - (.+)$/);
  if (orbisMatch) {
    const locationName = orbisMatch[1];
    if (CITY_TRANSLATIONS[locationName]) {
      return `天空之城 - ${CITY_TRANSLATIONS[locationName]}`;
    }
    return `天空之城 - ${translateMapName(locationName)}`;
  }

  // 3. 處理方向詞（East/West/North/South of XXX）
  const directionMatch = englishName.match(/^(East|West|North|South) (of |Entrance to |Domain of )?(.+)$/);
  if (directionMatch) {
    const direction = TERM_TRANSLATIONS[directionMatch[1]];
    const cityName = directionMatch[3];
    if (CITY_TRANSLATIONS[cityName]) {
      return `${CITY_TRANSLATIONS[cityName]}${direction}`;
    }
  }

  // 4. 處理 "XXX Entrance"
  const entranceMatch = englishName.match(/^(.+) Entrance(?: to (.+))?$/);
  if (entranceMatch) {
    const direction = entranceMatch[1];
    const location = entranceMatch[2];
    if (location && CITY_TRANSLATIONS[location]) {
      const directionTrans = TERM_TRANSLATIONS[direction] || direction;
      return `${CITY_TRANSLATIONS[location]}${directionTrans}入口`;
    }
  }

  // 5. 處理 "Outside XXX"
  const outsideMatch = englishName.match(/^Outside (.+)$/);
  if (outsideMatch) {
    const location = outsideMatch[1];
    if (CITY_TRANSLATIONS[location]) {
      return `${CITY_TRANSLATIONS[location]}外圍`;
    }
  }

  // 6. 處理 "XXX Hunting Ground I/II/III"
  const huntingGroundMatch = englishName.match(/^(.+) Hunting Ground ([IVX]+)$/);
  if (huntingGroundMatch) {
    const monsterName = huntingGroundMatch[1];
    const number = huntingGroundMatch[2];
    const translatedMonster = MONSTER_TRANSLATIONS[monsterName] || monsterName;
    return `${translatedMonster}狩獵場 ${number}`;
  }

  // 7. 處理包含城市名稱的複合地圖
  for (const [englishCity, chineseCity] of Object.entries(CITY_TRANSLATIONS)) {
    if (englishName.includes(englishCity)) {
      translated = translated.replace(englishCity, chineseCity);
    }
  }

  // 8. 替換常用術語
  for (const [englishTerm, chineseTerm] of Object.entries(TERM_TRANSLATIONS)) {
    // 使用正則表達式確保完整單詞匹配
    const regex = new RegExp(`\\b${englishTerm}\\b`, 'g');
    translated = translated.replace(regex, chineseTerm);
  }

  // 9. 如果沒有任何翻譯，返回原始名稱
  if (translated === englishName) {
    console.log(`⚠️  未翻譯: ${englishName}`);
  }

  return translated;
}

/**
 * 主要處理函數
 */
function main() {
  console.log('🌍 開始處理地圖翻譯...\n');

  // 讀取原始資料
  const inputPath = path.join(__dirname, '../data/map-monster-database.json');
  const data = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));

  let translatedCount = 0;
  let totalMapCount = 0;
  const untranslatedMaps = [];

  // 處理每個區域的每個地圖
  data.regions.forEach((region) => {
    region.maps.forEach((map) => {
      totalMapCount++;
      const originalName = map.name;
      const chineseName = translateMapName(originalName);

      map.chineseName = chineseName;

      if (chineseName !== originalName) {
        translatedCount++;
      } else {
        untranslatedMaps.push(originalName);
      }
    });
  });

  // 輸出統計資訊
  console.log(`\n📊 翻譯統計:`);
  console.log(`   總地圖數: ${totalMapCount}`);
  console.log(`   已翻譯: ${translatedCount} (${((translatedCount / totalMapCount) * 100).toFixed(1)}%)`);
  console.log(`   未翻譯: ${untranslatedMaps.length}`);

  if (untranslatedMaps.length > 0) {
    console.log(`\n⚠️  未翻譯的地圖列表:`);
    untranslatedMaps.forEach((name, index) => {
      console.log(`   ${index + 1}. ${name}`);
    });
  }

  // 寫入新檔案
  const outputPath = inputPath; // 覆蓋原檔案
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf-8');

  console.log(`\n✅ 翻譯完成！已更新檔案: ${outputPath}`);
}

// 執行
main();
