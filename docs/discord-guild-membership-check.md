# Discord 伺服器成員資格檢查分析

> 分析日期：2024-12-27

## 現狀

目前專案的 Discord OAuth 實作：
- **Provider**：Supabase Auth (Discord)
- **Scopes**：Supabase 預設（`identify`, `email`）
- **Guild 檢查**：未實作

---

## 要檢查用戶是否在特定 Discord 伺服器，需要什麼？

### 方案 1：使用 OAuth Scopes（用戶授權）

**需要的 Scope**：`guilds`

**流程**：
```
用戶登入
    ↓
OAuth 請求 guilds scope
    ↓
呼叫 Discord API: GET /users/@me/guilds
    ↓
檢查回傳的 guild 列表是否包含目標伺服器 ID
```

**修改項目**：

| 項目 | 說明 |
|------|------|
| Supabase Dashboard | 新增 `guilds` scope |
| AuthContext.tsx | 可能需要調整 OAuth 選項 |
| 新增 API Route | 處理 guild 檢查邏輯 |
| 儲存 Access Token | 需要保存 Discord access token（目前 Supabase 未暴露） |

| 優點 | 缺點 |
|------|------|
| 無需 Bot，純 OAuth 流程 | 需要額外 scope，用戶可能拒絕 |
| 用戶授權後可直接查詢 | 只能看到用戶所在的伺服器，無法查詢用戶不在的伺服器 |
| 實作相對簡單 | Discord access token 管理複雜（過期、刷新） |
| 無需維護額外服務 | Supabase 不直接暴露 provider token，需額外處理 |

---

### 方案 2：使用 Discord Bot（推薦）

**需要的元件**：
1. Discord Bot（需加入目標伺服器）
2. Bot Token
3. 後端 API Route

**流程**：
```
用戶登入（現有流程不變）
    ↓
從 user_metadata 取得 Discord User ID
    ↓
後端使用 Bot Token 呼叫:
GET /guilds/{guild_id}/members/{user_id}
    ↓
成功 = 用戶在伺服器中
404 = 用戶不在伺服器中
```

**修改項目**：

| 項目 | 說明 |
|------|------|
| 建立 Discord Bot | Discord Developer Portal |
| Bot 加入目標伺服器 | 需要伺服器管理員權限 |
| 環境變數 | `DISCORD_BOT_TOKEN`, `DISCORD_GUILD_ID` |
| 新增 API Route | `/api/discord/check-membership` |
| 快取機制 | Redis 快取減少 API 呼叫 |

| 優點 | 缺點 |
|------|------|
| 不需要額外 OAuth scope | 需要建立和維護 Bot |
| 可查詢任何用戶（只要 Bot 在該伺服器） | Bot 必須被邀請到目標伺服器 |
| 更可靠，不依賴用戶 token | 需要處理 Bot Token 安全性 |
| 用戶登入體驗不變 | 需要伺服器管理員配合 |
| Token 不會過期（除非手動重置） | 多伺服器需要 Bot 分別加入 |

---

## 方案比較總結

| 項目 | OAuth Scope | Discord Bot |
|------|-------------|-------------|
| **實作難度** | 中 | 低 |
| **用戶體驗** | 需額外授權 | 不變 |
| **維護成本** | Token 刷新邏輯 | Bot 管理 |
| **可靠性** | 依賴用戶 token | 更可靠 |
| **推薦程度** | ⭐⭐ | ⭐⭐⭐⭐⭐ |

---

## 流量影響分析

### 新增的 API 呼叫

| 呼叫時機 | API 端點 | 頻率 |
|----------|----------|------|
| 用戶登入 | GET /guilds/{id}/members/{user_id} | 每次登入 1 次 |
| 頁面載入（若需即時驗證） | 同上 | 每次刷新 1 次 |
| 定期驗證（若需） | 同上 | 依設定 |

### Discord API Rate Limits

| 端點 | Rate Limit | 說明 |
|------|------------|------|
| GET /guilds/{id}/members/{user_id} | 5 次/秒 | 每個 Bot Token |
| GET /users/@me/guilds | 1 次/秒 | 每個 User Token |

