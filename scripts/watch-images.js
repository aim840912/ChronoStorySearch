const chokidar = require('chokidar')
const { execSync } = require('child_process')
const path = require('path')

/**
 * 圖片目錄監控腳本
 * 監控 public/images 目錄，自動更新圖片清單
 */

// ANSI 顏色碼
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
}

// 防抖動定時器
let debounceTimer = null
const DEBOUNCE_DELAY = 500 // 500ms

// 監控的目錄
const watchPaths = [
  path.join(__dirname, '../public/images/items'),
  path.join(__dirname, '../public/images/monsters'),
]

/**
 * 執行圖片清單生成
 */
function generateManifest() {
  try {
    console.log(`${colors.cyan}🔄 偵測到圖片變更，重新生成清單...${colors.reset}`)

    const scriptPath = path.join(__dirname, 'generate-image-manifest.js')
    execSync(`node "${scriptPath}"`, { stdio: 'inherit' })

    console.log(`${colors.green}✨ 圖片清單已更新！${colors.reset}\n`)
  } catch (error) {
    console.error(`${colors.yellow}⚠️  生成失敗:`, error.message, colors.reset)
  }
}

/**
 * 防抖動執行
 */
function debouncedGenerate() {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }

  debounceTimer = setTimeout(() => {
    generateManifest()
  }, DEBOUNCE_DELAY)
}

// 初始化監控
console.log(`${colors.bright}${colors.magenta}👀 圖片監控已啟動${colors.reset}\n`)
console.log(`${colors.blue}📁 監控目錄:${colors.reset}`)
watchPaths.forEach((p) => console.log(`   - ${p}`))
console.log(`\n${colors.cyan}等待圖片變更...${colors.reset}\n`)

// 創建監控器
const watcher = chokidar.watch(watchPaths, {
  ignored: /(^|[\/\\])\../, // 忽略隱藏檔案
  persistent: true,
  ignoreInitial: true, // 忽略初始掃描
  awaitWriteFinish: {
    stabilityThreshold: 100,
    pollInterval: 100,
  },
})

// 監聽事件
watcher
  .on('add', (filePath) => {
    if (path.extname(filePath) === '.png') {
      console.log(`${colors.green}+ 新增圖片:${colors.reset} ${path.basename(filePath)}`)
      debouncedGenerate()
    }
  })
  .on('unlink', (filePath) => {
    if (path.extname(filePath) === '.png') {
      console.log(`${colors.yellow}- 刪除圖片:${colors.reset} ${path.basename(filePath)}`)
      debouncedGenerate()
    }
  })
  .on('change', (filePath) => {
    if (path.extname(filePath) === '.png') {
      console.log(`${colors.blue}~ 修改圖片:${colors.reset} ${path.basename(filePath)}`)
      debouncedGenerate()
    }
  })
  .on('error', (error) => {
    console.error(`${colors.yellow}⚠️  監控錯誤:${colors.reset}`, error)
  })

// 處理程序退出
process.on('SIGINT', () => {
  console.log(`\n${colors.magenta}👋 圖片監控已停止${colors.reset}`)
  watcher.close()
  process.exit(0)
})
