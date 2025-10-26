# Discord 整合

> **最後更新**：2025-10-26

---

## 📚 導航

[← 上一篇:API設計](./03-API設計.md) | [🏠 返回目錄](./README.md) | [下一篇:安全與可靠性 →](./05-安全與可靠性.md)

---

## 目錄

1. [Discord Webhook 通知](#discord-webhook-通知)
2. [Discord Bot 伺服器整合](#discord-bot-伺服器整合)
3. [信譽系統](#信譽系統)

---

## Discord Webhook 通知

### Webhook 設計目標

當買家登記購買意向時，自動發送通知到賣家的 Discord 頻道，賣家可以即時收到訊息。

### Webhook 配置

**賣家設置流程**：
1. 在 Discord 創建 Webhook URL（伺服器設置 → 整合 → Webhook）
2. 在交易平台「個人設置」中填入 Webhook URL
3. 系統驗證 Webhook URL 有效性
4. 儲存到資料庫（可針對每個刊登設置不同 Webhook）

### Webhook Payload 格式

```typescript
// Discord Webhook Embed 格式
interface WebhookPayload {
  username: string
  avatar_url: string
  embeds: [
    {
      title: string
      description: string
      color: number
      fields: Array<{
        name: string
        value: string
        inline: boolean
      }>
      thumbnail: {
        url: string
      }
      footer: {
        text: string
      }
      timestamp: string
    }
  ]
}

// 範例
const payload: WebhookPayload = {
  username: "MapleStory 交易系統",
  avatar_url: "https://your-domain.com/logo.png",
  embeds: [
    {
      title: "🔔 新的購買意向",
      description: "有買家對您的刊登感興趣！",
      color: 0x5865F2, // Discord Blurple
      fields: [
        {
          name: "物品",
          value: "混沌卷軸 x 10",
          inline: true
        },
        {
          name: "價格",
          value: "500,000,000 楓幣",
          inline: true
        },
        {
          name: "買家",
          value: "User#1234",
          inline: false
        },
        {
          name: "買家備註",
          value: "今晚 8 點可以交易",
          inline: false
        }
      ],
      thumbnail: {
        url: "https://maplestory.io/api/item/2049100/icon"
      },
      footer: {
        text: "點擊查看詳情",
      },
      timestamp: new Date().toISOString()
    }
  ]
}
```

### Webhook 發送邏輯

```typescript
// src/lib/services/webhook-service.ts
export async function sendInterestNotification(
  webhookUrl: string,
  interest: Interest,
  listing: Listing,
  buyer: User
) {
  const payload: WebhookPayload = {
    username: "MapleStory 交易系統",
    avatar_url: "https://your-domain.com/logo.png",
    embeds: [
      {
        title: "🔔 新的購買意向",
        description: `**${buyer.discord_username}** 對您的刊登感興趣！`,
        color: 0x5865F2,
        fields: [
          {
            name: "物品",
            value: `${listing.item_name} x ${listing.quantity}`,
            inline: true
          },
          {
            name: "價格",
            value: `${listing.price.toLocaleString()} 楓幣`,
            inline: true
          },
          {
            name: "買家",
            value: `${buyer.discord_username}`,
            inline: false
          },
          {
            name: "買家信譽",
            value: getReputationBadge(buyer.reputation_score),
            inline: false
          },
          ...(interest.notes
            ? [
                {
                  name: "買家備註",
                  value: interest.notes,
                  inline: false
                }
              ]
            : [])
        ],
        footer: {
          text: "前往交易系統查看詳情",
        },
        timestamp: new Date().toISOString()
      }
    ]
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.statusText}`)
    }

    return { success: true }
  } catch (error) {
    console.error('Failed to send webhook:', error)
    return { success: false, error }
  }
}

function getReputationBadge(score: number): string {
  if (score >= 80) return '✅ 資深用戶 (80+)'
  if (score >= 50) return '🟢 可信用戶 (50-79)'
  if (score >= 20) return '🟡 普通用戶 (20-49)'
  return '🔴 新手用戶 (0-19)'
}
```

### Webhook 安全機制

#### 安全設計概覽

**核心安全原則**：
- ✅ **嚴格 URL 驗證** - 只允許 Discord 官方 Webhook URL
- ✅ **測試發送機制** - 儲存前驗證 Webhook 有效性
- ✅ **速率限制** - 每個 Webhook 每小時最多 30 條通知
- ✅ **失敗處理** - 連續失敗 5 次自動停用
- ✅ **用戶配額** - 每個用戶最多 5 個 Webhook

#### Webhook URL 驗證

**只允許 Discord 官方格式**：

```typescript
// src/lib/validators/webhook-validator.ts
const DISCORD_WEBHOOK_REGEX = /^https:\/\/discord\.com\/api\/webhooks\/\d+\/[\w-]+$/
const DISCORDAPP_WEBHOOK_REGEX = /^https:\/\/discordapp\.com\/api\/webhooks\/\d+\/[\w-]+$/

