#!/usr/bin/env node
/**
 * Vercel 專案管理腳本
 *
 * 功能：
 * - pause: 暫停 Vercel 專案
 * - unpause: 恢復 Vercel 專案
 * - status: 查詢專案狀態
 *
 * 使用方式：
 * npm run vercel:pause
 * npm run vercel:unpause
 * npm run vercel:status
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// 手動載入 .env.local 環境變數
function loadEnv() {
  const envPath = path.join(process.cwd(), '.env.local');

  if (!fs.existsSync(envPath)) {
    return; // 檔案不存在，使用系統環境變數
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');

  lines.forEach((line) => {
    // 忽略註解和空行
    if (!line || line.trim().startsWith('#')) {
      return;
    }

    // 解析 KEY=VALUE 格式
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      // 只設定尚未設定的環境變數
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

// 載入環境變數
loadEnv();

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID;
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID; // 可選，如果是團隊專案

// 顏色輸出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function error(message) {
  log(`❌ 錯誤: ${message}`, 'red');
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function info(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// 驗證環境變數
function validateEnv() {
  if (!VERCEL_TOKEN) {
    error('缺少 VERCEL_TOKEN 環境變數');
    info('請在 .env.local 中設定 VERCEL_TOKEN');
    info('獲取方式: https://vercel.com/account/tokens');
    process.exit(1);
  }

  if (!VERCEL_PROJECT_ID) {
    error('缺少 VERCEL_PROJECT_ID 環境變數');
    info('請在 .env.local 中設定 VERCEL_PROJECT_ID');
    info('獲取方式: 前往專案 Settings → General → Project ID');
    process.exit(1);
  }
}

// 發送 HTTPS 請求
function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.vercel.com',
      path: path,
      method: method,
      headers: {
        'Authorization': `Bearer ${VERCEL_TOKEN}`,
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(jsonData);
          } else {
            reject(new Error(`API 錯誤 (${res.statusCode}): ${jsonData.error?.message || data}`));
          }
        } catch (e) {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({}); // 空回應也視為成功
          } else {
            reject(new Error(`解析回應失敗: ${e.message}`));
          }
        }
      });
    });

    req.on('error', (e) => {
      reject(new Error(`請求失敗: ${e.message}`));
    });

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

// 獲取專案資訊
async function getProjectInfo() {
  const teamParam = VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : '';
  const path = `/v9/projects/${VERCEL_PROJECT_ID}${teamParam}`;

  try {
    const data = await makeRequest('GET', path);
    return data;
  } catch (err) {
    throw new Error(`無法獲取專案資訊: ${err.message}`);
  }
}

// 暫停專案
async function pauseProject() {
  const teamParam = VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : '';
  const path = `/v1/projects/${VERCEL_PROJECT_ID}/pause${teamParam}`;

  info('正在暫停專案...');

  try {
    await makeRequest('POST', path);
    success('專案已成功暫停！');
    info('網站現在無法訪問');
    info('執行 npm run vercel:unpause 可恢復專案');
  } catch (err) {
    error(`暫停失敗: ${err.message}`);
    process.exit(1);
  }
}

// 恢復專案
async function unpauseProject() {
  const teamParam = VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : '';
  const path = `/v1/projects/${VERCEL_PROJECT_ID}/pause${teamParam}`;

  info('正在恢復專案...');

  try {
    await makeRequest('DELETE', path);
    success('專案已成功恢復！');
    info('網站現在可以正常訪問');
  } catch (err) {
    error(`恢復失敗: ${err.message}`);
    process.exit(1);
  }
}

// 查詢專案狀態
async function checkStatus() {
  info('正在查詢專案狀態...\n');

  try {
    const project = await getProjectInfo();

    log('═══════════════════════════════════════', 'cyan');
    log(`📦 專案名稱: ${project.name}`, 'bright');
    log(`🆔 專案 ID: ${project.id}`, 'bright');
    log(`🔗 專案 URL: https://vercel.com/${project.accountId}/${project.name}`, 'bright');

    if (project.paused) {
      log(`⏸️  狀態: 已暫停`, 'yellow');
      info('執行 npm run vercel:unpause 可恢復專案');
    } else {
      log(`▶️  狀態: 運行中`, 'green');
      info('執行 npm run vercel:pause 可暫停專案');
    }

    if (project.framework) {
      log(`⚙️  框架: ${project.framework}`, 'bright');
    }

    if (project.latestDeployments && project.latestDeployments.length > 0) {
      const latest = project.latestDeployments[0];
      log(`🚀 最新部署: ${latest.url}`, 'bright');
      log(`📅 部署時間: ${new Date(latest.createdAt).toLocaleString('zh-TW')}`, 'bright');
    }

    log('═══════════════════════════════════════', 'cyan');
  } catch (err) {
    error(`查詢失敗: ${err.message}`);
    process.exit(1);
  }
}

// 主程式
async function main() {
  const command = process.argv[2];

  log('\n🔧 Vercel 專案管理工具\n', 'cyan');

  // 驗證環境變數
  validateEnv();

  switch (command) {
    case 'pause':
      await pauseProject();
      break;

    case 'unpause':
      await unpauseProject();
      break;

    case 'status':
      await checkStatus();
      break;

    default:
      error('無效的指令');
      info('可用指令:');
      console.log('  npm run vercel:pause    - 暫停專案');
      console.log('  npm run vercel:unpause  - 恢復專案');
      console.log('  npm run vercel:status   - 查詢狀態');
      process.exit(1);
  }

  console.log(''); // 空行
}

// 執行
main().catch((err) => {
  error(err.message);
  process.exit(1);
});
