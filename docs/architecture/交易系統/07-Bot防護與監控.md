# Bot 防護與監控

> **最後更新**：2025-10-26

---

## 📚 導航

[← 上一篇:效能分析與成本](./06-效能分析與成本.md) | [🏠 返回目錄](./README.md) | [下一篇:實作路線圖 →](./08-實作路線圖.md)

---

## Bot Detection 實作方案

### 設計目標

有效過濾 60-70% Bot 流量，將 Redis 使用量從 10,668 命令/天降至 5,000-6,000 命令/天。

### 階段 1：基礎 User-Agent 過濾（1 週內實作）

#### 實作策略

**黑名單過濾**：

```typescript
// src/lib/middleware/bot-detection.ts
const BOT_USER_AGENTS = [
  // 爬蟲工具
  'curl', 'wget', 'python-requests', 'java', 'go-http-client',

  // 無頭瀏覽器
  'headless', 'phantomjs', 'selenium', 'puppeteer',

  // 自動化工具
  'scrapy', 'aiohttp', 'axios', 'got', 'node-fetch',

  // 惡意工具
  'masscan', 'nmap', 'nikto', 'sqlmap',
]

const SEO_CRAWLERS_WHITELIST = [
  'googlebot', 'bingbot', 'baiduspider', 'duckduckbot',
  'yandexbot', 'slurp', 'ia_archiver'
]

export function isBotUserAgent(userAgent: string | null): boolean {
  // 1. 無 User-Agent → 100% Bot
  if (!userAgent) return true

  const ua = userAgent.toLowerCase()

  // 2. SEO 爬蟲白名單 → 允許
  if (SEO_CRAWLERS_WHITELIST.some(bot => ua.includes(bot))) {
    return false
  }

  // 3. 黑名單檢查 → 拒絕
  if (BOT_USER_AGENTS.some(bot => ua.includes(bot))) {
    return true
  }

  // 4. 正常瀏覽器檢查
  const browserPatterns = [
    'mozilla', 'chrome', 'safari', 'firefox', 'edge', 'opera'
  ]
  const hasBrowserPattern = browserPatterns.some(pattern => ua.includes(pattern))

  // 沒有任何瀏覽器特徵 → 疑似 Bot
  return !hasBrowserPattern
}
```

**Middleware 整合**：

```typescript
// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { isBotUserAgent } from '@/lib/middleware/bot-detection'

export function middleware(request: NextRequest) {
  const userAgent = request.headers.get('user-agent')

  // Bot Detection
  if (isBotUserAgent(userAgent)) {
    // 記錄 Bot 請求（可選）
    console.log('[Bot Detected]', {
      path: request.nextUrl.pathname,
      userAgent,
      ip: request.ip
    })

    // 返回 403 Forbidden
    return new NextResponse(
      JSON.stringify({
        error: 'Bot detected',
        message: 'Automated requests are not allowed'
      }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/api/:path*',  // 所有 API 端點（Modal 模式無需保護頁面路由）
  ]
}
```

**預期效果**：
- 減少 40-50% Bot 流量
- Redis 降至 7,000-8,000 命令/天（70-80% 使用率）
- ⚠️ 臨時緩解，仍需後續優化

---

### 階段 2：行為模式檢測（2-4 週內實作）

#### 高頻訪問檢測

```typescript
// src/lib/services/rate-limiter.ts
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export async function checkHighFrequencyAccess(
  identifier: string,  // IP 或 user_id
  endpoint: string,
  threshold: number = 50,  // 1 小時內最多 50 次
): Promise<boolean> {
  const key = `hf:${identifier}:${endpoint}`
  const window = 3600  // 1 小時

  const count = await redis.incr(key)

  if (count === 1) {
    await redis.expire(key, window)
  }

  // 超過閾值 → 判定為 Bot
  return count > threshold
}
```

**Middleware 整合**：

```typescript
export async function middleware(request: NextRequest) {
  const userAgent = request.headers.get('user-agent')
  const ip = request.ip || 'unknown'

  // 階段 1：User-Agent 過濾
  if (isBotUserAgent(userAgent)) {
    return new NextResponse('Bot detected', { status: 403 })
  }

  // 階段 2：高頻訪問檢測
  const isHighFrequency = await checkHighFrequencyAccess(
    ip,
    request.nextUrl.pathname,
    50  // 1 小時 50 次
  )

  if (isHighFrequency) {
    return new NextResponse(
      JSON.stringify({
        error: 'Too many requests',
        message: 'Please slow down your requests'
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': '3600'  // 1 小時後重試
        }
      }
    )
  }

  return NextResponse.next()
}
```

