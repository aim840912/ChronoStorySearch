# Bot Detection 機制文檔

## 📊 系統概覽

**目標**：減少 Bot 流量，降低 Redis 使用量至免費額度內（< 60% 使用率）

**實施狀態**：✅ 階段 1 + 階段 2 已完成

**預期效果**：
- 減少 60-70% Bot 流量
- Redis 使用量從 10,668/天 降至 5,000-6,000/天
- 保留 SEO 友好（白名單機制）

---

## 🛡️ 防護機制

### 階段 1：User-Agent 過濾（全域 Middleware）

**執行位置**：`src/middleware.ts`（Next.js 全域 Middleware）

**檢測邏輯**：
1. **缺少 User-Agent** → 100% Bot（拒絕）
2. **SEO 爬蟲白名單** → 允許通過（保留 SEO）
3. **Bot 黑名單匹配** → 拒絕
4. **瀏覽器指紋檢查** → 驗證真實瀏覽器

**白名單 SEO 爬蟲**：
- Google: `googlebot`
- Bing: `bingbot`
- Baidu: `baiduspider`
- DuckDuckGo: `duckduckbot`
- Yandex: `yandexbot`
- Yahoo: `slurp`
- Facebook: `facebookexternalhit`
- Twitter: `twitterbot`
- LinkedIn: `linkedinbot`
- Discord: `discordbot`
- Internet Archive: `ia_archiver`

**黑名單 Bot 模式**：
- 爬蟲工具：`curl`, `wget`, `python-requests`, `java`, `go-http-client`
- 無頭瀏覽器：`headless`, `phantomjs`, `selenium`, `puppeteer`, `playwright`
- 自動化工具：`scrapy`, `aiohttp`, `axios`, `node-fetch`
- 惡意工具：`masscan`, `nmap`, `sqlmap`, `acunetix`
- 通用爬蟲：`bot`, `crawler`, `spider`, `scraper`

**返回結果**：
- 狀態碼：`403 Forbidden`
- 回應格式：
  ```json
  {
    "success": false,
    "error": "Bot detected",
    "code": "BOT_DETECTED",
    "message": "Automated requests are not allowed. If you believe this is an error, please contact support."
  }
  ```

---

### 階段 2：Rate Limiting 與行為檢測（API 中間件）

**執行位置**：API 路由層（使用 `withBotDetection` 或 `withAuthAndBotDetection`）

#### Rate Limiting（固定窗口算法）

**實作位置**：`src/lib/bot-detection/rate-limiter.ts`

**算法**：固定窗口（Fixed Window）
- Redis 命令：INCR + EXPIRE + TTL（3 命令/請求）
- 時間窗口：1 小時（3600 秒）
- 失敗容錯：Redis 錯誤時允許請求通過

**Rate Limit 配置**：

| 端點類型 | 限制（次/小時） | 說明 |
|---------|----------------|------|
| 熱門端點 (`/api/market/trending`) | 30 | 嚴格限制（Bot 熱點） |
| 搜尋端點 (`/api/market/search`) | 40 | 中等限制 |
| 認證端點 (`/api/listings`) | 100 | 寬鬆限制（信任認證用戶） |
| 公開端點（預設） | 50 | 一般限制 |

**返回結果（超過限制時）**：
- 狀態碼：`429 Too Many Requests`
- 回應格式：
  ```json
  {
    "success": false,
    "error": "請求過於頻繁，請稍後再試",
    "code": "RATE_LIMIT_ERROR",
    "statusCode": 429
  }
  ```

#### 行為檢測

**實作位置**：`src/lib/bot-detection/behavior-detector.ts`

**檢測類型**：

1. **高頻訪問檢測**
   - 閾值：50 次 / 小時（同一 IP + 同一端點）
   - Redis Set：`hf:${ip}:${endpoint}`
   - 觸發條件：1 小時內超過 50 次請求

2. **掃描行為檢測**
   - 閾值：20 個不同端點 / 1 分鐘
   - Redis Set：`scan:${ip}`（儲存訪問過的路徑）
   - 觸發條件：1 分鐘內訪問超過 20 個不同端點

