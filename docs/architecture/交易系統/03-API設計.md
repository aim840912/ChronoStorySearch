# API 設計

> **最後更新**：2025-10-26

---

## 📚 導航

[← 上一篇:認證與資料庫](./02-認證與資料庫.md) | [🏠 返回目錄](./README.md) | [下一篇:Discord整合 →](./04-Discord整合.md)

---

## API 端點總覽

**認證相關**：
- `GET /api/auth/discord` - Discord OAuth 啟動
- `GET /api/auth/discord/callback` - Discord OAuth 回調
- `POST /api/auth/refresh` - 刷新 access_token
- `POST /api/auth/logout` - 登出
- `GET /api/auth/me` - 獲取當前用戶資訊

**刊登相關**：
- `GET /api/listings` - 查詢我的刊登
- `POST /api/listings` - 建立刊登
- `PATCH /api/listings/[id]` - 更新刊登
- `DELETE /api/listings/[id]` - 刪除刊登
- `GET /api/listings/[id]/contact` - 查看聯絡方式

**市場相關**：
- `GET /api/market` - 市場列表(分頁)
- `GET /api/market/search` - 搜尋/篩選
- `GET /api/market/exchange-matches` - 尋找交換匹配 (NEW)

**意向相關**：
- `POST /api/interests` - 登記購買意向
- `GET /api/interests` - 我的購買意向
- `GET /api/interests/received` - 收到的購買意向

**信譽相關**：
- `GET /api/reputation/[userId]` - 獲取用戶信譽
- `POST /api/reputation/calculate` - 重新計算信譽

---

## API 認證要求

**⚠️ 安全原則**：本系統採用 **Discord OAuth 唯一登入**,所有敏感操作皆需認證。

### 端點認證分類

| 端點 | 認證要求 | 說明 | RLS 策略 |
|------|---------|------|---------|
| **認證相關** | | | |
| `GET /api/auth/discord` | 🔓 公開 | OAuth 啟動流程 | - |
| `GET /api/auth/discord/callback` | 🔓 公開 | OAuth 回調處理 | - |
| `POST /api/auth/refresh` | 🔒 需要認證 | Token 刷新(需有效 Session) | `user_sessions` |
| `POST /api/auth/logout` | 🔒 需要認證 | 登出當前 Session | `user_sessions` |
| `GET /api/auth/me` | 🔒 需要認證 | 獲取當前用戶資訊 | `users` |
| **刊登相關** | | | |
| `GET /api/listings` | 🔒 需要認證 | 查詢「我的」刊登 | `listings` WHERE `user_id = auth.uid()` |
| `POST /api/listings` | 🔒 需要認證 | 建立刊登 | `listings` INSERT CHECK `user_id = auth.uid()` |
| `PATCH /api/listings/[id]` | 🔒 需要認證 | 更新「我的」刊登 | `listings` UPDATE WHERE `user_id = auth.uid()` |
| `DELETE /api/listings/[id]` | 🔒 需要認證 | 刪除「我的」刊登 | `listings` DELETE WHERE `user_id = auth.uid()` |
| `GET /api/listings/[id]/contact` | 🔒 需要認證 | 查看賣家聯絡方式 | - |
| **市場相關** | | | |
| `GET /api/market` | 🔒 需要認證 | 市場列表(防止 Bot 爬取) | `listings` WHERE `status = 'active'` |
| `GET /api/market/search` | 🔒 需要認證 | 搜尋/篩選(防止 Bot 爬取) | `listings` WHERE `status = 'active'` |
| `GET /api/market/trending` | 🔓 公開 | 熱門商品(SEO 友善) | `listings` WHERE `status = 'active'` |
| **意向相關** | | | |
| `POST /api/interests` | 🔒 需要認證 | 登記購買意向 | `interests` INSERT CHECK `buyer_id = auth.uid()` |
| `GET /api/interests` | 🔒 需要認證 | 我的購買意向 | `interests` WHERE `buyer_id = auth.uid()` |
| `GET /api/interests/received` | 🔒 需要認證 | 收到的購買意向 | `interests` JOIN `listings` WHERE `seller_id = auth.uid()` |
| **信譽相關** | | | |
| `GET /api/reputation/[userId]` | 🔒 需要認證 | 獲取用戶信譽(防止爬蟲) | `users` SELECT reputation fields |
| `POST /api/reputation/calculate` | 🔒 需要認證 | 重新計算信譽(僅限本人) | `users` WHERE `id = auth.uid()` |