#### 掃描行為檢測

```typescript
// 檢測短時間內訪問多個不同端點
export async function checkScanningBehavior(
  ip: string,
  threshold: number = 20  // 1 分鐘內訪問 20 個不同端點
): Promise<boolean> {
  const key = `scan:${ip}`
  const window = 60  // 1 分鐘

  // 使用 Redis Set 記錄訪問的不同端點
  const count = await redis.scard(key)

  if (count > threshold) {
    return true  // 判定為掃描行為
  }

  // 記錄當前端點
  await redis.sadd(key, request.nextUrl.pathname)
  await redis.expire(key, window)

  return false
}
```

**預期效果**：
- 減少 60-70% Bot 流量
- Redis 降至 5,000-6,000 命令/天（50-60% 使用率）
- ✅ 可穩定運行在免費版

---

### 階段 3：IP 信譽評分系統（1-2 個月內實作）

#### 設計架構

```sql
-- IP 信譽表
CREATE TABLE ip_reputation (
  ip_address INET PRIMARY KEY,
  reputation_score INTEGER DEFAULT 50 CHECK (reputation_score >= 0 AND reputation_score <= 100),
  total_requests INT DEFAULT 0,
  bot_requests INT DEFAULT 0,
  blocked_count INT DEFAULT 0,
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_low_reputation ON ip_reputation(reputation_score)
  WHERE reputation_score < 30;
```

#### 信譽計算邏輯

```typescript
// src/lib/services/ip-reputation.ts
export async function calculateIPReputation(ip: string): Promise<number> {
  const data = await supabase
    .from('ip_reputation')
    .select('*')
    .eq('ip_address', ip)
    .single()

  if (!data) {
    return 50  // 新 IP 預設 50 分
  }

  let score = 50

  // 1. Bot 請求比例扣分
  const botRatio = data.bot_requests / data.total_requests
  if (botRatio > 0.8) score -= 30
  else if (botRatio > 0.5) score -= 20
  else if (botRatio > 0.3) score -= 10

  // 2. 被封鎖次數扣分
  score -= Math.min(data.blocked_count * 2, 30)

  // 3. 活躍時間加分（長期活躍用戶）
  const daysSinceCreated = Math.floor(
    (Date.now() - new Date(data.created_at).getTime()) / (1000 * 60 * 60 * 24)
  )
  if (daysSinceCreated > 90) score += 10
  else if (daysSinceCreated > 30) score += 5

  // 4. 最近活躍加分
  const daysSinceLastSeen = Math.floor(
    (Date.now() - new Date(data.last_seen_at).getTime()) / (1000 * 60 * 60 * 24)
  )
  if (daysSinceLastSeen < 7) score += 5

  return Math.max(0, Math.min(100, score))
}
```

#### 基於信譽的限流策略

```typescript
export async function getRateLimitByReputation(
  ip: string
): Promise<{ limit: number; window: number }> {
  const reputation = await calculateIPReputation(ip)

  if (reputation >= 80) {
    // 高信譽 IP：寬鬆限制
    return { limit: 100, window: 3600 }  // 100 次/小時
  } else if (reputation >= 50) {
    // 中等信譽 IP：正常限制
    return { limit: 60, window: 3600 }  // 60 次/小時
  } else if (reputation >= 30) {
    // 低信譽 IP：嚴格限制
    return { limit: 20, window: 3600 }  // 20 次/小時
  } else {
    // 極低信譽 IP：直接封鎖
    return { limit: 0, window: 3600 }  // 禁止訪問
  }
}
```

**預期效果**：
- 減少 70-80% Bot 流量
- Redis 降至 4,000-5,000 命令/天（40-50% 使用率）
- ✅ 免費版長期穩定

---

### 階段 4：Cloudflare Bot Protection（可選）

**優點**：
- 免費版可用（有限制）
- 減少 85-95% Bot 流量
- 無需自行維護

**缺點**：
- 免費版有限制（每月 100,000 請求）
- 需要將域名 DNS 託管到 Cloudflare
- 可能影響 SEO 爬蟲

**實作方式**：
1. 註冊 Cloudflare 帳號
2. 將域名 DNS 託管到 Cloudflare
3. 啟用「Bot Fight Mode」（免費版）
4. 配置規則白名單（允許 SEO 爬蟲）

**預期效果**：
- 減少 85-95% Bot 流量
- Redis 降至 2,000-3,000 命令/天（20-30% 使用率）
- ✅ 理想狀態