### 流量成本估算

假設每日 1,000 次登入：

| 項目 | 無快取 | 有快取（5 分鐘 TTL） |
|------|--------|---------------------|
| Discord API 呼叫 | 1,000 次/天 | 100-200 次/天 |
| API Route 請求 | 1,000 次/天 | 1,000 次/天 |
| Redis 讀取 | 0 | 800-900 次/天 |
| Redis 寫入 | 0 | 100-200 次/天 |

### 對現有服務的影響

| 服務 | 影響 | 額外成本 |
|------|------|----------|
| Vercel | 新增 API Route 請求 | 免費額度內 |
| Supabase | 無直接影響 | 無 |
| Redis (Upstash) | 若使用快取，增加少量讀寫 | 免費額度內 |
| Discord API | 新增外部 API 呼叫 | 免費 |

---

## 建議實作方式

### 推薦：Bot + Redis 快取

```
用戶登入
    ↓
檢查 Redis 快取 (key: discord:member:{user_id}:{guild_id})
    ↓
├─ 有快取且未過期 → 直接回傳結果
└─ 無快取或過期 → 呼叫 Discord API
    ↓
更新 Redis 快取 (TTL: 5-30 分鐘)
    ↓
回傳結果
```

### 快取策略

| 項目 | 建議值 | 說明 |
|------|--------|------|
| TTL | 5-30 分鐘 | 根據即時性需求調整 |
| Key 格式 | `discord:member:{user_id}:{guild_id}` | 支援多伺服器 |
| 值格式 | `true` / `false` | 簡單布林值 |
| 失敗處理 | 不快取錯誤 | 避免錯誤結果被快取 |

---

## 需要的環境變數

```bash
# Discord Bot
DISCORD_BOT_TOKEN=<your-bot-token>
DISCORD_GUILD_ID=<target-server-id>

# 可選：多個伺服器
DISCORD_GUILD_IDS=id1,id2,id3
```

---

## 需建立的檔案

| 檔案 | 說明 |
|------|------|
| `src/app/api/discord/check-membership/route.ts` | 成員資格檢查 API |
| `src/lib/discord.ts` | Discord API 封裝 |
| `src/types/discord.ts` | Discord 相關類型定義 |

---

## 實作範例（參考）

### API Route

```typescript
// src/app/api/discord/check-membership/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { redis } from '@/lib/redis'

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID
const CACHE_TTL = 300 // 5 分鐘

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 從 user_metadata 取得 Discord User ID
  const discordUserId = user.user_metadata?.provider_id

  if (!discordUserId) {
    return NextResponse.json({ isMember: false })
  }

  // 檢查快取
  const cacheKey = `discord:member:${discordUserId}:${DISCORD_GUILD_ID}`
  const cached = await redis.get(cacheKey)

  if (cached !== null) {
    return NextResponse.json({ isMember: cached === 'true' })
  }

  // 呼叫 Discord API
  const response = await fetch(
    `https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/members/${discordUserId}`,
    {
      headers: {
        Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
      },
    }
  )

  const isMember = response.ok

  // 更新快取
  await redis.set(cacheKey, isMember.toString(), { ex: CACHE_TTL })

  return NextResponse.json({ isMember })
}
```

---

## Discord Bot 建立步驟

1. 前往 [Discord Developer Portal](https://discord.com/developers/applications)
2. 點擊「New Application」建立應用
3. 進入「Bot」頁籤，點擊「Add Bot」
4. 複製 Bot Token（注意保密）
5. 在「OAuth2 > URL Generator」選擇：
   - Scopes: `bot`
   - Bot Permissions: 無需額外權限（只讀取成員資訊）
6. 使用產生的 URL 邀請 Bot 到目標伺服器

---

## 安全注意事項

| 項目 | 建議 |
|------|------|
| Bot Token | 只存在環境變數，永不提交到 Git |
| API Route | 需要驗證用戶登入狀態 |
| Rate Limiting | 考慮加入 API rate limit 防止濫用 |
| 錯誤處理 | 不要暴露內部錯誤訊息給前端 |
