/**
 * Bot Detection 常數定義
 *
 * 包含 Bot User-Agent 黑名單、SEO 爬蟲白名單和 Rate Limit 預設配置
 */

/**
 * Bot User-Agent 黑名單
 *
 * 分類說明：
 * - 爬蟲工具：curl, wget, python-requests 等
 * - 無頭瀏覽器：headless, puppeteer, playwright 等
 * - 自動化工具：scrapy, axios, node-fetch 等
 * - 惡意工具：masscan, nmap, sqlmap 等
 * - 通用爬蟲：bot, crawler, spider, scraper
 */
export const BOT_USER_AGENTS = [
  // 爬蟲工具（高置信度）
  'curl',
  'wget',
  'python-requests',
  'java/',
  'go-http-client',
  'apache-httpclient',

  // 無頭瀏覽器（高置信度）
  'headless',
  'phantomjs',
  'selenium',
  'puppeteer',
  'playwright',

  // 自動化工具（中置信度）
  'scrapy',
  'aiohttp',
  'axios/',
  'got/',
  'node-fetch',
  'httpx/',
  'requests/',

  // 惡意工具（高置信度）
  'masscan',
  'nmap',
  'nikto',
  'sqlmap',
  'acunetix',
  'metasploit',

  // AI 訓練爬蟲（高置信度 - 2025 年流量激增）
  'gptbot', // OpenAI GPT 訓練（30% 網路流量）
  'claudebot', // Anthropic Claude 訓練（5.4% 流量）
  'google-extended', // Google Gemini AI 訓練
  'meta-externalagent', // Meta AI 訓練（19% 流量）
  'perplexitybot', // Perplexity AI
  'anthropic-ai', // Anthropic 舊版爬蟲
  'claude-web', // Anthropic 舊版爬蟲
  'cohere-ai', // Cohere AI 訓練
  'amazonbot', // Amazon AI 訓練
  'applebot-extended', // Apple AI 訓練（非一般 AppleBot）
  'ccbot', // Common Crawl（多家 AI 使用）
  'bytespider', // ByteDance AI 訓練
  'oai-searchbot', // OpenAI 搜尋索引
  'chatgpt-user', // ChatGPT 實時瀏覽

  // 通用爬蟲（中置信度）
  'bot',
  'crawler',
  'spider',
  'scraper',
  'scan',
] as const

/**
 * SEO 爬蟲白名單（必須保留，有利 SEO）
 *
 * 涵蓋主流搜尋引擎和社交媒體爬蟲：
 * - 搜尋引擎：Google, Bing, Baidu, DuckDuckGo, Yandex, Yahoo
 * - 社交媒體：Facebook, Twitter, LinkedIn, Discord
 * - 其他：Internet Archive
 */
export const SEO_CRAWLERS_WHITELIST = [
  // 主流搜尋引擎
  'googlebot',
  'bingbot',
  'baiduspider',
  'duckduckbot',
  'yandexbot',
  'slurp', // Yahoo

  // 社交媒體爬蟲
  'facebookexternalhit',
  'twitterbot',
  'linkedinbot',
  'discordbot',

  // 其他合法爬蟲
  'ia_archiver', // Internet Archive
] as const

/**
 * Rate Limit 預設配置
 *
 * 優化記錄（2025-11-03）：
 *
 * ## 階段 1：降低限制以減少 Redis 使用量
 * - GLOBAL: 60 → 40（-33%）
 * - PUBLIC_API: 50 → 30（-40%）
 * - TRENDING: 30 → 20（-33%）
 * - SEARCH: 40 → 30（-25%）
 * - AUTHENTICATED: 維持 100（信任認證用戶）
 *
 * ## 階段 2：策略分級（固定窗口 vs 滑動窗口）
 * - 根據 API 風險等級動態選擇限流算法
 * - 低風險：固定窗口（2 命令/請求，節省 Redis）
 * - 高風險：滑動窗口（1 命令/請求，更精確限流）
 * - 詳細配置見：src/lib/bot-detection/rate-limit-strategy.ts
 *
 * 預期節省：30-40% Redis commands
 */
export const DEFAULT_RATE_LIMITS = {
  // 全域預設限制（每小時）
  GLOBAL: {
    limit: 40, // 降低自 60（-33%）
    window: 3600, // 1 小時（秒）
  },

  // 公開 API 端點（寬鬆）
  PUBLIC_API: {
    limit: 30, // 降低自 50（-40%）
    window: 3600,
  },

  // 熱門端點（嚴格）
  TRENDING: {
    limit: 20, // 降低自 30（-33%）
    window: 3600,
  },

  // 搜尋端點（中等）
  SEARCH: {
    limit: 30, // 降低自 40（-25%）
    window: 3600,
  },

  // 需認證端點（寬鬆）
  AUTHENTICATED: {
    limit: 100, // 維持不變（信任認證用戶）
    window: 3600,
  },
} as const

/**
 * 行為檢測閾值
 */
export const BEHAVIOR_THRESHOLDS = {
  // 高頻訪問檢測（1 小時內）
  HIGH_FREQUENCY: {
    threshold: 50,
    window: 3600,
  },

  // 掃描行為檢測（1 分鐘內訪問不同端點）
  SCANNING: {
    threshold: 20,
    window: 60,
  },
} as const