---

### 實作優先級建議

**立即執行（P0）**：
1. ✅ 階段 1：基礎 User-Agent 過濾（1 週）
   - 最快見效，投資報酬率高
   - 可立即減少 40-50% Bot

**短期執行（P1）**：
2. ✅ 階段 2：行為模式檢測（2-4 週）
   - 高頻訪問 + 掃描行為檢測
   - 可達 60-70% Bot 過濾率

**中期執行（P2）**：
3. ⏸️ 階段 3：IP 信譽評分（1-2 個月）
   - 長期優化方案
   - 需要累積數據

**可選執行（P3）**：
4. ⏸️ 階段 4：Cloudflare（可選）
   - 終極解決方案
   - 需要評估 DNS 遷移成本

### 監控指標

**關鍵指標**：

```typescript
// 每日監控
const metrics = {
  // Bot 流量
  totalRequests: 6334,          // 總請求數
  botRequests: 3800,            // Bot 請求數
  botRatio: 60,                 // Bot 比例（%）

  // Redis 使用量
  redisCommands: 10668,         // Redis 命令數/天
  redisUsageRate: 107,          // 使用率（%）

  // 過濾效果
  filteredBots: 2500,           // 已過濾 Bot 數
  filterRate: 65,               // 過濾率（%）
}

// 告警閾值
const alerts = {
  botRatioWarning: 60,          // Bot 比例 > 60% 告警
  redisUsageWarning: 80,        // Redis 使用率 > 80% 告警
  filterRateWarning: 50,        // 過濾率 < 50% 告警
}
```

**監控儀表板**（建議實作）：
- 實時 Bot 流量比例
- Redis 使用率趨勢
- 各階段 Bot Detection 效果
- IP 信譽分布
- 被封鎖的 Bot 列表

### 總結

**核心策略**：
- 🔴 **階段 1 是必須**：基礎 User-Agent 過濾（1 週內實作）
- 🟡 **階段 2 是關鍵**：行為模式檢測（2-4 週內實作）
- 🟢 **階段 3 是優化**：IP 信譽評分（1-2 個月內實作）
- ⚪ **階段 4 是可選**：Cloudflare（評估後決定）

**預期成果**：
```
當前狀態：10,668 命令/天（107% 超標）
  ↓
階段 1：7,000-8,000 命令/天（70-80%）
  ↓
階段 2：5,000-6,000 命令/天（50-60%）✅ 目標達成
  ↓
階段 3：4,000-5,000 命令/天（40-50%）
  ↓
階段 4：2,000-3,000 命令/天（20-30%）
```

---

## 監控與維護

### 關鍵監控指標

#### 1. 系統健康指標

**Redis 監控**：
```typescript
// src/lib/monitoring/redis-monitor.ts
import { redis } from '@/lib/redis'

interface RedisMetrics {
  daily_commands: number
  daily_limit: number
  usage_percentage: number
  memory_used_mb: number
  memory_limit_mb: number
  hit_rate: number
  status: 'healthy' | 'warning' | 'critical'
}

export async function getRedisMetrics(): Promise<RedisMetrics> {
  // 1. 獲取每日命令數
  const dailyCommands = await redis.get<number>('quota:redis:daily_commands') || 0
  const dailyLimit = 10000
  const usagePercentage = (dailyCommands / dailyLimit) * 100

  // 2. 獲取記憶體使用（需要 Redis INFO 命令支援）
  // Upstash Redis 免費版可能不支援，這裡用估算
  const memoryUsedMb = 0.5 // 估算值
  const memoryLimitMb = 256

  // 3. 命中率估算
  const hitRate = 0.95 // 95% 命中率為健康狀態

  // 4. 狀態評估
  let status: RedisMetrics['status']
  if (usagePercentage >= 95) status = 'critical'
  else if (usagePercentage >= 80) status = 'warning'
  else status = 'healthy'

  return {
    daily_commands: dailyCommands,
    daily_limit: dailyLimit,
    usage_percentage: usagePercentage,
    memory_used_mb: memoryUsedMb,
    memory_limit_mb: memoryLimitMb,
    hit_rate: hitRate,
    status
  }
}
```

