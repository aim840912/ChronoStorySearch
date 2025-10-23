const fs = require('fs');
const path = require('path');

// 配置
const MOB_INFO_FILE = path.join(__dirname, '../data/mob-info.json');
const MAP_DATABASE_FILE = path.join(__dirname, '../data/map-monster-database.json');
const BACKUP_FILE = path.join(__dirname, '../data/mob-info.json.backup-maps-population');

// 主要執行函數
async function main() {
  console.log('🚀 開始從 map-monster-database 補充 maps 資料...\n');

  // 備份原始檔案
  console.log('📦 備份原始檔案...');
  const mobInfoContent = fs.readFileSync(MOB_INFO_FILE, 'utf-8');
  fs.writeFileSync(BACKUP_FILE, mobInfoContent, 'utf-8');
  console.log(`   已備份至: ${BACKUP_FILE}\n`);

  // 讀取資料
  const mobInfo = JSON.parse(mobInfoContent);
  const mapDatabase = JSON.parse(fs.readFileSync(MAP_DATABASE_FILE, 'utf-8'));

  // 建立怪物名稱 → 地圖列表的反向映射
  console.log('🗺️  建立反向映射...');
  const monsterToMapsMap = new Map();
  let totalMapEntries = 0;

  for (const region of mapDatabase.regions) {
    for (const map of region.maps) {
      if (map.monsters && map.monsters.length > 0) {
        for (const monster of map.monsters) {
          if (!monsterToMapsMap.has(monster.name)) {
            monsterToMapsMap.set(monster.name, []);
          }
          monsterToMapsMap.get(monster.name).push({
            map_id: null,  // map-monster-database 沒有 map_id
            map_name: map.name,
            chinese_map_name: map.chineseName || ''
          });
          totalMapEntries++;
        }
      }
    }
  }

  console.log(`   找到 ${monsterToMapsMap.size} 個不重複怪物`);
  console.log(`   總地圖條目: ${totalMapEntries} 個\n`);

  // 統計資訊
  let totalMobs = mobInfo.length;
  let hadMaps = 0;
  let noMaps = 0;
  let populated = 0;
  let notFound = 0;
  const populatedExamples = [];
  const notFoundExamples = [];

  // 遍歷 mob-info.json 補充 maps
  console.log('🔄 開始補充地圖資料...\n');

  for (const mob of mobInfo) {
    // 檢查是否已有 maps 資料
    if (mob.maps && mob.maps.length > 0) {
      hadMaps++;
      continue;
    }

    noMaps++;
    const mobName = mob.mob.mob_name;

    // 從映射中查找
    if (monsterToMapsMap.has(mobName)) {
      const foundMaps = monsterToMapsMap.get(mobName);
      mob.maps = foundMaps;
      populated++;

      // 收集範例（前 10 個）
      if (populatedExamples.length < 10) {
        populatedExamples.push({
          mobName,
          mobId: mob.mob.mob_id,
          chineseName: mob.chineseMobName,
          mapsCount: foundMaps.length,
          firstMap: foundMaps[0]?.map_name
        });
      }
    } else {
      notFound++;
      // 收集範例（前 10 個）
      if (notFoundExamples.length < 10) {
        notFoundExamples.push({
          mobName,
          mobId: mob.mob.mob_id,
          chineseName: mob.chineseMobName
        });
      }
    }
  }

  // 寫回檔案
  console.log('💾 儲存更新後的資料...');
  fs.writeFileSync(MOB_INFO_FILE, JSON.stringify(mobInfo, null, 2) + '\n', 'utf-8');
  console.log(`   已更新: ${MOB_INFO_FILE}\n`);

  // 顯示結果
  console.log('✅ 補充完成！\n');
  console.log('📈 補充統計:');
  console.log(`   總怪物數: ${totalMobs} 個`);
  console.log(`   原本有 maps: ${hadMaps} 個`);
  console.log(`   原本無 maps: ${noMaps} 個`);
  console.log(`   成功補充: ${populated} 個`);
  console.log(`   找不到資料: ${notFound} 個`);
  console.log(`   補充率: ${(populated / noMaps * 100).toFixed(2)}%`);
  console.log(`   最終覆蓋率: ${((hadMaps + populated) / totalMobs * 100).toFixed(2)}%\n`);

  // 顯示補充範例
  if (populatedExamples.length > 0) {
    console.log('📝 成功補充範例（前 10 個）:');
    populatedExamples.forEach((example, idx) => {
      console.log(`   ${idx + 1}. ${example.mobName}${example.chineseName ? ` (${example.chineseName})` : ''}`);
      console.log(`      ID: ${example.mobId}`);
      console.log(`      補充地圖數: ${example.mapsCount} 個`);
      console.log(`      首個地圖: ${example.firstMap}`);
    });
    console.log('');
  }

  // 顯示找不到的怪物
  if (notFoundExamples.length > 0) {
    console.log('⚠️  找不到資料的怪物（前 10 個）:');
    notFoundExamples.forEach((example, idx) => {
      console.log(`   ${idx + 1}. ${example.mobName}${example.chineseName ? ` (${example.chineseName})` : ''} (ID: ${example.mobId})`);
    });
    if (notFound > 10) {
      console.log(`   ... 還有 ${notFound - 10} 個找不到資料`);
    }
    console.log('');
  }

  console.log('🎉 完成！');
}

// 執行
main().catch(error => {
  console.error('\n❌ 執行錯誤:', error);
  process.exit(1);
});
