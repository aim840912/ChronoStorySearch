# ChronoStory 流量消耗分析報告

> 分析日期: 2025-12-27
> 專案: ChronoStory Search (MapleStory 資料查詢工具)

---

## 一、Supabase 流量消耗

### 1.1 認證相關（每次頁面載入）

| 操作 | 檔案位置 | 頻率 | 說明 |
|------|---------|------|------|
| `auth.getUser()` | `src/middleware.ts:47` | **每個請求** | 驗證 JWT token |
| `auth.getUser()` | `src/contexts/AuthContext.tsx:62` | 每次初始化 | 確認登入狀態 |
| `auth.onAuthStateChange()` | `src/contexts/AuthContext.tsx:86` | 每次初始化 | 訂閱狀態變化 |
| `auth.signInWithOAuth()` | `src/contexts/AuthContext.tsx:107` | 登入時 | Discord OAuth |
| `auth.exchangeCodeForSession()` | `src/app/auth/callback/route.ts:59` | OAuth 回調時 | 交換 token |

### 1.2 資料庫操作（`user_preferences` 表）

| 操作 | 位置 | 頻率 | SQL 類型 |
|------|------|------|---------|
| SELECT | `src/lib/supabase/preferences-service.ts:100` | 登入後 1 次 | Read |
| UPSERT 完整 | `src/lib/supabase/preferences-service.ts:126` | 首次登入同步 | Write |
| UPSERT 單欄位 | `src/lib/supabase/preferences-service.ts:189` | **每次設定變更** | Write |
| DELETE | `src/lib/supabase/preferences-service.ts:211` | 刪除帳號時 | Write |

### 1.3 Realtime 訂閱（WebSocket）

| 操作 | 位置 | 說明 |
|------|------|------|
| `channel().on('postgres_changes')` | `src/lib/supabase/realtime-preferences.ts:35` | 即時同步多分頁設定 |

**優化措施**: 使用 Tab Leader 機制，多個分頁只建立 1 條 WebSocket 連線

---

## 二、Vercel 流量消耗

### 2.1 Middleware（最高成本）

```
檔案: src/middleware.ts
觸發: 每個請求（除靜態資源）
操作: supabase.auth.getUser()
```

**排除的路徑**:
- `_next/static`, `_next/image`
- `favicon.ico`
- 圖片檔案 (`.svg`, `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`)

### 2.2 API Routes

| 路由 | 方法 | 用途 |
|------|------|------|
| `/auth/callback` | GET | Discord OAuth 回調 |

**目前只有 1 個 API Route**

### 2.3 外部服務調用

| 服務 | 用途 | 頻率 |
|------|------|------|
| Supabase Auth | 認證 | 每個請求 |
| Cloudflare R2 CDN | 物品/怪物詳細資料 | 開啟 Modal 時 |
| Google Analytics | 分析 | 每頁 1 次（需同意） |
| Google AdSense | 廣告 | 每頁多次 |

---

## 三、流量消耗排序（由高到低）

| 優先級 | 來源 | 服務 | 頻率 | 成本類型 |
|--------|------|------|------|---------|
| 1 | Middleware `auth.getUser()` | Supabase | 每個請求 | Auth API Calls |
| 2 | 偏好設定 `updateField()` | Supabase | 每次設定變更 | Database Writes |
| 3 | Realtime 訂閱 | Supabase | 登入後持續 | Realtime Connections |
| 4 | R2 CDN Fetch | Cloudflare | 開啟 Modal | Bandwidth |
| 5 | 轉蛋機動態載入 | Vercel | 按需 | Bandwidth |

---

## 四、現有快取策略

| 層級 | 策略 | 節省比例 | 備註 |
|------|------|---------|------|
| 網路傳輸 | gzip 壓縮 | ~80% | Next.js 內建 |
| SWR 去重 | 60 秒內單次請求 | ~40-50% | 客戶端快取 |
| Redis 快取 | 1 小時 Discord 資料 | ~90% | Upstash |
| 懶加載 CDN | 按需載入詳細資料 | ~85-95% | R2 CDN |
| 資料索引化 | Index 替代完整資料 | ~39% | Bundle 優化 |

---

## 五、環境變數控制點

```bash
# 停用認證（減少 Middleware Supabase 調用）
NEXT_PUBLIC_AUTH_ENABLED=false

# 停用 Middleware（減少所有 Middleware 開銷）
NEXT_PUBLIC_MIDDLEWARE_ENABLED=false

# 停用廣告
NEXT_PUBLIC_ADS_ENABLED=false

# 不設定 = 跳過 GA4
NEXT_PUBLIC_GA4_MEASUREMENT_ID=
```

---

## 六、關鍵檔案清單

| 檔案路徑 | 用途 | 主要消耗 |
|---------|------|---------|
| `src/middleware.ts` | 認證中間件 | Supabase Auth API |
| `src/lib/supabase/client.ts` | Browser 端客戶端 | - |
| `src/lib/supabase/server.ts` | Server 端客戶端 | - |
| `src/lib/supabase/preferences-service.ts` | 偏好設定 CRUD | Database R/W |
| `src/lib/supabase/realtime-preferences.ts` | Realtime 訂閱 | WebSocket |
| `src/contexts/AuthContext.tsx` | 認證狀態管理 | Auth API |
| `src/contexts/PreferencesSyncContext.tsx` | 設定同步 | Database + Realtime |
| `src/app/auth/callback/route.ts` | OAuth 回調 | Auth API |
| `src/hooks/useLazyData.ts` | 懶加載資料 | R2 CDN |
| `src/hooks/useDataManagement.ts` | 資料管理 | Bundle |