**Supabase 監控**：
```typescript
// src/lib/monitoring/supabase-monitor.ts
interface SupabaseMetrics {
  active_users_today: number
  estimated_mau: number
  mau_limit: number
  database_size_mb: number
  database_limit_mb: number
  api_requests_today: number
  status: 'healthy' | 'warning' | 'critical'
}

export async function getSupabaseMetrics(): Promise<SupabaseMetrics> {
  // 1. 獲取今日活躍用戶
  const { count: activeUsersToday } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .gte('last_login_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

  // 2. 估算 MAU（基於日活率 30%）
  const estimatedMau = Math.floor((activeUsersToday || 0) / 0.3)
  const mauLimit = 50000

  // 3. 資料庫大小估算
  const { count: totalUsers } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })

  const { count: totalListings } = await supabase
    .from('listings')
    .select('*', { count: 'exact', head: true })

  // 假設每個用戶 1KB，每個刊登 2KB
  const databaseSizeMb = ((totalUsers || 0) * 1 + (totalListings || 0) * 2) / 1024
  const databaseLimitMb = 500

  // 4. 狀態評估
  const mauPercentage = (estimatedMau / mauLimit) * 100
  const storagePercentage = (databaseSizeMb / databaseLimitMb) * 100

  let status: SupabaseMetrics['status']
  if (mauPercentage >= 95 || storagePercentage >= 95) status = 'critical'
  else if (mauPercentage >= 80 || storagePercentage >= 80) status = 'warning'
  else status = 'healthy'

  return {
    active_users_today: activeUsersToday || 0,
    estimated_mau: estimatedMau,
    mau_limit: mauLimit,
    database_size_mb: databaseSizeMb,
    database_limit_mb: databaseLimitMb,
    api_requests_today: 0, // 需要從 Supabase Dashboard 獲取
    status
  }
}
```

#### 2. 業務指標監控

```typescript
// src/lib/monitoring/business-metrics.ts
interface BusinessMetrics {
  // 用戶活躍度
  dau: number  // Daily Active Users
  wau: number  // Weekly Active Users
  mau: number  // Monthly Active Users
  retention_rate_7d: number  // 7 天留存率
  retention_rate_30d: number  // 30 天留存率

  // 交易指標
  total_listings: number
  active_listings: number
  sold_listings_today: number
  purchase_intents_today: number
  conversion_rate: number  // 意向 → 成交轉換率

  // Webhook 指標
  webhook_sent_today: number
  webhook_failed_today: number
  webhook_success_rate: number
}

export async function getBusinessMetrics(): Promise<BusinessMetrics> {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
  const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

  // DAU/WAU/MAU
  const { count: dau } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .gte('last_login_at', today.toISOString())

  const { count: wau } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .gte('last_login_at', sevenDaysAgo.toISOString())

  const { count: mau } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .gte('last_login_at', thirtyDaysAgo.toISOString())

  // 刊登數據
  const { count: totalListings } = await supabase
    .from('listings')
    .select('*', { count: 'exact', head: true })

  const { count: activeListings } = await supabase
    .from('listings')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')

  const { count: soldListingsToday } = await supabase
    .from('listings')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'sold')
    .gte('updated_at', today.toISOString())

  // 購買意向數據
  const { count: purchaseIntentsToday } = await supabase
    .from('interests')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', today.toISOString())

  return {
    dau: dau || 0,
    wau: wau || 0,
    mau: mau || 0,
    retention_rate_7d: 0, // 需要額外計算
    retention_rate_30d: 0,
    total_listings: totalListings || 0,
    active_listings: activeListings || 0,
    sold_listings_today: soldListingsToday || 0,
    purchase_intents_today: purchaseIntentsToday || 0,
    conversion_rate: 0, // 需要額外計算
    webhook_sent_today: 0, // 從 webhooks 表統計
    webhook_failed_today: 0,
    webhook_success_rate: 0
  }
}
```

### 警報機制

#### Discord Webhook 警報