### 認證實作方式

**Middleware 認證檢查**：

```typescript
// src/lib/middleware/api-middleware.ts

import { NextRequest } from 'next/server'
import { validateSession } from '@/lib/auth/session-validator'
import { withErrorHandler } from '@/lib/middleware/error-handler'

/**
 * 需要認證的 API 中間件
 * 使用方式：export const POST = withAuthAndError(handlePOST, { module: 'ListingAPI' })
 */
export function withAuthAndError(
  handler: (request: NextRequest, user: User) => Promise<Response>,
  options: { module: string; enableAuditLog?: boolean }
) {
  return withErrorHandler(
    async (request: NextRequest) => {
      // 1. 驗證 Session Cookie
      const session = await validateSession(request)

      if (!session.valid || !session.user) {
        return new Response(
          JSON.stringify({
            success: false,
            error: '需要登入才能使用此功能',
            code: 'UNAUTHORIZED'
          }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        )
      }

      // 2. 執行 Handler(user 已確保存在)
      return handler(request, session.user)
    },
    options
  )
}
```

**使用範例**：

```typescript
// src/app/api/listings/route.ts
import { withAuthAndError, User } from '@/lib/middleware/api-middleware'
import { success, created } from '@/lib/api-response'

async function handleGET(request: NextRequest, user: User) {
  // user 已經過認證,可直接使用 user.id
  const listings = await db.listings
    .select('*')
    .eq('user_id', user.id)  // RLS 自動過濾
    .eq('status', 'active')

  return success(listings, '查詢成功')
}

async function handlePOST(request: NextRequest, user: User) {
  const data = await request.json()

  // RLS 自動檢查 user_id = auth.uid()
  const listing = await db.listings.insert({
    ...data,
    user_id: user.id  // 強制使用認證用戶 ID
  })

  return created(listing, '刊登建立成功')
}

// 🔒 需要認證：使用 withAuthAndError
export const GET = withAuthAndError(handleGET, { module: 'ListingAPI' })
export const POST = withAuthAndError(handlePOST, { module: 'ListingAPI' })
```

**公開端點範例**：

```typescript
// src/app/api/market/trending/route.ts
import { withErrorHandler } from '@/lib/middleware/error-handler'
import { success } from '@/lib/api-response'

async function handleGET(request: NextRequest) {
  // 🔓 公開端點：無需 user 參數
  const trending = await db.listings
    .select('*')
    .eq('status', 'active')
    .order('view_count', { ascending: false })
    .limit(10)

  return success(trending, '熱門商品')
}

// 🔓 公開端點：僅使用 withErrorHandler(不使用 withAuthAndError)
export const GET = withErrorHandler(handleGET, { module: 'TrendingAPI' })
```

### 認證失敗處理

**401 Unauthorized 回應格式**：

```json
{
  "success": false,
  "error": "需要登入才能使用此功能",
  "code": "UNAUTHORIZED",
  "trace_id": "req_abc123xyz"
}
```

**前端處理邏輯**：

```typescript
// src/lib/api-client.ts
async function apiRequest(endpoint: string, options?: RequestInit) {
  const response = await fetch(endpoint, {
    ...options,
    credentials: 'include'  // 自動帶上 Session Cookie
  })

  if (response.status === 401) {
    // 觸發登入 Modal(見 DDR-003：LoginModal 設計決策)
    const event = new CustomEvent('show-login-modal')
    window.dispatchEvent(event)
    throw new Error('需要登入')
  }

  return response.json()
}
```

### 安全性說明

1. **Discord OAuth 唯一認證**：
   - ✅ 無密碼/信箱登入
   - ✅ 無其他社交登入(Google/Facebook/GitHub)
   - ✅ Email 欄位僅來自 Discord OAuth(可選,用於通知)

2. **Session 安全**：
   - Cookie flags: `HttpOnly=true; Secure=true; SameSite=Strict`
   - Token 加密: AES-256-GCM
   - 過期時間: 7 天(可配置)

3. **RLS 雙重保護**：
   - Middleware 檢查：API 層級認證
   - RLS Policy：資料庫層級權限控制
   - 即使繞過 Middleware,RLS 仍會阻擋未授權存取

4. **公開端點限制**：
   - 僅 **trending** 端點公開(SEO 需求)
   - 所有 CRUD 操作皆需認證
   - 市場列表需認證(防止 Bot 大量爬取)

---

## API 範例 (含交換功能)

### POST /api/listings - 建立刊登

