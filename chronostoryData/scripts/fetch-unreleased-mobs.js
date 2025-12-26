/**
 * 從 maplestory.io API 獲取 unreleased mobs 資料並更新 unreleased JSON 檔案
 * 將格式轉換為 mob-info.json 格式（包含 mob 物件和 chineseMobName）
 *
 * 使用方式: node fetch-unreleased-mobs.js
 */

const fs = require('fs');
const path = require('path');

const UNRELEASED_DIR = path.join(__dirname, '../unreleased');
const API_BASE = 'https://maplestory.io/api/GMS/83/mob';

// 屬性字母對應
const ELEMENT_MAP = {
  'H': 'holy_weakness',
  'F': 'fire_weakness',
  'I': 'ice_weakness',
  'L': 'lightning_weakness',
  'P': 'poison_weakness',
  'D': 'dark_weakness'
};

/**
 * 解析 elementalAttributes 字串
 * 例如 "H3F3" -> { holy_weakness: 3, fire_weakness: 3 }
 */
function parseElementalAttributes(attrStr) {
  const result = {
    fire_weakness: null,
    ice_weakness: null,
    lightning_weakness: null,
    holy_weakness: null,
    poison_weakness: null,
    dark_weakness: null
  };

  if (!attrStr) return result;

  // 匹配 字母+數字 的模式
  const regex = /([HFILPD])(\d)/g;
  let match;

  while ((match = regex.exec(attrStr)) !== null) {
    const letter = match[1];
    const num = match[2];
    const field = ELEMENT_MAP[letter];
    if (field) {
      result[field] = parseInt(num, 10);
    }
  }

  return result;
}

/**
 * 從 API 獲取怪物資料
 */
async function fetchMobData(id) {
  const url = API_BASE + '/' + id;
  console.log('  Fetching ' + id + '...');

  const response = await fetch(url);
  if (!response.ok) {
    console.error('  Failed to fetch ' + id + ': ' + response.status);
    return null;
  }

  return response.json();
}

/**
 * 轉換 API 資料為 mob-info.json 格式
 */
function transformToMobInfo(apiData, nameCN) {
  const id = apiData.id;
  const name = apiData.name;
  const meta = apiData.meta || {};
  const weaknesses = parseElementalAttributes(meta.elementalAttributes);

  return {
    mob: {
      InGame: false,
      id: String(id),
      name: name || null,
      maxHP: meta.maxHP !== undefined ? meta.maxHP : null,
      accuracy: meta.accuracy !== undefined ? meta.accuracy : null,
      evasion: meta.evasion !== undefined ? meta.evasion : null,
      level: meta.level !== undefined ? meta.level : null,
      exp: meta.exp !== undefined ? meta.exp : null,
      physicalDefense: meta.physicalDefense !== undefined ? meta.physicalDefense : null,
      magicDefense: meta.magicDefense !== undefined ? meta.magicDefense : null,
      fire_weakness: weaknesses.fire_weakness,
      ice_weakness: weaknesses.ice_weakness,
      lightning_weakness: weaknesses.lightning_weakness,
      holy_weakness: weaknesses.holy_weakness,
      poison_weakness: weaknesses.poison_weakness,
      minimumPushDamage: meta.minimumPushDamage !== undefined ? meta.minimumPushDamage : null,
      dark_weakness: weaknesses.dark_weakness,
      isUndead: meta.isUndead || false,
      isBoss: false
    },
    chineseMobName: nameCN
  };
}

/**
 * 處理單一 unreleased 檔案
 */
async function processUnreleasedFile(filePath) {
  const fileName = path.basename(filePath);
  console.log('\n=== Processing ' + fileName + ' ===\n');

  // 讀取檔案
  const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const { region, source, status, monsters } = fileData;

  console.log('Region: ' + region);
  console.log('Monsters: ' + monsters.length);

  // 處理每個怪物
  const updatedMonsters = [];
  let successCount = 0;
  let failCount = 0;

  for (var i = 0; i < monsters.length; i++) {
    var monster = monsters[i];
    try {
      var apiData = await fetchMobData(monster.id);

      if (apiData) {
        var mobInfo = transformToMobInfo(apiData, monster.nameCN);
        updatedMonsters.push(mobInfo);
        successCount++;
        console.log('  OK: ' + monster.id + ' (' + monster.nameCN + ')');
      } else {
        failCount++;
      }

      // 避免 API 限流
      await new Promise(function(r) { setTimeout(r, 200); });
    } catch (err) {
      console.error('  ERROR ' + monster.id + ': ' + err.message);
      failCount++;
    }
  }

  console.log('\nResults: Success ' + successCount + ', Failed ' + failCount);

  // 寫回檔案
  if (updatedMonsters.length > 0) {
    const updatedFileData = {
      region: region,
      source: source,
      status: status,
      monsters: updatedMonsters
    };

    fs.writeFileSync(filePath, JSON.stringify(updatedFileData, null, 2));
    console.log('Updated: ' + filePath);
  }

  return { success: successCount, failed: failCount };
}

/**
 * 主函數
 */
async function main() {
  console.log('Updating unreleased mobs JSON files...\n');

  // 讀取所有 unreleased JSON 檔案
  const files = fs.readdirSync(UNRELEASED_DIR);
  const unreleasedFiles = files.filter(function(f) {
    return f.endsWith('-mobs.json');
  });

  console.log('Found ' + unreleasedFiles.length + ' unreleased files:');
  unreleasedFiles.forEach(function(f) { console.log('  - ' + f); });

  let totalSuccess = 0;
  let totalFailed = 0;

  // 處理每個檔案
  for (var i = 0; i < unreleasedFiles.length; i++) {
    var filePath = path.join(UNRELEASED_DIR, unreleasedFiles[i]);
    var result = await processUnreleasedFile(filePath);
    totalSuccess += result.success;
    totalFailed += result.failed;
  }

  console.log('\n=== Summary ===');
  console.log('Total Success: ' + totalSuccess);
  console.log('Total Failed: ' + totalFailed);
}

main().catch(function(err) { console.error(err); });
