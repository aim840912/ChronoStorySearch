const fs = require('fs');
const path = require('path');

// 配置
const MOB_INFO_FILE = path.join(__dirname, '../data/mob-info.json');
const MAP_DRAFT_FILE = path.join(__dirname, '../data/map-translation-draft.json');
const BACKUP_FILE = path.join(__dirname, '../data/mob-info.json.backup-map-name-update');

// 主要執行函數
async function main() {
  console.log('🚀 開始更新 mob-info.json 中文地圖名稱...\n');

  // 備份原始檔案
  console.log('📦 備份原始檔案...');
  const mobInfoContent = fs.readFileSync(MOB_INFO_FILE, 'utf-8');
  fs.writeFileSync(BACKUP_FILE, mobInfoContent, 'utf-8');
  console.log(`   已備份至: ${BACKUP_FILE}\n`);

  // 讀取資料
  const mobInfo = JSON.parse(mobInfoContent);
  const mapDraft = JSON.parse(fs.readFileSync(MAP_DRAFT_FILE, 'utf-8'));

  // 建立翻譯映射 (map_name -> translation)
  console.log('🗺️  建立翻譯映射...');
  const translationMap = new Map();
  let translationCount = 0;

  for (const region in mapDraft) {
    for (const mapName in mapDraft[region]) {
      const mapData = mapDraft[region][mapName];
      if (mapData.translation && mapData.translation !== '') {
        translationMap.set(mapName, mapData.translation);
        translationCount++;
      }
    }
  }
  console.log(`   找到 ${translationCount} 個翻譯\n`);

  // 統計資訊
  let totalMapEntries = 0;
  let emptyBefore = 0;
  let updatedCount = 0;
  let replacedCount = 0;  // 覆蓋已有內容的數量
  let notFoundCount = 0;
  const updateExamples = [];

  // 遍歷 mob-info.json 更新 chinese_map_name
  console.log('🔄 開始更新地圖名稱...\n');

  for (const mobData of mobInfo) {
    if (mobData.maps && mobData.maps.length > 0) {
      for (const map of mobData.maps) {
        totalMapEntries++;

        // 記錄更新前的空值數量
        if (!map.chinese_map_name || map.chinese_map_name === '') {
          emptyBefore++;
        }

        // 檢查是否有翻譯
        if (translationMap.has(map.map_name)) {
          const newTranslation = translationMap.get(map.map_name);
          const oldValue = map.chinese_map_name;

          // 記錄是否覆蓋已有內容
          if (oldValue && oldValue !== '' && oldValue !== newTranslation) {
            replacedCount++;
          }

          // 強制更新翻譯（不管原本的值）
          map.chinese_map_name = newTranslation;
          updatedCount++;

          // 收集範例（前 10 個）
          if (updateExamples.length < 10) {
            updateExamples.push({
              map_name: map.map_name,
              old: oldValue || '(空)',
              new: newTranslation,
              wasReplaced: oldValue && oldValue !== '' && oldValue !== newTranslation
            });
          }
        } else {
          notFoundCount++;
        }
      }
    }
  }

  // 計算更新後的空值數量
  let emptyAfter = 0;
  for (const mobData of mobInfo) {
    if (mobData.maps && mobData.maps.length > 0) {
      for (const map of mobData.maps) {
        if (!map.chinese_map_name || map.chinese_map_name === '') {
          emptyAfter++;
        }
      }
    }
  }

  // 寫回檔案
  console.log('💾 儲存更新後的資料...');
  fs.writeFileSync(MOB_INFO_FILE, JSON.stringify(mobInfo, null, 2) + '\n', 'utf-8');
  console.log(`   已更新: ${MOB_INFO_FILE}\n`);

  // 顯示結果
  console.log('✅ 更新完成！\n');
  console.log('📈 更新統計:');
  console.log(`   總地圖條目: ${totalMapEntries} 個`);
  console.log(`   成功更新: ${updatedCount} 個`);
  console.log(`   覆蓋已有內容: ${replacedCount} 個`);
  console.log(`   找不到翻譯: ${notFoundCount} 個`);
  console.log(`   更新前空值: ${emptyBefore} 個`);
  console.log(`   更新後空值: ${emptyAfter} 個`);
  console.log(`   覆蓋率: ${((totalMapEntries - emptyAfter) / totalMapEntries * 100).toFixed(2)}%\n`);

  // 顯示範例
  if (updateExamples.length > 0) {
    console.log('📝 更新範例（前 10 個）:');
    updateExamples.forEach((example, idx) => {
      const replaceTag = example.wasReplaced ? ' [覆蓋]' : '';
      console.log(`   ${idx + 1}. ${example.map_name}${replaceTag}`);
      console.log(`      更新前: "${example.old}"`);
      console.log(`      更新後: "${example.new}"`);
    });
    console.log('');
  }

  console.log('🎉 完成！');
}

// 執行
main().catch(error => {
  console.error('\n❌ 執行錯誤:', error);
  process.exit(1);
});
