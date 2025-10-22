const fs = require('fs');
const path = require('path');

// 配置
const API_BASE_URL = 'https://chronostory.onrender.com/api/mob-info';
const MOB_INFO_PATH = path.join(__dirname, '../data/mob-info.json');
const BACKUP_PATH = path.join(__dirname, '../data/mob-info.json.backup');
const REPORT_PATH = path.join(__dirname, '../data/mob-info-sync-report.txt');
const REQUEST_DELAY = 500; // 每個請求間隔 500ms

// 需要比對的欄位
const FIELDS_TO_COMPARE = [
  'released',
  'max_hp',
  'acc',
  'avoid',
  'level',
  'exp',
  'phys_def',
  'mag_def',
  'fire_weakness',
  'ice_weakness',
  'lightning_weakness',
  'holy_weakness',
  'poison_weakness',
  'immune_to_poison_status'
];

// 延遲函數
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 獲取 API 資料
async function fetchMobInfo(mobId) {
  try {
    const response = await fetch(`${API_BASE_URL}?mobId=${mobId}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    return data.mob || null;
  } catch (error) {
    return { error: error.message };
  }
}

// 比對兩個怪物資料
function compareMobData(localMob, apiMob) {
  const differences = [];

  for (const field of FIELDS_TO_COMPARE) {
    const localValue = localMob[field];
    const apiValue = apiMob[field];

    // 只有當值不同時才記錄
    if (localValue !== apiValue) {
      differences.push({
        field,
        oldValue: localValue,
        newValue: apiValue
      });
    }
  }

  return differences;
}

// 主函數
async function syncMobInfo() {
  console.log('='.repeat(60));
  console.log('怪物資料同步工具');
  console.log('='.repeat(60));
  console.log('');

  // 讀取本地資料
  console.log('📖 讀取本地資料...');
  const mobData = JSON.parse(fs.readFileSync(MOB_INFO_PATH, 'utf8'));
  console.log(`✓ 找到 ${mobData.length} 個怪物\n`);

  // 備份原始檔案
  console.log('💾 備份原始檔案...');
  fs.copyFileSync(MOB_INFO_PATH, BACKUP_PATH);
  console.log(`✓ 備份至: ${BACKUP_PATH}\n`);

  // 統計資料
  const stats = {
    total: mobData.length,
    checked: 0,
    errors: 0,
    withDifferences: 0,
    totalDifferences: 0
  };

  const report = [];
  const updatedMobs = [];

  // 逐一檢查每個怪物
  console.log('🔍 開始檢查怪物資料...\n');

  for (let i = 0; i < mobData.length; i++) {
    const mobEntry = mobData[i];
    const mobId = mobEntry.mob.mob_id;
    const mobName = mobEntry.mob.mob_name;

    process.stdout.write(`[${i + 1}/${mobData.length}] 檢查 ${mobId} - ${mobName}...`);

    // 獲取 API 資料
    const apiMob = await fetchMobInfo(mobId);

    // 延遲避免 rate limiting
    await delay(REQUEST_DELAY);

    // 處理錯誤
    if (apiMob.error) {
      console.log(` ❌ 錯誤: ${apiMob.error}`);
      stats.errors++;
      report.push({
        mobId,
        mobName,
        error: apiMob.error
      });
      continue;
    }

    // 比對差異
    const differences = compareMobData(mobEntry.mob, apiMob);

    if (differences.length > 0) {
      console.log(` 🔄 發現 ${differences.length} 個差異`);
      stats.withDifferences++;
      stats.totalDifferences += differences.length;

      report.push({
        mobId,
        mobName,
        differences
      });

      // 更新本地資料
      differences.forEach(diff => {
        mobEntry.mob[diff.field] = diff.newValue;
      });

      updatedMobs.push(mobId);
    } else {
      console.log(' ✓');
    }

    stats.checked++;
  }

  console.log('\n' + '='.repeat(60));
  console.log('檢查完成');
  console.log('='.repeat(60));
  console.log(`總計: ${stats.total} 個怪物`);
  console.log(`已檢查: ${stats.checked} 個`);
  console.log(`錯誤: ${stats.errors} 個`);
  console.log(`有差異: ${stats.withDifferences} 個`);
  console.log(`總差異數: ${stats.totalDifferences} 個欄位\n`);

  // 生成報告
  console.log('📝 生成報告...');
  const reportLines = [
    '='.repeat(80),
    '怪物資料同步報告',
    '='.repeat(80),
    '',
    `檢查時間: ${new Date().toLocaleString('zh-TW')}`,
    `總怪物數量: ${stats.total}`,
    `檢查完成: ${stats.checked}`,
    `API 錯誤: ${stats.errors}`,
    `發現差異: ${stats.withDifferences}`,
    `總差異數: ${stats.totalDifferences}`,
    '',
    '='.repeat(80),
    '差異詳情',
    '='.repeat(80),
    ''
  ];

  report.forEach((item, index) => {
    if (item.error) {
      reportLines.push(`[${index + 1}] mob_id: ${item.mobId} - ${item.mobName}`);
      reportLines.push(`  ❌ API 錯誤: ${item.error}`);
      reportLines.push('');
    } else if (item.differences) {
      reportLines.push(`[${index + 1}] mob_id: ${item.mobId} - ${item.mobName}`);
      item.differences.forEach(diff => {
        reportLines.push(`  - ${diff.field}: ${diff.oldValue} → ${diff.newValue}`);
      });
      reportLines.push('');
    }
  });

  if (updatedMobs.length > 0) {
    reportLines.push('');
    reportLines.push('='.repeat(80));
    reportLines.push('已更新的怪物 ID');
    reportLines.push('='.repeat(80));
    reportLines.push(updatedMobs.join(', '));
  }

  fs.writeFileSync(REPORT_PATH, reportLines.join('\n'), 'utf8');
  console.log(`✓ 報告已儲存至: ${REPORT_PATH}\n`);

  // 寫入更新後的資料
  if (stats.withDifferences > 0) {
    console.log('💾 儲存更新後的資料...');
    fs.writeFileSync(MOB_INFO_PATH, JSON.stringify(mobData, null, 2), 'utf8');
    console.log(`✓ 已更新 ${stats.withDifferences} 個怪物的資料\n`);
  } else {
    console.log('✓ 沒有資料需要更新\n');
  }

  console.log('='.repeat(60));
  console.log('同步完成！');
  console.log('='.repeat(60));
  console.log(`備份檔案: ${BACKUP_PATH}`);
  console.log(`報告檔案: ${REPORT_PATH}`);
  console.log('');
  console.log('如需復原，請執行：');
  console.log(`cp ${BACKUP_PATH} ${MOB_INFO_PATH}`);
  console.log('');
}

// 執行
syncMobInfo().catch(error => {
  console.error('❌ 執行錯誤:', error);
  process.exit(1);
});
