const fs = require('fs');
const path = require('path');

// 建立翻譯字典
const translationDict = {
  // 複合詞（優先匹配 - 按長度排序）
  'Hunting Ground': '狩獵場',
  'Training Ground': '訓練場',
  'Department Store': '百貨商店',
  'Weapon Store': '武器商店',
  'Armor Store': '防具商店',
  'Dungeon Entrance': '地城入口',
  'Hidden Street': '隱藏街道',
  'Split Road': '分岔路',
  'Self-Defence Item Store': '防身道具商店',
  'Repair Shop': '修理商店',
  'Instructional School': '教學學校',
  'Ant Tunnel': '螞蟻隧道',
  'Ship Area': '碼頭區域',
  'Conference Room': '會議室',
  'Generator Room': '發電機室',
  'Navigation Room': '導航室',
  'Hallway': '走廊',
  'Bottom Floor': '底層',
  'Top Floor': '頂層',
  'Mid Floor': '中層',
  'Castle Ruins': '城堡遺跡',

  // 地點類型
  'Field': '原野',
  'Forest': '森林',
  'Garden': '花園',
  'Park': '公園',
  'Road': '道路',
  'Street': '街道',
  'Cave': '洞穴',
  'Dungeon': '地城',
  'Temple': '神殿',
  'Tower': '塔',
  'Valley': '峽谷',
  'Mountain': '山',
  'Swamp': '沼澤',
  'Beach': '海灘',
  'Harbor': '港',
  'Store': '商店',
  'Ground': '場地',
  'Area': '區域',
  'Tunnel': '隧道',
  'Land': '大陸',
  'Site': '工地',
  'Entrance': '入口',
  'Tree': '樹',
  'Line': '線路',
  'Floor': '樓層',
  'Sanctuary': '聖地',
  'Cloud': '雲',
  'Hideout': '藏身處',
  'Hotel': '旅館',
  'Sauna': '桑拿',
  'Cafeteria': '自助餐廳',
  'Bedroom': '臥室',
  'Room': '房間',
  'Library': '圖書館',
  'Pharmacy': '藥局',
  'Market': '市場',

  // 方位
  'East': '東部',
  'West': '西部',
  'North': '北部',
  'South': '南部',
  'Middle': '中部',
  'Around': '周圍',
  'Deep': '深處',
  'Right': '右側',
  'Left': '左側',
  'Upper': '上層',
  'Lower': '下層',
  'Inner': '內部',
  'Outer': '外部',

  // 修飾詞
  'Hidden': '隱藏',
  'Dangerous': '危險',
  'Rocky': '岩石',
  'Dead': '死亡',
  'Thicket': '草叢',
  'Small': '小',
  'Big': '大',
  'Regular': '一般',
  'VIP': '貴賓',
  'Sleepy': '沉睡',

  // 常見連接詞和冠詞
  'The': '',
  'A': '',
  'An': '',
  'Of': '',
  'To': '',
  'In': '',
  'On': ''
};

// 翻譯函數
function translateMapName(englishName, currentChineseName) {
  // 如果當前翻譯已經是純中文（不含英文字母，羅馬數字除外），則保留
  const cleanedCurrent = currentChineseName.replace(/[IVX\d\s\-<>]/g, '').trim();
  if (cleanedCurrent && !/[A-Za-z]/.test(cleanedCurrent)) {
    return currentChineseName;
  }

  let translated = englishName;

  // 按詞彙長度排序（長的先匹配）
  const sortedDict = Object.entries(translationDict).sort((a, b) => b[0].length - a[0].length);

  sortedDict.forEach(([en, zh]) => {
    if (!en) return;
    // 使用單詞邊界匹配
    const regex = new RegExp(`\\b${en}\\b`, 'gi');
    translated = translated.replace(regex, zh);
  });

  // 清理多餘空格
  translated = translated.replace(/\s+/g, ' ').trim();

  return translated;
}

// 讀取資料
const dataPath = path.join(__dirname, '../data/map-monster-database.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

// 生成翻譯對照表（按區域分組）
const translationDraft = {};

data.regions.forEach(region => {
  const regionName = region.name;
  const mapsNeedingTranslation = {};

  region.maps.forEach(map => {
    // 只處理需要改進的翻譯（包含英文字母的）
    if (map.chineseName && /[A-Za-z]/.test(map.chineseName)) {
      const suggestedTranslation = translateMapName(map.name, map.chineseName);
      mapsNeedingTranslation[map.name] = suggestedTranslation;
    }
  });

  // 只添加有需要翻譯地圖的區域
  if (Object.keys(mapsNeedingTranslation).length > 0) {
    translationDraft[regionName] = mapsNeedingTranslation;
  }
});

// 寫入檔案
const outputPath = path.join(__dirname, '../data/map-translation-draft.json');
fs.writeFileSync(outputPath, JSON.stringify(translationDraft, null, 2), 'utf8');

console.log('✓ 翻譯對照檔案已生成：', outputPath);
console.log('\n統計資訊：');
console.log('- 區域數量：', Object.keys(translationDraft).length);

let totalMaps = 0;
Object.values(translationDraft).forEach(maps => {
  totalMaps += Object.keys(maps).length;
});
console.log('- 需要審核的地圖數量：', totalMaps);

console.log('\n請打開以下檔案進行審核：');
console.log('data/map-translation-draft.json');
console.log('\n審核完成後，執行以下指令應用翻譯：');
console.log('node scripts/apply-map-translations.js');