---

## 七、優化建議

> **更新日期**: 2025-12-27
> **狀態**: 高優先級優化項目已全部完成 ✅

### 7.1 高優先級（立即可做）

#### A. Middleware 優化 - 減少 Supabase Auth 調用 ✅ 已完成

**問題**: 每個請求都調用 `auth.getUser()`，即使是未登入用戶

**實作** (`src/middleware.ts`):
- 先檢查是否有 `sb-*-auth-token` cookie
- 未登入用戶直接放行，不創建 Supabase client

**建議**:
```typescript
// src/middleware.ts
export async function middleware(request: NextRequest) {
  // 先檢查是否有 session cookie，沒有就跳過 auth 驗證
  const hasSession = request.cookies.has('sb-access-token') ||
                     request.cookies.has('sb-refresh-token')

  if (!hasSession) {
    return NextResponse.next() // 未登入用戶直接放行
  }

  // 只有有 session 的用戶才驗證
  const supabase = createServerClient(...)
  await supabase.auth.getUser()
}
```

**預期節省**: 未登入用戶的 Auth API 調用減少 100%

#### B. 設定變更 Debounce - 減少 Database Writes ✅ 已完成

**問題**: 每次設定變更立即觸發 `UPSERT`

**實作** (`src/contexts/PreferencesSyncContext.tsx`):
- 使用 1 秒 debounce 合併多次變更
- 批次 upsert 取代多次 updateField

**建議**:
```typescript
// src/contexts/PreferencesSyncContext.tsx
const debouncedUpdateField = useMemo(
  () => debounce((field, value) => {
    preferencesService.updateField(field, value)
  }, 1000), // 1 秒內的變更合併為一次
  []
)
```

**預期節省**: 頻繁設定變更時減少 50-80% 寫入

### 7.2 中優先級（建議執行）

#### C. 條件式 Realtime 訂閱 ✅ 已完成

**問題**: 登入後立即建立 Realtime 連線，即使用戶只有一個分頁

**實作** (`src/lib/tab-leader.ts`):
- 新增 TAB_PING/TAB_PONG 訊息類型
- 啟動時發送 PING 探測其他分頁
- 只有偵測到多分頁時才建立 Realtime 連線

**建議**: 只在偵測到多分頁時才建立 Realtime 訂閱
```typescript
// 使用 BroadcastChannel 偵測多分頁
const hasMultipleTabs = await detectMultipleTabs()
if (hasMultipleTabs) {
  subscribeToPreferences(userId)
}
```

**預期節省**: 單分頁用戶的 Realtime 連線減少 100%

#### D. Auth Token 本地快取 ✅ 已完成

**問題**: `AuthContext` 初始化時調用 `auth.getUser()`，即使 token 還在有效期內

**實作** (`src/contexts/AuthContext.tsx`):
- 新增 `chronostory-auth-cache` localStorage 快取
- 快取有效期 55 分鐘（Supabase token 預設 1 小時）
- 快取有效時跳過 `getUser()` 調用

**建議**: 在 localStorage 快取 token 過期時間，未過期時直接使用本地狀態
```typescript
const cachedExpiry = localStorage.getItem('auth-token-expiry')
if (cachedExpiry && Date.now() < parseInt(cachedExpiry)) {
  // 使用快取的用戶狀態
  return cachedUser
}
// 過期才調用 API
await supabase.auth.getUser()
```

### 7.3 低優先級（長期優化）

#### E. 批次設定同步

**問題**: 多個設定變更產生多次 API 調用

**建議**: 收集一段時間內的所有變更，批次提交
```typescript
const pendingChanges = useRef<Record<string, any>>({})

const queueChange = (field, value) => {
  pendingChanges.current[field] = value
}

// 每 2 秒批次提交
useInterval(() => {
  if (Object.keys(pendingChanges.current).length > 0) {
    preferencesService.upsert(pendingChanges.current)
    pendingChanges.current = {}
  }
}, 2000)
```

#### F. Edge Caching for Auth

**建議**: 在 Vercel Edge Config 或 Redis 快取 session 驗證結果
- 減少對 Supabase Auth API 的直接調用
- 適合高流量場景

---

## 八、成本估算（假設）

### 當前架構（每月 10,000 活躍用戶）

| 項目 | 估算調用次數 | 說明 |
|------|-------------|------|
| Auth API | ~500,000 次 | 每用戶 50 次頁面載入 |
| Database Reads | ~30,000 次 | 登入後載入設定 |
| Database Writes | ~100,000 次 | 設定變更 |
| Realtime Connections | ~10,000 條 | 每用戶 1 條 |

### 優化後預估

| 項目 | 優化後調用次數 | 節省 |
|------|---------------|------|
| Auth API | ~200,000 次 | 60% |
| Database Reads | ~30,000 次 | 0% |
| Database Writes | ~30,000 次 | 70% |
| Realtime Connections | ~3,000 條 | 70% |

---

## 九、下一步行動

- [x] 實施 Middleware 優化（檢查 cookie 再驗證）✅ 2025-12-27
- [x] 添加設定變更 debounce ✅ 2025-12-27
- [x] 條件式 Realtime 訂閱（多分頁才建立連線）✅ 2025-12-27
- [x] Auth Token 本地快取 ✅ 2025-12-27
- [ ] 監控 Supabase Dashboard 的實際使用量
- [ ] 設定 Vercel Analytics 追蹤 Middleware 執行次數