#### 範例 1: 出售物品
```json
{
  "trade_type": "sell",
  "item_id": 1002000,
  "quantity": 1,
  "price": 10000000,
  "contact_method": "discord",
  "contact_info": "seller#1234"
}
```

**回應**:
```json
{
  "success": true,
  "data": {
    "id": 12345,
    "trade_type": "sell",
    "item_id": 1002000,
    "quantity": 1,
    "price": 10000000,
    "status": "active",
    "created_at": "2025-10-26T10:30:00Z"
  },
  "message": "刊登建立成功"
}
```

#### 範例 2: 收購物品
```json
{
  "trade_type": "buy",
  "item_id": 1003000,
  "quantity": 1,
  "price": 50000000,
  "contact_method": "ingame",
  "contact_info": "請私訊遊戲內角色: PlayerName"
}
```

#### 範例 3: 交換物品 (NEW)
```json
{
  "trade_type": "exchange",
  "item_id": 1002000,           // 我有的物品: 暗影雙刀
  "quantity": 1,
  "wanted_item_id": 1003000,    // 我想要的物品: 屠龍刀
  "wanted_quantity": 1,
  "contact_method": "discord",
  "contact_info": "trader#9999"
}
```

**回應**:
```json
{
  "success": true,
  "data": {
    "id": 12346,
    "trade_type": "exchange",
    "item_id": 1002000,
    "quantity": 1,
    "wanted_item_id": 1003000,
    "wanted_quantity": 1,
    "status": "active",
    "created_at": "2025-10-26T10:35:00Z"
  },
  "message": "交換刊登建立成功"
}
```

---

### GET /api/market - 市場列表

#### 查詢參數
```typescript
{
  trade_type?: 'sell' | 'buy' | 'exchange' | 'all',  // 交易類型篩選
  item_id?: number,                                   // 物品 ID 篩選
  page?: number,                                      // 分頁
  limit?: number                                      // 每頁數量
}
```

#### 範例請求
```
GET /api/market?trade_type=exchange&page=1&limit=20
```

#### 回應
```json
{
  "success": true,
  "data": [
    {
      "id": 12346,
      "trade_type": "exchange",
      "item_id": 1002000,
      "item_name": "暗影雙刀",
      "quantity": 1,
      "wanted_item_id": 1003000,
      "wanted_item_name": "屠龍刀",
      "wanted_quantity": 1,
      "seller": {
        "discord_username": "trader",
        "reputation_score": 85
      },
      "created_at": "2025-10-26T10:35:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "total_pages": 3
  }
}
```

---

### GET /api/market/exchange-matches - 尋找交換匹配 (NEW)

**功能**: 尋找與我的交換刊登互相匹配的刊登（我有 A 想要 B ↔ 對方有 B 想要 A）

#### 查詢參數
```typescript
{
  listing_id: number  // 我的交換刊登 ID
}
```

#### 範例請求
```
GET /api/market/exchange-matches?listing_id=12346
```

#### SQL 查詢邏輯
```sql
-- 智能匹配算法
SELECT l2.*
FROM listings l1
JOIN listings l2 ON
  l1.item_id = l2.wanted_item_id AND
  l1.wanted_item_id = l2.item_id
WHERE
  l1.id = $listing_id AND
  l1.trade_type = 'exchange' AND
  l2.trade_type = 'exchange' AND
  l1.status = 'active' AND
  l2.status = 'active' AND
  l1.user_id != l2.user_id  -- 排除自己
```

#### 回應
```json
{
  "success": true,
  "data": {
    "my_listing": {
      "id": 12346,
      "item_id": 1002000,
      "item_name": "暗影雙刀",
      "wanted_item_id": 1003000,
      "wanted_item_name": "屠龍刀"
    },
    "matches": [
      {
        "id": 12350,
        "user": {
          "discord_username": "perfect_match",
          "reputation_score": 92
        },
        "item_id": 1003000,
        "item_name": "屠龍刀",
        "wanted_item_id": 1002000,
        "wanted_item_name": "暗影雙刀",
        "match_score": 100,  // 完美匹配
        "created_at": "2025-10-26T09:00:00Z"
      }
    ],
    "total_matches": 1
  },
  "message": "找到 1 個匹配的交換刊登"
}
```

---

## 📚 導航

[← 上一篇:認證與資料庫](./02-認證與資料庫.md) | [🏠 返回目錄](./README.md) | [下一篇:Discord整合 →](./04-Discord整合.md)