**返回結果（檢測到異常時）**：
- 狀態碼：`429 Too Many Requests`
- 回應格式：
  ```json
  {
    "success": false,
    "error": "檢測到異常行為：high_frequency",
    "code": "RATE_LIMIT_ERROR",
    "statusCode": 429
  }
  ```

---

## 📋 API 端點保護狀態

### 已保護端點

| 端點 | 中間件 | Rate Limit | 說明 |
|------|--------|-----------|------|
| `GET /api/market/trending` | `withBotDetection` | 30/小時 | 🔓 公開，Bot 熱點 |
| `GET /api/market/search` | `withAuthAndBotDetection` | 40/小時 | 🔒 需認證 |
| `GET /api/listings` | `withAuthAndBotDetection` | 100/小時 | 🔒 需認證 |
| `POST /api/listings` | `withAuthAndBotDetection` | 100/小時 | 🔒 需認證 |

### 其他端點

**已有認證保護**（自動包含 User-Agent 過濾）：
- 所有使用 `withAuthAndError` 的端點
- 所有使用 `withAdminAndError` 的端點

**建議保護**（未來可擴展）：
- `GET /api/listings/:id` - 列表詳情（公開，可能被爬取）
- `POST /api/interests` - 表達興趣（需認證，但可能被濫用）

---

## 🔧 開發指南

### 使用 Bot Detection 中間件

#### 公開端點（無需認證）

```typescript
import { NextRequest } from 'next/server'
import { withBotDetection } from '@/lib/bot-detection/api-middleware'
import { success } from '@/lib/api-response'
import { DEFAULT_RATE_LIMITS } from '@/lib/bot-detection/constants'

async function handleGET(_request: NextRequest) {
  // 業務邏輯
  const data = await fetchData()
  return success(data, '查詢成功')
}

export const GET = withBotDetection(handleGET, {
  module: 'YourAPI',
  botDetection: {
    enableRateLimit: true,
    enableBehaviorDetection: true,
    rateLimit: DEFAULT_RATE_LIMITS.PUBLIC_API, // 50次/小時
  },
})
```

#### 需認證端點

```typescript
import { NextRequest } from 'next/server'
import { User } from '@/lib/middleware/api-middleware'
import { withAuthAndBotDetection } from '@/lib/bot-detection/api-middleware'
import { success } from '@/lib/api-response'
import { DEFAULT_RATE_LIMITS } from '@/lib/bot-detection/constants'

async function handleGET(_request: NextRequest, user: User) {
  // 業務邏輯（可使用 user）
  const data = await fetchUserData(user.id)
  return success(data, '查詢成功')
}

export const GET = withAuthAndBotDetection(handleGET, {
  module: 'YourAPI',
  botDetection: {
    enableRateLimit: true,
    enableBehaviorDetection: true,
    rateLimit: DEFAULT_RATE_LIMITS.AUTHENTICATED, // 100次/小時
  },
})
```

#### 自訂 Rate Limit

```typescript
export const GET = withBotDetection(handleGET, {
  module: 'YourAPI',
  botDetection: {
    enableRateLimit: true,
    rateLimit: {
      limit: 20,   // 自訂限制
      window: 3600 // 1 小時
    },
  },
})
```

---

## 🧪 測試指南

### 測試 1：正常瀏覽器（應通過）

```bash
curl -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36" \
  https://your-domain.com/api/market/trending
```

**預期結果**：`200 OK`，返回正常資料

### 測試 2：curl 請求（應被拒絕）

```bash
curl https://your-domain.com/api/market/trending
```

**預期結果**：`403 Forbidden`，返回 "Bot detected"

### 測試 3：GoogleBot（應通過）

```bash
curl -H "User-Agent: Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" \
  https://your-domain.com/api/market/trending
```

**預期結果**：`200 OK`，SEO 爬蟲白名單生效

### 測試 4：Rate Limit（應被限流）