export function isValidDiscordWebhookUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false
  }

  // 只允許 Discord 官方域名
  return DISCORD_WEBHOOK_REGEX.test(url) || DISCORDAPP_WEBHOOK_REGEX.test(url)
}

export function validateWebhookUrl(url: string): { valid: boolean; error?: string } {
  // 1. 基本格式驗證
  if (!isValidDiscordWebhookUrl(url)) {
    return {
      valid: false,
      error: '無效的 Discord Webhook URL 格式。請使用 Discord 官方 Webhook URL。'
    }
  }

  // 2. 長度限制
  if (url.length > 500) {
    return {
      valid: false,
      error: 'Webhook URL 長度過長。'
    }
  }

  return { valid: true }
}
```

#### 測試發送機制

**儲存前驗證 Webhook 有效性**：

```typescript
// src/lib/services/webhook-service.ts
export async function testWebhook(
  webhookUrl: string
): Promise<{ success: boolean; error?: string }> {
  // 1. 格式驗證
  const validation = validateWebhookUrl(webhookUrl)
  if (!validation.valid) {
    return { success: false, error: validation.error }
  }

  // 2. 發送測試訊息
  const testPayload = {
    username: "MapleStory 交易系統",
    content: "✅ Webhook 測試成功！您已成功設定通知。",
    embeds: [
      {
        title: "🔔 Webhook 測試",
        description: "這是一條測試訊息，用於驗證 Webhook 設定。",
        color: 0x57F287, // Green
        footer: {
          text: "MapleStory 交易系統"
        },
        timestamp: new Date().toISOString()
      }
    ]
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload),
      signal: AbortSignal.timeout(5000) // 5 秒超時
    })

    if (!response.ok) {
      const errorText = await response.text()

      // 根據 Discord 錯誤碼返回友好訊息
      if (response.status === 404) {
        return { success: false, error: 'Webhook 不存在或已被刪除。' }
      }
      if (response.status === 401) {
        return { success: false, error: 'Webhook URL 無效或權限不足。' }
      }
      if (response.status === 429) {
        return { success: false, error: 'Discord API 速率限制，請稍後再試。' }
      }

      return {
        success: false,
        error: `Webhook 測試失敗：${response.statusText}`
      }
    }

    return { success: true }
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return { success: false, error: 'Webhook 測試超時（5 秒）。' }
      }
      return { success: false, error: `網路錯誤：${error.message}` }
    }
    return { success: false, error: '未知錯誤。' }
  }
}
```

#### 速率限制實作

**每個 Webhook 每小時最多 30 條通知**：

```typescript
// src/lib/services/webhook-rate-limiter.ts
import { redis } from '@/lib/redis'

const WEBHOOK_RATE_LIMIT = 30 // 每小時 30 條
const WEBHOOK_RATE_WINDOW = 3600 // 1 小時

export async function checkWebhookRateLimit(
  webhookId: string
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  const key = `webhook:ratelimit:${webhookId}`

  const count = await redis.incr(key)

  if (count === 1) {
    // 第一次請求，設置過期時間
    await redis.expire(key, WEBHOOK_RATE_WINDOW)
  }

  const ttl = await redis.ttl(key)
  const resetAt = new Date(Date.now() + ttl * 1000)
  const remaining = Math.max(0, WEBHOOK_RATE_LIMIT - count)

  return {
    allowed: count <= WEBHOOK_RATE_LIMIT,
    remaining,
    resetAt
  }
}