```typescript
// src/lib/monitoring/alerts.ts
interface Alert {
  level: 'info' | 'warning' | 'critical'
  service: string
  metric: string
  message: string
  current_value: number | string
  threshold: number | string
  timestamp: Date
}

export async function sendAlert(alert: Alert): Promise<void> {
  const webhookUrl = process.env.ADMIN_ALERT_WEBHOOK_URL
  if (!webhookUrl) return

  const colorMap = {
    info: 0x3498db,      // 藍色
    warning: 0xf39c12,   // 黃色
    critical: 0xe74c3c   // 紅色
  }

  const payload = {
    username: "系統監控警報",
    embeds: [
      {
        title: `${alert.level === 'critical' ? '🔴' : alert.level === 'warning' ? '⚠️' : 'ℹ️'} ${alert.service} 警報`,
        description: alert.message,
        color: colorMap[alert.level],
        fields: [
          {
            name: "指標",
            value: alert.metric,
            inline: true
          },
          {
            name: "當前值",
            value: String(alert.current_value),
            inline: true
          },
          {
            name: "閾值",
            value: String(alert.threshold),
            inline: true
          }
        ],
        footer: {
          text: "MapleStory 交易系統監控"
        },
        timestamp: alert.timestamp.toISOString()
      }
    ]
  }

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
}

// 自動檢查並發送警報
export async function checkAndAlert(): Promise<void> {
  const alerts: Alert[] = []

  // 1. Redis 檢查
  const redisMetrics = await getRedisMetrics()
  if (redisMetrics.status === 'critical') {
    alerts.push({
      level: 'critical',
      service: 'Upstash Redis',
      metric: '每日命令數',
      message: `Redis 命令數已達 ${redisMetrics.usage_percentage.toFixed(1)}%，超過危險閾值 95%！`,
      current_value: `${redisMetrics.daily_commands} 命令`,
      threshold: `${redisMetrics.daily_limit} 命令/天`,
      timestamp: new Date()
    })
  } else if (redisMetrics.status === 'warning') {
    alerts.push({
      level: 'warning',
      service: 'Upstash Redis',
      metric: '每日命令數',
      message: `Redis 命令數已達 ${redisMetrics.usage_percentage.toFixed(1)}%，超過警報閾值 80%。`,
      current_value: `${redisMetrics.daily_commands} 命令`,
      threshold: `${redisMetrics.daily_limit} 命令/天`,
      timestamp: new Date()
    })
  }

  // 2. Supabase 檢查
  const supabaseMetrics = await getSupabaseMetrics()
  if (supabaseMetrics.status !== 'healthy') {
    alerts.push({
      level: supabaseMetrics.status === 'critical' ? 'critical' : 'warning',
      service: 'Supabase',
      metric: 'MAU / 儲存空間',
      message: `Supabase 使用率異常。MAU: ${supabaseMetrics.estimated_mau}/${supabaseMetrics.mau_limit}, 儲存: ${supabaseMetrics.database_size_mb.toFixed(1)}/${supabaseMetrics.database_limit_mb} MB`,
      current_value: `${supabaseMetrics.estimated_mau} MAU`,
      threshold: `${supabaseMetrics.mau_limit} MAU`,
      timestamp: new Date()
    })
  }

  // 3. 發送所有警報
  for (const alert of alerts) {
    await sendAlert(alert)
  }
}
```

### 定期維護任務

#### Vercel Cron Jobs 配置

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/daily-metrics",
      "schedule": "0 0 * * *"
    },
    {
      "path": "/api/cron/hourly-check",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/cron/cleanup-sessions",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/cron/cleanup-expired-listings",
      "schedule": "0 3 * * *"
    }
  ]
}
```

#### 每日維護任務

```typescript
// src/app/api/cron/daily-metrics/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getRedisMetrics, getSupabaseMetrics, getBusinessMetrics } from '@/lib/monitoring'

