const fs = require('fs');
const path = require('path');

// 配置
const BASE_URL = 'https://www.artalemaplestory.com/zh/maps/dead-mine';
const DELAY_MS = 500; // 每次請求間隔 500ms
const INPUT_FILE = path.join(__dirname, '../data/map-translation-draft.json');
const BACKUP_FILE = path.join(__dirname, '../data/map-translation-draft.json.backup-artale-ossyria-fetch');

// Ossyria 相關區域列表
const TARGET_REGIONS = [
  'Ossyria - El Nath',
  'Ossyria - El Nath West',
  'Ossyria - El Nath East'
];

// 延遲函數
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 從 HTML 中提取地圖中文名稱
function extractMapName(html) {
  // 嘗試從 h1 標籤提取（格式：雲彩公園1 | 艾納斯大陸）
  const h1Match = html.match(/<h1[^>]*>([^<|]+)/i);
  if (h1Match && h1Match[1]) {
    return h1Match[1].trim();
  }

  // 嘗試從 title 標籤提取（格式：雲彩公園1 | 艾納斯大陸 | 地圖 | ...）
  const titleMatch = html.match(/<title[^>]*>([^<|]+)/i);
  if (titleMatch && titleMatch[1]) {
    return titleMatch[1].trim();
  }

  return null;
}

// 查詢單個地圖
async function fetchMapTranslation(slug) {
  const url = `${BASE_URL}/${slug}`;
  try {
    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 404) {
        return {
          success: false,
          error: 'HTTP 404',
          slug
        };
      }
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    const mapName = extractMapName(html);

    if (!mapName) {
      return {
        success: false,
        error: '無法提取地圖名稱',
        slug
      };
    }

    return {
      success: true,
      translation: mapName,
      slug
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      slug
    };
  }
}

// 主要執行函數
async function main() {
  console.log('🚀 開始批次爬取 Orbis 地圖翻譯...\n');

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
    if (TARGET_REGIONS.includes(region)) {
      for (const mapName in data[region]) {
        const mapData = data[region][mapName];
        if (mapData.slug) {
          mapsToFetch.push({
            region,
            mapName,
            slug: mapData.slug,
            currentTranslation: mapData.translation || ''
          });
        }
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
  const successMaps = [];

  // 逐一查詢
  for (let i = 0; i < mapsToFetch.length; i++) {
    const { region, mapName, slug } = mapsToFetch[i];

    process.stdout.write(`\r⏳ 進度: ${i + 1}/${mapsToFetch.length} - 查詢 ${slug}...`);

    const result = await fetchMapTranslation(slug);

    if (result.success) {
      // 更新資料（保持欄位順序）
      const originalData = data[region][mapName];
      data[region][mapName] = {
        slug: originalData.slug,
        map_id: originalData.map_id,
        ...(originalData.streetName !== undefined && { streetName: originalData.streetName }),
        translation: result.translation
      };
      successCount++;
      successMaps.push({
        mapName,
        slug,
        translation: result.translation
      });
    } else {
      failCount++;
      failedMaps.push({
        mapName,
        slug,
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
  console.log('✅ 爬取完成！\n');
  console.log('📈 爬取結果:');
  console.log(`   成功: ${successCount} 個`);
  console.log(`   失敗: ${failCount} 個`);
  console.log(`   成功率: ${(successCount / mapsToFetch.length * 100).toFixed(2)}%\n`);

  // 顯示成功結果（前 10 個）
  if (successMaps.length > 0) {
    console.log('📝 成功結果（前 10 個）:');
    successMaps.slice(0, 10).forEach((map, idx) => {
      console.log(`   ${idx + 1}. ${map.mapName}`);
      console.log(`      Slug: ${map.slug}`);
      console.log(`      翻譯: ${map.translation}`);
    });
    if (successMaps.length > 10) {
      console.log(`   ... 還有 ${successMaps.length - 10} 個成功`);
    }
    console.log('');
  }

  // 顯示失敗的地圖
  if (failedMaps.length > 0) {
    console.log('⚠️  失敗的地圖:');
    failedMaps.forEach((failed, idx) => {
      console.log(`   ${idx + 1}. ${failed.mapName} (slug: ${failed.slug}) - ${failed.error}`);
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