```bash
# 發送 35 次請求（超過限制 30 次）
for i in {1..35}; do
  curl -H "User-Agent: Mozilla/5.0 Chrome/91.0" \
    https://your-domain.com/api/market/trending
done
```

**預期結果**：前 30 次返回 `200 OK`，後 5 次返回 `429 Too Many Requests`

---

## 📊 監控與日誌

### Vercel Logs 查看

**Bot 被阻擋日誌**：
```json
{
  "level": "warn",
  "message": "Bot 已阻擋",
  "ip": "192.168.1.1",
  "userAgent": "curl/7.68.0",
  "reason": "blacklist:curl",
  "confidence": "high",
  "path": "/api/market/trending"
}
```

**Rate Limit 超過日誌**：
```json
{
  "level": "warn",
  "message": "Rate limit 超過限制",
  "identifier": "192.168.1.1",
  "endpoint": "/api/market/trending",
  "count": 31,
  "limit": 30,
  "resetAt": "2025-01-01T12:00:00.000Z"
}
```

**高頻訪問檢測日誌**：
```json
{
  "level": "warn",
  "message": "高頻訪問檢測",
  "ip": "192.168.1.1",
  "endpoint": "/api/market/trending",
  "count": 51,
  "threshold": 50,
  "window": 3600
}
```

### Redis 使用量監控

**查看方式**：
1. 登入 [Upstash Dashboard](https://console.upstash.com/)
2. 選擇 Redis 資料庫
3. 查看 "Commands" 指標（每日命令數）

**目標值**：
- 當前：10,668/天（❌ 超標 107%）
- 階段 1 後：7,000-8,000/天（⚠️ 70-80%）
- 階段 2 後：5,000-6,000/天（✅ 50-60%）

---

## 🚀 部署檢查清單

### 部署前驗證

- [x] TypeScript 類型檢查通過（`npm run type-check`）
- [x] ESLint 檢查通過（`npm run lint`，無 error）
- [x] 本地測試通過（4 個測試場景）
- [ ] 確認 `.env.local` 包含 Redis 環境變數
- [ ] 確認 Middleware 配置正確（`src/middleware.ts`）

### 部署後驗證

- [ ] 測試線上環境（使用實際域名）
- [ ] 檢查 Vercel Logs，確認 Bot Detection 運作
- [ ] 24 小時後檢查 Redis Dashboard
- [ ] 48 小時後評估最終效果

### 回滾計劃（如有問題）

1. **誤判真實用戶**：
   - 調整 User-Agent 黑名單（移除過於寬泛的模式）
   - 增加 Rate Limit 閾值

2. **Redis 使用量未下降**：
   - 檢查 Middleware 是否正確運作（Vercel Logs）
   - 確認 Bot Detection 有實際拒絕請求
   - 等待 48 小時觀察完整效果

3. **SEO 受影響**：
   - 檢查白名單是否完整
   - 使用 Google Search Console 監控爬蟲狀態

---

## 📝 維護指南

### 更新黑名單/白名單

**檔案位置**：`src/lib/bot-detection/constants.ts`

**新增 Bot 模式**：
```typescript
export const BOT_USER_AGENTS = [
  // ... 現有模式
  'new-bot-pattern', // 新增
]
```

**新增 SEO 爬蟲**：
```typescript
export const SEO_CRAWLERS_WHITELIST = [
  // ... 現有爬蟲
  'new-seo-crawler', // 新增
]
```

### 調整 Rate Limit

**全域調整**：編輯 `constants.ts` 中的 `DEFAULT_RATE_LIMITS`

**單一端點調整**：編輯 API 路由檔案中的 `rateLimit` 配置

---

## 🔗 相關文件

- [實作路線圖](../architecture/交易系統/08-實作路線圖.md)
- [Bot 防護與監控](../architecture/交易系統/07-Bot防護與監控.md)
- [API 設計](../architecture/交易系統/03-API設計.md)
- [Upstash Redis 設定](../infrastructure/upstash-redis-setup.md)

---

**最後更新**：2025-01-29
**維護者**：開發團隊
