const fs = require('fs');
const path = require('path');

// 配置
const API_BASE = 'https://maplestory.io/api/twms/217/map';
const DELAY_MS = 500; // 每次請求間隔 500ms
const INPUT_FILE = path.join(__dirname, '../data/map-translation-draft.json');
const BACKUP_FILE = path.join(__dirname, '../data/map-translation-draft.json.backup-api-fetch');

// 延遲函數
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 查詢單個地圖的 API
async function fetchMapName(mapId) {
  const url = `${API_BASE}/${mapId}/name`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    return {
      success: true,
      name: data.name || '',
      streetName: data.streetName || '',
      id: data.id
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// 主要執行函數
async function main() {
  console.log('🚀 開始批次查詢地圖翻譯...\n');

  // 備份原始檔案
  console.log('📦 備份原始檔案...');
  const originalContent = fs.readFileSync(INPUT_FILE, 'utf-8');
  fs.writeFileSync(BACKUP_FILE, originalContent, 'utf-8');
  console.log(`   已備份至: ${BACKUP_FILE}\n`);

  // 讀取資料
  const data = JSON.parse(originalContent);

  // 收集需要查詢的地圖
  const mapsToFetch = [];
  for (const region in data) {
    for (const mapName in data[region]) {
      if (data[region][mapName].map_id) {
        mapsToFetch.push({
          region,
          mapName,
          mapId: data[region][mapName].map_id
        });
      }
    }
  }

  console.log(`📊 統計資訊:`);
  console.log(`   需要查詢: ${mapsToFetch.length} 個地圖`);
  console.log(`   預計時間: ${Math.ceil(mapsToFetch.length * DELAY_MS / 1000)} 秒\n`);

  // 查詢統計
  let successCount = 0;
  let failCount = 0;
  const failedMaps = [];
  const sampleResults = [];

  // 逐一查詢
  for (let i = 0; i < mapsToFetch.length; i++) {
    const { region, mapName, mapId } = mapsToFetch[i];

    process.stdout.write(`\r⏳ 進度: ${i + 1}/${mapsToFetch.length} - 查詢 ${mapId}...`);

    const result = await fetchMapName(mapId);

    if (result.success) {
      // 更新資料（保持欄位順序）
      data[region][mapName] = {
        slug: data[region][mapName].slug,
        map_id: data[region][mapName].map_id,
        streetName: result.streetName,
        translation: result.name
      };
      successCount++;

      // 收集前 5 個範例
      if (sampleResults.length < 5) {
        sampleResults.push({
          mapName,
          mapId,
          translation: result.name,
          streetName: result.streetName
        });
      }
    } else {
      failCount++;
      failedMaps.push({
        mapName,
        mapId,
        error: result.error
      });
    }

    // 延遲避免請求過快
    if (i < mapsToFetch.length - 1) {
      await delay(DELAY_MS);
    }
  }

  console.log('\n');

  // 寫回檔案
  console.log('💾 儲存更新後的資料...');
  fs.writeFileSync(INPUT_FILE, JSON.stringify(data, null, 2) + '\n', 'utf-8');
  console.log(`   已更新: ${INPUT_FILE}\n`);

  // 顯示結果
  console.log('✅ 查詢完成！\n');
  console.log('📈 查詢結果:');
  console.log(`   成功: ${successCount} 個`);
  console.log(`   失敗: ${failCount} 個`);
  console.log(`   成功率: ${(successCount / mapsToFetch.length * 100).toFixed(2)}%\n`);

  // 顯示範例結果
  if (sampleResults.length > 0) {
    console.log('📝 範例結果（前 5 個）:');
    sampleResults.forEach((sample, idx) => {
      console.log(`   ${idx + 1}. ${sample.mapName}`);
      console.log(`      ID: ${sample.mapId}`);
      console.log(`      街道: ${sample.streetName}`);
      console.log(`      名稱: ${sample.translation}`);
    });
    console.log('');
  }

  // 顯示失敗的地圖
  if (failedMaps.length > 0) {
    console.log('⚠️  失敗的地圖:');
    failedMaps.slice(0, 10).forEach((failed, idx) => {
      console.log(`   ${idx + 1}. ${failed.mapName} (ID: ${failed.mapId}) - ${failed.error}`);
    });
    if (failedMaps.length > 10) {
      console.log(`   ... 還有 ${failedMaps.length - 10} 個失敗`);
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
