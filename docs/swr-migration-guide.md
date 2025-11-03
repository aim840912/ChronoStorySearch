# SWR 遷移指南

## 目錄

- [概述](#概述)
- [已建立的 Hooks](#已建立的-hooks)
- [遷移步驟](#遷移步驟)
- [遷移範例](#遷移範例)
- [常見問題](#常見問題)

---

## 概述

本專案已整合 SWR (stale-while-revalidate) 快取庫，提供：

- **自動去重**：相同請求在短時間內只發送一次
- **自動重新驗證**：聚焦、重新連線時自動更新資料
- **更好的使用者體驗**：先顯示快取資料，背景更新
- **更簡潔的程式碼**：無需手動管理 loading, error 狀態

**預期效果**：減少 40-50% API 請求次數

---

## 已建立的 Hooks

### 認證相關

#### `useAuth()`
- **檔案**：`src/hooks/swr/useAuth.ts`
- **API**：`/api/auth/me`
- **快取策略**：60 秒去重，不在聚焦時重新驗證
- **返回值**：
  ```typescript
  {
    user: User | null
    isLoading: boolean
    error: any
    mutate: () => void
    refresh: () => void
  }
  ```

#### `useUserRoles()`
- **檔案**：`src/hooks/swr/useAuth.ts`
- **API**：`/api/auth/me/roles`
- **返回值**：
  ```typescript
  {
    roles: string[]
    isAdmin: boolean
    isLoading: boolean
    error: any
    mutate: () => void
  }
  ```

### 系統狀態

#### `useSystemStatus()`
- **檔案**：`src/hooks/swr/useSystemStatus.ts`
- **API**：`/api/system/status`
- **快取策略**：2 秒去重（即時資料）
- **返回值**：
  ```typescript
  {
    tradingEnabled: boolean
    maintenanceMode: boolean
    maintenanceMessage: string
    loginBannerEnabled: boolean
    loginBannerMessage: string
    isLoading: boolean
    error: any
    refetch: () => void
  }
  ```

### 市場相關

#### `useMarketSearch(params, options)`
- **檔案**：`src/hooks/swr/useMarket.ts`
- **API**：`/api/market/search`
- **快取策略**：10 秒去重
- **參數**：
  ```typescript
  params: {
    trade_type?: string
    item_id?: number
    search_term?: string
    min_price?: number
    max_price?: number
    stats_grade?: string
    sort_by?: 'created_at' | 'price' | 'stats_score'
    order?: 'asc' | 'desc'
    page?: number
    limit?: number
  }
  options: {
    enabled?: boolean  // 是否啟用請求（預設 true）
  }
  ```
- **返回值**：
  ```typescript
  {
    listings: ListingWithUserInfo[]
    pagination: PaginationInfo
    isLoading: boolean
    error: any
    mutate: () => void
  }
  ```

#### `useTrendingListings()`
- **檔案**：`src/hooks/swr/useMarket.ts`
- **API**：`/api/market/trending`
- **快取策略**：30 秒去重
- **返回值**：
  ```typescript
  {
    listings: Array<{...}>
    isLoading: boolean
    error: any
    mutate: () => void
  }
  ```

---

## 遷移步驟

### 1. 檢查現有程式碼

找到使用 `fetch` 或自訂 Hook 的元件，確認 API 端點。

### 2. 替換為 SWR Hook

根據 API 端點選擇對應的 SWR Hook。

### 3. 移除手動狀態管理

SWR 自動管理 `isLoading`, `error`, `data` 狀態，無需手動 `useState`。

### 4. 更新後續邏輯

使用 SWR 的 `mutate` 來手動觸發重新驗證。

---

## 遷移範例

### 範例 1：系統狀態檢查

#### ❌ 遷移前（手動實作）

```tsx
// src/hooks/useSystemStatus.ts (舊版，179 行)
import { useState, useEffect, useCallback, useRef } from 'react'

interface SystemStatus { /* ... */ }

let globalCache: CachedStatus | null = null
let pendingRequest: Promise<void> | null = null

export function useSystemStatus(): UseSystemStatusReturn {
  const [status, setStatus] = useState<SystemStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStatus = useCallback(async (forceRefresh = false) => {
    // 檢查快取
    if (!forceRefresh && globalCache) {
      // ...
    }

    // 請求去重邏輯
    if (pendingRequest) {
      await pendingRequest
      return
    }

    // 發送請求
    pendingRequest = (async () => {
      try {
        setIsLoading(true)
        const response = await fetch('/api/system/status')
        const data = await response.json()

        globalCache = { data: data.data, timestamp: Date.now() }
        setStatus(data.data)
        setIsLoading(false)
      } catch (err) {
        setError(errorMessage)
      } finally {
        pendingRequest = null
      }
    })()
  }, [])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  return {
    tradingEnabled: status?.trading?.enabled ?? true,
    maintenanceMode: status?.maintenance?.enabled ?? false,
    // ...
  }
}
```

#### ✅ 遷移後（使用 SWR）

```tsx
// src/hooks/swr/useSystemStatus.ts (新版，50 行)
import useSWR from 'swr'
import { swrStrategies } from '@/lib/swr/config'

interface SystemStatus { /* ... */ }

export function useSystemStatus() {
  const { data, error, isLoading, mutate } = useSWR<SystemStatusResponse>(
    '/api/system/status',
    swrStrategies.realtime  // 使用預設策略
  )

  return {
    tradingEnabled: data?.data?.trading?.enabled ?? true,
    maintenanceMode: data?.data?.maintenance?.enabled ?? false,
    maintenanceMessage: data?.data?.maintenance?.message ?? '',
    loginBannerEnabled: data?.data?.loginBanner?.enabled ?? false,
    loginBannerMessage: data?.data?.loginBanner?.message ?? '',
    isLoading,
    error,
    refetch: () => mutate(),
  }
}
```

**改善點**：
- ✅ 程式碼從 179 行減少到 50 行（-72%）
- ✅ 移除手動快取邏輯（SWR 自動處理）
- ✅ 移除請求去重邏輯（SWR 自動處理）
- ✅ 更好的類型安全

---

### 範例 2：市場搜尋

#### ❌ 遷移前

```tsx
// 元件中直接使用 fetch
function MarketSearch() {
  const [listings, setListings] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchListings() {
      try {
        setIsLoading(true)
        const response = await fetch('/api/market/search?trade_type=sell')
        const data = await response.json()

        if (data.success) {
          setListings(data.data)
        }
      } catch (err) {
        setError(err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchListings()
  }, [])

  if (isLoading) return <div>載入中...</div>
  if (error) return <div>錯誤</div>

  return (
    <div>
      {listings.map(listing => (
        <ListingCard key={listing.id} listing={listing} />
      ))}
    </div>
  )
}
```

#### ✅ 遷移後

```tsx
// 使用 SWR Hook
import { useMarketSearch } from '@/hooks/swr/useMarket'

function MarketSearch() {
  const { listings, isLoading, error } = useMarketSearch({
    trade_type: 'sell',
    page: 1,
    limit: 20
  })

  if (isLoading) return <div>載入中...</div>
  if (error) return <div>錯誤</div>

  return (
    <div>
      {listings.map(listing => (
        <ListingCard key={listing.id} listing={listing} />
      ))}
    </div>
  )
}
```

**改善點**：
- ✅ 移除所有狀態管理程式碼
- ✅ 自動去重（10 秒內相同搜尋只請求一次）
- ✅ 自動重新驗證（聚焦時更新）
- ✅ 配合後端 Redis 快取（15 分鐘 TTL）

---

### 範例 3：條件式請求

有時候需要根據條件決定是否發送請求：

```tsx
function UserProfile({ userId }) {
  // ✅ 使用 enabled 選項控制請求
  const { user, isLoading } = useAuth({
    enabled: !!userId  // 只有在 userId 存在時才請求
  })

  if (!userId) return <div>請選擇使用者</div>
  if (isLoading) return <div>載入中...</div>

  return <div>歡迎，{user?.discord_username}</div>
}
```

---

### 範例 4：手動重新驗證

在某些操作後需要立即更新資料：

```tsx
import { useMarketSearch } from '@/hooks/swr/useMarket'

function CreateListingButton() {
  const { mutate } = useMarketSearch({ trade_type: 'sell' })

  const handleCreate = async () => {
    // 建立刊登
    await fetch('/api/listings', {
      method: 'POST',
      body: JSON.stringify(data)
    })

    // ✅ 立即重新驗證市場搜尋結果
    mutate()
  }

  return <button onClick={handleCreate}>建立刊登</button>
}
```

---

## 常見問題

### Q1: 舊的 Hook 還能用嗎？

可以，但建議逐步遷移到 SWR 版本以獲得更好的效能。

### Q2: SWR 會增加 Bundle 大小嗎？

SWR 壓縮後約 4KB，相比減少的程式碼和效能提升，這是值得的。

### Q3: 如何處理認證失敗（401）？

SWR 版本的 `useAuth` 已經處理了 401 錯誤，視為正常情況（未登入）。

### Q4: 快取會過期嗎？

會，SWR 根據不同策略設定了去重時間窗口：
- 使用者資訊：60 秒
- 市場搜尋：10 秒
- 熱門商品：30 秒
- 即時資料：2 秒

### Q5: 如何清除快取？

使用 `mutate()` 函數：

```tsx
const { mutate } = useMarketSearch(params)

// 清除快取並重新驗證
mutate()

// 或使用全域 mutate
import { mutate } from 'swr'
mutate('/api/market/search')
```

---

## 效能提升總結

| 優化項目 | 預期效果 |
|---------|---------|
| **階段 1**：Rate Limiting 策略分級 | -30-40% Redis commands |
| **階段 2**：Market Cache TTL 延長 | -20-30% Cache SET operations |
| **階段 3**：SWR 前端快取 | -40-50% API requests |
| **總計** | -55-75% 整體負載 |

---

## 下一步

1. **優先遷移高頻 API**：
   - `/api/system/status`（已有 SWR Hook）
   - `/api/auth/me`（已有 SWR Hook）
   - `/api/market/search`（已有 SWR Hook）

2. **測試驗證**：
   - 檢查 Upstash Dashboard 確認 Redis commands 下降
   - 檢查 Network tab 確認 API 請求減少
   - 監控使用者體驗（頁面載入速度）

3. **逐步推廣**：
   - 在新功能中優先使用 SWR
   - 舊功能遇到修改時順便遷移
   - 避免一次性大規模重構

---

**完成日期**：2025-11-03
**作者**：Claude Code
**版本**：1.0