export async function GET(request: NextRequest) {
  // 驗證 Cron Secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  // 1. 收集所有指標
  const [redis, supabase, business] = await Promise.all([
    getRedisMetrics(),
    getSupabaseMetrics(),
    getBusinessMetrics()
  ])

  // 2. 儲存到資料庫（用於歷史追蹤）
  await supabase.from('daily_metrics').insert({
    date: new Date().toISOString().split('T')[0],
    redis_commands: redis.daily_commands,
    redis_usage_percentage: redis.usage_percentage,
    mau: supabase.estimated_mau,
    database_size_mb: supabase.database_size_mb,
    dau: business.dau,
    active_listings: business.active_listings,
    purchase_intents: business.purchase_intents_today,
    created_at: new Date()
  })

  // 3. 檢查並發送警報
  await checkAndAlert()

  return NextResponse.json({
    success: true,
    metrics: { redis, supabase, business }
  })
}
```

#### 每小時檢查任務

```typescript
// src/app/api/cron/hourly-check/route.ts
export async function GET(request: NextRequest) {
  // 驗證 Cron Secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  // 1. 檢查 Redis 配額
  const redisMetrics = await getRedisMetrics()
  if (redisMetrics.status === 'critical') {
    await sendAlert({
      level: 'critical',
      service: 'Upstash Redis',
      metric: '每日命令數',
      message: `⚠️ 緊急：Redis 命令數已超標！`,
      current_value: redisMetrics.daily_commands,
      threshold: redisMetrics.daily_limit,
      timestamp: new Date()
    })
  }

  // 2. 檢查異常流量
  const currentHourRequests = await redis.get<number>('requests:current_hour') || 0
  if (currentHourRequests > 10000) {
    await sendAlert({
      level: 'warning',
      service: '流量監控',
      metric: '每小時請求數',
      message: `⚠️ 異常流量：當前小時請求數異常高！可能遭受攻擊。`,
      current_value: currentHourRequests,
      threshold: 10000,
      timestamp: new Date()
    })
  }

  return NextResponse.json({ success: true })
}
```

#### 清理過期資料

```typescript
// src/app/api/cron/cleanup-expired-listings/route.ts
export async function GET(request: NextRequest) {
  // 驗證 Cron Secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  // 1. 刪除 30 天未更新的已售出刊登
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const { count: deletedListings } = await supabase
    .from('listings')
    .delete()
    .eq('status', 'sold')
    .lt('updated_at', thirtyDaysAgo.toISOString())

  // 2. 清理 90 天未登入的用戶（可選）
  // const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
  // await supabase
  //   .from('users')
  //   .delete()
  //   .lt('last_login_at', ninetyDaysAgo.toISOString())

  return NextResponse.json({
    success: true,
    deleted_listings: deletedListings || 0
  })
}
```

### 監控儀表板設計

#### 簡易儀表板 UI

```tsx
// src/app/admin/dashboard/page.tsx
'use client'

import { useEffect, useState } from 'react'

interface DashboardData {
  redis: RedisMetrics
  supabase: SupabaseMetrics
  business: BusinessMetrics
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchMetrics() {
      const response = await fetch('/api/admin/metrics')
      const result = await response.json()
      setData(result)
      setLoading(false)
    }

    fetchMetrics()
    const interval = setInterval(fetchMetrics, 60000) // 每分鐘更新

    return () => clearInterval(interval)
  }, [])

  if (loading || !data) return <div>載入中...</div>

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-3xl font-bold">系統監控儀表板</h1>

      {/* Redis 監控 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Upstash Redis</h2>
        <div className="space-y-2">
          <MetricBar
            label="每日命令數"
            current={data.redis.daily_commands}
            max={data.redis.daily_limit}
            status={data.redis.status}
          />
          <MetricBar
            label="記憶體使用"
            current={data.redis.memory_used_mb}
            max={data.redis.memory_limit_mb}
            unit="MB"
            status="healthy"
          />
        </div>
      </div>

      {/* Supabase 監控 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Supabase</h2>
        <div className="space-y-2">
          <MetricBar
            label="MAU"
            current={data.supabase.estimated_mau}
            max={data.supabase.mau_limit}
            status={data.supabase.status}
          />
          <MetricBar
            label="資料庫大小"
            current={data.supabase.database_size_mb}
            max={data.supabase.database_limit_mb}
            unit="MB"
            status={data.supabase.status}
          />
        </div>
      </div>

      {/* 業務指標 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">業務指標</h2>
        <div className="grid grid-cols-3 gap-4">
          <MetricCard label="DAU" value={data.business.dau} />
          <MetricCard label="MAU" value={data.business.mau} />
          <MetricCard label="活躍刊登" value={data.business.active_listings} />
          <MetricCard label="今日購買意向" value={data.business.purchase_intents_today} />
          <MetricCard label="今日成交" value={data.business.sold_listings_today} />
        </div>
      </div>
    </div>
  )
}

function MetricBar({ label, current, max, unit = '', status }: any) {
  const percentage = (current / max) * 100
  const color = status === 'critical' ? 'bg-red-500' : status === 'warning' ? 'bg-yellow-500' : 'bg-green-500'

  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-sm text-gray-600">
          {current.toLocaleString()} / {max.toLocaleString()} {unit} ({percentage.toFixed(1)}%)
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div className={`${color} h-2 rounded-full`} style={{ width: `${percentage}%` }}></div>
      </div>
    </div>
  )
}

function MetricCard({ label, value }: any) {
  return (
    <div className="bg-gray-50 rounded p-4">
      <div className="text-sm text-gray-600">{label}</div>
      <div className="text-2xl font-bold">{value.toLocaleString()}</div>
    </div>
  )
}
```

---


---

## 📚 導航

[← 上一篇:效能分析與成本](./06-效能分析與成本.md) | [🏠 返回目錄](./README.md) | [下一篇:實作路線圖 →](./08-實作路線圖.md)