// 使用範例
export async function sendInterestNotificationWithRateLimit(
  webhookId: string,
  webhookUrl: string,
  interest: Interest,
  listing: Listing,
  buyer: User
): Promise<{ success: boolean; error?: string }> {
  // 1. 檢查速率限制
  const rateLimit = await checkWebhookRateLimit(webhookId)

  if (!rateLimit.allowed) {
    return {
      success: false,
      error: `Webhook 速率限制已達上限（${WEBHOOK_RATE_LIMIT} 條/小時）。將於 ${rateLimit.resetAt.toLocaleString('zh-TW')} 重置。`
    }
  }

  // 2. 發送通知
  const result = await sendInterestNotification(webhookUrl, interest, listing, buyer)

  return result
}
```

#### 失敗處理與自動停用

**連續失敗 5 次自動停用 Webhook**：

```typescript
// Database Schema
interface WebhookStatus {
  webhook_id: string
  user_id: string
  webhook_url: string
  is_active: boolean
  consecutive_failures: number
  last_failure_at: Date | null
  last_success_at: Date | null
  total_sent: number
  total_failed: number
  created_at: Date
  updated_at: Date
}

// src/lib/services/webhook-failure-handler.ts
const MAX_CONSECUTIVE_FAILURES = 5

export async function handleWebhookFailure(
  webhookId: string
): Promise<{ disabled: boolean }> {
  const webhook = await supabase
    .from('webhooks')
    .select('*')
    .eq('id', webhookId)
    .single()

  if (!webhook.data) {
    throw new Error('Webhook not found')
  }

  const consecutiveFailures = (webhook.data.consecutive_failures || 0) + 1

  // 更新失敗次數
  const updates: Partial<WebhookStatus> = {
    consecutive_failures: consecutiveFailures,
    last_failure_at: new Date(),
    total_failed: (webhook.data.total_failed || 0) + 1,
    updated_at: new Date()
  }

  // 達到失敗上限，自動停用
  if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
    updates.is_active = false
  }

  await supabase
    .from('webhooks')
    .update(updates)
    .eq('id', webhookId)

  // 發送通知給用戶
  if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
    await notifyUserWebhookDisabled(webhook.data.user_id, webhook.data.webhook_url)
  }

  return { disabled: consecutiveFailures >= MAX_CONSECUTIVE_FAILURES }
}

export async function handleWebhookSuccess(webhookId: string): Promise<void> {
  await supabase
    .from('webhooks')
    .update({
      consecutive_failures: 0, // 重置失敗計數
      last_success_at: new Date(),
      total_sent: supabase.sql`total_sent + 1`,
      updated_at: new Date()
    })
    .eq('id', webhookId)
}

async function notifyUserWebhookDisabled(userId: string, webhookUrl: string): Promise<void> {
  // 實作：發送電子郵件或在系統內顯示通知
  // 告知用戶 Webhook 已被停用，需要重新測試並啟用
  console.log(`Webhook disabled for user ${userId}: ${webhookUrl}`)
}
```

#### 用戶配額管理

**每個用戶最多 5 個 Webhook**：

```typescript
// src/lib/services/webhook-quota.ts
const MAX_WEBHOOKS_PER_USER = 5

export async function checkUserWebhookQuota(
  userId: string
): Promise<{ allowed: boolean; current: number; limit: number }> {
  const { count } = await supabase
    .from('webhooks')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_active', true)

  const current = count || 0

  return {
    allowed: current < MAX_WEBHOOKS_PER_USER,
    current,
    limit: MAX_WEBHOOKS_PER_USER
  }
}

// API 端點使用範例
export async function createWebhook(
  userId: string,
  webhookUrl: string
): Promise<{ success: boolean; webhookId?: string; error?: string }> {
  // 1. 檢查用戶配額
  const quota = await checkUserWebhookQuota(userId)
  if (!quota.allowed) {
    return {
      success: false,
      error: `您已達到 Webhook 數量上限（${quota.limit} 個）。請刪除舊的 Webhook 後再新增。`
    }
  }

  // 2. 驗證 URL 格式
  const validation = validateWebhookUrl(webhookUrl)
  if (!validation.valid) {
    return { success: false, error: validation.error }
  }

  // 3. 測試 Webhook
  const testResult = await testWebhook(webhookUrl)
  if (!testResult.success) {
    return { success: false, error: testResult.error }
  }

  // 4. 儲存到資料庫
  const { data, error } = await supabase
    .from('webhooks')
    .insert({
      user_id: userId,
      webhook_url: webhookUrl,
      is_active: true,
      consecutive_failures: 0,
      total_sent: 0,
      total_failed: 0,
      created_at: new Date(),
      updated_at: new Date()
    })
    .select()
    .single()

  if (error) {
    return { success: false, error: '儲存 Webhook 失敗。' }
  }

  return { success: true, webhookId: data.id }
}
```

#### Webhook 資料庫 Schema

```sql
-- Webhook 配置表
CREATE TABLE webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  webhook_url TEXT NOT NULL CHECK (char_length(webhook_url) <= 500),

  -- 狀態管理
  is_active BOOLEAN DEFAULT true,
  consecutive_failures INT DEFAULT 0 CHECK (consecutive_failures >= 0),

  -- 時間戳記
  last_failure_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,

  -- 統計數據
  total_sent INT DEFAULT 0 CHECK (total_sent >= 0),
  total_failed INT DEFAULT 0 CHECK (total_failed >= 0),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT webhooks_user_quota CHECK (
    (SELECT COUNT(*) FROM webhooks WHERE user_id = webhooks.user_id AND is_active = true) <= 5
  )
);

