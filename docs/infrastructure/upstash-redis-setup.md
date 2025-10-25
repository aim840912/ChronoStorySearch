# Upstash Redis 設定指南

本專案使用 **Upstash Redis** 作為 Session 管理、Rate Limiting 和 Bot Detection 的儲存後端。

---

## 🎯 為什麼選擇 Upstash Redis

- ✅ **Serverless 友善**：REST API 適合 Vercel Functions
- ✅ **免費額度充足**：10,000 commands/day（足夠小型專案使用）
- ✅ **零管理成本**：無需維護 Redis 伺服器
- ✅ **全球分布**：自動選擇最近的 region

---

## 📋 設定步驟

### 步驟 1：建立 Upstash Redis Database

1. **註冊 Upstash 帳號**
   - 前往 [Upstash Console](https://console.upstash.com)
   - 使用 GitHub/Google 登入（免費）

2. **建立 Redis Database**
   - 點擊 **Create Database**
   - 選擇設定：
     - **Name**: `maplestory-trading-system`
     - **Type**: Regional（免費）
     - **Region**: 選擇離 Vercel 部署區域最近的（建議 `us-east-1`）
     - **Eviction**: No Eviction（保留所有資料）
   - 點擊 **Create**

3. **取得連線資訊**
   - 在 Database 詳情頁面，找到 **REST API** 區塊
   - 複製以下資訊：
     - **UPSTASH_REDIS_REST_URL**
     - **UPSTASH_REDIS_REST_TOKEN**

### 步驟 2：設定環境變數

#### 本地開發（.env.local）

在 `.env.local` 新增以下環境變數：

```bash
# ============================================================
# Upstash Redis 設定（Session 管理、Rate Limiting、Bot Detection）
# ============================================================

# Redis REST API URL
UPSTASH_REDIS_REST_URL=https://your-database.upstash.io

# Redis REST API Token
UPSTASH_REDIS_REST_TOKEN=your-token-here
```

#### Vercel Production

1. 前往 [Vercel Dashboard](https://vercel.com/dashboard)
2. 選擇專案 → **Settings** → **Environment Variables**
3. 新增以下變數（**Production, Preview, Development 全選**）：

| Name | Value |
|------|-------|
| `UPSTASH_REDIS_REST_URL` | `https://your-database.upstash.io` |
| `UPSTASH_REDIS_REST_TOKEN` | `your-token-here` |

4. 點擊 **Save** → 重新部署專案

### 步驟 3：驗證連線

建立測試檔案：

```typescript
// test-redis.ts
import { redis } from '@/lib/redis/client'

async function testRedis() {
  try {
    // 寫入測試
    await redis.set('test:connection', 'success', { ex: 60 })

    // 讀取測試
    const value = await redis.get('test:connection')
    console.log('Redis 連線成功！', value)

    // 清理
    await redis.del('test:connection')
  } catch (error) {
    console.error('Redis 連線失敗：', error)
  }
}

testRedis()
```

執行測試：

```bash
npx tsx test-redis.ts
```

預期輸出：

```
Redis 連線成功！ success
```

---

## 📊 Redis 使用場景

### 1. Session 管理

```typescript
import { redis, RedisKeys } from '@/lib/redis/client'

// 儲存 Session
await redis.set(
  RedisKeys.SESSION(sessionId),
  {
    userId: 'user_123',
    accessToken: 'encrypted_token',
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
  },
  { ex: 7 * 24 * 60 * 60 } // 7 天
)

// 查詢 Session
const session = await redis.get(RedisKeys.SESSION(sessionId))
```

### 2. Rate Limiting

```typescript
import { redis, RedisKeys } from '@/lib/redis/client'

// 檢查 Rate Limit
const key = RedisKeys.RATE_LIMIT(userIp, '/api/market')
const count = await redis.incr(key)

if (count === 1) {
  await redis.expire(key, 60) // 60 秒窗口
}

if (count > 30) {
  throw new Error('Too Many Requests')
}
```

### 3. Bot Detection

```typescript
import { redis, RedisKeys } from '@/lib/redis/client'

// 追蹤 IP 訪問路徑
const key = RedisKeys.BOT_PATHS(userIp)
await redis.sadd(key, pathname)
await redis.expire(key, 60)

// 檢查路徑多樣性
const pathCount = await redis.scard(key)
if (pathCount > 20) {
  console.log('檢測到掃描行為')
}
```

### 4. OAuth State Token

```typescript
import { redis, RedisKeys } from '@/lib/redis/client'

// 生成 State Token（CSRF 防護）
const state = crypto.randomUUID()
await redis.set(RedisKeys.OAUTH_STATE(state), { ip: userIp }, { ex: 600 }) // 10 分鐘

// 驗證 State Token
const stateData = await redis.get(RedisKeys.OAUTH_STATE(state))
if (!stateData) {
  throw new Error('Invalid or expired state token')
}

// 刪除已使用的 State
await redis.del(RedisKeys.OAUTH_STATE(state))
```

---

## 📈 免費額度說明

**Upstash Redis 免費版**：
- ✅ **10,000 commands/day**
- ✅ **256 MB storage**
- ✅ **1 database**
- ✅ **REST API 存取**

**預估使用量**（7,794 訪客/5天）：

| 功能 | Commands/天 | 說明 |
|------|------------|------|
| Bot Detection | 3,000-4,000 | User-Agent 過濾 + 高頻檢測 |
| Rate Limiting | 2,000-3,000 | API 端點限流 |
| Session 管理 | 500-1,000 | OAuth Session 存取 |
| **總計** | **5,500-8,000** | **在免費額度內** ✅ |

---

## ⚠️ 注意事項

### 1. REST API 限制

Upstash Redis 使用 REST API，部分指令不支援：
- ❌ `SCAN`（大規模 key 掃描）
- ❌ `SUBSCRIBE`（Pub/Sub）
- ✅ `GET`, `SET`, `INCR`, `EXPIRE`（完整支援）

### 2. 效能考量

- REST API 延遲比原生 Redis 高（~10-50ms vs ~1ms）
- 適合 Serverless 環境，但不適合高頻交易系統

### 3. 資料持久性

- Upstash 提供資料持久化（不會因重啟遺失）
- 但免費版無備份功能，重要資料請同步到 Supabase

---

## 🔍 監控與除錯

### 查看 Redis 使用統計

1. 前往 [Upstash Console](https://console.upstash.com)
2. 選擇您的 Database
3. 查看 **Metrics** 分頁：
   - Daily Commands（每日指令數）
   - Storage Used（儲存空間使用）
   - Latency（延遲）

### 手動查看 Redis Keys

在 Console 的 **Data Browser** 中：

```redis
# 列出所有 Session keys
KEYS session:*

# 查看特定 key
GET session:abc123

# 查看 key 過期時間
TTL session:abc123

# 刪除 key
DEL session:abc123
```

---

## 🚨 故障排除

### 問題 1：連線失敗

**錯誤訊息**：
```
Missing Upstash Redis environment variables
```

**解決方式**：
1. 確認 `.env.local` 包含正確的環境變數
2. 執行 `source .env.local` 或重啟開發伺服器
3. 檢查 Vercel 環境變數是否設定

### 問題 2：超過免費額度

**錯誤訊息**：
```
Daily request limit exceeded
```

**解決方式**：
1. 檢查 Bot Detection 是否阻擋不夠多（應降低正常流量）
2. 優化 Rate Limiting 邏輯（減少不必要的 Redis 查詢）
3. 考慮升級到 Pro Plan（$10/月，100萬 commands）

### 問題 3：延遲過高

**現象**：API 回應時間 > 500ms

**解決方式**：
1. 確認 Upstash region 與 Vercel 部署區域相同
2. 減少單一請求的 Redis 查詢次數
3. 使用 Pipeline（批次執行多個指令）

---

## 📚 相關文檔

- [Upstash Redis 官方文檔](https://docs.upstash.com/redis)
- [Upstash REST API 參考](https://docs.upstash.com/redis/features/restapi)
- [架構設計文檔](../architecture/交易系統架構設計.md)
- [Bot Detection 設計](../architecture/交易系統架構設計.md#bot-detection)

---

## ✅ 設定完成檢查清單

- [ ] 建立 Upstash Redis Database
- [ ] 複製 REST API URL 和 Token
- [ ] 設定本地環境變數（`.env.local`）
- [ ] 設定 Vercel 環境變數（Production + Preview）
- [ ] 執行測試腳本確認連線
- [ ] 重新部署 Vercel 專案
- [ ] 確認 Metrics 顯示正常流量