-- 索引
CREATE INDEX idx_webhooks_user ON webhooks(user_id) WHERE is_active = true;
CREATE INDEX idx_webhooks_failures ON webhooks(consecutive_failures) WHERE consecutive_failures >= 3;

-- RLS 策略
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own webhooks"
  ON webhooks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own webhooks"
  ON webhooks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own webhooks"
  ON webhooks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own webhooks"
  ON webhooks FOR DELETE
  USING (auth.uid() = user_id);
```

---

## Discord Bot 伺服器整合

### Bot 功能概覽

Discord Bot 提供以下指令：
- `/verify` - 綁定遊戲角色到 Discord 帳號
- `/listings` - 查詢個人刊登
- `/market` - 搜尋市場物品
- `/stats` - 查看交易統計
- `/reputation` - 查看信譽分數

### Bot 架構

```typescript
// src/bot/index.ts
import { Client, GatewayIntentBits } from 'discord.js'

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
  ]
})

client.on('ready', () => {
  console.log(`Bot logged in as ${client.user?.tag}`)
})

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return

  const { commandName } = interaction

  switch (commandName) {
    case 'verify':
      await handleVerify(interaction)
      break
    case 'listings':
      await handleListings(interaction)
      break
    case 'market':
      await handleMarket(interaction)
      break
    case 'stats':
      await handleStats(interaction)
      break
    case 'reputation':
      await handleReputation(interaction)
      break
  }
})

client.login(process.env.DISCORD_BOT_TOKEN)
```

### Bot 部署

**⚠️ 重要提醒：Discord Bot 為可選功能**

Discord Bot 提供便利的 Discord 內查詢功能，但**不是必要元件**。若預算有限，可暫時不部署 Bot，僅保留 Web 介面和 Webhook 通知功能。

**選項 1：Render（推薦免費方案）**
- **免費層**：750 小時/月（可持續運行 ~31 天）
- 自動從 GitHub 部署
- 支援環境變數管理
- **適合**：個人專案、低流量應用

**選項 2：Railway（付費為主）**
- ❌ **免費層限制**：$5 免費額度 ≈ 20.8 天（非持續月費）
- ⚠️ **不推薦免費版**：每月會用完額度，需升級付費方案
- **付費版**：$5/月起（適合商業用途）

**選項 3：不部署 Bot（推薦起步階段）**
- 💡 **最經濟方案**：完全免費
- 用戶透過 Web 介面完成所有操作
- 保留 Webhook 通知功能（仍可接收即時通知）
- **後續擴展**：待用戶增長後再考慮部署 Bot

**部署建議**：
- 🎯 **起步階段**：不部署 Bot，專注 Web 功能
- 📈 **成長期**（100+ 活躍用戶）：部署到 Render 免費版
- 💰 **成熟期**（500+ 活躍用戶）：升級 Railway 付費版或自架伺服器

---

## 信譽系統

### 信譽評分機制

**評分範圍**：0-100 分

**評分計算**：

```typescript
function calculateReputationScore(profile: DiscordProfile): number {
  let score = 0

  // 1. Discord 帳號年齡（最高 50 分）
  const accountAge = calculateAccountAge(profile.account_created_at)
  if (accountAge >= 365 * 3) score += 50        // 3年+ → 50分
  else if (accountAge >= 365 * 2) score += 40   // 2年+ → 40分
  else if (accountAge >= 365) score += 30       // 1年+ → 30分
  else if (accountAge >= 180) score += 20       // 半年+ → 20分
  else if (accountAge >= 90) score += 10        // 3個月+ → 10分
  else score += 5                               // < 3個月 → 5分

  // 2. Discord 官方驗證（+15 分）
  if (profile.verified) score += 15

  // 3. 伺服器成員（+20 分）
  if (profile.server_member_since) {
    const memberAge = calculateMemberAge(profile.server_member_since)
    if (memberAge >= 180) score += 20           // 半年+ → 20分
    else if (memberAge >= 90) score += 15       // 3個月+ → 15分
    else if (memberAge >= 30) score += 10       // 1個月+ → 10分
    else score += 5                             // < 1個月 → 5分
  }

  // 4. 伺服器角色（+15 分）
  if (profile.server_roles && profile.server_roles.length > 0) {
    score += 15
  }

  return Math.min(score, 100) // 上限 100 分
}

function calculateAccountAge(createdAt: Date): number {
  const now = new Date()
  const created = new Date(createdAt)
  return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
}
```

### 信譽等級

| 分數範圍 | 等級 | 圖示 | 說明 |
|---------|-----|-----|------|
| 80-100 | 資深用戶 | ✅ | Discord 帳號 2 年以上 + 伺服器成員 + 驗證 |
| 50-79 | 可信用戶 | 🟢 | Discord 帳號 1 年以上或伺服器成員 |
| 20-49 | 普通用戶 | 🟡 | Discord 帳號 3 個月以上 |
| 0-19 | 新手用戶 | 🔴 | Discord 帳號較新 |

### 系統限制與說明

**⚠️ 重要限制**：

1. **無法防止帳號轉讓**
   - Discord 帳號可被買賣或轉讓
   - 老帳號不等於可信用戶
   - **緩解方案**：結合交易歷史、舉報系統綜合評估

2. **伺服器成員功能需 guilds.members.read**
   - 需要額外 OAuth scope，增加用戶授權摩擦
   - 實作較複雜（需 Discord Bot + Guild 權限）
   - **建議**：v1.0 版本暫不實作，僅使用帳號年齡評分

3. **無法檢測虛假信譽**
   - 惡意用戶可用老帳號進行詐騙
   - 信譽系統只是參考指標，非絕對保證
   - **緩解方案**：提醒用戶謹慎交易、保留證據

**當前實作建議**（v1.0 簡化版本）：

```typescript
// 簡化版信譽計算（僅使用 identify scope 可獲取的資料）
function calculateReputationScore(profile: DiscordProfile): number {
  let score = 0

  // 1. Discord 帳號年齡（最高 70 分）
  const accountAge = calculateAccountAge(profile.account_created_at)
  if (accountAge >= 365 * 3) score += 70        // 3年+ → 70分
  else if (accountAge >= 365 * 2) score += 55   // 2年+ → 55分
  else if (accountAge >= 365) score += 40       // 1年+ → 40分
  else if (accountAge >= 180) score += 25       // 半年+ → 25分
  else if (accountAge >= 90) score += 15        // 3個月+ → 15分
  else score += 5                               // < 3個月 → 5分

  // 2. Discord 官方驗證（+30 分）
  if (profile.verified) score += 30

  return Math.min(score, 100) // 上限 100 分
}
```

**簡化版信譽等級**：

| 分數範圍 | 等級 | 說明 |
|---------|-----|------|
| 70-100 | 資深用戶 | Discord 帳號 2+ 年且官方驗證 |
| 40-69 | 可信用戶 | Discord 帳號 1+ 年 |
| 15-39 | 普通用戶 | Discord 帳號 3+ 個月 |
| 0-14 | 新手用戶 | Discord 帳號較新 |

### 未來增強建議

**階段 2：交易歷史整合**（待系統運行後實作）

```typescript
// 整合平台內交易歷史
function calculateEnhancedReputation(userId: string): number {
  const baseScore = calculateReputationScore(profile)

  // 加入交易歷史評分（最高 +20 分）
  const completedTrades = getCompletedTrades(userId)
  const tradeScore = Math.min(completedTrades.length * 2, 20)

  // 扣除負評分數
  const reports = getUserReports(userId)
  const penaltyScore = reports.length * 10

  return Math.max(0, Math.min(baseScore + tradeScore - penaltyScore, 100))
}
```

**階段 3：社群評價系統**（長期規劃）

- 允許交易雙方互相評價
- 計算「好評率」作為信譽指標
- 防作弊機制：只有完成交易的雙方可評價

**階段 4：外部信譽來源**（可選）

- 整合其他交易平台信譽（如 Reddit karma）
- 連結 Steam、PSN 等遊戲帳號
- 提供多元化信譽驗證

---


---

## 📚 導航

[← 上一篇:API設計](./03-API設計.md) | [🏠 返回目錄](./README.md) | [下一篇:安全與可靠性 →](./05-安全與可靠性.md)
